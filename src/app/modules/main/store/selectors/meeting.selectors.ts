import { createFeatureSelector, createSelector, MemoizedSelector } from '@ngrx/store'
import { IMeeting } from '@/shared/models/meeting.model'
import { AppState } from '../../../../reducers'
export const selectMeetingState = createFeatureSelector<AppState>('Meetings')

const getEntities = (entities: IMeeting[]): IMeeting[] => Object.values(entities)

export const selectMeetings: MemoizedSelector<object, any> = createSelector(
    selectMeetingState,
    (map: any): IMeeting[] => {
        return getEntities(map.Meetings.entities)
    }
)

export const selectMeetingViewState: MemoizedSelector<object, any> = createSelector(
    selectMeetingState,
    (map: any): boolean => {
        return map.MeetingSettings.meetingViewState
    }
)
