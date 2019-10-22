import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MainComponent } from './components/main/main.component';
import { MainRouterModule } from './main.router.module';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
    declarations: [
        MainComponent
    ],
    imports: [ CommonModule, MainRouterModule, SharedModule ],
    exports: [],
    providers: [],
})
export class MainModule {}