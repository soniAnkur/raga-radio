//
//  PeerAudioReceiver.swift
//  raag
//
//  Listener-side audio pipeline. Receives AAC packet batches from the host,
//  decodes them back to PCM and schedules them on a local AVAudioEngine.
//  Playback starts after a short jitter buffer so brief transport hiccups
//  don't cause glitches. Output follows the listener device's own audio
//  route — built-in speaker, wired or Bluetooth headphones/speakers.
//

import AVFoundation
import Foundation

final class PeerAudioReceiver {
    /// Called once (on an internal queue) when buffered playback actually starts.
    var onPlaybackStarted: (() -> Void)?

    private let engine = AVAudioEngine()
    private let player = AVAudioPlayerNode()
    private var converter: AVAudioConverter?
    private var aacFormat: AVAudioFormat?
    private var pcmFormat: AVAudioFormat?
    private var configuredSampleRate: UInt32 = 0
    private var configuredChannels: UInt8 = 0
    private var buffersScheduled = 0
    private var playbackStarted = false
    private let queue = DispatchQueue(label: "com.soniapps.raag.broadcast.receive")

    /// Number of batches to accumulate before starting playback (~250 ms).
    private let jitterBufferDepth = 3

    func handle(_ batch: AudioPacketBatch) {
        queue.async { [weak self] in
            self?.process(batch)
        }
    }

    func stop() {
        queue.async { [weak self] in
            guard let self else { return }
            self.player.stop()
            self.engine.stop()
            self.converter = nil
            self.configuredSampleRate = 0
            self.configuredChannels = 0
            self.buffersScheduled = 0
            self.playbackStarted = false
        }
    }

    // MARK: - Decoding

    private func process(_ batch: AudioPacketBatch) {
        guard !batch.packets.isEmpty else { return }

        if batch.sampleRate != configuredSampleRate || batch.channels != configuredChannels {
            guard configure(sampleRate: batch.sampleRate, channels: batch.channels) else { return }
        }
        guard let converter, let aacFormat, let pcmFormat else { return }

        // Rebuild an AVAudioCompressedBuffer from the received packets.
        let maxPacketSize = batch.packets.map(\.count).max() ?? 2048
        let inBuffer = AVAudioCompressedBuffer(format: aacFormat,
                                               packetCapacity: AVAudioPacketCount(batch.packets.count),
                                               maximumPacketSize: maxPacketSize)
        guard let descriptions = inBuffer.packetDescriptions else { return }

        var offset = 0
        for (index, packet) in batch.packets.enumerated() {
            packet.withUnsafeBytes { raw in
                guard let base = raw.baseAddress else { return }
                memcpy(inBuffer.data.advanced(by: offset), base, packet.count)
            }
            descriptions[index] = AudioStreamPacketDescription(mStartOffset: Int64(offset),
                                                               mVariableFramesInPacket: 0,
                                                               mDataByteSize: UInt32(packet.count))
            offset += packet.count
        }
        inBuffer.packetCount = AVAudioPacketCount(batch.packets.count)
        inBuffer.byteLength = UInt32(offset)

        let capacity = AVAudioFrameCount(1024 * batch.packets.count + 2048)
        guard let pcmBuffer = AVAudioPCMBuffer(pcmFormat: pcmFormat, frameCapacity: capacity) else { return }

        var fed = false
        var error: NSError?
        let status = converter.convert(to: pcmBuffer, error: &error) { _, outStatus in
            if fed {
                outStatus.pointee = .noDataNow
                return nil
            }
            fed = true
            outStatus.pointee = .haveData
            return inBuffer
        }
        guard status != .error, pcmBuffer.frameLength > 0 else { return }

        player.scheduleBuffer(pcmBuffer)
        buffersScheduled += 1
        if !playbackStarted && buffersScheduled >= jitterBufferDepth {
            player.play()
            playbackStarted = true
            onPlaybackStarted?()
        }
    }

    private func configure(sampleRate: UInt32, channels: UInt8) -> Bool {
        player.stop()
        engine.stop()
        playbackStarted = false
        buffersScheduled = 0

        var description = AudioStreamBasicDescription()
        description.mSampleRate = Double(sampleRate)
        description.mFormatID = kAudioFormatMPEG4AAC
        description.mChannelsPerFrame = UInt32(channels)
        description.mFramesPerPacket = 1024

        guard let aacFormat = AVAudioFormat(streamDescription: &description),
              let pcmFormat = AVAudioFormat(standardFormatWithSampleRate: Double(sampleRate),
                                            channels: AVAudioChannelCount(channels)),
              let converter = AVAudioConverter(from: aacFormat, to: pcmFormat) else {
            return false
        }

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default)
            try session.setActive(true)
        } catch {
            return false
        }

        if engine.attachedNodes.contains(player) == false {
            engine.attach(player)
        }
        engine.connect(player, to: engine.mainMixerNode, format: pcmFormat)

        do {
            engine.prepare()
            try engine.start()
        } catch {
            return false
        }

        self.aacFormat = aacFormat
        self.pcmFormat = pcmFormat
        self.converter = converter
        self.configuredSampleRate = sampleRate
        self.configuredChannels = channels
        return true
    }
}
