import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';

interface FocusContextType {
  isAppFocused: boolean;
  focusGeneration: number;
  forceRefresh: () => void;
}

const FocusContext = createContext<FocusContextType>({
  isAppFocused: true,
  focusGeneration: 0,
  forceRefresh: () => {}
});

export const useFocus = () => useContext(FocusContext);

export const FocusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAppFocused, setIsAppFocused] = useState(true);
  const [focusGeneration, setFocusGeneration] = useState(0);

  const forceQuickUpdate = useCallback(() => {
    console.log('⚡ Quick focus update');
    // Just increment generation to trigger useEffect in components
    setFocusGeneration(prev => prev + 1);
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      console.log('🎯 FocusContext: Window gained focus');
      setIsAppFocused(true);
      // Removed automatic refresh on focus - no longer needed after Electron migration
    };

    const handleBlur = () => {
      console.log('😴 FocusContext: Window lost focus');
      setIsAppFocused(false);
    };

    // Standard browser focus events
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const forceRefresh = () => {
    console.log('🚀 Manual force refresh triggered');
    forceQuickUpdate();
  };

  return (
    <FocusContext.Provider value={{ isAppFocused, focusGeneration, forceRefresh }}>
      {children}
    </FocusContext.Provider>
  );
}; 