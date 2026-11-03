import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-12 w-full" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="card flex gap-3 p-3">
          <Skeleton className="h-[84px] w-[84px] shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
