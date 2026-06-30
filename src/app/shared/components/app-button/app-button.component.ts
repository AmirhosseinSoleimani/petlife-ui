import { Component, EventEmitter, Input, Output } from '@angular/core';

type AppButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type AppButtonType = 'button' | 'submit' | 'reset';

@Component({
  selector: 'app-button',
  templateUrl: './app-button.component.html',
  styleUrls: ['./app-button.component.scss']
})
export class AppButtonComponent {
  @Input() variant: AppButtonVariant = 'primary';
  @Input() type: AppButtonType = 'button';
  @Input() disabled: boolean | null = false;
  @Input() loading: boolean | null = false;
  @Output() buttonClick = new EventEmitter<Event>();

  get isDisabled(): boolean {
    return !!this.disabled || !!this.loading;
  }

  onClick(event: Event): void {
    if (this.isDisabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    this.buttonClick.emit(event);
  }
}
