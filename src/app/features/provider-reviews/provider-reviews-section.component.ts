import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { finalize, forkJoin } from 'rxjs';
import { ProviderReviewsApiService } from '../../core/api/provider-reviews-api.service';
import { ProviderRatingSummary, PublicProviderReview } from '../../core/models/provider-reviews.models';

@Component({
  selector: 'app-provider-reviews-section',
  templateUrl: './provider-reviews-section.component.html',
  styleUrls: ['./provider-reviews-section.component.scss']
})
export class ProviderReviewsSectionComponent implements OnChanges {
  @Input() profileId: string | null = null;
  readonly stars = [5, 4, 3, 2, 1];
  rating: ProviderRatingSummary | null = null;
  items: PublicProviderReview[] = [];
  filter: number | null = null;
  nextCursor: string | null = null;
  loading = false;
  loadingMore = false;
  error = '';
  available = false;
  private generation = 0;

  constructor(readonly api: ProviderReviewsApiService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['profileId']) {
      this.generation++;
      this.reset();
      if (this.profileId && this.api.flags.readEnabled) this.load();
    }
  }

  get unrated(): boolean { return this.rating?.ratingCount === 0; }

  load(): void {
    if (!this.profileId || !this.api.flags.readEnabled) return;
    const sequence = ++this.generation;
    const id = this.profileId;
    this.loading = true;
    this.error = '';
    forkJoin({
      summary: this.api.rating(id),
      reviews: this.api.publicReviews(id, this.filter)
    }).pipe(finalize(() => { if (sequence === this.generation) this.loading = false; }))
      .subscribe({
        next: ({summary, reviews}) => {
          if (sequence !== this.generation) return;
          this.rating = summary;
          this.items = reviews.items;
          this.nextCursor = reviews.nextCursor;
          this.available = true;
        },
        error: () => {
          if (sequence !== this.generation) return;
          this.available = false;
          this.error = 'Ratings are temporarily unavailable.';
        }
      });
  }

  setFilter(value: number | null): void {
    this.filter = value;
    this.reset();
    this.load();
  }

  more(): void {
    if (!this.profileId || !this.nextCursor || this.loadingMore) return;
    const sequence = this.generation;
    this.loadingMore = true;
    this.error = '';
    this.api.publicReviews(this.profileId, this.filter, this.nextCursor)
      .pipe(finalize(() => { if (sequence === this.generation) this.loadingMore = false; }))
      .subscribe({
        next: page => {
          if (sequence !== this.generation) return;
          this.items = [...this.items, ...page.items];
          this.nextCursor = page.nextCursor;
        },
        error: () => { if (sequence === this.generation) this.error = 'Unable to load more reviews.'; }
      });
  }

  private reset(): void {
    this.rating = null;
    this.items = [];
    this.nextCursor = null;
    this.available = false;
    this.error = '';
  }
}
