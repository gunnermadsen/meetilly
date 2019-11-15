export interface IMessage {
    sender: string
    body: string
    contentType: string
    file?: {
        name: string
        size: number
        progress: number
    }
    userType: string
    clientId: string
    timestamp: Date
}
