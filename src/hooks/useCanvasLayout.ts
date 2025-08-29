import { useContext } from 'react';
import { LayoutContext } from '../context/LayoutContext';

// Re-export types from LayoutContext
export type { Table, Wall, TextElement, Layout } from '../context/LayoutContext';

// Hook that bridges Canvas component with LayoutContext
export const useCanvasLayout = () => {
  const layoutContext = useContext(LayoutContext);
  
  // Return all the context values directly
  return {
    // Layout data
    layout: layoutContext.layout,
    zoneLayouts: layoutContext.zoneLayouts,
    savedLayouts: layoutContext.savedLayouts,
    currentLayoutId: layoutContext.currentLayoutId,
    
    // Layout operations
    setLayout: layoutContext.setLayout,
    setZoneLayouts: () => {}, // Not needed, handled by context
    saveLayout: layoutContext.saveLayout,
    saveLayoutAs: layoutContext.saveLayoutAs,
    loadSavedLayout: layoutContext.loadSavedLayout,
    updateSavedLayout: layoutContext.updateSavedLayout,
    deleteSavedLayout: layoutContext.deleteSavedLayout,
    getDefaultLayout: layoutContext.getDefaultLayout,
    resetLayout: layoutContext.resetLayout,
    
    // Edit state
    isEditing: layoutContext.isEditing,
    setIsEditing: layoutContext.setIsEditing,
    hasChanges: layoutContext.hasChanges,
    
    // Undo/redo
    undo: layoutContext.undo,
    redo: layoutContext.redo,
    canUndo: layoutContext.canUndo,
    canRedo: layoutContext.canRedo,
    
    // Copy/paste operations (placeholders for now)
    copySelectedElements: () => console.log('Copy not implemented'),
    pasteElements: () => console.log('Paste not implemented'),
    duplicateSelectedElements: () => console.log('Duplicate not implemented')
  };
}; 