import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface AppInputOption {
  label: string;
  value: string | number | boolean | null;
}

@Component({
  selector: 'app-input',
  templateUrl: './app-input.component.html',
  styleUrls: ['./app-input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppInputComponent),
      multi: true
    }
  ]
})
export class AppInputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() helper = '';
  @Input() error = '';
  @Input() type = 'text';
  @Input() placeholder = '';
  @Input() required: boolean | string = false;
  @Input() min: string | number | null = null;
  @Input() step: string | number | null = null;
  @Input() placeholderValue: string | number | boolean | null = '';
  @Input() rows = 3;
  @Input() options: AppInputOption[] | string[] = [];

  value: string | number | boolean | null = '';
  isDisabled = false;

  private onChange: (value: string | number | boolean | null) => void = () => {};
  private onTouched: () => void = () => {};

  get normalizedOptions(): AppInputOption[] {
    return this.options.map((option) => typeof option === 'string' ? { label: option, value: option } : option);
  }

  get isTextarea(): boolean {
    return this.type === 'textarea';
  }

  get isSelect(): boolean {
    return this.type === 'select';
  }

  get isCheckbox(): boolean {
    return this.type === 'checkbox';
  }

  get isRequired(): boolean {
    return this.required === '' || this.required === true || this.required === 'true';
  }

  writeValue(value: string | number | boolean | null): void {
    this.value = value;
  }

  registerOnChange(fn: (value: string | number | boolean | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  updateValue(value: string | number | boolean | null): void {
    this.value = value;
    this.onChange(value);
  }

  markTouched(): void {
    this.onTouched();
  }
}
