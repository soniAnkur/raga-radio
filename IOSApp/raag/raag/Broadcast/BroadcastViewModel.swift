//
//  BroadcastViewModel.swift
//  raag
//
//  Orchestrates the nearby-broadcast feature: role selection, peer session,
//  host-side streaming of the track currently playing in the web app, and
//  listener-side reception.
//

import Combine
import Foundation
import MultipeerConnectivity

@MainActor
final class BroadcastViewModel: ObservableObject {
    enum Role {
        case none
        case host
        case listener
    }

    @Published var role: Role = .none
    @Published var isStreaming = false
    @Published var statusMessage: String?

    /// Track currently playing in the embedded web app (host side).
    @Published var nowPlayingTitle: String?
    @Published var nowPlayingURL: URL?

    /// Track title announced by the host (listener side).
    @Published var incomingTrackTitle: String?
    @Published var isReceivingAudio = false

    let peers = PeerSessionManager()

    /// Set by ContentView so the view model can pause web playback while
    /// the native engine takes over the audio.
    weak var webProxy: WebViewProxy?

    private let broadcaster = AudioBroadcaster()
    private let receiver = PeerAudioReceiver()
    private var streamingURL: URL?
    private var cancellables: Set<AnyCancellable> = []

    init() {
        // Captures `receiver` directly: audio batches go straight to its
        // serial queue (preserving packet order) without a main-actor hop.
        peers.onData = { [weak self, receiver] data, _ in
            guard let decoded = WireMessage.decode(data) else { return }
            switch decoded {
            case .audio(let batch):
                receiver.handle(batch)
            case .control(let message):
                Task { @MainActor in self?.applyControl(message) }
            }
        }
        receiver.onPlaybackStarted = { [weak self] in
            Task { @MainActor in self?.isReceivingAudio = true }
        }
        broadcaster.sendData = { [peers] data in
            peers.broadcast(data)
        }
        broadcaster.onTrackFinished = { [weak self] in
            Task { @MainActor in self?.finishStreaming(notifyPeers: true) }
        }
        // Re-publish nested ObservableObject changes so SwiftUI views
        // observing this model refresh when the peer list updates. The peer
        // manager only mutates its published state on the main queue.
        peers.objectWillChange
            .sink { [weak self] _ in self?.objectWillChange.send() }
            .store(in: &cancellables)
    }

    // MARK: - Role management

    func startHosting() {
        leave()
        role = .host
        statusMessage = nil
        peers.startHosting()
    }

    func startListening() {
        leave()
        role = .listener
        statusMessage = nil
        peers.startBrowsing()
    }

    func join(_ host: MCPeerID) {
        peers.invite(host)
    }

    func leave() {
        if isStreaming {
            finishStreaming(notifyPeers: true)
        }
        receiver.stop()
        peers.stop()
        role = .none
        isStreaming = false
        isReceivingAudio = false
        incomingTrackTitle = nil
        statusMessage = nil
    }

    // MARK: - Host side

    var canStream: Bool {
        nowPlayingURL != nil
    }

    func streamCurrentTrack() {
        guard let url = nowPlayingURL else {
            statusMessage = "Play a track in the app first — it will be captured here automatically."
            return
        }
        startStreaming(url: url, title: nowPlayingTitle)
    }

    func stopStreaming() {
        finishStreaming(notifyPeers: true)
    }

    private func startStreaming(url: URL, title: String?) {
        // Silence the web player; the native engine plays and broadcasts.
        webProxy?.pauseAllMedia()
        statusMessage = "Preparing stream…"
        streamingURL = url

        if let data = WireMessage.encode(ControlMessage(kind: .trackInfo, title: title)) {
            peers.broadcast(data)
        }

        broadcaster.startTrack(url: url) { [weak self] error in
            guard let self else { return }
            Task { @MainActor in
                if let error {
                    self.statusMessage = error.localizedDescription
                    self.isStreaming = false
                    self.streamingURL = nil
                } else {
                    self.statusMessage = nil
                    self.isStreaming = true
                }
            }
        }
    }

    private func finishStreaming(notifyPeers: Bool) {
        broadcaster.stop()
        isStreaming = false
        streamingURL = nil
        if notifyPeers, let data = WireMessage.encode(ControlMessage(kind: .stop)) {
            peers.broadcast(data)
        }
    }

    // MARK: - Web app events

    /// Fed from the WKWebView script handler whenever a media element in the
    /// web app starts or stops playing.
    func handleWebMediaEvent(_ info: [String: Any]) {
        guard let event = info["event"] as? String else { return }
        let src = (info["src"] as? String) ?? ""
        let title = (info["title"] as? String) ?? ""

        switch event {
        case "play", "playing":
            guard let url = URL(string: src), !src.isEmpty else { return }
            nowPlayingURL = url
            nowPlayingTitle = displayTitle(pageTitle: title, url: url)
            // While actively streaming, follow the host's in-app track changes.
            if role == .host, isStreaming, url != streamingURL {
                startStreaming(url: url, title: nowPlayingTitle)
            } else if role == .host, isStreaming, url == streamingURL {
                // The web player restarted the same track natively being
                // streamed — keep the web app silent.
                webProxy?.pauseAllMedia()
            }
        default:
            break
        }
    }

    private func displayTitle(pageTitle: String, url: URL) -> String {
        let trimmed = pageTitle.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty && trimmed.lowercased() != "raga radio" {
            return trimmed
        }
        let name = url.deletingPathExtension().lastPathComponent
            .replacingOccurrences(of: "-", with: " ")
            .replacingOccurrences(of: "_", with: " ")
        return name.isEmpty ? "Raga Radio track" : name
    }

    // MARK: - Incoming control messages (listener side)

    private func applyControl(_ message: ControlMessage) {
        switch message.kind {
        case .trackInfo:
            incomingTrackTitle = message.title
        case .stop:
            isReceivingAudio = false
            incomingTrackTitle = nil
            receiver.stop()
        case .pause, .resume:
            break
        }
    }
}
