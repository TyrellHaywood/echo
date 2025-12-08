"use client";

import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface TrackWaveformProps {
  audioUrl: string;
  duration: number;
  trackTitle: string;
  color?: string;
  pixelsPerSecond?: number;
  isMuted?: boolean;
}

export function TrackWaveform({
  audioUrl,
  duration,
  trackTitle,
  color = "#e09145",
  pixelsPerSecond = 50,
  isMuted = false,
}: TrackWaveformProps) {
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate waveform from audio URL
  useEffect(() => {
    async function generateWaveform() {
      if (!audioUrl) return;

      setIsLoading(true);
      setError(null);

      try {
        // Fetch audio file
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();

        // Create audio context and decode
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Get audio data from first channel
        const rawData = audioBuffer.getChannelData(0);
        
        // Calculate number of samples based on duration and desired resolution
        const samples = Math.min(Math.floor(duration * 10), 200); // 10 samples per second, max 200
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData: number[] = [];

        // Process audio data into waveform bars
        for (let i = 0; i < samples; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[i * blockSize + j]);
          }
          filteredData.push(sum / blockSize);
        }

        // Normalize data to 0-1 range
        const maxValue = Math.max(...filteredData);
        const normalizedData = filteredData.map((value) => value / maxValue);

        setWaveformData(normalizedData);
        await audioContext.close();
      } catch (err) {
        console.error("Error generating waveform:", err);
        setError("Failed to load waveform");
        
        // Fallback to simple sine wave pattern
        const fallbackData = Array.from(
          { length: 50 },
          (_, i) => 0.3 + Math.sin(i * 0.2) * 0.3 + Math.random() * 0.2
        );
        setWaveformData(fallbackData);
      } finally {
        setIsLoading(false);
      }
    }

    generateWaveform();
  }, [audioUrl, duration]);

  // Calculate width based on duration
  const widthPx = duration * pixelsPerSecond;

  // Reduce opacity
function hexToRgba(hex: string, alpha: number) {
    let c = hex.replace("#", "");
    if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
}

const displayColor = !isMuted ? hexToRgba(color, 0.4) : color;
const bgColor = !isMuted ? hexToRgba(color, 0.15) : hexToRgba(color, 0.5);

  if (isLoading) {
    return (
      <div
        className="h-16 rounded-md flex items-center justify-center"
        style={{
          width: `${widthPx}px`,
          backgroundColor: bgColor,
        }}
      >
        <LoadingSpinner size={20} className="text-white" />
      </div>
    );
  }

  if (error && waveformData.length === 0) {
    return (
      <div
        className="h-16 rounded-md flex items-center justify-center"
        style={{
          width: `${widthPx}px`,
          backgroundColor: bgColor,
        }}
      >
        <span className="text-xs text-white/70 font-source-sans">
          Error loading audio
        </span>
      </div>
    );
  }

  return (
    <div
      className="h-full rounded-md relative overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
      style={{
        width: `${widthPx}px`,
        backgroundColor: bgColor,
      }}
    >
      {/* Waveform bars */}
      <div className="absolute inset-0 flex items-center justify-between px-1 gap-[2px]">
        {waveformData.map((amplitude, i) => (
          <div
            key={i}
            className="rounded-sm transition-all flex-1 max-w-[3px]"
            style={{
              height: `${Math.max(amplitude * 100, 4)}%`,
              backgroundColor: displayColor,
            }}
          />
        ))}
      </div>

      {/* Track title overlay */}
      <div className="absolute top-1 left-2 text-xs font-source-sans font-medium text-white/90">
        {trackTitle}
      </div>
    </div>
  );
}