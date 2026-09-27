import { AppHeader } from './AppHeader';
import { ErrorState } from './EmptyState';
import { Screen } from './Screen';
import { SkeletonList } from './Skeleton';

/**
 * Full-screen stand-in for a detail screen whose data isn't there yet:
 * skeletons while loading, an error with retry if the request failed.
 */
export function QueryFallback({ title, error, onRetry }: { title: string; error?: string | null; onRetry?: () => void }) {
  return (
    <Screen header={<AppHeader title={title} />}>
      {error ? <ErrorState message={error} onRetry={onRetry} /> : <SkeletonList count={2} />}
    </Screen>
  );
}
