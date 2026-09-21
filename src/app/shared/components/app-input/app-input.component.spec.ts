import { Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { AppInputComponent } from './app-input.component';

@Pipe({ name: 'translate' })
class TranslatePipeStub implements PipeTransform {
  transform(value: string): string { return value; }
}

describe('AppInputComponent password visibility', () => {
  let fixture: ComponentFixture<AppInputComponent>;
  let component: AppInputComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [AppInputComponent, TranslatePipeStub]
    }).compileComponents();
  });

  function createPasswordInput(optIn: boolean): void {
    fixture = TestBed.createComponent(AppInputComponent);
    component = fixture.componentInstance;
    component.type = 'password';
    component.showPasswordToggle = optIn;
    component.writeValue('Strong#123');
    fixture.detectChanges();
  }

  it('does not change existing password inputs unless the toggle is enabled', () => {
    createPasswordInput(false);

    expect(fixture.nativeElement.querySelector('.password-toggle')).toBeNull();
    expect((fixture.nativeElement.querySelector('input') as HTMLInputElement).type).toBe('password');
  });

  it('toggles password/text without losing value, focus, or caret', fakeAsync(() => {
    createPasswordInput(true);
    let input = fixture.nativeElement.querySelector('.password-control input') as HTMLInputElement;
    const button = fixture.nativeElement.querySelector('.password-toggle') as HTMLButtonElement;
    input.focus();
    input.setSelectionRange(2, 6);

    button.click();
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    input = fixture.nativeElement.querySelector('.password-control input') as HTMLInputElement;

    expect(input.type).toBe('text');
    expect(input.value).toBe('Strong#123');
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(2);
    expect(input.selectionEnd).toBe(6);
    expect(button.getAttribute('aria-label')).toBe('auth.hidePassword');
  }));

  it('uses a native keyboard-focusable button with a 44px target', () => {
    createPasswordInput(true);
    const button = fixture.nativeElement.querySelector('.password-toggle') as HTMLButtonElement;
    const style = getComputedStyle(button);

    expect(button.type).toBe('button');
    expect(button.tabIndex).toBe(0);
    expect(button.getAttribute('aria-label')).toBe('auth.showPassword');
    expect(style.width).toBe('44px');
    expect(style.minHeight).toBe('44px');
  });
});
