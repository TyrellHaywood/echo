// Dependencies
import { useState, useEffect } from "react";
import Image from "next/image";
import type { Profile } from "@/app//[username]/page";

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

// Icons
import { Pencil, ChevronLeft } from "lucide-react";

interface EditProfileProps {
  className?: string;
  profile?: Profile | null;
}

export default function EditProfile({ className, profile }: EditProfileProps) {
  const [profileData, setProfileData] = useState<Profile>({
    id: profile?.id || "",
    username: profile?.username || "",
    name: profile?.name || "",
    pronouns: profile?.pronouns || "",
    bio: profile?.bio || "",
    interests: profile?.interests || [],
    avatar_url: profile?.avatar_url || "",
    created_at: profile?.created_at || "",
    updated_at: profile?.updated_at || "",
    finished_setup: profile?.finished_setup ?? false,
  });

  const [currentInterest, setCurrentInterest] = useState("");
  useEffect(() => {
    if (profile) {
      setProfileData({
        id: profile.id || "",
        username: profile.username || "",
        name: profile.name || "",
        pronouns: profile.pronouns || "",
        bio: profile.bio || "",
        interests: profile.interests || [],
        avatar_url: profile.avatar_url || "",
        created_at: profile.created_at || "",
        updated_at: profile.updated_at || "",
        finished_setup: profile.finished_setup ?? false,
      });
    }
  }, [profile]);

  const addInterest = () => {
    if (
      currentInterest.trim() &&
      !profileData.interests?.includes(currentInterest.trim())
    ) {
      setProfileData((prev) => ({
        ...prev,
        interests: [...(prev.interests ?? []), currentInterest.trim()],
      }));
      setCurrentInterest("");
    }
  };

  const removeInterest = (interest: string) => {
    setProfileData((prev) => ({
      ...prev,
      interests: (prev.interests ?? []).filter((i) => i !== interest),
    }));
  };

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
        <DialogHeader className="flex flex-row gap-2 py-1.5 space-y-0 justify-end items-center">
          <DialogClose asChild>
            <Button
              variant="outline"
              className="flex flex-row gap-1 w-fit bg-background/50 backdrop-blur-md shadow-inner"
            >
              <ChevronLeft />
              Close
            </Button>
          </DialogClose>
          <Button className="w-fit flex flex-row" disabled>
            Save Changes
          </Button>
        </DialogHeader>
        {/* User info */}
        <div className="flex flex-col items-center justify-center gap-4 w-4/5 h-screen m-auto">
          {profile?.avatar_url ? (
            <div className="relative w-full max-w-80 aspect-square mb-3">
              <Image
                src={profile.avatar_url}
                alt="Avatar preview"
                fill
                sizes="(max-width: 768px) 100vw, 300px"
                className="rounded-md object-cover shadow-xl"
                onError={(e) => {}}
                onLoad={() => {}}
              />
              <Button variant="default" className="text-black">
                button
              </Button>
            </div>
          ) : (
            <div>
              <span>No avatar</span>
            </div>
          )}
          {/* Username */}
          <div className="w-full flex flex-col gap-1 items-center justify-center text-sub-description">
            <span className="text-left w-[320px]">Username</span>
            <Input
              value={profile?.username ?? ""}
              className="text-sub-title font-plex-serif text-left w-full max-w-80 pl-4"
              type="text"
            ></Input>
          </div>

          {/* Name */}
          <div className="w-full flex flex-col gap-1 items-center justify-center text-sub-description">
            <span className="text-left w-[320px]">Display Name</span>
            <Input
              value={profile?.name ?? ""}
              className="text-sub-title font-plex-serif text-left w-full max-w-80 pl-4"
              type="text"
            ></Input>
          </div>

          {/* Pronouns */}
          <div className="w-full flex flex-col gap-1 items-center justify-center text-sub-description">
            <span className="text-left w-[320px]">Pronouns</span>
            <Input
              value={profile?.pronouns ?? ""}
              className="text-sub-title font-plex-serif text-left w-full max-w-80 pl-4"
              type="text"
            ></Input>
          </div>

          {/* Bio */}
          <div className="w-full flex flex-col gap-1 items-center justify-center text-sub-description">
            <span className="text-left w-[320px]">Bio</span>
            <Textarea
              value={profile?.bio ?? ""}
              className="font-source-sans w-full max-w-80 pl-4"
            ></Textarea>
          </div>

          {/* Interests */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Add interest"
                value={currentInterest}
                onChange={(e) => setCurrentInterest(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addInterest()}
              />
              <Button type="button" onClick={addInterest}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(profileData?.interests ?? []).map((interest) => (
                <Badge
                  key={interest}
                  variant="outline"
                  className="flex flex-row gap-1 bg-background/50 backdrop-blur-md shadow-inner"
                >
                  {interest}
                  <Button
                    onClick={() => removeInterest(interest)}
                    size="icon"
                    variant="ghost"
                    className="py-0 px-1 w-auto h-auto hover:bg-transparent text-muted-foreground hover:text-foreground"
                  >
                    x
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
