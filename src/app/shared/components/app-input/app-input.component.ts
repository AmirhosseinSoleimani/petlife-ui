import { Component, ElementRef, forwardRef, Input, ViewChild } from '@angular/core';
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
  @ViewChild('passwordInput') private passwordInput?: ElementRef<HTMLInputElement>;

  @Input() label = '';
  @Input() helper = '';
  @Input() error = '';
  @Input() type = 'text';
  @Input() placeholder = '';
  @Input() required: boolean | string = false;
  @Input() min: string | number | null = null;
  @Input() max: string | number | null = null;
  @Input() step: string | number | null = null;
  @Input() placeholderValue: string | number | boolean | null = '';
  @Input() rows = 3;
  @Input() options: AppInputOption[] | string[] = [];
  @Input() showPasswordToggle: boolean | string = false;

  value: string | number | boolean | null = '';
  isDisabled = false;
  passwordVisible = false;

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

  get isPasswordToggleEnabled(): boolean {
    const enabled = this.showPasswordToggle === ''
      || this.showPasswordToggle === true
      || this.showPasswordToggle === 'true';
    return enabled && this.type === 'password';
  }

  get resolvedPasswordType(): 'password' | 'text' {
    return this.passwordVisible ? 'text' : 'password';
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

  preventPasswordToggleMouseDown(event: MouseEvent): void {
    event.preventDefault();
  }

  togglePasswordVisibility(): void {
    const input = this.passwordInput?.nativeElement;
    const selectionStart = input?.selectionStart ?? null;
    const selectionEnd = input?.selectionEnd ?? null;
    this.passwordVisible = !this.passwordVisible;

    setTimeout(() => {
      const updatedInput = this.passwordInput?.nativeElement;
      if (!updatedInput) return;
      updatedInput.focus();
      if (selectionStart !== null && selectionEnd !== null) {
        updatedInput.setSelectionRange(selectionStart, selectionEnd);
      }
    });
  }
}
