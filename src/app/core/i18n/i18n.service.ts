import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export type AppLanguage = 'en' | 'fa' | 'fr' | 'es';

export interface AppLanguageOption {
  code: AppLanguage;
  labelKey: string;
  direction: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: readonly AppLanguageOption[] = [
  { code: 'en', labelKey: 'language.english', direction: 'ltr' },
  { code: 'fa', labelKey: 'language.persian', direction: 'rtl' },
  { code: 'fr', labelKey: 'language.french', direction: 'ltr' },
  { code: 'es', labelKey: 'language.spanish', direction: 'ltr' }
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

    return this.translations[key] || key;
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
