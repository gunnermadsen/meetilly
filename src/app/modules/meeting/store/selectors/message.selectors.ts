import { createFeatureSelector, createSelector, MemoizedSelector } from '@ngrx/store'
import { AppState } from '@/reducers'
import { IMessage } from '@/modules/meeting/models/message.model';
export const selectMessagesState = createFeatureSelector<AppState>('Meetings')

const getEntitiesFromMap = (entities: IMessage[]): IMessage[] => Object.values(entities)

export const selectMessages = (id: string): MemoizedSelector<object, any> => createSelector(
    selectMessagesState,
    (map: any): IMessage[] | any[] => {
        if (id === undefined) {
            return []
        }
        
        const result = getEntitiesFromMap(map.Messages.entities).filter((message: IMessage) => message.clientId === id)
        return result
    }
)
