import { Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { AuthResponseData, AuthResultCode, LoginResponse } from '../../../core/models/auth.models';
import { AppAlertComponent } from '../../../shared/components/app-alert/app-alert.component';
import { AppButtonComponent } from '../../../shared/components/app-button/app-button.component';
import { AppInputComponent } from '../../../shared/components/app-input/app-input.component';
import { RegisterComponent } from './register.component';

@Pipe({ name: 'translate' })
class TranslatePipeStub implements PipeTransform {
  transform(value: string): string { return value; }
}

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  const authData = (role = 'Customer', status = 'Active'): AuthResponseData => ({
    token: 'token',
    userId: 'user-1',
    firstName: 'Ari',
    lastName: 'Taylor',
    email: 'ari@example.com',
    mobileNumber: '+61412345678',
    role,
    status,
    isEmailVerified: false,
    isMobileVerified: false
  });

  const success = (role = 'Customer', status = 'Active'): LoginResponse => ({
    success: true,
    resultCode: AuthResultCode.Success,
    data: authData(role, status),
    error: {}
  });

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', [
      'registerCustomer',
      'registerProvider',
      'getPostAuthRoute',
      'sendVerification'
    ]);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));
    component = new RegisterComponent(authService, router);
    component.firstName = 'Ari';
    component.lastName = 'Taylor';
    component.mobileNumber = '+61412345678';
    component.email = 'ari@example.com';
    component.password = 'Strong#123';
    component.confirmPassword = 'Strong#123';
  });

  it('submits all six fields for a Customer and never starts verification', () => {
    authService.registerCustomer.and.returnValue(of(success()));
    authService.getPostAuthRoute.and.returnValue(['/dashboard']);

    component.register();

    expect(authService.registerCustomer).toHaveBeenCalledWith({
      firstName: 'Ari',
      lastName: 'Taylor',
      mobileNumber: '+61412345678',
      email: 'ari@example.com',
      password: 'Strong#123',
      confirmPassword: 'Strong#123'
    });
    expect(authService.sendVerification).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('switches only the role endpoint and keeps every registration field visible in state', () => {
    component.setRole('Provider');
    authService.registerProvider.and.returnValue(of(success('Provider', 'Pending')));
    authService.getPostAuthRoute.and.returnValue(['/provider/pending-approval']);

    component.register();

    expect(component.firstName).toBe('Ari');
    expect(component.lastName).toBe('Taylor');
    expect(component.mobileNumber).toBe('+61412345678');
    expect(component.email).toBe('ari@example.com');
    expect(component.password).toBe('Strong#123');
    expect(component.confirmPassword).toBe('Strong#123');
    expect(authService.registerProvider).toHaveBeenCalled();
    expect(authService.registerCustomer).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/provider/pending-approval']);
  });

  it('blocks submit when confirm password does not match', () => {
    component.confirmPassword = 'Different#123';

    component.register();

    expect(component.confirmPasswordError).toBe('auth.passwordMismatch');
    expect(authService.registerCustomer).not.toHaveBeenCalled();
  });

  it('blocks submit when any password-policy rule is not met', () => {
    component.password = 'weakpass';
    component.confirmPassword = 'weakpass';

    component.register();

    expect(component.passwordIsValid).toBeFalse();
    expect(authService.registerCustomer).not.toHaveBeenCalled();
  });

  it('maps RC1 fieldErrors to their controls and clears stale errors on edit', () => {
    authService.registerCustomer.and.returnValue(of({
      success: false,
      resultCode: AuthResultCode.BusinessOrValidationError,
      data: {} as AuthResponseData,
      error: {
        message: 'Validation failed.',
        fieldErrors: {
          email: ['Email is invalid.'],
          mobileNumber: ['Mobile is invalid.'],
          confirmPassword: ['Passwords do not match.']
        }
      }
    }));

    component.register();

    expect(component.errorMessage).toBe('Validation failed.');
    expect(component.fieldError('email')).toBe('Email is invalid.');
    expect(component.fieldError('mobileNumber')).toBe('Mobile is invalid.');
    expect(component.confirmPasswordError).toBe('Passwords do not match.');

    component.clearFieldError('email');
    expect(component.fieldError('email')).toBe('');
    expect(component.fieldError('mobileNumber')).toBe('Mobile is invalid.');
    expect(component.errorMessage).toBe('');
  });

  it('uses a safe RC4 message and keeps the trace ID', () => {
    authService.registerCustomer.and.returnValue(of({
      success: false,
      resultCode: AuthResultCode.UnhandledError,
      data: {} as AuthResponseData,
      error: { message: 'Stack trace details', traceId: 'trace-4', fieldErrors: {} }
    }));

    component.register();

    expect(component.errorMessage).toBe('errors.server');
    expect(component.errorTraceId).toBe('trace-4');
    expect(component.errorMessage).not.toContain('Stack');
  });
});

describe('RegisterComponent template', () => {
  let fixture: ComponentFixture<RegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, RouterTestingModule],
      declarations: [
        RegisterComponent,
        AppAlertComponent,
        AppButtonComponent,
        AppInputComponent,
        TranslatePipeStub
      ],
      providers: [
        {
          provide: AuthService,
          useValue: jasmine.createSpyObj<AuthService>('AuthService', [
            'registerCustomer',
            'registerProvider',
            'getPostAuthRoute'
          ])
        }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
  });

  it('keeps all six required controls visible in both Customer and Provider modes', () => {
    const expectedNames = ['firstName', 'lastName', 'mobileNumber', 'email', 'password', 'confirmPassword'];
    const visibleNames = () => Array.from(
      fixture.nativeElement.querySelectorAll('app-input') as NodeListOf<HTMLElement>
    ).map((element) => element.getAttribute('name'));

    expect(visibleNames()).toEqual(expectedNames);

    fixture.componentInstance.setRole('Provider');
    fixture.detectChanges();

    expect(visibleNames()).toEqual(expectedNames);
  });

  it('renders one independent password visibility toggle for each password field', () => {
    const passwordField = fixture.nativeElement.querySelector('app-input[name="password"]') as HTMLElement;
    const confirmPasswordField = fixture.nativeElement.querySelector('app-input[name="confirmPassword"]') as HTMLElement;
    const passwordToggle = passwordField.querySelector('.password-toggle') as HTMLButtonElement;
    const confirmPasswordToggle = confirmPasswordField.querySelector('.password-toggle') as HTMLButtonElement;
    const passwordInput = () => passwordField.querySelector('input') as HTMLInputElement;
    const confirmPasswordInput = () => confirmPasswordField.querySelector('input') as HTMLInputElement;

    expect(passwordField.querySelectorAll('.password-toggle').length).toBe(1);
    expect(confirmPasswordField.querySelectorAll('.password-toggle').length).toBe(1);
    expect(passwordInput().type).toBe('password');
    expect(confirmPasswordInput().type).toBe('password');

    passwordToggle.click();
    fixture.detectChanges();

    expect(passwordInput().type).toBe('text');
    expect(confirmPasswordInput().type).toBe('password');

    confirmPasswordToggle.click();
    fixture.detectChanges();

    expect(passwordInput().type).toBe('text');
    expect(confirmPasswordInput().type).toBe('text');

    passwordToggle.click();
    fixture.detectChanges();

    expect(passwordInput().type).toBe('password');
    expect(confirmPasswordInput().type).toBe('text');
  });
});
