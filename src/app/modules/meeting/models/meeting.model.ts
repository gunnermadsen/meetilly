export interface PeerConnections {
    [id: string]: RTCPeerConnection
}

export interface DataChannelConnections {
    [id: string]: RTCDataChannel
}

export interface WebcamStreams {
    [id: string]: MediaStream
}

export interface DisplayStreams {
    [id: string]: MediaStream
}

export interface IMessage {
    [id: number]: any
}