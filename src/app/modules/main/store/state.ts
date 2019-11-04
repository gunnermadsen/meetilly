import { IMeeting } from '@/shared/models/meeting.model';
import { EntityState } from '@ngrx/entity';

export interface MeetingMapState {
    Meetings: MeetingState
    MeetingSettings: MeetingSettingsState
}

export interface MeetingState extends EntityState<IMeeting> { }


export interface MeetingSettingsState {
    meetingViewState: boolean
}
