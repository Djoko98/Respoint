import React, { useState, useEffect, useRef } from 'react';
import { saveToStorage, loadFromStorage } from '../../utils/storage';

const ZOOM_STORAGE_KEY = 'app-zoom-level';
const MIN_ZOOM = 50;
const MAX_ZOOM = 125;
const ZOOM_STEP = 5;

const ZoomControl: React.FC = () => {
  const [zoom, setZoom] = useState(100);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load zoom from localStorage on mount
  useEffect(() => {
    const savedZoom = loadFromStorage(ZOOM_STORAGE_KEY, 100);
    setZoom(savedZoom);
    applyZoom(savedZoom);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const applyZoom = (zoomLevel: number) => {
    document.body.style.zoom = `${zoomLevel}%`;
  };

  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    setZoom(clampedZoom);
    applyZoom(clampedZoom);
    saveToStorage(ZOOM_STORAGE_KEY, clampedZoom);
  };

  const handleZoomIn = () => {
    handleZoomChange(zoom + ZOOM_STEP);
  };

  const handleZoomOut = () => {
    handleZoomChange(zoom - ZOOM_STEP);
  };

  const resetZoom = () => {
    handleZoomChange(100);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Zoom Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-10 flex items-center justify-center hover:bg-gray-800 transition-colors"
        title={`Zoom: ${zoom}%`}
      >
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          className="text-gray-400"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
          <line x1="8" y1="11" x2="14" y2="11"></line>
          <line x1="11" y1="8" x2="11" y2="14"></line>
        </svg>
      </button>

      {/* Zoom Dropdown */}
      {isOpen && (
        <div 
          className="absolute top-full right-0 mt-1 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden"
          style={{ minWidth: '160px' }}
        >
          {/* Zoom Controls */}
          <div className="flex items-center justify-between p-2">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= MIN_ZOOM}
              className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 rounded text-white transition-colors"
              title="Zoom Out"
            >
              −
            </button>
            
            <button
              onClick={resetZoom}
              className="px-3 py-1 text-white hover:bg-gray-800 rounded transition-colors text-sm font-medium"
              title="Reset to 100%"
            >
              {zoom}%
            </button>
            
            <button
              onClick={handleZoomIn}
              disabled={zoom >= MAX_ZOOM}
              className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 rounded text-white transition-colors"
              title="Zoom In"
            >
              +
            </button>
          </div>
          
          {/* Zoom Range Indicator */}
          <div className="px-2 pb-2">
            <div className="text-xs text-gray-500 text-center">
              {MIN_ZOOM}% - {MAX_ZOOM}%
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1 mt-1">
              <div 
                className="bg-blue-500 h-1 rounded-full transition-all duration-200"
                style={{ 
                  width: `${((zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100}%` 
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZoomControl; 