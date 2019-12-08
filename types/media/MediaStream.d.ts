interface MediaDevices {
    getSupportedConstraints(): MediaTrackSupportedConstraints;

    getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
    getDisplayMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
    enumerateDevices(): Promise<MediaDeviceInfo[]>;
}