import { Injectable } from '@angular/core';
import {
  CanActivate,
  CanActivateChild,
  Router,
  UrlTree
} from '@angular/router';

import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  canActivate(): boolean | UrlTree {
    return this.checkAccess();
  }

  canActivateChild(): boolean | UrlTree {
    return this.checkAccess();
  }

  private checkAccess(): boolean | UrlTree {
    return this.authService.isAuthenticated()
      ? true
      : this.router.createUrlTree(['/login']);
  }
}
