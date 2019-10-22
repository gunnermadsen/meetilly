import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MeetingComponent } from './components/meeting/meeting.component';
import { MeetingRouterModule } from './meeting.router.module';

@NgModule({
    declarations: [
        MeetingComponent
    ],
    imports: [
        CommonModule,
        MeetingRouterModule
    ],
    exports: [],
    providers: [],
})
export class MeetingModule {}