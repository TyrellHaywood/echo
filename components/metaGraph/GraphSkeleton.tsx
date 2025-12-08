import { Skeleton } from "@/components/ui/skeleton";

export default function GraphSkeleton() {
  return (
    <div className="w-full h-screen relative bg-[url('/bg.png')] bg-cover bg-center bg-no-repeat">
      <div className="absolute inset-0">
        {/* Central node */}
        <Skeleton className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-md" />

        {/* Top left cluster */}
        <Skeleton className="absolute top-1/4 left-1/4 w-6 h-6 rounded-md" />
        <Skeleton className="absolute top-1/3 left-1/5 w-6 h-6 rounded-md" />

        {/* Top right cluster */}
        <Skeleton className="absolute top-1/4 right-1/4 w-6 h-6 rounded-md" />
        <Skeleton className="absolute top-1/3 right-1/5 w-6 h-6 rounded-md" />

        {/* Bottom left cluster */}
        <Skeleton className="absolute bottom-1/4 left-1/4 w-6 h-6 rounded-md" />
        <Skeleton className="absolute bottom-1/3 left-1/5 w-7 h-7 rounded-md" />

        {/* Bottom right cluster */}
        <Skeleton className="absolute bottom-1/4 right-1/4 w-6 h-6 rounded-md" />
        <Skeleton className="absolute bottom-1/3 right-1/5 w-6 h-6 rounded-md" />

        {/* Additional scattered nodes */}
        <Skeleton className="absolute top-2/3 left-1/3 w-5 h-5 rounded-md" />
        <Skeleton className="absolute top-1/6 left-2/3 w-6 h-6 rounded-md" />
        <Skeleton className="absolute bottom-1/6 left-2/3 w-6 h-6 rounded-md" />
        <Skeleton className="absolute top-2/3 right-1/3 w-6 h-6 rounded-md" />
        <Skeleton className="absolute top-1/2 left-1/6 w-5 h-5 rounded-md" />
        <Skeleton className="absolute top-1/2 right-1/6 w-6 h-6 rounded-md" />
      </div>
    </div>
  );
}
