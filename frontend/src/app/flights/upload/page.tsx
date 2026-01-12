'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LogUpload from '@/components/LogUpload';

export default function UploadLogPage() {
  const router = useRouter();

  const handleUploadComplete = () => {
    // Redirect to flights page after successful upload
    setTimeout(() => {
      router.push('/flights');
    }, 2000);
  };

  return (
    <div className="min-h-screen">
      <nav className="glass-strong sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/dashboard" className="text-2xl font-bold gradient-text">FLYON</Link>
            <div className="flex gap-6">
              <Link href="/dashboard" className="text-white/90 hover:text-white transition-smooth relative group">
                Dashboard
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-400 transition-all group-hover:w-full"></span>
              </Link>
              <Link href="/drones" className="text-white/90 hover:text-white transition-smooth relative group">
                Drones
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-400 transition-all group-hover:w-full"></span>
              </Link>
              <Link href="/flights" className="text-white/90 hover:text-white transition-smooth relative group">
                Flights
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-400 transition-all group-hover:w-full"></span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <Link href="/flights" className="text-blue-400 hover:text-blue-300 transition-smooth mb-2 inline-block">
            ← Back to Flights
          </Link>
          <h1 className="text-4xl font-bold text-white">Upload Flight Log</h1>
          <p className="text-white/70 mt-2">
            Upload your flight log file (CSV, JSON, or TXT) to analyze your flight data.
          </p>
        </div>

        <LogUpload onUploadComplete={handleUploadComplete} />
      </main>
    </div>
  );
}
