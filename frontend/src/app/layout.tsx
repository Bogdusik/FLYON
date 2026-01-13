import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import DroneBackground from '@/components/DroneBackground';
import ErrorBoundaryWrapper from '@/components/ErrorBoundaryWrapper';
import ToastContainer from '@/components/Toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FLYON - Drone Flight Analytics',
  description: 'Personal web platform for drone and FPV drone owners',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className={inter.className}>
        <ErrorBoundaryWrapper>
          <DroneBackground />
          <div className="relative z-10">
            {children}
          </div>
          <ToastContainer />
        </ErrorBoundaryWrapper>
      </body>
    </html>
  );
}
