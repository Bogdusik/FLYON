'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
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
      <Navbar />
      <main className="container mx-auto px-6 py-4 max-w-2xl">
        <div className="mb-4">
          <Link href="/flights" className="text-white/60 hover:text-white/80 transition-smooth mb-1.5 inline-block text-xs">
            ← Back to Flights
          </Link>
          <h1 className="text-xl font-medium text-white mb-1">Upload Flight Log</h1>
          <p className="text-white/50 text-xs">
            Upload your flight log file (CSV, JSON, or TXT) to analyze your flight data.
          </p>
        </div>

        <LogUpload onUploadComplete={handleUploadComplete} />
      </main>
    </div>
  );
}
