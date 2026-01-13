'use client';

import { useState, memo } from 'react';

interface VideoFeedPanelProps {
  isRecording: boolean;
  recordingTime: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

function VideoFeedPanel({ 
  isRecording, 
  recordingTime, 
  onStartRecording, 
  onStopRecording 
}: VideoFeedPanelProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showZoomControls, setShowZoomControls] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const zoomLevels = [112, 56, 14, 7, 3, 1];

  return (
    <div className="w-full h-full relative bg-[#0a0a0a] flex flex-col">
      {/* Video Feed Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Placeholder for actual video feed */}
        <div className="w-full h-full bg-[#0a0a0a] flex items-center justify-center">
          <div className="text-center text-white/50">
            <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Live Video Feed</p>
            <p className="text-xs mt-1.5">Video stream will appear here when connected</p>
          </div>
        </div>

        {/* Zoom Indicator Top Left - Compact */}
        <div className="absolute top-3 left-3 z-20 pointer-events-auto">
          <button 
            className="btn-dji btn-dji-sm text-[10px] cursor-default" 
            style={{ background: 'rgba(10, 10, 10, 0.95)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
            title="Current zoom level"
          >
            WIDE {zoomLevel}X
          </button>
        </div>

        {/* Recording Button and Timer Top Right - Compact */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2 pointer-events-auto">
          {isRecording && (
            <div className="flex items-center gap-1.5 bg-red-500/20 px-2 py-1 rounded-md border border-red-500/30">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-white text-xs font-mono">{formatTime(recordingTime)}</span>
            </div>
          )}
          <button
            onClick={isRecording ? onStopRecording : onStartRecording}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border ${
              isRecording 
                ? 'bg-red-500/20 hover:bg-red-500/30 border-red-500/30 animate-pulse' 
                : 'bg-white/10 hover:bg-white/15 border-white/20'
            }`}
          >
            <div className={`w-5 h-5 rounded ${isRecording ? 'bg-white' : 'bg-red-500'}`}></div>
          </button>
        </div>

        {/* Zoom Controls Right Side - Compact */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 pointer-events-auto">
          {zoomLevels.map((level) => (
            <button
              key={level}
              onClick={() => setZoomLevel(level)}
              className={`w-9 h-8 rounded-md text-white text-[10px] font-medium transition-all cursor-pointer ${
                zoomLevel === level
                  ? 'bg-white/15 border border-white/20'
                  : 'bg-[#0a0a0a]/95 backdrop-blur-sm hover:bg-white/10 border border-white/10'
              }`}
              title={`Zoom ${level}X`}
            >
              {level}X
            </button>
          ))}
          
          {/* Chat/Message Icon - Compact */}
          <button 
            onClick={() => alert('Chat functionality coming soon')}
            className="btn-dji btn-dji-sm mt-2 cursor-pointer hover:bg-white/10 transition-colors" 
            style={{ background: 'rgba(10, 10, 10, 0.95)', backdropFilter: 'blur(8px)', width: '36px', height: '36px', border: '1px solid rgba(255, 255, 255, 0.1)' }}
            title="Open chat"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        </div>

        {/* Zoom Slider Bottom Left - Compact */}
        <div className="absolute bottom-3 left-3 z-20 bg-[#0a0a0a]/95 backdrop-blur-sm rounded-md p-2 min-w-[160px] border border-white/10 pointer-events-auto">
          <label className="text-white text-xs mb-1.5 block">Zoom</label>
          <input
            type="range"
            min="1"
            max="112"
            value={zoomLevel}
            onChange={(e) => setZoomLevel(parseInt(e.target.value))}
            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white/40"
            title={`Zoom level: ${zoomLevel}X`}
          />
          <div className="flex justify-between text-white/50 text-[10px] mt-1">
            <span>1X</span>
            <span>112X</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(VideoFeedPanel);
