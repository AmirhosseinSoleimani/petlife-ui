import { Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subject, Subscription, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { GeographyArea } from '../../../core/models/marketplace.models';

@Component({
  selector: 'app-geography-selector',
  templateUrl: './geography-selector.component.html',
  styleUrls: ['./geography-selector.component.scss']
})
export class GeographySelectorComponent implements OnInit, OnDestroy {
  @Input() endpoint = '/geography';
  @Input() label = 'Managed geography';
  @Input() placeholder = 'Search managed area...';
  @Input() helper = '';
  @Input() selectedId: string | null = null;
  @Input() disabledIds: readonly string[] = [];
  @Input() state = '';
  @Input() required = false;
  @Input() disabled = false;

  @Output() selectedIdChange = new EventEmitter<string | null>();
  @Output() selectedAreaChange = new EventEmitter<GeographyArea | null>();

  options: GeographyArea[] = [];
  searchTerm = '';
  isOpen = false;
  isLoading = false;
  loadFailed = false;
  selectedArea: GeographyArea | null = null;

  private readonly search$ = new Subject<string>();
  private subscription?: Subscription;

  constructor(
    private readonly apiService: ApiService,
    private readonly elementRef: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.subscription = this.search$.pipe(
      debounceTime(220),
      distinctUntilChanged(),
      tap(() => {
        this.isLoading = true;
        this.loadFailed = false;
      }),
      switchMap((term: string) => this.apiService
        .get<ApiResponse<GeographyArea[]> | GeographyArea[]>(this.buildUrl(term))
        .pipe(catchError(() => {
          this.loadFailed = true;
          return of([] as GeographyArea[]);
        })))
    ).subscribe((response: ApiResponse<GeographyArea[]> | GeographyArea[]) => {
      const items = Array.isArray(response) ? response : (response.data || []);
      this.options = items.filter((area: GeographyArea) => area.isActive !== false);
      this.syncSelectedArea();
      this.isLoading = false;
    });

    this.search$.next('');
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get selectedLabel(): string {
    return this.selectedArea ? this.displayName(this.selectedArea) : '';
  }

  get availableOptions(): GeographyArea[] {
    const disabled = new Set(this.disabledIds);
    return this.options.filter((area) => area.id === this.selectedId || !disabled.has(area.id));
  }

  open(): void {
    if (this.disabled) return;
    this.isOpen = true;
    this.search$.next(this.searchTerm.trim());
  }

  onSearch(value: string): void {
    this.searchTerm = value;
    this.isOpen = true;
    this.search$.next(value.trim());
  }

  select(area: GeographyArea): void {
    if (this.disabledIds.includes(area.id) && area.id !== this.selectedId) return;
    this.selectedId = area.id;
    this.selectedArea = area;
    this.searchTerm = '';
    this.isOpen = false;
    this.selectedIdChange.emit(area.id);
    this.selectedAreaChange.emit(area);
  }

  clear(event?: MouseEvent): void {
    event?.stopPropagation();
    if (this.disabled) return;
    this.selectedId = null;
    this.selectedArea = null;
    this.searchTerm = '';
    this.selectedIdChange.emit(null);
    this.selectedAreaChange.emit(null);
    this.search$.next('');
  }

  displayName(area: GeographyArea): string {
    if (area.displayName?.trim()) return area.displayName.trim();
    return [area.suburb, area.city, area.state, area.country].filter(Boolean).join(', ');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (target && !this.elementRef.nativeElement.contains(target)) {
      this.isOpen = false;
    }
  }

  private buildUrl(search: string): string {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (this.state.trim()) params.set('state', this.state.trim());
    const query = params.toString();
    return query ? `${this.endpoint}?${query}` : this.endpoint;
  }

  private syncSelectedArea(): void {
    if (!this.selectedId) {
      this.selectedArea = null;
      return;
    }
    this.selectedArea = this.options.find((area) => area.id === this.selectedId) || this.selectedArea;
  }
}
