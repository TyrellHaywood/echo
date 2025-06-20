// Shadcn components
import { Menubar, MenubarMenu } from "@/components/ui/menubar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";

// Icons
import { Waypoints, Plus, User } from "lucide-react";

// Custom components
import CreatePost from "@/components/post/CreatePost";

export default function Home() {
  return (
    <div>
      {/* Top menu */}
      <div className="flex flex-row gap-4">
        <Logo className="absolute top-4 left-4" />
        <div className="flex flex-row gap-4 items-center absolute top-4 left-1/2 transform -translate-x-1/2 w-1/3">
          <Input type="text" placeholder="Search"></Input>
        </div>
      </div>

      {/* Toolbar */}
      <Menubar className="absolute bottom-4 left-1/2 transform -translate-x-1/2 p-0 space-x-0">
        <MenubarMenu>
          <Button variant="ghost" className="hover:border hover:border-input">
            <Waypoints />
          </Button>

          <CreatePost />

          <Button variant="ghost" className="hover:border hover:border-input">
            <User />
          </Button>
        </MenubarMenu>
      </Menubar>
    </div>
  );
}
