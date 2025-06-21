"use client";

// Dependencies
import { useRouter } from "next/navigation";

// Utilities
import { useGoToProfile } from "@/components/GoToProfile";

// Shadcn components
import { Menubar, MenubarMenu } from "@/components/ui/menubar";
import { Button } from "@/components/ui/button";

// Custom components
import CreatePost from "@/components/post/CreatePost";

// Icons
import { Waypoints, User } from "lucide-react";

export default function Toolbar() {
  const router = useRouter();
  const { goToMyProfile } = useGoToProfile();

  return (
    <Menubar className="absolute bottom-4 left-1/2 transform -translate-x-1/2 p-0 space-x-0 z-20 bg-background/50 backdrop-blur-md shadow-inner">
      <MenubarMenu>
        <Button
          variant="ghost"
          className="hover:border hover:border-input"
          onClick={() => {
            router.push("/");
          }}
        >
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
  );
}
