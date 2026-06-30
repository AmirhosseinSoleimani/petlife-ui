import { Component, HostBinding, Input } from '@angular/core';

@Component({
  selector: 'app-card',
  templateUrl: './app-card.component.html',
  styleUrls: ['./app-card.component.scss']
})
export class AppCardComponent {
  @Input() interactive = false;

  @HostBinding('class.interactive-card')
  get isInteractive(): boolean {
    return this.interactive;
  }
}
