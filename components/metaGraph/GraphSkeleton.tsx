import { Skeleton } from "@/components/ui/skeleton";

export default function GraphSkeleton() {
  return (
    <div className="w-full h-screen relative bg-background">
      {/* Simulated graph nodes scattered across the screen */}
      <div className="absolute inset-0">
        {/* Central cluster */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <Skeleton className="w-8 h-8 rounded-md" />
          <Skeleton className="w-12 h-3 mt-2 mx-auto" />
        </div>

        {/* Top left cluster */}
        <div className="absolute top-1/4 left-1/4">
          <Skeleton className="w-6 h-6 rounded-md" />
          <Skeleton className="w-8 h-2 mt-1 mx-auto" />
        </div>

        <div className="absolute top-1/3 left-1/5">
          <Skeleton className="w-7 h-7 rounded-md" />
          <Skeleton className="w-10 h-2 mt-1 mx-auto" />
        </div>

        {/* Top right cluster */}
        <div className="absolute top-1/4 right-1/4">
          <Skeleton className="w-6 h-6 rounded-md" />
          <Skeleton className="w-9 h-2 mt-1 mx-auto" />
        </div>

        <div className="absolute top-1/3 right-1/5">
          <Skeleton className="w-7 h-7 rounded-md" />
          <Skeleton className="w-8 h-2 mt-1 mx-auto" />
        </div>

        {/* Bottom left cluster */}
        <div className="absolute bottom-1/4 left-1/4">
          <Skeleton className="w-6 h-6 rounded-md" />
          <Skeleton className="w-7 h-2 mt-1 mx-auto" />
        </div>

        <div className="absolute bottom-1/3 left-1/5">
          <Skeleton className="w-8 h-8 rounded-md" />
          <Skeleton className="w-10 h-2 mt-1 mx-auto" />
        </div>

        {/* Bottom right cluster */}
        <div className="absolute bottom-1/4 right-1/4">
          <Skeleton className="w-7 h-7 rounded-md" />
          <Skeleton className="w-9 h-2 mt-1 mx-auto" />
        </div>

        <div className="absolute bottom-1/3 right-1/5">
          <Skeleton className="w-6 h-6 rounded-md" />
          <Skeleton className="w-8 h-2 mt-1 mx-auto" />
        </div>

        {/* Additional scattered nodes */}
        <div className="absolute top-2/3 left-1/3">
          <Skeleton className="w-5 h-5 rounded-md" />
          <Skeleton className="w-6 h-2 mt-1 mx-auto" />
        </div>

        <div className="absolute top-1/6 left-2/3">
          <Skeleton className="w-6 h-6 rounded-md" />
          <Skeleton className="w-8 h-2 mt-1 mx-auto" />
        </div>

        <div className="absolute bottom-1/6 left-2/3">
          <Skeleton className="w-7 h-7 rounded-md" />
          <Skeleton className="w-9 h-2 mt-1 mx-auto" />
        </div>

        <div className="absolute top-2/3 right-1/3">
          <Skeleton className="w-6 h-6 rounded-md" />
          <Skeleton className="w-7 h-2 mt-1 mx-auto" />
        </div>

        {/* Simulated connection lines */}
        <div className="absolute top-1/2 left-1/2 w-24 h-px bg-primary/10 transform -translate-x-1/2 -translate-y-1/2 rotate-45" />
        <div className="absolute top-1/2 left-1/2 w-20 h-px bg-primary/10 transform -translate-x-1/2 -translate-y-1/2 -rotate-45" />
        <div className="absolute top-1/2 left-1/2 w-16 h-px bg-primary/10 transform -translate-x-1/2 -translate-y-1/2 rotate-12" />
        <div className="absolute top-1/2 left-1/2 w-18 h-px bg-primary/10 transform -translate-x-1/2 -translate-y-1/2 -rotate-12" />
      </div>

      {/* Loading text */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">Loading graph...</span>
      </div>
    </div>
  );
}
