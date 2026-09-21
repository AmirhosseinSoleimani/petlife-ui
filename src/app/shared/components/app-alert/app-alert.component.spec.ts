import { Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppAlertComponent } from './app-alert.component';

@Pipe({ name: 'translate' })
class TranslatePipeStub implements PipeTransform {
  transform(value: string): string { return value; }
}

describe('AppAlertComponent', () => {
  let fixture: ComponentFixture<AppAlertComponent>;
  let component: AppAlertComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppAlertComponent, TranslatePipeStub]
    }).compileComponents();
    fixture = TestBed.createComponent(AppAlertComponent);
    component = fixture.componentInstance;
  });

  it('announces critical errors and renders the trace ID safely', () => {
    component.message = 'errors.server';
    component.traceId = 'trace-4';
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('.alert') as HTMLElement;
    expect(alert.getAttribute('role')).toBe('alert');
    expect(alert.getAttribute('aria-live')).toBe('assertive');
    expect(alert.querySelector('p')?.textContent?.trim()).toBe('errors.server');
    expect(alert.querySelector('small')?.textContent).toContain('trace-4');
    expect(alert.querySelector('svg')).not.toBeNull();
  });

  it('uses the required flex, 12px padding/gap, and top alignment', () => {
    component.message = 'Validation failed.';
    fixture.detectChanges();

    const style = getComputedStyle(fixture.nativeElement.querySelector('.alert'));
    expect(style.display).toBe('flex');
    expect(style.alignItems).toBe('flex-start');
    expect(style.paddingTop).toBe('12px');
    expect(style.columnGap).toBe('12px');
  });
});
