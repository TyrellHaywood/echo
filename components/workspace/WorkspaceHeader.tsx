"use client";

import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Menubar } from "@/components/ui/menubar";
import { 
  Home, 
  Play, 
  Pause, 
  SkipBack, 
  Circle,
  Music,
  PanelRight,
  Plus
} from "lucide-react";
import type { CollaborativeProject } from "@/utils/projectService";

interface WorkspaceHeaderProps {
  project: CollaborativeProject;
  isPlaying: boolean;
  isRecording: boolean;
  isUploading: boolean;
  currentTime: number;
  tracksCount: number;
  bpm: number;
  onPlayPause: () => void;
  onStop: () => void;
  onRecord: () => void;
  onNavigateHome: () => void;
  onPublish: () => void;
  onToggleChat: () => void;
  formatTime: (seconds: number) => string;
  getCurrentBar: () => number;
  getCurrentBeat: () => number;
  hasSelectedTrack: boolean;
  publishButton?: React.ReactNode;
}

export function WorkspaceHeader({
  project,
  isPlaying,
  isRecording,
  isUploading,
  currentTime,
  tracksCount,
  bpm,
  onPlayPause,
  onStop,
  onRecord,
  onNavigateHome,
  onPublish,
  onToggleChat,
  formatTime,
  getCurrentBar,
  getCurrentBeat,
  hasSelectedTrack,
  publishButton,
}: WorkspaceHeaderProps) {
  return (
    <div className="w-full bg-background px-4 py-3 flex flex-row justify-between items-end z-50">
      {/* Left section */}
      <div className="flex flex-row gap-3 items-center">
        <Button variant="outline" size="icon" onClick={onNavigateHome}>
          <Home size={20} />
        </Button>
        {publishButton && <div>{publishButton}</div>}
      </div>

      {/* Center section - Transport controls */}
      <div className="flex flex-row gap-6 items-center">
        {/* Media buttons */}
        <Menubar className="rounded-full">
          <Button
            variant="ghost"
            size="icon"
            onClick={onStop}
            disabled={!isPlaying && currentTime === 0}
          >
            <SkipBack size={20} className="fill-black" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onPlayPause}
            disabled={tracksCount === 0}
          >
            {isPlaying ? 
              <Pause size={20} className="fill-black" /> : 
              <Play size={20} className="fill-black" />
            }
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onRecord}
            className={isRecording ? 'text-destructive' : ''}
            disabled={isUploading || !hasSelectedTrack}
          >
            {isUploading ? (
              <LoadingSpinner size={20} />
            ) : (
              <Circle size={20} fill={isRecording ? 'currentColor' : 'none'} />
            )}
          </Button>
        </Menubar>

        {/* Time signature */}
        <Menubar className="rounded-full h-full">
          <div className="flex flex-row items-center px-2">
            <div className="flex flex-col items-center">
              <span className="text-description">{getCurrentBar().toString().padStart(3, '0')}</span>
              <span className="text-muted-foreground uppercase text-metadata">Bar</span>
            </div>
            <div className="flex flex-col items-center uppercase text-metadata">
              <span className="text-description">.</span>
              <span className="text-white">.</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-description">{getCurrentBeat()}</span>
              <span className="text-muted-foreground uppercase text-metadata">Beat</span>
            </div>   
          </div>
          
          <Separator orientation="vertical" className="!h-10" />

          <div className="flex flex-col items-center px-2">
            <span className="text-description">{bpm}</span>
            <span className="text-muted-foreground uppercase text-metadata">BPM</span>
          </div>
          
          <Separator orientation="vertical" className="!h-10" />

          <div className="flex flex-col items-center px-2">
            <span className="text-description">{formatTime(currentTime)}</span>
            <span className="text-muted-foreground uppercase text-metadata">Time</span>
          </div>
        </Menubar>

        <Button variant="outline" size="icon" className="rounded-full">
          <Music size={20} />
        </Button>
      </div>

      {/* Right section - Project info */}
      <div className="flex flex-col gap-2 items-left">
        <span className="text-title font-plex-serif">
          {project.title}
        </span>
        <div className="flex flex-row gap-8 items-center">
          {/* Collaborator avatars */}
          <div className="flex flex-row gap-4 items-center">
            {project.post_authors.map((author) => (
              <Avatar
                key={author.user_id}
                src={author.profiles?.avatar_url ?? undefined}
                alt={author.profiles?.name || "User"}
                className="w-8 h-8"
              />
            ))}
            <Button size="icon" variant="outline" className="rounded-full">
              <Plus />
            </Button>
          </div>
          
          <Button size="icon" variant="outline" onClick={onToggleChat}>
            <PanelRight />
          </Button>
        </div>
      </div>
    </div>
  );
}