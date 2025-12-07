"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Volume2, VolumeX, Headphones, Trash2 } from "lucide-react";
import { supabase } from "@/utils/supabase";
import { toast } from "sonner";

interface Track {
  id: string;
  title: string;
  volume: number;
  is_muted: boolean;
  user_id: string;
  profiles?: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  };
}

interface TrackControlProps {
  track: Track;
  isSelected: boolean;
  onSelect: () => void;
  onVolumeChange: (trackId: string, volume: number) => void;
  onMuteToggle: (trackId: string) => void;
  onSoloToggle: (trackId: string) => void;
  onDelete: (trackId: string) => void;
  onNameUpdate: (trackId: string, newName: string) => void;
}

export function TrackControl({
  track,
  isSelected,
  onSelect,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  onDelete,
  onNameUpdate,
}: TrackControlProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(track.title);

  const handleNameSave = async () => {
    if (!editName.trim()) {
      setIsEditing(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('tracks')
        .update({ title: editName.trim() })
        .eq('id', track.id);

      if (error) {
        toast.error('Failed to update track name');
        return;
      }

      onNameUpdate(track.id, editName.trim());
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating track name:', err);
      toast.error('Failed to update track name');
    }
  };

  return (
    <div
      className={`bg-background/30 backdrop-blur-sm rounded-lg p-3 transition-all cursor-pointer ${
        isSelected 
          ? 'ring-2 ring-primary' 
          : 'hover:bg-background/40'
      }`}
      onClick={onSelect}
    >
      {/* Track header */}
      <div className="flex items-center gap-2 mb-2">
        <Avatar
          src={track.profiles?.avatar_url ?? undefined}
          alt={track.profiles?.name || "User"}
          className="w-8 h-8"
        />
        
        {isEditing ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNameSave();
              if (e.key === 'Escape') {
                setIsEditing(false);
                setEditName(track.title);
              }
            }}
            className="h-7 text-sm font-source-sans flex-1"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span 
            className="text-sm font-source-sans font-medium flex-1 cursor-text"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            {track.title}
          </span>
        )}
      </div>

      {/* Track controls */}
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onMuteToggle(track.id)}
        >
          {track.is_muted ? (
            <VolumeX size={16} className="text-muted-foreground" />
          ) : (
            <Volume2 size={16} />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onSoloToggle(track.id)}
        >
          <Headphones size={16} />
        </Button>

        <Slider
          value={[track.volume ?? 1.0]}
          min={0}
          max={1}
          step={0.01}
          onValueChange={(value) => onVolumeChange(track.id, value[0])}
          className="flex-1"
        />

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(track.id)}
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
}