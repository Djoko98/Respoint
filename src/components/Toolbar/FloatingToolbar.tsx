import React from 'react';

interface FloatingToolbarProps {
  selectedTool: 'select' | 'table' | 'wall' | 'text' | 'delete';
  onToolChange: (tool: 'select' | 'table' | 'wall' | 'text' | 'delete') => void;
  onAddTable: (type: 'rectangle' | 'circle') => void;
  tableType: 'rectangle' | 'circle';
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onResetLayout: () => void;
  isEditing: boolean;
  onToggleEdit: () => void;
  onCancel: () => void;
  hasChanges: boolean;
  onSave: () => void;
  onSaveLayout?: () => void;
  selectedElement: any;
  onUpdateText: (id: string, updates: any) => void;
}

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  selectedTool,
  onToolChange,
  onAddTable,
  tableType,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onResetLayout,
  isEditing,
  onToggleEdit,
  onCancel,
  hasChanges,
  onSave,
  onSaveLayout,
  selectedElement,
  onUpdateText,
}) => {
  // Handle table button clicks - set tool to 'table' and update table type
  const handleTableClick = (type: 'rectangle' | 'circle') => {
    onToolChange('table');
    onAddTable(type);
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedElement && selectedElement.elementType === 'text') {
      const newSize = parseInt(e.target.value, 10);
      if (!isNaN(newSize) && newSize > 0) {
        onUpdateText(selectedElement.id, { fontSize: newSize });
      }
    }
  };

  const handleFontSizeStep = (step: number) => {
    if (selectedElement && selectedElement.elementType === 'text' && onUpdateText) {
      const currentSize = selectedElement.fontSize || 16;
      const newSize = Math.max(1, currentSize + step);
      onUpdateText(selectedElement.id, { fontSize: newSize });
    }
  };

  const isTextSelected = selectedElement && selectedElement.elementType === 'text';

  return (
    <div className="absolute top-4 left-4 z-[90] flex flex-col items-start gap-2">
      {/* Edit and Save buttons - vertically stacked */}
      <div className="flex flex-col gap-2">
        {!isEditing ? (
          <button
            onClick={onToggleEdit}
            className="px-6 py-1.5 bg-transparent border border-white text-white text-sm rounded-full hover:bg-white/10 transition-colors"
          >
            Edit
          </button>
        ) : (
          <>
            <button
              onClick={onSave}
              disabled={!hasChanges}
              className={`px-6 py-1.5 bg-transparent border text-sm rounded-full transition-colors ${
                hasChanges
                  ? 'border-white text-white hover:bg-white/10'
                  : 'border-gray-500 text-gray-500 cursor-not-allowed'
              }`}
            >
              Save
            </button>
            {onSaveLayout && (
              <button
                onClick={onSaveLayout}
                className="px-6 py-1.5 bg-transparent border border-white text-white text-sm rounded-full hover:bg-white/10 transition-colors"
              >
                Save Layout
              </button>
            )}
            <button
              onClick={onCancel}
              className="px-6 py-1.5 bg-transparent border border-white text-white text-sm rounded-full hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
          </>
        )}
      </div>

      {/* Toolbar */}
      {isEditing && (
        <div className="bg-[#000814] border border-[#1E2A34] rounded-lg shadow-2xl p-1.5 flex flex-col gap-0.5">
          {/* Move Tool */}
          <button
            onClick={() => onToolChange('select')}
            className={`p-2 rounded-md transition-all hover:bg-white/10 ${
              selectedTool === 'select' ? 'bg-white/20' : ''
            }`}
            title="Move Tool (Select)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
            </svg>
          </button>

          {/* Square Table */}
          <button
            onClick={() => handleTableClick('rectangle')}
            className={`p-2 rounded-md transition-all hover:bg-white/10 ${
              selectedTool === 'table' && tableType === 'rectangle' ? 'bg-white/20' : ''
            }`}
            title="Square Table (Click & Drag to draw, hold Shift for square)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
          </button>

          {/* Round Table */}
          <button
            onClick={() => handleTableClick('circle')}
            className={`p-2 rounded-md transition-all hover:bg-white/10 ${
              selectedTool === 'table' && tableType === 'circle' ? 'bg-white/20' : ''
            }`}
            title="Round Table (Click & Drag to draw, hold Shift for circle)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
            </svg>
          </button>

          {/* Wall Tool */}
          <button
            onClick={() => onToolChange('wall')}
            className={`p-2 rounded-md transition-all hover:bg-white/10 ${
              selectedTool === 'wall' ? 'bg-white/20' : ''
            }`}
            title="Wall (Click & Drag to draw, hold Shift to constrain angle)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          {/* Text Tool & Font Size */}
          <div>
            <button
              onClick={() => onToolChange('text')}
              className={`p-2 rounded-md transition-all hover:bg-white/10 ${
                selectedTool === 'text' ? 'bg-white/20' : ''
              }`}
              title="Text Tool (Click to place text)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M4 7V4h16v3M9 20h6M12 4v16" />
              </svg>
            </button>
            {/* Font Size Input - shows when text is selected */}
            {isTextSelected && (
              <div className="mt-1.5 flex flex-col items-center gap-1">
                <input
                  id="font-size"
                  type="number"
                  value={selectedElement.fontSize || 16}
                  onChange={handleFontSizeChange}
                  className="w-12 text-sm bg-gray-900 text-white text-center rounded border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 hide-number-arrows"
                  min="1"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => handleFontSizeStep(-1)}
                    className="p-0.5 rounded hover:bg-white/20"
                    onMouseDown={(e) => e.stopPropagation()}
                    title="Decrease font size"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                  </button>
                  <button
                    onClick={() => handleFontSizeStep(1)}
                    className="p-0.5 rounded hover:bg-white/20"
                    onMouseDown={(e) => e.stopPropagation()}
                    title="Increase font size"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-gray-700 my-1" />

          {/* Undo - curved arrow pointing left */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-2 rounded-md transition-all  ${
              canUndo
                ? 'hover:bg-white/10'
                : 'text-gray-500 cursor-not-allowed'
            }`}
            title="Undo"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 14l-5-5 5-5"/>
              <path d="M4 9h11.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/>
            </svg>
          </button>

          {/* Redo - curved arrow pointing right */}
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-2 rounded-md transition-all ${
              canRedo
                ? 'hover:bg-white/10'
                : 'text-gray-500 cursor-not-allowed'
            }`}
            title="Redo"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 14l5-5-5-5"/>
              <path d="M20 9H8.5A5.5 5.5 0 0 0 3 14.5v0A5.5 5.5 0 0 0 8.5 20H13"/>
            </svg>
          </button>

          {/* Divider */}
          <div className="w-full h-px bg-gray-700 my-1" />

          {/* Delete Tool */}
          <button
            onClick={() => onToolChange('delete')}
            className={`p-2 rounded-md transition-all hover:bg-white/10 ${
              selectedTool === 'delete' ? 'bg-red-500/20' : ''
            }`}
            title="Delete Tool (Click to delete)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6" />
            </svg>
          </button>

          {/* Reset All */}
          <button
            onClick={onResetLayout}
            className="p-2 rounded-md transition-all hover:bg-white/10"
            title="Reset All"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8M21 3v5h-5" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default FloatingToolbar; 