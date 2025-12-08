import { Skeleton } from "@/components/ui/skeleton";
import Toolbar from "@/components/Toolbar";

export default function ProfileSkeleton() {
  return (
    <div className="relative w-screen h-screen bg-[url('/bg.png')] bg-cover bg-center bg-no-repeat">
      <Toolbar />

      {/* Edit button skeleton */}
      <div className="absolute top-6 right-6">
        <Skeleton className="h-9 w-16 rounded-md" />
      </div>

      <div className="flex flex-col items-center justify-center w-4/5 h-screen m-auto">
        {/* Avatar skeleton */}
        <div className="relative w-full max-w-80 aspect-square mb-3">
          <Skeleton className="w-full h-full rounded-md" />
        </div>

        {/* Username skeleton */}
        <div className="w-full max-w-80 pl-4 mb-2">
          <Skeleton className="h-8 w-2/3" />
        </div>

        {/* Name & pronouns skeleton */}
        <div className="flex flex-row gap-2 w-full max-w-80 pl-4 mb-1">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-2 rounded-full" />
          <Skeleton className="h-5 w-20" />
        </div>

        {/* Bio skeleton */}
        <div className="w-full max-w-80 pl-4 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>

        {/* Interests skeleton */}
        <div className="w-full max-w-80 mt-4">
          <div className="flex flex-row flex-wrap gap-2 pl-4">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="h-6 w-18 rounded-full" />
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
