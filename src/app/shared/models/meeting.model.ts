export interface IMeeting {
    MeetingName: string
    MeetingDescription: string
    MeetingAudio?: boolean
    MeetingVideo?: boolean
    MeetingCode: number
    MeetingId: string
    CreatedOn: Date
    EditedOn: Date
}
