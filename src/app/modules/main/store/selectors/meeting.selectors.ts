import { createFeatureSelector, createSelector, MemoizedSelector } from '@ngrx/store'
import { IMeeting } from '@/shared/models/meeting.model'
export const selectMeetingState = createFeatureSelector<IMeeting[]>('Meetings')

const getEntities = (entities: IMeeting[]): IMeeting[] => Object.values(entities)

export const selectMeetings: MemoizedSelector<object, any> = createSelector(
    selectMeetingState,
    (meetings: any): IMeeting[] => {
        return getEntities(meetings.entities)
    }
)
