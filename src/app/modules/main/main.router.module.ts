import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainComponent } from './components/main/main.component';
import { MeetingToolComponent } from './components/meeting-tool/meeting-tool.component';

const routes: Routes = [
    {
        path: '', component: MainComponent
    },
    {
        path: 'meeting',
        children: [
            {
                path: ':mode',
                component: MeetingToolComponent
            }
        ]
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
