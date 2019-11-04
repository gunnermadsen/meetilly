import { createReducer, on, Action } from '@ngrx/store';
import { setMeetingViewState } from '../actions/meeting.actions';
import { MeetingSettingsState } from '../state';


const initialMeetingSettingsState: MeetingSettingsState = {
    meetingViewState: false
}

const reducer = createReducer(
    initialMeetingSettingsState,
    on(setMeetingViewState, (state: MeetingSettingsState, { meetingViewState }) => {
        return {
            meetingViewState: meetingViewState
        }
    })
)

export function MeetingSettingsReducer(state: MeetingSettingsState | undefined, action: Action) {
    return reducer(state, action)
}