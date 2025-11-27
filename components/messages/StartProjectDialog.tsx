"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCollaborativeProject } from "@/utils/projectService";
import { getOtherParticipant } from "@/utils/messageService";
import type { ConversationWithParticipants } from "@/utils/messageService";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";

interface StartProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: ConversationWithParticipants | null;
  currentUserId: string;
}

export default function StartProjectDialog({
  isOpen,
  onClose,
  conversation,
  currentUserId,
}: StartProjectDialogProps) {
  const router = useRouter();
  const [projectTitle, setProjectTitle] = useState("Untitled Project");
  const [isCreating, setIsCreating] = useState(false);

  const otherParticipant = conversation
    ? getOtherParticipant(conversation, currentUserId)
    : null;

  const handleCreateProject = async () => {
    if (!conversation || !otherParticipant || !projectTitle.trim()) return;

    try {
      setIsCreating(true);

      const project = await createCollaborativeProject(
        projectTitle.trim(),
        currentUserId,
        [otherParticipant.user_id as string]
      );

      if (project) {
        toast.success("Project created!");
        onClose();
        router.push(`/workspace/${project.id}`);
      } else {
        toast.error("Failed to create project");
      }
    } catch (err) {
      console.error("Error creating project:", err);
      toast.error("Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCreateProject();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="text-title font-plex-serif">
            New Project
          </DialogTitle>
          <DialogDescription className="text-sub-description font-source-sans">
            Create a collaborative project together
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sub-description font-source-sans font-medium">
              Project name
            </label>
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter project name..."
              className="p-3 rounded-lg bg-background/50 backdrop-blur-md shadow-inner resize-none text-description font-source-sans focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={isCreating}
              autoFocus
            />
          </div>

          <div className="p-3 rounded-lg bg-background/50 backdrop-blur-md shadow-inner">
            <div className="text-metadata font-source-sans text-muted-foreground mb-2">
              Collaborators
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-row gap-2 items-center">
                <Avatar
                  src={otherParticipant?.profiles?.avatar_url ?? undefined}
                  alt={otherParticipant?.profiles?.name || "User"}
                  className="w-8 h-8"
                />
                <span className="text-sub-description font-source-sans">
                  {otherParticipant?.profiles?.name || "Unknown"}
                </span>
              </div>
              <div className="flex flex-row gap-2 items-center">
                <Avatar className="w-8 h-8 bg-primary/20" />
                <span className="text-sub-description font-source-sans">
                  You
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isCreating}
              className="bg-background/50 backdrop-blur-md"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!projectTitle.trim() || isCreating}
              className="bg-primary text-primary-foreground"
            >
              {isCreating ? <LoadingSpinner size={20} /> : "Create Project"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}