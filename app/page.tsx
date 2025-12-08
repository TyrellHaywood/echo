"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import MetaGraphV2 from "@/components/metaGraph/MetaGraphV2";
import Toolbar from "@/components/Toolbar";
import CursorMask from "@/components/CursorMask";

export default function Home() {
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[role="dialog"]') || target.closest('[data-radix-popper-content-wrapper]')) {
        setShowCursor(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCursor(true);
      }
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[url('/bg.png')] bg-cover bg-center bg-no-repeat">
      <CursorMask isVisible={showCursor} />
      
      {/* Main page elements */}
      <MetaGraphV2 />

      {/* Top menu */}
      <div className="absolute top-0 left-0 w-full z-20">
        <div className="flex flex-row gap-4">
          <Logo className="absolute top-4 left-4" />
          <div className="flex flex-row gap-4 items-center absolute top-4 left-1/2 transform -translate-x-1/2 w-1/3">
            <Input
              type="text"
              placeholder="Search"
              className="bg-white/10 backdrop-blur-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] border border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-white/30 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <Toolbar />
    </div>
  );
}