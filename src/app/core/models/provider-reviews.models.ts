/**
 * REV-05 module-owned v1 wire contracts, served ONLY via the approved /api facade.
 * No customer/booking identity is permitted in public review DTOs.
 * Not all required future capabilities (verified marker, sorting, policy) exist yet.
 */
export interface ReviewPublicReply {
  text: string;
  publishedAtUtc: string;
}
export interface PublicProviderReview {
  reviewId: string;
  providerProfileId: string;
  rating: number | null;
  comment: string | null;
  submittedAtUtc: string;
  publishedAtUtc: string;
  version: number;
  officialReply: ReviewPublicReply | null;
}
export interface ProviderRatingSummary {
  providerProfileId: string;
  ratingCount: number;
  averageRating: number | null;
  /** One-based star positions 1–5; server is canonical. */
  starCounts: number[];
}
export interface ReviewPage<T> {
  items: T[];
  nextCursor: string | null;
}
export interface OwnReviewRevision {
  version: number;
  kind: string;
  previousRating: number | null;
  newRating: number | null;
  previousComment: string | null;
  newComment: string | null;
  occurredAtUtc: string;
}
export interface OwnProviderReview {
  reviewId: string;
  providerProfileId: string;
  rating: number | null;
  comment: string | null;
  visibility: string;
  version: number;
  submittedAtUtc: string;
  editedAtUtc: string | null;
  withdrawnAtUtc: string | null;
  revisions: OwnReviewRevision[];
}
export interface ReviewEligibilityStatus {
  eligible: boolean;
  status: string;
}
export interface ReviewMutationResult {
  reviewId: string;
  version: number;
  replayed: boolean;
}
export type ReviewReportReason =
  | 'Spam' | 'Harassment' | 'Privacy' | 'InauthenticExperience' | 'Other';
export type ReviewModerationAction = 'Publish' | 'Reject' | 'Hide' | 'Remove' | 'Reopen';
export type ReviewAppealResolution = 'Uphold' | 'ReopenForModeration';

export interface PrivateModerationDecision {
  decisionId: string;
  action: string;
  reason: string;
  reviewVersion: number;
  occurredAtUtc: string;
}
export interface PrivateReviewAppeal {
  appealId: string;
  party: string;
  status: string;
  submittedAtUtc: string;
  resolvedAtUtc: string | null;
}
export interface PrivateModerationReview {
  reviewId: string;
  providerProfileId: string;
  rating: number | null;
  comment: string | null;
  visibility: string;
  version: number;
  submittedAtUtc: string;
  decisions: PrivateModerationDecision[];
  appeals: PrivateReviewAppeal[];
}

export interface ProviderReviewsFlags {
  readEnabled: boolean;
  customerEnabled: boolean;
  providerEnabled: boolean;
  moderationEnabled: boolean;
  /** Product and backend must both approve before allowing comment-only. */
  commentOnlyApproved: boolean;
}

