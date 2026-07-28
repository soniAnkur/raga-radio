//
//  ContentView.swift
//  raag
//
//  Created by Ankur Soni on 1/11/26.
//

import SwiftUI

struct ContentView: View {
    // Change this URL to load your desired web content
    @State private var urlString = "https://ragaradio.vercel.app/"
    @State private var isLoading = false
    @State private var showBroadcastSheet = false

    @StateObject private var broadcastViewModel = BroadcastViewModel()
    @StateObject private var webProxy = WebViewProxy()

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            if let url = URL(string: urlString) {
                WebView(url: url, isLoading: $isLoading, proxy: webProxy) { [weak broadcastViewModel] info in
                    // WKScriptMessageHandler always delivers on the main thread.
                    MainActor.assumeIsolated {
                        broadcastViewModel?.handleWebMediaEvent(info)
                    }
                }
                .ignoresSafeArea()
            } else {
                VStack {
                    Image(systemName: "exclamationmark.triangle")
                        .imageScale(.large)
                        .foregroundStyle(.red)
                    Text("Invalid URL")
                        .font(.headline)
                    Text("Please check the URL configuration")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }

            if isLoading {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .blue))
                    .scaleEffect(1.5)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }

            broadcastButton
                .padding(.trailing, 20)
                .padding(.bottom, 32)
        }
        .onAppear {
            broadcastViewModel.webProxy = webProxy
        }
        .sheet(isPresented: $showBroadcastSheet) {
            BroadcastView(viewModel: broadcastViewModel)
        }
    }

    /// Floating button that opens the nearby-broadcast panel. Shows a green
    /// badge while a session (hosting or listening) is active.
    private var broadcastButton: some View {
        Button {
            showBroadcastSheet = true
        } label: {
            ZStack(alignment: .topTrailing) {
                Image(systemName: "antenna.radiowaves.left.and.right")
                    .font(.title2)
                    .foregroundStyle(.white)
                    .padding(14)
                    .background(Circle().fill(Color.accentColor))
                    .shadow(radius: 4, y: 2)

                if broadcastViewModel.role != .none {
                    Circle()
                        .fill(.green)
                        .frame(width: 12, height: 12)
                        .overlay(Circle().stroke(.white, lineWidth: 2))
                }
            }
        }
        .accessibilityLabel("Nearby broadcast")
    }
}

#Preview {
    ContentView()
}
