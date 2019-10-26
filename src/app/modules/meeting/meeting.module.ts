import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MeetingComponent } from '@/modules/meeting/components/meeting/meeting.component';
import { MeetingRouterModule } from './meeting.router.module';
import { SharedModule } from '@/shared/shared.module';


@NgModule({
    declarations: [
        MeetingComponent
    ],
    imports: [
        CommonModule,
        MeetingRouterModule,
        SharedModule,
    ],
    exports: [],
    providers: [],
})
export class MeetingModule {}