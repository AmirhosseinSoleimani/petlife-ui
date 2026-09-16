import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

import { ApiErrorNotice, ApiErrorService } from './core/api/api-error.service';
import { ApiService } from './core/api/api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy {
  readonly uploadProgress$ = this.apiService.uploadProgress$;
  errorNotice: ApiErrorNotice | null = null;

  private readonly subscription: Subscription;
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly apiService: ApiService,
    private readonly apiErrorService: ApiErrorService
  ) {
    this.subscription = this.apiErrorService.notice$.subscribe((notice) => {
      this.errorNotice = notice;
      if (this.dismissTimer) clearTimeout(this.dismissTimer);
      if (notice) {
        this.dismissTimer = setTimeout(() => this.dismissError(), 8000);
      }
    });
  }

  dismissError(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
    this.apiErrorService.clear();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    if (this.dismissTimer) clearTimeout(this.dismissTimer);
  }
}
