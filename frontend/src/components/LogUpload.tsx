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
      setError('Please select a file and drone.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await flightsAPI.uploadLog(file, droneId);
      setSuccess(`Successfully uploaded ${response.data.points_ingested} telemetry points!`);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload log file.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-xl p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Upload Flight Log</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-lg">
          {success}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Select Drone
          </label>
          <select
            value={droneId}
            onChange={(e) => setDroneId(e.target.value)}
            className="w-full px-4 py-2 glass rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-smooth"
          >
            <option value="">Select a drone...</option>
            {drones.map((drone) => (
              <option key={drone.id} value={drone.id}>
                {drone.name} {drone.model ? `(${drone.model})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-smooth ${
            dragActive
              ? 'border-blue-400 bg-blue-500/10'
              : 'border-white/20 hover:border-white/40'
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
              className="w-12 h-12 text-white/60 mb-4"
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
            <p className="text-white/80 mb-2">
              Drag and drop your flight log here, or{' '}
              <span className="text-blue-400 hover:text-blue-300">browse</span>
            </p>
            <p className="text-sm text-white/60">
              Supports CSV, JSON, TXT files (max 50MB)
            </p>
          </label>
        </div>

        {file && (
          <div className="glass rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg
                className="w-8 h-8 text-blue-400"
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
                <p className="text-white font-medium">{file.name}</p>
                <p className="text-sm text-white/60">
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
              className="text-white/60 hover:text-white transition-smooth"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || !droneId || loading}
          className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          {loading ? 'Uploading...' : 'Upload Log'}
        </button>
      </div>
    </div>
  );
}
