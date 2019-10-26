import { createReducer, on, Action } from '@ngrx/store';
import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity'
import { createMeeting, fetchMeetings, updateMeeting, deleteMeeting, saveMeetings } from '../actions/meeting.actions';
import { IMeeting } from '@/shared/models/meeting.model';

export interface State extends EntityState<IMeeting> {}

export const adapter: EntityAdapter<IMeeting> = createEntityAdapter<IMeeting>({
    selectId: (entity) => entity.MeetingId
})

export const initialState: State = adapter.getInitialState()

const reducer = createReducer(
    initialState,
    on(createMeeting, (state: State, { meeting }) => adapter.addOne(meeting, state)),
    on(saveMeetings, (state: State, { meetings }) => adapter.addAll(meetings, state)),
    on(updateMeeting, (state: State, { meeting }) => adapter.updateOne(meeting, state)),
    on(deleteMeeting, (state: State, { id }) => adapter.removeOne(id, state))
)

export function MeetingReducer(state: State | undefined, action: Action) {
    return reducer(state, action)
}