'use client';

import React, { useState, useRef, useEffect } from 'react';
import { flightsAPI, dronesAPI } from '@/lib/api';
import { Drone } from '@/types';

interface LogUploadProps {
  onUploadComplete?: () => void;
}

export default function LogUpload({ onUploadComplete }: LogUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [droneId, setDroneId] = useState<string>('');
  const [drones, setDrones] = useState<Drone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDrones = async () => {
    try {
      const response = await dronesAPI.getAll();
      setDrones(response.data);
      if (response.data.length > 0 && !droneId) {
        setDroneId(response.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load drones:', err);
    }
  };

  useEffect(() => {
    loadDrones();
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    const allowedTypes = ['text/csv', 'application/json', 'text/plain'];
    const allowedExtensions = ['.csv', '.json', '.txt', '.log'];
    const ext = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));

    if (!allowedTypes.includes(selectedFile.type) && !allowedExtensions.includes(ext)) {
      setError('Unsupported file type. Please upload CSV, JSON, or TXT files.');
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB.');
      return;
    }

    setFile(selectedFile);
    setError('');
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !droneId) {
      const { toast } = await import('@/components/Toast');
      toast.error('Please select a file and drone.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await flightsAPI.uploadLog(file, droneId);
      const { toast } = await import('@/components/Toast');
      toast.success(`Successfully uploaded ${response.data.points_ingested} telemetry points!`);
      setSuccess(`Successfully uploaded ${response.data.points_ingested} telemetry points!`);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (err: any) {
      const { toast } = await import('@/components/Toast');
      toast.error(err.response?.data?.error || 'Failed to upload log file.');
      setError(err.response?.data?.error || 'Failed to upload log file.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-lg p-4 border border-white/10">

      {error && (
        <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-md text-xs">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-3 p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md text-xs">
          {success}
        </div>
      )}

      <div className="space-y-3">
        <div className="relative">
          <label className="block text-xs font-medium text-white/80 mb-1.5">
            Select Drone
          </label>
          <select
            value={droneId}
            onChange={(e) => setDroneId(e.target.value)}
            className="input-dji w-full pr-10 appearance-none cursor-pointer"
          >
            <option value="" style={{ backgroundColor: '#0a0a0a' }}>Select a drone...</option>
            {drones.map((drone) => (
              <option key={drone.id} value={drone.id} style={{ backgroundColor: '#0a0a0a' }}>
                {drone.name} {drone.model ? `(${drone.model})` : ''}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-7 pointer-events-none">
            <svg className="w-3.5 h-3.5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <div
          className={`border-2 border-dashed rounded-md p-6 text-center transition-smooth ${
            dragActive
              ? 'border-white/30 bg-white/5'
              : 'border-white/10 hover:border-white/20 bg-white/5'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.txt,.log"
            onChange={handleFileInput}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center"
          >
            <svg
              className="w-10 h-10 text-white/60 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-white/70 mb-1.5 text-xs">
              Drag and drop your flight log here, or{' '}
              <span className="text-white/90 hover:text-white underline cursor-pointer">browse</span>
            </p>
            <p className="text-xs text-white/50">
              Supports CSV, JSON, TXT files (max 50MB)
            </p>
          </label>
        </div>

        {file && (
          <div className="bg-white/5 border border-white/10 rounded-md p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg
                className="w-6 h-6 text-white/60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <div>
                <p className="text-white text-sm font-medium">{file.name}</p>
                <p className="text-xs text-white/50">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              className="text-white/50 hover:text-white/80 transition-smooth"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || !droneId || loading}
          className="btn-dji w-full"
        >
          {loading ? 'Uploading...' : 'Upload Log'}
        </button>
      </div>
    </div>
  );
}
