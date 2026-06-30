import { Component, Input } from '@angular/core';

type AppBadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

@Component({
  selector: 'app-badge',
  templateUrl: './app-badge.component.html',
  styleUrls: ['./app-badge.component.scss']
})
export class AppBadgeComponent {
  @Input() tone: AppBadgeTone = 'neutral';
}
