import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, Router, UrlTree } from '@angular/router';

import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class PendingProviderGuard implements CanActivate, CanActivateChild {
  constructor(private readonly authService: AuthService, private readonly router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    const isPendingProvider = this.authService.isPendingProvider();
    const isPendingApprovalPage = route.data['pendingApprovalOnly'] === true;

    if (isPendingApprovalPage) {
      return isPendingProvider ? true : this.router.createUrlTree(['/dashboard']);
    }

    return this.activeWorkspaceAccess(isPendingProvider);
  }

  canActivateChild(): boolean | UrlTree {
    return this.activeWorkspaceAccess(this.authService.isPendingProvider());
  }

  private activeWorkspaceAccess(isPendingProvider: boolean): boolean | UrlTree {
    return isPendingProvider ? this.router.createUrlTree(['/provider/pending-approval']) : true;
  }
}
