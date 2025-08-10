import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";

export default function PostSkeleton() {
  return (
    <div className="w-screen h-screen sm:p-4">
      <div className="w-full h-full p-4 pb-[100px] flex flex-col gap-9 rounded-md sm:bg-[#F2F2F2]/75 overflow-hidden">
        {/* header */}
        <div className="flex flex-row justify-between">
          <Button
            variant="secondary"
            size="icon"
            className="sm:bg-[#e5e5e5] backdrop-blur-md shadow-inner"
          >
            <X />
          </Button>
        </div>

        <Separator />

        {/* content */}
        <div className="w-full overflow-auto h-full">
          <div className="w-full sm:w-1/2 lg:w-1/3 h-full m-auto flex flex-col">
            {/* title skeleton */}
            <Skeleton className="h-8 w-3/4 mb-3" />

            {/* author section skeleton */}
            <div className="mt-3 flex flex-row gap-2 items-center">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>

            {/* meta tags skeleton */}
            <div className="mt-5 flex flex-row flex-wrap gap-2 items-center">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>

            <Separator className="my-9" />

            {/* description skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>

        {/* post interactions skeleton */}
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 w-1/3 m-auto flex justify-between px-3 py-6 rounded-full bg-background/50 backdrop-blur-md shadow-inner">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>

        {/* audio player skeleton */}
        <div
          className="flex flex-col gap-2 absolute bottom-4 left-1/2 transform -translate-x-1/2 pt-2 pb-4 border-t-[1px] border-border bg-[#F2F2F2]/50"
          style={{ width: "calc(100vw - 64px)" }}
        >
          {/* Play button skeleton */}
          <Skeleton className="w-12 h-12 rounded-full m-auto" />

          {/* Audio scrubber skeleton */}
          <div className="flex flex-col gap-1">
            <Skeleton className="h-2 w-1/2 m-auto rounded-full" />
            <div className="w-1/2 m-auto flex justify-between">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 w-8" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
