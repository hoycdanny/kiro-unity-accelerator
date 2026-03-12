import { KnowledgeEntry, KnowledgeStatus } from './types';

/** Number of days after which a document is considered stale. */
const STALENESS_THRESHOLD_DAYS = 180;

/** Milliseconds in one day. */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Result of a staleness check for a single knowledge entry.
 */
export interface StalenessResult {
  id: string;
  status: KnowledgeStatus;
  daysSinceUpdate: number;
}

/**
 * Check whether a {@link KnowledgeEntry} is stale.
 *
 * If `updatedAt` is more than 180 days before `currentDate`, the status is
 * {@link KnowledgeStatus.NeedsReview}; otherwise it is
 * {@link KnowledgeStatus.Active}.
 */
export function checkStaleness(
  entry: KnowledgeEntry,
  currentDate: Date,
): StalenessResult {
  const updatedAt = new Date(entry.updatedAt);
  const diffMs = currentDate.getTime() - updatedAt.getTime();
  const daysSinceUpdate = Math.floor(diffMs / MS_PER_DAY);

  const status =
    daysSinceUpdate > STALENESS_THRESHOLD_DAYS
      ? KnowledgeStatus.NeedsReview
      : KnowledgeStatus.Active;

  return { id: entry.id, status, daysSinceUpdate };
}
