import { EntityState } from '@ngrx/entity';
import { IMessage } from '../models/message.model';


export interface MessageState extends EntityState<IMessage> { }