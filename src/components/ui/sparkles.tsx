// src/components/ui/sparkles.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";

interface SparklesCoreProps {
  id?: string;
  background?: string;
  minSize?: number;
  maxSize?: number;
  particleDensity?: number;
  className?: string;
  particleColor?: string;
}

interface Sparkle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
}

export const SparklesCore: React.FC<SparklesCoreProps> = ({
  id = "sparkles",
  background = "transparent",
  minSize = 0.5,
  maxSize = 1.5,
  particleDensity = 80,
  className = "",
  particleColor = "var(--accent)",
}) => {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 1000 });

  // Generate sparkles with memoization
  const generateSparkles = useMemo(() => {
    return (width: number, height: number) => {
      const density = Math.min(particleDensity, 200); // Cap density for performance
      const newSparkles: Sparkle[] = [];
      
      for (let i = 0; i < density; i++) {
        newSparkles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * (maxSize - minSize) + minSize,
          opacity: Math.random() * 0.3 + 0.1,
          speed: Math.random() * 0.5 + 0.5,
        });
      }
      return newSparkles;
    };
  }, [minSize, maxSize, particleDensity]);

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    // Initial sparkles generation
    const initialSparkles = generateSparkles(window.innerWidth, window.innerHeight);
    setSparkles(initialSparkles);

    return () => window.removeEventListener("resize", updateDimensions);
  }, [generateSparkles]);

  // Animation effect
  useEffect(() => {
    if (sparkles.length === 0) return;

    let animationFrameId: number;
    let lastTime = 0;
    const speedFactor = 0.05;

    const animate = (currentTime: number) => {
      if (!lastTime) lastTime = currentTime;
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      setSparkles(prev => prev.map(sparkle => {
        let newY = sparkle.y + sparkle.speed * speedFactor * deltaTime;
        
        // Reset if sparkle goes off screen
        if (newY > dimensions.height) {
          newY = -20;
        }
        
        return {
          ...sparkle,
          y: newY,
          opacity: 0.1 + 0.2 * Math.sin(currentTime * 0.001 + sparkle.x) // Gentle pulse
        };
      }));

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [sparkles.length, dimensions.height]);

  // Regenerate sparkles on dimension change
  useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0) {
      const newSparkles = generateSparkles(dimensions.width, dimensions.height);
      setSparkles(newSparkles);
    }
  }, [dimensions, generateSparkles]);

  return (
    <div
      className={`absolute inset-0 -z-10 ${className}`}
      style={{ background }}
      aria-hidden="true"
    >
      {sparkles.map((sparkle, index) => (
        <div
          key={`${id}-${index}`}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${sparkle.x}px`,
            top: `${sparkle.y}px`,
            width: `${sparkle.size}px`,
            height: `${sparkle.size}px`,
            backgroundColor: particleColor,
            opacity: sparkle.opacity,
            filter: `blur(${sparkle.size * 0.5}px)`,
            transition: "opacity 0.3s ease",
            willChange: "transform, opacity",
          }}
        />
      ))}
    </div>
  );
};