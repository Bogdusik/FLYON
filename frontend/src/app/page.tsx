'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AnimatedDrone from '@/components/AnimatedDrone';
import FadeIn from '@/components/FadeIn';

export default function Home() {
  // Initialize state based on sessionStorage immediately (client-side only)
  const [showDrone, setShowDrone] = useState(() => {
    // Only check sessionStorage on client side
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('flyon-drone-seen');
    }
    return true; // Default to showing on server
  });
  const [droneComplete, setDroneComplete] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!sessionStorage.getItem('flyon-drone-seen');
    }
    return false;
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Mark component as mounted (client-side only)
    setMounted(true);
  }, []);

  const handleDroneComplete = () => {
    setShowDrone(false);
    setDroneComplete(true);
    sessionStorage.setItem('flyon-drone-seen', 'true');
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {showDrone && (
        <div className="fixed inset-0 z-[9998] pointer-events-none">
          <AnimatedDrone variant="welcome" onComplete={handleDroneComplete} />
        </div>
      )}
      
      <div className="container mx-auto px-4 py-16 text-center">
        <FadeIn delay={droneComplete ? 0 : 4500} duration={800}>
          <div className="glass-strong rounded-2xl p-12 max-w-2xl mx-auto hover-lift">
            <FadeIn delay={droneComplete ? 100 : 4600}>
              <h1 className="text-7xl font-bold gradient-text mb-4 animate-glow">
                FLYON
              </h1>
            </FadeIn>
            <FadeIn delay={droneComplete ? 200 : 4700}>
              <p className="text-xl text-white/80 mb-8">
                Personal web platform for drone and FPV drone owners
              </p>
            </FadeIn>
            <FadeIn delay={droneComplete ? 300 : 4800}>
              <div className="flex gap-4 justify-center">
                <Link
                  href="/login"
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 relative overflow-hidden group"
                >
                  <span className="relative z-10">Login</span>
                  <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
                </Link>
                <Link
                  href="/register"
                  className="px-8 py-3 glass text-white border-2 border-white/30 rounded-lg hover:bg-white/10 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 relative overflow-hidden group"
                >
                  <span className="relative z-10">Register</span>
                  <span className="absolute inset-0 bg-white/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
                </Link>
              </div>
            </FadeIn>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
