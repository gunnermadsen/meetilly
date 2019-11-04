import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MeetingComponent } from '@/modules/meeting/components/meeting/meeting.component';
import { MeetingRouterModule } from './meeting.router.module';
import { SharedModule } from '@/shared/shared.module';
import { MessageStylesDirective } from '../../shared/directives/message-styles/message-styles.directive';
import { StoreModule } from '@ngrx/store';
import { MeetingMap } from '../../reducers';


@NgModule({
    declarations: [
        MeetingComponent,
        MessageStylesDirective
        
    ],
    imports: [
        CommonModule,
        MeetingRouterModule,
        SharedModule,
        StoreModule.forFeature('Meetings', MeetingMap),

    ],
    exports: [],
    providers: [],
})
export class MeetingModule {}