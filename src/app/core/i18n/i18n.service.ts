import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export type AppLanguage = 'en' | 'fa';

export interface AppLanguageOption {
  code: AppLanguage;
  labelKey: string;
  direction: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: readonly AppLanguageOption[] = [
  { code: 'en', labelKey: 'language.english', direction: 'ltr' },
  { code: 'fa', labelKey: 'language.persian', direction: 'rtl' }
];

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly storageKey = 'petlife.language';
  private translations: Record<string, string> = {};
  private readonly languageSubject = new BehaviorSubject<AppLanguage>(this.getInitialLanguage());

  readonly language$ = this.languageSubject.asObservable();

  constructor(private readonly http: HttpClient) {
    this.useLanguage(this.languageSubject.value);
  }

  get currentLanguage(): AppLanguage {
    return this.languageSubject.value;
  }

  useLanguage(language: AppLanguage): void {
    const nextLanguage = this.normalizeLanguage(language);
    localStorage.setItem(this.storageKey, nextLanguage);
    this.applyDocumentLanguage(nextLanguage);
    this.loadLanguage(nextLanguage, false);
  }

  translate(key: string | null | undefined): string {
    if (!key) {
      return '';
    }

    const direct = this.translations[key];
    if (direct) {
      return direct;
    }

    return this.currentLanguage === 'fa' ? this.translateDynamicApiText(key) : key;
  }

  private translateDynamicApiText(value: string): string {
    if (!value.includes(':') && !value.includes(' | ')) {
      return this.translateBackendMessage(value);
    }

    return value.split(' | ').map((segment) => {
      const separatorIndex = segment.indexOf(':');
      if (separatorIndex <= 0) return this.translateBackendMessage(segment.trim());

      const field = segment.slice(0, separatorIndex).trim();
      const message = segment.slice(separatorIndex + 1).trim();
      const fieldKey = this.normalizeValidationField(field);
      const fieldLabel = this.translations[`validation.field.${fieldKey}`] || field;
      return `${fieldLabel}: ${this.translateBackendMessage(message)}`;
    }).join(' • ');
  }

  private translateBackendMessage(message: string): string {
    const direct = this.translations[message];
    if (direct) return direct;

    if (/^.+? is required\.$/i.test(message)) {
      return this.translations['validation.required'] || 'وارد کردن این فیلد الزامی است.';
    }

    const lengthMatch = message.match(/^.+? must not exceed (\d+) characters\.$/i);
    if (lengthMatch) {
      return `${this.translations['validation.maxLength'] || 'حداکثر طول مجاز'} ${lengthMatch[1]} ${this.translations['validation.characters'] || 'کاراکتر است.'}`;
    }

    return message;
  }

  private normalizeValidationField(field: string): string {
    const cleaned = field
      .replace(/^\$\.?/, '')
      .replace(/\[(\d+)\]/g, '')
      .split('.')
      .filter(Boolean)
      .pop() || field;
    return cleaned.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }

  private loadLanguage(language: AppLanguage, isFallback: boolean): void {
    forkJoin({
      base: this.http.get<Record<string, string>>(`assets/i18n/${language}.json`),
      overrides: this.http.get<Record<string, string>>(`assets/i18n/${language}.overrides.json`).pipe(
        catchError(() => of({} as Record<string, string>))
      )
    }).subscribe({
      next: ({ base, overrides }) => {
        this.translations = { ...(base || {}), ...(overrides || {}) };
        this.languageSubject.next(language);
      },
      error: () => {
        if (isFallback || language === 'en') {
          this.translations = {};
          this.languageSubject.next('en');
          return;
        }

        this.loadEnglishFallback();
      }
    });
  }

  private getInitialLanguage(): AppLanguage {
    const savedLanguage = localStorage.getItem(this.storageKey) as AppLanguage | null;
    return this.normalizeLanguage(savedLanguage || 'en');
  }

  private normalizeLanguage(language: string): AppLanguage {
    return SUPPORTED_LANGUAGES.some((option) => option.code === language)
      ? language as AppLanguage
      : 'en';
  }

  private applyDocumentLanguage(language: AppLanguage): void {
    const direction = SUPPORTED_LANGUAGES.find((option) => option.code === language)?.direction || 'ltr';
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
  }

  private loadEnglishFallback(): void {
    const fallbackLanguage: AppLanguage = 'en';
    localStorage.setItem(this.storageKey, fallbackLanguage);
    this.applyDocumentLanguage(fallbackLanguage);
    this.loadLanguage(fallbackLanguage, true);
  }
}
