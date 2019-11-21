export const sizeConstraints = {
    width: { min: 1280, ideal: 1280, max: 1920 },
    height: { min: 720, ideal: 720, max: 1080 }
}

export const peerConstraints = {
    iceServers: [
        // Session Traversal Utilities for NAT (STUN)
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' },
    ]
}