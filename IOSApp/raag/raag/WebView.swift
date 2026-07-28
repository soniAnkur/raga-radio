//
//  WebView.swift
//  raag
//
//  Created by Ankur Soni on 1/11/26.
//

import SwiftUI
import WebKit

/// Lets native code reach back into the web app (e.g. to pause its audio
/// while the native broadcast engine takes over playback).
final class WebViewProxy: ObservableObject {
    weak var webView: WKWebView?

    func pauseAllMedia() {
        webView?.evaluateJavaScript(
            "document.querySelectorAll('audio,video').forEach(function(m){ m.pause(); });",
            completionHandler: nil
        )
    }
}

struct WebView: UIViewRepresentable {
    let url: URL
    @Binding var isLoading: Bool
    var proxy: WebViewProxy?
    /// Receives {event, src, title} dictionaries when media plays/pauses in the web app.
    var onMediaEvent: (([String: Any]) -> Void)?

    private static let mediaHookScript = """
    (function() {
        if (window.__ragaMediaHooked) { return; }
        window.__ragaMediaHooked = true;
        function post(eventName, element) {
            try {
                window.webkit.messageHandlers.ragaMedia.postMessage({
                    event: eventName,
                    src: (element && (element.currentSrc || element.src)) || '',
                    title: document.title || ''
                });
            } catch (e) {}
        }
        ['play', 'playing', 'pause', 'ended'].forEach(function(eventName) {
            document.addEventListener(eventName, function(e) {
                var t = e.target;
                if (t && (t.tagName === 'AUDIO' || t.tagName === 'VIDEO')) {
                    post(eventName, t);
                }
            }, true);
        });
    })();
    """

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()

        // Enable modern web features
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []

        // Enable fullscreen support
        let preferences = WKPreferences()
        preferences.isElementFullscreenEnabled = true
        configuration.preferences = preferences

        // Hook media playback so native code knows what's playing.
        let userScript = WKUserScript(source: Self.mediaHookScript,
                                      injectionTime: .atDocumentEnd,
                                      forMainFrameOnly: false)
        configuration.userContentController.addUserScript(userScript)
        configuration.userContentController.add(WeakScriptMessageHandler(context.coordinator), name: "ragaMedia")

        // Create webview with configuration
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true

        // Enable scrolling and zooming
        webView.scrollView.isScrollEnabled = true
        webView.scrollView.bounces = true

        proxy?.webView = webView
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        context.coordinator.parent = self
        if webView.url != url {
            let request = URLRequest(url: url)
            webView.load(request)
        }
    }

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "ragaMedia")
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var parent: WebView

        init(_ parent: WebView) {
            self.parent = parent
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            parent.isLoading = true
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            parent.isLoading = false
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            parent.isLoading = false
        }

        func userContentController(_ userContentController: WKUserContentController,
                                   didReceive message: WKScriptMessage) {
            guard message.name == "ragaMedia",
                  let body = message.body as? [String: Any] else { return }
            parent.onMediaEvent?(body)
        }
    }
}

/// WKUserContentController retains its message handlers strongly; this
/// wrapper avoids a retain cycle with the coordinator.
private final class WeakScriptMessageHandler: NSObject, WKScriptMessageHandler {
    private weak var delegate: WKScriptMessageHandler?

    init(_ delegate: WKScriptMessageHandler) {
        self.delegate = delegate
    }

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        delegate?.userContentController(userContentController, didReceive: message)
    }
}
