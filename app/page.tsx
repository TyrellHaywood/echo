"use client";

// Utilities
import { useGoToProfile } from "@/components/GoToProfile";

// Shadcn components
import { Menubar, MenubarMenu } from "@/components/ui/menubar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";

// Icons
import { Waypoints, Plus, User } from "lucide-react";

// Custom components
import CreatePost from "@/components/post/CreatePost";
import MetaGraph from "@/components/metaGraph/MetaGraph";

export default function Home() {
  const { goToMyProfile } = useGoToProfile();

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
      <Menubar className="absolute bottom-4 left-1/2 transform -translate-x-1/2 p-0 space-x-0 z-20 bg-background/50 backdrop-blur-md shadow-inner">
        <MenubarMenu>
          <Button variant="ghost" className="hover:border hover:border-input">
            <Waypoints />
          </Button>

          <CreatePost />

          {/* View profile */}
          <Button
            variant="ghost"
            className="hover:border hover:border-input"
            onClick={goToMyProfile}
          >
            <User />
          </Button>
        </MenubarMenu>
      </Menubar>
    </div>
  );
}
