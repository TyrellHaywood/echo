// Dependencies
import type { Profile } from "@/app//[username]/page";

// Shadcn Components
import { Button } from "@/components/ui/button";

// Icons
import { Pencil, ChevronLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

interface EditProfileProps {
  className?: string;
  profile?: Profile | null;
}

export default function EditProfile({ className, profile }: EditProfileProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="flex flex-row gap-1 bg-background/50 backdrop-blur-md shadow-inner"
        >
          <Pencil />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-screen h-screen" closeClassName="hidden">
        <DialogHeader className="flex items-end">
          <DialogClose asChild>
            <Button
              variant="outline"
              className="flex flex-row gap-1 w-fit bg-background/50 backdrop-blur-md shadow-inner"
            >
              <ChevronLeft />
              Close
            </Button>
          </DialogClose>
        </DialogHeader>
        {/* User info */}
      </DialogContent>
    </Dialog>
  );
}
