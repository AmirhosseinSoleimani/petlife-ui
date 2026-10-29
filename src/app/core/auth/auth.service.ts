import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, switchMap, tap, finalize } from 'rxjs';

import { ApiService } from '../api/api.service';
import { AUTH_TOKEN_KEY } from './auth.constants';
import {
  AuthResponseData,
  AuthUser,
  ContactVerificationChannel,
  ContactVerificationStatus,
  LoginRequest,
  LoginResponse,
  RegisterCustomerMobileRequest,
  RegisterCustomerRequest,
  RegisterAccountRequest,
  RegistrationResponse
} from '../models/auth.models';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(
    private readonly apiService: ApiService,
    private readonly router: Router
  ) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    const request: LoginRequest = {
      email: credentials.identifier || credentials.email,
      identifier: credentials.identifier || credentials.email,
      password: credentials.password
    };
    return this.apiService.post<LoginResponse>('/v1/identity/auth/login', request).pipe(
      tap((response) => this.storeToken(response))
    );
  }

  registerCustomer(request: RegisterCustomerRequest | RegisterAccountRequest): Observable<RegistrationResponse> {
    return this.apiService.post<RegistrationResponse>('/v1/identity/auth/register/customer',
      { ...request, confirmPassword: 'confirmPassword' in request ? request.confirmPassword : request.password });
  }

  registerProvider(request: RegisterAccountRequest): Observable<RegistrationResponse> {
    return this.apiService.post<RegistrationResponse>('/v1/identity/auth/register/provider', request);
  }

  registerCustomerMobile(request: RegisterCustomerMobileRequest): Observable<LoginResponse> {
    return this.apiService.post<unknown>('/v1/identity/auth/register/customer/mobile',
      { ...request, confirmPassword: request.password }).pipe(
      switchMap(() => this.login({ email: request.mobileNumber, identifier: request.mobileNumber, password: request.password }))
    );
  }

  getVerificationStatus(): Observable<ApiResponse<ContactVerificationStatus>> {
    return this.apiService.get<ApiResponse<AuthResponseData>>('/v1/identity/profile').pipe(
      map(response => ({ success: response.success, data: {
        email: response.data.email, mobileNumber: response.data.mobileNumber,
        isEmailVerified: response.data.isEmailVerified, isMobileVerified: response.data.isMobileVerified
      } }))
    );
  }

  sendVerification(channel: ContactVerificationChannel): Observable<ApiResponse<ContactVerificationStatus>> {
    return this.apiService.post<void>('/v1/identity/contacts/verification/request', { channel }).pipe(
      switchMap(() => this.getVerificationStatus())
    );
  }

  verifyContact(channel: ContactVerificationChannel, code: string): Observable<ApiResponse<ContactVerificationStatus>> {
    return this.apiService.post<void>('/v1/identity/contacts/verification/confirm', { channel, code }).pipe(
      switchMap(() => this.getVerificationStatus())
    );
  }

  logout(): void {
    this.apiService.post<void>('/v1/identity/logout', {}).pipe(
      finalize(() => this.endLocalSession())
    ).subscribe({ error: () => {} });
  }

  getToken(): string | null {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return null;
    const expiry = this.decodeToken(token)?.['exp'];
    if (typeof expiry !== 'number' || expiry <= Date.now() / 1000) {
      this.clearSession();
      return null;
    }
    return token;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): AuthUser | null {
    const token = this.getToken();
    if (!token) return null;

    const payload = this.decodeToken(token);
    if (!payload) return null;

    const saved = localStorage.getItem('petlife_user');
    let user: AuthResponseData | null = null;
    try { user = saved ? JSON.parse(saved) as AuthResponseData : null; } catch { /* invalid cache */ }
    if (!user || user.userId?.toLowerCase() !== String(payload['sub'] || '').toLowerCase()) user = null;
    const role = user?.role || payload['role'] || payload['roles'] || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
    const firstName = payload['first_name'] || payload['firstName'] || payload['given_name'];
    const lastName = payload['last_name'] || payload['lastName'] || payload['family_name'];
    const fullName = payload['name'] || [firstName, lastName].filter(Boolean).join(' ');
    const email = payload['email'] || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
    const id = payload['nameid'] || payload['sub'] || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
    const mobileNumber = payload['mobile_number'];

    return {
      id,
      name: user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : fullName || email || mobileNumber,
      email: user?.email || email,
      mobileNumber: user?.mobileNumber || mobileNumber,
      role: Array.isArray(role) ? role[0] : role,
      status: user?.status || payload['status'],
      isEmailVerified: user?.isEmailVerified ?? (payload['email_verified'] === true || payload['email_verified'] === 'true'),
      isMobileVerified: user?.isMobileVerified ?? (payload['mobile_verified'] === true || payload['mobile_verified'] === 'true')
    };
  }

  hasRole(role: string): boolean {
    return (this.getCurrentUser()?.role || '').toLowerCase() === role.toLowerCase();
  }

  private storeToken(response: LoginResponse): void {
    const token = response.data?.accessToken;
    if (!response.success || !token || !response.data.user?.userId) throw new Error('Invalid authentication response');
    this.clearSession();
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem('petlife_user', JSON.stringify(response.data.user));
  }

  private clearSession(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem('petlife_user');
  }

  private endLocalSession(): void {
    this.clearSession();
    void this.router.navigate(['/login']);
  }

  private decodeToken(token: string): Record<string, any> | null {
    try {
      const payload = token.split('.')[1];
      const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
      const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=');
      return JSON.parse(atob(paddedPayload)) as Record<string, any>;
    } catch {
      return null;
    }
  }
}
