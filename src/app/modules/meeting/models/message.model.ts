export interface FileMessage {
    name?: string
    size?: number
    progress: number
    buffer: ArrayBuffer
    result?: Blob
}

export interface IMessage {
    sender: string
    body: string
    contentType: string
    file?: FileMessage
    userType: string
    clientId: string
    timestamp: Date
}