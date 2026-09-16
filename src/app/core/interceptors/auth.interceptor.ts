import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';

import { AUTH_TOKEN_KEY } from '../auth/auth.constants';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private readonly router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const authRequest = token
      ? request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        })
      : request;

    return next.handle(authRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        const normalizedError = this.normalizeValidationError(error);
        if (normalizedError.status === 401) {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          this.router.navigate(['/login']);
        }

        return throwError(() => normalizedError);
      })
    );
  }

  private normalizeValidationError(error: HttpErrorResponse): HttpErrorResponse {
    const body = error.error;
    if (!body || typeof body !== 'object' || !body.fieldErrors || typeof body.fieldErrors !== 'object') {
      return error;
    }

    const fieldErrors = Object.entries(body.fieldErrors as Record<string, string[]>)
      .flatMap(([field, messages]) => (messages || []).filter(Boolean).map((message) => `${field}: ${message}`));

    if (!fieldErrors.length) return error;

    return new HttpErrorResponse({
      error: { ...body, errors: [fieldErrors.join(' | ')] },
      headers: error.headers,
      status: error.status,
      statusText: error.statusText,
      url: error.url || undefined
    });
  }
}
