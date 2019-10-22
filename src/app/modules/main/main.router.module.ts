import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainComponent } from './components/main/main.component';

const routes: Routes = [
    {
        path: '', component: MainComponent
    },
    {
        path: 'meeting',
        // loadChildren: () => import("../meeting/meeting.module").then(m => m.MeetingModule),
        loadChildren: "../meeting/meeting.module#MeetingModule"
    },
    {
        path: '**', 
        redirectTo: 'main'
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class MainRouterModule {}
