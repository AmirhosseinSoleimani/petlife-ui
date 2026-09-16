import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-state',
  templateUrl: './app-loading-state.component.html',
  styleUrls: ['./app-loading-state.component.scss']
})
export class AppLoadingStateComponent {
  @Input() message = 'common.loading';
  @Input() compact = false;
}
