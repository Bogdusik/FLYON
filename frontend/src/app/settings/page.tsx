'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import Navbar from '@/components/Navbar';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExportData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/export/data`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flyon-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone and will delete all your data.')) {
      return;
    }

    if (!confirm('This will permanently delete all your flights, drones, and data. Are you absolutely sure?')) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      await authAPI.deleteMe();
      localStorage.removeItem('token');
      router.push('/login');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete account');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-4xl font-bold text-white mb-8">Settings</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg">
            {error}
          </div>
        )}

        <div className="glass-card rounded-xl p-6 mb-6 hover-lift">
          <h2 className="text-xl font-semibold mb-4 text-white">Data Export</h2>
          <p className="text-white/70 mb-4">
            Download all your data in JSON format (GDPR compliant).
          </p>
          <button
            onClick={handleExportData}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            {loading ? 'Exporting...' : 'Export All Data'}
          </button>
        </div>

        <div className="glass-card rounded-xl p-6 border-red-500/30">
          <h2 className="text-xl font-semibold mb-4 text-red-400">Danger Zone</h2>
          <p className="text-white/70 mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button
            onClick={handleDeleteAccount}
            disabled={loading}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            {loading ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </main>
    </div>
  );
}
