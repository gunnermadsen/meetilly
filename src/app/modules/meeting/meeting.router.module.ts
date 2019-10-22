import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MeetingToolComponent } from './components/meeting-tool/meeting-tool.component';

const routes: Routes = [
    { 
        path: '', // index route
        children: [
            {
                path: ':mode',
                component: MeetingToolComponent
            }
        ] 
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class MeetingRouterModule {}
