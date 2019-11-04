import { DataChannelConnections, WebcamStreams, DisplayStreams, PeerConnections } from '../models/meeting.model'

export class ConnectionManagerUtility {
    private _dataChannels: DataChannelConnections = {}
    private _webcamStreams: WebcamStreams = {}
    private _displayStreams: DisplayStreams = {}
    private _connections: PeerConnections = {}
    public speakerlist: MediaDeviceInfo[] = []
    public cameraList: MediaDeviceInfo[]
    public microphoneList: MediaDeviceInfo[]
    private _transceiver: (track: MediaStreamTrack) => RTCRtpTransceiver
    constructor(parameters) {
        
    }

    
}