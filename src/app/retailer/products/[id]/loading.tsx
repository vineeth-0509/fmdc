import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="grid gap-6 md:grid-cols-2" aria-busy="true" aria-label="Loading">
      <Skeleton className="aspect-square w-full" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-4/5" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  );
}
