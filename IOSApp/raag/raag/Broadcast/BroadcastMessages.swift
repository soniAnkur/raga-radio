//
//  BroadcastMessages.swift
//  raag
//
//  Wire protocol for the nearby-broadcast feature.
//  Every MultipeerConnectivity payload starts with a one-byte tag:
//    0x01 — JSON-encoded ControlMessage
//    0x02 — binary AudioPacketBatch (AAC packets)
//

import Foundation

/// Control-plane messages exchanged between host and listeners.
struct ControlMessage: Codable {
    enum Kind: String, Codable {
        /// Host announces the track it is about to stream.
        case trackInfo
        /// Host paused the stream.
        case pause
        /// Host resumed the stream.
        case resume
        /// Host stopped streaming entirely.
        case stop
    }

    var kind: Kind
    var title: String?
}

/// A batch of encoded AAC packets captured from the host's audio engine.
/// Self-describing: carries the sample rate and channel count so listeners
/// can (re)configure their decoder at any point in the stream.
struct AudioPacketBatch {
    var sampleRate: UInt32
    var channels: UInt8
    var packets: [Data]
}

enum WireMessage {
    static let controlTag: UInt8 = 0x01
    static let audioTag: UInt8 = 0x02

    enum Decoded {
        case control(ControlMessage)
        case audio(AudioPacketBatch)
    }

    static func encode(_ message: ControlMessage) -> Data? {
        guard let json = try? JSONEncoder().encode(message) else { return nil }
        var data = Data([controlTag])
        data.append(json)
        return data
    }

    static func encode(_ batch: AudioPacketBatch) -> Data {
        var data = Data([audioTag])
        appendUInt32(&data, batch.sampleRate)
        data.append(batch.channels)
        appendUInt16(&data, UInt16(batch.packets.count))
        for packet in batch.packets {
            appendUInt32(&data, UInt32(packet.count))
            data.append(packet)
        }
        return data
    }

    static func decode(_ data: Data) -> Decoded? {
        guard let tag = data.first else { return nil }
        let body = data.dropFirst()
        switch tag {
        case controlTag:
            guard let message = try? JSONDecoder().decode(ControlMessage.self, from: Data(body)) else { return nil }
            return .control(message)
        case audioTag:
            guard let batch = decodeBatch(Data(body)) else { return nil }
            return .audio(batch)
        default:
            return nil
        }
    }

    // MARK: - Binary helpers (little-endian)

    private static func appendUInt16(_ data: inout Data, _ value: UInt16) {
        withUnsafeBytes(of: value.littleEndian) { data.append(contentsOf: $0) }
    }

    private static func appendUInt32(_ data: inout Data, _ value: UInt32) {
        withUnsafeBytes(of: value.littleEndian) { data.append(contentsOf: $0) }
    }

    private static func decodeBatch(_ data: Data) -> AudioPacketBatch? {
        var offset = 0

        func readUInt16() -> UInt16? {
            guard offset + 2 <= data.count else { return nil }
            let value = data.subdata(in: (data.startIndex + offset)..<(data.startIndex + offset + 2))
                .withUnsafeBytes { $0.loadUnaligned(as: UInt16.self) }
            offset += 2
            return UInt16(littleEndian: value)
        }

        func readUInt32() -> UInt32? {
            guard offset + 4 <= data.count else { return nil }
            let value = data.subdata(in: (data.startIndex + offset)..<(data.startIndex + offset + 4))
                .withUnsafeBytes { $0.loadUnaligned(as: UInt32.self) }
            offset += 4
            return UInt32(littleEndian: value)
        }

        guard let sampleRate = readUInt32(),
              offset < data.count else { return nil }
        let channels = data[data.startIndex + offset]
        offset += 1

        guard let packetCount = readUInt16() else { return nil }
        var packets: [Data] = []
        packets.reserveCapacity(Int(packetCount))
        for _ in 0..<packetCount {
            guard let size = readUInt32(),
                  offset + Int(size) <= data.count else { return nil }
            packets.append(data.subdata(in: (data.startIndex + offset)..<(data.startIndex + offset + Int(size))))
            offset += Int(size)
        }
        return AudioPacketBatch(sampleRate: sampleRate, channels: channels, packets: packets)
    }
}
