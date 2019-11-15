import { props, createAction } from '@ngrx/store';
import { IMessage } from '../../models/message.model';

export const createMessage = createAction('[Messages Client] Create New Message', props<{ message: IMessage }>())
export const saveMessages = createAction('[Messages API] Save Messages to Server', props<{ messages: IMessage[] }>())