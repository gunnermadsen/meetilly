import { props, createAction } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { IMeeting } from '@/shared/models/meeting.model';

export const createMeeting = createAction('[Meeting API] Create New Meeting', props<{ meeting: IMeeting }>())
export const saveMeetings =  createAction('[Meeting Client] Save Meetings From Server', props<{ meetings: IMeeting[] }>())
export const fetchMeetings = createAction('[Meeting API] Fetch All Meetings')
export const updateMeeting = createAction('[Meeting API] Update Meeting', props<{ meeting: Update<IMeeting> }>())
export const deleteMeeting = createAction('[Meeting API] Delete Meeting', props<{ id: string }>())
export const verifyMeeting = createAction('[Meeting API] Verify Meeting', props<{ code: string }>())
export const setMeetingViewState = createAction('[Meeting Client] Set Meeting View State', props<{ meetingViewState: boolean }>())