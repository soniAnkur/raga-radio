//
//  AudioBroadcaster.swift
//  raag
//
//  Host-side audio pipeline. Downloads the current track, plays it locally
//  through AVAudioEngine, taps the mixer output, encodes it to AAC and hands
//  the packets to the peer session for delivery to nearby listeners.
//

import AVFoundation
import Foundation

final class AudioBroadcaster {
    enum BroadcastError: LocalizedError {
        case downloadFailed
        case unreadableAudio
        case encoderSetupFailed

        var errorDescription: String? {
            switch self {
            case .downloadFailed: return "Could not download the track."
            case .unreadableAudio: return "The track format is not supported for streaming."
            case .encoderSetupFailed: return "Could not set up the audio encoder."
            }
        }
    }

    /// Encoded audio frames ready to send. Called on the audio tap thread.
    var sendData: ((Data) -> Void)?
    /// Called on the main queue when the scheduled track finishes playing.
    var onTrackFinished: (() -> Void)?

    private let engine = AVAudioEngine()
    private let player = AVAudioPlayerNode()
    private var converter: AVAudioConverter?
    private var aacFormat: AVAudioFormat?
    private var tapFormat: AVAudioFormat?
    private var tapInstalled = false
    private var downloadTask: URLSessionDownloadTask?
    private(set) var isPlaying = false

    // MARK: - Public API

    /// Downloads (if remote) and starts playing + streaming the given track.
    func startTrack(url: URL, completion: @escaping (Error?) -> Void) {
        stop()
        if url.isFileURL {
            begin(fileURL: url, completion: completion)
            return
        }
        let task = URLSession.shared.downloadTask(with: url) { [weak self] tempURL, _, error in
            guard let self else { return }
            guard error == nil, let tempURL else {
                DispatchQueue.main.async { completion(BroadcastError.downloadFailed) }
                return
            }
            let ext = url.pathExtension.isEmpty ? "mp3" : url.pathExtension
            let localURL = FileManager.default.temporaryDirectory
                .appendingPathComponent("raga-broadcast-\(UUID().uuidString)")
                .appendingPathExtension(ext)
            do {
                try FileManager.default.moveItem(at: tempURL, to: localURL)
            } catch {
                DispatchQueue.main.async { completion(BroadcastError.downloadFailed) }
                return
            }
            DispatchQueue.main.async { self.begin(fileURL: localURL, completion: completion) }
        }
        downloadTask = task
        task.resume()
    }

    func pause() {
        player.pause()
        isPlaying = false
    }

    func resume() {
        player.play()
        isPlaying = true
    }

    func stop() {
        downloadTask?.cancel()
        downloadTask = nil
        if tapInstalled {
            engine.mainMixerNode.removeTap(onBus: 0)
            tapInstalled = false
        }
        player.stop()
        engine.stop()
        converter = nil
        isPlaying = false
    }

    // MARK: - Engine setup

    private func begin(fileURL: URL, completion: @escaping (Error?) -> Void) {
        let file: AVAudioFile
        do {
            file = try AVAudioFile(forReading: fileURL)
        } catch {
            completion(BroadcastError.unreadableAudio)
            return
        }

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default)
            try session.setActive(true)
        } catch {
            completion(error)
            return
        }

        if engine.attachedNodes.contains(player) == false {
            engine.attach(player)
        }
        engine.connect(player, to: engine.mainMixerNode, format: file.processingFormat)

        let mixerFormat = engine.mainMixerNode.outputFormat(forBus: 0)
        guard setUpEncoder(for: mixerFormat) else {
            completion(BroadcastError.encoderSetupFailed)
            return
        }

        engine.mainMixerNode.installTap(onBus: 0, bufferSize: 4096, format: mixerFormat) { [weak self] buffer, _ in
            self?.encodeAndSend(buffer)
        }
        tapInstalled = true
        tapFormat = mixerFormat

        do {
            engine.prepare()
            try engine.start()
        } catch {
            completion(error)
            return
        }

        player.scheduleFile(file, at: nil) { [weak self] in
            DispatchQueue.main.async {
                guard let self, self.isPlaying else { return }
                self.isPlaying = false
                self.onTrackFinished?()
            }
        }
        player.play()
        isPlaying = true
        completion(nil)
    }

    private func setUpEncoder(for inputFormat: AVAudioFormat) -> Bool {
        var description = AudioStreamBasicDescription()
        description.mSampleRate = inputFormat.sampleRate
        description.mFormatID = kAudioFormatMPEG4AAC
        description.mChannelsPerFrame = min(inputFormat.channelCount, 2)
        description.mFramesPerPacket = 1024

        guard let outputFormat = AVAudioFormat(streamDescription: &description),
              let converter = AVAudioConverter(from: inputFormat, to: outputFormat) else {
            return false
        }
        converter.bitRate = 128_000
        self.converter = converter
        self.aacFormat = outputFormat
        return true
    }

    // MARK: - Encoding

    private func encodeAndSend(_ buffer: AVAudioPCMBuffer) {
        guard let converter, let aacFormat, let tapFormat else { return }

        let maxPacketSize = converter.maximumOutputPacketSize
        let outBuffer = AVAudioCompressedBuffer(format: aacFormat,
                                                packetCapacity: 8,
                                                maximumPacketSize: maxPacketSize)
        var fed = false
        var error: NSError?
        let status = converter.convert(to: outBuffer, error: &error) { _, outStatus in
            if fed {
                outStatus.pointee = .noDataNow
                return nil
            }
            fed = true
            outStatus.pointee = .haveData
            return buffer
        }
        guard status != .error, outBuffer.packetCount > 0,
              let descriptions = outBuffer.packetDescriptions else { return }

        var packets: [Data] = []
        packets.reserveCapacity(Int(outBuffer.packetCount))
        for index in 0..<Int(outBuffer.packetCount) {
            let description = descriptions[index]
            let start = Int(description.mStartOffset)
            let size = Int(description.mDataByteSize)
            packets.append(Data(bytes: outBuffer.data.advanced(by: start), count: size))
        }

        let batch = AudioPacketBatch(sampleRate: UInt32(tapFormat.sampleRate),
                                     channels: UInt8(min(tapFormat.channelCount, 2)),
                                     packets: packets)
        sendData?(WireMessage.encode(batch))
    }
}
