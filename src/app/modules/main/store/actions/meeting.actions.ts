import { props, createAction } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { IMeeting } from '@/shared/models/meeting.model';

export const createMeeting = createAction('[Create Meeting API] Create New Meeting', props<{ meeting: IMeeting }>())
export const saveMeetings = createAction('[Save Meeting Client] Save Meetings From Server', props<{ meetings: IMeeting[] }>())
export const fetchMeetings = createAction('[Fetch Meetings API] Fetch All Meetings')
export const updateMeeting = createAction('[Update Meeting API] Update Meeting', props<{ meeting: Update<IMeeting> }>())
export const deleteMeeting = createAction('[Delete Meeting API] Delete Meeting', props<{ id: string }>())
export const verifyMeeting = createAction('[Verify Meeting API] Verify Meeting', props<{ code: string }>())