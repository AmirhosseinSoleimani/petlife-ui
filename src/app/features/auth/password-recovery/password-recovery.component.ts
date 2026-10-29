import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/api/api.service';
import { apiErrorMessage } from '../../../core/api/api-error.util';
import { meetsPasswordPolicy } from '../../../core/auth/password-policy';

@Component({selector:'app-password-recovery',templateUrl:'./password-recovery.component.html',styleUrls:['./password-recovery.component.scss']})
export class PasswordRecoveryComponent implements OnInit {
  token = ''; email = ''; password = ''; confirmPassword = '';
  resetMode = false;
  isSubmitting = false; completed = false; errorMessage = ''; showErrors = false;
  constructor(private readonly route: ActivatedRoute, private readonly api: ApiService) {}
  ngOnInit(): void { this.token = this.route.snapshot.queryParamMap.get('token') || ''; this.resetMode = !!this.token; }
  get isReset(): boolean { return this.resetMode; }
  get validPassword(): boolean { return meetsPasswordPolicy(this.password); }
  submit(): void {
    if (this.isSubmitting || this.completed) return;
    this.errorMessage = ''; this.showErrors = true;
    if (this.isReset ? (!this.validPassword || this.password !== this.confirmPassword) :
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) return;
    this.isSubmitting = true;
    const request = this.isReset
      ? this.api.post<void>('/v1/identity/auth/password/reset', {token:this.token,newPassword:this.password,confirmPassword:this.confirmPassword})
      : this.api.post<unknown>('/v1/identity/auth/password/forgot', {email:this.email.trim()});
    request.subscribe({
      next: () => { this.completed = true; this.isSubmitting = false; this.password=''; this.confirmPassword=''; this.token=''; },
      error: err => { this.errorMessage = apiErrorMessage(err,'auth.recoveryError'); this.isSubmitting = false; }
    });
  }
}
