import { ChangeDetectorRef, OnDestroy, Pipe, PipeTransform } from '@angular/core';
import { Subscription } from 'rxjs';

import { I18nService } from './i18n.service';

@Pipe({
  name: 'translate',
  pure: false
})
export class TranslatePipe implements PipeTransform, OnDestroy {
  private readonly subscription: Subscription;

  constructor(
    private readonly i18nService: I18nService,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {
    this.subscription = this.i18nService.language$.subscribe(() => {
      this.changeDetectorRef.markForCheck();
    });
  }

  transform(value: string | null | undefined): string {
    return this.i18nService.translate(value);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
