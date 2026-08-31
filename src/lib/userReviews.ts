import { paginateItems } from '@/lib/pagination';
import type { Review } from '@/services/reviewsService';

export type UserReviewStatusFilter = 'all' | 'pending' | 'approved';
export type UserReviewSortMode = 'newest' | 'oldest' | 'highest' | 'lowest';

export const getPaginatedUserReviews = (
  reviews: Review[],
  statusFilter: UserReviewStatusFilter,
  sortMode: UserReviewSortMode,
  requestedPage: number,
  pageSize: number,
) => {
  const matched = reviews.filter((review) => (
    statusFilter === 'all' || review.status === statusFilter
  ));

  const sorted = [...matched].sort((left, right) => {
    if (sortMode === 'oldest') {
      return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
    }
    if (sortMode === 'highest') {
      return right.rating - left.rating;
    }
    if (sortMode === 'lowest') {
      return left.rating - right.rating;
    }
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });

  return {
    ...paginateItems(sorted, requestedPage, pageSize),
    totalItems: sorted.length,
  };
};
