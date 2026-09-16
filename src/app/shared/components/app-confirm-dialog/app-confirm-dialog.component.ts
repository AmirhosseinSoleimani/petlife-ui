import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';

import { AppConfirmDialogRequest, AppDialogService } from '../../services/app-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './app-confirm-dialog.component.html',
  styleUrls: ['./app-confirm-dialog.component.scss']
})
export class AppConfirmDialogComponent implements OnInit, OnDestroy {
  request: AppConfirmDialogRequest | null = null;
  private subscription?: Subscription;

  constructor(private readonly dialogService: AppDialogService) {}

  ngOnInit(): void {
    this.subscription = this.dialogService.requests$.subscribe((request) => {
      if (this.request) {
        this.request.resolve(false);
      }
      this.request = request;
    });
  }

  ngOnDestroy(): void {
    if (this.request) {
      this.request.resolve(false);
    }
    this.subscription?.unsubscribe();
  }

  resolve(confirmed: boolean): void {
    const request = this.request;
    this.request = null;
    request?.resolve(confirmed);
  }
}
