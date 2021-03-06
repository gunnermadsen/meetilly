import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MeetingComponent } from './components/meeting/meeting.component';

const routes: Routes = [
    { 
        path: '',
        component: MeetingComponent
    },
    {
        path: '**',
        redirectTo: '/main'
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class MeetingRouterModule {}
