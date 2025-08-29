import React, { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import logoImage from '../../assets/logo.png';
import ZoomControl from './ZoomControl';
import './TitleBar.css';

const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    
    // Check initial maximized state
    const checkMaximized = async () => {
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    };
    checkMaximized();

    // Listen for resize events
    const setupListener = async () => {
      const unlisten = await appWindow.onResized(async () => {
        const isMax = await appWindow.isMaximized();
        setIsMaximized(isMax);
      });
      
      return () => {
        unlisten();
      };
    };
    
    setupListener();
  }, []);

  const handleMinimize = async () => {
    const window = getCurrentWindow();
    await window.minimize();
  };

  const handleMaximize = async () => {
    const window = getCurrentWindow();
    await window.toggleMaximize();
  };

  const handleClose = async () => {
    const window = getCurrentWindow();
    await window.close();
  };

  return (
    <div 
      className="custom-titlebar h-10 bg-[#000814] flex items-center justify-between select-none border-b border-gray-800 flex-shrink-0"
    >
      {/* Left side - Logo and Title - this area is draggable */}
      <div 
        data-tauri-drag-region
        className="flex items-center gap-3 px-4 flex-1"
      >
        <img 
          src={logoImage} 
          alt="ResPoint" 
          className="w-6 h-6 object-contain"
        />
        <div className="title text-white text-sm font-medium tracking-wide">
          ResPoint
        </div>
      </div>

      {/* Right side - Window Controls - not draggable */}
      <div className="titlebar-buttons flex items-center">
        {/* Zoom Control */}
        <ZoomControl />
        
        {/* Minimize */}
        <button
          onClick={handleMinimize}
          className="w-12 h-10 flex items-center justify-center hover:bg-gray-800 transition-colors"
          title="Minimize"
        >
          <span className="text-gray-400 text-lg">—</span>
        </button>

        {/* Maximize/Restore */}
        <button
          onClick={handleMaximize}
          className="w-12 h-10 flex items-center justify-center hover:bg-gray-800 transition-colors"
          title={isMaximized ? "Restore" : "Maximize"}
        >
          <span className="text-gray-400 text-sm">🗖</span>
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          className="w-12 h-10 flex items-center justify-center hover:bg-red-600 transition-colors"
          title="Close"
        >
          <span className="text-gray-400 hover:text-white text-lg">✕</span>
        </button>
      </div>
    </div>
  );
};

export default TitleBar; 