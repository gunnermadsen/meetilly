import { createReducer, on, Action } from '@ngrx/store';
import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity'
import { createMeeting, fetchMeetings, updateMeeting, deleteMeeting, saveMeetings } from '../actions/meeting.actions';
import { IMeeting } from '@/shared/models/meeting.model';
import { MeetingState } from '../state';

export const adapter: EntityAdapter<IMeeting> = createEntityAdapter<IMeeting>({
    selectId: (entity) => entity.MeetingId
})

export const initialMeetingState: MeetingState = adapter.getInitialState()

const reducer = createReducer(
    initialMeetingState,
    on(createMeeting, (state: MeetingState, { meeting }) => adapter.addOne(meeting, state)),
    on(saveMeetings, (state: MeetingState, { meetings }) => adapter.addAll(meetings, state)),
    on(updateMeeting, (state: MeetingState, { meeting }) => adapter.updateOne(meeting, state)),
    on(deleteMeeting, (state: MeetingState, { id }) => adapter.removeOne(id, state))
)

export function MeetingReducer(state: MeetingState | undefined, action: Action) {
    return reducer(state, action)
}