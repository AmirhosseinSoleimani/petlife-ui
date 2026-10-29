import { Component, Input } from '@angular/core';
import { AppLanguage, I18nService, SUPPORTED_LANGUAGES } from '../../../core/i18n/i18n.service';
@Component({selector:'app-auth-layout',templateUrl:'./auth-layout.component.html',styleUrls:['./auth-layout.component.scss']})
export class AuthLayoutComponent {
 @Input() wide = false;
 readonly languages = SUPPORTED_LANGUAGES;
 constructor(readonly i18n: I18nService) {}
 changeLanguage(language: AppLanguage): void { this.i18n.useLanguage(language); }
}
