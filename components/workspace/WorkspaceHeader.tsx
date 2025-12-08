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
  onlineCollaborators?: { userId: string; name: string | null; avatarUrl: string | null }[];
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
  onToggleChat,
  formatTime,
  getCurrentBar,
  getCurrentBeat,
  hasSelectedTrack,
  publishButton,
  onlineCollaborators,
}: WorkspaceHeaderProps) {
  return (
    <div className="w-full bg-[#1E1E1E] px-4 py-3 flex flex-row justify-between items-end z-50">
      {/* Left section */}
      <div className="flex flex-row gap-3 items-center">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={onNavigateHome}
          className="bg-white/10 backdrop-blur-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] border border-white/20 text-white hover:bg-white/15 hover:border-white/30"
        >
          <Home size={20} />
        </Button>
        {publishButton && <div>{publishButton}</div>}
      </div>

      {/* Center section - Transport controls */}
      <div className="flex flex-row gap-6 items-center">
        {/* Media buttons */}
        <Menubar className="rounded-full bg-white/10 backdrop-blur-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] border border-white/20">
          <Button
            variant="ghost"
            size="icon"
            onClick={onStop}
            disabled={!isPlaying && currentTime === 0}
            className="text-white hover:bg-white/10"
          >
            <SkipBack size={20} className="fill-white" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onPlayPause}
            disabled={tracksCount === 0}
            className="text-white hover:bg-white/10"
          >
            {isPlaying ? 
              <Pause size={20} className="fill-white" /> : 
              <Play size={20} className="fill-white" />
            }
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onRecord}
            className={`hover:bg-white/10 ${isRecording ? 'text-red-500' : 'text-white'}`}
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
        <Menubar className="rounded-full h-full bg-white/10 backdrop-blur-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] border border-white/20">
          <div className="flex flex-row items-center px-2">
            <div className="flex flex-col items-center">
              <span className="text-description text-white">{getCurrentBar().toString().padStart(3, '0')}</span>
              <span className="text-white/60 uppercase text-metadata">Bar</span>
            </div>
            <div className="flex flex-col items-center uppercase text-metadata">
              <span className="text-description text-white">.</span>
              <span className="text-white/60">.</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-description text-white">{getCurrentBeat()}</span>
              <span className="text-white/60 uppercase text-metadata">Beat</span>
            </div>   
          </div>
          
          <Separator orientation="vertical" className="!h-10 bg-white/20" />

          <div className="flex flex-col items-center px-2">
            <span className="text-description text-white">{bpm}</span>
            <span className="text-white/60 uppercase text-metadata">BPM</span>
          </div>
          
          <Separator orientation="vertical" className="!h-10 bg-white/20" />

          <div className="flex flex-col items-center px-2">
            <span className="text-description text-white">{formatTime(currentTime)}</span>
            <span className="text-white/60 uppercase text-metadata">Time</span>
          </div>
        </Menubar>

        <Button 
          variant="outline" 
          size="icon" 
          className="rounded-full bg-white/10 backdrop-blur-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] border border-white/20 text-white hover:bg-white/15 hover:border-white/30"
        >
          <Music size={20} />
        </Button>
      </div>

      {/* Right section - Project info */}
      <div className="flex flex-col gap-2 items-left">
        <span className="text-title font-plex-serif text-white">
          {project.title}
        </span>
        <div className="flex flex-row gap-8 items-center">
          {/* Collaborator avatars */}
          <div className="flex flex-row gap-4 items-center">
            {project.post_authors.map((author) => {
              const isOnline = onlineCollaborators?.some(
                (user) => user.userId === author.user_id
              );
              return (
                <div key={author.user_id} className="relative">
                  <Avatar
                    src={author.profiles?.avatar_url ?? undefined}
                    alt={author.profiles?.name || "User"}
                    className="w-8 h-8"
                  />
                  {isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#1E1E1E] rounded-full" />
                  )}
                </div>
              );
            })}
            <Button 
              size="icon" 
              variant="outline" 
              className="rounded-full bg-white/10 backdrop-blur-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] border border-white/20 text-white hover:bg-white/15 hover:border-white/30"
            >
              <Plus />
            </Button>
          </div>
          
          <Button 
            size="icon" 
            variant="outline" 
            onClick={onToggleChat}
            className="bg-white/10 backdrop-blur-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] border border-white/20 text-white hover:bg-white/15 hover:border-white/30"
          >
            <PanelRight />
          </Button>
        </div>
      </div>
    </div>
  );
}