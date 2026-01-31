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
      // CWE-79: only use our own blob URL (not user/remote HTML) for download link
      if (!url.startsWith('blob:')) {
        window.URL.revokeObjectURL(url);
        throw new Error('Invalid export URL');
      }
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `flyon-export-${Date.now()}.json`);
      a.setAttribute('rel', 'noopener noreferrer');
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
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

      <main className="container mx-auto px-4 py-4 max-w-2xl">
        <h1 className="text-xl font-medium text-white mb-4">Settings</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="glass-card rounded-lg p-3 mb-4 border border-white/10">
          <h2 className="text-base font-medium mb-3 text-white">Data Export</h2>
          <p className="text-white/70 text-sm mb-3">
            Download all your data in JSON format (GDPR compliant).
          </p>
          <button
            onClick={handleExportData}
            disabled={loading}
            className="btn-dji btn-dji-sm"
          >
            {loading ? 'Exporting...' : 'Export Data'}
          </button>
        </div>

        <div className="glass-card rounded-lg p-3 border border-red-500/20">
          <h2 className="text-sm font-medium mb-2 text-red-400">Danger Zone</h2>
          <p className="text-white/60 text-xs mb-3">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button
            onClick={handleDeleteAccount}
            disabled={loading}
            className="btn-dji btn-dji-sm"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              borderColor: 'rgba(239, 68, 68, 0.2)',
              color: 'rgba(239, 68, 68, 0.9)',
            }}
          >
            {loading ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </main>
    </div>
  );
}
