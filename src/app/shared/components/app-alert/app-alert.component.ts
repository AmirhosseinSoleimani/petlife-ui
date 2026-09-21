import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-alert',
  templateUrl: './app-alert.component.html',
  styleUrls: ['./app-alert.component.scss']
})
export class AppAlertComponent {
  @Input() message = '';
  @Input() traceId = '';
  @Input() ariaLive: 'assertive' | 'polite' = 'assertive';
}
