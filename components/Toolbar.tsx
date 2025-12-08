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
import { Home, User, MessageCircle } from "lucide-react";

export default function Toolbar() {
  const router = useRouter();
  const { goToMyProfile } = useGoToProfile();

  return (
    <Menubar className="absolute bottom-4 left-1/2 transform -translate-x-1/2 p-0 space-x-0 z-20 bg-white/10 backdrop-blur-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] border border-white/20 text-white hover:bg-white/15 hover:border-white/30">
      <MenubarMenu>
        <Button
          variant="ghost"
          className="text-white hover:bg-white/15 hover:border-white/30"
          onClick={() => {
            router.push("/");
          }}
        >
          <Home />
        </Button>

        <CreatePost />

        {/* View messages */}
        <Button
          variant="ghost"
          className="text-white hover:bg-white/15 hover:border-white/30"
          onClick={() => {
            router.push("/messages");
          }}
        >
          <MessageCircle />
        </Button>

        {/* View profile */}
        <Button
          variant="ghost"
          className="text-white hover:bg-white/15 hover:border-white/30"
          onClick={goToMyProfile}
        >
          <User />
        </Button>
      </MenubarMenu>
    </Menubar>
  );
}
