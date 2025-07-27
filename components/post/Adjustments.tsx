// Dependencies
import React, { useRef, useEffect, useState } from "react";

// Shadcn components
import { Button } from "@/components/ui/button";

// Icons
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";

interface AdjustmentsProps {
  audioFile: File | null;
  trimStart: number;
  trimEnd: number;
  setTrimStart: (value: number) => void;
  setTrimEnd: (value: number) => void;
}

export default function Adjustments({
  audioFile,
  trimStart,
  trimEnd,
  setTrimStart,
  setTrimEnd,
}: AdjustmentsProps) {
  const [buttonText, setButtonText] = useState("Play");
  const [audioSrc, setAudioSrc] = useState<string>("");
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const generateWaveform = async (file: File) => {
    setIsAnalyzing(true);
    try {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const rawData = audioBuffer.getChannelData(0); // Get first channel
      const samples = 100; // Number of bars in waveform
      const blockSize = Math.floor(rawData.length / samples);
      const filteredData: number[] = [];

      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[i * blockSize + j]);
        }
        filteredData.push(sum / blockSize);
      }

      // Normalize the data to 0-1 range
      const maxValue = Math.max(...filteredData);
      const normalizedData = filteredData.map((value) => value / maxValue);

      setWaveformData(normalizedData);
    } catch (error) {
      console.error("Error generating waveform:", error);
      // Fallback to fake waveform data
      const fallbackData = Array.from(
        { length: 100 },
        (_, i) => 0.2 + Math.sin(i * 0.3) * 0.3 + Math.random() * 0.2
      );
      setWaveformData(fallbackData);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePlay = () => {
    const audio = audioRef.current;
    if (!audio || !audioFile) {
      return;
    }

    // Check if currently playing
    if (!audio.paused) {
      audio.pause();
      setButtonText("Play");
      return;
    }

    // Make sure audio is loaded
    if (!audio.duration || isNaN(audio.duration)) {
      audio.load();

      // Wait for it to load
      const handleCanPlay = () => {
        audio.removeEventListener("canplay", handleCanPlay);
        handlePlay();
      };

      audio.addEventListener("canplay", handleCanPlay);
      return;
    }

    // Get trim settings
    const duration = audio.duration;
    const startTime = (trimStart / 100) * duration;
    const endTime = (trimEnd / 100) * duration;

    // Set position and play
    audio.currentTime = startTime;
    audio.volume = 1.0;
    audio.muted = false;

    // Start playing
    audio
      .play()
      .then(() => {
        setButtonText("Pause");

        // Interval to check position
        const checkPosition = setInterval(() => {
          if (!audio || audio.paused || audio.currentTime >= endTime) {
            clearInterval(checkPosition);
            if (audio && !audio.paused && audio.currentTime >= endTime) {
              audio.pause();
            }
            setButtonText("Play");
          } else {
          }
        }, 500); // Check every 500ms
      })
      .catch((err) => {
        console.error("Play failed:", err);
        setButtonText("Play");
      });
  };

  // Set up audio source when file changes
  useEffect(() => {
    if (audioFile) {
      const audioUrl = URL.createObjectURL(audioFile);
      setAudioSrc(audioUrl);

      // Generate waveform for the new file
      generateWaveform(audioFile);

      return () => {
        URL.revokeObjectURL(audioUrl);
      };
    } else {
      setAudioSrc("");
      setWaveformData([]);
    }
  }, [audioFile]);

  if (!audioFile) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {/* Static audio element with stable src */}
        <audio
          ref={audioRef}
          src={audioSrc}
          preload="metadata"
          style={{ display: "none" }}
          onLoadedMetadata={() => {}}
          onError={(e) => {
            console.error("Audio error:", e);
          }}
        />

        {/* Trimming interface */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            {/* Play/Pause Buttons */}
            <Button
              variant="default"
              size="icon"
              className=""
              onClick={handlePlay}
            >
              {buttonText === "Pause" ? (
                <Pause size={16} fill="white" />
              ) : (
                <Play size={16} fill="white" />
              )}
            </Button>

            {/* Audio Track with Trim Handles */}
            <div className="flex-1 relative rounded-md">
              {/* Waveform track container */}
              <div className="h-9 bg-transparent rounded-md border border-input relative overflow-hidden">
                {/* Waveform visualization */}
                <div className="absolute inset-0 flex items-center justify-center px-1">
                  {isAnalyzing ? (
                    <div className="text-xs text-muted-foreground">
                      Analyzing audio...
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-end justify-between px-1">
                      {waveformData.map((amplitude, i) => (
                        <div
                          key={i}
                          className="bg-[#46b1c9] rounded-sm" // TODO: Use random array of colors in theme
                          style={{
                            width: `${100 / waveformData.length}%`,
                            height: `${20 + amplitude * 60}%`, // Scale amplitude to 20-80% height
                            opacity: 0.8,
                            marginRight: "1px",
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Left trim handle */}
                <div
                  className="absolute top-0 left-0 w-3 h-full bg-black rounded-l-md cursor-ew-resize flex items-center justify-center select-none"
                  style={{ left: `${trimStart}%` }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const target = e.currentTarget as HTMLElement;
                    const container = target.parentElement as HTMLElement;

                    const handleMouseMove = (moveEvent: MouseEvent) => {
                      if (container) {
                        const rect = container.getBoundingClientRect();
                        const percent = Math.max(
                          0,
                          Math.min(
                            trimEnd - 5,
                            ((moveEvent.clientX - rect.left) / rect.width) * 100
                          )
                        );
                        setTrimStart(percent);
                      }
                    };

                    const handleMouseUp = () => {
                      document.removeEventListener(
                        "mousemove",
                        handleMouseMove
                      );
                      document.removeEventListener("mouseup", handleMouseUp);
                    };

                    document.addEventListener("mousemove", handleMouseMove);
                    document.addEventListener("mouseup", handleMouseUp);
                  }}
                >
                  <ChevronLeft color="white" />
                </div>

                {/* Right trim handle */}
                <div
                  className="absolute top-0 right-0 w-3 h-full bg-black rounded-r-md cursor-ew-resize flex items-center justify-center select-none"
                  style={{ right: `${100 - trimEnd}%` }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const target = e.currentTarget as HTMLElement;
                    const container = target.parentElement as HTMLElement;

                    const handleMouseMove = (moveEvent: MouseEvent) => {
                      if (container) {
                        const rect = container.getBoundingClientRect();
                        const percent = Math.max(
                          trimStart + 5,
                          Math.min(
                            100,
                            ((moveEvent.clientX - rect.left) / rect.width) * 100
                          )
                        );
                        setTrimEnd(percent);
                      }
                    };

                    const handleMouseUp = () => {
                      document.removeEventListener(
                        "mousemove",
                        handleMouseMove
                      );
                      document.removeEventListener("mouseup", handleMouseUp);
                    };

                    document.addEventListener("mousemove", handleMouseMove);
                    document.addEventListener("mouseup", handleMouseUp);
                  }}
                >
                  <ChevronRight color="white" />
                </div>

                {/* Dimmed areas outside selection */}
                <div
                  className="absolute top-0 left-0 h-full bg-black/50"
                  style={{ width: `${trimStart}%` }}
                />
                <div
                  className="absolute top-0 right-0 h-full bg-black/50"
                  style={{ width: `${100 - trimEnd}%` }}
                />
              </div>
            </div>
          </div>

          {/* Trim info display */}
          <div className="mt-2 text-metadata text-center">
            Duration:{" "}
            {audioRef.current?.duration &&
              (() => {
                const duration = audioRef.current.duration;
                const startTime = (trimStart / 100) * duration;
                const endTime = (trimEnd / 100) * duration;
                const trimmedDuration = endTime - startTime;
                return `${trimmedDuration.toFixed(1)}s`;
              })()}
          </div>
        </div>
      </div>
    </div>
  );
}
