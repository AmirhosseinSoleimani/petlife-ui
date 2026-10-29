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

import { ApiErrorService } from '../api/api-error.service';
import { AUTH_TOKEN_KEY } from '../auth/auth.constants';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private readonly router: Router,
    private readonly apiErrorService: ApiErrorService
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const authRequest = token
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

    return next.handle(authRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        const normalizedError = this.apiErrorService.normalize(error);
        const isTranslationAsset = /(?:^|\/)assets\/i18n\//.test(request.url);

        // A legacy /api/ service can reject a valid Users JWT. Its 401 must not
        // sign the user out of the independently authenticated identity session.
        // Only the Users identity authority can invalidate that session here.
        const identitySessionCheck = /(?:^|\/)v1\/identity\/(?:profile|security|permissions|sessions)(?:[/?]|$)/.test(request.url);
        if (normalizedError.status === 401 && !!token && identitySessionCheck) {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          localStorage.removeItem('petlife_user');
          this.apiErrorService.notify(normalizedError);
          if (!this.router.url.startsWith('/login')) {
            void this.router.navigate(['/login']);
          }
        } else if (!isTranslationAsset) {
          this.apiErrorService.notify(normalizedError);
        }

        return throwError(() => normalizedError);
      })
    );
  }
}
