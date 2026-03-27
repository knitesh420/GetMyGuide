// components/ui/CircularProgress.tsx
"use client";

import React from 'react';

// Define the properties the component accepts
interface CircularProgressProps {
  progress: number; // A number between 0 and 100
  size?: number; // The width and height of the circle
  strokeWidth?: number; // The thickness of the circle's line
}

export const CircularProgress: React.FC<CircularProgressProps> = ({ 
  progress, 
  size = 60, 
  strokeWidth = 6 
}) => {
  // Calculate the radius and circumference of the circle
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate the stroke offset to create the progress effect
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Background Circle (the track) */}
        <circle
          className="text-muted/20"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress Circle (the colored arc) */}
        <circle
          className="text-primary"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transition: 'stroke-dashoffset 0.5s ease-in-out', // Smooth animation
          }}
        />
      </svg>
      {/* Percentage Text in the Center */}
      <span
        className="absolute text-sm font-bold text-foreground"
        style={{ fontSize: `${Math.max(12, size / 4.5)}px` }} // Dynamic font size
      >
        {`${Math.round(progress)}%`}
      </span>
    </div>
  );
};