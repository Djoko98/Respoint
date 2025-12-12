import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logoImage from '../../assets/Logo.png';

interface LoadingScreenProps {
  isTestingNetwork?: boolean;
  networkError?: string | null;
  onRetry?: () => void;
  onReset?: () => void;
  variant?: 'rings' | 'dots' | 'logo' | 'image' | 'split-logo' | 'rail-bounce';
  animationSpeed?: 'gentle' | 'smooth' | 'quick';
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isTestingNetwork = false,
  networkError = null,
  onRetry,
  onReset,
  variant = 'rail-bounce',
  animationSpeed = 'smooth'
}) => {
  // Always use the new rail-bounce logo animation for both "Connecting" and "Loading ResPoint"
  const activeVariant: NonNullable<LoadingScreenProps['variant']> = 'rail-bounce';
  const getAnimationClass = () => {
    switch (animationSpeed) {
      case 'gentle':
        return 'animate-bounce-gentle';
      case 'quick':
        return 'animate-bounce-quick';
      case 'smooth':
      default:
        return 'animate-bounce-smooth';
    }
  };

  const renderLoadingAnimation = () => {
    switch (activeVariant) {
      case 'rings':
        return (
          <div className="relative w-24 h-24 mx-auto mb-8">
            {/* Outer ring */}
            <div className="absolute inset-0">
              <svg className="w-full h-full animate-spin-slow" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#1E2A34"
                  strokeWidth="2"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="url(#gradient1)"
                  strokeWidth="2"
                  strokeDasharray="283"
                  strokeDashoffset="75"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#d95b1a" />
                    <stop offset="100%" stopColor="#FFB800" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            
            {/* Inner ring */}
            <div className="absolute inset-3">
              <svg className="w-full h-full animate-spin-reverse-slow" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#1E2A34"
                  strokeWidth="1"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="url(#gradient2)"
                  strokeWidth="1"
                  strokeDasharray="283"
                  strokeDashoffset="220"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#345AA6" />
                    <stop offset="100%" stopColor="#7EA0E3" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Center dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
        );
      
      case 'dots':
        return (
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-3 h-3 bg-[#d95b1a] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-[#FFB800] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-[#7EA0E3] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        );

      case 'image':
        return (
          <div className="relative mb-8">
            {/* Logo container */}
            <div className="w-24 h-24 mx-auto relative">
              {/* Static logo */}
              <div className="relative w-full h-full flex items-center justify-center">
                <img 
                  src={logoImage} 
                  alt="ResPoint Logo" 
                  className="w-16 h-16 object-contain"
                />
              </div>
              
              {/* Bouncing dot overlay - positioned where the dot in logo would be */}
              <div className="absolute bottom-4 right-4">
                <div className="relative">
                  {/* Shadow that stays on ground */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-black/20 rounded-full animate-bounce-shadow blur-sm"></div>
                  {/* Bouncing dot with glow */}
                  <div className="relative">
                    <div className={`w-4 h-4 bg-[#d95b1a] rounded-full ${getAnimationClass()} shadow-lg`}></div>
                    {/* Glow effect */}
                    <div className={`absolute inset-0 w-4 h-4 bg-[#d95b1a] rounded-full ${getAnimationClass()} blur-md opacity-60`}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'rail-bounce':
        // Custom animation: a vertical rounded rectangle "rail" on the left and the brand circle
        // moving up and down alongside it across its full height
        return (
          <div className="relative mb-8">
            <div className="w-40 h-40 mx-auto relative">
              <svg viewBox="0 0 256 256" className="w-full h-full" fill="none">
                <defs>
                  <linearGradient id="accentGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#D95B1A" />
                    <stop offset="100%" stopColor="#F29809" />
                  </linearGradient>
                  <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
                  </filter>
                </defs>

                {/* Left vertical rounded rectangle (rail) - same color as circle, wider */}
                <rect x="56" y="20" width="56" height="216" rx="28" fill="url(#accentGradient)" />

                {/* Moving circle (brand dot) aligned to the right of the rail */}
                <motion.circle
                  cx={172}
                  cy={56}
                  r={36}
                  fill="url(#accentGradient)"
                  initial={{ cy: 56 }}
                  animate={{ cy: [56, 200, 56] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* Matching glow following the same motion */}
                <motion.circle
                  cx={172}
                  cy={56}
                  r={36}
                  fill="url(#accentGradient)"
                  filter="url(#softGlow)"
                  opacity="0.5"
                  initial={{ cy: 56 }}
                  animate={{ cy: [56, 200, 56] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                />
              </svg>
            </div>
          </div>
        );

      case 'split-logo':
        return (
          <div className="relative mb-8">
            <div className="w-32 h-32 mx-auto relative">
              {/* Animated line */}
              <motion.div
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <svg 
                  viewBox="0 0 256 256" 
                  className="w-full h-full"
                  fill="none"
                >
                  <defs>
                    <linearGradient id="lineGradient" x1="57.5935" y1="126.7777" x2="193.7695" y2="126.7777" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#D95B1A"/>
                      <stop offset="0.0912" stopColor="#DF6B16"/>
                      <stop offset="0.2475" stopColor="#E87F10"/>
                      <stop offset="0.4255" stopColor="#EE8D0C"/>
                      <stop offset="0.6412" stopColor="#F1950A"/>
                      <stop offset="1" stopColor="#F29809"/>
                    </linearGradient>
                  </defs>
                  <motion.path
                    d="M57.59,29.2c8.35,0,16.7,0,25.05,0c12.21,0,24.42,0,36.63,0c4.78,0,9.53-0.02,14.29,0.6c-1.11-0.15-2.22-0.3-3.32-0.45c6.02,0.82,11.89,2.43,17.49,4.79c-1-0.42-1.99-0.84-2.99-1.26c5.3,2.27,10.29,5.19,14.86,8.71c-0.84-0.65-1.69-1.3-2.53-1.95c4.37,3.41,8.3,7.33,11.69,11.71c-0.65-0.84-1.3-1.69-1.95-2.53c3.36,4.39,6.15,9.17,8.31,14.26c-0.42-1-0.84-1.99-1.26-2.99c2.36,5.65,3.96,11.56,4.78,17.62c-0.15-1.11-0.3-2.22-0.45-3.32c0.77,6,0.76,12.06-0.04,18.06c0.15-1.11,0.3-2.22,0.45-3.32c-0.84,6.07-2.47,11.98-4.85,17.62c0.42-1,0.84-1.99,1.26-2.99c-2.25,5.24-5.11,10.19-8.6,14.7c0.65-0.84,1.3-1.69,1.95-2.53c-3.39,4.34-7.31,8.23-11.67,11.61c0.84-0.65,1.69-1.3,2.53-1.95c-4.55,3.48-9.51,6.36-14.78,8.61c1-0.42,1.99-0.84,2.99-1.26c-5.56,2.33-11.38,3.92-17.34,4.75c1.11-0.15,2.22-0.3,3.32-0.45c-8.39,1.12-17.02,0.62-25.46,0.63c-7.05,0.01-14.08,1.33-20.3,4.75c-5.83,3.21-10.8,8.62-13.58,14.65c-1.52,3.3-2.84,6.66-3.67,10.19c-0.9,3.82-1.39,7.74-1.79,11.64c-0.51,4.91-0.61,9.86-0.61,14.8c0,7.09,0,14.17,0,21.26c0,7.1-0.06,14.19,0,21.29c0,0.13,0,0.26,0,0.39c0,3.21,1.39,6.57,3.66,8.84c2.17,2.17,5.73,3.8,8.84,3.66c3.23-0.14,6.59-1.21,8.84-3.66c2.25-2.45,3.66-5.45,3.66-8.84c0-6.52,0-13.04,0-19.56c0-7.74,0-15.49,0-23.23c0-5.82,0.14-11.65,0.9-17.42c-0.15,1.11-0.3,2.22-0.45,3.32c0.56-4.13,1.44-8.23,3.05-12.09c-0.42,1-0.84,1.99-1.26,2.99c0.86-2.02,1.91-3.94,3.24-5.69c-0.65,0.84-1.3,1.69-1.95,2.53c1.1-1.42,2.35-2.69,3.77-3.8c-0.84,0.65-1.69,1.3-2.53,1.95c1.35-1.02,2.81-1.86,4.37-2.54c-1,0.42-1.99,0.84-2.99,1.26c2.2-0.93,4.51-1.5,6.87-1.83c-1.11,0.15-2.22,0.3-3.32,0.45c3.39-0.43,6.83-0.31,10.24-0.31c3.59,0,7.18,0,10.77,0c13.98-0.01,27.87-3.54,40.07-10.38c12.91-7.24,23.93-18.44,30.7-31.62c3.93-7.65,6.89-15.91,8.12-24.44c0.7-4.83,1.24-9.63,1.14-14.51c-0.1-4.98-0.72-9.99-1.66-14.87c-2.89-15.01-10.62-29.27-21.51-39.99c-10.17-10.01-23.27-17.34-37.17-20.61c-7.58-1.78-15.26-2.25-22.99-2.25c-6.91,0-13.81,0-20.72,0c-8.47,0-16.95,0-25.42,0c-5.29,0-10.59,0-15.88,0c-0.27,0-0.54,0-0.8,0c-3.21,0-6.57,1.39-8.84,3.66c-2.17,2.17-3.8,5.73-3.66,8.84c0.14,3.23,1.21,6.59,3.66,8.84C51.2,27.79,54.21,29.2,57.59,29.2L57.59,29.2z"
                    fill="none"
                    stroke="url(#lineGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ 
                      pathLength: { duration: 2, ease: "easeInOut" },
                      opacity: { duration: 0.5 }
                    }}
                  />
                </svg>
              </motion.div>

              {/* Animated dot */}
              <motion.div
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  transition: {
                    delay: 1.8,
                    duration: 0.4,
                    ease: [0.34, 1.56, 0.64, 1]
                  }
                }}
              >
                <svg 
                  viewBox="0 0 256 256" 
                  className="w-full h-full"
                >
                  <defs>
                    <linearGradient id="dotGradient" x1="156.3418" y1="218.2633" x2="198.4065" y2="218.2633" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#D95B1A"/>
                      <stop offset="0.0912" stopColor="#DF6B16"/>
                      <stop offset="0.2475" stopColor="#E87F10"/>
                      <stop offset="0.4255" stopColor="#EE8D0C"/>
                      <stop offset="0.6412" stopColor="#F1950A"/>
                      <stop offset="1" stopColor="#F29809"/>
                    </linearGradient>
                    <filter id="dotGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="4"/>
                    </filter>
                  </defs>
                  <motion.circle 
                    cx="177.37" 
                    cy="218.26" 
                    r="21.03"
                    fill="url(#dotGradient)"
                    animate={{
                      y: [0, -15, 0],
                    }}
                    transition={{
                      delay: 2.2,
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  {/* Glow effect */}
                  <motion.circle 
                    cx="177.37" 
                    cy="218.26" 
                    r="21.03"
                    fill="url(#dotGradient)"
                    filter="url(#dotGlow)"
                    opacity="0.5"
                    animate={{
                      y: [0, -15, 0],
                    }}
                    transition={{
                      delay: 2.2,
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </svg>
              </motion.div>
            </div>
          </div>
        );
      
      case 'logo':
      default:
        return (
          <div className="relative mb-8">
            {/* Logo container with subtle animation */}
            <div className="w-24 h-24 mx-auto relative">
              {/* Animated background circle */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#d95b1a] to-[#FFB800] rounded-full opacity-10 animate-pulse"></div>
              
              {/* Logo */}
              <div className="relative w-full h-full flex items-center justify-center">
                <svg 
                  viewBox="0 0 100 100" 
                  className="w-16 h-16"
                  fill="none"
                >
                  {/* ResPoint "R" logo */}
                  <path
                    d="M35 25h15c8.284 0 15 6.716 15 15s-6.716 15-15 15H40v20"
                    stroke="url(#logoGradient)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="animate-draw"
                  />
                  <g className={getAnimationClass()}>
                    <circle
                      cx="70"
                      cy="70"
                      r="5"
                      fill="#d95b1a"
                    />
                    {/* Glow effect for SVG dot */}
                    <circle
                      cx="70"
                      cy="70"
                      r="5"
                      fill="#d95b1a"
                      filter="blur(4px)"
                      opacity="0.6"
                    />
                  </g>
                  <defs>
                    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#d95b1a" />
                      <stop offset="100%" stopColor="#FFB800" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-x-0 bottom-0 top-[var(--titlebar-h)] bg-[#000814] flex items-center justify-center loading-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Subtle gradient background */}
        <div className="absolute inset-0 loading-gradient">
          <div className="absolute inset-0 bg-gradient-to-br from-[#000814] via-[#0A1929] to-[#000814] opacity-50"></div>
        </div>

        {/* Content */}
        <div className="relative z-10">
          {networkError ? (
          // Error state
          <div className="text-center px-6 animate-fade-in">
            {/* Error icon with pulse animation */}
            <div className="relative mb-8">
              <div className="w-20 h-20 mx-auto">
                <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping"></div>
                <div className="relative w-full h-full flex items-center justify-center">
                  <svg 
                    className="w-10 h-10 text-red-400" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={1.5} 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                    />
                  </svg>
                </div>
              </div>
            </div>

            <h3 className="text-white text-2xl font-light mb-3">Connection Failed</h3>
            <p className="text-[#8891A7] text-sm mb-8 max-w-sm mx-auto leading-relaxed">
              {networkError}
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-8 py-3 rounded-full bg-[#d95b1a] text-white font-medium transition-all duration-300 hover:bg-[#e06b2a] focus:outline-none focus:ring-2 focus:ring-[#d95b1a] focus:ring-offset-2 focus:ring-offset-[#000814] hover:shadow-lg hover:shadow-[#d95b1a]/20"
                >
                  Try Again
                </button>
              )}
              {onReset && (
                <button
                  onClick={onReset}
                  className="px-8 py-3 rounded-full bg-transparent border border-[#2A3B4F] text-[#8891A7] font-medium transition-all duration-300 hover:bg-[#1E2A34] hover:text-white hover:border-[#3A4B5F] focus:outline-none focus:ring-2 focus:ring-[#2A3B4F] focus:ring-offset-2 focus:ring-offset-[#000814]"
                >
                  Reset App
                </button>
              )}
            </div>
          </div>
        ) : (
          // Loading state
          <div className="text-center animate-fade-in">
            {/* Loading animation based on variant */}
            {renderLoadingAnimation()}

            <h3 className="text-white text-xl font-light mb-2">
              {isTestingNetwork ? 'Connecting' : 'Loading ResPoint'}
            </h3>
            
            <p className="text-[#8891A7] text-sm">
              {isTestingNetwork ? 'Establishing connection' : 'Preparing your workspace'}
            </p>

            {/* Minimal progress indicator */}
            <div className="mt-8 flex justify-center gap-1">
              <div className="w-1 h-1 bg-[#d95b1a] rounded-full animate-pulse"></div>
              <div className="w-1 h-1 bg-[#d95b1a] rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
              <div className="w-1 h-1 bg-[#d95b1a] rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
            </div>
          </div>
        )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}; 