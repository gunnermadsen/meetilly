export interface IPayload { 
    meetingId: number 
    roomId?: string
    member?: string 
    mode?: string 
    data?: any
    userType?: string
    filename?: string
    filesize?: number
    isUpload?: boolean

}