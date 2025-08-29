import { useEffect, useRef } from 'react';
import { useFocus } from '../context/FocusContext';

export const useEventReattacher = () => {
  const { focusGeneration } = useFocus();
  const lastGenerationRef = useRef(focusGeneration);

  useEffect(() => {
    if (focusGeneration !== lastGenerationRef.current && focusGeneration > 0) {
      console.log('🔧 Reattaching event listeners after focus change');
      
      // Force React to re-process the entire DOM tree
      const root = document.getElementById('root');
      if (root) {
        // Trigger a synthetic event to wake up React's event system
        const event = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: -1,
          clientY: -1
        });
        
        // Dispatch event on root to re-establish React's event delegation
        root.dispatchEvent(event);
        
        // Also trigger a focus event
        const focusEvent = new FocusEvent('focus', {
          view: window,
          bubbles: true
        });
        root.dispatchEvent(focusEvent);
        
        // Force reflow
        void root.offsetHeight;
        
        console.log('✅ Event system reinitialized');
      }
      
      lastGenerationRef.current = focusGeneration;
    }
  }, [focusGeneration]);
}; 