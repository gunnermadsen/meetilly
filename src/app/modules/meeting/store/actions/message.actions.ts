import { props, createAction } from '@ngrx/store';
import { IMessage, FileMessage } from '../../models/message.model';
import { Update } from '@ngrx/entity';

export const createMessage = createAction('[Messages Client] Create New Message', props<{ message: IMessage }>())
export const saveMessages = createAction('[Messages API] Save Messages to Server', props<{ messages: IMessage[] }>())
export const updateFileTransferState = createAction('[Messages Client] Update Message Data', props<{ fileData: Update<any> }>())