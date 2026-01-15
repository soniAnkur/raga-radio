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

    var body: some View {
        ZStack {
            if let url = URL(string: urlString) {
                WebView(url: url, isLoading: $isLoading)
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
            }

            if isLoading {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .blue))
                    .scaleEffect(1.5)
            }
        }
    }
}

#Preview {
    ContentView()
}
