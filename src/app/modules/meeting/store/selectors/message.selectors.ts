import { createFeatureSelector, createSelector, MemoizedSelector } from '@ngrx/store'
import { AppState } from '@/reducers'
import { IMessage } from '@/modules/meeting/models/message.model';
import { EntityMap, EntityState } from '@ngrx/entity';
export const selectMessagesState = createFeatureSelector<AppState>('Meetings')

const getEntities = (entities: IMessage[]): IMessage[] => Object.values(entities)

export const selectMessages = (id: string): MemoizedSelector<object, any> => createSelector(
    selectMessagesState,
    (map: any): IMessage[] => {
        const result = getEntities(map.Messages.entities).filter((message: IMessage) => message.clientId === id)
        return result
    }
)
