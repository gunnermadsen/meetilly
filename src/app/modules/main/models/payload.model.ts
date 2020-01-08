export interface IPayload { 
    meetingId?: string 
    roomId?: string
    clientId?: string
    member?: string 
    mode?: string 
    data?: any
    sender?: string
    receiver?: string
    filename?: string
    filesize?: number
    isUpload?: boolean

}