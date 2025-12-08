"use client";
import { useEffect, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useMotionTemplate,
} from "framer-motion";

interface TrailPoint {
  x: number;
  y: number;
  id: number;
}

interface CursorMaskProps {
  isVisible?: boolean;
}

export default function CursorMask({ isVisible = true }: CursorMaskProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [trail, setTrail] = useState<TrailPoint[]>([]);

  const springX = useSpring(mouseX, {
    stiffness: 500,
    damping: 40,
  });

  const springY = useSpring(mouseY, {
    stiffness: 500,
    damping: 40,
  });

  const maskImage = useMotionTemplate`radial-gradient(circle 100px at ${springX}px ${springY}px, black 30%, transparent 70%)`;

  useEffect(() => {
    if (!isVisible) return;

    let lastTime = Date.now();

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);

      const now = Date.now();
      if (now - lastTime > 10) {
        setTrail((prev) => [
          ...prev.slice(-20),
          { x: e.clientX, y: e.clientY, id: now }
        ]);
        lastTime = now;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isVisible, mouseX, mouseY]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none isolate" style={{ zIndex: 1 }}>
      <div className="absolute inset-0 background" />

      {/* Trail elements */}
      {trail.map((point, index) => {
        const opacity = (index / trail.length) * 0.08;
        const size = 90 + (index / trail.length) * 10;
        
        return (
          <motion.div
            key={point.id}
            className="absolute inset-0 bg-[#9FCA53]"
            initial={{ opacity: 0 }}
            animate={{ opacity }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              WebkitMaskImage: `radial-gradient(circle ${size}px at ${point.x}px ${point.y}px, black 30%, transparent 70%)`,
              maskImage: `radial-gradient(circle ${size}px at ${point.x}px ${point.y}px, black 30%, transparent 70%)`,
            }}
          />
        );
      })}

      {/* Main cursor glow */}
      <motion.div
        className="absolute inset-0 bg-[#9FCA53] opacity-15"
        style={{
          WebkitMaskImage: maskImage,
          maskImage: maskImage,
        }}
      />
    </div>
  );
}