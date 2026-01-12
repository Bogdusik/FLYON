'use client';

import { useState, useEffect } from 'react';

interface Particle {
  left: number;
  top: number;
  animationDelay: number;
  animationDuration: number;
}

export default function DroneBackground() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // Generate particles only on client side to avoid SSR mismatch
    const generatedParticles: Particle[] = Array.from({ length: 15 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      animationDelay: Math.random() * 5,
      animationDuration: 15 + Math.random() * 15,
    }));
    setParticles(generatedParticles);
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Dark modern gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-950"></div>
      
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-indigo-600/20 animate-gradient-shift"></div>
      
      {/* Animated orbs/glows - more subtle and modern */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] animate-float-slow"></div>
      <div className="absolute top-40 right-20 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] animate-float"></div>
      <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] animate-float-slow"></div>
      <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-cyan-500/10 rounded-full blur-[90px] animate-float"></div>
      
      {/* Radial gradient overlay for depth */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-black/20"></div>
      
      {/* Drone flight path visualization - more subtle */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.15]" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        {/* Multiple flight paths */}
        <path
          d="M 100 400 Q 300 200, 500 300 T 900 400"
          stroke="rgba(147,197,253,0.4)"
          strokeWidth="1.5"
          fill="none"
          className="animate-draw-path"
        />
        <path
          d="M 200 600 Q 400 400, 600 500 T 1000 600"
          stroke="rgba(165,180,252,0.3)"
          strokeWidth="1.5"
          fill="none"
          className="animate-draw-path-delayed"
        />
        <path
          d="M 50 300 Q 250 100, 450 200 T 850 300"
          stroke="rgba(196,181,253,0.25)"
          strokeWidth="1.5"
          fill="none"
          className="animate-draw-path"
          style={{ animationDelay: '1s' }}
        />
        
        {/* Drone position indicators - more subtle */}
        <circle cx="300" cy="250" r="4" fill="rgba(147,197,253,0.6)" className="animate-pulse" />
        <circle cx="700" cy="350" r="4" fill="rgba(165,180,252,0.5)" className="animate-pulse" style={{ animationDelay: '1s' }} />
        <circle cx="500" cy="450" r="4" fill="rgba(196,181,253,0.4)" className="animate-pulse" style={{ animationDelay: '2s' }} />
        <circle cx="850" cy="280" r="4" fill="rgba(147,197,253,0.5)" className="animate-pulse" style={{ animationDelay: '0.5s' }} />
      </svg>
      
      {/* Floating particles - more subtle */}
      {particles.length > 0 && (
        <div className="absolute inset-0">
          {particles.map((particle, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 bg-white/20 rounded-full animate-float-particles"
              style={{
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                animationDelay: `${particle.animationDelay}s`,
                animationDuration: `${particle.animationDuration}s`,
              }}
            />
          ))}
        </div>
      )}
      
      {/* Noise texture for depth */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
