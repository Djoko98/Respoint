import React, { useContext, useState } from "react";
import { LayoutContext } from "../../context/LayoutContext";
import { UserContext } from "../../context/UserContext";
import { ThemeContext } from "../../context/ThemeContext";
import { useRolePermissions } from "../../hooks/useRolePermissions";

interface Tool {
  id: string;
  icon: React.ReactNode;
  label: string;
  action?: () => void;
}

interface ToolbarProps {
  selectedTool: 'select' | 'table' | 'wall' | 'text' | 'delete';
  onToolChange: (tool: 'select' | 'table' | 'wall' | 'text' | 'delete') => void;
  onAddTable: (type: 'rectangle' | 'circle') => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDeleteSelected?: () => void;
  onResetLayout?: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  selectedTool, 
  onToolChange, 
  onAddTable,
  onUndo,
  onRedo,
  onDeleteSelected,
  onResetLayout
}) => {
  const { isAuthenticated } = useContext(UserContext);
  const { hasPermission } = useRolePermissions();
  const { layout } = useContext(LayoutContext);
  const { theme } = useContext(ThemeContext);
  const [showTableOptions, setShowTableOptions] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const isLight = theme === 'light';

  // Editing is allowed only when the active role has edit permissions
  const canEdit = isAuthenticated && hasPermission('edit_layout');

  const tools: Tool[] = [
    {
      id: 'select',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 5h2V3c-1.1 0-2 .9-2 2zm0 8h2v-2H3v2zm4 8h2v-2H7v2zM3 9h2V7H3v2zm10-6h-2v2h2V3zm6 0v2h2c0-1.1-.9-2-2-2zM5 21v-2H3c0 1.1.9 2 2 2zm-2-4h2v-2H3v2zM9 3H7v2h2V3zm2 18h2v-2h-2v2zm8-8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2zm0-12h2V7h-2v2zm0 8h2v-2h-2v2zm-4 4h2v-2h-2v2zm0-16h2V3h-2v2z"/>
        </svg>
      ),
      label: 'Select'
    },
    {
      id: 'table',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 3h18v18H3V3zm8 16v-6H5v6h6zm0-8V5H5v6h6zm8 8v-6h-6v6h6zm0-8V5h-6v6h6z"/>
        </svg>
      ),
      label: 'Add Table'
    },
    {
      id: 'wall',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 3h18v2H3V3zm0 16h18v2H3v-2zm0-8h18v2H3v-2z"/>
        </svg>
      ),
      label: 'Draw Wall'
    },
    {
      id: 'text',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 4v3h5.5v12h3V7H19V4H5z"/>
        </svg>
      ),
      label: 'Add Text'
    },
    {
      id: 'delete',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      ),
      label: 'Delete'
    }
  ];

  const actionTools = [
    {
      id: 'undo',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>
        </svg>
      ),
      label: 'Undo',
      action: onUndo
    },
    {
      id: 'redo',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/>
        </svg>
      ),
      label: 'Redo',
      action: onRedo
    },
    {
      id: 'reset',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 12c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2zm-2-9c-4.97 0-9 4.03-9 9H0l4 4 4-4H5c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.51 0-2.91-.49-4.06-1.3l-1.42 1.44C8.04 20.3 9.94 21 12 21c4.97 0 9-4.03 9-9s-4.03-9-9-9z"/>
        </svg>
      ),
      label: 'Reset Layout',
      action: onResetLayout
    }
  ];

  if (!isAuthenticated) {
    return (
      <div
        className={
          `flex flex-col gap-3 p-4 border-r ` +
          (isLight ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-800')
        }
      >
        <div className="text-gray-500 text-sm text-center">
          Please log in to edit
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        `flex flex-col gap-3 p-4 border-r ` +
        (isLight ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-800')
      }
    >
      {/* Main tools */}
      <div className="flex flex-col gap-2">
        {tools.map((tool) => (
          <div key={tool.id} className="relative">
            <button
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                // Disabled styling for tools that modify layout when user cannot edit
                (!canEdit && tool.id !== 'select')
                  ? (isLight
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                      : 'bg-gray-800 text-gray-600 cursor-not-allowed opacity-50')
                  : (selectedTool === tool.id
                      ? (isLight ? 'bg-yellow-100 text-yellow-800' : 'bg-accent text-white')
                      : (isLight ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'))
              }`}
              onClick={() => {
                if (!canEdit && tool.id !== 'select') return;
                if (tool.id === 'table') {
                  setShowTableOptions(!showTableOptions);
                } else {
                  onToolChange(tool.id as any);
                  setShowTableOptions(false);
                }
              }}
              title={tool.label}
            >
              {tool.icon}
              <span className="text-xs">{tool.label}</span>
            </button>

            {/* Table type options */}
            {tool.id === 'table' && showTableOptions && (
              <div className={
                `absolute left-full ml-2 top-0 rounded-lg shadow-lg p-2 z-[80] ` +
                (isLight ? 'bg-white border border-gray-200' : 'bg-gray-800')
              }>
                <button
                  className={
                    `w-full flex items-center gap-2 px-3 py-2 rounded text-sm ` +
                    (isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-gray-700 text-gray-300 hover:text-white')
                  }
                  onClick={() => {
                    if (!canEdit) return;
                    onAddTable('rectangle');
                    setShowTableOptions(false);
                    onToolChange('table');
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="4" y="6" width="16" height="12" rx="2"/>
                  </svg>
                  Rectangle
                </button>
                <button
                  className={
                    `w-full flex items-center gap-2 px-3 py-2 rounded text-sm ` +
                    (isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-gray-700 text-gray-300 hover:text-white')
                  }
                  onClick={() => {
                    if (!canEdit) return;
                    onAddTable('circle');
                    setShowTableOptions(false);
                    onToolChange('table');
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="8"/>
                  </svg>
                  Circle
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Font size selector for text tool */}
      {selectedTool === 'text' && (
        <div className="mt-2">
          <label className={isLight ? 'text-xs text-gray-500' : 'text-xs text-gray-400'}>Font size</label>
          <select 
            className="respoint-select mt-1"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
          >
            <option value="12">12px</option>
            <option value="14">14px</option>
            <option value="16">16px</option>
            <option value="18">18px</option>
            <option value="20">20px</option>
            <option value="24">24px</option>
          </select>
        </div>
      )}

      {/* Separator */}
      <div className={isLight ? 'border-t border-gray-200 my-2' : 'border-t border-gray-700 my-2'}></div>

      {/* Action tools */}
      <div className="flex flex-col gap-2">
        {actionTools.map((tool) => (
          <button
            key={tool.id}
            className={
              `flex items-center gap-2 px-3 py-2 rounded-lg transition ` +
              (!canEdit
                ? (isLight ? 'bg-gray-100 text-gray-400 opacity-50 cursor-not-allowed' : 'bg-gray-800 text-gray-600 opacity-50 cursor-not-allowed')
                : (isLight ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'))
            }
            onClick={() => { if (!canEdit) return; tool.action && tool.action(); }}
            title={tool.label}
          >
            {tool.icon}
            <span className="text-xs">{tool.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Toolbar;
