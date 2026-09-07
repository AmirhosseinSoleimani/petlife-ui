import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type AppDialogTone = 'primary' | 'danger';

export interface AppConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: AppDialogTone;
}

export interface AppConfirmDialogRequest extends AppConfirmDialogOptions {
  resolve: (confirmed: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class AppDialogService {
  private readonly requestSubject = new Subject<AppConfirmDialogRequest>();
  readonly requests$ = this.requestSubject.asObservable();

  confirm(options: AppConfirmDialogOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.requestSubject.next({
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        tone: 'danger',
        ...options,
        resolve
      });
    });
  }
}
