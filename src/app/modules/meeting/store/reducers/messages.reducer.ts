import { createReducer, on, Action } from '@ngrx/store';
import { EntityAdapter, createEntityAdapter } from '@ngrx/entity'
import { MessageState } from '../state';
import { createMessage, saveMessages } from '../actions/message.actions';
import { v4 } from 'uuid'
import { IMessage } from '../../models/message.model';

export const adapter: EntityAdapter<IMessage> = createEntityAdapter<IMessage>({
    selectId: () => v4()
})

export const initialMeetingState: MessageState = adapter.getInitialState()

const reducer = createReducer(
    initialMeetingState,
    on(createMessage, (state: MessageState, { message }) => {
        return adapter.addOne(message, state);
    }),
    
)

export function MessageReducer(state: MessageState | undefined, action: Action) {
    return reducer(state, action)
}