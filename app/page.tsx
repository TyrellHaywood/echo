"use client";

// Shadcn components
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";

// Custom components
import MetaGraph from "@/components/metaGraph/MetaGraph";
import Toolbar from "@/components/Toolbar";

export default function Home() {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Main page elements */}
      <MetaGraph />

      {/* Top menu */}
      <div className="absolute top-0 left-0 w-full z-20">
        <div className="flex flex-row gap-4">
          <Logo className="absolute top-4 left-4" />
          <div className="flex flex-row gap-4 items-center absolute top-4 left-1/2 transform -translate-x-1/2 w-1/3">
            <Input
              type="text"
              placeholder="Search"
              className="bg-background/50 backdrop-blur-md shadow-inner"
            />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <Toolbar />
    </div>
  );
}
