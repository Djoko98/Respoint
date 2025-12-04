import React, { useState, useEffect, useRef } from 'react';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import logoImage from '../../assets/Logo.png';
import './TitleBar.css';

const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

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

  // Ensure the window cannot be resized narrower than what keeps all title bar controls visible
  useEffect(() => {
    const applyMinWindowWidth = async () => {
      try {
        const left = leftRef.current?.offsetWidth ?? 0;
        const right = rightRef.current?.offsetWidth ?? 0;
        // Padding on container (px-4 on left + gaps on right buttons)
        const SAFE_PADDING = 24; // extra cushion
        const minWidthPx = Math.ceil(left + right + SAFE_PADDING);
        const appWindow = getCurrentWindow();
        // Try both Tauri 1.x (LogicalSize) and 2.x (plain object) signatures safely
        try {
          await (appWindow as any).setMinSize(new (LogicalSize as any)(minWidthPx, 500));
        } catch {
          await (appWindow as any).setMinSize({ width: minWidthPx, height: 500 });
        }
      } catch {
        // no-op in web/dev environments
      }
    };
    // Run once after mount and on next frame to ensure DOM measured
    applyMinWindowWidth();
    const id = requestAnimationFrame(applyMinWindowWidth);
    const onResize = () => applyMinWindowWidth();
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', onResize);
    };
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
      className="custom-titlebar h-7 bg-[#000814] flex items-center justify-between select-none border-b border-gray-800 flex-shrink-0 relative z-[10000] sticky top-0"
    >
      {/* Left side - Logo and Title - this area is draggable */}
      <div 
        data-tauri-drag-region
        className="flex items-center gap-3 px-4 flex-1 min-w-0"
        ref={leftRef}
      >
        <img 
          src={logoImage} 
          alt="ResPoint" 
          className="w-5 h-5 object-contain"
        />
        <div className="title text-white text-sm font-medium tracking-wide truncate">
          ResPoint
        </div>
      </div>

      {/* Right side - Window Controls - not draggable */}
      <div className="titlebar-buttons flex items-center flex-shrink-0" ref={rightRef}>
        
        {/* Minimize */}
        <button
          onClick={handleMinimize}
          className="w-10 h-7 flex items-center justify-center hover:bg-gray-800 transition-colors"
          title="Minimize"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-400">
            <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>

        {/* Maximize/Restore */}
        <button
          onClick={handleMaximize}
          className="w-10 h-7 flex items-center justify-center hover:bg-gray-800 transition-colors"
          title={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            // Restore (custom icon)
            <svg width="10" height="10" viewBox="0 0 70 70" fill="none" className="text-gray-400">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M44.9292 13.3654C50.452 13.3654 54.9292 17.8426 54.9292 23.3654V57.446C54.9292 62.9688 50.452 67.446 44.9292 67.446H12.5601C7.03721 67.446 2.56006 62.9688 2.56006 57.446V23.3654C2.56006 17.8426 7.03721 13.3654 12.5601 13.3654H44.9292Z"
                stroke="currentColor"
                strokeWidth="5.12"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M23.5601 2.56006H51.5601C59.8443 2.56006 66.5601 9.27579 66.5601 17.5601V47.5601"
                stroke="currentColor"
                strokeWidth="5.12"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            // Maximize (single square)
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-400">
              <rect x="5" y="5" width="14" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          )}
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          className="w-10 h-7 flex items-center justify-center hover:bg-red-600 transition-colors group titlebar-close"
          title="Close"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-400 group-hover:text-white transition-colors">
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TitleBar; 