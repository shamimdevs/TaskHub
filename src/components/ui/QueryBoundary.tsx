"use client";

import { Inbox } from "lucide-react";
import { Alert, EmptyState, Skeleton } from "./Misc";
import { Button } from "./Button";

interface QueryLike<T> {
  data?: T;
  isLoading: boolean;
  isFetching?: boolean;
  isError: boolean;
  refetch?: () => void;
}

export function QueryBoundary<T>({
  query,
  children,
  skeleton,
  empty,
  isEmpty,
}: {
  query: QueryLike<T>;
  children: (data: T) => React.ReactNode;
  skeleton?: React.ReactNode;
  empty?: { title: string; description?: string; action?: React.ReactNode };
  isEmpty?: (data: T) => boolean;
}) {
  if (query.isLoading) {
    return (
      <>
        {skeleton ?? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}
      </>
    );
  }

  if (query.isError || query.data === undefined) {
    return (
      <Alert tone="danger" title="Couldn't load this">
        <div className="mt-2">
          <Button size="sm" variant="outline" onClick={() => query.refetch?.()}>
            Try again
          </Button>
        </div>
      </Alert>
    );
  }

  const data = query.data;
  const emptyNow = isEmpty
    ? isEmpty(data)
    : Array.isArray(data) && data.length === 0;

  if (emptyNow && empty) {
    return (
      <EmptyState
        icon={Inbox}
        title={empty.title}
        description={empty.description}
        action={empty.action}
      />
    );
  }

  return <>{children(data)}</>;
}
