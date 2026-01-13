'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export default function Skeleton({ 
  className = '', 
  variant = 'rectangular',
  width,
  height,
  lines = 1 
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-white/5 rounded';
  
  const variantClasses = {
    text: 'h-4',
    circular: 'rounded-full',
    rectangular: 'rounded',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  if (variant === 'text' && lines > 1) {
    return (
      <div className={className}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${variantClasses.text} mb-2 ${
              i === lines - 1 ? 'w-3/4' : 'w-full'
            }`}
            style={i === lines - 1 ? { ...style, width: '75%' } : style}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

// Pre-built skeleton components
export function SkeletonCard() {
  return (
    <div className="glass-card rounded-lg p-3 sm:p-4">
      <Skeleton variant="text" width="60%" height={20} className="mb-3" />
      <Skeleton variant="text" width="100%" height={16} className="mb-2" />
      <Skeleton variant="text" width="80%" height={16} />
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="glass-card rounded-lg overflow-hidden">
      <div className="p-3 sm:p-4">
        <Skeleton variant="text" width="40%" height={20} className="mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton variant="rectangular" width="30%" height={16} />
              <Skeleton variant="rectangular" width="25%" height={16} />
              <Skeleton variant="rectangular" width="20%" height={16} />
              <Skeleton variant="rectangular" width="25%" height={16} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass-card rounded-lg p-3 sm:p-4">
          <Skeleton variant="text" width="50%" height={14} className="mb-2" />
          <Skeleton variant="text" width="80%" height={24} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
