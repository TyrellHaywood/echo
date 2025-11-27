"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getProject, isUserCollaborator } from "@/utils/projectService";
import type { CollaborativeProject } from "@/utils/projectService";

import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Menubar } from "@/components/ui/menubar";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";

import { 
  Home, 
  Play, 
  Pause, 
  SkipBack, 
  Circle,
  MessageSquare,
  Music,
  PanelRight,
  Plus
} from "lucide-react";

export default function WorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const projectId = params?.projectId as string | undefined;

  const [project, setProject] = useState<CollaborativeProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [showChat, setShowChat] = useState(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentBar, setCurrentBar] = useState(0);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [bpm, setBpm] = useState(120);
  const [currentTime, setCurrentTime] = useState("00:00:00");

  useEffect(() => {
    async function loadProject() {
      if (!projectId || !user) return;

      try {
        setIsLoading(true);
        
        const canAccess = await isUserCollaborator(projectId, user.id);
        setHasAccess(canAccess);

        if (!canAccess) {
          setIsLoading(false);
          return;
        }

        const projectData = await getProject(projectId);
        setProject(projectData);
      } catch (err) {
        console.error("Error loading project:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadProject();
  }, [projectId, user]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRecord = () => {
    setIsRecording(!isRecording);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setIsRecording(false);
    setCurrentBar(0);
    setCurrentBeat(0);
  };

  if (!user) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[#2a2a2a]">
        <div className="text-white text-description font-source-sans">
          Please sign in to access workspace
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[#2a2a2a]">
        <LoadingSpinner size={48} className="text-white" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="w-screen h-screen flex flex-col gap-4 items-center justify-center bg-[#2a2a2a]">
        <div className="text-white text-description font-source-sans">
          You don't have access to this project
        </div>
        <Button
          onClick={() => router.push("/messages")}
          className="bg-primary text-primary-foreground"
        >
          Back to Messages
        </Button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[#2a2a2a]">
        <div className="text-white text-description font-source-sans">
          Project not found
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider open={showChat} onOpenChange={setShowChat}>
      <div className="w-screen h-screen flex flex-col bg-[#2a2a2a] overflow-hidden">
        <div className="w-full bg-background px-4 py-3 flex flex-row justify-between items-end z-50">
          <div className="flex flex-row gap-3 items-center">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/messages")}
            >
              <Home size={20} />
            </Button>

            <Button
              className="bg-black text-white hover:bg-black/90 font-source-sans"
              size="sm"
            >
              Publish
            </Button>
          </div>

          {/* Audio functionality */}
          <div className="flex flex-row gap-6 items-center">
            {/* Media buttons */}
            <Menubar className="rounded-full">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleStop}
                className="hover:bg-transparent"
              >
                <SkipBack size={20} className="fill-black" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePlayPause}
                className="hover:bg-transparent"
              >
                {isPlaying ? <Pause size={20} className="fill-black" /> : <Play size={20} className="fill-black" />}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRecord}
                className={`hover:bg-transparent hover:text-destructive text-destructive ${isRecording ? 'text-destructive' : ''}`}
              >
                <Circle size={20} fill={isRecording ? 'currentColor' : 'none'} />
              </Button>
            </Menubar>

            {/* Time signature */}
            <Menubar className="rounded-full h-full">
              <div className="flex flex-row items-center px-2">
                <div className="flex flex-col items-center">
                  <span className="text-description">{currentBar.toString().padStart(3, '0')}</span>
                  <span className="text-muted-foreground uppercase text-metadata">Bar</span>
                </div>
                <div className="flex flex-col items-center uppercase text-metadata">
                  <span className="text-description">.</span>
                  <span className="text-white">.</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-description">{currentBeat}</span>
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
                <span className="text-description">{currentTime}</span>
                <span className="text-muted-foreground uppercase text-metadata">Time</span>
              </div>
            </Menubar>

            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
            >
              <Music size={20} />
            </Button>
          </div>

          <div className="flex flex-col gap-2 items-left">
            <span className="text-title font-plex-serif">
              {project.title}
            </span>
            {/* Collaborators + sidebar trigger */}
            <div className="flex flex-row gap-8 items-center">
              {/* Avatars */}
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
              <Button size="icon" variant="outline" onClick={() => setShowChat(!showChat)}>
                <PanelRight />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-row overflow-hidden">
          <div className="w-48 bg-[#d9c5a8] p-3 flex flex-col gap-2 overflow-y-auto">
            <div className="text-sub-description font-source-sans font-medium mb-2">
              Tracks
            </div>
            
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground text-sub-description font-source-sans">
                No tracks yet
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              className="w-full bg-transparent backdrop-blur-md"
            >
              + Add Track
            </Button>
          </div>

          <div className="flex-1 bg-[#3a3a3a] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-12 bg-[#4a4a4a] border-b border-[#2a2a2a] flex items-center px-4">
              <div className="flex-1 flex flex-row text-xs text-gray-400 font-source-sans">
                {[1, 3, 5, 7, 9, 11, 13, 15, 17, 19].map((num) => (
                  <div key={num} className="flex-1 text-center">
                    {num}
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute top-12 bottom-0 left-0 right-0 flex items-center justify-center">
              <div className="text-center text-gray-500 text-description font-source-sans">
                Timeline - No tracks recorded yet
              </div>
            </div>

          </div>

          <Sidebar side="right" className="z-10">
            <SidebarHeader>
              <div className="flex flex-row justify-between items-center">
                <span className="text-sub-description font-source-sans font-medium">
                  Project Chat
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowChat(false)}
                >
                  <MessageSquare size={16} />
                </Button>
              </div>
            </SidebarHeader>

            <SidebarContent>
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground text-sub-description font-source-sans">
                  No messages yet
                </div>
              </div>
            </SidebarContent>

            <SidebarFooter>
              <Input
                type="text"
                placeholder="Type a message..."
                className="text-sub-description font-source-sans"
              />
            </SidebarFooter>
          </Sidebar>
        </div>
      </div>
    </SidebarProvider>
  );
}