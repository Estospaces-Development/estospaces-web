import assert from 'node:assert/strict';
import test from 'node:test';

import type { Review } from '@/services/reviewsService';
import { getPaginatedUserReviews } from './userReviews';

const buildReview = (
  id: string,
  rating: number,
  status: 'pending' | 'approved',
  createdAt: string,
): Review => ({
  id,
  property_id: `property-${id}`,
  user_id: 'user-1',
  rating,
  comment: `Review ${id}`,
  is_approved: status === 'approved',
  status,
  created_at: createdAt,
  updated_at: createdAt,
});

const reviews = [
  buildReview('a', 2, 'approved', '2026-01-01T00:00:00Z'),
  buildReview('b', 5, 'pending', '2026-01-02T00:00:00Z'),
  buildReview('c', 4, 'approved', '2026-01-03T00:00:00Z'),
  buildReview('d', 1, 'pending', '2026-01-04T00:00:00Z'),
  buildReview('e', 3, 'approved', '2026-01-05T00:00:00Z'),
];

test('user reviews are filtered and sorted before the visible page is selected', () => {
  const result = getPaginatedUserReviews(reviews, 'approved', 'highest', 1, 2);

  assert.deepEqual(result.items.map((review) => review.id), ['c', 'e']);
  assert.equal(result.totalItems, 3);
  assert.equal(result.totalPages, 2);
});

test('user review pagination clamps a stale page after filters reduce the result set', () => {
  const result = getPaginatedUserReviews(reviews, 'pending', 'newest', 9, 8);

  assert.deepEqual(result.items.map((review) => review.id), ['d', 'b']);
  assert.equal(result.currentPage, 1);
  assert.equal(result.totalItems, 2);
});
