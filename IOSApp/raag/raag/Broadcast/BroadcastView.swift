//
//  BroadcastView.swift
//  raag
//
//  UI for the nearby-broadcast feature: pick a role, manage the session,
//  and see connected devices / stream status.
//

import MultipeerConnectivity
import SwiftUI

struct BroadcastView: View {
    @ObservedObject var viewModel: BroadcastViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Group {
                switch viewModel.role {
                case .none:
                    rolePicker
                case .host:
                    hostView
                case .listener:
                    listenerView
                }
            }
            .navigationTitle("Nearby Broadcast")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    // MARK: - Role selection

    private var rolePicker: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "antenna.radiowaves.left.and.right")
                .font(.system(size: 56))
                .foregroundStyle(.tint)

            Text("Play on multiple devices")
                .font(.title2.bold())

            Text("Stream the music playing on this phone to nearby iPhones and iPads over Bluetooth and peer-to-peer Wi-Fi. Each connected device plays through its own speaker or Bluetooth audio — up to 8 devices at once.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Spacer()

            VStack(spacing: 12) {
                Button {
                    viewModel.startHosting()
                } label: {
                    Label("Host a broadcast", systemImage: "dot.radiowaves.left.and.right")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)

                Button {
                    viewModel.startListening()
                } label: {
                    Label("Join a nearby broadcast", systemImage: "ear.badge.waveform")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .controlSize(.large)
            }
            .padding(.horizontal)
            .padding(.bottom, 24)
        }
    }

    // MARK: - Host

    private var hostView: some View {
        List {
            Section("Now playing") {
                if let title = viewModel.nowPlayingTitle {
                    Label(title, systemImage: "music.note")
                } else {
                    Text("Play a track in the app — it will appear here, ready to broadcast.")
                        .foregroundStyle(.secondary)
                }
            }

            Section {
                if viewModel.isStreaming {
                    Button(role: .destructive) {
                        viewModel.stopStreaming()
                    } label: {
                        Label("Stop streaming", systemImage: "stop.circle")
                    }
                } else {
                    Button {
                        viewModel.streamCurrentTrack()
                    } label: {
                        Label("Stream to connected devices", systemImage: "speaker.wave.2.circle")
                    }
                    .disabled(!viewModel.canStream)
                }

                if let status = viewModel.statusMessage {
                    Text(status)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            } footer: {
                if viewModel.isStreaming {
                    Text("This phone plays the track and streams it live to every connected device.")
                }
            }

            Section("Connected devices (\(viewModel.peers.connectedPeers.count))") {
                if viewModel.peers.connectedPeers.isEmpty {
                    HStack {
                        ProgressView()
                        Text("Waiting for nearby devices to join…")
                            .foregroundStyle(.secondary)
                    }
                } else {
                    ForEach(viewModel.peers.connectedPeers, id: \.self) { peer in
                        Label(peer.displayName, systemImage: "iphone.radiowaves.left.and.right")
                    }
                }
            }

            Section {
                Button(role: .destructive) {
                    viewModel.leave()
                } label: {
                    Text("Stop hosting")
                }
            }
        }
    }

    // MARK: - Listener

    private var listenerView: some View {
        List {
            if viewModel.peers.connectedPeers.isEmpty {
                Section("Nearby broadcasts") {
                    if viewModel.peers.discoveredHosts.isEmpty {
                        HStack {
                            ProgressView()
                            Text("Looking for nearby broadcasts…")
                                .foregroundStyle(.secondary)
                        }
                    } else {
                        ForEach(viewModel.peers.discoveredHosts, id: \.self) { host in
                            Button {
                                viewModel.join(host)
                            } label: {
                                HStack {
                                    Label(host.displayName, systemImage: "dot.radiowaves.left.and.right")
                                    Spacer()
                                    if viewModel.peers.connectingPeer == host {
                                        ProgressView()
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                Section("Connected to") {
                    ForEach(viewModel.peers.connectedPeers, id: \.self) { peer in
                        Label(peer.displayName, systemImage: "dot.radiowaves.left.and.right")
                    }
                }

                Section("Stream") {
                    if viewModel.isReceivingAudio {
                        HStack(spacing: 12) {
                            Image(systemName: "speaker.wave.3.fill")
                                .foregroundStyle(.tint)
                                .symbolEffect(.variableColor.iterative, isActive: true)
                            VStack(alignment: .leading) {
                                Text(viewModel.incomingTrackTitle ?? "Receiving audio")
                                    .font(.headline)
                                Text("Playing through this device's audio output")
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    } else {
                        Text("Connected — waiting for the host to start streaming.")
                            .foregroundStyle(.secondary)
                    }
                } footer: {
                    Text("Audio plays through whatever this device is using: its speaker, or your own Bluetooth headphones or speaker.")
                }
            }

            Section {
                Button(role: .destructive) {
                    viewModel.leave()
                } label: {
                    Text("Leave")
                }
            }
        }
    }
}

#Preview {
    BroadcastView(viewModel: BroadcastViewModel())
}
