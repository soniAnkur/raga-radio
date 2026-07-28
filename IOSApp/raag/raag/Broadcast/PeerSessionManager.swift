//
//  PeerSessionManager.swift
//  raag
//
//  MultipeerConnectivity wrapper for the nearby-broadcast feature.
//  Discovery and transport run over Bluetooth and peer-to-peer Wi-Fi.
//
//  Roles:
//   - Host: advertises the "raga-audio" service and auto-accepts invitations.
//   - Listener: browses for hosts and invites the chosen one, which joins
//     both devices into the host's session (up to 8 peers).
//

import Foundation
import MultipeerConnectivity
import UIKit

final class PeerSessionManager: NSObject, ObservableObject {
    static let serviceType = "raga-audio"

    enum Mode {
        case idle
        case hosting
        case browsing
    }

    @Published private(set) var mode: Mode = .idle
    @Published private(set) var connectedPeers: [MCPeerID] = []
    @Published private(set) var discoveredHosts: [MCPeerID] = []
    @Published private(set) var connectingPeer: MCPeerID?

    /// Called on an arbitrary queue whenever a data message arrives.
    var onData: ((Data, MCPeerID) -> Void)?
    /// Called on the main queue whenever the connected-peer list changes.
    var onPeersChanged: (() -> Void)?

    private let myPeerID = MCPeerID(displayName: UIDevice.current.name)
    private lazy var session: MCSession = {
        let session = MCSession(peer: myPeerID, securityIdentity: nil, encryptionPreference: .required)
        session.delegate = self
        return session
    }()

    private var advertiser: MCNearbyServiceAdvertiser?
    private var browser: MCNearbyServiceBrowser?
    private let sendQueue = DispatchQueue(label: "com.soniapps.raag.broadcast.send")

    // MARK: - Lifecycle

    func startHosting() {
        stop()
        mode = .hosting
        let advertiser = MCNearbyServiceAdvertiser(peer: myPeerID, discoveryInfo: nil, serviceType: Self.serviceType)
        advertiser.delegate = self
        advertiser.startAdvertisingPeer()
        self.advertiser = advertiser
    }

    func startBrowsing() {
        stop()
        mode = .browsing
        let browser = MCNearbyServiceBrowser(peer: myPeerID, serviceType: Self.serviceType)
        browser.delegate = self
        browser.startBrowsingForPeers()
        self.browser = browser
    }

    func invite(_ host: MCPeerID) {
        connectingPeer = host
        browser?.invitePeer(host, to: session, withContext: nil, timeout: 15)
    }

    func stop() {
        advertiser?.stopAdvertisingPeer()
        advertiser = nil
        browser?.stopBrowsingForPeers()
        browser = nil
        session.disconnect()
        mode = .idle
        connectedPeers = []
        discoveredHosts = []
        connectingPeer = nil
    }

    // MARK: - Sending

    /// Sends data to every connected peer. Safe to call from any thread.
    func broadcast(_ data: Data) {
        sendQueue.async { [weak self] in
            guard let self else { return }
            let peers = self.session.connectedPeers
            guard !peers.isEmpty else { return }
            try? self.session.send(data, toPeers: peers, with: .reliable)
        }
    }
}

// MARK: - MCSessionDelegate

extension PeerSessionManager: MCSessionDelegate {
    func session(_ session: MCSession, peer peerID: MCPeerID, didChange state: MCSessionState) {
        DispatchQueue.main.async {
            self.connectedPeers = session.connectedPeers
            if state != .connecting, self.connectingPeer == peerID {
                self.connectingPeer = nil
            }
            self.onPeersChanged?()
        }
    }

    func session(_ session: MCSession, didReceive data: Data, fromPeer peerID: MCPeerID) {
        onData?(data, peerID)
    }

    func session(_ session: MCSession, didReceive stream: InputStream, withName streamName: String, fromPeer peerID: MCPeerID) {}

    func session(_ session: MCSession, didStartReceivingResourceWithName resourceName: String, fromPeer peerID: MCPeerID, with progress: Progress) {}

    func session(_ session: MCSession, didFinishReceivingResourceWithName resourceName: String, fromPeer peerID: MCPeerID, at localURL: URL?, withError error: Error?) {}
}

// MARK: - MCNearbyServiceAdvertiserDelegate (host)

extension PeerSessionManager: MCNearbyServiceAdvertiserDelegate {
    func advertiser(_ advertiser: MCNearbyServiceAdvertiser,
                    didReceiveInvitationFromPeer peerID: MCPeerID,
                    withContext context: Data?,
                    invitationHandler: @escaping (Bool, MCSession?) -> Void) {
        // Auto-accept listeners into the host session.
        invitationHandler(true, session)
    }
}

// MARK: - MCNearbyServiceBrowserDelegate (listener)

extension PeerSessionManager: MCNearbyServiceBrowserDelegate {
    func browser(_ browser: MCNearbyServiceBrowser, foundPeer peerID: MCPeerID, withDiscoveryInfo info: [String: String]?) {
        DispatchQueue.main.async {
            if !self.discoveredHosts.contains(peerID) {
                self.discoveredHosts.append(peerID)
            }
        }
    }

    func browser(_ browser: MCNearbyServiceBrowser, lostPeer peerID: MCPeerID) {
        DispatchQueue.main.async {
            self.discoveredHosts.removeAll { $0 == peerID }
        }
    }
}
