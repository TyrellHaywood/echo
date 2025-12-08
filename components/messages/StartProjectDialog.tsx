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
      <DialogContent className="sm:max-w-md bg-[#1E1E1E]/90 backdrop-blur-xl border border-white/20">
        <DialogHeader>
          <DialogTitle className="text-title font-plex-serif text-white">
            New Project
          </DialogTitle>
          <DialogDescription className="text-sub-description font-source-sans text-white/70">
            Create a collaborative project together
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sub-description font-source-sans font-medium text-white">
              Project name
            </label>
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter project name..."
              className="p-3 rounded-lg bg-white/10 backdrop-blur-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] border border-white/20 text-white placeholder:text-white/50 resize-none text-description font-source-sans focus:outline-none focus:ring-2 focus:ring-white/30"
              disabled={isCreating}
              autoFocus
            />
          </div>

          <div className="p-3 rounded-lg bg-white/10 backdrop-blur-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] border border-white/10">
            <div className="text-metadata font-source-sans text-white/60 mb-2">
              Collaborators
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-row gap-2 items-center">
                <Avatar
                  src={otherParticipant?.profiles?.avatar_url ?? undefined}
                  alt={otherParticipant?.profiles?.name || "User"}
                  className="w-8 h-8"
                />
                <span className="text-sub-description font-source-sans text-white">
                  {otherParticipant?.profiles?.name || "Unknown"}
                </span>
              </div>
              <div className="flex flex-row gap-2 items-center">
                <Avatar className="w-8 h-8 bg-white/20" />
                <span className="text-sub-description font-source-sans text-white">
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
              className="bg-white/10 backdrop-blur-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] border border-white/20 text-white hover:bg-white/15 hover:border-white/30"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!projectTitle.trim() || isCreating}
              className="bg-white/20 backdrop-blur-xl shadow-[inset_0_2px_8px_rgba(255,255,255,0.1)] border border-white/30 text-white hover:bg-white/25 hover:border-white/40"
            >
              {isCreating ? <LoadingSpinner size={20} /> : "Create Project"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}