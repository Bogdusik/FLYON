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
          <div className="glass-strong rounded-lg p-6 max-w-lg mx-auto border border-white/10">
            <FadeIn delay={droneComplete ? 100 : 4600}>
              <h1 className="text-3xl font-medium text-white mb-2">
                FLYON
              </h1>
            </FadeIn>
            <FadeIn delay={droneComplete ? 200 : 4700}>
              <p className="text-xs text-white/60 mb-4">
                Personal web platform for drone and FPV drone owners
              </p>
            </FadeIn>
            <FadeIn delay={droneComplete ? 300 : 4800}>
              <div className="flex gap-3 justify-center">
                <Link
                  href="/login"
                  className="btn-dji btn-dji-sm"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="btn-dji btn-dji-sm opacity-70"
                >
                  Register
                </Link>
              </div>
            </FadeIn>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
