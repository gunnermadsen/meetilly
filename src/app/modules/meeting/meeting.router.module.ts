import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MeetingToolComponent } from '../main/components/meeting-tool/meeting-tool.component';
import { MeetingComponent } from './components/meeting/meeting.component';

const routes: Routes = [
    { 
        path: '',
        component: MeetingComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class MeetingRouterModule {}
