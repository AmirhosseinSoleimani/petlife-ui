import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ProviderReviewsApiService, newReviewOperationKey } from '../../core/api/provider-reviews-api.service';
import { OwnProviderReview } from '../../core/models/provider-reviews.models';

@Component({
  selector: 'app-my-reviews',
  templateUrl: './my-reviews.component.html',
  styleUrls: ['./provider-reviews-section.component.scss']
})
export class MyReviewsComponent implements OnInit {
  items: OwnProviderReview[] = [];
  nextCursor: string | null = null;
  loading = false;
  saving = false;
  error = '';
  notice = '';
  selected: OwnProviderReview | null = null;
  rating: number | null = null;
  comment = '';
  readonly stars = [1, 2, 3, 4, 5];

  constructor(readonly api: ProviderReviewsApiService) {}
  ngOnInit(): void { if (this.api.flags.readEnabled && this.api.flags.customerEnabled) this.load(); }

  load(cursor: string | null = null): void {
    this.loading = true; this.error = '';
    this.api.myReviews(cursor).subscribe({
      next: page => {
        this.items = cursor ? [...this.items, ...page.items] : page.items;
        this.nextCursor = page.nextCursor;
        this.loading = false;
      },
      error: () => { this.loading = false; this.error = 'Your reviews are unavailable.'; }
    });
  }

  edit(review: OwnProviderReview): void {
    if (!['Published', 'PendingModeration'].includes(review.visibility)) return;
    this.selected = review;
    this.rating = review.rating;
    this.comment = review.comment || '';
    this.error = ''; this.notice = '';
  }

  cancel(): void { this.selected = null; }

  save(): void {
    if (!this.selected || this.saving) return;
    const comment = this.comment.trim();
    if ((!this.rating && (!comment || !this.api.flags.commentOnlyApproved)) ||
      (this.rating !== null && (!Number.isInteger(this.rating) || this.rating < 1 || this.rating > 5)) ||
      comment.length > 2000) {
      this.error = 'Select a rating or enter an approved comment of at most 2,000 characters.';
      return;
    }
    this.saving = true; this.error = '';
    this.api.edit(this.selected.reviewId, this.selected.version, this.rating,
      comment || null, newReviewOperationKey()).subscribe({
        next: () => {
          // No optimistic publication, no invented version/score: reload server truth.
          this.saving = false; this.selected = null; this.notice = 'Changes accepted; status will refresh.';
          this.load();
        },
        error: (error: HttpErrorResponse) => { this.saving = false; this.error = error.status === 409 ?
          'This review changed. Refresh before editing again.' : 'Unable to update your review.'; }
      });
  }

  withdraw(review: OwnProviderReview): void {
    if (this.saving || review.visibility === 'Withdrawn' ||
      !window.confirm('Withdraw this review from public view?')) return;
    this.saving = true;
    this.api.withdraw(review.reviewId, review.version, newReviewOperationKey()).subscribe({
      next: () => { this.saving = false; this.notice = 'Withdrawal accepted.'; this.load(); },
      error: () => { this.saving = false; this.error = 'Withdrawal was not confirmed.'; }
    });
  }
}
