'use client';

import { useEffect, useState, useRef } from 'react';

interface AnimatedDroneProps {
  onComplete?: () => void;
  variant?: 'welcome' | 'scanning' | 'flying-away';
}

export default function AnimatedDrone({ onComplete, variant = 'welcome' }: AnimatedDroneProps) {
  const [stage, setStage] = useState<'entering' | 'scanning' | 'leaving'>('entering');
  const [position, setPosition] = useState({ x: -100, y: 50 });
  const [mounted, setMounted] = useState(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    // Ensure component is mounted before starting animation
    setMounted(true);
    
    // Clear any existing timeouts
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    
    // Start animation immediately - no delay needed
    // Stage 1: Drone flies in from left
    const enterTimeout = setTimeout(() => {
      setPosition({ x: 50, y: 50 });
      setStage('scanning');
    }, 500);
    timeoutsRef.current.push(enterTimeout);

    // Stage 2: Scanning animation (already set in stage 1, but keep for consistency)
    const scanTimeout = setTimeout(() => {
      if (variant === 'scanning' || variant === 'welcome') {
        setStage('scanning');
      }
    }, 2000);
    timeoutsRef.current.push(scanTimeout);

    // Stage 3: Drone flies away
    const leaveTimeout = setTimeout(() => {
      setStage('leaving');
      setPosition({ x: 150, y: -50 });
      if (onComplete) {
        const completeTimeout = setTimeout(onComplete, 1000);
        timeoutsRef.current.push(completeTimeout);
      }
    }, variant === 'welcome' ? 4000 : 5000);
    timeoutsRef.current.push(leaveTimeout);

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, [variant, onComplete]);

  return (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
        transition: 'all 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'transform',
        opacity: mounted ? 1 : 0,
        visibility: mounted ? 'visible' : 'hidden',
      }}
    >
      {/* Drone body */}
      <div className="relative">
        {/* Main body - увеличен для лучшей видимости */}
        <div
          className={`w-20 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-2xl ${
            stage === 'scanning' ? 'animate-pulse' : ''
          }`}
          style={{
            boxShadow: '0 0 40px rgba(59, 130, 246, 0.8), 0 0 80px rgba(139, 92, 246, 0.4)',
            transform: stage === 'scanning' ? 'scale(1.15)' : 'scale(1)',
            transition: 'transform 0.3s ease',
          }}
        >
          {/* Drone propellers - увеличены для видимости */}
          <div className="absolute -top-3 -left-3 w-5 h-5 border-2 border-blue-300 rounded-full animate-spin" style={{ animationDuration: '0.1s', boxShadow: '0 0 10px rgba(147, 197, 253, 0.8)' }} />
          <div className="absolute -top-3 -right-3 w-5 h-5 border-2 border-blue-300 rounded-full animate-spin" style={{ animationDuration: '0.1s', boxShadow: '0 0 10px rgba(147, 197, 253, 0.8)' }} />
          <div className="absolute -bottom-3 -left-3 w-5 h-5 border-2 border-blue-300 rounded-full animate-spin" style={{ animationDuration: '0.1s', boxShadow: '0 0 10px rgba(147, 197, 253, 0.8)' }} />
          <div className="absolute -bottom-3 -right-3 w-5 h-5 border-2 border-blue-300 rounded-full animate-spin" style={{ animationDuration: '0.1s', boxShadow: '0 0 10px rgba(147, 197, 253, 0.8)' }} />
          
          {/* Camera/Scanner */}
          {stage === 'scanning' && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-2 border-red-500/50 rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
            </div>
          )}
        </div>

        {/* Glow effect - усилен для видимости */}
        <div
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-400 rounded-full blur-2xl opacity-70 ${
            stage === 'scanning' ? 'animate-pulse' : ''
          }`}
        />

        {/* Flight trail */}
        {stage === 'leaving' && (
          <div className="absolute top-1/2 right-full mr-4 w-32 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-50" />
        )}
      </div>
    </div>
  );
}
