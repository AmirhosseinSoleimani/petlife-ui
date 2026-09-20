import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { TraceQuestPageComponent } from './tracequest-page.component';

const routes: Routes = [
  { path: '', component: TraceQuestPageComponent }
];

@NgModule({
  declarations: [TraceQuestPageComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes)]
})
export class TraceQuestModule {}
