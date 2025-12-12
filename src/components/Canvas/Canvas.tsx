import React, { useState, useContext, useRef, useEffect, useCallback, useMemo } from "react";
import { useCanvasLayout, Layout } from "../../hooks/useCanvasLayout";
import { ZoneContext } from "../../context/ZoneContext";
import { UserContext } from "../../context/UserContext";
import { useRolePermissions } from "../../hooks/useRolePermissions";
import { ReservationContext } from "../../context/ReservationContext";
import { Reservation } from "../../types/reservation";
import { EventContext } from "../../context/EventContext";
import type { EventReservation } from "../../types/event";
import ReservationForm from "../ReservationForm/ReservationForm";
import TimelineBar from "./TimelineBar";
import TimelineOverlay from "./TimelineOverlay";
import FloatingToolbar from "../Toolbar/FloatingToolbar";
import DeleteConfirmationModal from "../common/DeleteConfirmationModal";
import { formatTableNames } from "../../utils/tableHelper";
import { useLanguage } from "../../context/LanguageContext";
import { getAssignedWaiters, setAssignedWaiter, removeAssignedWaiter } from "../../utils/waiters";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getZoom, getZoomAdjustedCoordinates, getZoomAdjustedScreenCoordinates, adjustValueForZoom } from "../../utils/zoom";
import { loadFromStorage, saveToStorage } from "../../utils/storage";
import { ThemeContext } from "../../context/ThemeContext";
import AddSeatsModal from "./AddSeatsModal";

// Layout List Component
interface LayoutListProps {
  onClose: () => void;
  savedLayouts: any;
  loadSavedLayout: (layoutId: string) => void;
  deleteSavedLayout: (layoutId: string) => Promise<void>;
  getDefaultLayout: () => any;
  currentLayoutId: string | null;
}

const LayoutList: React.FC<LayoutListProps> = ({ 
  onClose, 
  savedLayouts, 
  loadSavedLayout, 
  deleteSavedLayout, 
  getDefaultLayout, 
  currentLayoutId 
}) => {
  const { currentZone } = useContext(ZoneContext);
  const { t } = useLanguage();
  const { theme } = useContext(ThemeContext);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showDeleteLayoutModal, setShowDeleteLayoutModal] = useState(false);
  const [layoutToDelete, setLayoutToDelete] = useState<string | null>(null);
  // Access current working layout to reflect live table count for default layout
  const { layout: workingLayout } = useCanvasLayout();

  const zoneSavedLayoutsRaw = currentZone ? (savedLayouts[currentZone.id] || []) : [];
  // Default layouts first, then others by created_at (newest first)
  const zoneSavedLayouts = zoneSavedLayoutsRaw.slice().sort((a: any, b: any) => {
    if (a.is_default && !b.is_default) return -1;
    if (!a.is_default && b.is_default) return 1;
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  });
  const defaultLayout = getDefaultLayout();
  
  // Helper: count only real tables, exclude chairs stored in tables array
  const countRealTables = (layoutData: any): number => {
    const tables = Array.isArray(layoutData?.tables) ? layoutData.tables : [];
    return tables.filter((t: any) => t?.type !== 'chair').length;
  };
  
  // Debug log when savedLayouts change
  useEffect(() => {
    console.log('Layout list updated. Zone:', currentZone?.id, 'Layouts count:', zoneSavedLayouts.length);
    zoneSavedLayouts.forEach((sl: any) => {
      console.log(`- ${sl.name}: ${countRealTables(sl.layout)} tables (real)`);
    });
  }, [savedLayouts, currentZone, zoneSavedLayouts.length]);

  const handleLoad = (layoutId: string) => {
    loadSavedLayout(layoutId);
    onClose();
  };

  const handleDelete = (layoutId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLayoutToDelete(layoutId);
    setShowDeleteLayoutModal(true);
  };

  const confirmDeleteLayout = () => {
    if (layoutToDelete) {
      deleteSavedLayout(layoutToDelete);
      setLayoutToDelete(null);
    }
  };
  
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <motion.div 
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -16, opacity: 0 }}
      transition={{ type: 'tween', duration: 0.2 }}
      className="absolute right-0 top-10 bottom-0 w-56 bg-[#000814] border-l border-[#1E2A34] shadow-2xl z-[960] flex flex-col"
    >
      <div className="px-3 py-2.5 border-b border-[#1E2A34] flex justify-between items-center">
        <h3 className="text-white font-normal text-sm">{t('savedLayouts')}</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
            title={t('refreshList')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar" key={refreshKey}>
        {zoneSavedLayouts.length === 0 ? (
          <p className="text-gray-500 text-center py-8 text-xs">{t('noSavedLayoutsYet')}</p>
        ) : (
          <div className="space-y-1.5">
            {zoneSavedLayouts.map((savedLayout: any) => (
              <div
                key={savedLayout.id}
                className={`rounded p-2 cursor-pointer transition-colors border ${
                  theme === 'light'
                    ? 'bg-[#F8FAFC] hover:bg-white'
                    : 'bg-[#0A1929] hover:bg-[#0A1929]/80'
                } ${
                  selectedLayoutId === savedLayout.id
                    ? 'border-blue-500'
                    : currentLayoutId === savedLayout.id
                    ? 'border-green-500'
                    : 'border-transparent'
                }`}
                onClick={() => setSelectedLayoutId(savedLayout.id)}
                onDoubleClick={() => handleLoad(savedLayout.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className="text-white font-medium text-xs truncate">
                            {savedLayout.name}
                        </h4>
                        {currentLayoutId === savedLayout.id && (
                            <div className="w-2 h-2 bg-green-400 rounded-full" title={t('active')}></div>
                        )}
                    </div>
                    {savedLayout.is_default && (
                    <span className="text-xs bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded-full inline-block mt-0.5">{t('default')}</span>
                    )}
                    <p className="text-gray-500 text-xs mt-0.5">
                    {formatDate(savedLayout.created_at)}
                    </p>
                    <p className="text-gray-400 text-xs">
                    {
                      // Show live count for default layout using current working layout;
                      // otherwise, count only real tables (exclude chairs) from saved snapshot
                      savedLayout.is_default
                        ? countRealTables(workingLayout)
                        : countRealTables(savedLayout.layout)
                    } {t('tables')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(savedLayout.id, e)}
                    className="text-red-400 hover:text-red-300 ml-1 p-0.5 rounded hover:bg-red-500/10 transition-colors flex-shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                {selectedLayoutId === savedLayout.id && (
                  <button
                    onClick={() => handleLoad(savedLayout.id)}
                    className="mt-1.5 w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 py-1 rounded text-xs transition-colors"
                  >
                    {t('loadLayout')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Delete Layout Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteLayoutModal}
        onClose={() => {
          setShowDeleteLayoutModal(false);
          setLayoutToDelete(null);
        }}
        onConfirm={confirmDeleteLayout}
        title={t('deleteLayout')}
        message={t('deleteLayoutMessage')}
        confirmText={t('deleteLayoutButton')}
        type="delete"
      />
    </motion.div>
  );
};

// Save Layout Modal Component
const SaveLayoutModal: React.FC<{ onClose: () => void; onSave: (name: string, isDefault: boolean) => void }> = ({ onClose, onSave }) => {
  const { t } = useLanguage();
  const [layoutName, setLayoutName] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Ensure global state knows a modal is open and prevent background scroll
  useEffect(() => {
    try { window.dispatchEvent(new CustomEvent('modal-open')); } catch {}
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow || 'unset';
      try { window.dispatchEvent(new CustomEvent('modal-close')); } catch {}
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (layoutName.trim()) {
      onSave(layoutName.trim(), isDefault);
      onClose();
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 top-[var(--titlebar-h)] bg-black bg-opacity-50 z-[12050] flex items-center justify-center">
      <div className="bg-[#000814] border border-[#1E2A34] rounded-lg p-6 w-96 shadow-2xl">
        <h3 className="text-white font-bold text-xl mb-4">{t('saveLayout')}</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-300 mb-2 text-sm">{t('layoutName')}</label>
            <input
              type="text"
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              className="w-full px-3 py-2 bg-[#0A1929] text-white rounded border border-[#1E2A34] focus:border-blue-500 focus:outline-none transition-colors"
              placeholder={t('layoutNamePlaceholder')}
              autoFocus
            />
          </div>
          <div className="mb-6">
            <label className="flex items-center text-gray-300 text-sm">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="mr-2 accent-blue-600"
              />
              {t('setAsDefaultLayout')}
            </label>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 py-2 rounded transition-colors text-sm font-medium"
            >
              {t('save')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-transparent border border-gray-600 hover:bg-white/10 text-white py-2 rounded transition-colors text-sm font-medium"
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface TextElement {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  rotation: number;
  width: number;
  height: number;
  isParagraph: boolean;
}

interface CanvasProps {
  selectedTool: 'select' | 'table' | 'wall' | 'text' | 'chair' | 'delete';
  onToolChange: (tool: 'select' | 'table' | 'wall' | 'text' | 'chair' | 'delete') => void;
  onAddTable: (type: 'rectangle' | 'circle') => void;
  tableType: 'rectangle' | 'circle';
  onUndo: () => void;
  onRedo: () => void;
  onResetLayout: () => void;
  showReservationForm: boolean;
  onCloseReservationForm: () => void;
  selectedDate?: Date;
  editReservation?: any;
}

// Helper to get text dimensions for auto-sizing
const getTextSize = (text: string, fontSize: number, fontWeight: string = 'normal', fontFamily: string = 'sans-serif', maxWidth?: number) => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return { width: 100, height: 20 };
  
  context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const lineHeight = fontSize * 1.2; // Same as in CSS
  const padding = 8; // 4px on each side (same as CSS padding)
  
  // Split text by explicit line breaks first
  const explicitLines = text.split('\n');
  let allLines: string[] = [];
  let actualWidth = 0;
  
  // Process each explicit line for word wrapping
  explicitLines.forEach(line => {
    if (!maxWidth) {
      // No word wrapping - just measure the line
      allLines.push(line);
      actualWidth = Math.max(actualWidth, context.measureText(line).width);
    } else {
      // Word wrapping enabled
      const availableWidth = maxWidth - padding;
      if (context.measureText(line).width <= availableWidth) {
        // Line fits without wrapping
        allLines.push(line);
        actualWidth = Math.max(actualWidth, context.measureText(line).width);
      } else {
        // Line needs wrapping
        const words = line.split(' ');
        let currentLine = '';
        
        words.forEach((word, index) => {
          const testLine = currentLine + (currentLine ? ' ' : '') + word;
          const testWidth = context.measureText(testLine).width;
          
          if (testWidth <= availableWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) {
              allLines.push(currentLine);
              actualWidth = Math.max(actualWidth, context.measureText(currentLine).width);
            }
            currentLine = word;
          }
          
          // Add the last line
          if (index === words.length - 1 && currentLine) {
            allLines.push(currentLine);
            actualWidth = Math.max(actualWidth, context.measureText(currentLine).width);
          }
        });
      }
    }
  });
  
  const totalHeight = allLines.length * lineHeight;
  
  return { 
    width: actualWidth + padding, 
    height: totalHeight + padding,
    lineCount: allLines.length 
  };
};

// Helper function to check if a point is inside a rotated rectangle
const isPointInRotatedRectangle = (
  pointX: number, 
  pointY: number, 
  rectX: number, 
  rectY: number, 
  rectWidth: number, 
  rectHeight: number, 
  rotation: number
) => {
  // Convert rotation from degrees to radians
  const rad = (rotation || 0) * Math.PI / 180;
  
  // Calculate center of rectangle
  const centerX = rectX + rectWidth / 2;
  const centerY = rectY + rectHeight / 2;
  
  // Translate point to origin (center of rectangle)
  const translatedX = pointX - centerX;
  const translatedY = pointY - centerY;
  
  // Rotate point back (inverse rotation)
  const cos = Math.cos(-rad);
  const sin = Math.sin(-rad);
  const rotatedX = translatedX * cos - translatedY * sin;
  const rotatedY = translatedX * sin + translatedY * cos;
  
  // Check if point is inside rectangle (now axis-aligned)
  const halfWidth = rectWidth / 2;
  const halfHeight = rectHeight / 2;
  
  return Math.abs(rotatedX) <= halfWidth && Math.abs(rotatedY) <= halfHeight;
};

// Helper function to get corners of a rotated rectangle
const getRotatedRectangleCorners = (
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number
) => {
  const rad = (rotation || 0) * Math.PI / 180;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  // Define corners relative to center
  const corners = [
    { x: -width / 2, y: -height / 2 }, // top-left
    { x: width / 2, y: -height / 2 },  // top-right
    { x: width / 2, y: height / 2 },   // bottom-right
    { x: -width / 2, y: height / 2 }   // bottom-left
  ];
  
  // Rotate and translate each corner
  return corners.map(corner => ({
    x: centerX + corner.x * cos - corner.y * sin,
    y: centerY + corner.x * sin + corner.y * cos
  }));
};

// Helper function to check if a rotated rectangle intersects with a selection box
const isRotatedRectangleInSelectionBox = (element: any, box: any) => {
  const boxLeft = Math.min(box.x1, box.x2);
  const boxTop = Math.min(box.y1, box.y2);
  const boxRight = Math.max(box.x1, box.x2);
  const boxBottom = Math.max(box.y1, box.y2);
  
  // Calculate element dimensions - use actual text size for text elements
  let elemWidth, elemHeight;
  if (element.text !== undefined && element.fontSize !== undefined) {
    // It's a text element - always calculate optimal dimensions
    const textSize = getTextSize(element.text, element.fontSize || 16);
    elemWidth = textSize.width;
    elemHeight = textSize.height;
  } else {
    // It's a table or other element - use width/height properties
    elemWidth = element.width || 100;
    elemHeight = element.height || 100;
  }
  
  // Get corners of rotated rectangle
  const corners = getRotatedRectangleCorners(
    element.x,
    element.y,
    elemWidth,
    elemHeight,
    element.rotation || 0
  );
  
  // Check if any corner is inside the selection box
  for (const corner of corners) {
    if (corner.x >= boxLeft && corner.x <= boxRight && 
        corner.y >= boxTop && corner.y <= boxBottom) {
      return true;
    }
  }
  
  // Check if the rectangle center is inside the selection box
  const centerX = element.x + elemWidth / 2;
  const centerY = element.y + elemHeight / 2;
  if (centerX >= boxLeft && centerX <= boxRight && 
      centerY >= boxTop && centerY <= boxBottom) {
    return true;
  }
  
  // Check if selection box corners are inside the rotated rectangle
  const boxCorners = [
    { x: boxLeft, y: boxTop },
    { x: boxRight, y: boxTop },
    { x: boxRight, y: boxBottom },
    { x: boxLeft, y: boxBottom }
  ];
  
  for (const corner of boxCorners) {
    if (isPointInRotatedRectangle(
      corner.x,
      corner.y,
      element.x,
      element.y,
      elemWidth,
      elemHeight,
      element.rotation || 0
    )) {
      return true;
    }
  }
  
  return false;
};

// Helper function to check if an element is in a selection box
const isInSelectionBox = (element: any, box: any) => {
  // If element has rotation, use the rotated rectangle check
  if (element.rotation && element.rotation !== 0) {
    return isRotatedRectangleInSelectionBox(element, box);
  }
  
  // Simple intersection check for non-rotated elements
  const elemLeft = element.x;
  const elemTop = element.y;
  
  // Calculate element dimensions - use actual text size for text elements
  let elemWidth, elemHeight;
  if (element.text !== undefined && element.fontSize !== undefined) {
    // It's a text element - always calculate optimal dimensions
    const textSize = getTextSize(element.text, element.fontSize || 16);
    elemWidth = textSize.width;
    elemHeight = textSize.height;
  } else {
    // It's a table or other element - use width/height properties
    elemWidth = element.width || 100;
    elemHeight = element.height || 100;
  }
  
  const elemRight = elemLeft + elemWidth;
  const elemBottom = elemTop + elemHeight;
  
  const boxLeft = Math.min(box.x1, box.x2);
  const boxTop = Math.min(box.y1, box.y2);
  const boxRight = Math.max(box.x1, box.x2);
  const boxBottom = Math.max(box.y1, box.y2);
  
  // Check if rectangles intersect (not just if one contains the other)
  return !(elemRight < boxLeft || 
           elemLeft > boxRight || 
           elemBottom < boxTop || 
           elemTop > boxBottom);
};

// Helper function to check if a line segment intersects with a rectangle
const doesLineIntersectRect = (
  x1: number, y1: number, x2: number, y2: number,
  rectLeft: number, rectTop: number, rectRight: number, rectBottom: number
): boolean => {
  // Check if either endpoint is inside the rectangle
  if ((x1 >= rectLeft && x1 <= rectRight && y1 >= rectTop && y1 <= rectBottom) ||
      (x2 >= rectLeft && x2 <= rectRight && y2 >= rectTop && y2 <= rectBottom)) {
    return true;
  }
  
  // Check if line intersects any of the rectangle's edges
  const intersectsEdge = (lineX1: number, lineY1: number, lineX2: number, lineY2: number,
                         edgeX1: number, edgeY1: number, edgeX2: number, edgeY2: number): boolean => {
    const denom = (lineX1 - lineX2) * (edgeY1 - edgeY2) - (lineY1 - lineY2) * (edgeX1 - edgeX2);
    if (Math.abs(denom) < 1e-10) return false; // Lines are parallel
    
    const t = ((lineX1 - edgeX1) * (edgeY1 - edgeY2) - (lineY1 - edgeY1) * (edgeX1 - edgeX2)) / denom;
    const u = -((lineX1 - lineX2) * (lineY1 - edgeY1) - (lineY1 - lineY2) * (lineX1 - edgeX1)) / denom;
    
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  };
  
  // Check intersection with all four edges of the rectangle
  return intersectsEdge(x1, y1, x2, y2, rectLeft, rectTop, rectRight, rectTop) ||    // Top edge
         intersectsEdge(x1, y1, x2, y2, rectRight, rectTop, rectRight, rectBottom) || // Right edge
         intersectsEdge(x1, y1, x2, y2, rectRight, rectBottom, rectLeft, rectBottom) || // Bottom edge
         intersectsEdge(x1, y1, x2, y2, rectLeft, rectBottom, rectLeft, rectTop);      // Left edge
};

// Helper function to check if a wall is in selection box
const isWallInSelectionBox = (wall: any, box: any) => {
  const boxLeft = Math.min(box.x1, box.x2);
  const boxTop = Math.min(box.y1, box.y2);
  const boxRight = Math.max(box.x1, box.x2);
  const boxBottom = Math.max(box.y1, box.y2);
  
  // Use precise line-rectangle intersection instead of bounding box
  return doesLineIntersectRect(wall.x1, wall.y1, wall.x2, wall.y2, boxLeft, boxTop, boxRight, boxBottom);
};

// === Shared progress components (top-level to avoid remount flicker) ===

// Helpers for seated reservations (ARRIVED) - countdown to estimated end
const estimateSeatedDurationMinutes = (numGuests?: number) => {
  const g = typeof numGuests === 'number' ? numGuests : 2;
  if (g <= 2) return 60;
  if (g <= 4) return 120;
  return 150;
};

// Progress stroke for seated reservations – aligned to the table edge
const SeatedProgressStrokeBase: React.FC<{
  shape: 'rect' | 'circle';
  tableWidth: number;
  tableHeight: number;
  rotation: number;
  color: string;
  reservation: Reservation;
  gap?: number;
  strokeWidth?: number;
  borderRadiusPx?: number;
  tableId?: string; // Optional: for table-specific end time limits
}> = ({ shape, tableWidth, tableHeight, rotation, color, reservation, gap = 4, strokeWidth = 3, borderRadiusPx = 8, tableId }) => {
  const [progress, setProgress] = useState(0);
  const updateRef = useRef<() => void>(() => {});
  
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    const update = () => {
      try {
        const start = new Date(`${reservation.date}T${reservation.time}`);
        let end: Date = new Date(start.getTime() + estimateSeatedDurationMinutes(reservation.numberOfGuests) * 60 * 1000);
        let endMin: number | null = null;
        
        try {
          const key = `respoint-duration-adjustments:${reservation.date}`;
          const raw = localStorage.getItem(key);
          const parsed = raw ? JSON.parse(raw) : {};
          const adj = parsed?.[reservation.id];
          if (adj && typeof adj.end === 'number') {
            endMin = adj.end;
          }
        } catch {}
        
        // Check for table-specific limit (when a table has an upcoming reservation)
        if (tableId) {
          try {
            const tableLimitsKey = `respoint-table-limits:${reservation.date}`;
            const rawLimits = localStorage.getItem(tableLimitsKey);
            if (rawLimits) {
              const tableLimits = JSON.parse(rawLimits);
              const tableLimit = tableLimits?.[reservation.id]?.[tableId];
              if (typeof tableLimit === 'number') {
                // Use the earlier of: reservation end time or table-specific limit
                if (endMin === null || tableLimit < endMin) {
                  endMin = tableLimit;
                }
              }
            }
          } catch {}
        }
        
        if (endMin !== null) {
          const midnight = new Date(`${reservation.date}T00:00:00`);
          // Allow spilling into next day (e.g. 23:00 + 2h30 => 1530 minutes)
          end = new Date(midnight.getTime() + Math.max(0, Math.min(2880, endMin)) * 60 * 1000);
        }
        
        const now = new Date();
        const p = (now.getTime() - start.getTime()) / Math.max(1, (end.getTime() - start.getTime()));
        setProgress(Math.max(0, Math.min(1, p)));
      } catch {
        setProgress(0);
      }
    };
    updateRef.current = update;
    update();
    interval = setInterval(update, 1000);
    return () => { if (interval) clearInterval(interval); };
  }, [reservation.date, reservation.time, reservation.id, reservation.numberOfGuests, tableId]);

  // Listen for duration adjustment changes and immediately update
  useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail?.date === reservation.date) {
        updateRef.current();
      }
    };
    window.addEventListener('respoint-duration-adjustments-changed', handler);
    window.addEventListener('respoint-table-limits-changed', handler);
    return () => {
      window.removeEventListener('respoint-duration-adjustments-changed', handler);
      window.removeEventListener('respoint-table-limits-changed', handler);
    };
  }, [reservation.date]);

  const isExpired = progress >= 1 - 1e-6;

  // Build dashed strokeDasharray that covers only the visible progress length,
  // then a single trailing gap to hide the remainder (no repetition).
  const buildDashedArray = (visibleLen: number, totalLen: number, dashLen: number = 8, gapLen: number = 6) => {
    let remaining = Math.max(0, Math.min(totalLen, visibleLen));
    const parts: number[] = [];
    let acc = 0;
    while (remaining > 0.5) {
      const d = Math.min(dashLen, remaining);
      parts.push(d);
      acc += d;
      remaining -= d;
      if (remaining <= 0.5) break;
      const g = Math.min(gapLen, remaining);
      parts.push(g);
      acc += g;
      remaining -= g;
    }
    const trailingGap = Math.max(0, totalLen - acc);
    if (trailingGap > 0) parts.push(Math.max(trailingGap, totalLen * 2)); // oversize gap to prevent pattern repetition
    return parts.join(' ');
  };

  if (shape === 'rect') {
    // Draw a stroke that hugs the table edge (centered on the outer "border" of the table)
    // so visually it sits exactly on the table outline, not inset.
    const drawW = Math.max(0, tableWidth - strokeWidth);
    const drawH = Math.max(0, tableHeight - strokeWidth);
    const x = strokeWidth / 2;
    const y = strokeWidth / 2;
    const rEff = Math.min(Math.max(0, borderRadiusPx), drawW / 2, drawH / 2);
    const perimeter = 2 * (drawW + drawH);
    const visibleLen = Math.max(0, Math.min(perimeter, progress * perimeter));
    const dashArray = buildDashedArray(visibleLen, perimeter, 3, 5); // dashed progress (unused with mask, kept for reference)
    const startX = x + drawW / 2;
    const startY = y;
    const d = [
      `M ${startX} ${startY}`,
      `H ${x + drawW - rEff}`,
      `A ${rEff} ${rEff} 0 0 1 ${x + drawW} ${y + rEff}`,
      `V ${y + drawH - rEff}`,
      `A ${rEff} ${rEff} 0 0 1 ${x + drawW - rEff} ${y + drawH}`,
      `H ${x + rEff}`,
      `A ${rEff} ${rEff} 0 0 1 ${x} ${y + drawH - rEff}`,
      `V ${y + rEff}`,
      `A ${rEff} ${rEff} 0 0 1 ${x + rEff} ${y}`,
      `H ${startX}`
    ].join(' ');
    const maskId = `seated-mask-${reservation.id}-rect`;
    return (
      <div className="absolute inset-0 pointer-events-none"
           style={{ transform: `rotate(${rotation}deg)`, transformOrigin: 'center' }}>
        <svg width={tableWidth} height={tableHeight}>
          <defs>
            <mask id={maskId}>
              <path
                d={d}
                fill="none"
                stroke="white"
                strokeWidth={strokeWidth + 1}
                pathLength={perimeter as unknown as number}
                strokeDasharray={`${perimeter} ${perimeter}`}
                strokeDashoffset={Math.max(0, perimeter - visibleLen)}
                strokeLinecap="butt"
              />
            </mask>
          </defs>
          {/* Base dashed track */}
          <path d={d} fill="none" stroke={color} strokeOpacity={0.25} strokeWidth={strokeWidth} strokeDasharray="3 5" strokeLinecap="butt" />
          {/* Masked dashed progress */}
          <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray="3 5" strokeLinecap="round" mask={`url(#${maskId})`} className={isExpired ? 'respoint-stroke-pulse' : undefined} />
        </svg>
      </div>
    );
  }
  // circle – stroke centered on the edge of the circular table,
  // starting at 12 o'clock and moving clockwise as time passes.
  const rx = Math.max(2, tableWidth / 2 - strokeWidth / 2);
  const ry = Math.max(2, tableHeight / 2 - strokeWidth / 2);
  const cx = tableWidth / 2;
  const cy = tableHeight / 2;

  const clampedProgress = Math.max(0, Math.min(1, progress));
  // Slightly below 1 to avoid full 360° arc issues with SVG A command
  const effectiveProgress = Math.min(clampedProgress, 0.9999);
  const angle = effectiveProgress * 2 * Math.PI;

  // Start at 12 o'clock (−90°) and sweep clockwise
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + angle;

  const x0 = cx + rx * Math.cos(startAngle);
  const y0 = cy + ry * Math.sin(startAngle);
  const x1 = cx + rx * Math.cos(endAngle);
  const y1 = cy + ry * Math.sin(endAngle);

  const largeArcFlag = angle > Math.PI ? 1 : 0;
  const sweepFlag = 1; // clockwise

  const d = `M ${x0} ${y0} A ${rx} ${ry} 0 ${largeArcFlag} ${sweepFlag} ${x1} ${y1}`;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ transform: `rotate(${rotation}deg)`, transformOrigin: 'center' }}
    >
      <svg width={tableWidth} height={tableHeight}>
        {/* Base dashed track around whole circle */}
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill="none"
          stroke={color}
          strokeOpacity={0.25}
          strokeWidth={strokeWidth}
          strokeDasharray="3 5"
        />
        {/* Progress arc: starts at 12h and grows clockwise */}
        {clampedProgress > 0 && (
          <path
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray="3 5"
            strokeLinecap="round"
            className={isExpired ? 'respoint-stroke-pulse' : undefined}
          />
        )}
      </svg>
    </div>
  );
};

// Outer progress stroke around table (outside with gap), filling as time approaches
const ProgressStrokeBase: React.FC<{
  shape: 'rect' | 'circle';
  tableWidth: number;
  tableHeight: number;
  rotation: number;
  color: string;
  reservationDate: string;
  reservationTime: string;
  createdAt?: string;
  gap?: number; // space between table edge and stroke
  strokeWidth?: number;
  windowMinutes?: number; // fallback window if createdAt missing
  borderRadiusPx?: number; // for rect shape, match table rounding
}> = ({
  shape,
  tableWidth,
  tableHeight,
  rotation,
  color,
  reservationDate,
  reservationTime,
  createdAt,
  gap = 4,
  strokeWidth = 4,
  windowMinutes = 60,
  borderRadiusPx = 8
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    const update = () => {
      try {
        const target = new Date(`${reservationDate}T${reservationTime}`);
        const now = new Date();
        if (isNaN(target.getTime())) { setProgress(0); return; }

        // Determine start time: reservation createdAt if provided, otherwise fallback (windowMinutes before target)
        const start = createdAt ? new Date(createdAt) : new Date(target.getTime() - windowMinutes * 60 * 1000);
        const startMs = start.getTime();
        const endMs = target.getTime();

        if (!isFinite(startMs) || startMs >= endMs) {
          // Fallback to last windowMinutes if createdAt invalid or after target
          const fallbackStart = new Date(target.getTime() - windowMinutes * 60 * 1000);
          const p =
            now.getTime() <= fallbackStart.getTime() ? 0 :
            now.getTime() >= endMs ? 1 :
            (now.getTime() - fallbackStart.getTime()) / (endMs - fallbackStart.getTime());
          setProgress(Math.max(0, Math.min(1, p)));
          return;
        }

        // Progress from creation time until arrival time
        const p =
          now.getTime() <= startMs ? 0 :
          now.getTime() >= endMs ? 1 :
          (now.getTime() - startMs) / (endMs - startMs);
        setProgress(Math.max(0, Math.min(1, p)));
      } catch {
        setProgress(0);
      }
    };

    update();
    interval = setInterval(update, 1000);
    return () => { if (interval) clearInterval(interval); };
  }, [reservationDate, reservationTime, createdAt, windowMinutes]);

  const isExpired = progress >= 1 - 1e-6;

  // Container grows to sit outside the table by gap + half stroke each side
  const outerPad = gap + strokeWidth;
  const containerW = tableWidth + outerPad * 2;
  const containerH = tableHeight + outerPad * 2;

  // We rotate the whole overlay to align with the table orientation
  // The inner SVG coordinates remain unrotated and we draw at (strokeWidth/2) margin.

  if (shape === 'rect') {
    const drawW = containerW - strokeWidth;
    const drawH = containerH - strokeWidth;
    // Effective corner radius applied on the ring (clamped to valid rect radius constraints)
    const rEff = Math.min(Math.max(0, borderRadiusPx + gap), drawW / 2, drawH / 2);
    // Build a path that starts at the middle of the top edge and goes clockwise
    const x = strokeWidth / 2;
    const y = strokeWidth / 2;
    const startX = x + drawW / 2;
    const startY = y;
    const d = [
      `M ${startX} ${startY}`,
      `H ${x + drawW - rEff}`,
      `A ${rEff} ${rEff} 0 0 1 ${x + drawW} ${y + rEff}`,
      `V ${y + drawH - rEff}`,
      `A ${rEff} ${rEff} 0 0 1 ${x + drawW - rEff} ${y + drawH}`,
      `H ${x + rEff}`,
      `A ${rEff} ${rEff} 0 0 1 ${x} ${y + drawH - rEff}`,
      `V ${y + rEff}`,
      `A ${rEff} ${rEff} 0 0 1 ${x + rEff} ${y}`,
      `H ${startX}`
    ].join(' ');

    return (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center',
          left: -outerPad,
          top: -outerPad,
          width: containerW,
          height: containerH
        }}
      >
        <svg width={containerW} height={containerH}>
          {/* Base track (always full ring) */}
          <rect
            x={strokeWidth / 2}
            y={strokeWidth / 2}
            width={drawW}
            height={drawH}
            rx={Math.max(0, borderRadiusPx + gap)}
            ry={Math.max(0, borderRadiusPx + gap)}
            fill="none"
            stroke={color}
            strokeOpacity={0.25}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <path
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            pathLength={1 as any}
            strokeDasharray={`${Math.max(0, Math.min(1, progress))} 1`}
            strokeLinecap="round"
            className={isExpired ? 'respoint-stroke-pulse' : undefined}
          />
        </svg>
        {isExpired ? (
          <div
            className="absolute inset-0 pointer-events-none respoint-glow-pulse-ring"
            style={{
              borderRadius: Math.max(0, (borderRadiusPx + gap + strokeWidth / 2)),
              zIndex: 10049,
              ['--rp-glow-color' as any]: color
            }}
          />
        ) : null}
      </div>
    );
  }

  // circle (ellipse) ring
  const rx = tableWidth / 2 + gap + strokeWidth / 2;
  const ry = tableHeight / 2 + gap + strokeWidth / 2;
  const cx = containerW / 2;
  const cy = containerH / 2;
  // Use pathLength normalization to express progress 0..1 and rotate so start is at 12 o'clock

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center',
        left: -outerPad,
        top: -outerPad,
        width: containerW,
        height: containerH
      }}
    >
      <svg width={containerW} height={containerH}>
        {/* Base track (always full ring) */}
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill="none"
          stroke={color}
          strokeOpacity={0.25}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          pathLength={1 as any}
        />
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          pathLength={1 as any}
          strokeDasharray={`${Math.max(0, Math.min(1, progress))} 1`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          className={isExpired ? 'respoint-stroke-pulse' : undefined}
        />
      </svg>
      {isExpired ? (
        <div
          className="absolute inset-0 pointer-events-none respoint-glow-pulse-ring"
          style={{ borderRadius: '9999px', zIndex: 10049, ['--rp-glow-color' as any]: color }}
        />
      ) : null}
    </div>
  );
};
const Canvas: React.FC<CanvasProps> = ({
  selectedTool,
  onToolChange,
  onAddTable,
  tableType,
  onUndo,
  onRedo,
  onResetLayout,
  showReservationForm,
  onCloseReservationForm,
  selectedDate,
  editReservation
}) => {
  const { t, currentLanguage } = useLanguage();
  const { user, isAuthenticated } = useContext(UserContext);
  const { hasPermission } = useRolePermissions();
  const { currentZone, zones } = useContext(ZoneContext);
  const { 
    layout, 
    setLayout, 
    currentLayoutId, 
    loadSavedLayout, 
    updateSavedLayout, 
    saveLayoutAs, 
    saveLayout, 
    zoneLayouts, 
    setZoneLayouts, 
    resetLayout, 
    undo, 
    redo, 
    canUndo, 
    canRedo, 
    isEditing, 
    setIsEditing,
    hasChanges,
    savedLayouts,
    deleteSavedLayout,
    getDefaultLayout 
  } = useCanvasLayout();
  
  // Subscribe to theme changes so Canvas (and the top toolbar within it) rerenders immediately
  const { theme } = useContext(ThemeContext);
  const isLight = theme === 'light';

  const { reservations } = useContext(ReservationContext);
  const { eventReservations } = useContext(EventContext);

  // Combine regular reservations with event reservations for canvas display
  // We map event reservations to a compatible shape for reuse in existing logic
  const combinedReservations = useMemo(() => {
    // Selected day keys (local YYYY-MM-DD)
    const selectedKey = (() => {
      const d = selectedDate || new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    })();
    const prevKey = (() => {
      const d = new Date(`${selectedKey}T00:00:00`);
      d.setDate(d.getDate() - 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    })();

    const timeToMin = (timeStr: string) => {
      const parts = String(timeStr || '').split(':');
      const h = Number(parts[0]) || 0;
      const m = Number(parts[1]) || 0;
      return (h % 24) * 60 + (m % 60);
    };
    const estimateDurationMinutes = (numGuests?: number) => {
      const g = typeof numGuests === 'number' ? numGuests : 2;
      if (g <= 2) return 60;
      if (g <= 4) return 120;
      return 150;
    };
    const prevAdjustments: Record<string, { start?: number; end?: number }> = (() => {
      try {
        const raw = localStorage.getItem(`respoint-duration-adjustments:${prevKey}`);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    })();

    // Map regular reservations with isEventReservation: false
    const mappedRegularReservations = reservations.map((r) => ({
      ...r,
      isEventReservation: false,
    }));
    // Map event reservations to a compatible interface
    const mappedEventReservations = eventReservations.map((er): Reservation & { isEventReservation: boolean; cleared?: boolean } => ({
      id: er.id,
      date: er.date,
      time: er.time,
      numberOfGuests: er.numberOfGuests,
      guestName: er.guestName,
      phone: er.phone || '',
      email: er.email || '',
      notes: er.notes || '',
      status: er.status === 'booked' ? 'waiting' : (er.status === 'arrived' ? 'arrived' : er.status === 'not_arrived' ? 'not_arrived' : 'cancelled') as any,
      tableIds: er.tableIds || [],
      zoneId: er.zoneId || '',
      color: er.color,
      isVip: er.isVip || false,
      createdAt: er.createdAt || new Date().toISOString(),
      updatedAt: er.updatedAt || new Date().toISOString(),
      user_id: er.userId,
      isEventReservation: true,
      cleared: er.cleared || false,
    }));

    // Spillover from previous day into selected day (show on table map as occupied/seated)
    const regularSpilloverForSelected = mappedRegularReservations
      .filter((r: any) => {
        if (r.date !== prevKey) return false;
        if ((r as any).cleared) return false;
        if (!(r.status === 'waiting' || r.status === 'confirmed' || r.status === 'arrived')) return false;
        const adj = prevAdjustments?.[r.id] || {};
        const startMin = typeof adj.start === 'number' ? adj.start : timeToMin(r.time);
        const endMin = typeof adj.end === 'number' ? adj.end : (startMin + estimateDurationMinutes(r.numberOfGuests));
        return endMin > 1440;
      })
      .map((r: any) => ({
        ...r,
        date: selectedKey,
        time: '00:00',
        // Preserve status: booked spillover stays waiting/confirmed, seated spillover stays arrived
        status: r.status,
        isEventReservation: false,
        __spilloverFromPrevDay: true,
        __spilloverSourceDate: prevKey,
        __spilloverSourceTime: r.time,
        __spilloverSourceStatus: r.status,
      }));

    const eventSpilloverForSelected = mappedEventReservations
      .filter((r: any) => {
        if (r.date !== prevKey) return false;
        if ((r as any).cleared) return false;
        // Allow both booked/waiting and arrived spillover
        if (!(r.status === 'waiting' || r.status === 'confirmed' || r.status === 'arrived')) return false;
        const adj = prevAdjustments?.[r.id] || {};
        const startMin = typeof adj.start === 'number' ? adj.start : timeToMin(r.time);
        const endMin = typeof adj.end === 'number' ? adj.end : (startMin + estimateDurationMinutes(r.numberOfGuests));
        return endMin > 1440;
      })
      .map((r: any) => ({
        ...r,
        date: selectedKey,
        time: '00:00',
        status: r.status,
        isEventReservation: true,
        __spilloverFromPrevDay: true,
        __spilloverSourceDate: prevKey,
        __spilloverSourceTime: r.time,
        __spilloverSourceStatus: r.status,
      }));

    // Combine both arrays + spillovers for selected day
    return [
      ...mappedRegularReservations,
      ...mappedEventReservations,
      ...regularSpilloverForSelected,
      ...eventSpilloverForSelected,
    ];
  }, [reservations, eventReservations, selectedDate]);

  // Track which reservation index to display for tables with multiple reservations
  const [tableReservationIndexes, setTableReservationIndexes] = useState<Record<string, number>>({});

  // Canvas view offset (per-device, per-zone) so each workstation can nudge the layout position
  const [canvasOffset, setCanvasOffset] = useState<{ x: number; y: number }>(() => {
    try {
      const userIdPart = user?.id ? `user_${user.id}` : 'user_anon';
      const zoneIdPart = currentZone?.id ? `zone_${currentZone.id}` : 'zone_default';
      const key = `respoint_canvas_offset_${userIdPart}_${zoneIdPart}`;
      return loadFromStorage<{ x: number; y: number }>(key, { x: 0, y: 0 });
    } catch {
      return { x: 0, y: 0 };
    }
  });

  // Track the zone/user that the current canvasOffset belongs to, to avoid saving stale values
  const offsetBelongsToRef = useRef<{ zoneId: string | undefined; userId: string | undefined }>({
    zoneId: currentZone?.id,
    userId: user?.id
  });

  // Reload offset when active user or zone changes
  useEffect(() => {
    try {
      const userIdPart = user?.id ? `user_${user.id}` : 'user_anon';
      const zoneIdPart = currentZone?.id ? `zone_${currentZone.id}` : 'zone_default';
      const key = `respoint_canvas_offset_${userIdPart}_${zoneIdPart}`;
      const stored = loadFromStorage<{ x: number; y: number }>(key, { x: 0, y: 0 });
      // Update the ref BEFORE setting state, so save effect knows offset now belongs to new zone
      offsetBelongsToRef.current = { zoneId: currentZone?.id, userId: user?.id };
      setCanvasOffset(stored);
    } catch {
      offsetBelongsToRef.current = { zoneId: currentZone?.id, userId: user?.id };
      setCanvasOffset({ x: 0, y: 0 });
    }
  }, [user?.id, currentZone?.id]);

  // Persist offset per device/zone - only save if offset belongs to current zone/user
  useEffect(() => {
    // Skip saving if the offset doesn't belong to the current zone/user (stale value from previous zone)
    if (offsetBelongsToRef.current.zoneId !== currentZone?.id ||
        offsetBelongsToRef.current.userId !== user?.id) {
      return;
    }
    try {
      const userIdPart = user?.id ? `user_${user.id}` : 'user_anon';
      const zoneIdPart = currentZone?.id ? `zone_${currentZone.id}` : 'zone_default';
      const key = `respoint_canvas_offset_${userIdPart}_${zoneIdPart}`;
      saveToStorage(key, canvasOffset);
    } catch {
      // ignore storage errors
    }
  }, [canvasOffset, user?.id, currentZone?.id]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  // Canvas bounds helpers to keep elements within visible area
  const getCanvasSize = () => {
    const el = canvasRef.current;
    const z = getZoom() || 1;
    return {
      // Adjust for app zoom (content is scaled by #app-zoom-root.style.zoom)
      width: el ? (el.clientWidth / z) : 0,
      height: el ? (el.clientHeight / z) : 0
    };
  };
  const clampX = (x: number, w: number = 0) => {
    const { width } = getCanvasSize();
    return Math.max(0, Math.min(x, Math.max(0, width - w)));
  };
  const clampY = (y: number, h: number = 0) => {
    const { height } = getCanvasSize();
    return Math.max(0, Math.min(y, Math.max(0, height - h)));
  };

  // On window resize, don't reposition elements; let the canvas clip overflow.
  // This prevents tables/chairs from being pushed when window gets smaller.
  useEffect(() => {
    const onResize = () => {
      // no-op, but keep hook in case we want to react to size changes later
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (hoverRafRef.current != null) {
        try { cancelAnimationFrame(hoverRafRef.current); } catch {}
        hoverRafRef.current = null;
      }
    };
  }, []);
  // Touch → mouse bridge so existing mouse handlers work on touchscreens
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const dispatchSyntheticMouse = (type: 'mousedown' | 'mousemove' | 'mouseup', t: Touch) => {
      const target = (document.elementFromPoint(t.clientX, t.clientY) as HTMLElement) || el;
      const evt = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: t.clientX,
        clientY: t.clientY,
        button: 0
      });
      target.dispatchEvent(evt);
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        dispatchSyntheticMouse('mousedown', e.touches[0]);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        dispatchSyntheticMouse('mousemove', e.touches[0]);
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches && e.changedTouches[0];
      if (t) {
        e.preventDefault();
        dispatchSyntheticMouse('mouseup', t);
      }
    };
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onTouchStart as any);
      el.removeEventListener('touchmove', onTouchMove as any);
      el.removeEventListener('touchend', onTouchEnd as any);
    };
  }, []);
  const dragStartPosition = useRef<{ x: number, y: number } | null>(null);
  const dragThresholdPassed = useRef(false);
  const isDraggingElements = useRef(false);
  const wasElementDragged = useRef(false);
  const groupScaleInitialStates = useRef<{ [id: string]: { x: number, y: number, width: number, height: number, rotation?: number, fontSize?: number, type?: string } }>({});
  const groupRotationInitialStates = useRef<{ [id: string]: { x: number, y: number, width: number, height: number, rotation: number } }>({});
  
  // Hover state for handles
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);
  const [showRotationAngle, setShowRotationAngle] = useState(false);
  const [currentRotationAngle, setCurrentRotationAngle] = useState(0);
  
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [selectedElementsBeforeDrag, setSelectedElementsBeforeDrag] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [layoutAtEditStart, setLayoutAtEditStart] = useState<Layout | null>(layout);
  const [interactionLayout, setInteractionLayout] = useState<Layout | null>(null);
  const [layoutBeforeDrag, setLayoutBeforeDrag] = useState<Layout | null>(null);
  const [editStartIndex, setEditStartIndex] = useState<number | null>(null);
  
  // Layout management state
  const [showLayoutList, setShowLayoutList] = useState(false);
  const [showSaveLayoutModal, setShowSaveLayoutModal] = useState(false);
  
  // GLOBAL MODAL INPUT LOCK FIX: Delayed ReservationForm rendering
  const [showForm, setShowForm] = useState(false);

  // Waiter panel open/close state for coordinating timeline animation
  const [isWaiterPanelOpen, setIsWaiterPanelOpen] = useState(false);
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);
  const [isTimelineOverlayOpen, setIsTimelineOverlayOpen] = useState(false);
  const prevTimelineCollapsedRef = useRef(false);
  useEffect(() => {
    const onOpen = () => {
      setIsWaiterPanelOpen(true);
      // Auto-close timeline overlay when waiter panel opens
      setIsTimelineOverlayOpen(false);
    };
    const onClose = () => setIsWaiterPanelOpen(false);
    window.addEventListener('waiter-open', onOpen as any);
    window.addEventListener('waiter-close', onClose as any);
    const onModalOpen = () => setIsAnyModalOpen(true);
    const onModalClose = () => setIsAnyModalOpen(false);
    window.addEventListener('modal-open', onModalOpen as any);
    window.addEventListener('modal-close', onModalClose as any);
    return () => {
      window.removeEventListener('waiter-open', onOpen as any);
      window.removeEventListener('waiter-close', onClose as any);
      window.removeEventListener('modal-open', onModalOpen as any);
      window.removeEventListener('modal-close', onModalClose as any);
    };
  }, []);
  
  // Sync timeline collapse with Layouts menu visibility
  useEffect(() => {
    if (showLayoutList) {
      prevTimelineCollapsedRef.current = isTimelineCollapsed;
      setIsTimelineCollapsed(true);
    } else {
      setIsTimelineCollapsed(prevTimelineCollapsedRef.current);
    }
  }, [showLayoutList]);
  
  // Alert modal state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    type: 'error' as 'info' | 'error' | 'success'
  });

  // --- Chair snapping helpers ---
  const CHAIR_SNAP_DISTANCE = 20; // px
  const CHAIR_SNAP_GAP = 1;       // px spacing from table edge (very close)
  const BOOTH_CURVED_THICKNESS_RATIO = 14 / 50; // SVG mask: height=50, t=14
  const BOOTH_U_THICKNESS_RATIO = 14 / 100;     // SVG mask: size=100, t=14

  // For special chair variants (booths), we want the inner edge to align to table,
  // not the outer bounding edge. This returns how far inward from the outer edge
  // the usable inner edge sits (approx), expressed in pixels relative to current size.
  const getChairVariantInsetPx = (variant: any, chairW: number, chairH: number): number => {
    const size = Math.min(chairW, chairH);
    switch (variant) {
      case 'booth':
      case 'boothCurved':
        return size * 0.22; // approx ring thickness for curved booth
      case 'boothU':
        return size * 0.20; // U booth wall thickness
      default:
        return 0;
    }
  };

  const rotatePoint = (px: number, py: number, cx: number, cy: number, rad: number) => {
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = px - cx;
    const dy = py - cy;
    return { x: cx + (dx * cos - dy * sin), y: cy + (dx * sin + dy * cos) };
  };

  const normalize = (vx: number, vy: number) => {
    const len = Math.sqrt(vx * vx + vy * vy) || 1;
    return { x: vx / len, y: vy / len };
  };

  // Recompute chair positions for chairs attached to the given circular tables.
  // Uses per-seat attachedAngleDeg when available; otherwise derives it from current world pose.
  // When shouldSnap is true, resulting chair top-left positions are snapped to grid.
  const glueCircularChairsToParents = (layoutObj: any, circleIds: Set<string>, shouldSnap: boolean): any => {
    if (!layoutObj) return layoutObj;
    const tables = Array.isArray(layoutObj.tables) ? layoutObj.tables : [];
    if (tables.length === 0 || circleIds.size === 0) return layoutObj;
    const byId = new Map<string, any>();
    tables.forEach((t: any) => byId.set(t.id, t));
    const nextTables = tables.map((t: any) => {
      if (!t || t.type !== 'chair' || !t.attachedToTableId || !circleIds.has(t.attachedToTableId)) return t;
      const parent = byId.get(t.attachedToTableId);
      if (!parent) return t;
      const centerX = (parent.x || 0) + (parent.width || 100) / 2;
      const centerY = (parent.y || 0) + (parent.height || 100) / 2;
      const parentRot = normalizeAngle(parent.rotation || 0);
      const variant = (t as any).chairVariant;
      // Determine base attached angle in parent's local (0 at +X), degrees
      let baseAngleDeg: number;
      if (typeof (t as any).attachedAngleDeg === 'number') {
        baseAngleDeg = (t as any).attachedAngleDeg;
      } else {
        const cx = (t.x || 0) + (t.width || 0) / 2;
        const cy = (t.y || 0) + (t.height || 0) / 2;
        const worldAngle = Math.atan2(cy - centerY, cx - centerX) * 180 / Math.PI;
        baseAngleDeg = normalizeAngle(worldAngle - parentRot);
      }
      const angleNowDeg = normalizeAngle(baseAngleDeg + parentRot);
      const rad = angleNowDeg * Math.PI / 180;
      const ux = Math.cos(rad);
      const uy = Math.sin(rad);
      // Arc booths on circular tables: resize to follow table radius, keep inner edge flush
      if ('arcInnerRatio' in (t as any) || variant === 'boothCurved' || variant === 'boothU') {
        // Only special-case circular parents – rectangles still use original size.
        let width = t.width || GRID_SIZE * 8;
        let height = t.height || GRID_SIZE * 8;
        let arcInnerRatio = (t as any).arcInnerRatio;
        if (parent.type === 'circle') {
          const tableW = Math.max(1, parent.width || GRID_SIZE * STANDARD_CIRCLE_GRID_CELLS);
          const r = tableW / 2;
          const thickness = variant === 'boothU' ? BOOTH_ARC_THICKNESS_U : BOOTH_ARC_THICKNESS_CURVED;
          const outerR = r + thickness;
          const outerD = outerR * 2;
          width = outerD;
          height = outerD;
          arcInnerRatio = (r / outerR) * 50;
        }
        const rotDeg = normalizeAngle(angleNowDeg + 90);
        const nx = centerX - width / 2;
        const ny = centerY - height / 2;
        return {
          ...t,
          width,
          height,
          x: shouldSnap ? snapToGrid(nx) : nx,
          y: shouldSnap ? snapToGrid(ny) : ny,
          rotation: rotDeg,
          arcInnerRatio,
          attachedAngleDeg: baseAngleDeg
        };
      }
      // Standard / barstool: place at radius plus offset and tangent-rotate.
      // For circular tables, use exact radius from width to follow true circle size.
      const r = (parent.type === 'circle')
        ? Math.max(1, (parent.width || 100)) / 2
        : Math.max(parent.width || 100, parent.height || 100) / 2;
      const w = t.width || GRID_SIZE * 3;
      const h = t.height || GRID_SIZE * 3;
      const inset = getChairVariantInsetPx(variant, w, h);
      const half = Math.min(w, h) / 2;
      const offset = Math.max(0, half - inset) + CHAIR_SNAP_GAP;
      const cx = centerX + ux * (r + offset);
      const cy = centerY + uy * (r + offset);
      const rotDeg = normalizeAngle(angleNowDeg + 90);
      const nx = cx - w / 2;
      const ny = cy - h / 2;
      return {
        ...t,
        x: shouldSnap ? snapToGrid(nx) : nx,
        y: shouldSnap ? snapToGrid(ny) : ny,
        rotation: rotDeg,
        attachedAngleDeg: baseAngleDeg
      };
    });
    return { ...layoutObj, tables: nextTables };
  };

  // Recompute chair positions for chairs attached to the given RECTANGULAR tables.
  // Uses per-chair attachedSide ('top'|'right'|'bottom'|'left'|'tl'|'tr'|'br'|'bl') and attachedT (0..1 along side)
  // plus attachedOffsetPx (outward offset from table edge). When metadata is missing, callers should run
  // ensureAttachedAngles (which also infers rectangle attachments) before calling this function.
  const glueRectChairsToParents = (layoutObj: any, rectIds: Set<string>, shouldSnap: boolean): any => {
    if (!layoutObj) return layoutObj;
    const tables = Array.isArray(layoutObj.tables) ? layoutObj.tables : [];
    if (tables.length === 0 || rectIds.size === 0) return layoutObj;
    const byId = new Map<string, any>();
    tables.forEach((t: any) => byId.set(t.id, t));
    const nextTables = tables.map((t: any) => {
      if (!t || t.type !== 'chair' || !t.attachedToTableId || !rectIds.has(t.attachedToTableId)) return t;
      const parent = byId.get(t.attachedToTableId);
      if (!parent || parent.type === 'circle') return t;
      // Parent geometry
      const w = Math.max(1, parent.width || GRID_SIZE * 6);
      const h = Math.max(1, parent.height || GRID_SIZE * 4);
      const cx = parent.x + w / 2;
      const cy = parent.y + h / 2;
      const halfW = w / 2;
      const halfH = h / 2;
      const rot = (parent.rotation || 0) * Math.PI / 180;
      const cos = Math.cos(rot), sin = Math.sin(rot);
      // Metadata
      const side: any = (t as any).attachedSide || 'top';
      const tt: number = typeof (t as any).attachedT === 'number' ? Math.max(0, Math.min(1, (t as any).attachedT)) : 0.5;
      const variant = (t as any).chairVariant;
      const chairW = t.width || GRID_SIZE * 3;
      const chairH = t.height || GRID_SIZE * 1;
      const inset = getChairVariantInsetPx(variant, chairW, chairH);
      const half = Math.min(chairW, chairH) / 2;
      const baseOffset = (variant === 'boothU') ? 0 : Math.max(0, half - inset) + CHAIR_SNAP_GAP;
      const customOff = Math.max(0, Number((t as any).attachedOffsetPx) || 0);
      const out = Math.max(baseOffset, customOff);
      // Local position on side/corner
      let lx = 0, ly = 0, nx = 0, ny = 0;
      switch (side) {
        case 'top':    lx = -halfW + tt * (2 * halfW); ly = -halfH; nx = 0; ny = -1; break;
        case 'bottom': lx = -halfW + tt * (2 * halfW); ly = +halfH; nx = 0; ny = +1; break;
        case 'left':   lx = -halfW; ly = -halfH + tt * (2 * halfH); nx = -1; ny = 0; break;
        case 'right':  lx = +halfW; ly = -halfH + tt * (2 * halfH); nx = +1; ny = 0; break;
        case 'tl':     lx = -halfW; ly = -halfH; nx = -1; ny = -1; break;
        case 'tr':     lx = +halfW; ly = -halfH; nx = +1; ny = -1; break;
        case 'br':     lx = +halfW; ly = +halfH; nx = +1; ny = +1; break;
        case 'bl':     lx = -halfW; ly = +halfH; nx = -1; ny = +1; break;
      }
      // Special placement for U-separé on rectangles: center is ±wall/2 from table center, not at the edge.
      if (variant === 'boothU' && (side === 'top' || side === 'bottom') && parent.type !== 'circle') {
        const wall = (t as any).boothThickness || RECT_U_WALL_PX;
        // Recompute U size from parent table so it always hugs the table on resize
        const sepW = w + wall * 2;
        const sepH = h + wall;
        const sign = side === 'top' ? -1 : 1;
        const localDx = 0;
        const localDy = sign * (wall / 2); // center offset so inner dno U je zalepljeno na ivicu stola
        const wx2 = cx + (localDx * Math.cos(rot) - localDy * Math.sin(rot));
        const wy2 = cy + (localDx * Math.sin(rot) + localDy * Math.cos(rot));
        const rotDeg2 = normalizeAngle((side === 'top' ? 0 : 180) + (parent.rotation || 0));
        const nxTopLeftX2 = wx2 - sepW / 2;
        const nxTopLeftY2 = wy2 - sepH / 2;
        return {
          ...t,
          x: shouldSnap ? snapToGrid(nxTopLeftX2) : nxTopLeftX2,
          y: shouldSnap ? snapToGrid(nxTopLeftY2) : nxTopLeftY2,
          width: sepW,
          height: sepH,
          rotation: rotDeg2,
          attachedSide: side,
          attachedT: 0.5,
          attachedOffsetPx: 0,
          boothThickness: wall
        };
      }
      if (variant === 'boothU' && (side === 'left' || side === 'right') && parent.type !== 'circle') {
        const wall = (t as any).boothThickness || RECT_U_WALL_PX;
        // Za levo/desno koristimo visinu stola kao „dužinu stranice“, analogno širini za top/bottom
        const sepW = h + wall * 2;
        const sepH = w + wall;
        const rotDeg = parent.rotation || 0;
        const rotRad = rotDeg * Math.PI / 180;
        const cxWorld = cx;
        const cyWorld = cy;
        const sign = side === 'left' ? -1 : 1;
        const localDx = sign * (wall / 2);
        const localDy = 0;
        const offX = localDx * Math.cos(rotRad) - localDy * Math.sin(rotRad);
        const offY = localDx * Math.sin(rotRad) + localDy * Math.cos(rotRad);
        const sepCenterX = cxWorld + offX;
        const sepCenterY = cyWorld + offY;
        const nxTopLeftX2 = sepCenterX - sepW / 2;
        const nxTopLeftY2 = sepCenterY - sepH / 2;
        const rotDeg2 = normalizeAngle((side === 'left' ? 270 : 90) + (parent.rotation || 0));
        return {
          ...t,
          x: shouldSnap ? snapToGrid(nxTopLeftX2) : nxTopLeftX2,
          y: shouldSnap ? snapToGrid(nxTopLeftY2) : nxTopLeftY2,
          width: sepW,
          height: sepH,
          rotation: rotDeg2,
          attachedSide: side,
          attachedT: 0.5,
          attachedOffsetPx: 0,
          boothThickness: wall
        };
      }
      // Normalize corner normal
      const nlen = Math.hypot(nx, ny) || 1;
      nx /= nlen; ny /= nlen;
      // Rotate to world
      const wx = cx + (lx * cos - ly * sin);
      const wy = cy + (lx * sin + ly * cos);
      // Outward offset in world space
      const offX = out * (nx * cos - ny * sin);
      const offY = out * (nx * sin + ny * cos);
      const ccx = wx + offX;
      const ccy = wy + offY;
      const rotDeg = normalizeAngle((Math.atan2(ny, nx) * 180 / Math.PI) + 90 + (parent.rotation || 0));
      const nxTopLeftX = ccx - chairW / 2;
      const nxTopLeftY = ccy - chairH / 2;
      return {
        ...t,
        x: shouldSnap ? snapToGrid(nxTopLeftX) : nxTopLeftX,
        y: shouldSnap ? snapToGrid(nxTopLeftY) : nxTopLeftY,
        rotation: rotDeg,
        attachedSide: side,
        attachedT: tt,
        attachedOffsetPx: out
      };
    });
    return { ...layoutObj, tables: nextTables };
  };

  // Ensure all chairs attached to circular tables have a persisted 'attachedAngleDeg' relative to the parent.
  // This prevents chairs from "slipping" during rotation/resize when their position hasn't been updated yet.
  const ensureAttachedAngles = (layoutObj: any): any => {
    if (!layoutObj || !Array.isArray(layoutObj.tables)) return layoutObj;
    let changed = false;
    const byId = new Map<string, any>();
    layoutObj.tables.forEach((t: any) => byId.set(t.id, t));
    
    const nextTables = layoutObj.tables.map((t: any) => {
      if (t && t.type === 'chair' && t.attachedToTableId && typeof t.attachedAngleDeg !== 'number') {
        const parent = byId.get(t.attachedToTableId);
        if (parent && parent.type === 'circle') {
          const parentRot = normalizeAngle(parent.rotation || 0);
          const parentCenterX = (parent.x || 0) + (parent.width || 100) / 2;
          const parentCenterY = (parent.y || 0) + (parent.height || 100) / 2;
          const chairCenterX = (t.x || 0) + (t.width || 0) / 2;
          const chairCenterY = (t.y || 0) + (t.height || 0) / 2;
          const worldAngle = Math.atan2(chairCenterY - parentCenterY, chairCenterX - parentCenterX) * 180 / Math.PI;
          const baseAngle = normalizeAngle(worldAngle - parentRot);
          changed = true;
          return { ...t, attachedAngleDeg: baseAngle };
        }
      }
      // Infer rectangular attachment (side, t position and outward offset)
      if (t && t.type === 'chair' && t.attachedToTableId && typeof (t as any).attachedSide !== 'string') {
        const parent = byId.get(t.attachedToTableId);
        if (parent && parent.type !== 'circle') {
          const w = Math.max(1, parent.width || GRID_SIZE * 6);
          const h = Math.max(1, parent.height || GRID_SIZE * 4);
          const cx = parent.x + w / 2;
          const cy = parent.y + h / 2;
          const halfW = w / 2;
          const halfH = h / 2;
          const rot = -((parent.rotation || 0) * Math.PI / 180); // inverse
          const chairCx = (t.x || 0) + (t.width || 0) / 2;
          const chairCy = (t.y || 0) + (t.height || 0) / 2;
          // Convert chair center to parent's local
          const dx = chairCx - cx;
          const dy = chairCy - cy;
          const lx = dx * Math.cos(rot) - dy * Math.sin(rot);
          const ly = dx * Math.sin(rot) + dy * Math.cos(rot);
          // Decide nearest side
          const dTop = Math.abs(ly + halfH);
          const dBottom = Math.abs(ly - halfH);
          const dLeft = Math.abs(lx + halfW);
          const dRight = Math.abs(lx - halfW);
          let side: any = 'top';
          let tpos = 0.5;
          let off = 0;
          if (dTop <= dBottom && dTop <= dLeft && dTop <= dRight) { side = 'top'; tpos = (lx + halfW) / (2 * halfW); off = Math.max(0, - (ly + halfH)); }
          else if (dBottom <= dLeft && dBottom <= dRight) { side = 'bottom'; tpos = (lx + halfW) / (2 * halfW); off = Math.max(0, ly - halfH); }
          else if (dLeft <= dRight) { side = 'left'; tpos = (ly + halfH) / (2 * halfH); off = Math.max(0, - (lx + halfW)); }
          else { side = 'right'; tpos = (ly + halfH) / (2 * halfH); off = Math.max(0, lx - halfW); }
          const clampedT = Math.max(0, Math.min(1, isFinite(tpos) ? tpos : 0.5));
          changed = true;
          return { ...t, attachedSide: side, attachedT: clampedT, attachedOffsetPx: off };
        }
      }
      return t;
    });
    
    if (!changed) return layoutObj;
    return { ...layoutObj, tables: nextTables };
  };

  // Build snap candidates (points with outward normals) for a single table
  const getSnapCandidatesForTable = (t: any): Array<{ x: number; y: number; nx: number; ny: number }> => {
    if (!t || t.type === 'chair') return [];
    const rotation = (t.rotation || 0) * Math.PI / 180;
    const w = Math.max(1, t.width || GRID_SIZE * 6);
    const h = Math.max(1, t.height || GRID_SIZE * 4);
    const cx = t.x + w / 2;
    const cy = t.y + h / 2;
    const candidates: Array<{ x: number; y: number; nx: number; ny: number }> = [];
    if (t.type === 'circle') {
      // Use exact circle radius from width to follow true table size
      const r = Math.max(1, w) / 2;
      const guides = t.chairGuides || {};
      const count = Math.max(0, Math.min(64, Number(guides.circleCount) || 0));
      if (count > 0) {
        const startDeg = ((Number(guides.circleStartDeg) || 0) % 360 + 360) % 360;
        for (let i = 0; i < count; i++) {
          const angleDeg = startDeg + (360 * i / count);
          const a = angleDeg * Math.PI / 180;
          const ux = Math.cos(a);
          const uy = Math.sin(a);
          const px = cx + ux * r;
          const py = cy + uy * r;
          const n = normalize(ux, uy);
          candidates.push({ x: px, y: py, nx: n.x, ny: n.y });
        }
      } else {
        // Fallback: 8 evenly distributed points
        const angles = [0, 45, 90, 135, 180, 225, 270, 315].map(a => a * Math.PI / 180);
        for (const a of angles) {
          const ux = Math.cos(a);
          const uy = Math.sin(a);
          const px = cx + ux * r;
          const py = cy + uy * r;
          const n = normalize(ux, uy);
          candidates.push({ x: px, y: py, nx: n.x, ny: n.y });
        }
      }
    } else {
      // Rectangle: compute corners and side midpoints in local space then rotate
      const halfW = w / 2;
      const halfH = h / 2;
      // Local points
      const localCorners = [
        { x: +halfW, y: +halfH, nx: +1, ny: +1 },   // br
        { x: -halfW, y: +halfH, nx: -1, ny: +1 },   // bl
        { x: +halfW, y: -halfH, nx: +1, ny: -1 },   // tr
        { x: -halfW, y: -halfH, nx: -1, ny: -1 }    // tl
      ];
      const localMids = [
        { x: 0,       y: -halfH, nx: 0,  ny: -1 },  // top mid
        { x: 0,       y: +halfH, nx: 0,  ny: +1 },  // bottom mid
        { x: -halfW,  y: 0,      nx: -1, ny: 0  },  // left mid
        { x: +halfW,  y: 0,      nx: +1, ny: 0  }   // right mid
      ];
      const transform = (p: { x: number; y: number; nx: number; ny: number }) => {
        const pr = rotatePoint(cx + p.x, cy + p.y, cx, cy, rotation);
        const nr = rotatePoint(cx + p.nx, cy + p.ny, cx, cy, rotation);
        const n = normalize(nr.x - cx, nr.y - cy);
        return { x: pr.x, y: pr.y, nx: n.x, ny: n.y };
      };
      // Keep default midpoints for generic snapping
      localMids.forEach(p => candidates.push(transform(p)));
      
      // Add user-defined chair guides (discrete snap points per side)
      const guides = t.chairGuides || {};
      const addSidePoints = (side: 'top' | 'right' | 'bottom' | 'left', count?: number) => {
        const n = Math.max(0, Math.min(32, Number(count) || 0)); // clamp reasonable
        if (n <= 0) return;
        for (let i = 1; i <= n; i++) {
          const frac = i / (n + 1); // evenly spaced, avoid corners
          let px = 0, py = 0, nx = 0, ny = 0;
          switch (side) {
            case 'top':
              px = -halfW + frac * (2 * halfW);
              py = -halfH;
              nx = 0; ny = -1;
              break;
            case 'bottom':
              px = -halfW + frac * (2 * halfW);
              py = +halfH;
              nx = 0; ny = +1;
              break;
            case 'left':
              px = -halfW;
              py = -halfH + frac * (2 * halfH);
              nx = -1; ny = 0;
              break;
            case 'right':
              px = +halfW;
              py = -halfH + frac * (2 * halfH);
              nx = +1; ny = 0;
              break;
          }
          const pr = rotatePoint(cx + px, cy + py, cx, cy, rotation);
          const nr = rotatePoint(cx + nx, cy + ny, cx, cy, rotation);
          const nrm = normalize(nr.x - cx, nr.y - cy);
          candidates.push({ x: pr.x, y: pr.y, nx: nrm.x, ny: nrm.y });
        }
      };
      addSidePoints('top', guides.top);
      addSidePoints('right', guides.right);
      addSidePoints('bottom', guides.bottom);
      addSidePoints('left', guides.left);
      
      // Optional corner seats if enabled per corner
      const addCornerPoint = (cornerKey: 'tl' | 'tr' | 'br' | 'bl', enabled?: boolean) => {
        if (!enabled) return;
        let p;
        switch (cornerKey) {
          case 'br': p = localCorners[0]; break;
          case 'bl': p = localCorners[1]; break;
          case 'tr': p = localCorners[2]; break;
          case 'tl': p = localCorners[3]; break;
        }
        if (!p) return;
        const pr = rotatePoint(cx + p.x, cy + p.y, cx, cy, rotation);
        const nr = rotatePoint(cx + p.nx, cy + p.ny, cx, cy, rotation);
        const nrm = normalize(nr.x - cx, nr.y - cy);
        candidates.push({ x: pr.x, y: pr.y, nx: nrm.x, ny: nrm.y });
      };
      addCornerPoint('tl', !!guides.cornerTL);
      addCornerPoint('tr', !!guides.cornerTR);
      addCornerPoint('br', !!guides.cornerBR);
      addCornerPoint('bl', !!guides.cornerBL);
    }
    return candidates;
  };

  const getAllSnapCandidates = (): Array<any> => {
    const list: Array<any> = [];
    (layout.tables || []).forEach(t => {
      if (t && t.type !== 'chair') {
        list.push(...getSnapCandidatesForTable(t));
        // Add center candidate for booth-style snapping
        const w = Math.max(1, t.width || GRID_SIZE * 6);
        const h = Math.max(1, t.height || GRID_SIZE * 4);
        const cx = t.x + w / 2;
        const cy = t.y + h / 2;
        list.push({ x: cx, y: cy, nx: 0, ny: 0, kind: 'center' });
      }
    });
    return list;
  };

  const getSnappedChairTopLeft = (proposedX: number, proposedY: number, chairW: number, chairH: number, variant?: any, rotationDeg?: number): { x: number; y: number; snapped: boolean } => {
    const cx = proposedX + chairW / 2;
    const cy = proposedY + chairH / 2;
    const candidates = getAllSnapCandidates();
    let bestEdge: null | { x: number; y: number; nx: number; ny: number; d: number } = null;
    let bestCenter: null | { x: number; y: number; d: number } = null;
    for (const p of candidates as any[]) {
      const dx = cx - p.x;
      const dy = cy - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= CHAIR_SNAP_DISTANCE) {
        if (p.kind === 'center') {
          if (!bestCenter || dist < bestCenter.d) bestCenter = { x: p.x, y: p.y, d: dist };
        } else {
          if (!bestEdge || dist < bestEdge.d) bestEdge = { x: p.x, y: p.y, nx: p.nx, ny: p.ny, d: dist };
        }
      }
    }
    // Prefer center-based snapping for booth variants when available
    const isBooth = variant === 'booth' || variant === 'boothCurved' || variant === 'boothU';
    if (isBooth && bestCenter) {
      return { x: bestCenter.x - chairW / 2, y: bestCenter.y - chairH / 2, snapped: true };
    }
    const best = bestEdge;
    if (!best) {
      return { x: proposedX, y: proposedY, snapped: false };
    }
    // Use variant-aware geometry so that the actual vector edge of the booth sits on the snap point
    const theta = ((rotationDeg || 0) % 360) * Math.PI / 180;
    let snappedCenterX = cx;
    let snappedCenterY = cy;
    if (variant === 'booth' || variant === 'boothCurved') {
      // Semi-circular: inner arc center is at bottom-center in local coords (w/2, h)
      const R = chairH; // outer radius equals element height
      const thickness = R * BOOTH_CURVED_THICKNESS_RATIO;
      const rInner = Math.max(0, R - thickness);
      const gap = 0;
      const arcCenterX = best.x - best.nx * (rInner + gap);
      const arcCenterY = best.y - best.ny * (rInner + gap);
      // Vector from box center to arc center: (0, h/2) in local coords
      const vLocalX = 0;
      const vLocalY = chairH / 2;
      const vWorldX = vLocalX * Math.cos(theta) - vLocalY * Math.sin(theta);
      const vWorldY = vLocalX * Math.sin(theta) + vLocalY * Math.cos(theta);
      const boxCenterX = arcCenterX - vWorldX;
      const boxCenterY = arcCenterY - vWorldY;
      snappedCenterX = boxCenterX;
      snappedCenterY = boxCenterY;
    } else if (variant === 'boothU') {
      // U-booth: treat inner boundary as a local-axis aligned rectangle inset by thickness
      const halfW = chairW / 2;
      const halfH = chairH / 2;
      const tW = chairW * BOOTH_U_THICKNESS_RATIO;
      const tH = chairH * BOOTH_U_THICKNESS_RATIO;
      // Transform the table normal into local chair axes
      const cosT = Math.cos(-theta);
      const sinT = Math.sin(-theta);
      const nxLocal = best.nx * cosT - best.ny * sinT;
      const nyLocal = best.nx * sinT + best.ny * cosT;
      const ox = Math.max(0, halfW - tW);
      const oy = Math.max(0, halfH - tH);
      // Magnitude from center to inner edge along that local normal
      const magnitude = Math.sqrt((Math.abs(nxLocal) * ox) ** 2 + (Math.abs(nyLocal) * oy) ** 2);
      const gap = 0;
      snappedCenterX = best.x + best.nx * (gap + magnitude);
      snappedCenterY = best.y + best.ny * (gap + magnitude);
    } else {
      // Standard & barstool: keep prior logic (inner edge at small gap)
    const half = Math.min(chairW, chairH) / 2;
      const inset = getChairVariantInsetPx(variant, chairW, chairH);
      const offset = Math.max(0, half - inset) + CHAIR_SNAP_GAP;
      snappedCenterX = best.x + best.nx * offset;
      snappedCenterY = best.y + best.ny * offset;
    }
    return { x: snappedCenterX - chairW / 2, y: snappedCenterY - chairH / 2, snapped: true };
  };

  // --- Auto-generate chairs from guides ---
  const getDefaultAutoChairSize = (variant: 'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU', orientation: 'horizontal' | 'vertical' | 'square') => {
    switch (variant) {
      case 'barstool':
        return { w: GRID_SIZE * 3, h: GRID_SIZE * 3 };
      case 'boothCurved': {
        const h = GRID_SIZE * 8;
        return { w: GRID_SIZE * 16, h };
      }
      case 'boothU': {
        const s = GRID_SIZE * 12;
        return { w: s, h: s };
      }
      default: {
        // Standard chair: always 3x1; rotation will align width with edge/corner tangent
        return { w: GRID_SIZE * 3, h: GRID_SIZE * 1 };
      }
    }
  };

  const buildGuidePointsWithLabels = (t: any): Array<{ x: number; y: number; nx: number; ny: number; label: 'top' | 'right' | 'bottom' | 'left' | 'tl' | 'tr' | 'br' | 'bl' | 'circle' }> => {
    if (!t || t.type === 'chair') return [];
    const rotation = (t.rotation || 0) * Math.PI / 180;
    const w = Math.max(1, t.width || GRID_SIZE * 6);
    const h = Math.max(1, t.height || GRID_SIZE * 4);
    const cx = t.x + w / 2;
    const cy = t.y + h / 2;
    const out: Array<{ x: number; y: number; nx: number; ny: number; label: any }> = [];
    if (t.type === 'circle') {
      // Use exact circle radius from width to match true table size
      const r = Math.max(1, w) / 2;
      const guides = t.chairGuides || {};
      const count = Math.max(0, Math.min(64, Number(guides.circleCount) || 0));
      const startDeg = ((Number(guides.circleStartDeg) || 0) % 360 + 360) % 360;
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const angleDeg = startDeg + (360 * i / count);
          const a = angleDeg * Math.PI / 180;
          const ux = Math.cos(a);
          const uy = Math.sin(a);
          const px = cx + ux * r;
          const py = cy + uy * r;
          const n = normalize(ux, uy);
          out.push({ x: px, y: py, nx: n.x, ny: n.y, label: 'circle' });
        }
      }
      return out;
    }
    const halfW = w / 2;
    const halfH = h / 2;
    const guides = t.chairGuides || {};
    const transform = (p: { x: number; y: number; nx: number; ny: number }) => {
      const pr = rotatePoint(cx + p.x, cy + p.y, cx, cy, rotation);
      const nr = rotatePoint(cx + p.nx, cy + p.ny, cx, cy, rotation);
      const n = normalize(nr.x - cx, nr.y - cy);
      return { x: pr.x, y: pr.y, nx: n.x, ny: n.y };
    };
    // Sides
    const addSidePoints = (side: 'top' | 'right' | 'bottom' | 'left', count?: number) => {
      const n = Math.max(0, Math.min(32, Number(count) || 0));
      for (let i = 1; i <= n; i++) {
        let frac = i / (n + 1);
        // Slightly spread chairs to increase gaps between them (keep small margins to edges)
        if (n >= 2) {
          const SIDE_SPREAD = 1.12; // ~12% further from center -> bigger gaps
          frac = 0.5 + (frac - 0.5) * SIDE_SPREAD;
          frac = Math.max(0.08, Math.min(0.92, frac));
        }
        let p = { x: 0, y: 0, nx: 0, ny: 0 };
        switch (side) {
          case 'top':    p = { x: -halfW + frac * (2 * halfW), y: -halfH, nx: 0, ny: -1 }; break;
          case 'bottom': p = { x: -halfW + frac * (2 * halfW), y: +halfH, nx: 0, ny: +1 }; break;
          case 'left':   p = { x: -halfW, y: -halfH + frac * (2 * halfH), nx: -1, ny: 0 }; break;
          case 'right':  p = { x: +halfW, y: -halfH + frac * (2 * halfH), nx: +1, ny: 0 }; break;
        }
        const tr = transform(p);
        out.push({ ...tr, label: side });
      }
    };
    addSidePoints('top', guides.top);
    addSidePoints('right', guides.right);
    addSidePoints('bottom', guides.bottom);
    addSidePoints('left', guides.left);
    // Corners
    const addCorner = (key: 'tl' | 'tr' | 'br' | 'bl', enabled?: boolean) => {
      if (!enabled) return;
      let p;
      switch (key) {
        case 'br': p = { x: +halfW, y: +halfH, nx: +1, ny: +1 }; break;
        case 'bl': p = { x: -halfW, y: +halfH, nx: -1, ny: +1 }; break;
        case 'tr': p = { x: +halfW, y: -halfH, nx: +1, ny: -1 }; break;
        case 'tl': p = { x: -halfW, y: -halfH, nx: -1, ny: -1 }; break;
      }
      if (!p) return;
      const tr = transform(p as any);
      out.push({ ...tr, label: key });
    };
    addCorner('tl', !!guides.cornerTL);
    addCorner('tr', !!guides.cornerTR);
    addCorner('br', !!guides.cornerBR);
    addCorner('bl', !!guides.cornerBL);
    return out;
  };

  const autoGenerateChairsForTable = (baseLayout: any, tableId: string): any => {
    const currentTables = Array.isArray(baseLayout?.tables) ? baseLayout.tables : [];
    const table = currentTables.find((t: any) => t.id === tableId && t.type !== 'chair');
    if (!table) return baseLayout;
    const guides = table.chairGuides || {};
    // Remove previously attached chairs for this table
    const kept = currentTables.filter((t: any) => !(t.type === 'chair' && (t as any).attachedToTableId === table.id));
    // Special handling for circular tables to support per-seat variants
    if (table.type === 'circle') {
      const toAdd: any[] = [];
      const w = Math.max(1, table.width || GRID_SIZE * 8);
      const h = Math.max(1, table.height || GRID_SIZE * 8);
      const cx = table.x + w / 2;
      const cy = table.y + h / 2;
      const r = Math.max(w, h) / 2;
      const chairWidthOverride = Number.isFinite(guides.chairWidthPx) ? Math.max(4, Number(guides.chairWidthPx)) : undefined;
      const chairHeightOverride = Number.isFinite(guides.chairHeightPx) ? Math.max(4, Number(guides.chairHeightPx)) : undefined;
      const count = Math.max(0, Math.min(64, Number(guides.circleCount) || 0));
      const startDeg = ((Number(guides.circleStartDeg) || 0) % 360 + 360) % 360;
      const perSeatVariants: Array<'standard' | 'barstool' | 'booth' | 'boothCurved' | 'boothU'> =
        Array.from({ length: count }, (_, i) => (guides.circleVariants?.[i] || guides.circleVariant || 'standard'));
      const perSeatSizes: Array<{ w?: number; h?: number }> | undefined =
        (guides as any).circleSeatSizes || undefined;
      if (count > 0) {
        // 1) Pronađi centre svih separea (polukružni i U) – oni definišu blokirane polovine kruga.
        const arcCenters: number[] = [];
        for (let i = 0; i < count; i++) {
          const v = perSeatVariants[i];
          if (v === 'boothCurved' || v === 'boothU') {
            const angleDeg = startDeg + (360 * i / count);
            arcCenters.push(normalizeAngle(angleDeg));
          }
        }

        // Izgradi blokirane intervale oko svakog separea (±90°).
        const buildBlockedIntervals = (): Array<{ start: number; end: number }> => {
          const intervals: Array<{ start: number; end: number }> = [];
          const pushInterval = (start: number, end: number) => {
            const s = normalizeAngle(start);
            const e = normalizeAngle(end);
            if (s === e) return;
            if (s < e) {
              intervals.push({ start: s, end: e });
            } else {
              intervals.push({ start: s, end: 360 });
              intervals.push({ start: 0, end: e });
            }
          };

          for (const c of arcCenters) {
            pushInterval(c - 90, c + 90);
          }

          if (!intervals.length) return [];

          intervals.sort((a, b) => a.start - b.start);
          const merged: Array<{ start: number; end: number }> = [];
          let cur = { ...intervals[0] };
          for (let i = 1; i < intervals.length; i++) {
            const iv = intervals[i];
            if (iv.start <= cur.end) {
              cur.end = Math.max(cur.end, iv.end);
            } else {
              merged.push(cur);
              cur = { ...iv };
            }
          }
          merged.push(cur);
          return merged;
        };

        const blocked = buildBlockedIntervals();

        // 2) Izračunaj slobodne lukove (komplement blokiranih u [0, 360)).
        const freeArcs: Array<{ start: number; end: number }> = [];
        if (!blocked.length) {
          freeArcs.push({ start: 0, end: 360 });
        } else {
          let cursor = 0;
          for (const iv of blocked) {
            if (iv.start > cursor) {
              freeArcs.push({ start: cursor, end: iv.start });
            }
            cursor = Math.max(cursor, iv.end);
          }
          if (cursor < 360) {
            freeArcs.push({ start: cursor, end: 360 });
          }
        }

        const totalFreeAngle = freeArcs.reduce((sum, iv) => sum + (iv.end - iv.start), 0);

        // 3) Prvo dodaj sve separe-e kao kružne lukove na centru stola.
        for (let i = 0; i < count; i++) {
          const variant = perSeatVariants[i];
          if (variant !== 'boothCurved' && variant !== 'boothU') continue;

          const angleDeg = startDeg + (360 * i / count);
          const a = angleDeg * Math.PI / 180;
          const thickness = variant === 'boothCurved' ? BOOTH_ARC_THICKNESS_CURVED : BOOTH_ARC_THICKNESS_U;
          const outerR = r + thickness;
          const outerD = outerR * 2;
          const innerRatio = (r / outerR) * 50; // viewBox units for inner arc radius
          const rotationDeg = ((Math.atan2(Math.sin(a), Math.cos(a)) + Math.PI / 2) * 180 / Math.PI + 360) % 360;
          toAdd.push({
            id: `chair-${table.id}-${Date.now()}-${i}`,
            number: 0,
            name: '',
            seats: 4, // polukružni i U separe se računaju kao 4 mesta
            x: clampX(cx - outerD / 2, outerD),
            y: clampY(cy - outerD / 2, outerD),
            width: outerD,
            height: outerD,
            type: 'chair' as const,
            chairVariant: variant as any,
            rotation: rotationDeg,
            color: '#CBD5E1',
            status: 'available' as const,
            attachedToTableId: table.id,
            attachedAngleDeg: angleDeg,
            arcInnerRatio: innerRatio // for rendering an exact arc in the chair component
          });
        }

        // 4) Skupljamo indekse za obične stolice (standard / barstool / booth).
        const seatIndices: number[] = [];
        for (let i = 0; i < count; i++) {
          const v = perSeatVariants[i];
          if (v !== 'boothCurved' && v !== 'boothU') {
            seatIndices.push(i);
          }
        }

        const m = seatIndices.length;
        if (m > 0) {
          if (!arcCenters.length || totalFreeAngle <= 0) {
            // Nema separea – rasporedi stolice klasično oko celog kruga.
            for (let idx = 0; idx < m; idx++) {
              const i = seatIndices[idx];
              const variant = perSeatVariants[i];
              const angleDeg = startDeg + (360 * i / count);
              const a = angleDeg * Math.PI / 180;
              const baseSize = getDefaultAutoChairSize(variant as any, 'horizontal');
              const szOverride = perSeatSizes && perSeatSizes[i] ? perSeatSizes[i] : undefined;
              const size = { w: baseSize.w, h: baseSize.h };
              if (szOverride?.w != null) {
                size.w = Math.max(4, szOverride.w);
              } else if (chairWidthOverride != null) {
                size.w = chairWidthOverride;
              }
              if (szOverride?.h != null) {
                size.h = Math.max(4, szOverride.h);
              } else if (chairHeightOverride != null) {
                size.h = chairHeightOverride;
              }
              const inset = getChairVariantInsetPx(variant, size.w, size.h);
              const half = Math.min(size.w, size.h) / 2;
              const offset = Math.max(0, half - inset) + CHAIR_SNAP_GAP;
              const centerX = cx + Math.cos(a) * (r + offset);
              const centerY = cy + Math.sin(a) * (r + offset);
              const rotationDeg = ((Math.atan2(Math.sin(a), Math.cos(a)) + Math.PI / 2) * 180 / Math.PI + 360) % 360;
              toAdd.push({
                id: `chair-${table.id}-${Date.now()}-${i}`,
                number: 0,
                name: '',
                seats: 1,
                x: clampX(centerX - size.w / 2, size.w),
                y: clampY(centerY - size.h / 2, size.h),
                width: size.w,
                height: size.h,
                type: 'chair' as const,
                chairVariant: variant as any,
                rotation: rotationDeg,
                color: '#CBD5E1',
                status: 'available' as const,
                attachedToTableId: table.id,
                attachedAngleDeg: angleDeg
              });
            }
          } else {
            // Postoje separe-i: rasporedi stolice SAMO po slobodnim lukovima,
            // ravnomerno po ukupnoj slobodnoj dužini (isti algoritam kao u AddSeatsModal preview-u).
            for (let idx = 0; idx < m; idx++) {
              const i = seatIndices[idx];
              const variant = perSeatVariants[i];
              const target = ((idx + 1) / (m + 1)) * totalFreeAngle;
              let remaining = target;
              let angleAbs = 0;
              for (const arc of freeArcs) {
                const len = arc.end - arc.start;
                if (remaining <= len) {
                  angleAbs = arc.start + remaining;
                  break;
                }
                remaining -= len;
              }
              const finalAngle = normalizeAngle(angleAbs);
              const a = finalAngle * Math.PI / 180;

              const baseSize = getDefaultAutoChairSize(variant as any, 'horizontal');
              const szOverride = perSeatSizes && perSeatSizes[i] ? perSeatSizes[i] : undefined;
              const size = { w: baseSize.w, h: baseSize.h };
              if (szOverride?.w != null) {
                size.w = Math.max(4, szOverride.w);
              } else if (chairWidthOverride != null) {
                size.w = chairWidthOverride;
              }
              if (szOverride?.h != null) {
                size.h = Math.max(4, szOverride.h);
              } else if (chairHeightOverride != null) {
                size.h = chairHeightOverride;
              }
              const inset = getChairVariantInsetPx(variant, size.w, size.h);
              const half = Math.min(size.w, size.h) / 2;
              const offset = Math.max(0, half - inset) + CHAIR_SNAP_GAP;
              const centerX = cx + Math.cos(a) * (r + offset);
              const centerY = cy + Math.sin(a) * (r + offset);
              const rotationDeg = ((Math.atan2(Math.sin(a), Math.cos(a)) + Math.PI / 2) * 180 / Math.PI + 360) % 360;
              toAdd.push({
                id: `chair-${table.id}-${Date.now()}-${i}`,
                number: 0,
                name: '',
                seats: 1,
                x: clampX(centerX - size.w / 2, size.w),
                y: clampY(centerY - size.h / 2, size.h),
                width: size.w,
                height: size.h,
                type: 'chair' as const,
                chairVariant: variant as any,
                rotation: rotationDeg,
                color: '#CBD5E1',
                status: 'available' as const,
                attachedToTableId: table.id,
                attachedAngleDeg: finalAngle
              });
            }
          }
        }
      }
      const withChairs = [...kept, ...toAdd];
      // Ažuriraj broj mesta na parent kružnom stolu na osnovu attached stolica.
      const totalSeats = withChairs
        .filter((t: any) => t && t.type === 'chair' && t.attachedToTableId === table.id)
        .reduce((sum: number, ch: any) => sum + (Number(ch.seats) || 0), 0);
      const tablesWithSeatCount = withChairs.map((t: any) =>
        t.id === table.id ? { ...t, seats: Math.max(0, totalSeats) } : t
      );
      return {
        ...baseLayout,
        tables: tablesWithSeatCount
      };
    }
    // Rectangle: compute positions per-side with optional spacing and per-seat size overrides
    const toAdd: any[] = [];
    const w = Math.max(1, table.width || GRID_SIZE * 6);
    const h = Math.max(1, table.height || GRID_SIZE * 4);
    const cx = table.x + w / 2;
    const cy = table.y + h / 2;
    const halfW = w / 2;
    const halfH = h / 2;
    const rot = (table.rotation || 0) * Math.PI / 180;
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const chairWidthOverride = Number.isFinite(guides.chairWidthPx) ? Math.max(4, Number(guides.chairWidthPx)) : undefined;
    const chairHeightOverride = Number.isFinite(guides.chairHeightPx) ? Math.max(4, Number(guides.chairHeightPx)) : undefined;
    const spacingPx = Number.isFinite(guides.chairSpacingPx) ? Math.max(0, Number(guides.chairSpacingPx)) : 0;
    const pushChair = (lx: number, ly: number, nx: number, ny: number, variant: any, orient: 'horizontal'|'vertical'|'square', sideLabel: string, tNorm: number, key: string, sizeOv?: { w?: number; h?: number }) => {
      const baseSize = getDefaultAutoChairSize(variant as any, orient);
      const size = {
        w: baseSize.w,
        h: baseSize.h
      };
      if (variant === 'boothCurved' || variant === 'boothU') {
        if (sizeOv?.w != null) size.w = sizeOv.w;
        if (sizeOv?.h != null) size.h = sizeOv.h;
      } else {
        if (sizeOv?. w != null) {
          size.w = Math.max(4, sizeOv.w);
        } else if (chairWidthOverride != null) {
          size.w = chairWidthOverride;
        }
        if (sizeOv?. h != null) {
          size.h = Math.max(4, sizeOv.h);
        } else if (chairHeightOverride != null) {
          size.h = chairHeightOverride;
        }
      }
      // Bar stool chairs should always be square so they render as perfect circles
      if (variant === 'barstool') {
        const side = Math.max(size.w, size.h);
        size.w = side;
        size.h = side;
      }
      const inset = getChairVariantInsetPx(variant, size.w, size.h);
      const half = Math.min(size.w, size.h) / 2;
      const baseOffset = Math.max(0, half - inset) + CHAIR_SNAP_GAP;
      const isCorner = sideLabel === 'tl' || sideLabel === 'tr' || sideLabel === 'br' || sideLabel === 'bl';
      // For corner chairs, pull them closer to the table so they visually "hug" the corner
      const offset = isCorner ? baseOffset * 0.55 : baseOffset;
      // local -> world
      const wx = cx + (lx * cos - ly * sin);
      const wy = cy + (lx * sin + ly * cos);
      const wxn = offset * (nx * cos - ny * sin);
      const wyn = offset * (nx * sin + ny * cos);
      const ccx = wx + wxn;
      const ccy = wy + wyn;
      const rotationDeg = ((Math.atan2(ny, nx) * 180 / Math.PI) + 90 + (table.rotation || 0) + 360) % 360;
      toAdd.push({
        id: `chair-${table.id}-${Date.now()}-${key}`,
        number: 0,
        name: '',
        seats: 1,
        x: clampX(ccx - size.w / 2, size.w),
        y: clampY(ccy - size.h / 2, size.h),
        width: size.w,
        height: size.h,
        type: 'chair' as const,
        chairVariant: variant as any,
        rotation: rotationDeg,
        color: '#CBD5E1',
        status: 'available' as const,
        attachedToTableId: table.id,
        attachedSide: sideLabel,
        attachedT: tNorm,
        attachedOffsetPx: offset
      });
    };
    const sides: Array<{side:'top'|'right'|'bottom'|'left'; count:number; variant:any; orient:'horizontal'|'vertical'}> = [
      { side: 'top', count: Math.max(0, Number(guides.top) || 0), variant: guides.topVariant || 'standard', orient: 'horizontal' },
      { side: 'right', count: Math.max(0, Number(guides.right) || 0), variant: guides.rightVariant || 'standard', orient: 'vertical' },
      { side: 'bottom', count: Math.max(0, Number(guides.bottom) || 0), variant: guides.bottomVariant || 'standard', orient: 'horizontal' },
      { side: 'left', count: Math.max(0, Number(guides.left) || 0), variant: guides.leftVariant || 'standard', orient: 'vertical' },
    ];
    sides.forEach(({ side, count, variant, orient }) => {
      if (count <= 0) return;
      const perSeatSizes: Array<{ w?: number; h?: number }> | undefined =
        (side === 'top' ? (guides as any).topSeatSizes
          : side === 'right' ? (guides as any).rightSeatSizes
          : side === 'bottom' ? (guides as any).bottomSeatSizes
          : (guides as any).leftSeatSizes) || undefined;
      if (side === 'top' || side === 'bottom') {
        const length = 2 * halfW;
        const step = (length - spacingPx * Math.max(0, count - 1)) / (count + 1);
        // Special handling for U-shaped separé on top/bottom: wrap whole table, not per-seat placement
        if (variant === 'boothU' && table.type !== 'circle') {
          // Only one U-separé per side makes sense; ignore extra counts
          const wall = RECT_U_WALL_PX;
          const sepW = w + wall * 2;
          const sepH = h + wall;
          // Orient U tako da je otvor uvek okrenut ka stolu:
          // - top: otvor na dole  (0° + rotacija stola)
          // - bottom: otvor na gore (180° + rotacija stola)
          const rotDeg = normalizeAngle((side === 'top' ? 0 : 180) + (table.rotation || 0));
          const rotRad = (table.rotation || 0) * Math.PI / 180;
          const cxWorld = cx;
          const cyWorld = cy;
          // Desired: inner bottom of U is flush with table top (Top) / inner top flush with table bottom (Bottom).
          // This is achieved by placing U-center at ±wall/2 along table's local Y axis.
          const sign = side === 'top' ? -1 : 1;
          const localDx = 0;
          const localDy = sign * (wall / 2);
          const offX = localDx * Math.cos(rotRad) - localDy * Math.sin(rotRad);
          const offY = localDx * Math.sin(rotRad) + localDy * Math.cos(rotRad);
          const sepCenterX = cxWorld + offX;
          const sepCenterY = cyWorld + offY;
          const nx = sepCenterX - sepW / 2;
          const ny = sepCenterY - sepH / 2;
          toAdd.push({
            id: `chair-${table.id}-${Date.now()}-${side}-u`,
            number: 0,
            name: '',
            seats: 1,
            x: clampX(nx, sepW),
            y: clampY(ny, sepH),
            width: sepW,
            height: sepH,
            type: 'chair' as const,
            chairVariant: variant as any,
            rotation: rotDeg,
            color: '#CBD5E1',
            status: 'available' as const,
            attachedToTableId: table.id,
            attachedSide: side,
            attachedT: 0.5,
            attachedOffsetPx: 0,
            boothThickness: wall
          });
        } else {
          for (let i = 1; i <= count; i++) {
            const lx = -halfW + step * i + spacingPx * (i - 1);
            const ly = side === 'top' ? -halfH : +halfH;
            const tNorm = (lx + halfW) / (2 * halfW);
            const nx = 0, ny = side === 'top' ? -1 : +1;
            let sz = perSeatSizes && perSeatSizes[i - 1] ? perSeatSizes[i - 1] : undefined;
            pushChair(lx, ly, nx, ny, variant, 'horizontal', side, tNorm, `${side}-${i}`, sz);
          }
        }
      } else {
        const length = 2 * halfH;
        const step = (length - spacingPx * Math.max(0, count - 1)) / (count + 1);
        // Poseban slučaj za U separe na levoj/desnoj strani: kao na vrhu/dnu – jedan U koji obuhvata celu stranu.
        // Pošto je U rotiran za 90°/270°, ovde koristimo visinu stola kao „dužinu stranice“, analogno širini za top/bottom.
        if (variant === 'boothU' && table.type !== 'circle') {
          const wall = RECT_U_WALL_PX;
          // Arms along vertical side → koriste height stola
          const sepW = h + wall * 2;
          const sepH = w + wall;
          const rotDeg = table.rotation || 0;
          const rotRad = rotDeg * Math.PI / 180;
          const cxWorld = cx;
          const cyWorld = cy;
          const sign = side === 'left' ? -1 : 1;
          const localDx = sign * (wall / 2);
          const localDy = 0;
          const offX = localDx * Math.cos(rotRad) - localDy * Math.sin(rotRad);
          const offY = localDx * Math.sin(rotRad) + localDy * Math.cos(rotRad);
          const sepCenterX = cxWorld + offX;
          const sepCenterY = cyWorld + offY;
          const nxTopLeftX = sepCenterX - sepW / 2;
          const nxTopLeftY = sepCenterY - sepH / 2;
          const finalRot = normalizeAngle((side === 'left' ? 270 : 90) + (table.rotation || 0));
          toAdd.push({
            id: `chair-${table.id}-${Date.now()}-${side}-u`,
            number: 0,
            name: '',
            seats: 1,
            x: clampX(nxTopLeftX, sepW),
            y: clampY(nxTopLeftY, sepH),
            width: sepW,
            height: sepH,
            type: 'chair' as const,
            chairVariant: variant as any,
            rotation: finalRot,
            color: '#CBD5E1',
            status: 'available' as const,
            attachedToTableId: table.id,
            attachedSide: side,
            attachedT: 0.5,
            attachedOffsetPx: 0,
            boothThickness: wall
          });
        } else {
        for (let i = 1; i <= count; i++) {
          const ly = -halfH + step * i + spacingPx * (i - 1);
          const lx = side === 'left' ? -halfW : +halfW;
          const tNorm = (ly + halfH) / (2 * halfH);
          const nx = side === 'left' ? -1 : +1, ny = 0;
          let sz = perSeatSizes && perSeatSizes[i - 1] ? perSeatSizes[i - 1] : undefined;
          if (!sz && variant === 'boothU' && table.type !== 'circle') {
            const thickness = BOOTH_ARC_THICKNESS_U;
            const outer = length + 2 * thickness;
            sz = { w: outer, h: outer };
          }
          pushChair(lx, ly, nx, ny, variant, 'vertical', side, tNorm, `${side}-${i}`, sz);
          }
        }
      }
    });
    // Corners
    const corners: Array<{label:'tl'|'tr'|'br'|'bl'; enabled:boolean; variant:any; lx:number; ly:number; nx:number; ny:number; rot:number}> = [
      { label:'tl', enabled: !!guides.cornerTL, variant: guides.cornerTLVariant || 'standard', lx:-halfW, ly:-halfH, nx:-1, ny:-1, rot:45 },
      { label:'tr', enabled: !!guides.cornerTR, variant: guides.cornerTRVariant || 'standard', lx:+halfW, ly:-halfH, nx:+1, ny:-1, rot:-45 },
      { label:'br', enabled: !!guides.cornerBR, variant: guides.cornerBRVariant || 'standard', lx:+halfW, ly:+halfH, nx:+1, ny:+1, rot:45 },
      { label:'bl', enabled: !!guides.cornerBL, variant: guides.cornerBLVariant || 'standard', lx:-halfW, ly:+halfH, nx:-1, ny:+1, rot:-45 },
    ];
    corners.forEach(c => {
      if (!c.enabled) return;
      // For corners treat orient as square for base size
      const szOverride =
        c.label === 'tl' ? { w: (guides as any).cornerTLWidthPx, h: (guides as any).cornerTLHeightPx }
        : c.label === 'tr' ? { w: (guides as any).cornerTRWidthPx, h: (guides as any).cornerTRHeightPx }
        : c.label === 'br' ? { w: (guides as any).cornerBRWidthPx, h: (guides as any).cornerBRHeightPx }
        : { w: (guides as any).cornerBLWidthPx, h: (guides as any).cornerBLHeightPx };
      pushChair(c.lx, c.ly, c.nx, c.ny, c.variant, 'square', c.label, 0.5, `c-${c.label}`, szOverride);
    });
    return {
      ...baseLayout,
      tables: [...kept, ...toAdd]
    };
  };

  // Delayed rendering for ReservationForm to prevent input lock issues
  useEffect(() => {
    if (showReservationForm) {
      console.log('🚀 Canvas ReservationForm opening with delayed content rendering...');
      console.log('📍 Active element on modal open:', document.activeElement);
      const timeout = setTimeout(() => setShowForm(true), 0);
      return () => clearTimeout(timeout);
    } else {
      setShowForm(false);
      // Clear hover state when closing reservation form
      setHoveredTable(null);
    }
  }, [showReservationForm]);

  // Debug currentLayoutId changes
  useEffect(() => {
    console.log('Current layout ID changed to:', currentLayoutId);
  }, [currentLayoutId]);

  // Track changes when layout changes
  useEffect(() => {
    if (isEditing && layoutAtEditStart) {
      const layoutChanged = JSON.stringify(layout) !== JSON.stringify(layoutAtEditStart);
      // hasChanges comes from useCanvasLayout hook, no need to set it here
    }
  }, [layout, layoutAtEditStart, isEditing]);

  // When zone changes, exit edit mode and clean up state
  useEffect(() => {
    // If we were editing, exit edit mode without saving
    if (isEditing) {
      setIsEditing(false);
    }
    
    // Reset all editing-related state for the new zone
    setSelectedElements([]);
    setSelectedElementsBeforeDrag([]);
    setInteractionLayout(null);
    setLayoutAtEditStart(null);
    setEditingTableId(null);
    setTableNameInput('');
    setGroupTotalRotation(0); // Reset group rotation
    
    // Clear any drawing or selection states
    setIsDrawing(false);
    setIsMarqueeSelecting(false);
    setIsDragging(false);
    setIsResizingTable(false);
    setIsResizingWall(false);
    setIsRotating(false);
    
    // Clear hover state
    setHoveredTable(null);
    setHoveredElementId(null);
    
    console.log('Zone changed, resetting Canvas state');
  }, [currentZone?.id]); // Only depend on zone ID to avoid unnecessary reruns

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [drawEnd, setDrawEnd] = useState({ x: 0, y: 0 });
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [isTextInputCancelled, setIsTextInputCancelled] = useState(false);

  // Wall resizing state
  const [isResizingWall, setIsResizingWall] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<'start' | 'end' | 'thickness' | null>(null);

  // Table resizing state
  const [isResizingTable, setIsResizingTable] = useState(false);
  const [tableResizeHandle, setTableResizeHandle] = useState<'tl' | 'tr' | 'bl' | 'br' | 't' | 'r' | 'b' | 'l' | null>(null);
  const [resizingAnchorPoint, setResizingAnchorPoint] = useState<{ x: number, y: number } | null>(null);
  const [originalTableForResize, setOriginalTableForResize] = useState<any | null>(null);
  // Chair tool dropdown
  const [chairToolVariant, setChairToolVariant] = useState<'standard' | 'barstool' | 'boothCurved' | 'boothU'>('standard');
  const [showChairOptions, setShowChairOptions] = useState(false);
  const chairDropdownRef = useRef<HTMLDivElement | null>(null);
  const chairMenuRef = useRef<HTMLDivElement | null>(null);
  const [chairMenuPos, setChairMenuPos] = useState<{ left: number; top: number } | null>(null);
  useEffect(() => {
    if (!showChairOptions) return;
    const onDocDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (chairDropdownRef.current && chairDropdownRef.current.contains(t)) return;
      if (chairMenuRef.current && chairMenuRef.current.contains(t)) return;
      setShowChairOptions(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [showChairOptions]);

  // Table name editing state
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [tableNameInput, setTableNameInput] = useState('');
  // Number conflict confirmation when changing a table number to an existing one
  const [numberConflict, setNumberConflict] = useState<{ tableId: string, desiredNumber: number } | null>(null);
  // Numbering policy: 'allowDuplicates' or 'autoShift'
  const [numberingPolicy, setNumberingPolicy] = useState<'allowDuplicates' | 'autoShift'>(() => {
    try {
      return loadFromStorage<'allowDuplicates' | 'autoShift'>('respoint_numbering_policy', 'allowDuplicates');
    } catch {
      return 'allowDuplicates';
    }
  });
  useEffect(() => {
    saveToStorage('respoint_numbering_policy', numberingPolicy);
  }, [numberingPolicy]);

  // Rotation state
  const [isRotating, setIsRotating] = useState(false);
  const [rotationStart, setRotationStart] = useState(0);
  const [originalRotations, setOriginalRotations] = useState<{ [id: string]: number }>({});
  const [groupTotalRotation, setGroupTotalRotation] = useState(0); // Track total group rotation

  // Group transformation state
  const [isGroupScaling, setIsGroupScaling] = useState(false);
  const [isGroupRotating, setIsGroupRotating] = useState(false);
  const [groupScaleHandle, setGroupScaleHandle] = useState<'tl' | 'tr' | 'bl' | 'br' | 't' | 'r' | 'b' | 'l' | null>(null);
  const [originalGroupBounds, setOriginalGroupBounds] = useState<any>(null);
  const [originalElementStates, setOriginalElementStates] = useState<any[]>([]);
  const [hasGroupMoved, setHasGroupMoved] = useState(false);

  // Marquee selection state
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState({ x: 0, y: 0 });
  const [marqueeEnd, setMarqueeEnd] = useState({ x: 0, y: 0 });
  const [potentialMarqueeStart, setPotentialMarqueeStart] = useState<{ x: number, y: number } | null>(null);
  const [justCompletedMarquee, setJustCompletedMarquee] = useState(false);

  // Copy/paste state
  const [clipboard, setClipboard] = useState<any[]>([]);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuType, setContextMenuType] = useState<'copy' | 'paste' | 'table' | 'chair' | null>(null);
  const [contextMenuSelection, setContextMenuSelection] = useState<string[]>([]);
  const [contextMenuTargetTableId, setContextMenuTargetTableId] = useState<string | null>(null);
  const [lastPasteOffset, setLastPasteOffset] = useState(0);
  const [isAltPressed, setIsAltPressed] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  // User preference: show/hide standard table size preview while drawing
  const [showStandardSizePreview, setShowStandardSizePreview] = useState(true);
  const [showAddSeatsModal, setShowAddSeatsModal] = useState(false);
  const [addSeatsTableId, setAddSeatsTableId] = useState<string | null>(null);
  // Mirror clipboard in a ref to avoid any stale state edge cases across events/renders
  const clipboardRef = useRef<any[]>([]);

  // Hover state
  const [hoveredTable, setHoveredTable] = useState<{ tableId: string, reservation: Reservation, position: { x: number, y: number } } | null>(null);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const hoverRafRef = useRef<number | null>(null);
  const [isWaiterDragActive, setIsWaiterDragActive] = useState(false);
  const [tooltipTick, setTooltipTick] = useState(0);

  // Keep tooltip countdown text fresh while tooltip is visible
  useEffect(() => {
    if (!hoveredTable) return;
    const id = window.setInterval(() => setTooltipTick(t => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [hoveredTable?.tableId, hoveredTable?.reservation?.id]);

  const formatRemaining = useCallback((diffMs: number) => {
    try {
      const safe = Math.max(0, Math.floor(diffMs));
      const totalSeconds = Math.floor(safe / 1000);
      const totalMinutes = Math.floor(totalSeconds / 60);
      const totalHours = Math.floor(totalMinutes / 60);
      const days = Math.floor(totalHours / 24);
      if (days > 0) return `${days}d`;
      if (totalHours > 0) return `${totalHours}h`;
      if (totalMinutes > 0) return `${totalMinutes}m`;
      return `${Math.max(0, totalSeconds)}s`;
    } catch {
      return '0s';
    }
  }, []);

  const getWaitingRemaining = useCallback((reservation: Reservation) => {
    try {
      // tooltipTick forces re-render each second while hovered
      void tooltipTick;
      const isSpill = Boolean((reservation as any).__spilloverFromPrevDay);
      const srcDate = isSpill ? String((reservation as any).__spilloverSourceDate || reservation.date) : reservation.date;
      const srcTime = isSpill ? String((reservation as any).__spilloverSourceTime || reservation.time) : reservation.time;
      const target = new Date(`${srcDate}T${srcTime}`);
      const now = new Date();
      return formatRemaining(target.getTime() - now.getTime());
    } catch {
      return '0s';
    }
  }, [formatRemaining, tooltipTick]);

  const getSeatedRemaining = useCallback((reservation: Reservation, tableId?: string) => {
    try {
      void tooltipTick;
      const isSpill = Boolean((reservation as any).__spilloverFromPrevDay);
      const srcDate = isSpill ? String((reservation as any).__spilloverSourceDate || reservation.date) : reservation.date;
      const srcTime = isSpill ? String((reservation as any).__spilloverSourceTime || reservation.time) : reservation.time;
      const start = new Date(`${srcDate}T${srcTime}`);
      // default end by estimated duration
      let end: Date = new Date(start.getTime() + estimateSeatedDurationMinutes(reservation.numberOfGuests) * 60 * 1000);

      // override from local adjustments if present
      try {
        const key = `respoint-duration-adjustments:${srcDate}`;
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : {};
        const adj = parsed?.[reservation.id];
        if (adj && typeof adj.end === 'number') {
          const midnight = new Date(`${srcDate}T00:00:00`);
          end = new Date(midnight.getTime() + Math.max(0, Math.min(2880, adj.end)) * 60 * 1000);
        }
      } catch {}

      // apply table-specific limit if exists
      if (tableId) {
        try {
          const key = `respoint-table-limits:${srcDate}`;
          const raw = localStorage.getItem(key);
          const parsed = raw ? JSON.parse(raw) : {};
          const limitMin = parsed?.[tableId];
          if (typeof limitMin === 'number') {
            const midnight = new Date(`${srcDate}T00:00:00`);
            const limitEnd = new Date(midnight.getTime() + Math.max(0, Math.min(2880, limitMin)) * 60 * 1000);
            if (limitEnd.getTime() < end.getTime()) end = limitEnd;
          }
        } catch {}
      }

      const now = new Date();
      return formatRemaining(end.getTime() - now.getTime());
    } catch {
      return '0s';
    }
  }, [formatRemaining, tooltipTick]);

  // Grid settings
  const GRID_SIZE = 10;
  const CANVAS_OFFSET_STEP = GRID_SIZE; // how many pixels to move layout per arrow click
  // Recommended/standard table size:
  // - rectangle: 5x5 grid cells
  // - circle:    8x8 grid cells
  const STANDARD_TABLE_GRID_CELLS = 5; // rectangle
  const STANDARD_CIRCLE_GRID_CELLS = 8; // circle
  const STANDARD_TABLE_SIZE = GRID_SIZE * STANDARD_TABLE_GRID_CELLS;
  const DEFAULT_WALL_THICKNESS = 20;
  // Booth arc thickness (in px) for circular-table arcs
  const BOOTH_ARC_THICKNESS_CURVED = GRID_SIZE * 2;
  const BOOTH_ARC_THICKNESS_U = GRID_SIZE * 4;
  // Fixed wall thickness (px) for U-shaped separé around rectangular tables
  const RECT_U_WALL_PX = 30;

  // Helpers to move/reset the visual canvas offset (does not change saved layout coordinates)
  const nudgeCanvas = (dx: number, dy: number) => {
    setCanvasOffset(prev => ({
      x: prev.x + dx,
      y: prev.y + dy
    }));
  };

  const resetCanvasOffset = () => {
    setCanvasOffset({ x: 0, y: 0 });
  };
  // Fraction of bounding-box width that forms the inner opening of our U-booth SVG (approx 32%)
  const U_BOOTH_INNER_WIDTH_FRACTION = 32 / 100;

  // Check if user can edit based on role permissions
  const canEdit = isAuthenticated && hasPermission('edit_layout');

  // Helper function to show alert modal
  const showAlert = useCallback((title: string, message: string, type: 'info' | 'error' | 'success' = 'error') => {
    setAlertConfig({ title, message, type });
    setShowAlertModal(true);
  }, []);

  // Reset interaction layout when tool changes
  useEffect(() => {
    setInteractionLayout(null);
  }, [selectedTool]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowContextMenu(false);
    };

    if (showContextMenu) {
      window.addEventListener('click', handleClickOutside);
      return () => window.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);

  // Keep context menu fully inside canvas bounds
  React.useLayoutEffect(() => {
    if (!showContextMenu) return;
    const canvasEl = canvasRef.current;
    const menuEl = contextMenuRef.current;
    if (!canvasEl || !menuEl) return;
    const canvasRect = canvasEl.getBoundingClientRect();
    const menuWidth = menuEl.offsetWidth || 0;
    const menuHeight = menuEl.offsetHeight || 0;
    const localX = contextMenuPosition.x - canvasRect.left;
    const localY = contextMenuPosition.y - canvasRect.top;
    const clampedLocalX = Math.max(0, Math.min(localX, Math.max(0, canvasRect.width - menuWidth - 4)));
    const clampedLocalY = Math.max(0, Math.min(localY, Math.max(0, canvasRect.height - menuHeight - 4)));
    const nextX = clampedLocalX + canvasRect.left;
    const nextY = clampedLocalY + canvasRect.top;
    if (Math.abs(nextX - contextMenuPosition.x) > 1 || Math.abs(nextY - contextMenuPosition.y) > 1) {
      setContextMenuPosition({ x: nextX, y: nextY });
    }
  }, [showContextMenu, contextMenuPosition.x, contextMenuPosition.y]);
  // Move selected elements with arrow keys
  const moveSelectedElements = useCallback((dx: number, dy: number) => {
    // Move only non-chair tables/texts/walls; chairs will be re-glued to parents
    let next = {
      ...layout,
      tables: layout.tables.map(table => 
        selectedElements.includes(table.id)
          ? (table.type === 'chair' ? table : { ...table, x: table.x + dx, y: table.y + dy })
          : table
      ),
      walls: layout.walls.map(wall =>
        selectedElements.includes(wall.id)
          ? { ...wall, x1: wall.x1 + dx, y1: wall.y1 + dy, x2: wall.x2 + dx, y2: wall.y2 + dy }
          : wall
      ),
      texts: layout.texts.map(text =>
        selectedElements.includes(text.id)
          ? { ...text, x: text.x + dx, y: text.y + dy }
          : text
      )
    };
    // Re-glue chairs for any moved circular parents
    const movedCircleIds = new Set(
      next.tables.filter(t => selectedElements.includes(t.id) && t.type === 'circle').map(t => t.id)
    );
    if (movedCircleIds.size > 0) {
      next = glueCircularChairsToParents(next, movedCircleIds, true);
    }
    setLayout(next);
  }, [layout, selectedElements, setLayout]);

  // Delete selected elements (do not resequence table numbers)
  const deleteSelectedElements = useCallback((idsToDelete?: string[]) => {
    const elementsToDelete = idsToDelete || selectedElements;
    if (elementsToDelete.length === 0) return;
    
    const isTableDeleted = elementsToDelete.some(id => 
      layout.tables?.some(t => t.id === id)
    );

    // Delete tables and any chairs attached to deleted tables
    const deletedParentTableIds = new Set(
      layout.tables
        .filter(t => t && t.type !== 'chair' && elementsToDelete.includes(t.id))
        .map(t => t.id)
    );
    const remainingTables = layout.tables.filter(table => {
      // Always remove explicitly deleted elements
      if (elementsToDelete.includes(table.id)) return false;
      // Additionally remove chairs that are attached to any deleted parent table
      if (
        table.type === 'chair' &&
        (table as any).attachedToTableId &&
        deletedParentTableIds.has((table as any).attachedToTableId)
      ) {
        return false;
      }
      return true;
    });
    const wallsLeft = layout.walls.filter(wall => !elementsToDelete.includes(wall.id));
    const textsLeft = layout.texts.filter(text => !elementsToDelete.includes(text.id));
    
    // Optional renumbering based on policy (current zone only)
    let tablesAfter = remainingTables;
    if (isTableDeleted && numberingPolicy === 'autoShift') {
      // Build set of deleted numbers (non-chair)
      const deletedNumbers = layout.tables
        .filter(t => elementsToDelete.includes(t.id) && t.type !== 'chair')
        .map(t => (typeof t.number === 'number' && isFinite(t.number) ? t.number : null))
        .filter((n): n is number => n !== null)
        .sort((a, b) => a - b);
      if (deletedNumbers.length > 0) {
        tablesAfter = remainingTables.map(t => {
          if (t.type === 'chair') return t;
          const n = (typeof t.number === 'number' && isFinite(t.number)) ? t.number : null;
          if (n === null) return t;
          // Count how many deleted numbers are less than this table's number
          const decrementBy = deletedNumbers.filter(d => d < n).length;
          if (decrementBy > 0) {
            const newN = Math.max(1, n - decrementBy);
            return { ...t, number: newN, name: `${newN}` };
          }
          return t;
        });
      }
    }
    
    setLayout({
        ...layout,
        tables: tablesAfter,
        walls: wallsLeft,
        texts: textsLeft
    });
    
    if (idsToDelete) {
      setSelectedElements(prev => prev.filter(id => !elementsToDelete.includes(id)));
    } else {
      setSelectedElements([]);
    }
  }, [layout, selectedElements, setLayout, numberingPolicy]);

  // Update a table property
  const updateTable = (id: string, updates: Partial<typeof layout.tables[0]>) => {
    setLayout({
      ...layout,
      tables: layout.tables.map(table => 
        table.id === id ? { ...table, ...updates } : table
      )
    });
  };

  // Update a wall property
  const updateWall = (id: string, updates: Partial<typeof layout.walls[0]>) => {
    setLayout({
      ...layout, 
      walls: layout.walls.map(wall =>
        wall.id === id ? { ...wall, ...updates } : wall
      )
    });
  };

  // Update a text property
  const updateText = (id: string, updates: Partial<TextElement>) => {
    setLayout({
      ...layout,
      texts: layout.texts.map(text => {
        if (text.id === id) {
          const updatedText = { ...text, ...updates };
          
          // If fontSize is being updated, recalculate dimensions
          if (updates.fontSize !== undefined) {
            let newWidth, newHeight;
            if (updatedText.isParagraph && updatedText.width) {
              // For paragraph text, keep existing width and calculate new height
              const textSize = getTextSize(updatedText.text, updatedText.fontSize, 'normal', 'sans-serif', updatedText.width);
              newWidth = updatedText.width;
              newHeight = textSize.height;
            } else {
              // For single-line text, calculate both dimensions
              const textSize = getTextSize(updatedText.text, updatedText.fontSize);
              newWidth = textSize.width;
              newHeight = textSize.height;
            }
            
            return {
              ...updatedText,
              width: newWidth,
              height: newHeight
            };
          }
          
          return updatedText;
        }
        return text;
      })
    });
  };

  // Copy selected elements
  const copySelectedElements = useCallback((idsOverride?: string[]) => {
    const elementsToCopy: any[] = [];
    const idsToCopy = idsOverride && idsOverride.length > 0 ? idsOverride : selectedElements;
    
    // Get all selected elements
    const selectedTables = layout.tables.filter(t => idsToCopy.includes(t.id));
    const selectedWalls = layout.walls.filter(w => idsToCopy.includes(w.id));
    const selectedTexts = layout.texts.filter(t => idsToCopy.includes(t.id));
    
    elementsToCopy.push(...selectedTables, ...selectedWalls, ...selectedTexts);
    setClipboard(elementsToCopy);
    clipboardRef.current = elementsToCopy;
    try { (window as any).__respointClipboard = elementsToCopy; } catch {}
  }, [layout, selectedElements]);

  // Paste elements
  const pasteElements = useCallback((atCursor?: { x: number, y: number }) => {
    // Use the most up-to-date source (state, ref, or window backup)
    const sourceClipboard: any[] =
      clipboard.length > 0 ? clipboard :
      (clipboardRef.current && clipboardRef.current.length > 0 ? clipboardRef.current :
      ((typeof window !== 'undefined' && (window as any).__respointClipboard) || []));
    if (!sourceClipboard || sourceClipboard.length === 0) return;
    
    // Calculate the center of the copied elements
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    sourceClipboard.forEach(element => {
      if ('x' in element && 'y' in element) {
        minX = Math.min(minX, element.x);
        minY = Math.min(minY, element.y);
        maxX = Math.max(maxX, element.x + (element.width || 100));
        maxY = Math.max(maxY, element.y + (element.height || 100));
      } else if ('x1' in element) {
        minX = Math.min(minX, element.x1, element.x2);
        minY = Math.min(minY, element.y1, element.y2);
        maxX = Math.max(maxX, element.x1, element.x2);
        maxY = Math.max(maxY, element.y1, element.y2);
      }
    });
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Determine paste position
    let pasteX = 100, pasteY = 100;
    if (atCursor) {
      pasteX = atCursor.x - centerX;
      pasteY = atCursor.y - centerY;
    } else if (canvasRef.current) {
      // Center the pasted content in the visible canvas viewport (world coordinates)
      const rect = canvasRef.current.getBoundingClientRect();
      const midClientX = rect.left + rect.width / 2;
      const midClientY = rect.top + rect.height / 2;
      const { x: localCenterX, y: localCenterY } = getZoomAdjustedCoordinates(midClientX, midClientY, rect);
      const canvasCenterX = localCenterX - canvasOffset.x;
      const canvasCenterY = localCenterY - canvasOffset.y;
      pasteX = canvasCenterX - centerX;
      pasteY = canvasCenterY - centerY;
    }
    // We'll first apply raw delta (no snap), then snap the group's AABB to grid by
    // shifting ALL pasted elements uniformly, preserving relative offsets.
    
    const newElements: string[] = [];
    const tableIdMap: Record<string, string> = {};
    const newTables: any[] = [];
    const newWalls: any[] = [];
    const newTexts: any[] = [];
    
    // Build used numbers set across ALL zones (skip chairs)
    const usedNumbers = new Set<number>();
    const allTablesAcrossZones = [
      ...(layout.tables || []),
      ...Object.values(zoneLayouts || {}).flatMap(l => l?.tables || [])
    ];
    allTablesAcrossZones.forEach(t => {
      if (t && t.type !== 'chair') {
        const n = (typeof t.number === 'number' && isFinite(t.number)) ? t.number : null;
        if (n !== null && n >= 1 && n <= 999) usedNumbers.add(n);
      }
    });
    const getNextFreeFromSet = () => {
      for (let i = 1; i <= 999; i++) {
        if (!usedNumbers.has(i)) return i;
      }
      return 999;
    };
    
    sourceClipboard.forEach(element => {
      const id = `${element.id}-${Date.now()}-${Math.random()}`;
      newElements.push(id);
      
      if ('seats' in element && element.type !== 'chair') {
        // It's a (non-chair) table - assign first free global number
        const newNumber = getNextFreeFromSet();
        const newTable = {
          ...element,
          id,
          number: newNumber,
          name: `${newNumber}`,
          x: element.x + pasteX,
          y: element.y + pasteY
        };
        newTables.push(newTable);
        try { tableIdMap[element.id] = id; } catch {}
        usedNumbers.add(newNumber);
      } else if (element.type === 'chair') {
        // Preserve chair semantics: keep number and name neutral for chairs
        const newChair = {
          ...element,
          id,
          x: (element.x ?? 0) + pasteX,
          y: (element.y ?? 0) + pasteY
        };
        newTables.push(newChair);
      } else if ('thickness' in element) {
        // It's a wall
        newWalls.push({
          ...element,
          id,
          x1: element.x1 + pasteX,
          y1: element.y1 + pasteY,
          x2: element.x2 + pasteX,
          y2: element.y2 + pasteY
        });
      } else if ('text' in element) {
        // It's a text
        newTexts.push({
          ...element,
          id,
          x: element.x + pasteX,
          y: element.y + pasteY
        });
      }
    });
    
    // Snap AABB of pasted group to grid (handles rotations by using rotated corners)
    let minGX = Infinity, minGY = Infinity, maxGX = -Infinity, maxGY = -Infinity;
    const accumulateRect = (x: number, y: number, w: number, h: number, rotDeg: number) => {
      const cx = x + w / 2, cy = y + h / 2;
      const rad = (rotDeg || 0) * Math.PI / 180;
      const cos = Math.cos(rad), sin = Math.sin(rad);
      const pts = [
        { lx: -w/2, ly: -h/2 },
        { lx: +w/2, ly: -h/2 },
        { lx: +w/2, ly: +h/2 },
        { lx: -w/2, ly: +h/2 },
      ].map(p => ({ x: cx + p.lx * cos - p.ly * sin, y: cy + p.lx * sin + p.ly * cos }));
      pts.forEach(p => { minGX = Math.min(minGX, p.x); maxGX = Math.max(maxGX, p.x); minGY = Math.min(minGY, p.y); maxGY = Math.max(maxGY, p.y); });
    };
    newTables.forEach((t: any) => accumulateRect(t.x, t.y, t.width || 100, t.height || 100, t.rotation || 0));
    newWalls.forEach((w: any) => {
      const cx = (w.x1 + w.x2) / 2;
      const cy = (w.y1 + w.y2) / 2;
      const length = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
      const angle = Math.atan2(w.y2 - w.y1, w.x2 - w.x1) * 180 / Math.PI;
      accumulateRect(cx - length / 2, cy - w.thickness / 2, length, w.thickness, angle);
    });
    newTexts.forEach((t: any) => accumulateRect(t.x, t.y, t.width || 200, t.height || 30, t.rotation || 0));
    if (isFinite(minGX) && isFinite(minGY)) {
      const dxSnap = snapToGrid(minGX) - minGX;
      const dySnap = snapToGrid(minGY) - minGY;
      if (Math.abs(dxSnap) > 0 || Math.abs(dySnap) > 0) {
        for (let i = 0; i < newTables.length; i++) {
          newTables[i] = { ...newTables[i], x: newTables[i].x + dxSnap, y: newTables[i].y + dySnap };
        }
        for (let i = 0; i < newWalls.length; i++) {
          newWalls[i] = { ...newWalls[i], x1: newWalls[i].x1 + dxSnap, y1: newWalls[i].y1 + dySnap, x2: newWalls[i].x2 + dxSnap, y2: newWalls[i].y2 + dySnap };
        }
        for (let i = 0; i < newTexts.length; i++) {
          newTexts[i] = { ...newTexts[i], x: newTexts[i].x + dxSnap, y: newTexts[i].y + dySnap };
        }
      }
    }
    
    // Remap attachedToTableId for chairs to newly pasted table ids
    const remappedTables = newTables.map((t: any) => {
      if (t && t.type === 'chair' && t.attachedToTableId) {
        const mapped = tableIdMap[t.attachedToTableId];
        if (mapped) return { ...t, attachedToTableId: mapped };
      }
      return t;
    });
    
    // Add the new elements to the layout
    setLayout({
      ...layout,
      tables: [...layout.tables, ...remappedTables],
      walls: [...layout.walls, ...newWalls],
      texts: [...layout.texts, ...newTexts]
    });
    
    // Select the pasted elements
    setSelectedElements(newElements);
  }, [clipboard, layout, setLayout]);

  // Duplicate selected elements
  const duplicateSelectedElements = useCallback(() => {
    copySelectedElements();
    pasteElements({ x: 150, y: 150 }); // Paste with offset
  }, [copySelectedElements, pasteElements]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard shortcuts if we're not typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT' || 
          (e.target as HTMLElement).tagName === 'TEXTAREA' ||
          (e.target as HTMLElement).contentEditable === 'true') {
        return;
      }

      // Don't handle shortcuts if any modal is open
      if (showTextInput || editingTableId || showSaveLayoutModal || showLayoutList) {
        return;
      }

      // Track modifier keys
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      } else if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlPressed(true);
      } else if (e.key === 'Alt') {
        setIsAltPressed(true);
      }

      // Only allow these operations in edit mode
      if (!isEditing) {
        return;
      }

      // Handle keyboard shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
          case 'a':
            e.preventDefault();
            // Select all elements
            const allElementIds = [
              ...layout.tables.map(t => t.id),
              ...layout.walls.map(w => w.id),
              ...layout.texts.map(t => t.id)
            ];
            setSelectedElements(allElementIds);
            setGroupTotalRotation(0); // Reset group rotation
            break;
          case 'c':
            e.preventDefault();
            if (selectedElements.length > 0) {
              copySelectedElements();
            }
            break;
          case 'v':
            e.preventDefault();
            if (clipboard.length > 0) {
              pasteElements();
            }
            break;
          case 'd':
            e.preventDefault();
            if (selectedElements.length > 0) {
              duplicateSelectedElements();
            }
            break;
        }
      } else {
        // Non-control key shortcuts
        switch (e.key) {
          case 'Delete':
          case 'Backspace':
            if (selectedElements.length > 0) {
              e.preventDefault();
              deleteSelectedElements();
            }
            break;
          case 'Escape':
            setSelectedElements([]);
            setSelectedElementsBeforeDrag([]);
            setGroupTotalRotation(0); // Reset group rotation
            if (selectedTool !== 'select') {
              onToolChange('select');
            }
            break;
          case 'ArrowUp':
          case 'ArrowDown':
          case 'ArrowLeft':
          case 'ArrowRight':
            if (selectedElements.length > 0) {
              e.preventDefault();
              const distance = e.shiftKey ? 1 : 10; // Fine movement with shift
              const dx = e.key === 'ArrowLeft' ? -distance : e.key === 'ArrowRight' ? distance : 0;
              const dy = e.key === 'ArrowUp' ? -distance : e.key === 'ArrowDown' ? distance : 0;
              moveSelectedElements(dx, dy);
            }
            break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      } else if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlPressed(false);
      } else if (e.key === 'Alt') {
        setIsAltPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    selectedElements, 
    isEditing, 
    showTextInput, 
    editingTableId, 
    showSaveLayoutModal, 
    showLayoutList,
    layout,
    clipboard.length,
    selectedTool,
    moveSelectedElements,
    deleteSelectedElements,
    copySelectedElements,
    pasteElements,
    duplicateSelectedElements,
    undo,
    redo,
    onToolChange
  ]);

  // Toggle edit mode
  const toggleEditMode = () => {
    if (canEdit) {
      if (!isEditing) {
        // Entering edit mode - save current layout as original
        setLayoutAtEditStart(JSON.parse(JSON.stringify(layout)));
        setIsEditing(true);
        // Ensure Move tool is selected when entering edit mode
        onToolChange('select');
        // Clear hover state when entering edit mode
        setHoveredTable(null);
      } else {
        // This case might be handled by the cancel/save buttons now,
        // but as a fallback, we'll just exit edit mode.
        setIsEditing(false);
      }
      setSelectedElements([]);
      setInteractionLayout(null);
    } else {
      // Graceful feedback when permissions are missing or role not selected
      showAlert(
        'Nema dozvole',
        'Za uređivanje rasporeda izaberi ulogu sa dozvolom "Uredi raspored" (gore desno u meniju) ili otključaj ulogu.',
        'info'
      );
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (layoutAtEditStart) {
      setLayout(layoutAtEditStart);
    }
    setIsEditing(false);
    setSelectedElements([]);
    setSelectedElementsBeforeDrag([]);
    setInteractionLayout(null);
    setHoveredTable(null);
  };

  // Handle save
  const handleSave = async () => {
    if (hasChanges && user && currentZone) {
      console.log('Saving layout to Supabase. Zone:', currentZone.id);
      
      try {
        // Use the saveLayout from our hook
        await saveLayout();
        
        console.log('Layout saved successfully');
        setIsEditing(false);
        setHoveredTable(null);
      } catch (error) {
        console.error('Error saving layout:', error);
        showAlert(
          'Save Failed',
          'Failed to save layout. Please try again.',
          'error'
        );
      }
    }
  };

  // Snap to grid
  const snapToGrid = (value: number) => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  };
  // Snap angle to nearest 90° to keep elements aligned with canvas grid lines
  const snapAngleToGrid = (angleDeg: number) => {
    const a = ((angleDeg % 360) + 360) % 360;
    return Math.round(a / 90) * 90;
  };

  // Compute the next global table number across ALL zones/layouts
  const getGlobalNextTableNumber = useCallback((): number => {
    // Vrati PRVI slobodan broj (1..999) preko svih zona (ignoriši stolice)
    const used = new Set<number>();
    const fromZoneLayouts = Object.values(zoneLayouts || {}).flatMap(l => l?.tables || []);
    const fromSavedLayouts = Object.values(savedLayouts || {}).flatMap((list: any) =>
      (list || []).flatMap((sl: any) => (sl?.layout?.tables || []))
    );
    const allTablesAcrossZones = [
      ...(layout.tables || []),
      ...fromZoneLayouts,
      ...fromSavedLayouts,
    ];
    allTablesAcrossZones.forEach(t => {
      if (t && t.type !== 'chair' && typeof t.number === 'number' && isFinite(t.number)) {
        used.add(t.number);
      }
    });
    for (let i = 1; i <= 999; i++) {
      if (!used.has(i)) return i;
    }
    return 999;
  }, [layout.tables, zoneLayouts, savedLayouts]);

  // Force re-render when waiter assignment changes externally
  const [, forceWaiterRefresh] = useState(0);
  useEffect(() => {
    const handler = () => forceWaiterRefresh(n => n + 1);
    window.addEventListener('respoint-waiter-assigned', handler as any);
    return () => window.removeEventListener('respoint-waiter-assigned', handler as any);
  }, []);

  // Calculate constrained dimensions for proportional drawing
  const getConstrainedDimensions = (startX: number, startY: number, endX: number, endY: number, isProportional: boolean) => {
    let width = endX - startX;
    let height = endY - startY;

    if (isProportional) {
      // For proportional shapes, use the larger dimension
      const size = Math.max(Math.abs(width), Math.abs(height));
      width = width < 0 ? -size : size;
      height = height < 0 ? -size : size;
    }

    return { width, height };
  };

  // Calculate angle-constrained line for walls
  const getConstrainedLine = (startX: number, startY: number, endX: number, endY: number, constrain: boolean) => {
    if (!constrain) {
      return { x2: endX, y2: endY };
    }

    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // Snap to nearest 45-degree angle
    const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    
    return {
      x2: startX + distance * Math.cos(snapAngle),
      y2: startY + distance * Math.sin(snapAngle)
    };
  };

  // Get wall rectangle properties from line coordinates
  const getWallRectangle = (x1: number, y1: number, x2: number, y2: number, thickness: number) => {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    
    // Calculate perpendicular offset for thickness
    const offsetX = Math.sin(angle) * thickness / 2;
    const offsetY = -Math.cos(angle) * thickness / 2;
    
    return {
      x: Math.min(x1, x2) - Math.abs(offsetX),
      y: Math.min(y1, y2) - Math.abs(offsetY),
      width: length,
      height: thickness,
      angle: angle * 180 / Math.PI,
      centerX: (x1 + x2) / 2,
      centerY: (y1 + y2) / 2
    };
  };

  // Get element rotation
  const getElementRotation = (element: any) => {
    if ('rotation' in element) {
      return normalizeAngle(element.rotation || 0);
    }
    return 0;
  };
  // Handle mouse down
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only react to LEFT mouse button for any drawing/placing actions
    if (e.button !== 0) return;
    // Only allow actions when in edit mode
    if (!isEditing) {
      console.log("Not in edit mode, returning from handleMouseDown");
      return;
    }

    const rect = canvasRef.current!.getBoundingClientRect();
    const { x: localX, y: localY } = getZoomAdjustedCoordinates(e.clientX, e.clientY, rect);
    const x = localX - canvasOffset.x;
    const y = localY - canvasOffset.y;
    const gridX = snapToGrid(clampX(x));
    const gridY = snapToGrid(clampY(y));

    console.log(`Mouse down at (${x}, ${y}), tool: ${selectedTool}`);

    // The target check was too restrictive and prevented drawing when clicking on existing SVG elements.
    // We rely on the selectedTool to determine the action.
    const target = e.target as HTMLElement;

    if (selectedTool === 'select') {
      // Check if clicking on an element
      const elementAtPosition = getElementAtPosition(x, y);
      
      if (!elementAtPosition) {
        // Check if clicking inside selection bounding box
        const groupBounds = getGroupBoundingBox();
        const clickedInsideSelection = groupBounds && selectedElements.length > 0 &&
          x >= groupBounds.x && x <= groupBounds.x + groupBounds.width &&
          y >= groupBounds.y && y <= groupBounds.y + groupBounds.height;
        
        if (clickedInsideSelection) {
          // Clicking inside selection area - start drag
          console.log("Clicked inside selection area - starting drag");
          handleDragStart(e);
        } else {
          // Clicking on empty space outside selection
          // Check if we're clicking on a scale handle or rotation handle
          const target = e.target as HTMLElement;
          const isClickingOnHandle = target.closest('[data-handle]') || 
                                     target.style.cursor?.includes('resize') || 
                                     target.style.cursor === 'rotate' ||
                                     target.classList.contains('cursor-rotate');
          
          if (!isClickingOnHandle) {
            if (!isShiftPressed && !isGroupScaling && !isGroupRotating) {
              // Clear selection when clicking on empty space without shift (but not during group operations)
          setSelectedElements([]);
            }
            // Only set potential marquee start if we're not clicking on handles
            setPotentialMarqueeStart({ x, y });
            console.log("Potential marquee selection start (empty space)");
          } else {
            console.log("Clicked on handle - no marquee selection");
          }
        }
      } else {
        // Clicking on an element - no marquee selection should start
        setPotentialMarqueeStart(null);
        console.log("Clicked on element - no marquee selection");
      }
    } else if (selectedTool === 'table' || selectedTool === 'wall') {
      // Start drawing a new shape
      setIsDrawing(true);
      setDrawStart({ x: gridX, y: gridY });
      setDrawEnd({ x: gridX, y: gridY });
      console.log(`Starting to draw ${selectedTool} at (${gridX}, ${gridY})`);
    } else if (selectedTool === 'text') {
      // For the text tool, we only want to register a "click", not a drag.
      // We'll handle the creation on mouse up.
      setIsDrawing(true);
      setDrawStart({ x: gridX, y: gridY });
      setDrawEnd({ x: gridX, y: gridY });
    }
  };

  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const { x: localX, y: localY } = getZoomAdjustedCoordinates(e.clientX, e.clientY, rect);
    const x = localX - canvasOffset.x;
    const y = localY - canvasOffset.y;
    const gridX = snapToGrid(clampX(x));
    const gridY = snapToGrid(clampY(y));

    // Check if we should start marquee selection (mouse moved more than 5 pixels)
    if (potentialMarqueeStart && !isMarqueeSelecting && !isDragging) {
      const distance = Math.sqrt(
        Math.pow(x - potentialMarqueeStart.x, 2) + 
        Math.pow(y - potentialMarqueeStart.y, 2)
      );
      
      if (distance > 5) {
        // Start marquee selection
        setIsMarqueeSelecting(true);
        setMarqueeStart(potentialMarqueeStart);
        setMarqueeEnd({ x, y });
        setPotentialMarqueeStart(null);
        console.log("Starting actual marquee selection");
      }
    }

    // Check if we should start dragging (mouse moved more than 5 pixels)
    if (dragStartPosition.current && !isDragging && !isMarqueeSelecting && selectedElements.length > 0) {
      const dragDistance = adjustValueForZoom(Math.sqrt(
        Math.pow(e.clientX - dragStartPosition.current.x, 2) + 
        Math.pow(e.clientY - dragStartPosition.current.y, 2)
      ));
      
      if (dragDistance > 5) {
        // Start dragging
        setIsDragging(true);
        
        // If Alt is pressed and we haven't created duplicates yet, do it now
        if (isAltPressed && !isDuplicating) {
          createDuplicatesForDrag();
        }
      }
    }

    if (isDrawing) {
      setDrawEnd({ x: gridX, y: gridY });
    } else if (isMarqueeSelecting) {
      setMarqueeEnd({ x: clampX(x), y: clampY(y) });
      updateMarqueeSelection();
    } else if (isDragging && selectedElements.length > 0) {
      // Move all selected elements
      const deltaX = gridX - dragOffset.x;
      const deltaY = gridY - dragOffset.y;
      const isGroupDrag = selectedElements.length > 1;
      
      // Use interaction layout during drag
      let currentLayout = interactionLayout || layout;
      currentLayout = ensureAttachedAngles(currentLayout);
      
      // Move without delay
      requestAnimationFrame(() => {
        let nextLayout = {
          ...currentLayout,
          tables: currentLayout.tables.map(table => {
            if (selectedElements.includes(table.id)) {
              const baseTable = layoutBeforeDrag?.tables?.find((t:any) => t.id === table.id);
              if (baseTable) {
                // Never move chairs directly; they will be glued to their parent.
                if (baseTable.type === 'chair') return table;
                // Non-chairs or group-drag chairs: move together; snap non-chairs to grid
                const w = baseTable.width || (((baseTable as any).type === 'chair') ? GRID_SIZE * 3 : GRID_SIZE * 6);
                const h = baseTable.height || (((baseTable as any).type === 'chair') ? GRID_SIZE * 3 : GRID_SIZE * 4);
                const movedX = clampX(baseTable.x + deltaX, w);
                const movedY = clampY(baseTable.y + deltaY, h);
                if (((baseTable as any).type) !== 'chair') {
                  return { ...table, x: snapToGrid(movedX), y: snapToGrid(movedY) };
                }
                return { ...table, x: movedX, y: movedY };
              }
            }
            return table;
          }),
          walls: currentLayout.walls.map(wall => {
            if (selectedElements.includes(wall.id)) {
              const baseWall = layoutBeforeDrag?.walls?.find((w:any) => w.id === wall.id);
              if (baseWall) {
                return {
                  ...wall,
                  x1: clampX(baseWall.x1 + deltaX),
                  y1: clampY(baseWall.y1 + deltaY),
                  x2: clampX(baseWall.x2 + deltaX),
                  y2: clampY(baseWall.y2 + deltaY)
                };
              }
            }
            return wall;
          }),
          texts: currentLayout.texts.map(text => {
            if (selectedElements.includes(text.id)) {
              const baseText = layoutBeforeDrag?.texts?.find((t:any) => t.id === text.id);
              if (baseText) {
                const w = Math.max(50, baseText.width || 100);
                const h = Math.max(20, baseText.height || 40);
                return { ...text, x: clampX(baseText.x + deltaX, w), y: clampY(baseText.y + deltaY, h) };
              }
            }
            return text;
          })
        };
        // Live glue for circular parents in selection (no snap while dragging)
        const circleIds = new Set(
          (nextLayout.tables || []).filter((t:any) => selectedElements.includes(t.id) && t.type === 'circle')
                                  .map((t:any) => t.id)
        );
        const rectIds = new Set(
          (nextLayout.tables || []).filter((t:any) => selectedElements.includes(t.id) && t.type !== 'circle' && t.type !== 'chair')
                                  .map((t:any) => t.id)
        );
        if (circleIds.size > 0) nextLayout = glueCircularChairsToParents(nextLayout, circleIds, false);
        if (rectIds.size > 0) nextLayout = glueRectChairsToParents(nextLayout, rectIds, false);
        setInteractionLayout(nextLayout);
      });
    } else if (isGroupScaling && originalGroupBounds && groupScaleHandle && originalElementStates.length > 0) {
      // Handle group scaling with rotation awareness
      setHasGroupMoved(true); // Mark that group has moved
      let currentLayout = interactionLayout || layout;
      currentLayout = ensureAttachedAngles(currentLayout);
      
      const groupRotation = originalGroupBounds.rotation || 0;
      const rad = groupRotation * Math.PI / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      
      // Transform mouse position to local coordinate system of the group
      const mouseRelativeX = gridX - originalGroupBounds.centerX;
      const mouseRelativeY = gridY - originalGroupBounds.centerY;
      const localMouseX = mouseRelativeX * cos + mouseRelativeY * sin;
      const localMouseY = -mouseRelativeX * sin + mouseRelativeY * cos;
      
      // Calculate scale factors in local coordinate system
      let scaleX = 1, scaleY = 1;
      let localAnchorX = 0, localAnchorY = 0;
      
      const halfWidth = originalGroupBounds.width / 2;
      const halfHeight = originalGroupBounds.height / 2;
      
      switch (groupScaleHandle) {
        case 'tl':
          // Top-left: drag up-left, anchor at bottom-right
          scaleX = (halfWidth - localMouseX) / originalGroupBounds.width;
          scaleY = (halfHeight - localMouseY) / originalGroupBounds.height;
          localAnchorX = halfWidth;   // right side as anchor
          localAnchorY = halfHeight;  // bottom side as anchor
          break;
        case 'tr':
          // Top-right: drag up-right, anchor at bottom-left
          scaleX = (localMouseX + halfWidth) / originalGroupBounds.width;
          scaleY = (halfHeight - localMouseY) / originalGroupBounds.height;
          localAnchorX = -halfWidth;  // left side as anchor
          localAnchorY = halfHeight;  // bottom side as anchor
          break;
        case 'bl':
          // Bottom-left: drag down-left, anchor at top-right
          scaleX = (halfWidth - localMouseX) / originalGroupBounds.width;
          scaleY = (localMouseY + halfHeight) / originalGroupBounds.height;
          localAnchorX = halfWidth;   // right side as anchor
          localAnchorY = -halfHeight; // top side as anchor
          break;
        case 'br':
          // Bottom-right: drag down-right, anchor at top-left
          scaleX = (localMouseX + halfWidth) / originalGroupBounds.width;
          scaleY = (localMouseY + halfHeight) / originalGroupBounds.height;
          localAnchorX = -halfWidth;  // left side as anchor
          localAnchorY = -halfHeight; // top side as anchor
          break;
        case 't':
          // Top: drag up, anchor at bottom
          scaleX = 1.0;
          scaleY = (halfHeight - localMouseY) / originalGroupBounds.height;
          localAnchorX = 0;           // center horizontally
          localAnchorY = halfHeight;  // bottom side as anchor
          break;
        case 'b':
          // Bottom: drag down, anchor at top
          scaleX = 1.0;
          scaleY = (localMouseY + halfHeight) / originalGroupBounds.height;
          localAnchorX = 0;           // center horizontally
          localAnchorY = -halfHeight; // top side as anchor
          break;
        case 'l':
          // Left: drag left, anchor at right
          scaleX = (halfWidth - localMouseX) / originalGroupBounds.width;
          scaleY = 1.0;
          localAnchorX = halfWidth;   // right side as anchor
          localAnchorY = 0;           // center vertically
          break;
        case 'r':
          // Right: drag right, anchor at left
          scaleX = (localMouseX + halfWidth) / originalGroupBounds.width;
          scaleY = 1.0;
          localAnchorX = -halfWidth;  // left side as anchor
          localAnchorY = 0;           // center vertically
          break;
      }
      
      // Illustrator: Alt/Option scales from center (anchor at group's center)
      if (isAltPressed) {
        localAnchorX = 0;
        localAnchorY = 0;
      }
      
      // Illustrator: Shift constrains proportions for any handle
      if (isShiftPressed) {
        let s: number;
        if (['l', 'r'].includes(groupScaleHandle)) {
          s = Math.abs(scaleX);
        } else if (['t', 'b'].includes(groupScaleHandle)) {
          s = Math.abs(scaleY);
        } else {
          s = Math.max(Math.abs(scaleX), Math.abs(scaleY));
        }
        scaleX = Math.sign(scaleX) * s;
        scaleY = Math.sign(scaleY) * s;
      }
      
      // If selection is a circular table with its chairs, force uniform scaling always.
      try {
        const selectedTables = (currentLayout.tables || []).filter(t => selectedElements.includes(t.id));
        const nonChairs = selectedTables.filter(t => t && t.type !== 'chair');
        const isCircleSelection = nonChairs.length === 1 && nonChairs[0].type === 'circle' &&
          selectedTables.filter(t => t.id !== nonChairs[0].id).every(t => t.type === 'chair' && (t as any).attachedToTableId === nonChairs[0].id);
        if (isCircleSelection) {
          const s = Math.max(Math.abs(scaleX), Math.abs(scaleY));
          scaleX = Math.sign(scaleX) * s;
          scaleY = Math.sign(scaleY) * s;
        }
      } catch {}
      
      // Minimum scale to prevent elements from disappearing
      scaleX = Math.max(0.1, Math.abs(scaleX)) * Math.sign(scaleX);
      scaleY = Math.max(0.1, Math.abs(scaleY)) * Math.sign(scaleY);
      
      // Transform local anchor to global coordinates
      const globalAnchorX = originalGroupBounds.centerX + (localAnchorX * cos - localAnchorY * sin);
      const globalAnchorY = originalGroupBounds.centerY + (localAnchorX * sin + localAnchorY * cos);
      
      console.log('🔄 Group scaling (rotated) - scaleX:', scaleX, 'scaleY:', scaleY, 'rotation:', groupRotation, 'localAnchor:', {localAnchorX, localAnchorY});
      
      // Apply transformation using interaction layout for real-time updates
      const updatedLayout = {
        ...currentLayout,
        tables: currentLayout.tables.map(table => {
          if (selectedElements.includes(table.id)) {
            const initial = groupScaleInitialStates.current[table.id];
            if (initial) {
              // Skip chairs entirely; they will be glued to their parent after scaling
              if ((table as any).type === 'chair') return table;
              
              // Use stored rotation from initial state (not current table rotation which might be stale)
              const initialRotation = initial.rotation || 0;
              const tableRotation = normalizeAngle(initialRotation - (groupRotation || 0));
              const theta = tableRotation * Math.PI / 180;
              const absScaleX = Math.abs(scaleX);
              const absScaleY = Math.abs(scaleY);
              
              // Illustrator-like: apply world scales projected to element's local axes.
              const sLocalX = Math.sqrt((absScaleX * Math.cos(theta)) ** 2 + (absScaleY * Math.sin(theta)) ** 2);
              const sLocalY = Math.sqrt((absScaleX * Math.sin(theta)) ** 2 + (absScaleY * Math.cos(theta)) ** 2);
              
              // For circular tables, use uniform scaling for both dimensions AND position
              const isCircle = initial.type === 'circle' || table.type === 'circle';
              let effectiveScaleX = scaleX;
              let effectiveScaleY = scaleY;
              let newWidth: number;
              let newHeight: number;
              
              if (isCircle) {
                // Use uniform scale for circles to prevent distortion
                const sUniform = Math.max(sLocalX, sLocalY);
                newWidth = initial.width * sUniform;
                newHeight = initial.height * sUniform;
                // Also use uniform scale for position calculation
                const uniformAbsScale = Math.max(absScaleX, absScaleY);
                effectiveScaleX = Math.sign(scaleX) * uniformAbsScale;
                effectiveScaleY = Math.sign(scaleY) * uniformAbsScale;
              } else {
                newWidth = initial.width * sLocalX;
                newHeight = initial.height * sLocalY;
              }
              
              // Calculate original center point
              const originalCenterX = initial.x + initial.width / 2;
              const originalCenterY = initial.y + initial.height / 2;
              
              // Calculate relative offset from anchor to center
              const relativeOffsetX = originalCenterX - globalAnchorX;
              const relativeOffsetY = originalCenterY - globalAnchorY;
              
              // Transform offset to local coordinate system
              const localOffsetX = relativeOffsetX * cos + relativeOffsetY * sin;
              const localOffsetY = -relativeOffsetX * sin + relativeOffsetY * cos;
              
              // Apply scaling in local coordinate system (use effective scale for circles)
              const scaledLocalOffsetX = localOffsetX * effectiveScaleX;
              const scaledLocalOffsetY = localOffsetY * effectiveScaleY;
              
              // Transform back to global coordinates
              const scaledGlobalOffsetX = scaledLocalOffsetX * cos - scaledLocalOffsetY * sin;
              const scaledGlobalOffsetY = scaledLocalOffsetX * sin + scaledLocalOffsetY * cos;
              
              // Calculate new center
              const newCenterX = globalAnchorX + scaledGlobalOffsetX;
              const newCenterY = globalAnchorY + scaledGlobalOffsetY;
              
              // Convert back to top-left position
              const newX = newCenterX - newWidth / 2;
              const newY = newCenterY - newHeight / 2;
        
              return {
                ...table,
                x: newX,
                y: newY,
                width: Math.max(30, newWidth),
                height: Math.max(30, newHeight),
              };
            }
          }
          return table;
        }),
        walls: currentLayout.walls.map(wall => {
          if (selectedElements.includes(wall.id)) {
            const originalState = originalElementStates.find(s => s.id === wall.id && s.type === 'wall') as any;
            if (originalState && originalState.x1 !== undefined) {
              // Calculate original center point of the wall
              const originalCenterX = (originalState.x1 + originalState.x2) / 2;
              const originalCenterY = (originalState.y1 + originalState.y2) / 2;
              
              // Calculate relative offset from anchor to center
              const relativeOffsetX = originalCenterX - globalAnchorX;
              const relativeOffsetY = originalCenterY - globalAnchorY;
              
              // Transform offset to local coordinate system
              const localOffsetX = relativeOffsetX * cos + relativeOffsetY * sin;
              const localOffsetY = -relativeOffsetX * sin + relativeOffsetY * cos;
              
              // Apply scaling in local coordinate system
              const scaledLocalOffsetX = localOffsetX * scaleX;
              const scaledLocalOffsetY = localOffsetY * scaleY;
              
              // Transform back to global coordinates
              const scaledGlobalOffsetX = scaledLocalOffsetX * cos - scaledLocalOffsetY * sin;
              const scaledGlobalOffsetY = scaledLocalOffsetX * sin + scaledLocalOffsetY * cos;
              
              // Calculate new center
              const newCenterX = globalAnchorX + scaledGlobalOffsetX;
              const newCenterY = globalAnchorY + scaledGlobalOffsetY;
              
              // Calculate original wall length and angle
              const originalLength = Math.sqrt(
                Math.pow(originalState.x2 - originalState.x1, 2) + 
                Math.pow(originalState.y2 - originalState.y1, 2)
              );
              const originalAngle = Math.atan2(originalState.y2 - originalState.y1, originalState.x2 - originalState.x1);
              
              // Effective scaling along wall's local axes (length vs thickness) derived from group scales
              const absSx = Math.abs(scaleX);
              const absSy = Math.abs(scaleY);
              const theta = originalAngle - rad; // relative to group's X axis
              const sLength = Math.sqrt((absSx * Math.cos(theta)) ** 2 + (absSy * Math.sin(theta)) ** 2);
              const sThick  = Math.sqrt((absSx * Math.sin(theta)) ** 2 + (absSy * Math.cos(theta)) ** 2);
              let newLength = originalLength * sLength;
              // Scale wall thickness
              let newThickness = Math.max(5, originalState.thickness * sThick);
              
              // Calculate new endpoints based on scaled center and length
              const halfLength = newLength / 2;
              const newX1 = newCenterX - halfLength * Math.cos(originalAngle);
              const newY1 = newCenterY - halfLength * Math.sin(originalAngle);
              const newX2 = newCenterX + halfLength * Math.cos(originalAngle);
              const newY2 = newCenterY + halfLength * Math.sin(originalAngle);
        
        return {
          ...wall,
          x1: newX1,
          y1: newY1,
          x2: newX2,
                y2: newY2,
                thickness: newThickness
        };
            }
          }
          return wall;
        }),
        texts: currentLayout.texts.map(text => {
          if (selectedElements.includes(text.id)) {
            const initial = groupScaleInitialStates.current[text.id];
            if (initial) {
              // Determine uniform scale factor for text (preserve aspect ratio)
              // Text uses uniform scaling, so use the same factor for position
              let uniformScale: number;
              if (['l', 'r'].includes(groupScaleHandle)) {
                uniformScale = Math.abs(scaleX);
              } else if (['t', 'b'].includes(groupScaleHandle)) {
                uniformScale = Math.abs(scaleY);
              } else {
                // Corner handles: use larger factor for intuitive scaling
                uniformScale = Math.max(Math.abs(scaleX), Math.abs(scaleY));
              }
              
              // Calculate original center point
              const originalCenterX = initial.x + initial.width / 2;
              const originalCenterY = initial.y + initial.height / 2;
              
              // Calculate relative offset from anchor to center
              const relativeOffsetX = originalCenterX - globalAnchorX;
              const relativeOffsetY = originalCenterY - globalAnchorY;
              
              // Transform offset to local coordinate system
              const localOffsetX = relativeOffsetX * cos + relativeOffsetY * sin;
              const localOffsetY = -relativeOffsetX * sin + relativeOffsetY * cos;
              
              // For text, use uniform scaling for position (like circular tables)
              // This keeps text proportionally positioned relative to anchor
              const effectiveScale = Math.sign(scaleX) * uniformScale;
              const scaledLocalOffsetX = localOffsetX * effectiveScale;
              const scaledLocalOffsetY = localOffsetY * effectiveScale;
              
              // Transform back to global coordinates
              const scaledGlobalOffsetX = scaledLocalOffsetX * cos - scaledLocalOffsetY * sin;
              const scaledGlobalOffsetY = scaledLocalOffsetX * sin + scaledLocalOffsetY * cos;
              
              // Calculate new center
              const newCenterX = globalAnchorX + scaledGlobalOffsetX;
              const newCenterY = globalAnchorY + scaledGlobalOffsetY;

              const baseFont = initial.fontSize ?? (text.fontSize || 16);
              const newFontSize = Math.max(1, baseFont * uniformScale);

              // Measure text with new font size for accurate top-left position
              const measured = getTextSize(text.text, newFontSize);
              const newX = newCenterX - measured.width / 2;
              const newY = newCenterY - measured.height / 2;
        
              return {
                ...text,
                x: newX,
                y: newY,
                fontSize: newFontSize,
                width: measured.width,
                height: measured.height
              };
            }
          }
          return text;
        })
      };
      
        // Live glue for circular parents in selection during group scaling (no snap)
        const circleIds = new Set(
          (updatedLayout.tables || []).filter((t:any) => selectedElements.includes(t.id) && t.type === 'circle')
                                     .map((t:any) => t.id)
        );
        const rectIds = new Set(
          (updatedLayout.tables || []).filter((t:any) => selectedElements.includes(t.id) && t.type !== 'circle' && t.type !== 'chair')
                                     .map((t:any) => t.id)
        );
        let glued = circleIds.size > 0 ? glueCircularChairsToParents(updatedLayout, circleIds, false) : updatedLayout;
        if (rectIds.size > 0) glued = glueRectChairsToParents(glued, rectIds, false);
        setInteractionLayout(glued);
    } else if (isGroupRotating && originalGroupBounds && Object.keys(groupRotationInitialStates.current).length > 0) {
      // Handle group rotation
      setHasGroupMoved(true); // Mark that group has moved
      let currentLayout = interactionLayout || layout;
      currentLayout = ensureAttachedAngles(currentLayout);
      const centerX = originalGroupBounds.centerX;
      const centerY = originalGroupBounds.centerY;
      
      // Calculate current angle and delta using new helper functions
      const currentAngle = calculateAngle(centerX, centerY, x, y);
      let deltaAngle = getAngleDifference(currentAngle, rotationStart);
      
      if (isShiftPressed) {
        deltaAngle = Math.round(deltaAngle / 45) * 45;
      }
      
      // For group rotation, the overlay should rotate exactly by deltaAngle
      setCurrentRotationAngle(normalizeAngle(deltaAngle));
      
              console.log('🔄 Group rotation - deltaAngle:', deltaAngle, 'selectedElements:', selectedElements.length);
      
      const radians = deltaAngle * Math.PI / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      
      // Apply transformation using interaction layout for real-time updates
      const updatedLayout = {
        ...currentLayout,
        tables: currentLayout.tables.map(table => {
          if (selectedElements.includes(table.id)) {
            const initial = groupRotationInitialStates.current[table.id];
            if (initial) {
              if (table.type === 'chair') return table;
        // Rotate position around group center
              const oldCenterX = initial.x + initial.width / 2;
              const oldCenterY = initial.y + initial.height / 2;
        
        const relativeX = oldCenterX - centerX;
        const relativeY = oldCenterY - centerY;
        
        const newCenterX = centerX + (relativeX * cos - relativeY * sin);
        const newCenterY = centerY + (relativeX * sin + relativeY * cos);
        
              const newX = newCenterX - initial.width / 2;
              const newY = newCenterY - initial.height / 2;
        
                      return {
                ...table,
                x: newX,
                y: newY,
                rotation: normalizeAngle(initial.rotation + deltaAngle)
              };
            }
          }
          return table;
        }),
        walls: currentLayout.walls.map(wall => {
          if (selectedElements.includes(wall.id)) {
            const initial = groupRotationInitialStates.current[wall.id];
            if (initial) {
              // Rotate position around group center (like tables do)
              const oldCenterX = initial.x + initial.width / 2;
              const oldCenterY = initial.y + initial.height / 2;
              
              const relativeX = oldCenterX - centerX;
              const relativeY = oldCenterY - centerY;
        
              const newCenterX = centerX + (relativeX * cos - relativeY * sin);
              const newCenterY = centerY + (relativeX * sin + relativeY * cos);
              
              // Calculate new wall rotation (normalized to 0-360)
              const newWallRotation = normalizeAngle(initial.rotation + deltaAngle);
              const radians = newWallRotation * Math.PI / 180;
              
              // Calculate new endpoints based on rotated center and length
              const halfLength = initial.width / 2;
              const newX1 = newCenterX - halfLength * Math.cos(radians);
              const newY1 = newCenterY - halfLength * Math.sin(radians);
              const newX2 = newCenterX + halfLength * Math.cos(radians);
              const newY2 = newCenterY + halfLength * Math.sin(radians);
        
        return {
          ...wall,
          x1: newX1,
          y1: newY1,
          x2: newX2,
          y2: newY2
        };
            }
          }
          return wall;
        }),
        texts: currentLayout.texts.map(text => {
          if (selectedElements.includes(text.id)) {
            const initial = groupRotationInitialStates.current[text.id];
            if (initial) {
        // Rotate position around group center
              const oldCenterX = initial.x + initial.width / 2;
              const oldCenterY = initial.y + initial.height / 2;
        
        const relativeX = oldCenterX - centerX;
        const relativeY = oldCenterY - centerY;
        
        const newCenterX = centerX + (relativeX * cos - relativeY * sin);
        const newCenterY = centerY + (relativeX * sin + relativeY * cos);
        
              const newX = newCenterX - initial.width / 2;
              const newY = newCenterY - initial.height / 2;
        
                      return {
                ...text,
                x: newX,
                y: newY,
                rotation: normalizeAngle(initial.rotation + deltaAngle)
              };
            }
          }
          return text;
        })
      };
      // Glue chairs live for BOTH circular and rectangular parents in the selection
      const circleIds = new Set(
        (updatedLayout.tables || []).filter((t:any) => selectedElements.includes(t.id) && t.type === 'circle')
                                   .map((t:any) => t.id)
      );
      const rectIds = new Set(
        (updatedLayout.tables || []).filter((t:any) => selectedElements.includes(t.id) && t.type !== 'circle' && t.type !== 'chair')
                                   .map((t:any) => t.id)
      );
      let gluedLive = updatedLayout;
      if (circleIds.size > 0) gluedLive = glueCircularChairsToParents(gluedLive, circleIds, false);
      if (rectIds.size > 0) gluedLive = glueRectChairsToParents(gluedLive, rectIds, false);
      setInteractionLayout(gluedLive);
    } else if (isRotating && selectedElements.length > 0) {
      // Handle rotation for selected elements
      let currentLayout = interactionLayout || layout;
      currentLayout = ensureAttachedAngles(currentLayout);
      
      const element = [...(currentLayout.tables || []), ...(currentLayout.texts || [])].find(
        el => selectedElements.includes(el.id)
      );
      const wall = currentLayout.walls?.find(w => selectedElements.includes(w.id));
      
      if (element) {
        const centerX = element.x + (element.width || 100) / 2;
        const centerY = element.y + (element.height || 100) / 2;
        
        // Calculate current angle and delta using new helper functions
        const currentAngle = calculateAngle(centerX, centerY, x, y);
        let deltaAngle = getAngleDifference(currentAngle, rotationStart);
        
        if (isShiftPressed) {
          // Snap to 45-degree increments
          deltaAngle = Math.round(deltaAngle / 45) * 45;
        }
        
        // Calculate new rotation with normalization
        const newRotation = normalizeAngle((originalRotations[element.id] || 0) + deltaAngle);
        setCurrentRotationAngle(newRotation);
        // Rotate selected elements
        const rotatedOnce = {
          ...currentLayout,
          tables: currentLayout.tables.map(table => 
            selectedElements.includes(table.id)
            ? (table.type === 'chair'
                ? table
                : { ...table, rotation: normalizeAngle((originalRotations[table.id] || 0) + deltaAngle) })
              : table
          ),
          texts: currentLayout.texts.map(text =>
            selectedElements.includes(text.id)
              ? { ...text, rotation: normalizeAngle((originalRotations[text.id] || 0) + deltaAngle) }
              : text
          )
        };
        // If a circular table is being rotated solo (non-group path), glue its chairs
        const selCircleParents = (rotatedOnce.tables || []).filter((t:any) => selectedElements.includes(t.id) && t.type === 'circle');
          if (selCircleParents.length > 0) {
          const circleIds = new Set(selCircleParents.map((t:any) => t.id));
          const glued = glueCircularChairsToParents(rotatedOnce, circleIds, false);
          setInteractionLayout(glued);
              } else {
          // Also glue rectangular parents in selection
          const rectIds = new Set(
            (rotatedOnce.tables || []).filter((t:any) => selectedElements.includes(t.id) && t.type !== 'circle' && t.type !== 'chair')
                                      .map((t:any) => t.id)
          );
          if (rectIds.size > 0) {
            const glued = glueRectChairsToParents(rotatedOnce, rectIds, false);
            setInteractionLayout(glued);
          } else {
            setInteractionLayout(rotatedOnce);
          }
        }
      } else if (wall) {
        // Rotate wall
        const centerX = (wall.x1 + wall.x2) / 2;
        const centerY = (wall.y1 + wall.y2) / 2;
        
        // Calculate current angle and delta using new helper functions
        const currentAngle = calculateAngle(centerX, centerY, x, y);
        let deltaAngle = getAngleDifference(currentAngle, rotationStart);
        
        if (isShiftPressed) {
          deltaAngle = Math.round(deltaAngle / 45) * 45;
        }
        
        // Calculate new endpoints based on rotation
        const length = Math.sqrt(Math.pow(wall.x2 - wall.x1, 2) + Math.pow(wall.y2 - wall.y1, 2));
        const newAngle = normalizeAngle((originalRotations[wall.id] || 0) + deltaAngle);
        
        // Update current rotation angle for display
        setCurrentRotationAngle(newAngle);
        
        const radians = newAngle * Math.PI / 180;
        
        const halfLength = length / 2;
        const newX1 = centerX - halfLength * Math.cos(radians);
        const newY1 = centerY - halfLength * Math.sin(radians);
        const newX2 = centerX + halfLength * Math.cos(radians);
        const newY2 = centerY + halfLength * Math.sin(radians);
        
        setInteractionLayout({
          ...currentLayout,
          walls: currentLayout.walls.map(w =>
            w.id === wall.id
              ? { ...w, x1: newX1, y1: newY1, x2: newX2, y2: newY2 }
              : w
          )
        });
      }
    } else if (isResizingWall && selectedElements.length === 1) {
      // Handle wall resizing
      const wallId = selectedElements[0];
      const currentLayout = interactionLayout || layout;
      const wall = currentLayout.walls?.find(w => w.id === wallId);
      if (!wall) return;

      let updates: Partial<typeof wall> = {};

      if (resizeHandle === 'start') {
        // Moving the start point
        updates = { x1: gridX, y1: gridY };
      } else if (resizeHandle === 'end') {
        // Moving the end point
        updates = { x2: gridX, y2: gridY };
      } else if (resizeHandle === 'thickness') {
        // Adjusting thickness based on distance from center
        const centerX = (wall.x1 + wall.x2) / 2;
        const centerY = (wall.y1 + wall.y2) / 2;
        
        // Calculate perpendicular distance from mouse to wall center line
        const wallAngle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
        const mouseAngle = Math.atan2(y - centerY, x - centerX);
        const perpDistance = Math.abs(Math.sin(mouseAngle - wallAngle) * 
          Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)));
        
        const newThickness = Math.max(10, Math.min(100, snapToGrid(perpDistance * 2)));
        updates = { thickness: newThickness };
      }

      setInteractionLayout({
        ...currentLayout,
        walls: currentLayout.walls.map(w =>
          w.id === wallId
            ? { ...w, ...updates }
            : w
        )
      });
    } else if (isResizingTable && selectedElements.length === 1) {
      // Handle table/text/wall resizing
      const elementId = selectedElements[0];
      let currentLayout = interactionLayout || layout;
      currentLayout = ensureAttachedAngles(currentLayout);
      
      const table = currentLayout.tables?.find(t => t.id === elementId);
      const text = currentLayout.texts?.find(t => t.id === elementId);
      const wall = currentLayout.walls?.find(w => w.id === elementId);
      
      // Handle wall resizing (using table resize logic)
      if (wall && originalTableForResize && originalTableForResize.isWall) {
        if (wall && originalTableForResize && originalTableForResize.isWall) {
          // Handle wall resize with anchor points
          if (resizingAnchorPoint && tableResizeHandle && ['tl', 'tr', 'bl', 'br'].includes(tableResizeHandle)) {
            const rotationRad = (originalTableForResize.rotation || 0) * Math.PI / 180;
            
            const mouseX = x;
            const mouseY = y;
            
            const d_world = { x: mouseX - resizingAnchorPoint.x, y: mouseY - resizingAnchorPoint.y };
            
            const cos_neg = Math.cos(-rotationRad);
            const sin_neg = Math.sin(-rotationRad);
            
            const d_local = {
              x: d_world.x * cos_neg - d_world.y * sin_neg,
              y: d_world.x * sin_neg + d_world.y * cos_neg,
            };

            if (isShiftPressed) {
              if (originalTableForResize.isWall) {
                // Corner resize with Shift on a wall: use uniform scale for length & thickness
                const ow = Math.max(1, originalTableForResize.width);
                const oh = Math.max(1, originalTableForResize.height);
                const sx = Math.abs(d_local.x) / ow;
                const sy = Math.abs(d_local.y) / oh;
                const s = Math.max(sx, sy);
                d_local.x = Math.sign(d_local.x) * ow * s;
                d_local.y = Math.sign(d_local.y) * oh * s;
              } else {
                // Non-wall: keep aspect ratio relative to original
                const originalAspectRatio = originalTableForResize.width / originalTableForResize.height;
                if (Math.abs(d_local.y) < 1e-6) {
                   d_local.x = 0;
                } else {
                    const currentAspectRatio = Math.abs(d_local.x / d_local.y);
                    if (currentAspectRatio > originalAspectRatio) {
                      d_local.y = (Math.abs(d_local.x) / originalAspectRatio) * Math.sign(d_local.y);
                    } else {
                      d_local.x = (Math.abs(d_local.y) * originalAspectRatio) * Math.sign(d_local.x);
                    }
                }
              }
            }

            const newWidth = Math.max(10, Math.abs(snapToGrid(d_local.x)));  // Reduced min length for wall
          const newHeight = Math.max(5, Math.abs(snapToGrid(d_local.y))); // Reduced min thickness for wall

            const scale_x = d_local.x > 0 ? 1 : -1;
            const scale_y = d_local.y > 0 ? 1 : -1;

            const cos = Math.cos(rotationRad);
            const sin = Math.sin(rotationRad);
            
            const centerOffset = {
              x: scale_x * newWidth / 2,
              y: scale_y * newHeight / 2,
            };
            
            const newCenter = {
              x: resizingAnchorPoint.x + centerOffset.x * cos - centerOffset.y * sin,
              y: resizingAnchorPoint.y + centerOffset.x * sin + centerOffset.y * cos,
            };

            // Calculate new wall endpoints
            const halfLength = newWidth / 2;
            const newX1 = newCenter.x - halfLength * cos;
            const newY1 = newCenter.y - halfLength * sin;
            const newX2 = newCenter.x + halfLength * cos;
            const newY2 = newCenter.y + halfLength * sin;

            setInteractionLayout({
              ...currentLayout,
              walls: currentLayout.walls.map(w =>
                w.id === elementId
                  ? { ...w, x1: newX1, y1: newY1, x2: newX2, y2: newY2, thickness: newHeight }
                  : w
              )
            });
            return;
          }
          
          // Handle side resizing for walls
          const rotationRad = (originalTableForResize.rotation || 0) * Math.PI / 180;
          const isRotated = (originalTableForResize.rotation || 0) % 360 !== 0;
          
          if (isRotated && tableResizeHandle && ['t', 'r', 'b', 'l'].includes(tableResizeHandle)) {
            const mouseX = x;
            const mouseY = y;

            const originalWidth = originalTableForResize.width;
            const originalHeight = originalTableForResize.height;
            const originalCenterX = originalTableForResize.x + originalWidth / 2;
            const originalCenterY = originalTableForResize.y + originalHeight / 2;

            const cos = Math.cos(rotationRad);
            const sin = Math.sin(rotationRad);

            let newWidth = originalWidth;
            let newHeight = originalHeight;
            let newCenterX = originalCenterX;
            let newCenterY = originalCenterY;

            switch (tableResizeHandle) {
              case 't': {
                  // Anchor at bottom edge of wall
                  const anchorX = originalCenterX - (originalHeight / 2) * sin;
                  const anchorY = originalCenterY + (originalHeight / 2) * cos;
                  const mouseVecX = mouseX - anchorX;
                  const mouseVecY = mouseY - anchorY;
                  
                  const projLength = mouseVecX * sin + mouseVecY * -cos;
                  const isInverted = projLength < 0;
                  newHeight = Math.max(5, Math.abs(snapToGrid(projLength)));
                  
                  // Calculate new center based on direction
                  if (isInverted) {
                    // When inverted, anchor becomes the top edge
                    newCenterX = anchorX - (newHeight / 2) * sin;
                    newCenterY = anchorY + (newHeight / 2) * cos;
                  } else {
                    // Normal case - anchor at bottom
                    newCenterX = anchorX + (newHeight / 2) * sin;
                    newCenterY = anchorY - (newHeight / 2) * cos;
                  }
                  break;
              }
              case 'b': {
                  // Anchor at top edge of wall
                  const anchorX = originalCenterX + (originalHeight / 2) * sin;
                  const anchorY = originalCenterY - (originalHeight / 2) * cos;
                  const mouseVecX = mouseX - anchorX;
                  const mouseVecY = mouseY - anchorY;
                  
                  const projLength = mouseVecX * -sin + mouseVecY * cos;
                  const isInverted = projLength < 0;
                  newHeight = Math.max(5, Math.abs(snapToGrid(projLength)));
                  
                  // Calculate new center based on direction
                  if (isInverted) {
                    // When inverted, anchor becomes the bottom edge
                    newCenterX = anchorX + (newHeight / 2) * sin;
                    newCenterY = anchorY - (newHeight / 2) * cos;
                  } else {
                    // Normal case - anchor at top
                    newCenterX = anchorX - (newHeight / 2) * sin;
                    newCenterY = anchorY + (newHeight / 2) * cos;
                  }
                  break;
              }
              case 'l': {
                  // Anchor at right edge of wall
                  const anchorX = originalCenterX + (originalWidth / 2) * cos;
                  const anchorY = originalCenterY + (originalWidth / 2) * sin;
                  const mouseVecX = mouseX - anchorX;
                  const mouseVecY = mouseY - anchorY;
                  
                  const projLength = mouseVecX * -cos + mouseVecY * -sin;
                  const isInverted = projLength < 0;
                  newWidth = Math.max(10, Math.abs(snapToGrid(projLength)));
                  
                  // Calculate new center based on direction
                  if (isInverted) {
                    // When inverted, anchor becomes the left edge
                    newCenterX = anchorX + (newWidth / 2) * cos;
                    newCenterY = anchorY + (newWidth / 2) * sin;
                  } else {
                    // Normal case - anchor at right
                    newCenterX = anchorX - (newWidth / 2) * cos;
                    newCenterY = anchorY - (newWidth / 2) * sin;
                  }
                  break;
              }
              case 'r': {
                  // Anchor at left edge of wall
                  const anchorX = originalCenterX - (originalWidth / 2) * cos;
                  const anchorY = originalCenterY - (originalWidth / 2) * sin;
                  const mouseVecX = mouseX - anchorX;
                  const mouseVecY = mouseY - anchorY;

                  const projLength = mouseVecX * cos + mouseVecY * sin;
                  const isInverted = projLength < 0;
                  newWidth = Math.max(10, Math.abs(snapToGrid(projLength)));

                  // Calculate new center based on direction
                  if (isInverted) {
                    // When inverted, anchor becomes the right edge
                    newCenterX = anchorX - (newWidth / 2) * cos;
                    newCenterY = anchorY - (newWidth / 2) * sin;
                  } else {
                    // Normal case - anchor at left
                    newCenterX = anchorX + (newWidth / 2) * cos;
                    newCenterY = anchorY + (newWidth / 2) * sin;
                  }
                  break;
              }
            }
            
            // Calculate new wall endpoints
            const halfLength = newWidth / 2;
            const newX1 = newCenterX - halfLength * cos;
            const newY1 = newCenterY - halfLength * sin;
            const newX2 = newCenterX + halfLength * cos;
            const newY2 = newCenterY + halfLength * sin;

            setInteractionLayout({
              ...currentLayout,
              walls: currentLayout.walls.map(w =>
                w.id === elementId
                  ? { ...w, x1: newX1, y1: newY1, x2: newX2, y2: newY2, thickness: newHeight }
                  : w
              )
            });
            return;
          }
          
          // Non-rotated wall resize (simple case)
          const originalCenterX = originalTableForResize.x + originalTableForResize.width / 2;
          const originalCenterY = originalTableForResize.y + originalTableForResize.height / 2;
          
          let newLength = originalTableForResize.width;
          let newThickness = originalTableForResize.height;
          let newCenterX = originalCenterX;
          let newCenterY = originalCenterY;
          
          if (tableResizeHandle) {
            switch (tableResizeHandle) {
              case 'tl':
                newLength = Math.max(10, originalTableForResize.x + originalTableForResize.width - gridX);
                newThickness = Math.max(5, originalTableForResize.y + originalTableForResize.height - gridY);
                newCenterX = gridX + newLength / 2;
                newCenterY = gridY + newThickness / 2;
                break;
              case 'tr':
                newLength = Math.max(10, gridX - originalTableForResize.x);
                newThickness = Math.max(5, originalTableForResize.y + originalTableForResize.height - gridY);
                newCenterX = originalTableForResize.x + newLength / 2;
                newCenterY = gridY + newThickness / 2;
                break;
              case 'bl':
                newLength = Math.max(10, originalTableForResize.x + originalTableForResize.width - gridX);
                newThickness = Math.max(5, gridY - originalTableForResize.y);
                newCenterX = gridX + newLength / 2;
                newCenterY = originalTableForResize.y + newThickness / 2;
                break;
              case 'br':
                newLength = Math.max(10, gridX - originalTableForResize.x);
                newThickness = Math.max(5, gridY - originalTableForResize.y);
                newCenterX = originalTableForResize.x + newLength / 2;
                newCenterY = originalTableForResize.y + newThickness / 2;
                break;
              case 't': {
                // Anchor at bottom edge
                const anchorY = originalTableForResize.y + originalTableForResize.height;
                const projectedThickness = anchorY - gridY;
                const isInverted = projectedThickness < 0;
                newThickness = Math.max(5, Math.abs(projectedThickness));
                
                if (isInverted) {
                  // When inverted, new top becomes the anchor
                  newCenterY = anchorY + newThickness / 2;
                } else {
                  // Normal case - anchor at bottom
                  newCenterY = anchorY - newThickness / 2;
                }
                break;
              }
              case 'b': {
                // Anchor at top edge
                const anchorY = originalTableForResize.y;
                const projectedThickness = gridY - anchorY;
                const isInverted = projectedThickness < 0;
                newThickness = Math.max(5, Math.abs(projectedThickness));
                
                if (isInverted) {
                  // When inverted, new bottom becomes the anchor
                  newCenterY = anchorY - newThickness / 2;
                } else {
                  // Normal case - anchor at top
                  newCenterY = anchorY + newThickness / 2;
                }
                break;
              }
              case 'l': {
                // Anchor at right edge
                const anchorX = originalTableForResize.x + originalTableForResize.width;
                const projectedLength = anchorX - gridX;
                const isInverted = projectedLength < 0;
                newLength = Math.max(10, Math.abs(projectedLength));
                
                if (isInverted) {
                  // When inverted, new left becomes the anchor
                  newCenterX = anchorX + newLength / 2;
                } else {
                  // Normal case - anchor at right
                  newCenterX = anchorX - newLength / 2;
                }
                break;
              }
              case 'r': {
                // Anchor at left edge
                const anchorX = originalTableForResize.x;
                const projectedLength = gridX - anchorX;
                const isInverted = projectedLength < 0;
                newLength = Math.max(10, Math.abs(projectedLength));
                
                if (isInverted) {
                  // When inverted, new right becomes the anchor
                  newCenterX = anchorX - newLength / 2;
                } else {
                  // Normal case - anchor at left
                  newCenterX = anchorX + newLength / 2;
                }
                break;
              }
            }
          }
          
          const halfLength = newLength / 2;
          const newX1 = newCenterX - halfLength;
          const newY1 = newCenterY;
          const newX2 = newCenterX + halfLength;
          const newY2 = newCenterY;

          setInteractionLayout({
            ...currentLayout,
            walls: currentLayout.walls.map(w =>
              w.id === elementId
                ? { ...w, x1: newX1, y1: newY1, x2: newX2, y2: newY2, thickness: newThickness }
                : w
            )
          });
          return;
        }
      }
      
      // Text scaling removed - texts are resized via font size controls in toolbar
      
      // Original table resize logic continues below...
      if (!table) return;

      // Rotated resize on corners - mirror exact non-rotated behavior in element-local coords
      if (
        originalTableForResize &&
        resizingAnchorPoint &&
        tableResizeHandle &&
        ['tl', 'tr', 'bl', 'br'].includes(tableResizeHandle) &&
        ((originalTableForResize.rotation || 0) % 360 !== 0)
      ) {
        const rotationRad = (originalTableForResize.rotation || 0) * Math.PI / 180;
        const cosNeg = Math.cos(-rotationRad);
        const sinNeg = Math.sin(-rotationRad);
        const cosPos = Math.cos(rotationRad);
        const sinPos = Math.sin(rotationRad);

        const origW = originalTableForResize.width || 100;
        const origH = originalTableForResize.height || 100;
        const origCenterX = originalTableForResize.x + origW / 2;
        const origCenterY = originalTableForResize.y + origH / 2;
        const minSz = (originalTableForResize && originalTableForResize.type === 'chair') ? GRID_SIZE : 30;

        // Anchor-based, wall-like approach to eliminate jitter:
        // Treat resizingAnchorPoint as the fixed opposite corner in world coords.
        // Measure mouse delta in element-local space, snap lengths to grid in local axes,
        // then compute new center from anchor + rotated half-extents.
        const d_world = { x: x - resizingAnchorPoint.x, y: y - resizingAnchorPoint.y };
        const d_local = {
          x: d_world.x * cosNeg - d_world.y * sinNeg,
          y: d_world.x * sinNeg + d_world.y * cosNeg,
        };
        const snappedLocalW = Math.max(minSz, Math.abs(snapToGrid(d_local.x)));
        const snappedLocalH = Math.max(minSz, Math.abs(snapToGrid(d_local.y)));
        const sxSign = d_local.x >= 0 ? 1 : -1;
        const sySign = d_local.y >= 0 ? 1 : -1;
        const centerOffset = {
          x: (sxSign * snappedLocalW) / 2,
          y: (sySign * snappedLocalH) / 2,
        };
        const newCenter = {
          x: resizingAnchorPoint.x + centerOffset.x * cosPos - centerOffset.y * sinPos,
          y: resizingAnchorPoint.y + centerOffset.x * sinPos + centerOffset.y * cosPos,
        };
        const worldX = newCenter.x - snappedLocalW / 2;
        const worldY = newCenter.y - snappedLocalH / 2;

        {
          let next = {
          ...currentLayout,
          tables: currentLayout.tables.map(t =>
            t.id === elementId
              ? (() => {
                  const updated: any = { ...t, x: worldX, y: worldY, width: snappedLocalW, height: snappedLocalH };
                  if (t.type === 'chair' && (t as any).chairVariant === 'boothU') {
                    const scale = Math.max(snappedLocalW / Math.max(1, origW), snappedLocalH / Math.max(1, origH));
                    const baseTh = (originalTableForResize as any)?.boothThickness ?? 15;
                    updated.boothThickness = Math.max(2, Math.round(baseTh * scale));
                  }
                  return updated;
                })()
              : t
          )
          };
          const circleIds = new Set(
            (next.tables || []).filter((t:any) => selectedElements.includes(t.id) && t.type === 'circle')
                               .map((t:any) => t.id)
          );
          if (circleIds.size > 0) next = glueCircularChairsToParents(next, circleIds, false);
          const rectIds = new Set(
            (next.tables || []).filter((t:any) => selectedElements.includes(t.id) && t.type !== 'circle' && t.type !== 'chair')
                               .map((t:any) => t.id)
          );
          if (rectIds.size > 0) next = glueRectChairsToParents(next, rectIds, false);
          requestAnimationFrame(() => setInteractionLayout(next));
        }
        return;

        // Fallback should never be reached due to early return above
      }

      const rotationRad = (table.rotation || 0) * Math.PI / 180;
      const isRotated = (table.rotation || 0) % 360 !== 0;
      // Chairs have a smaller minimal size to avoid instant jump when starting resize
      const minTableSize = table.type === 'chair' ? GRID_SIZE : 30;

      // Rotated resize on sides - mirror non-rotated side behavior in element-local coords
      if (isRotated && originalTableForResize && tableResizeHandle && ['t', 'r', 'b', 'l'].includes(tableResizeHandle)) {
        const origW = originalTableForResize.width || 100;
        const origH = originalTableForResize.height || 100;
        const origCenterX = originalTableForResize.x + origW / 2;
        const origCenterY = originalTableForResize.y + origH / 2;

        const cos = Math.cos(rotationRad);
        const sin = Math.sin(rotationRad);

        let newWidth = origW;
        let newHeight = origH;
        let newCenterX = origCenterX;
        let newCenterY = origCenterY;

        switch (tableResizeHandle) {
          case 't': {
              // Anchor at bottom edge center
              const anchorX = origCenterX - (origH / 2) * sin;
              const anchorY = origCenterY + (origH / 2) * cos;
              const mouseVecX = x - anchorX;
              const mouseVecY = y - anchorY;
              const projLength = mouseVecX * sin + mouseVecY * -cos;
              const snapped = snapToGrid(projLength);
              const isInverted = snapped < 0;
              newHeight = Math.max(minTableSize, Math.abs(snapped));
              if (isInverted) {
                newCenterX = anchorX - (newHeight / 2) * sin;
                newCenterY = anchorY + (newHeight / 2) * cos;
              } else {
                newCenterX = anchorX + (newHeight / 2) * sin;
                newCenterY = anchorY - (newHeight / 2) * cos;
              }
              break;
          }
          case 'b': {
              // Anchor at top edge center
              const anchorX = origCenterX + (origH / 2) * sin;
              const anchorY = origCenterY - (origH / 2) * cos;
              const mouseVecX = x - anchorX;
              const mouseVecY = y - anchorY;
              const projLength = mouseVecX * -sin + mouseVecY * cos;
              const snapped = snapToGrid(projLength);
              const isInverted = snapped < 0;
              newHeight = Math.max(minTableSize, Math.abs(snapped));
              if (isInverted) {
                newCenterX = anchorX + (newHeight / 2) * sin;
                newCenterY = anchorY - (newHeight / 2) * cos;
              } else {
                newCenterX = anchorX - (newHeight / 2) * sin;
                newCenterY = anchorY + (newHeight / 2) * cos;
              }
              break;
          }
          case 'l': {
              // Anchor at right edge center
              const anchorX = origCenterX + (origW / 2) * cos;
              const anchorY = origCenterY + (origW / 2) * sin;
              const mouseVecX = x - anchorX;
              const mouseVecY = y - anchorY;
              const projLength = mouseVecX * -cos + mouseVecY * -sin;
              const snapped = snapToGrid(projLength);
              const isInverted = snapped < 0;
              newWidth = Math.max(minTableSize, Math.abs(snapped));
              if (isInverted) {
                newCenterX = anchorX + (newWidth / 2) * cos;
                newCenterY = anchorY + (newWidth / 2) * sin;
              } else {
                newCenterX = anchorX - (newWidth / 2) * cos;
                newCenterY = anchorY - (newWidth / 2) * sin;
              }
              break;
          }
          case 'r': {
              // Anchor at left edge center
              const anchorX = origCenterX - (origW / 2) * cos;
              const anchorY = origCenterY - (origW / 2) * sin;
              const mouseVecX = x - anchorX;
              const mouseVecY = y - anchorY;
              const projLength = mouseVecX * cos + mouseVecY * sin;
              const snapped = snapToGrid(projLength);
              const isInverted = snapped < 0;
              newWidth = Math.max(minTableSize, Math.abs(snapped));
              if (isInverted) {
                newCenterX = anchorX - (newWidth / 2) * cos;
                newCenterY = anchorY - (newWidth / 2) * sin;
              } else {
                newCenterX = anchorX + (newWidth / 2) * cos;
                newCenterY = anchorY + (newWidth / 2) * sin;
              }
              break;
          }
        }

        const newX = newCenterX - newWidth / 2;
        const newY = newCenterY - newHeight / 2;

        {
          let next = {
          ...currentLayout,
          tables: currentLayout.tables.map(t =>
            t.id === elementId
              ? { ...t, x: newX, y: newY, width: newWidth, height: newHeight }
              : t
          )
          };
          const circleIds = new Set(
            (next.tables || []).filter((t:any) => selectedElements.includes(t.id) && t.type === 'circle')
                               .map((t:any) => t.id)
          );
          if (circleIds.size > 0) next = glueCircularChairsToParents(next, circleIds, false);
          try { next = autoGenerateChairsForTable(next, elementId); } catch {}
          requestAnimationFrame(() => setInteractionLayout(next));
        }
        return; // Skip old logic
      }


      // Get the original bounds
      // Always anchor against the geometry from the moment resize started.
      // Using current (live) table values can drift the anchor when chairs re-glue during interaction.
      const baseForResize = (originalTableForResize as any) || table;
      const originalLeft = baseForResize.x;
      const originalTop = baseForResize.y;
      const originalRight = baseForResize.x + (baseForResize.width || 100);
      const originalBottom = baseForResize.y + (baseForResize.height || 100);

      let newX = table.x;
      let newY = table.y;
      let newWidth = table.width || 100;
      let newHeight = table.height || 100;
      // Calculate new dimensions based on handle using raw (unsnapped) mouse for stability
      const rawClampedX = clampX(x);
      const rawClampedY = clampY(y);
      if (tableResizeHandle) {
        switch (tableResizeHandle) {
          case 'tl': // Top-left - anchor bottom-right
            newX = Math.min(rawClampedX, originalRight - minTableSize);
            newY = Math.min(rawClampedY, originalBottom - minTableSize);
            newWidth = originalRight - newX;
            newHeight = originalBottom - newY;
            break;
            
          case 'tr': // Top-right - anchor bottom-left
            newY = Math.min(rawClampedY, originalBottom - minTableSize);
            newWidth = Math.max(minTableSize, rawClampedX - originalLeft);
            newHeight = originalBottom - newY;
            break;
            
          case 'bl': // Bottom-left - anchor top-right
            newX = Math.min(rawClampedX, originalRight - minTableSize);
            newWidth = originalRight - newX;
            newHeight = Math.max(minTableSize, rawClampedY - originalTop);
            break;
            
          case 'br': // Bottom-right - anchor top-left
            newWidth = Math.max(minTableSize, rawClampedX - originalLeft);
            newHeight = Math.max(minTableSize, rawClampedY - originalTop);
            break;
            
          case 't': // Top - anchor bottom
            newY = Math.min(rawClampedY, originalBottom - minTableSize);
            newHeight = originalBottom - newY;
            break;
            
          case 'r': // Right - anchor left
            newWidth = Math.max(minTableSize, rawClampedX - originalLeft);
            break;
            
          case 'b': // Bottom - anchor top
            newHeight = Math.max(minTableSize, rawClampedY - originalTop);
            break;
            
          case 'l': // Left - anchor right
            newX = Math.min(rawClampedX, originalRight - minTableSize);
            newWidth = originalRight - newX;
            break;
        }
      }

      // Maintain aspect ratio: always for circular tables; always for booth variants; or when Shift is pressed (corner handles only)
      const isBoothCurvedNR = table && table.type === 'chair' && (table as any).chairVariant === 'boothCurved';
      const isBoothUNR = table && table.type === 'chair' && (table as any).chairVariant === 'boothU';
      const isCircleNR = table && table.type === 'circle';
      if ((isCircleNR || isShiftPressed || isBoothCurvedNR || isBoothUNR) && tableResizeHandle && ['tl', 'tr', 'bl', 'br'].includes(tableResizeHandle)) {
        const origW = (baseForResize.width || 100);
        const origH = (baseForResize.height || 100);
        const targetAspectRatio = isBoothCurvedNR ? 2 : isBoothUNR ? 1 : (origW / origH);
        // Stable uniform scaling from original size
        const scale = Math.max(newWidth / Math.max(1, origW), newHeight / Math.max(1, origH));
        newWidth = Math.round(origW * scale);
        newHeight = Math.round(origH * scale);
        // Re-anchor based on handle to keep opposite corner fixed
          switch (tableResizeHandle) {
            case 'tl':
            newX = originalRight - newWidth;
              newY = originalBottom - newHeight;
              break;
            case 'tr':
              newY = originalBottom - newHeight;
              break;
            case 'bl':
              newX = originalRight - newWidth;
              break;
          case 'br':
          default:
            // anchored at top-left, nothing to change
            break;
        }
      }

      // Quantize size to grid for stability, then re-anchor position to keep the correct opposite side fixed
      if (tableResizeHandle) {
        const qW = Math.max(minTableSize, Math.ceil(newWidth / GRID_SIZE) * GRID_SIZE);
        const qH = Math.max(minTableSize, Math.ceil(newHeight / GRID_SIZE) * GRID_SIZE);
        switch (tableResizeHandle) {
          case 'tl':
            newX = originalRight - qW;
            newY = originalBottom - qH;
            break;
          case 'tr':
            newX = originalLeft;
            newY = originalBottom - qH;
            break;
          case 'bl':
            newX = originalRight - qW;
            newY = originalTop;
            break;
          case 'br':
            newX = originalLeft;
            newY = originalTop;
            break;
          case 't':
            newY = originalBottom - qH;
            break;
          case 'b':
            newY = originalTop;
            break;
          case 'l':
            newX = originalRight - qW;
            break;
          case 'r':
            newX = originalLeft;
            break;
        }
        newWidth = qW;
        newHeight = qH;
      }

      // Ensure minimum dimensions
      newWidth = Math.max(minTableSize, newWidth);
      newHeight = Math.max(minTableSize, newHeight);
      
      // Ensure position doesn't cause negative dimensions
      if (newX > originalRight - minTableSize) {
        newX = originalRight - minTableSize;
        newWidth = minTableSize;
      }
      if (newY > originalBottom - minTableSize) {
        newY = originalBottom - minTableSize;
        newHeight = minTableSize;
      }

      {
        let next = {
        ...currentLayout,
        tables: currentLayout.tables.map(t =>
          t.id === elementId
            ? (() => {
                const updated: any = { ...t, x: newX, y: newY, width: newWidth, height: newHeight };
                if (t.type === 'chair' && (t as any).chairVariant === 'boothU' && tableResizeHandle && ['tl','tr','bl','br'].includes(tableResizeHandle)) {
                  const baseW = (table.width || 100);
                  const baseH = (table.height || 100);
                  const scaleX = newWidth / Math.max(1, baseW);
                  const scaleY = newHeight / Math.max(1, baseH);
                  const s = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
                  const baseTh = (t as any).boothThickness ?? 15;
                  updated.boothThickness = Math.max(2, Math.round(baseTh * s));
                }
                return updated;
              })()
            : t
        )
        };
        const circleIds = new Set(
          (next.tables || []).filter((t:any) => selectedElements.includes(t.id) && t.type === 'circle')
                             .map((t:any) => t.id)
        );
        if (circleIds.size > 0) next = glueCircularChairsToParents(next, circleIds, false);
        const rectIds = new Set(
          (next.tables || []).filter((t:any) => selectedElements.includes(t.id) && t.type !== 'circle' && t.type !== 'chair')
                             .map((t:any) => t.id)
        );
        if (rectIds.size > 0) next = glueRectChairsToParents(next, rectIds, false);
        requestAnimationFrame(() => setInteractionLayout(next));
      }
    }
  };

  // Helper function to check if a wall is in selection box (improved version)
  const isWallInSelectionBoxImproved = (wall: any, box: any) => {
    const boxLeft = Math.min(box.x1, box.x2);
    const boxTop = Math.min(box.y1, box.y2);
    const boxRight = Math.max(box.x1, box.x2);
    const boxBottom = Math.max(box.y1, box.y2);
    
    // Get the wall's full rectangle (including thickness)
    const wallRect = getWallRectangle(wall.x1, wall.y1, wall.x2, wall.y2, wall.thickness);
    
    // Calculate the wall rectangle corners taking rotation into account
    const wallLeft = wallRect.centerX - wallRect.width / 2;
    const wallTop = wallRect.centerY - wallRect.height / 2;
    const wallRight = wallLeft + wallRect.width;
    const wallBottom = wallTop + wallRect.height;
    
    // Check if the wall rectangle intersects with the selection box
    if (Math.abs(wallRect.angle) < 0.1) {
      // No rotation - simple rectangle intersection
      return !(wallRight < boxLeft || 
               wallLeft > boxRight || 
               wallBottom < boxTop || 
               wallTop > boxBottom);
    } else {
      // Wall is rotated - use rotated rectangle intersection
      const wallElement = {
        x: wallLeft,
        y: wallTop,
        width: wallRect.width,
        height: wallRect.height,
        rotation: wallRect.angle
      };
      return isRotatedRectangleInSelectionBox(wallElement, box);
    }
  };

  // Update marquee selection
  const updateMarqueeSelection = () => {
    const box = {
      x1: marqueeStart.x,
      y1: marqueeStart.y,
      x2: marqueeEnd.x,
      y2: marqueeEnd.y
    };
    
    let newSelection: string[] = [];
    const currentLayout = interactionLayout || layout;
    
    // Check tables
    currentLayout.tables?.forEach(table => {
      if (isInSelectionBox(table, box)) {
        newSelection.push(table.id);
      }
    });
    
    // Check walls - use improved function that considers wall thickness and rotation
    currentLayout.walls?.forEach(wall => {
      if (isWallInSelectionBoxImproved(wall, box)) {
        newSelection.push(wall.id);
      }
    });
    
    // Check texts
    currentLayout.texts?.forEach(text => {
      if (isInSelectionBox(text, box)) {
        newSelection.push(text.id);
      }
    });
    
    // Expand with attached chairs for any selected tables
    const expandWithAttachedChairs = (ids: string[]) => {
      const current = interactionLayout || layout;
      const set = new Set(ids);
      const parents = (current.tables || []).filter(t => t && t.type !== 'chair' && set.has(t.id));
      if (parents.length > 0) {
        const attached = (current.tables || []).filter(t => t?.type === 'chair' && parents.some(tb => t.attachedToTableId === tb.id)).map(t => t.id);
        attached.forEach(id => set.add(id));
      }
      return Array.from(set);
    };
    // Remove chairs selected alone (without their parent table)
    (() => {
      const current = interactionLayout || layout;
      const set = new Set(newSelection);
      const toRemove: string[] = [];
      (current.tables || []).forEach((t: any) => {
        if (t && t.type === 'chair' && t.attachedToTableId && set.has(t.id)) {
          const parent = (current.tables || []).find((p: any) => p.id === t.attachedToTableId && p.type !== 'chair');
          if (parent && !set.has(parent.id)) {
            toRemove.push(t.id);
          }
        }
      });
      if (toRemove.length > 0) {
        newSelection = newSelection.filter(id => !toRemove.includes(id));
      }
    })();
    newSelection = expandWithAttachedChairs(newSelection);
    
    if (isShiftPressed) {
      // Add to existing selection - preserve rotation if adding to same group
      setSelectedElements(prev => {
        const combined = expandWithAttachedChairs([...new Set([...prev, ...newSelection])]);
        // Only reset rotation if this is a completely new selection
        if (prev.length === 0 && newSelection.length > 0) {
          setGroupTotalRotation(0);
        }
        return combined;
      });
    } else {
      // Replace selection - only reset rotation if selecting different elements
      setSelectedElements(prev => {
        // Check if this is the same selection
        if (prev.length === newSelection.length && 
            prev.every(id => newSelection.includes(id)) && 
            newSelection.every(id => prev.includes(id))) {
          // Same selection, preserve rotation
          return prev;
        } else {
          // Different selection, reset rotation
          setGroupTotalRotation(0);
          return newSelection;
        }
      });
    }
  };

  // Handle mouse up
  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only finalize drawing/placing on LEFT mouse button
    if (e.button !== 0) return;
    if (isDrawing) {
      setIsDrawing(false);

      const rect = canvasRef.current!.getBoundingClientRect();
      const { x: localEndX, y: localEndY } = getZoomAdjustedCoordinates(e.clientX, e.clientY, rect);
      const endRawX = localEndX - canvasOffset.x;
      const endRawY = localEndY - canvasOffset.y;
      const endX = snapToGrid(clampX(endRawX));
      const endY = snapToGrid(clampY(endRawY));

      if (selectedTool === 'table') {
        const { width, height } = getConstrainedDimensions(drawStart.x, drawStart.y, endX, endY, isShiftPressed || tableType === 'circle');
        
        // Only create table if it has some size
        if (Math.abs(width) > 10 && Math.abs(height) > 10) {
          // Compute next number globally across all zones
          const nextNumber = getGlobalNextTableNumber();

          const wAbs = Math.abs(width);
          const hAbs = Math.abs(height);
          const startX = width < 0 ? drawStart.x + width : drawStart.x;
          const startY = height < 0 ? drawStart.y + height : drawStart.y;
          const clampedX = clampX(startX, wAbs);
          const clampedY = clampY(startY, hAbs);
          const newTable = {
            id: `table-${Date.now()}`,
            number: nextNumber,
            x: clampedX,
            y: clampedY,
            width: wAbs,
            height: hAbs,
            type: tableType,
            name: `${nextNumber}`,
            seats: 4,
            status: 'available' as const,
            color: '#FFFFFF',
            rotation: 0
          };

          setLayout({
            ...layout,
            tables: [...(layout.tables || []), newTable]
          });

          // Clear interaction layout to ensure undo/redo works properly
          setInteractionLayout(null);
        }
      } else if (selectedTool === 'wall') {
        // Use rectangle drawing approach like tables
        const { width, height } = getConstrainedDimensions(drawStart.x, drawStart.y, endX, endY, isShiftPressed);
        const wallWidth = Math.abs(width);
        const wallHeight = Math.abs(height);
        
        // Only create wall if it has reasonable size
        if (wallWidth > 5 && wallHeight > 5) {
          // Always create horizontal wall (like tables), width = length, height = thickness
          const startX = clampX(width < 0 ? drawStart.x + width : drawStart.x);
          const centerY = clampY((height < 0 ? drawStart.y + height : drawStart.y) + wallHeight / 2);
          
          let thickness = wallHeight;
          
          // If shift is pressed, ensure minimum thickness
          if (isShiftPressed) {
            thickness = Math.max(thickness, DEFAULT_WALL_THICKNESS);
          }
          
          const newWall = {
            id: `wall-${Date.now()}`,
            x1: clampX(startX),
            y1: clampY(centerY),
            x2: clampX(startX + wallWidth),
            y2: clampY(centerY),
            thickness
          };

          setLayout({
            ...layout,
            walls: [...(layout.walls || []), newWall]
          });
          
          // Clear interaction layout to ensure undo/redo works properly
          setInteractionLayout(null);
        }
      } else if (selectedTool === 'text') {
        const dx = Math.abs(endX - drawStart.x);
        const dy = Math.abs(endY - drawStart.y);
        const isClick = dx < 5 && dy < 5; // Use a smaller threshold for a click

        if (isClick) {
          // It's a click, so place the text input field.
          setTextPosition({ x: drawStart.x, y: drawStart.y });
          setTextInput('');
          setEditingTextId(null); // Ensure we're creating a new one
          setIsTextInputCancelled(false); // Reset cancellation flag
          setShowTextInput(true);
        }
        // If it's a drag, we do nothing, as per the new requirement.
      }
    }

    // Apply interaction layout to actual layout if there were changes
    if (interactionLayout && (isDragging || isResizingWall || isResizingTable || isRotating || isGroupScaling || isGroupRotating)) {
      // Commit interactively produced result. After rotation (single or group), snap the
      // selection bounding box to the grid by shifting ALL selected elements uniformly.
      let finalized = interactionLayout;
      if ((isGroupRotating || isRotating) && selectedElements.length > 0) {
        // Compute AABB of current selection from the interaction layout
        const current = interactionLayout;
        const sel = new Set(selectedElements);
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        // Compute corners inline
        const accumulateRect = (x: number, y: number, w: number, h: number, rotDeg: number) => {
          const cx = x + w / 2, cy = y + h / 2;
          const rad = (rotDeg || 0) * Math.PI / 180;
          const cos = Math.cos(rad), sin = Math.sin(rad);
          const pts = [
            { lx: -w/2, ly: -h/2 },
            { lx: +w/2, ly: -h/2 },
            { lx: +w/2, ly: +h/2 },
            { lx: -w/2, ly: +h/2 },
          ].map(p => ({ x: cx + p.lx * cos - p.ly * sin, y: cy + p.lx * sin + p.ly * cos }));
          pts.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); });
        };
        (current.tables || []).forEach((t: any) => {
          if (!sel.has(t.id)) return;
          accumulateRect(t.x, t.y, t.width || 100, t.height || 100, t.rotation || 0);
        });
        // Walls
        (current.walls || []).forEach((w: any) => {
          if (!sel.has(w.id)) return;
          const cx = (w.x1 + w.x2) / 2;
          const cy = (w.y1 + w.y2) / 2;
          const length = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
          const angle = Math.atan2(w.y2 - w.y1, w.x2 - w.x1) * 180 / Math.PI;
          accumulateRect(cx - length / 2, cy - w.thickness / 2, length, w.thickness, angle);
        });
        // Texts
        (current.texts || []).forEach((t: any) => {
          if (!sel.has(t.id)) return;
          accumulateRect(t.x, t.y, t.width || 200, t.height || 30, t.rotation || 0);
        });
        if (isFinite(minX) && isFinite(minY) && isFinite(maxX) && isFinite(maxY)) {
          const dx = snapToGrid(minX) - minX;
          const dy = snapToGrid(minY) - minY;
          if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
            // Build set of selected parent table ids to also shift their attached chairs
            const selectedParentIds = new Set<string>();
            (current.tables || []).forEach((t: any) => {
              if (sel.has(t.id) && t.type !== 'chair') selectedParentIds.add(t.id);
            });
            finalized = {
              ...current,
              tables: (current.tables || []).map((t: any) => {
                // Shift selected elements
                if (sel.has(t.id)) return { ...t, x: t.x + dx, y: t.y + dy };
                // Also shift chairs attached to selected tables
                if (t.type === 'chair' && t.attachedToTableId && selectedParentIds.has(t.attachedToTableId)) {
                  return { ...t, x: t.x + dx, y: t.y + dy };
                }
                return t;
              }),
              walls: (current.walls || []).map((w: any) => sel.has(w.id) ? { ...w, x1: w.x1 + dx, y1: w.y1 + dy, x2: w.x2 + dx, y2: w.y2 + dy } : w),
              texts: (current.texts || []).map((t: any) => sel.has(t.id) ? { ...t, x: t.x + dx, y: t.y + dy } : t)
            };
          }
        }
      }
      // NOTE: No further chair re-glue here.
      // Chairs have already followed the live interaction, and we only apply the same dx/dy
      // translation to them as to their parent tables when snapping the bounding box.
      setLayout(finalized);
      // Clear interaction layout after applying to ensure UI uses the main layout
      setInteractionLayout(null);
    }

    if (isDragging) {
      setIsDragging(false);
      setIsDuplicating(false);
      setLayoutBeforeDrag(null);
      dragStartPosition.current = null;
      
      // Mark that an element was dragged to prevent handleElementClick from changing selection
      wasElementDragged.current = true;
      
      // Restore the original group selection after dragging
      if (selectedElementsBeforeDrag.length > 0) {
        setSelectedElements(selectedElementsBeforeDrag);
        setSelectedElementsBeforeDrag([]);
      }
    }

    if (isResizingWall) {
      setIsResizingWall(false);
      setResizeHandle(null);
    }

    if (isResizingTable) {
      setIsResizingTable(false);
      setTableResizeHandle(null);
      setResizingAnchorPoint(null);
      setOriginalTableForResize(null);
    }

    if (isRotating) {
      setIsRotating(false);
      setOriginalRotations({});
      setCurrentRotationAngle(0);
    }

    if (isGroupScaling) {
      // Only reset if the group actually moved, otherwise it was just a click on grip
      if (hasGroupMoved) {
      setIsGroupScaling(false);
      setGroupScaleHandle(null);
      setOriginalGroupBounds(null);
      setOriginalElementStates([]);
        setHasGroupMoved(false);
      }
    }

    if (isGroupRotating) {
      // Only reset if the group actually moved, otherwise it was just a click on grip
      if (hasGroupMoved) {
        // No need to update groupTotalRotation - grip now calculates rotation from objects directly
        setIsGroupRotating(false);
        setOriginalGroupBounds(null);
        setOriginalElementStates([]);
        setOriginalRotations({});
        setCurrentRotationAngle(0);
        setHasGroupMoved(false);
      }
    }

    if (isMarqueeSelecting) {
      // Final update to marquee selection before ending
      updateMarqueeSelection();
      setIsMarqueeSelecting(false);
      setJustCompletedMarquee(true);
      // Clear the flag after a short delay to allow click events to pass
      setTimeout(() => setJustCompletedMarquee(false), 100);
    }
    
    // If we had a potential marquee start but didn't move enough, it was just a click
    // Don't do anything special - selection was already cleared in handleMouseDown
    if (potentialMarqueeStart && !isMarqueeSelecting && !isDragging) {
      // Just clear the potential marquee start
      setPotentialMarqueeStart(null);
    }
    
    // Always reset states on mouse up
    dragStartPosition.current = null;
    setPotentialMarqueeStart(null);
    
    // Reset drag flag after a short delay to allow onClick to be processed if it was a click
    setTimeout(() => {
      wasElementDragged.current = false;
    }, 50);
  };

  // Handle right click for context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Allow opening the canvas context menu ONLY when the Move Tool (select) is active
    if (!isEditing || selectedTool !== 'select') return;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const { x: localX, y: localY } = getZoomAdjustedCoordinates(e.clientX, e.clientY, rect);
    const x = localX - canvasOffset.x;
    const y = localY - canvasOffset.y;
    
    // Check if clicking on an element
    const clickedElement = getElementAtPosition(x, y);
    
  if (clickedElement) {
      // Determine what was clicked: table (chair/non-chair), text, or wall
      const currentLayout = interactionLayout || layout;
      const table = currentLayout.tables?.find(t => t.id === clickedElement);
      const isChair = !!(table && table.type === 'chair');
      const isNonChairTable = !!(table && table.type !== 'chair');
      const isWall = (currentLayout.walls || []).some(w => w.id === clickedElement);
      const isText = (currentLayout.texts || []).some(t => t.id === clickedElement);

      // Choose context menu:
      // - Non-chair table => table menu
      // - Chair => chair styles menu
      // - Wall/Text/others => simple copy/delete menu
      if (isNonChairTable) {
        setContextMenuType('table');
        setContextMenuTargetTableId(table?.id || null);
      } else if (isChair) {
        // Redirect chair context menu to its parent table so chairs are edited only via Add Seats
        const parent = (currentLayout.tables || []).find((t:any) => t && t.type !== 'chair' && t.id === (table as any)?.attachedToTableId);
        setContextMenuType('table');
        setContextMenuTargetTableId(parent?.id || null);
      } else if (isWall || isText) {
        setContextMenuType('copy');
        setContextMenuTargetTableId(null);
      } else {
        setContextMenuType('copy');
        setContextMenuTargetTableId(null);
      }

      // Snapshot intended copy selection to avoid async setState race
      const intendedSelection = (() => {
        if (isChair) {
          const parent = (currentLayout.tables || []).find((t:any) => t && t.type !== 'chair' && t.id === (table as any)?.attachedToTableId);
          const parentId = parent?.id || clickedElement;
          return selectedElements.includes(parentId) ? selectedElements : [parentId];
        }
        return selectedElements.includes(clickedElement) ? selectedElements : [clickedElement];
      })();
      setContextMenuSelection(intendedSelection);
      // Reflect selection visually
      const anchorId = isChair ? ((currentLayout.tables || []).find((t:any) => t && t.type !== 'chair' && t.id === (table as any)?.attachedToTableId)?.id || clickedElement) : clickedElement;
      if (!selectedElements.includes(anchorId)) setSelectedElements(intendedSelection);
    } else {
      // Show paste menu only if we have something in clipboard
    const hasClipboard = clipboard.length > 0 ||
      (clipboardRef.current && clipboardRef.current.length > 0) ||
      ((typeof window !== 'undefined' && (window as any).__respointClipboard && (window as any).__respointClipboard.length > 0));
    if (hasClipboard) {
        setContextMenuType('paste');
      setContextMenuSelection([]);
        setContextMenuTargetTableId(null);
      } else {
        return; // Don't show context menu if nothing to paste
      }
    }
    
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  // Helper function to check if a point is near a line segment
  const isPointNearLineSegment = (
    pointX: number,
    pointY: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    tolerance: number
  ): boolean => {
    // Calculate distance from point to line segment
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    
    if (lengthSquared === 0) {
      // Line is actually a point
      const distanceSquared = (pointX - x1) * (pointX - x1) + (pointY - y1) * (pointY - y1);
      return Math.sqrt(distanceSquared) <= tolerance;
    }
    
    // Find the projection of the point onto the line
    const t = Math.max(0, Math.min(1, ((pointX - x1) * dx + (pointY - y1) * dy) / lengthSquared));
    
    // Find the closest point on the line segment
    const projectionX = x1 + t * dx;
    const projectionY = y1 + t * dy;
    
    // Calculate distance from point to closest point on line segment
    const distanceSquared = (pointX - projectionX) * (pointX - projectionX) + (pointY - projectionY) * (pointY - projectionY);
    return Math.sqrt(distanceSquared) <= tolerance;
  };

  // Get element at position
  const getElementAtPosition = (x: number, y: number): string | null => {
    const currentLayout = interactionLayout || layout;
    
    // Check tables (with rotation support)
    for (const table of currentLayout.tables || []) {
      const isInside = isPointInRotatedRectangle(
        x,
        y,
        table.x,
        table.y,
        table.width || 100,
        table.height || 100,
        table.rotation || 0
      );
      
      if (isInside) {
        return table.id;
      }
    }
    
    // Check texts (with rotation support)
    for (const text of currentLayout.texts || []) {
      // Calculate actual text dimensions based on content and font size
      // Always calculate optimal dimensions without width constraints
      const textSize = getTextSize(text.text, text.fontSize || 16);
      const textWidth = textSize.width;
      const textHeight = textSize.height;
      
      const isInside = isPointInRotatedRectangle(
        x,
        y,
        text.x,
        text.y,
        textWidth,
        textHeight,
        text.rotation || 0
      );
      
      if (isInside) {
        return text.id;
      }
    }
    
    // Check walls with precise hit detection using actual wall geometry
    for (const wall of currentLayout.walls || []) {
      // Calculate wall rectangle properties
      const wallRect = getWallRectangle(wall.x1, wall.y1, wall.x2, wall.y2, wall.thickness);
      
      // Check if point is inside the actual wall rectangle (not extended tolerance zone)
      const isInside = isPointInRotatedRectangle(
        x,
        y,
        wallRect.centerX - wallRect.width / 2,
        wallRect.centerY - wallRect.height / 2,
        wallRect.width,
        wallRect.height,
        wallRect.angle
      );
      
      if (isInside) {
        return wall.id;
      }
    }
    
    return null;
  };
  // Handle context menu actions
  const handleContextMenuAction = (action: string) => {
    if (action === 'copy') {
      // Use the menu snapshot to avoid races with selection updates
      copySelectedElements(contextMenuSelection.length > 0 ? contextMenuSelection : selectedElements);
    } else if (action === 'paste') {
      const rect = canvasRef.current!.getBoundingClientRect();
      const { x: localX, y: localY } = getZoomAdjustedCoordinates(contextMenuPosition.x, contextMenuPosition.y, rect);
      const canvasX = localX - canvasOffset.x;
      const canvasY = localY - canvasOffset.y;
      pasteElements({ x: snapToGrid(canvasX), y: snapToGrid(canvasY) });
    } else if (action === 'add_seats') {
      if (contextMenuTargetTableId) {
        setAddSeatsTableId(contextMenuTargetTableId);
        setShowAddSeatsModal(true);
      }
    } else if (
      action === 'set_chair_variant_standard' ||
      action === 'set_chair_variant_barstool' ||
      action === 'set_chair_variant_booth' ||
      action === 'set_chair_variant_booth_curved' ||
      action === 'set_chair_variant_booth_u'
    ) {
      const variant =
        action === 'set_chair_variant_standard' ? 'standard' :
        action === 'set_chair_variant_barstool' ? 'barstool' :
        action === 'set_chair_variant_booth_u' ? 'boothU' :
        'boothCurved';
      const ids = (contextMenuSelection.length > 0 ? contextMenuSelection : selectedElements);
      const updated = {
        ...(interactionLayout || layout),
        tables: (interactionLayout || layout).tables.map((t: any) => {
          if (ids.includes(t.id) && t.type === 'chair') {
            // Adjust aspect ratios for booth variants to keep geometry visually correct
            if (variant === 'boothCurved') {
              const currentW = Math.max(1, t.width || GRID_SIZE * 4);
              const currentH = Math.max(1, t.height || GRID_SIZE * 2);
              const centerX = t.x + currentW / 2;
              const centerY = t.y + currentH / 2;
              const targetW = Math.max(2, Math.round(currentH * 2)); // enforce 2:1 (W:H)
              const newX = clampX(centerX - targetW / 2, targetW);
              return { ...t, chairVariant: 'boothCurved', width: targetW, x: newX };
            }
            if (variant === 'boothU') {
              const currentW = Math.max(1, t.width || GRID_SIZE * 4);
              const currentH = Math.max(1, t.height || GRID_SIZE * 4);
              const centerX = t.x + currentW / 2;
              const centerY = t.y + currentH / 2;
              const target = Math.round(Math.min(currentW, currentH)); // enforce ~1:1
              const newX = clampX(centerX - target / 2, target);
              const newY = clampY(centerY - target / 2, target);
              const th = (t as any).boothThickness ?? 15;
              const base = Math.min(currentW, currentH);
              const scale = base > 0 ? (target / base) : 1;
              return { ...t, chairVariant: 'boothU', width: target, height: target, x: newX, y: newY, boothThickness: Math.max(2, Math.round(th * scale)) };
            }
            return { ...t, chairVariant: variant };
          }
          return t;
        })
      };
      setLayout(updated);
      if (interactionLayout) setInteractionLayout(updated);
    } else if (action === 'delete') {
      deleteSelectedElements(contextMenuSelection.length > 0 ? contextMenuSelection : selectedElements);
    }
    setShowContextMenu(false);
    setContextMenuSelection([]);
    setContextMenuTargetTableId(null);
  };

  // Resolve number conflict popup actions
  const resolveNumberConflict = (action: 'duplicate' | 'shift' | 'cancel') => {
    if (!numberConflict) return;
    const { tableId, desiredNumber } = numberConflict;
    const clamped = Math.min(999, Math.max(1, desiredNumber));
    
    if (action === 'cancel') {
      setNumberConflict(null);
      return;
    }
    
    if (action === 'duplicate') {
      // Just set this table's number to desiredNumber
      setLayout({
        ...layout,
        tables: layout.tables.map(t => 
          t.id === tableId ? { ...t, number: clamped, name: `${clamped}` } : t
        )
      });
      setNumberConflict(null);
      return;
    }
    
    if (action === 'shift') {
      // Shift all other tables with number >= desiredNumber by +1 across ALL zones, except chairs
      // Current zone
      const updatedCurrentTables = layout.tables.map(t => {
        if (t.id === tableId) return { ...t, number: clamped, name: `${clamped}` };
        if (t.type === 'chair') return t;
        const n = (typeof t.number === 'number' && isFinite(t.number)) ? t.number : null;
        if (n !== null && n >= clamped) {
          return { ...t, number: Math.min(999, n + 1), name: `${Math.min(999, n + 1)}` };
        }
        return t;
      });
      
      setLayout({ ...layout, tables: updatedCurrentTables });
      
      setNumberConflict(null);
      return;
    }
  };

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent default click behavior when drawing
    if (isDrawing || selectedTool === 'table' || selectedTool === 'wall' || selectedTool === 'text') {
      e.stopPropagation();
    }
  };

  // Handle text input submission
  const handleTextSubmit = () => {
    // Don't submit if input was cancelled
    if (isTextInputCancelled) {
      setIsTextInputCancelled(false);
      return;
    }
    
    if (editingTextId) {
      // We are updating an existing text element
      const textElement = layout.texts?.find(t => t.id === editingTextId);
      if (textElement) {
        const isParagraph = textInput.includes('\n');
        let width, height;
        
        if (isParagraph && textElement.width) {
          // For paragraph text, keep existing width and calculate height with word wrapping
          const textSize = getTextSize(textInput, textElement.fontSize || 16, 'normal', 'sans-serif', textElement.width);
          width = textElement.width;
          height = textSize.height;
        } else {
          // For single-line text, calculate both dimensions
          const textSize = getTextSize(textInput, textElement.fontSize || 16);
          width = textSize.width;
          height = textSize.height;
        }
        
        updateText(editingTextId, { 
          text: textInput, 
          width: width, 
          height: height, 
          isParagraph: isParagraph 
        });
      }
    } else if (textInput.trim()) {
      // We are creating a new point text element
      const fontSize = 16;
      const isParagraph = textInput.includes('\n');
      const { width, height } = getTextSize(textInput, fontSize);
      
      const newText = {
        id: `text-${Date.now()}`,
        x: textPosition.x,
        y: textPosition.y,
        text: textInput,
        fontSize: fontSize,
        rotation: 0,
        width: width,
        height: height,
        isParagraph: isParagraph,
      };

      setLayout({
        ...layout,
        texts: [...(layout.texts || []), newText],
      });
    }

    if (textInput.trim() || editingTextId) {
        // Changes are now tracked in useCanvasLayout hook
    }
    
    setShowTextInput(false);
    setTextInput('');
    setEditingTextId(null);
    onToolChange('select');
  };

  // Handle element selection
  const handleElementClick = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    if (!isEditing) return;
    // Disable element selection while editing a table number
    if (editingTableId) return;
    
    // Prevent selecting a locked chair alone; select its parent table instead
    try {
      const current = interactionLayout || layout;
      const chair = (current.tables || []).find((t: any) => t.id === elementId && t.type === 'chair');
      if (chair && chair.attachedToTableId) {
        const parent = (current.tables || []).find((t: any) => t.id === chair.attachedToTableId && t.type !== 'chair');
        if (parent) {
          // Replace selection intent with the parent (and its chairs via expansion below)
          elementId = parent.id;
        }
      }
    } catch {}
    
    // Don't handle element clicks during group operations to prevent selection reset
    if (isGroupScaling || isGroupRotating) {
      return;
    }
    
    // Don't handle selection if element was just dragged to preserve group selection
    if (wasElementDragged.current) {
      wasElementDragged.current = false;
      return;
    }
    
    // Only handle delete if delete tool is selected AND not showing context menu
    if (selectedTool === 'delete' && !showContextMenu) {
      deleteSelectedElements([elementId]);
      return;
    }
    
    // If not on select tool, switch to it and return to avoid double selection
    if (selectedTool !== 'select') {
      onToolChange('select');
      // Set single selection when switching tools - only reset rotation if selecting different element
      setSelectedElements(prev => {
        if (prev.length === 1 && prev.includes(elementId)) {
          // Same element, preserve rotation
          return prev;
        } else {
          // Different element, reset rotation
          setGroupTotalRotation(0);
          return [elementId];
        }
      });
      return;
    }

    // Handle selection logic when on select tool
    const expandWithAttachedChairs = (ids: string[]) => {
      const current = interactionLayout || layout;
      const selectedSet = new Set(ids);
      // For every selected TABLE include its attached chairs
      const parents = (current.tables || []).filter(t => t && t.type !== 'chair' && selectedSet.has(t.id));
      if (parents.length > 0) {
        const attached = (current.tables || []).filter(t => t?.type === 'chair' && parents.some(tb => t.attachedToTableId === tb.id)).map(t => t.id);
        attached.forEach(id => selectedSet.add(id));
      }
      return Array.from(selectedSet);
    };

    if (e.shiftKey || isShiftPressed) {
      // Toggle selection - preserve group rotation for consistent selection
      const prev = selectedElements;
      const base = prev.includes(elementId) ? prev.filter(id => id !== elementId) : [...prev, elementId];
      const expanded = expandWithAttachedChairs(base);
      if (expanded.length > 0 && prev.length > 0) {
        const hasCommonElements = expanded.some(id => prev.includes(id));
        if (!hasCommonElements) setGroupTotalRotation(0);
      } else if (expanded.length === 0) {
        setGroupTotalRotation(0);
      }
      setSelectedElements(expanded);
    } else {
      // Single selection - only reset group rotation if selecting different element
      const currentSelection = selectedElements;
      if (currentSelection.length !== 1 || !currentSelection.includes(elementId)) {
        setGroupTotalRotation(0); // Reset only when changing selection
      }
      setSelectedElements([elementId]);
    }
  };

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent, elementId?: string) => {
  // Only left button initiates drag/select operations
  if ((e as any).button !== 0) return;
    if (!isEditing) return;
    // Disable dragging while editing a table number
    if (editingTableId) return;
    
    // Reset drag flag at the beginning of potential drag operation
    wasElementDragged.current = false;
    
    // Clear potential marquee selection when clicking on an element
    setPotentialMarqueeStart(null);
    
    // Handle delete tool - stop propagation for delete actions
    if (selectedTool === 'delete' && elementId) {
      e.stopPropagation();
      deleteSelectedElements([elementId]);
      return;
    }
    
    // If not on select tool, switch to it - stop propagation
    if (selectedTool !== 'select') {
      e.stopPropagation();
      onToolChange('select');
      // And select the element
      if (elementId) {
        setSelectedElements([elementId]);
      }
      return;
    }
    
    // Handle Shift+Click for multi-selection - stop propagation but allow onClick to fire
    if ((e.shiftKey || isShiftPressed) && elementId) {
      e.stopPropagation();
      // Don't handle selection here, let handleElementClick do it
      // Don't start dragging when Shift is pressed
      return;
    }
    
    // For normal selection/dragging on elements, stop propagation to prevent marquee selection
    if (elementId) {
      // If starting drag on a locked chair, redirect to its parent table to avoid detaching
      try {
        const current = interactionLayout || layout;
        const chair = (current.tables || []).find((t: any) => t.id === elementId && t.type === 'chair');
        if (chair && chair.attachedToTableId) {
          const parent = (current.tables || []).find((t: any) => t.id === chair.attachedToTableId && t.type !== 'chair');
          if (parent) elementId = parent.id;
        }
      } catch {}
      e.stopPropagation();
      // Don't preventDefault when shift is pressed to allow onClick to fire
      if (!e.shiftKey && !isShiftPressed) {
        e.preventDefault();
      }
    }
    
    // Save original selection before potential changes
    const currentSelection = selectedElements;
    
    // Single click selection (only if not already selected and not part of current group)
    // If element is already in current selection, preserve the group selection for dragging
    if (elementId && !selectedElements.includes(elementId)) {
      setSelectedElements([elementId]);
    }
    
    // Save the selection that will be used for dragging
    let selectionForDrag = elementId && currentSelection.includes(elementId) 
      ? currentSelection  // Use current group if element is part of it
      : elementId ? [elementId] : currentSelection; // Use single element or current selection
    
    // If dragging starts from a table, compute an internal drag group with its attached chairs (without changing visual selection)
    try {
      const current = interactionLayout || layout;
      const set = new Set(selectionForDrag);
      // If a specific element is targeted, ensure chairs follow
      if (elementId) {
        const el = (current.tables || []).find((t: any) => t.id === elementId);
        if (el && el.type !== 'chair') {
          (current.tables || []).forEach((t: any) => {
            if (t && t.type === 'chair' && t.attachedToTableId === el.id) set.add(t.id);
          });
        }
      }
      // Additionally, for any tables already in selection, include their chairs
      (current.tables || []).forEach((t: any) => {
        if (t && t.type !== 'chair' && set.has(t.id)) {
          (current.tables || []).forEach((c: any) => {
            if (c && c.type === 'chair' && c.attachedToTableId === t.id) set.add(c.id);
          });
        }
      });
      selectionForDrag = Array.from(set);
      // Do NOT reflect expanded selection in UI; keep visual selection minimal (only the table)
    } catch {}
    
    // Store the visual selection we want to restore after drag (minimal UI selection)
    const visualSelectionToRestore = (elementId && !currentSelection.includes(elementId)) ? [elementId] : currentSelection;
    setSelectedElementsBeforeDrag(visualSelectionToRestore);
    
    // Get mouse position in world coordinates
    const rect = canvasRef.current!.getBoundingClientRect();
    const { x: localX, y: localY } = getZoomAdjustedCoordinates(e.clientX, e.clientY, rect);
    const canvasX = localX - canvasOffset.x;
    const canvasY = localY - canvasOffset.y;
    
    // Allow dragging for both single element and group selections
    const canStartDragging = elementId ? 
      true : // Always allow dragging when clicking on an element
      (selectedElements.length > 0 && getElementAtPosition(canvasX, canvasY));
    
    if (canStartDragging) {
      // Don't start dragging immediately - wait for mouse move
      // This allows onClick to fire for simple clicks
    
    // Save the mouse position to check for drag threshold
      dragStartPosition.current = { x: e.clientX, y: e.clientY };
    
    setDragOffset({
      x: snapToGrid(canvasX),
      y: snapToGrid(canvasY)
    });
    
    // Store the layout before potential drag
    setLayoutBeforeDrag(JSON.parse(JSON.stringify(interactionLayout || layout)));
    
    // If Alt is pressed, prepare for duplication
    if (isAltPressed && !isDuplicating) {
      setIsDuplicating(true);
      }
    }
  };

  // Handle rotation start
  const handleRotationStart = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    if (!isEditing || selectedTool !== 'select') return;
    // Disable rotation while editing a table number
    if (editingTableId) return;
    
    // If rotating a locked table, rotate it together with its attached chairs (group rotation)
    try {
      const current = interactionLayout || layout;
      const tbl = (current.tables || []).find((t: any) => t.id === elementId && t.type !== 'chair');
      if (tbl && tbl.chairsLocked) {
        const groupIds = [tbl.id, ...(current.tables || []).filter((c: any) => c.type === 'chair' && c.attachedToTableId === tbl.id).map((c: any) => c.id)];
        setSelectedElements(groupIds);
        // Defer to group rotation start to ensure bounds and centers are correct
        setTimeout(() => handleGroupRotationStart(e), 0);
        return;
      }
    } catch {}
    
    // Ensure the element is selected
    if (!selectedElements.includes(elementId)) {
      setSelectedElements([elementId]);
    }
    
    setIsRotating(true);
    
    // Store original rotations (normalized to 0-360)
    const rotations: { [id: string]: number } = {};
    const currentLayout = interactionLayout || layout;
    selectedElements.forEach(id => {
      const element = [...(currentLayout.tables || []), ...(currentLayout.texts || [])].find(el => el.id === id);
      if (element) {
        rotations[id] = normalizeAngle(getElementRotation(element));
      }
      // Add support for walls
      const wall = currentLayout.walls?.find(w => w.id === id);
      if (wall) {
        const angle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1) * 180 / Math.PI;
        rotations[id] = normalizeAngle(angle);
      }
    });
    setOriginalRotations(rotations);
    
    // Calculate starting angle using new helper function
    const element = [...(currentLayout.tables || []), ...(currentLayout.texts || [])].find(
      el => el.id === elementId
    );
    const wall = currentLayout.walls?.find(w => w.id === elementId);
    
    if (element) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const { x: localX, y: localY } = getZoomAdjustedCoordinates(e.clientX, e.clientY, rect);
      const mouseCanvasX = localX - canvasOffset.x;
      const mouseCanvasY = localY - canvasOffset.y;
      const centerX = element.x + (element.width || 100) / 2;
      const centerY = element.y + (element.height || 100) / 2;
      const startAngle = calculateAngle(centerX, centerY, mouseCanvasX, mouseCanvasY);
      setRotationStart(startAngle);
    } else if (wall) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const { x: localX, y: localY } = getZoomAdjustedCoordinates(e.clientX, e.clientY, rect);
      const mouseCanvasX = localX - canvasOffset.x;
      const mouseCanvasY = localY - canvasOffset.y;
      const centerX = (wall.x1 + wall.x2) / 2;
      const centerY = (wall.y1 + wall.y2) / 2;
      const startAngle = calculateAngle(centerX, centerY, mouseCanvasX, mouseCanvasY);
      setRotationStart(startAngle);
    }
  };

  // Handle wall resize handle click
  const handleWallResizeStart = (e: React.MouseEvent, wallId: string, handle: 'start' | 'end' | 'thickness') => {
    e.stopPropagation();
    if (!isEditing || selectedTool !== 'select') return;
    
    setSelectedElements([wallId]);
    setIsResizingWall(true);
    setResizeHandle(handle);
  };
  
  // Handle wall scale handle click
  const handleWallScaleStart = (e: React.MouseEvent, wallId: string, handle: 'tl' | 'tr' | 'bl' | 'br' | 't' | 'r' | 'b' | 'l') => {
    e.stopPropagation();
    if (!isEditing || selectedTool !== 'select') return;
    
    const currentLayout = interactionLayout || layout;
    const wall = currentLayout.walls?.find(w => w.id === wallId);
    if (!wall) return;
    
    setSelectedElements([wallId]);
    setIsResizingTable(true);  // Reuse table resize logic for walls
    setTableResizeHandle(handle);
    
    // Calculate wall bounding box
    const angle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
    const length = Math.sqrt(Math.pow(wall.x2 - wall.x1, 2) + Math.pow(wall.y2 - wall.y1, 2));
    const centerX = (wall.x1 + wall.x2) / 2;
    const centerY = (wall.y1 + wall.y2) / 2;
    
    // Create a virtual "table" object for the wall
    const wallAsTable = {
      x: centerX - length / 2,
      y: centerY - wall.thickness / 2,
      width: length,
      height: wall.thickness,
      rotation: angle * 180 / Math.PI,
      id: wallId,
      isWall: true,
      originalWall: JSON.parse(JSON.stringify(wall))
    };
    
    setOriginalTableForResize(wallAsTable);
    
    // Set anchor point for corner handles
    const oppositeHandleMap: { [key: string]: 'tl' | 'tr' | 'bl' | 'br' } = {
      tl: 'br', tr: 'bl', bl: 'tr', br: 'tl'
    };
    
    if (['tl', 'tr', 'bl', 'br'].includes(handle)) {
      const anchorHandle = oppositeHandleMap[handle] as 'tl' | 'tr' | 'bl' | 'br';
      const anchorCoords = getRotatedCornerCoords(wallAsTable, anchorHandle);
      setResizingAnchorPoint(anchorCoords);
    } else {
      setResizingAnchorPoint(null);
    }
  };

  // Handle table resize handle click
  const handleTableResizeStart = (e: React.MouseEvent, tableId: string, handle: 'tl' | 'tr' | 'bl' | 'br' | 't' | 'r' | 'b' | 'l') => {
    e.stopPropagation();
    if (!isEditing || selectedTool !== 'select') return;

    const currentLayout = interactionLayout || layout;
    const table = currentLayout.tables?.find(t => t.id === tableId);
    if (!table) return;
    // Disallow resizing chairs entirely (chairs are controlled only via Add Seats)
    if (table.type === 'chair') return;
    // Prevent side-only resizing for circular tables to avoid distortion
    if (table.type === 'circle' && (handle === 't' || handle === 'r' || handle === 'b' || handle === 'l')) {
      return;
    }
    
    setSelectedElements([tableId]);
    setIsResizingTable(true);
    setTableResizeHandle(handle);
    setOriginalTableForResize(JSON.parse(JSON.stringify(table)));

    const oppositeHandleMap: { [key: string]: 'tl' | 'tr' | 'bl' | 'br' } = {
        tl: 'br', tr: 'bl', bl: 'tr', br: 'tl'
    };

    if (['tl', 'tr', 'bl', 'br'].includes(handle)) {
        const anchorHandle = oppositeHandleMap[handle] as 'tl' | 'tr' | 'bl' | 'br';
        const anchorCoords = getRotatedCornerCoords(table, anchorHandle);
        setResizingAnchorPoint(anchorCoords);
    } else {
        setResizingAnchorPoint(null);
    }
  };
  
  // Text resize functionality removed - texts are resized via font size controls in toolbar
 
  // Detect if current multi-selection is exactly one non-chair table and ONLY its attached chairs.
  // Returns the parent table id if true, otherwise null.
  const getParentIdIfSelectionIsParentWithOwnChairs = (): string | null => {
    try {
      const currentLayout = interactionLayout || layout;
      const selectedTables = (currentLayout.tables || []).filter(t => selectedElements.includes(t.id));
      const parents = selectedTables.filter(t => t && t.type !== 'chair');
      if (parents.length !== 1) return null;
      const parent = parents[0];
      const others = selectedTables.filter(t => t.id !== parent.id);
      if (others.length === 0) return null;
      const allOthersAreParentChairs = others.every(t => t && t.type === 'chair' && (t as any).attachedToTableId === parent.id);
      return allOthersAreParentChairs ? parent.id : null;
    } catch {
      return null;
    }
  };
 
  // Handle group scaling start
  const handleGroupScaleStart = (e: React.MouseEvent, handle: 'tl' | 'tr' | 'bl' | 'br' | 't' | 'r' | 'b' | 'l') => {
    e.stopPropagation();
    e.preventDefault();
    if (!isEditing || selectedTool !== 'select' || selectedElements.length === 0) return;
    
    // If selection corresponds to a circular table with its chairs, block side-only scaling.
    try {
      const currentLayout = interactionLayout || layout;
      const selectedTables = (currentLayout.tables || []).filter(t => selectedElements.includes(t.id));
      const nonChairs = selectedTables.filter(t => t && t.type !== 'chair');
      const isCircleSelection = nonChairs.length === 1 && nonChairs[0].type === 'circle' &&
        selectedTables.filter(t => t.id !== nonChairs[0].id).every(t => t.type === 'chair' && (t as any).attachedToTableId === nonChairs[0].id);
      if (isCircleSelection && (handle === 't' || handle === 'r' || handle === 'b' || handle === 'l')) {
        return; // ignore side handles
      }
    } catch {}
    
    setHasGroupMoved(false); // Reset movement tracking

    setIsGroupScaling(true);
    setGroupScaleHandle(handle);
    
    // Store initial states for scaling
    groupScaleInitialStates.current = {};
    const layoutForInit = interactionLayout || layout;
    selectedElements.forEach(id => {
      const table = layoutForInit.tables?.find(t => t.id === id);
      const wall = layoutForInit.walls?.find(w => w.id === id);
      const text = layoutForInit.texts?.find(t => t.id === id);
      
      if (table) {
        groupScaleInitialStates.current[id] = { 
          x: table.x, 
          y: table.y, 
          width: table.width || 100, 
          height: table.height || 100,
          rotation: table.rotation || 0,
          type: table.type || 'rectangle'
        };
      } else if (text) {
        // Use measured size and store initial font size for proper scaling
        const measured = getTextSize(text.text, text.fontSize || 16);
        groupScaleInitialStates.current[id] = { 
          x: text.x, 
          y: text.y, 
          width: measured.width, 
          height: measured.height, 
          fontSize: text.fontSize || 16,
          rotation: text.rotation || 0,
          type: 'text'
        };
      }
      // Note: walls use x1,y1,x2,y2,thickness so they'll be handled through originalElementStates
    });
    
    console.log('📋 Group scale initial states:', groupScaleInitialStates.current);
    
    // Store original group bounds and element states
    const groupBounds = getGroupBoundingBox();
    setOriginalGroupBounds(groupBounds);
    
    const currentLayout = interactionLayout || layout;
    const elementStates: any[] = [];
    
    selectedElements.forEach(elementId => {
      const table = currentLayout.tables?.find(t => t.id === elementId);
      const wall = currentLayout.walls?.find(w => w.id === elementId);
      const text = currentLayout.texts?.find(t => t.id === elementId);
      
      if (table) {
        elementStates.push({ type: 'table', id: elementId, ...JSON.parse(JSON.stringify(table)) });
      } else if (wall) {
        elementStates.push({ type: 'wall', id: elementId, ...JSON.parse(JSON.stringify(wall)) });
      } else if (text) {
        elementStates.push({ type: 'text', id: elementId, ...JSON.parse(JSON.stringify(text)) });
      }
    });
    
    setOriginalElementStates(elementStates);
  };
  // Handle group rotation start
  const handleGroupRotationStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isEditing || selectedTool !== 'select' || selectedElements.length === 0) return;
    
    setHasGroupMoved(false); // Reset movement tracking

    setIsGroupRotating(true);
    
    // Store initial states for rotation (normalized to 0-360)
    groupRotationInitialStates.current = {};
    const layoutForRotInit = interactionLayout || layout;
    const rotations: { [id: string]: number } = {};
    
    selectedElements.forEach(id => {
      const table = layoutForRotInit.tables?.find(t => t.id === id);
      const wall = layoutForRotInit.walls?.find(w => w.id === id);
      const text = layoutForRotInit.texts?.find(t => t.id === id);
      
      if (table) {
        groupRotationInitialStates.current[id] = { 
          x: table.x, 
          y: table.y, 
          width: table.width || 100, 
          height: table.height || 100,
          rotation: normalizeAngle(table.rotation || 0)
        };
        rotations[id] = normalizeAngle(table.rotation || 0);
      } else if (text) {
        groupRotationInitialStates.current[id] = { 
          x: text.x, 
          y: text.y, 
          width: text.width || 200, 
          height: text.height || 30,
          rotation: normalizeAngle(text.rotation || 0)
        };
        rotations[id] = normalizeAngle(text.rotation || 0);
      } else if (wall) {
        const angle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1) * 180 / Math.PI;
        const centerX = (wall.x1 + wall.x2) / 2;
        const centerY = (wall.y1 + wall.y2) / 2;
        const length = Math.sqrt(Math.pow(wall.x2 - wall.x1, 2) + Math.pow(wall.y2 - wall.y1, 2));
        
        // Store wall initial state as center point and dimensions (like tables)
        groupRotationInitialStates.current[id] = {
          x: centerX - length / 2,
          y: centerY - wall.thickness / 2,
          width: length,
          height: wall.thickness,
          rotation: normalizeAngle(angle)
        };
        rotations[id] = normalizeAngle(angle);
      }
    });
    
    console.log('🔄 Group rotation initial states:', groupRotationInitialStates.current);
    setOriginalRotations(rotations);
    
    // Store original group bounds and element states
    const groupBounds = getGroupBoundingBox();
    setOriginalGroupBounds(groupBounds);
    
    const currentLayout = interactionLayout || layout;
    const elementStates: any[] = [];
    
    selectedElements.forEach(elementId => {
      const table = currentLayout.tables?.find(t => t.id === elementId);
      const wall = currentLayout.walls?.find(w => w.id === elementId);
      const text = currentLayout.texts?.find(t => t.id === elementId);
      
      if (table) {
        elementStates.push({ type: 'table', id: elementId, ...JSON.parse(JSON.stringify(table)) });
      } else if (wall) {
        elementStates.push({ type: 'wall', id: elementId, ...JSON.parse(JSON.stringify(wall)) });
      } else if (text) {
        elementStates.push({ type: 'text', id: elementId, ...JSON.parse(JSON.stringify(text)) });
      }
    });
    
    setOriginalElementStates(elementStates);
    
    // Calculate starting angle using new helper function
    if (groupBounds) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const { x: localX, y: localY } = getZoomAdjustedCoordinates(e.clientX, e.clientY, rect);
      const mouseCanvasX = localX - canvasOffset.x;
      const mouseCanvasY = localY - canvasOffset.y;
      const startAngle = calculateAngle(
        groupBounds.centerX, 
        groupBounds.centerY, 
        mouseCanvasX, 
        mouseCanvasY
      );
      setRotationStart(startAngle);
    }
  };

  // Handle text double-click for editing
  const handleTextDoubleClick = (e: React.MouseEvent, textId: string) => {
    e.stopPropagation();
    if (!isEditing) return;
    
    // Do not allow dragging to start on double click
    e.preventDefault();
    
    const currentLayout = interactionLayout || layout;
    const text = currentLayout.texts?.find(t => t.id === textId);
    if (text) {
      setTextInput(text.text);
      setTextPosition({ x: text.x, y: text.y });
      setIsTextInputCancelled(false); // Reset cancellation flag
      setShowTextInput(true);
      setEditingTextId(textId);
    }
  };

  // Handle table name editing
  const handleTableNameDoubleClick = (e: React.MouseEvent, table: any) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isEditing) return;

    setEditingTableId(table.id);
    setTableNameInput(table.name);
  };

  const handleTableNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTableNameInput(e.target.value);
  };

  const handleTableNameSubmit = () => {
    if (!editingTableId) {
        setEditingTableId(null);
        return;
    }

    const newNumber = parseInt(tableNameInput, 10);
    
    // Find the table in current layout
    const table = layout.tables?.find(t => t.id === editingTableId);
    
    if (!table || isNaN(newNumber)) {
        setEditingTableId(null);
        setTableNameInput('');
        return;
    }

    // Clamp to [1..999]
    const clamped = Math.min(999, Math.max(1, newNumber));
    
    // Check for conflict against ALL zones (ignore chairs)
    const allTablesAcrossZones = [
      ...(layout.tables || []),
      ...Object.values(zoneLayouts || {}).flatMap(l => l?.tables || [])
    ];
    const conflictExists = allTablesAcrossZones.some(t =>
      t &&
      t.id !== editingTableId &&
      t.type !== 'chair' &&
      typeof t.number === 'number' &&
      isFinite(t.number) &&
      t.number === clamped
    );
    
    if (conflictExists) {
      if (numberingPolicy === 'autoShift') {
        // Auto shift others in CURRENT zone
        const updatedCurrentTables = layout.tables.map(t => {
          if (t.id === editingTableId) return { ...t, number: clamped, name: `${clamped}` };
          if (t.type === 'chair') return t;
          const n = (typeof t.number === 'number' && isFinite(t.number)) ? t.number : null;
          if (n !== null && n >= clamped) {
            return { ...t, number: Math.min(999, n + 1), name: `${Math.min(999, n + 1)}` };
          }
          return t;
        });
        setLayout({ ...layout, tables: updatedCurrentTables });
        setEditingTableId(null);
        setTableNameInput('');
        return;
      } else if (numberingPolicy === 'allowDuplicates') {
        // Allow duplicate
        const updatedTables = layout.tables.map(t =>
          t.id === editingTableId ? { ...t, number: clamped, name: `${clamped}` } : t
        );
        setLayout({ ...layout, tables: updatedTables });
        setEditingTableId(null);
        setTableNameInput('');
        return;
      } else {
        // Fallback: show popup if policy is not recognized
        setNumberConflict({ tableId: editingTableId, desiredNumber: clamped });
        setEditingTableId(null);
        setTableNameInput('');
        return;
      }
    }
    
    // No conflict: apply number directly
    const updatedTables = layout.tables.map(t =>
      t.id === editingTableId ? { ...t, number: clamped, name: `${clamped}` } : t
    );
    setLayout({ ...layout, tables: updatedTables });
    setEditingTableId(null);
    setTableNameInput('');
  };

  // Helper: robust check if reservation's table_ids contain this table (by id, name or number).
  // Uses a fallback through all zone layouts so multi-zone reservations are matched reliably.
  const doesReservationIncludeTable = useCallback(
    (rawIds: any[] | undefined | null, tbl: any): boolean => {
      const normalize = (v: any) => String(v ?? '').trim().toLowerCase();
      const ids = (rawIds || []).map((x: any) => normalize(x));
      if (ids.length === 0) return false;

      const tableId = normalize(tbl.id);
      const tableName = tbl.name != null ? normalize(tbl.name) : '';
      const tableNumberStr =
        typeof tbl.number !== "undefined" && tbl.number !== null
          ? normalize(String(tbl.number))
          : "";

      // Exact string matches
      if (
        ids.includes(tableId) ||
        (tableName && ids.includes(tableName)) ||
        (tableNumberStr && ids.includes(tableNumberStr))
      ) {
        return true;
      }

      // Numeric equivalence (handles cases like ' 1', '01', 'table 1')
      const tblNum =
        typeof tbl.number === "number" && isFinite(tbl.number) ? tbl.number : null;
      if (tblNum !== null) {
        for (const id of ids) {
          const match = id.match(/\d+/);
          if (match && parseInt(match[0], 10) === tblNum) {
            return true;
          }
        }
      }

      // Fallback: map reservation IDs back to tables from zoneLayouts and compare numbers/names
      try {
        const allTables = Object.values(zoneLayouts || {}).flatMap(
          (l: any) => l?.tables || []
        );
        if (allTables.length > 0) {
          const byId: Record<string, any> = {};
          for (const t of allTables) {
            byId[normalize(t.id)] = t;
          }
          for (const id of ids) {
            const t = byId[id];
            if (t) {
              const tName = t.name != null ? normalize(t.name) : "";
              const tNumStr =
                typeof t.number !== "undefined" && t.number !== null
                  ? normalize(String(t.number))
                  : "";
              if (
                (tName && tName === tableName) ||
                (tNumStr && tNumStr === tableNumberStr)
              ) {
                return true;
              }
              // Also numeric equivalence between mapped table's number and current table's number
              const mappedNum =
                typeof t.number === "number" && isFinite(t.number)
                  ? t.number
                  : null;
              if (mappedNum !== null && tblNum !== null && mappedNum === tblNum) {
                return true;
              }
            }
          }
        }
      } catch {
        // ignore mapping errors and fall through
      }

      return false;
    },
    [zoneLayouts]
  );

  // Pre-compute which chair IDs are "occupied" for each ARRIVED (seated) reservation
  // across ALL zones, so that multi-zone reservations don't over-count seats per zone.
  const seatedChairIdsByReservation = useMemo(() => {
    const map = new Map<string, Set<string>>();

    try {
      if (!selectedDate) return map;

      const year = selectedDate.getFullYear();
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, "0");
      const day = selectedDate.getDate().toString().padStart(2, "0");
      const dateKey = `${year}-${month}-${day}`;

      // Collect all tables (including chairs) from every zone layout
      const allZoneTables: any[] = [];
      Object.values(zoneLayouts || {}).forEach((layout: any) => {
        const arr = Array.isArray(layout?.tables) ? layout.tables : [];
        arr.forEach((t: any) => {
          if (t) allZoneTables.push(t);
        });
      });
      if (allZoneTables.length === 0) return map;

      const todaysArrived = combinedReservations.filter(
        (r) => r.status === "arrived" && r.date === dateKey
      );

      for (const r of todaysArrived) {
        const guests = Number((r as any).numberOfGuests) || 0;
        if (guests <= 0) continue;

        const rawIds: any[] = Array.isArray(r.tableIds) ? (r.tableIds as any[]) : [];
        if (!rawIds.length) continue;

        const parentTablesForRes = allZoneTables.filter(
          (t: any) => t && t.type !== "chair" && doesReservationIncludeTable(rawIds, t)
        );
        if (!parentTablesForRes.length) continue;

        const parentIds = parentTablesForRes.map((t: any) => String(t.id));
        const parentIdSet = new Set(parentIds);

        const chairsForRes = allZoneTables.filter(
          (t: any) =>
            t &&
            t.type === "chair" &&
            t.attachedToTableId &&
            parentIdSet.has(String(t.attachedToTableId))
        );
        if (!chairsForRes.length) continue;

        // Group chairs by their parent table
        const chairsByParent: Record<string, any[]> = {};
        chairsForRes.forEach((ch: any) => {
          const pid = String(ch.attachedToTableId);
          if (!chairsByParent[pid]) chairsByParent[pid] = [];
          chairsByParent[pid].push(ch);
        });

        const parentIdsWithChairs = Object.keys(chairsByParent);
        const totalChairs = parentIdsWithChairs.reduce(
          (sum, pid) => sum + chairsByParent[pid].length,
          0
        );
        if (totalChairs <= 0) continue;

        const targetSeats = Math.min(guests, totalChairs);

        // Distribute guests by filling the table that has the MOST chairs first,
        // then move on to tables with fewer chairs.
        const baseAssignments: Record<string, number> = {};
        let remaining = targetSeats;

        // Build a lookup for parent tables so we can use coordinates as a stable tie‑breaker
        const parentTableById: Record<string, any> = {};
        parentTablesForRes.forEach((t: any) => {
          parentTableById[String(t.id)] = t;
        });

        const parentOrderDesc = parentIdsWithChairs
          .slice()
          .sort((a, b) => {
            const countA = chairsByParent[a]?.length || 0;
            const countB = chairsByParent[b]?.length || 0;
            if (countA !== countB) return countB - countA; // more chairs first
            const ta = parentTableById[a];
            const tb = parentTableById[b];
            const ay = Number(ta?.y) || 0;
            const by = Number(tb?.y) || 0;
            if (ay !== by) return ay - by;
            const ax = Number(ta?.x) || 0;
            const bx = Number(tb?.x) || 0;
            return ax - bx;
          });

        for (const pid of parentOrderDesc) {
          if (remaining <= 0) break;
          const capacity = chairsByParent[pid]?.length || 0;
          if (capacity <= 0) continue;
          const take = Math.min(capacity, remaining);
          if (take > 0) {
            baseAssignments[pid] = take;
            remaining -= take;
          }
        }

        // Now pick specific chairs per parent table based on their assigned seat counts
        const occupiedIds = new Set<string>();
        parentIdsWithChairs.forEach((pid) => {
          const count = baseAssignments[pid] || 0;
          if (!count) return;
          const chairs = chairsByParent[pid]
            .slice()
            .sort((a: any, b: any) => {
              const ay = Number(a.y) || 0;
              const by = Number(b.y) || 0;
              if (ay !== by) return ay - by;
              const ax = Number(a.x) || 0;
              const bx = Number(b.x) || 0;
              if (ax !== bx) return ax - bx;
              return String(a.id).localeCompare(String(b.id));
            });
          chairs.slice(0, count).forEach((ch: any) => {
            if (ch && ch.id != null) {
              occupiedIds.add(String(ch.id));
            }
          });
        });

        if (occupiedIds.size > 0) {
          map.set(r.id, occupiedIds);
        }
      }
    } catch (e) {
      console.warn("Failed to compute seated chair distribution", e);
    }

    return map;
  }, [combinedReservations, selectedDate, zoneLayouts, doesReservationIncludeTable]);

  // Helpers/components for seated reservations (ARRIVED)
  const SeatedProgressStroke = SeatedProgressStrokeBase;
  const ProgressStroke = ProgressStrokeBase;

  // Render table
  const renderTableWithHandles = (table: any) => {
    const isSelected = selectedElements.includes(table.id);
    const isHovered = hoveredElementId === table.id;
    const width = table.width || 100;
    const height = table.height || 100;
    const rotation = table.rotation || 0;
    
    // Find ALL reservations for this table on the selected date (across all zones)
    // Never associate reservations to chairs for hover/labels
    const allReservationsForTable = table.type === 'chair' ? [] : combinedReservations.filter(r => {
      const reservationDate = new Date(r.date);
      const calendarDate = selectedDate || new Date();
      // Same day check
      const sameDay =
        reservationDate.getFullYear() === calendarDate.getFullYear() &&
        reservationDate.getMonth() === calendarDate.getMonth() &&
        reservationDate.getDate() === calendarDate.getDate();
      if (!sameDay) return false;
      // Only show active reservations (waiting, confirmed, arrived but not cleared)
      if (r.status === 'arrived') {
        if ((r as any).cleared) return false;
      } else if (!(r.status === 'waiting' || r.status === 'confirmed')) {
        return false;
      }
      // Robust match against table ids/names/numbers
      return doesReservationIncludeTable(r.tableIds as any[], table);
    }).sort((a, b) => {
      // Sort: arrived reservations first, then by time
      if (a.status === 'arrived' && b.status !== 'arrived') return -1;
      if (a.status !== 'arrived' && b.status === 'arrived') return 1;
      // Same status - sort by time
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      return timeA.localeCompare(timeB);
    });

    // Get current reservation index for this table (default to 0)
    const currentTableResIndex = tableReservationIndexes[table.id] || 0;
    const validIndex = Math.min(currentTableResIndex, Math.max(0, allReservationsForTable.length - 1));
    const totalReservationsForTable = allReservationsForTable.length;
    const hasMultipleReservations = totalReservationsForTable > 1;

    // Get the currently displayed reservation (or null if none)
    const currentDisplayedReservation = allReservationsForTable[validIndex] || null;

    // Legacy compatibility: reservationForTable = waiting/confirmed reservation at current index
    const reservationForTable = currentDisplayedReservation && 
      (currentDisplayedReservation.status === 'waiting' || currentDisplayedReservation.status === 'confirmed')
      ? currentDisplayedReservation : null;

    // Legacy compatibility: arrivedReservationForTable = arrived reservation at current index
    const arrivedReservationForTable = currentDisplayedReservation && 
      currentDisplayedReservation.status === 'arrived' && !(currentDisplayedReservation as any).cleared
      ? currentDisplayedReservation : null;

    // Cycle to next reservation for this table
    const cycleTableReservation = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (totalReservationsForTable <= 1) return;
      const nextIndex = (validIndex + 1) % totalReservationsForTable;
      const nextReservation = allReservationsForTable[nextIndex] || null;
      setTableReservationIndexes(prev => ({
        ...prev,
        [table.id]: nextIndex
      }));

      // If this table is currently hovered (tooltip open), update tooltip content immediately
      if (nextReservation) {
        setHoveredTable(prev => {
          if (!prev) return prev;
          if (prev.tableId !== table.id) return prev;
          return { ...prev, reservation: nextReservation as any };
        });
      }
    };

    // If this reservation spans multiple tables, only display waiter labels on a single primary table to avoid duplicates
    const isPrimaryTableForReservation = reservationForTable
      ? (() => {
          const arr = (reservationForTable.tableIds || []) as any[];
          if (!arr || arr.length === 0) return false;
          // Use the same robust comparison for the first entry
          return doesReservationIncludeTable([arr[0]], table);
        })()
      : false;

    // Same logic for arrived reservations to avoid duplicate waiter labels on multi-table reservations
    const isPrimaryTableForArrived = arrivedReservationForTable
      ? (() => {
          const arr = (arrivedReservationForTable.tableIds || []) as any[];
          if (!arr || arr.length === 0) return false;
          return doesReservationIncludeTable([arr[0]], table);
        })()
      : false;
    
    const tableColor = reservationForTable ? reservationForTable.color : (table.color || '#FFFFFF');
    const arrivedColor = arrivedReservationForTable?.color || undefined;
    const hoverableReservation = reservationForTable || arrivedReservationForTable;
    // Waiting status color (fallback to orange if reservation color missing)
    const waitingColor = (reservationForTable && reservationForTable.status === 'waiting')
      ? (reservationForTable.color || '#f97316')
      : undefined;
    
    // Determine cursor based on tool and state
    let cursor = 'cursor-pointer';
    if (selectedTool === 'delete') {
      cursor = 'cursor-crosshair';
    } else if (selectedTool === 'select') {
      if (isDragging && isSelected) {
        cursor = 'cursor-move';
      } else {
        cursor = 'cursor-pointer';
      }
    }
    
    // Get waiter list for either waiting/confirmed OR arrived reservations
    const waiterListForReservation = (reservationForTable && isPrimaryTableForReservation)
      ? getAssignedWaiters(reservationForTable.id)
      : (arrivedReservationForTable && isPrimaryTableForArrived)
        ? getAssignedWaiters(arrivedReservationForTable.id)
        : [] as string[];
    const hasWaiterLabels = waiterListForReservation && (waiterListForReservation as any).length > 0;

    const showVipStar = Boolean(reservationForTable?.isVip || arrivedReservationForTable?.isVip);

    // For chairs: detect if their parent table has an ARRIVED reservation and
    // tint only as many chairs as there are guests (numberOfGuests) in that
    // reservation. Extra chairs on the same tables stay in the default color.
    let chairSeatedColor: string | undefined;
    // Optional z-index override so attached chairs follow their parent table's stacking
    let chairZIndexOverride: number | undefined;
    if (table.type === 'chair' && (table as any).attachedToTableId) {
      try {
        const parentId = (table as any).attachedToTableId;
        const parentTable = ((interactionLayout || layout).tables || []).find((t: any) => t && t.id === parentId);
        if (parentTable) {
          const arrivedForParent = combinedReservations.find(r => {
            const reservationDate = new Date(r.date);
            const calendarDate = selectedDate || new Date();
            const sameDay =
              reservationDate.getFullYear() === calendarDate.getFullYear() &&
              reservationDate.getMonth() === calendarDate.getMonth() &&
              reservationDate.getDate() === calendarDate.getDate();
            if (!sameDay) return false;
            if (r.status !== 'arrived') return false;
            // Exclude cleared reservations - guests have left
            if ((r as any).cleared) return false;
            return doesReservationIncludeTable(r.tableIds as any[], parentTable);
          });
          if (arrivedForParent) {
            const occupiedSet = seatedChairIdsByReservation.get(arrivedForParent.id);
            if (occupiedSet) {
              if (occupiedSet.has(String(table.id))) {
                chairSeatedColor = arrivedForParent.color || '#22c55e';
              }
            } else {
              // Fallback: per-zone computation when global distribution is unavailable.
              // Uses the same rule: fill the table with MOST chairs first.
              const guests = Number((arrivedForParent as any).numberOfGuests) || 0;
              if (guests > 0) {
                const allTables = ((interactionLayout || layout).tables || []) as any[];
                const parentTablesForRes = allTables.filter(
                  (t: any) =>
                    t &&
                    t.type !== "chair" &&
                    doesReservationIncludeTable(
                      (arrivedForParent.tableIds || []) as any[],
                      t
                    )
                );
                if (parentTablesForRes.length > 0) {
                  const parentIdsSet = new Set(parentTablesForRes.map((t: any) => String(t.id)));
                  const chairsForRes = allTables.filter(
                    (t: any) =>
                      t &&
                      t.type === "chair" &&
                      t.attachedToTableId &&
                      parentIdsSet.has(String(t.attachedToTableId))
                  );
                  if (chairsForRes.length > 0) {
                    // Group chairs by parent table
                    const chairsByParent: Record<string, any[]> = {};
                    chairsForRes.forEach((ch: any) => {
                      const pid = String(ch.attachedToTableId);
                      if (!chairsByParent[pid]) chairsByParent[pid] = [];
                      chairsByParent[pid].push(ch);
                    });

                    const parentIdsWithChairs = Object.keys(chairsByParent);
                    const totalChairs = parentIdsWithChairs.reduce(
                      (sum, pid) => sum + chairsByParent[pid].length,
                      0
                    );
                    if (totalChairs > 0) {
                      const targetSeats = Math.min(guests, totalChairs);
                      const baseAssignments: Record<string, number> = {};
                      let remainingLocal = targetSeats;

                      const parentTableById: Record<string, any> = {};
                      parentTablesForRes.forEach((t: any) => {
                        parentTableById[String(t.id)] = t;
                      });

                      const parentOrderDesc = parentIdsWithChairs
                        .slice()
                        .sort((a, b) => {
                          const countA = chairsByParent[a]?.length || 0;
                          const countB = chairsByParent[b]?.length || 0;
                          if (countA !== countB) return countB - countA;
                          const ta = parentTableById[a];
                          const tb = parentTableById[b];
                          const ay = Number(ta?.y) || 0;
                          const by = Number(tb?.y) || 0;
                          if (ay !== by) return ay - by;
                          const ax = Number(ta?.x) || 0;
                          const bx = Number(tb?.x) || 0;
                          return ax - bx;
                        });

                      for (const pid of parentOrderDesc) {
                        if (remainingLocal <= 0) break;
                        const capacity = chairsByParent[pid]?.length || 0;
                        if (capacity <= 0) continue;
                        const take = Math.min(capacity, remainingLocal);
                        if (take > 0) {
                          baseAssignments[pid] = take;
                          remainingLocal -= take;
                        }
                      }

                      const localOccupied = new Set<string>();
                      parentIdsWithChairs.forEach((pid) => {
                        const count = baseAssignments[pid] || 0;
                        if (!count) return;
                        const chairs = chairsByParent[pid]
                          .slice()
                          .sort((a: any, b: any) => {
                            const ay = Number(a.y) || 0;
                            const by = Number(b.y) || 0;
                            if (ay !== by) return ay - by;
                            const ax = Number(a.x) || 0;
                            const bx = Number(b.x) || 0;
                            if (ax !== bx) return ax - bx;
                            return String(a.id).localeCompare(String(b.id));
                          });
                        chairs.slice(0, count).forEach((ch: any) => {
                          if (ch && ch.id != null) {
                            localOccupied.add(String(ch.id));
                          }
                        });
                      });

                      if (localOccupied.has(String(table.id))) {
                        chairSeatedColor = arrivedForParent.color || "#22c55e";
                      }
                    }
                  }
                }
              }
            }
          }

          // Z-index: make attached chairs follow the parent table's z-layer.
          // Use parent's array index as base to respect the layer ordering from the layout,
          // and keep chairs below the expiry ring/box (z-index 10049).
          try {
            const allTables = (interactionLayout || layout).tables || [];
            const parentArrayIndex = allTables.findIndex((t: any) => t && t.id === parentTable.id);
            // Base z from array position (later = higher). Multiply by 10 to leave room for status bumps.
            // Max out at 9000 to stay below expiry ring/box (10049).
            const positionBaseZ = Math.min(9000, Math.max(1, (parentArrayIndex + 1) * 10));

            const parentIsSelected = selectedElements.includes(parentTable.id);
            // Active (open) reservation for this parent table (waiting/confirmed)
            const reservationForParent = combinedReservations.find(r => {
              const reservationDate = new Date(r.date);
              const calendarDate = selectedDate || new Date();
              const sameDay =
                reservationDate.getFullYear() === calendarDate.getFullYear() &&
                reservationDate.getMonth() === calendarDate.getMonth() &&
                reservationDate.getDate() === calendarDate.getDate();
              if (!sameDay) return false;
              if (!(r.status === 'waiting' || r.status === 'confirmed')) return false;
              return doesReservationIncludeTable(r.tableIds as any[], parentTable);
            });

            const waiterListForParent =
              reservationForParent ? getAssignedWaiters(reservationForParent.id) : ([] as string[]);
            const hasWaiterLabelsParent =
              waiterListForParent && (waiterListForParent as any).length > 0;

            // If parent has any open or arrived reservation, treat it as elevated
            const parentHasActiveReservation = Boolean(reservationForParent || arrivedForParent);

            // Status bump: add small increments for different states, but keep below expiry ring
            const statusBump = parentHasActiveReservation
              ? 5
              : parentIsSelected
              ? 3
              : hasWaiterLabelsParent
              ? 4
              : 0;

            // Chairs get parent's position-based z minus 1 (so they're behind the parent table itself)
            // plus the status bump to follow the parent's elevation for reservations/selection.
            chairZIndexOverride = Math.min(9000, positionBaseZ + statusBump - 1);
          } catch {
            // On any error, fall back to the default chair z-index
          }
        }
      } catch {}
    }

    // Elevate z-index for the table that actually renders the countdown label (group leader or single)
    // Also elevate for SEATED (ARRIVED) reservations so their time badge + dashed stroke render above chairs.
    let elevateForLabel = false;
    if (waitingColor && reservationForTable?.date && reservationForTable?.time && table.type !== 'chair') {
      try {
        const currentTables = ((interactionLayout || layout).tables || []).filter((t: any) => t && t.type !== 'chair');
        const grouped = currentTables.filter((t: any) => doesReservationIncludeTable((reservationForTable.tableIds || []) as any[], t));
        if (grouped.length > 1) {
          const eps = 2;
          const getRect = (t: any) => ({ l: t.x, t: t.y, r: t.x + (t.width || 100), b: t.y + (t.height || 100), id: t.id });
          const overlap1D = (a1: any, a2: any, b1: any, b2: any) => (Math.min(a2, b2) - Math.max(a1, b1)) >= -eps;
          const touch = (a: any, b: any) => {
            const horizontalTouch = (Math.abs(a.r - b.l) <= eps || Math.abs(b.r - a.l) <= eps) && overlap1D(a.t, a.b, b.t, b.b);
            const verticalTouch = (Math.abs(a.b - b.t) <= eps || Math.abs(b.b - a.t) <= eps) && overlap1D(a.l, a.r, b.l, b.r);
            const overlap = !(a.r < b.l - eps || a.l > b.r + eps || a.b < b.t - eps || a.t > b.b + eps);
            return horizontalTouch || verticalTouch || overlap;
          };
          const rects = grouped.map(getRect);
          const startRect = getRect(table);
          const visited: any = { [startRect.id]: true };
          const queue: any[] = [startRect];
          const component: any[] = [startRect];
          while (queue.length) {
            const cur = queue.shift();
            for (const r of rects) {
              if (!visited[r.id] && touch(cur, r)) {
                visited[r.id] = true;
                queue.push(r);
                component.push(r);
              }
            }
          }
          if (component.length > 1) {
            const leaderRect = [...component].sort((a, b) => (a.t - b.t) || (a.l - b.l))[0];
            if (leaderRect && table.id === leaderRect.id) {
              elevateForLabel = true;
            }
          } else {
            elevateForLabel = true;
          }
        } else {
          elevateForLabel = true;
        }
      } catch {}
    }
    // For ARRIVED (seated) reservations, elevate only the leader table in a connected
    // group (or the single table) so its ring + badge sit above all joined tables.
    if (!elevateForLabel && arrivedReservationForTable && table.type !== 'chair') {
      try {
        const currentTables = ((interactionLayout || layout).tables || []).filter((t: any) => t && t.type !== 'chair');
        const grouped = currentTables.filter((t: any) => doesReservationIncludeTable((arrivedReservationForTable.tableIds || []) as any[], t));
        if (grouped.length > 1) {
          const eps = 2;
          const getRect = (t: any) => ({ l: t.x, t: t.y, r: t.x + (t.width || 100), b: t.y + (t.height || 100), id: t.id });
          const overlap1D = (a1: any, a2: any, b1: any, b2: any) => (Math.min(a2, b2) - Math.max(a1, b1)) >= -eps;
          const touch = (a: any, b: any) => {
            const horizontalTouch = (Math.abs(a.r - b.l) <= eps || Math.abs(b.r - a.l) <= eps) && overlap1D(a.t, a.b, b.t, b.b);
            const verticalTouch = (Math.abs(a.b - b.t) <= eps || Math.abs(b.b - a.t) <= eps) && overlap1D(a.l, a.r, b.l, b.r);
            const overlap = !(a.r < b.l - eps || a.l > b.r + eps || a.b < b.t - eps || a.t > b.b + eps);
            return horizontalTouch || verticalTouch || overlap;
          };
          const rects = grouped.map(getRect);
          const startRect = getRect(table);
          const visited: any = { [startRect.id]: true };
          const queue: any[] = [startRect];
          const component: any[] = [startRect];
          while (queue.length) {
            const cur = queue.shift();
            for (const r of rects) {
              if (!visited[r.id] && touch(cur, r)) {
                visited[r.id] = true;
                queue.push(r);
                component.push(r);
              }
            }
          }
          if (component.length > 1) {
            const leaderRect = [...component].sort((a, b) => (a.t - b.t) || (a.l - b.l))[0];
            if (leaderRect && table.id === leaderRect.id) {
              elevateForLabel = true;
            }
          } else {
            elevateForLabel = true;
          }
        } else {
          elevateForLabel = true;
        }
      } catch {
        // Fallback: at least keep the seated visuals above chairs for this table
        elevateForLabel = true;
      }
    }
    // Use array position for z-index to respect layer ordering
    const allTablesForZ = (interactionLayout || layout).tables || [];
    const tableArrayIndex = allTablesForZ.findIndex((t: any) => t && t.id === table.id);
    const positionBaseZ = Math.min(9000, Math.max(1, (tableArrayIndex + 1) * 10));

    // Tables with countdown labels need to be elevated ABOVE all chairs and other tables
    // so their time badges are visible
    const baseZ = table.type === 'chair'
      ? Math.max(1, positionBaseZ - 1) // Chairs slightly below their layer position
      : elevateForLabel
        ? 9800 // High z-index for tables with time boxes (above all chairs/tables)
        : (positionBaseZ + (isSelected ? 3 : (hasWaiterLabels ? 4 : 0)));

    const effectiveZ =
      table.type === 'chair' && typeof chairZIndexOverride === 'number'
        ? chairZIndexOverride
        : baseZ;

    return (
      <div
        key={table.id}
        className={`absolute transition-none ${isHovered && !isSelected && isEditing && table.type !== 'chair' ? 'ring-2 ring-blue-300' : ''} ${cursor}`}
        style={{
          left: `${table.x}px`,
          top: `${table.y}px`,
          width: `${width}px`,
          height: `${height}px`,
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center',
          zIndex: effectiveZ
        }}
        onMouseDown={(e) => handleDragStart(e, table.id)}
        onClick={(e) => handleElementClick(e, table.id)}
        data-table-reservation-id={reservationForTable ? reservationForTable.id : undefined}
        onDragOver={(e) => {
          const types = e.dataTransfer.types;
          if (types.includes('application/x-respoint-waiter') || types.includes('text/waiter') || types.includes('text/plain')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }
        }}
        onDrop={(e) => {
          try {
            let name = null as string | null;
            const custom = e.dataTransfer.getData('application/x-respoint-waiter');
            if (custom) {
              const data = JSON.parse(custom);
              name = data?.name || null;
            }
            if (!name) {
              const payload = e.dataTransfer.getData('text/waiter');
              if (payload) {
                const data = JSON.parse(payload);
                name = data?.name || null;
              }
            }
            if (!name) {
              const txt = e.dataTransfer.getData('text/plain');
              if (txt) name = txt;
            }
            // Use hoverableReservation to support both waiting/confirmed AND arrived reservations (regular and event)
            const targetReservation = hoverableReservation;
            if (name && targetReservation) {
              setAssignedWaiter(targetReservation.id, name);
              try { window.dispatchEvent(new CustomEvent('respoint-waiter-assigned', { detail: { reservationId: targetReservation.id, name } })); } catch {}
            }
            setIsWaiterDragActive(false);
          } catch {}
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleContextMenu(e);
        }}
        onMouseEnter={(e) => {
          setHoveredElementId(table.id);
          if (hoverableReservation && !isEditing && table.type !== 'chair') {
            const rect = canvasRef.current!.getBoundingClientRect();
            const { x: localX, y: localY } = getZoomAdjustedCoordinates(e.clientX, e.clientY, rect);
            const canvasX = localX - canvasOffset.x;
            const canvasY = localY - canvasOffset.y;
            setHoveredTable({
              tableId: table.id,
              reservation: hoverableReservation,
              position: { x: canvasX, y: canvasY }
            });
          } else {
            // Clear any previous hover when entering chairs or non-reserved tables
            setHoveredTable(null);
          }
        }}
        onMouseLeave={() => {
          setHoveredElementId(null);
          setHoveredTable(null);
        }}
        onMouseMove={(e) => {
          if (hoveredTable && hoveredTable.tableId === table.id && !isEditing) {
            const rect = canvasRef.current!.getBoundingClientRect();
            const { x: localX, y: localY } = getZoomAdjustedCoordinates(e.clientX, e.clientY, rect);
            const canvasX = localX - canvasOffset.x;
            const canvasY = localY - canvasOffset.y;
            if (hoverRafRef.current == null) {
              hoverRafRef.current = requestAnimationFrame(() => {
                setHoveredTable(prev => {
                  if (!prev) { hoverRafRef.current = null; return null; }
                  const dx = canvasX - prev.position.x;
                  const dy = canvasY - prev.position.y;
                  if ((dx * dx + dy * dy) < 1) { hoverRafRef.current = null; return prev; }
                  hoverRafRef.current = null;
                  return ({ ...prev, position: { x: canvasX, y: canvasY } });
                });
              });
            }
          }
        }}
        onDoubleClick={(e) => {
          if (table.type !== 'chair') {
            handleTableNameDoubleClick(e, table);
          }
        }}
      >
        {table.type === 'chair' ? (
          <>
            {table.chairVariant === 'barstool' ? (
              <div className="w-full h-full select-none relative">
                <div
                  className="absolute"
                  style={{
                    left: '50%',
                    top: '50%',
                    width: '70%',
                    height: '70%',
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '9999px',
                    backgroundColor: chairSeatedColor || table.color || '#ECEFF3',
                    boxSizing: 'border-box',
                    opacity: chairSeatedColor ? 0.5 : 1
                  }}
                />
              </div>
            ) : (table.chairVariant === 'booth' || table.chairVariant === 'boothCurved') ? (
              // If arcInnerRatio is provided, render a circular arc hugging the table (for circular tables)
              ('arcInnerRatio' in (table as any)) ? (
                <svg className="w-full h-full select-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    {(() => {
                      const inner = Math.max(0, Math.min(50, (table as any).arcInnerRatio ?? 42));
                      const left = 50 - inner;
                      const right = 50 + inner;
                      const maskId = `booth-curved-arc-mask-${table.id}`;
                      return (
                        <mask id={maskId}>
                          <rect x="0" y="0" width="100" height="100" fill="black" />
                          {/* Outer semicircle */}
                          <path d="M 0 50 A 50 50 0 0 1 100 50 L 0 50 Z" fill="white" />
                          {/* Inner cut-out semicircle flush to table radius */}
                          <path d={`M ${left} 50 A ${inner} ${inner} 0 0 1 ${right} 50 L ${left} 50 Z`} fill="black" />
                        </mask>
                      );
                    })()}
                  </defs>
                  <rect
                    x="0"
                    y="0"
                    width="100"
                    height="100"
                    fill={chairSeatedColor || table.color || '#ECEFF3'}
                    opacity={chairSeatedColor ? 0.5 : 1}
                    mask={`url(#booth-curved-arc-mask-${table.id})`}
                  />
                </svg>
              ) : (
              <svg className="w-full h-full select-none" viewBox="0 0 100 50" preserveAspectRatio="none">
                <defs>
                  {(() => {
                    const t = 14; // thickness in viewBox units (relative to height 50)
                    const maskId = `booth-curved-mask-${table.id}`;
                    return (
                      <mask id={maskId}>
                        <rect x="0" y="0" width="100" height="50" fill="black" />
                        {/* Outer filled semicircle */}
                        <path d="M 0 50 A 50 50 0 0 1 100 50 L 0 50 Z" fill="white" />
                        {/* Inner cut-out semicircle */}
                        <path d={`M ${t} 50 A ${50 - t} ${50 - t} 0 0 1 ${100 - t} 50 L ${t} 50 Z`} fill="black" />
                      </mask>
                    );
                  })()}
                </defs>
                <rect
                  x="0"
                  y="0"
                  width="100"
                  height="50"
                  fill={chairSeatedColor || table.color || '#ECEFF3'}
                  opacity={chairSeatedColor ? 0.5 : 1}
                  mask={`url(#booth-curved-mask-${table.id})`}
                />
              </svg>
              )
            ) : table.chairVariant === 'boothU' ? (
              // If arcInnerRatio is provided for U-booth on circular tables, render as a thicker circular arc
              ('arcInnerRatio' in (table as any)) ? (
                <svg className="w-full h-full select-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    {(() => {
                      const inner = Math.max(0, Math.min(50, (table as any).arcInnerRatio ?? 40));
                      const left = 50 - inner;
                      const right = 50 + inner;
                      const maskId = `booth-u-arc-mask-${table.id}`;
                      const outer = 50;
                      // Create a ring by subtracting two semicircles with a larger gap (thicker)
                      return (
                        <mask id={maskId}>
                          <rect x="0" y="0" width="100" height="100" fill="black" />
                          <path d="M 0 50 A 50 50 0 0 1 100 50 L 0 50 Z" fill="white" />
                          <path d={`M ${left} 50 A ${inner} ${inner} 0 0 1 ${right} 50 L ${left} 50 Z`} fill="black" />
                        </mask>
                      );
                    })()}
                  </defs>
                  <rect
                    x="0"
                    y="0"
                    width="100"
                    height="100"
                    fill={chairSeatedColor || table.color || '#ECEFF3'}
                    opacity={chairSeatedColor ? 0.5 : 1}
                    mask={`url(#booth-u-arc-mask-${table.id})`}
                  />
                </svg>
              ) : (
              <svg className="w-full h-full select-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  {(() => {
                    const wallPx = (table as any).boothThickness ?? RECT_U_WALL_PX;
                    const maskId = `booth-u-mask-${table.id}`;
                    const widthPx = Math.max(1, (table.width || 100));
                    const heightPx = Math.max(1, (table.height || 100));
                    // Convert absolute wall thickness (px) to viewBox units (0..100)
                    const leftW = (wallPx / widthPx) * 100;
                    const rightW = leftW;
                    const topH = (wallPx / heightPx) * 100;
                    return (
                      <mask id={maskId}>
                        <rect x="0" y="0" width="100" height="100" fill="black" />
                        {/* Left arm */}
                        <rect x="0" y="0" width={leftW} height="100" fill="white" />
                        {/* Right arm */}
                        <rect x={100 - rightW} y="0" width={rightW} height="100" fill="white" />
                        {/* Back segment */}
                        <rect x="0" y="0" width="100" height={topH} fill="white" />
                      </mask>
                    );
                  })()}
                </defs>
                <rect
                  x="0"
                  y="0"
                  width="100"
                  height="100"
                  fill={chairSeatedColor || table.color || '#ECEFF3'}
                  opacity={chairSeatedColor ? 0.5 : 1}
                  mask={`url(#booth-u-mask-${table.id})`}
                />
              </svg>
              )
            ) : (
          <div
            className="w-full h-full select-none rounded-lg"
            style={{
              backgroundColor: chairSeatedColor || table.color || '#ECEFF3',
              boxSizing: 'border-box',
              opacity: chairSeatedColor ? 0.5 : 1
            }}
          />
            )}
          </>
        ) : table.type === 'rectangle' ? (
          <div
            className="w-full h-full rounded-lg flex items-center justify-center text-black font-medium select-none"
            style={{ backgroundColor: tableColor, boxShadow: '0 0 8px rgba(0,0,0,0.18), 0 0 8px rgba(0,0,0,0.12)' }}
          >
            {editingTableId === table.id ? (
              <div className="w-full h-full bg-white border-4 border-blue-500 rounded-lg outline-none z-[70] relative flex items-center justify-center" style={{ boxShadow: '0 0 16px rgba(0,0,0,0.18), 0 0 8px rgba(0,0,0,0.12)' }}>
                <input
                  type="number"
                  value={tableNameInput}
                  onChange={handleTableNameChange}
                  onBlur={handleTableNameSubmit}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleTableNameSubmit(); if (e.key === 'Escape') setEditingTableId(null); }}
                  className="w-full h-full text-center bg-transparent text-black font-bold text-xs outline-none hide-number-arrows"
                  style={{ transform: `rotate(${-rotation}deg)`, transformOrigin: 'center' }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  min="1"
                  max="999"
                />
              </div>
            ) : (
              <div style={{ transform: `rotate(${-rotation}deg)`, position: 'relative', width: '100%', height: '100%' }} className="select-none">
                <div className="w-full h-full flex items-center justify-center text-black font-medium text-xs">
                  <span className="relative inline-flex items-center justify-center">
                    {/* Lock icon positioned absolutely so number remains centered */}
                    
                    {table.name}
                    {showVipStar ? (
                      <span className="absolute -top-0.5 -right-3 pointer-events-none">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-500">
                          <path d="M12 2l3 7h7l-5.5 4.2L18 21l-6-3.8L6 21l1.5-7.8L2 9h7z"/>
                        </svg>
                      </span>
                    ) : null}
                    </span>
                </div>
                {/* Removed static dashed table border for seated; only progress ring remains */}
                {/* Seated (ARRIVED) progress + time inside table */}
                {arrivedReservationForTable && arrivedColor ? (
                  <>
                    {/* Connected-group ring for ARRIVED reservations (like waiting ring) */}
                    {(() => {
                      if (!(arrivedReservationForTable?.date && arrivedReservationForTable?.time)) return null;
                      const currentTables = ((interactionLayout || layout).tables || []).filter(t => t && t.type !== 'chair');
                      const grouped = currentTables.filter(t => doesReservationIncludeTable((arrivedReservationForTable.tableIds || []) as any[], t));
                      let overlay: React.ReactNode | null = null;
                      let suppressIndividual = false;
                      if (grouped.length > 1) {
                        const eps = 2;
                        const getRect = (t: any) => ({ l: t.x, t: t.y, r: t.x + (t.width || 100), b: t.y + (t.height || 100), id: t.id });
                        const overlap1D = (a1: any, a2: any, b1: any, b2: any) => (Math.min(a2, b2) - Math.max(a1, b1)) >= -eps;
                        const touch = (a: any, b: any) => {
                          const horizontalTouch = (Math.abs(a.r - b.l) <= eps || Math.abs(b.r - a.l) <= eps) && overlap1D(a.t, a.b, b.t, b.b);
                          const verticalTouch = (Math.abs(a.b - b.t) <= eps || Math.abs(b.b - a.t) <= eps) && overlap1D(a.l, a.r, b.l, b.r);
                          const overlap = !(a.r < b.l - eps || a.l > b.r + eps || a.b < b.t - eps || a.t > b.b + eps);
                          return horizontalTouch || verticalTouch || overlap;
                        };
                        const rects = grouped.map(getRect);
                        const startRect = getRect(table);
                        const visited: any = { [startRect.id]: true };
                        const queue: any[] = [startRect];
                        const component: any[] = [startRect];
                        while (queue.length) {
                          const cur = queue.shift();
                          for (const r of rects) {
                            if (!visited[r.id] && touch(cur, r)) {
                              visited[r.id] = true;
                              queue.push(r);
                              component.push(r);
                            }
                          }
                        }
                        if (component.length > 1) {
                          const minX = Math.min(...component.map(r => r.l));
                          const minY = Math.min(...component.map(r => r.t));
                          const maxX = Math.max(...component.map(r => r.r));
                          const maxY = Math.max(...component.map(r => r.b));
                          const groupW = Math.max(0, maxX - minX);
                          const groupH = Math.max(0, maxY - minY);
                          const leaderRect = [...component].sort((a, b) => (a.t - b.t) || (a.l - b.l))[0];
                          if (leaderRect && table.id === leaderRect.id) {
                            overlay = (
                              <div
                                className="absolute pointer-events-none"
                                style={{
                                  left: `${(minX + groupW / 2) - table.x}px`,
                                  top: `${(minY + groupH / 2) - table.y}px`,
                                  width: `${groupW}px`,
                                  height: `${groupH}px`,
                                  transform: 'translate(-50%, -50%)',
                                  willChange: 'left, top, width, height'
                                }}
                              >
                                <SeatedProgressStroke
                                  shape="rect"
                                  tableWidth={groupW}
                                  tableHeight={groupH}
                                  rotation={0}
                                  color={arrivedColor}
                                  reservation={arrivedReservationForTable}
                                  gap={4}
                                  strokeWidth={3}
                                  borderRadiusPx={8}
                                  tableId={table.id}
                                />
                              </div>
                            );
                          } else {
                            suppressIndividual = true;
                          }
                        }
                      }
                      if (!overlay && !suppressIndividual) {
                        overlay = (
                          <div
                            className="absolute pointer-events-none"
                            style={{
                              left: `${width / 2}px`,
                              top: `${height / 2}px`,
                              width: `${width}px`,
                              height: `${height}px`,
                              transform: 'translate(-50%, -50%)',
                              willChange: 'left, top, width, height'
                            }}
                          >
                    <SeatedProgressStroke
                      shape="rect"
                      tableWidth={width}
                      tableHeight={height}
                      rotation={rotation}
                      color={arrivedColor}
                      reservation={arrivedReservationForTable}
                      gap={4}
                      strokeWidth={3}
                      borderRadiusPx={8}
                      tableId={table.id}
                    />
                          </div>
                        );
                      }
                      return overlay;
                    })()}
                  </>
                ) : null}
                {/* Waiting progress ring */}
                {waitingColor ? (
                  <>
                    {/* Compute connected group (only tables whose edges touch this table) */}
                    {(() => {
                      if (!(reservationForTable?.date && reservationForTable?.time)) return null;
                      const currentTables = ((interactionLayout || layout).tables || []).filter(t => t && t.type !== 'chair');
                      const grouped = currentTables.filter(t => doesReservationIncludeTable((reservationForTable.tableIds || []) as any[], t));
                      let overlay: React.ReactNode | null = null;
                      let suppressIndividual = false;
                      if (grouped.length > 1) {
                        const eps = 2;
                        const getRect = (t: any) => ({ l: t.x, t: t.y, r: t.x + (t.width || 100), b: t.y + (t.height || 100), id: t.id });
                        const overlap1D = (a1: any, a2: any, b1: any, b2: any) => (Math.min(a2, b2) - Math.max(a1, b1)) >= -eps;
                        const touch = (a: any, b: any) => {
                          const horizontalTouch = (Math.abs(a.r - b.l) <= eps || Math.abs(b.r - a.l) <= eps) && overlap1D(a.t, a.b, b.t, b.b);
                          const verticalTouch = (Math.abs(a.b - b.t) <= eps || Math.abs(b.b - a.t) <= eps) && overlap1D(a.l, a.r, b.l, b.r);
                          const overlap = !(a.r < b.l - eps || a.l > b.r + eps || a.b < b.t - eps || a.t > b.b + eps);
                          return horizontalTouch || verticalTouch || overlap;
                        };
                        const rects = grouped.map(getRect);
                        const startRect = getRect(table);
                        const visited: any = { [startRect.id]: true };
                        const queue: any[] = [startRect];
                        const component: any[] = [startRect];
                        while (queue.length) {
                          const cur = queue.shift();
                          for (const r of rects) {
                            if (!visited[r.id] && touch(cur, r)) {
                              visited[r.id] = true;
                              queue.push(r);
                              component.push(r);
                            }
                          }
                        }
                        if (component.length > 1) {
                          const minX = Math.min(...component.map(r => r.l));
                          const minY = Math.min(...component.map(r => r.t));
                          const maxX = Math.max(...component.map(r => r.r));
                          const maxY = Math.max(...component.map(r => r.b));
                          const groupW = Math.max(0, maxX - minX);
                          const groupH = Math.max(0, maxY - minY);
                          const leaderRect = [...component].sort((a, b) => (a.t - b.t) || (a.l - b.l))[0];
                          if (leaderRect && table.id === leaderRect.id) {
                            overlay = (
                              <div
                                className="absolute pointer-events-none"
                    style={{
                                  left: `${(minX + groupW / 2) - table.x}px`,
                                  top: `${(minY + groupH / 2) - table.y}px`,
                                  width: `${groupW}px`,
                                  height: `${groupH}px`,
                                  transform: 'translate(-50%, -50%)',
                                  willChange: 'left, top, width, height'
                                }}
                              >
                                <ProgressStroke
                                  shape="rect"
                                  tableWidth={groupW}
                                  tableHeight={groupH}
                                  rotation={0}
                                  color={waitingColor}
                                  reservationDate={reservationForTable.date}
                                  reservationTime={reservationForTable.time}
                                  createdAt={reservationForTable.createdAt || (reservationForTable as any).created_at}
                                  gap={4}
                                  strokeWidth={4}
                                  windowMinutes={60}
                                  borderRadiusPx={8}
                                />
                              </div>
                            );
                          } else {
                            suppressIndividual = true;
                          }
                        }
                      }
                      if (!overlay && !suppressIndividual) {
                        overlay = (
                          <div
                            className="absolute pointer-events-none"
                            style={{
                              left: `${width / 2}px`,
                              top: `${height / 2}px`,
                              width: `${width}px`,
                              height: `${height}px`,
                              transform: 'translate(-50%, -50%)',
                              willChange: 'left, top, width, height'
                            }}
                          >
                            <ProgressStroke
                              shape="rect"
                              tableWidth={width}
                              tableHeight={height}
                              rotation={rotation}
                              color={waitingColor}
                              reservationDate={reservationForTable.date}
                              reservationTime={reservationForTable.time}
                              createdAt={reservationForTable.createdAt || (reservationForTable as any).created_at}
                              gap={4}
                              strokeWidth={4}
                              windowMinutes={60}
                              borderRadiusPx={8}
                            />
                            </div>
                        );
                      }
                      return overlay;
                    })()}
                  </>
                ) : null}
                {/* Waiter chips for waiting/confirmed OR arrived reservations */}
                {((reservationForTable && isPrimaryTableForReservation) || (arrivedReservationForTable && isPrimaryTableForArrived)) ? (() => {
                  const targetRes = reservationForTable || arrivedReservationForTable;
                  const list = targetRes ? getAssignedWaiters(targetRes.id) : [];
                  return list && list.length > 0 ? (
                    <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-1 px-1 overflow-visible pointer-events-none">
                      {list.map(w => (
                        <span
                          key={w}
                          className={
                            `waiter-chip group relative px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap pointer-events-auto ` +
                            (document.documentElement.getAttribute('data-theme') === 'light' ? 'bg-black/30 text-white' : 'bg-black/50 text-white')
                          }
                          style={{ color: '#FFFFFF' }}
                        >
                          {w}
                          <button
                            aria-label={`Remove ${w}`}
                            title={`Remove ${w}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (targetRes) {
                                removeAssignedWaiter(targetRes.id, w);
                                try { window.dispatchEvent(new CustomEvent('respoint-waiter-assigned', { detail: { reservationId: targetRes.id, name: null } })); } catch {}
                              }
                            }}
                            className={
                              `absolute -top-1 -right-1 z-10 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full focus:outline-none focus:ring-2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition ` +
                              (document.documentElement.getAttribute('data-theme') === 'light' ? 'bg-gray-500 text-white hover:bg-gray-400 focus:ring-gray-300' : 'bg-gray-600 text-white hover:bg-gray-400 focus:ring-gray-400/60')
                            }
                          >
                            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke={document.documentElement.getAttribute('data-theme') === 'light' ? '#FFFFFF' : 'currentColor'} strokeWidth="3">
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null;
                })() : null}
              </div>
            )}
          </div>
        ) : (
          <div
            className="w-full h-full rounded-full flex items-center justify-center text-black font-medium select-none"
            style={{ backgroundColor: tableColor, boxShadow: '0 0 8px rgba(0,0,0,0.18), 0 0 8px rgba(0,0,0,0.12)' }}
          >
             {editingTableId === table.id ? (
              <div className="w-full h-full bg-white border-4 border-blue-500 rounded-full outline-none z-[70] relative flex items-center justify-center" style={{ boxShadow: '0 0 16px rgba(0,0,0,0.18), 0 0 8px rgba(0,0,0,0.12)' }}>
                <input
                  type="number"
                  value={tableNameInput}
                  onChange={handleTableNameChange}
                  onBlur={handleTableNameSubmit}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleTableNameSubmit(); if (e.key === 'Escape') setEditingTableId(null); }}
                  className="w-full h-full text-center bg-transparent text-black font-bold text-xs outline-none hide-number-arrows"
                  style={{ transform: `rotate(${-rotation}deg)`, transformOrigin: 'center' }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                   min="1"
                   max="999"
                />
              </div>
            ) : (
              <div style={{ transform: `rotate(${-rotation}deg)`, position: 'relative', width: '100%', height: '100%' }} className="select-none">
                <div className="w-full h-full flex items-center justify-center text-black font-medium text-xs">
                  <span className="relative inline-flex items-center justify-center">
                    
                    {table.name}
                    {showVipStar ? (
                      <span className="absolute -top-0.5 -right-3 pointer-events-none">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-500">
                          <path d="M12 2l3 7h7l-5.5 4.2L18 21l-6-3.8L6 21l1.5-7.8L2 9h7z"/>
                        </svg>
                      </span>
                    ) : null}
                    </span>
                </div>
                {/* Removed static dashed table border for seated; only progress ring remains */}
                {/* Seated (ARRIVED) progress + time inside table - circle */}
                {arrivedReservationForTable && arrivedColor ? (
                  <>
                    {/* Connected-group ring for ARRIVED reservations on circular tables */}
                    {(() => {
                      if (!(arrivedReservationForTable?.date && arrivedReservationForTable?.time)) return null;
                      const currentTables = ((interactionLayout || layout).tables || []).filter(t => t && t.type !== 'chair');
                      const grouped = currentTables.filter(t => doesReservationIncludeTable((arrivedReservationForTable.tableIds || []) as any[], t));
                      let overlay: React.ReactNode | null = null;
                      let suppressIndividual = false;
                      if (grouped.length > 1) {
                        const eps = 2;
                        const getRect = (t: any) => ({ l: t.x, t: t.y, r: t.x + (t.width || 100), b: t.y + (t.height || 100), id: t.id });
                        const overlap1D = (a1: any, a2: any, b1: any, b2: any) => (Math.min(a2, b2) - Math.max(a1, b1)) >= -eps;
                        const touch = (a: any, b: any) => {
                          const horizontalTouch = (Math.abs(a.r - b.l) <= eps || Math.abs(b.r - a.l) <= eps) && overlap1D(a.t, a.b, b.t, b.b);
                          const verticalTouch = (Math.abs(a.b - b.t) <= eps || Math.abs(b.b - a.t) <= eps) && overlap1D(a.l, a.r, b.l, b.r);
                          const overlap = !(a.r < b.l - eps || a.l > b.r + eps || a.b < b.t - eps || a.t > b.b + eps);
                          return horizontalTouch || verticalTouch || overlap;
                        };
                        const rects = grouped.map(getRect);
                        const startRect = getRect(table);
                        const visited: any = { [startRect.id]: true };
                        const queue: any[] = [startRect];
                        const component: any[] = [startRect];
                        while (queue.length) {
                          const cur = queue.shift();
                          for (const r of rects) {
                            if (!visited[r.id] && touch(cur, r)) {
                              visited[r.id] = true;
                              queue.push(r);
                              component.push(r);
                            }
                          }
                        }
                        if (component.length > 1) {
                          const minX = Math.min(...component.map(r => r.l));
                          const minY = Math.min(...component.map(r => r.t));
                          const maxX = Math.max(...component.map(r => r.r));
                          const maxY = Math.max(...component.map(r => r.b));
                          const groupW = Math.max(0, maxX - minX);
                          const groupH = Math.max(0, maxY - minY);
                          const leaderRect = [...component].sort((a, b) => (a.t - b.t) || (a.l - b.l))[0];
                          if (leaderRect && table.id === leaderRect.id) {
                            overlay = (
                              <div
                                className="absolute pointer-events-none"
                                style={{
                                  left: `${(minX + groupW / 2) - table.x}px`,
                                  top: `${(minY + groupH / 2) - table.y}px`,
                                  width: `${groupW}px`,
                                  height: `${groupH}px`,
                                  transform: 'translate(-50%, -50%)',
                                  willChange: 'left, top, width, height'
                                }}
                              >
                                <SeatedProgressStroke
                                  shape="rect"
                                  tableWidth={groupW}
                                  tableHeight={groupH}
                                  rotation={0}
                                  color={arrivedColor}
                                  reservation={arrivedReservationForTable}
                                  gap={4}
                                  strokeWidth={3}
                                  tableId={table.id}
                                />
                              </div>
                            );
                          } else {
                            suppressIndividual = true;
                          }
                        }
                      }
                      if (!overlay && !suppressIndividual) {
                        overlay = (
                          <div
                            className="absolute pointer-events-none"
                            style={{
                              left: `${width / 2}px`,
                              top: `${height / 2}px`,
                              width: `${width}px`,
                              height: `${height}px`,
                              transform: 'translate(-50%, -50%)',
                              willChange: 'left, top, width, height'
                            }}
                          >
                    <SeatedProgressStroke
                      shape="circle"
                      tableWidth={width}
                      tableHeight={height}
                      rotation={rotation}
                      color={arrivedColor}
                      reservation={arrivedReservationForTable}
                      gap={4}
                      strokeWidth={3}
                      tableId={table.id}
                    />
                          </div>
                        );
                      }
                      return overlay;
                    })()}
                  </>
                ) : null}
                {/* Waiting progress ring for circular tables */}
                {waitingColor ? (
                  <>
                    {/* Compute connected group (only tables whose edges touch this table) */}
                    {(() => {
                      if (!(reservationForTable?.date && reservationForTable?.time)) return null;
                      const currentTables = ((interactionLayout || layout).tables || []).filter(t => t && t.type !== 'chair');
                      const grouped = currentTables.filter(t => doesReservationIncludeTable((reservationForTable.tableIds || []) as any[], t));
                      let overlay: React.ReactNode | null = null;
                      let suppressIndividual = false;
                      if (grouped.length > 1) {
                        const eps = 2;
                        const getRect = (t: any) => ({ l: t.x, t: t.y, r: t.x + (t.width || 100), b: t.y + (t.height || 100), id: t.id });
                        const overlap1D = (a1: any, a2: any, b1: any, b2: any) => (Math.min(a2, b2) - Math.max(a1, b1)) >= -eps;
                        const touch = (a: any, b: any) => {
                          const horizontalTouch = (Math.abs(a.r - b.l) <= eps || Math.abs(b.r - a.l) <= eps) && overlap1D(a.t, a.b, b.t, b.b);
                          const verticalTouch = (Math.abs(a.b - b.t) <= eps || Math.abs(b.b - a.t) <= eps) && overlap1D(a.l, a.r, b.l, b.r);
                          const overlap = !(a.r < b.l - eps || a.l > b.r + eps || a.b < b.t - eps || a.t > b.b + eps);
                          return horizontalTouch || verticalTouch || overlap;
                        };
                        const rects = grouped.map(getRect);
                        const startRect = getRect(table);
                        const visited: any = { [startRect.id]: true };
                        const queue: any[] = [startRect];
                        const component: any[] = [startRect];
                        while (queue.length) {
                          const cur = queue.shift();
                          for (const r of rects) {
                            if (!visited[r.id] && touch(cur, r)) {
                              visited[r.id] = true;
                              queue.push(r);
                              component.push(r);
                            }
                          }
                        }
                        if (component.length > 1) {
                          const minX = Math.min(...component.map(r => r.l));
                          const minY = Math.min(...component.map(r => r.t));
                          const maxX = Math.max(...component.map(r => r.r));
                          const maxY = Math.max(...component.map(r => r.b));
                          const groupW = Math.max(0, maxX - minX);
                          const groupH = Math.max(0, maxY - minY);
                          const leaderRect = [...component].sort((a, b) => (a.t - b.t) || (a.l - b.l))[0];
                          if (leaderRect && table.id === leaderRect.id) {
                            overlay = (
                              <div
                                className="absolute pointer-events-none"
                    style={{
                                  left: `${(minX + groupW / 2) - table.x}px`,
                                  top: `${(minY + groupH / 2) - table.y}px`,
                                  width: `${groupW}px`,
                                  height: `${groupH}px`,
                                  transform: 'translate(-50%, -50%)',
                                  willChange: 'left, top, width, height'
                                }}
                              >
                                <ProgressStroke
                                  shape="rect"
                                  tableWidth={groupW}
                                  tableHeight={groupH}
                                  rotation={0}
                                  color={waitingColor}
                                  reservationDate={reservationForTable.date}
                                  reservationTime={reservationForTable.time}
                                  createdAt={reservationForTable.createdAt || (reservationForTable as any).created_at}
                                  gap={4}
                                  strokeWidth={4}
                                  windowMinutes={60}
                                  borderRadiusPx={8}
                                />
                              </div>
                            );
                          } else {
                            suppressIndividual = true;
                          }
                        }
                      }
                      if (!overlay && !suppressIndividual) {
                        overlay = (
                          <div
                            className="absolute pointer-events-none"
                            style={{
                              left: `${width / 2}px`,
                              top: `${height / 2}px`,
                              width: `${width}px`,
                              height: `${height}px`,
                              transform: 'translate(-50%, -50%)',
                              willChange: 'left, top, width, height'
                            }}
                          >
                            <ProgressStroke
                              shape="circle"
                              tableWidth={width}
                              tableHeight={height}
                              rotation={rotation}
                              color={waitingColor}
                              reservationDate={reservationForTable.date}
                              reservationTime={reservationForTable.time}
                              createdAt={reservationForTable.createdAt || (reservationForTable as any).created_at}
                              gap={4}
                              strokeWidth={4}
                              windowMinutes={60}
                            />
                          </div>
                        );
                      }
                      return overlay;
                    })()}
                  </>
                ) : null}
                {/* Waiter chips for waiting/confirmed OR arrived reservations (circular tables) */}
                {((reservationForTable && isPrimaryTableForReservation) || (arrivedReservationForTable && isPrimaryTableForArrived)) ? (() => {
                  const targetRes = reservationForTable || arrivedReservationForTable;
                  const list = targetRes ? getAssignedWaiters(targetRes.id) : [];
                  return list && list.length > 0 ? (
                    <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-1 px-1 overflow-visible pointer-events-none">
                      {list.map(w => (
                        <span
                          key={w}
                          className={
                            `waiter-chip group relative px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap pointer-events-auto ` +
                            (document.documentElement.getAttribute('data-theme') === 'light' ? 'bg-black/20 text-white' : 'bg-black/30 text-white')
                          }
                          style={{ color: '#FFFFFF' }}
                        >
                          {w}
                          <button
                            aria-label={`Remove ${w}`}
                            title={`Remove ${w}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (targetRes) {
                                removeAssignedWaiter(targetRes.id, w);
                                try { window.dispatchEvent(new CustomEvent('respoint-waiter-assigned', { detail: { reservationId: targetRes.id, name: null } })); } catch {}
                              }
                            }}
                            className={
                              `absolute -top-1 -right-1 z-10 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full focus:outline-none focus:ring-2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition ` +
                              (document.documentElement.getAttribute('data-theme') === 'light' ? 'bg-gray-500 text-white hover:bg-gray-400 focus:ring-gray-300' : 'bg-gray-600 text-white hover:bg-gray-400 focus:ring-gray-400/60')
                            }
                          >
                            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke={document.documentElement.getAttribute('data-theme') === 'light' ? '#FFFFFF' : 'currentColor'} strokeWidth="3">
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null;
                })() : null}
              </div>
            )}
          </div>
        )}
            
        {/* Multi-reservation indicator badge - positioned at top edge of table */}
        {hasMultipleReservations && currentDisplayedReservation && table.type !== 'chair' && (
          <button
            onClick={cycleTableReservation}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute flex items-center justify-center text-[10px] font-bold shadow-lg border-2 cursor-pointer hover:scale-110 transition-transform"
            style={{
              transform: 'translate(-50%, -50%)',
              top: '0px',
              left: '50%',
              minWidth: '28px',
              height: '20px',
              paddingLeft: '6px',
              paddingRight: '6px',
              borderRadius: '10px',
              backgroundColor: currentDisplayedReservation.status === 'arrived' ? '#22c55e' : '#f59e0b',
              color: 'white',
              borderColor: 'white',
              zIndex: 10100
            }}
            title={`${validIndex + 1}/${totalReservationsForTable} rezervacija - klikni za sledeću`}
          >
            {validIndex + 1}/{totalReservationsForTable}
          </button>
        )}

      </div>
    );
  };

  // Render wall with handles
  const renderWall = (wall: any) => {
    const rect = getWallRectangle(wall.x1, wall.y1, wall.x2, wall.y2, wall.thickness);
    const isSelected = selectedElements.includes(wall.id);
    const isHovered = hoveredElementId === wall.id;
    const angle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1) * 180 / Math.PI;
    
    return (
      <g key={wall.id}>
        {/* Wall rectangle */}
        <rect
          x={rect.centerX - rect.width / 2}
          y={rect.centerY - rect.height / 2}
          width={rect.width}
          height={rect.height}
          fill="#4B5563"
          transform={`rotate(${rect.angle} ${rect.centerX} ${rect.centerY})`}
          className={`cursor-pointer transition-none ${isHovered && !isSelected && isEditing ? 'stroke-2 stroke-blue-300' : ''}`}
          onMouseDown={(e) => handleDragStart(e as any, wall.id)}
          onClick={(e) => handleElementClick(e as any, wall.id)}
          onMouseEnter={() => setHoveredElementId(wall.id)}
          onMouseLeave={() => setHoveredElementId(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleContextMenu(e as any);
          }}
        />

      </g>
    );
  };

  // Render text with handles
  const renderText = (text: any) => {
    const isSelected = selectedElements.includes(text.id);
    const isHovered = hoveredElementId === text.id;
    const rotation = text.rotation || 0;
    // Calculate actual text dimensions based on content and font size
    // Always calculate optimal dimensions without width constraints for consistent rendering
    const textSize = getTextSize(text.text, text.fontSize || 16);
    const width = textSize.width;
    const height = textSize.height;
    
    return (
      <div
        key={text.id}
        className={`absolute ${isHovered && !isSelected && isEditing ? 'ring-2 ring-blue-300' : ''} ${isDragging && isSelected ? 'cursor-move' : 'cursor-pointer'}`}
        style={{
          left: `${text.x}px`,
          top: `${text.y}px`,
          width: `${width}px`,
          height: `${height}px`,
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center'
        }}
        onMouseDown={(e) => handleDragStart(e, text.id)}
        onClick={(e) => handleElementClick(e, text.id)}
        onMouseEnter={() => setHoveredElementId(text.id)}
        onMouseLeave={() => setHoveredElementId(null)}
        onDoubleClick={(e) => handleTextDoubleClick(e, text.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleContextMenu(e);
        }}
      >
        <div
          className="text-white canvas-text select-none h-full w-full flex items-center justify-center"
          style={{
            fontSize: `${text.fontSize}px`,
            padding: '4px',
            boxSizing: 'border-box'
          }}
        >
          <div
              style={{ 
              whiteSpace: text.isParagraph ? 'pre-wrap' : 'nowrap',
              textAlign: text.isParagraph ? 'left' : 'center',
              lineHeight: '1.2',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: text.isParagraph ? 'flex-start' : 'center',
              justifyContent: text.isParagraph ? 'flex-start' : 'center'
            }}
          >
            {text.text}
          </div>
            </div>
            

      </div>
    );
  };

  // Render drawing preview
  const renderDrawingPreview = () => {
    if (!isDrawing) return null;

    if (selectedTool === 'table') {
      const { width, height } = getConstrainedDimensions(drawStart.x, drawStart.y, drawEnd.x, drawEnd.y, isShiftPressed || tableType === 'circle');
      const x = width < 0 ? drawStart.x + width : drawStart.x;
      const y = height < 0 ? drawStart.y + height : drawStart.y;

      return (
        <>
          <div
            className="absolute pointer-events-none border-2 border-dashed border-blue-500"
            style={{
              left: `${x}px`,
              top: `${y}px`,
              width: `${Math.abs(width)}px`,
              height: `${Math.abs(height)}px`,
              borderRadius: tableType === 'circle' ? '50%' : '8px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              zIndex: 300
            }}
          />

          {/* Recommended standard size preview (5x5 grid cells) */}
          {showStandardSizePreview && (() => {
            // Orient the preview square from the start point following current drag direction
            const signX = width >= 0 ? 1 : -1;
            const signY = height >= 0 ? 1 : -1;
            const standardCells = tableType === 'circle' ? STANDARD_CIRCLE_GRID_CELLS : STANDARD_TABLE_GRID_CELLS;
            const stdSize = GRID_SIZE * standardCells;
            const px = signX >= 0 ? drawStart.x : drawStart.x - stdSize;
            const py = signY >= 0 ? drawStart.y : drawStart.y - stdSize;
            const radius = tableType === 'circle' ? '50%' : '8px';
            const isLightTheme = (typeof document !== 'undefined') && document.documentElement.getAttribute('data-theme') === 'light';
            const textColor = isLightTheme ? '#111827' : '#F9FAFB';
            return (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${px}px`,
                  top: `${py}px`,
                  width: `${stdSize}px`,
                  height: `${stdSize}px`,
                  borderRadius: radius,
                  border: '1.5px dashed rgba(26, 220, 155, 0.5)', // emerald-500
                  boxShadow: 'inset 0 0 0 1px rgba(16, 185, 129, 0.25)',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 300
                }}
                title="Recommended size (5×5 grid)"
              >
                <span style={{ fontSize: '8px', color: textColor, opacity: 0.35, display: 'block', width: '100%', textAlign: 'center' }}>
                  Standard size
                </span>
              </div>
            );
          })()}

        </>
      );
    }

    if (selectedTool === 'wall') {
      // Use rectangle drawing approach like tables
      const { width, height } = getConstrainedDimensions(drawStart.x, drawStart.y, drawEnd.x, drawEnd.y, isShiftPressed);
      const x = width < 0 ? drawStart.x + width : drawStart.x;
      const y = height < 0 ? drawStart.y + height : drawStart.y;
      const wallWidth = Math.abs(width);
      const wallHeight = Math.abs(height);
      
      // Ensure minimum dimensions
      const actualWidth = Math.max(wallWidth, 5);
      const actualHeight = Math.max(wallHeight, 5);
      
      // Determine wall orientation and calculate length vs thickness
      let length, thickness;
      if (actualWidth >= actualHeight) {
        // Horizontal wall
        length = actualWidth;
        thickness = actualHeight;
      } else {
        // Vertical wall  
        length = actualHeight;
        thickness = actualWidth;
      }
      
      // If shift is pressed, ensure minimum thickness
      if (isShiftPressed) {
        thickness = Math.max(thickness, DEFAULT_WALL_THICKNESS);
      }
      
      return (
        <>
          <div
            className="absolute pointer-events-none border-2 border-dashed border-blue-500"
            style={{
              left: `${x}px`,
              top: `${y}px`,
              width: `${actualWidth}px`,
              height: `${actualHeight}px`,
              backgroundColor: 'rgba(59, 130, 246, 0.3)',
              zIndex: 300
            }}
          />

        </>
      );
    }
    
    if (selectedTool === 'text') {
      const x = Math.min(drawStart.x, drawEnd.x);
      const y = Math.min(drawStart.y, drawEnd.y);
      const width = Math.abs(drawEnd.x - drawStart.x);
      const height = Math.abs(drawEnd.y - drawStart.y);
      if (width < 5 && height < 5) return null; // Don't show preview for a click

      return (
        <div
          className="absolute pointer-events-none border border-dashed border-blue-500 bg-blue-500/10"
          style={{
            left: `${x}px`,
            top: `${y}px`,
            width: `${width}px`,
            height: `${height}px`,
            zIndex: 300
          }}
        />
      );
    }

    return null;
  };

  // Render marquee selection
  const renderMarqueeSelection = () => {
    if (!isMarqueeSelecting) return null;
    
    const x = Math.min(marqueeStart.x, marqueeEnd.x);
    const y = Math.min(marqueeStart.y, marqueeEnd.y);
    const width = Math.abs(marqueeEnd.x - marqueeStart.x);
    const height = Math.abs(marqueeEnd.y - marqueeStart.y);
    
    return (
      <div
        className="absolute pointer-events-none border border-blue-500 bg-blue-500/10 marquee-selection"
        style={{
          left: `${x}px`,
          top: `${y}px`,
          width: `${width}px`,
          height: `${height}px`,
          zIndex: 280
        }}
      />
    );
  };

  // Save layout when it changes
  useEffect(() => {
    if (layout && currentZone && !isEditing && hasChanges) {
      saveLayout();
      // hasChanges is now tracked in useCanvasLayout hook
    }
  }, [layout, currentZone, saveLayout, isEditing, hasChanges]);

  // Handle save layout
  const handleSaveLayout = (name: string, isDefault: boolean) => {
    saveLayoutAs(name, isDefault);
    setShowSaveLayoutModal(false);
    setHoveredTable(null);
  };

  // Duplicate selected elements (Ctrl+D)
  const createDuplicatesForDrag = () => {
    if (selectedElements.length === 0) return;
    
    const duplicates: string[] = [];
    const newTables: any[] = [];
    const newWalls: any[] = [];
    const newTexts: any[] = [];
    const timestamp = Date.now();
    
    selectedElements.forEach((elementId, index) => {
      // Find the element
      const table = layout.tables?.find(t => t.id === elementId);
      const wall = layout.walls?.find(w => w.id === elementId);
      const text = layout.texts?.find(t => t.id === elementId);
      
      if (table) {
        const newId = `table-${timestamp}-${index}`;
        duplicates.push(newId);
        const newTable = {
          ...table,
          id: newId,
          number: table.number,
          name: `${table.number}`,
          color: '#FFFFFF'
        };
        newTables.push(newTable);
      } else if (wall) {
        const newId = `wall-${timestamp}-${index}`;
        duplicates.push(newId);
        const newWall = {
          ...wall,
          id: newId
        };
        newWalls.push(newWall);
      } else if (text) {
        const newId = `text-${timestamp}-${index}`;
        duplicates.push(newId);
        const newText = {
          ...text,
          id: newId
        };
        newTexts.push(newText);
      }
    });
    
    // Update layout with all duplicates at once
    setLayout({
      ...layout,
      tables: [...(layout.tables || []), ...newTables],
      walls: [...(layout.walls || []), ...newWalls],
      texts: [...(layout.texts || []), ...newTexts]
    });

    // Select the duplicates
    setSelectedElements(duplicates);
    
    console.log('Created duplicates for drag:', { tables: newTables, walls: newWalls, texts: newTexts });
  };
    // Helper function to get rotated corner coordinates
  const getRotatedCornerCoords = (table: any, corner: 'tl' | 'tr' | 'bl' | 'br') => {
    const width = table.width || 100;
    const height = table.height || 100;
    const centerX = table.x + width / 2;
    const centerY = table.y + height / 2;
    const rotationRad = (table.rotation || 0) * Math.PI / 180;
    
    const cos = Math.cos(rotationRad);
    const sin = Math.sin(rotationRad);
    
    let localX: number, localY: number;
    switch (corner) {
        case 'tl': localX = -width / 2; localY = -height / 2; break;
        case 'tr': localX = width / 2; localY = -height / 2; break;
        case 'bl': localX = -width / 2; localY = height / 2; break;
        case 'br': localX = width / 2; localY = height / 2; break;
    }
    
    const rotatedX = localX * cos - localY * sin;
    const rotatedY = localX * sin + localY * cos;
    
    return { x: centerX + rotatedX, y: centerY + rotatedY };
  };

  // Helper function to get bounding box of selected elements group
  const getGroupBoundingBox = () => {
    if (selectedElements.length === 0) return null;
    
    const currentLayout = interactionLayout || layout;
    let rotation = 0;
    
    // For single selection, we'll use the element's rotation
    if (selectedElements.length === 1) {
      const elementId = selectedElements[0];
      const table = currentLayout.tables?.find(t => t.id === elementId);
      const text = currentLayout.texts?.find(t => t.id === elementId);
      const wall = currentLayout.walls?.find(w => w.id === elementId);
      
      if (table) {
        rotation = table.rotation || 0;
        return {
          x: table.x,
          y: table.y,
          width: table.width || 100,
          height: table.height || 100,
          centerX: table.x + (table.width || 100) / 2,
          centerY: table.y + (table.height || 100) / 2,
          rotation
        };
      } else if (text) {
        rotation = text.rotation || 0;
        // Calculate actual text dimensions based on content and font size
        // Always calculate optimal dimensions without width constraints for selection
        const textSize = getTextSize(text.text, text.fontSize || 16);
        const actualWidth = textSize.width;
        const actualHeight = textSize.height;
        return {
          x: text.x,
          y: text.y,
          width: actualWidth,
          height: actualHeight,
          centerX: text.x + actualWidth / 2,
          centerY: text.y + actualHeight / 2,
          rotation
        };
      } else if (wall) {
        // For walls, calculate bounding box and rotation
        const angle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
        const length = Math.sqrt(Math.pow(wall.x2 - wall.x1, 2) + Math.pow(wall.y2 - wall.y1, 2));
        const centerX = (wall.x1 + wall.x2) / 2;
        const centerY = (wall.y1 + wall.y2) / 2;
        
        return {
          x: centerX - length / 2,
          y: centerY - wall.thickness / 2,
          width: length,
          height: wall.thickness,
          centerX,
          centerY,
          rotation: angle * 180 / Math.PI
        };
      }
    }
    
        // For multiple selections, determine if we should use oriented or axis-aligned bounding box
    
    // Collect all corners of all selected elements in global coordinates
    const allCorners: { x: number, y: number }[] = [];
    
    selectedElements.forEach(elementId => {
      const table = currentLayout.tables?.find(t => t.id === elementId);
      const wall = currentLayout.walls?.find(w => w.id === elementId);
      const text = currentLayout.texts?.find(t => t.id === elementId);
      
      if (table) {
        // Skip chairs when calculating group bounding box - they are "glued" to parent tables
        // and shouldn't affect anchor points for scaling/rotation operations
        if (table.type === 'chair') return;
        
        // Get all corners of the table in global coordinates
        const corners = getRotatedRectangleCorners(
          table.x, table.y, table.width || 100, table.height || 100, table.rotation || 0
        );
        allCorners.push(...corners);
      } else if (wall) {
        // For walls, calculate corners based on endpoints and thickness
        const dx = wall.x2 - wall.x1;
        const dy = wall.y2 - wall.y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        // Calculate perpendicular offset for thickness
        const perpX = -Math.sin(angle) * wall.thickness / 2;
        const perpY = Math.cos(angle) * wall.thickness / 2;
        
        // Four corners of the wall
        allCorners.push(
          { x: wall.x1 + perpX, y: wall.y1 + perpY },
          { x: wall.x1 - perpX, y: wall.y1 - perpY },
          { x: wall.x2 + perpX, y: wall.y2 + perpY },
          { x: wall.x2 - perpX, y: wall.y2 - perpY }
        );
      } else if (text) {
        // Get all corners of the text
        const textSize = getTextSize(text.text, text.fontSize || 16);
          const corners = getRotatedRectangleCorners(
          text.x, text.y, textSize.width, textSize.height, text.rotation || 0
        );
        allCorners.push(...corners);
      }
    });
    
    if (allCorners.length === 0) {
      return null;
    }
    
    // Calculate rotation based on current object rotations
    let groupRotation = 0;
    if (selectedElements.length === 1) {
      // For single selection, use the element's current rotation
      const elementId = selectedElements[0];
      const table = currentLayout.tables?.find(t => t.id === elementId);
      const wall = currentLayout.walls?.find(w => w.id === elementId);
      const text = currentLayout.texts?.find(t => t.id === elementId);
      
      if (table) {
        groupRotation = normalizeAngle(table.rotation || 0);
      } else if (wall) {
        const angle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1) * 180 / Math.PI;
        groupRotation = normalizeAngle(angle);
      } else if (text) {
        groupRotation = normalizeAngle(text.rotation || 0);
      }
      
      // For single selection, use AABB approach
      const minX = Math.min(...allCorners.map(c => c.x));
      const maxX = Math.max(...allCorners.map(c => c.x));
      const minY = Math.min(...allCorners.map(c => c.y));
      const maxY = Math.max(...allCorners.map(c => c.y));
      
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
        rotation: groupRotation
      };
    } else if (selectedElements.length > 1) {
      // For group selection:
      // - If group is rotating, compute an oriented bounding box (OBB) that tightly follows
      //   the currently rotated objects using the group's current visual angle.
      // - Otherwise, fall back to AABB or common-rotation OBB below.
      if (isGroupRotating) {
        const displayAngle = currentRotationAngle;
        const theta = displayAngle * Math.PI / 180;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
        let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
        for (const p of allCorners) {
          const u = p.x * cos + p.y * sin;
          const v = -p.x * sin + p.y * cos;
          if (u < minU) minU = u;
          if (u > maxU) maxU = u;
          if (v < minV) minV = v;
          if (v > maxV) maxV = v;
        }
        const width = Math.max(0, maxU - minU);
        const height = Math.max(0, maxV - minV);
        const centerU = (minU + maxU) / 2;
        const centerV = (minV + maxV) / 2;
        const centerX = centerU * cos - centerV * sin;
        const centerY = centerU * sin + centerV * cos;
        return {
          x: centerX - width / 2,
          y: centerY - height / 2,
          width,
          height,
          centerX,
          centerY,
          rotation: displayAngle
        };
      }
      
      // If all selected elements share the same rotation (e.g., all initially 0°),
      // show an oriented bounding box aligned to that common rotation so the selection
      // visually matches the group's edges even when not actively rotating.
      // Compute common rotation modulo 180° (orientation equivalence).
      // Skip chairs as they have their own rotation and are "glued" to parent tables.
      const current = interactionLayout || layout;
      const anglesDeg: number[] = [];
      selectedElements.forEach(elementId => {
        const table = current.tables?.find(t => t.id === elementId);
        const wall = current.walls?.find(w => w.id === elementId);
        const text = current.texts?.find(t => t.id === elementId);
        // Skip chairs - they have their own rotation and shouldn't affect group rotation calculation
        if (table && table.type === 'chair') return;
        if (table && typeof table.rotation === 'number') {
          anglesDeg.push(normalizeAngle(table.rotation) % 180);
        } else if (text && typeof text.rotation === 'number') {
          anglesDeg.push(normalizeAngle(text.rotation) % 180);
        } else if (wall) {
          const angle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1) * 180 / Math.PI;
          const norm = ((angle % 180) + 180) % 180;
          anglesDeg.push(norm);
        }
      });
      const hasAngles = anglesDeg.length > 0;
      const epsilon = 0.5; // degrees
      const allSameRotation =
        hasAngles && anglesDeg.every(a => {
          const b = anglesDeg[0];
          const diff = Math.abs(a - b);
          return Math.min(diff, 180 - diff) <= epsilon;
        });
      
      if (allSameRotation) {
        // Use the first element's full rotation (0..360) as display rotation
        // Find a representative element to extract absolute angle (skip chairs)
        let displayAngle = 0;
        const repId = selectedElements.find(id => {
          const t = current.tables?.find(x => x.id === id);
          // Skip chairs when finding representative element
          if (t && t.type === 'chair') return false;
          const tx = current.texts?.find(x => x.id === id);
          const w = current.walls?.find(x => x.id === id);
          return (t && typeof t.rotation === 'number') || (tx && typeof tx.rotation === 'number') || !!w;
        });
        if (repId) {
          const t = current.tables?.find(x => x.id === repId);
          const tx = current.texts?.find(x => x.id === repId);
          const w = current.walls?.find(x => x.id === repId);
          if (t && t.type !== 'chair' && typeof t.rotation === 'number') {
            displayAngle = normalizeAngle(t.rotation || 0);
          } else if (tx && typeof tx.rotation === 'number') {
            displayAngle = normalizeAngle(tx.rotation || 0);
          } else if (w) {
            displayAngle = normalizeAngle(Math.atan2(w.y2 - w.y1, w.x2 - w.x1) * 180 / Math.PI);
          }
        }
        
        const theta = displayAngle * Math.PI / 180;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
        
        // Project all points onto the local axes (u aligned with theta, v perpendicular)
        let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
        for (const p of allCorners) {
          const u = p.x * cos + p.y * sin;
          const v = -p.x * sin + p.y * cos;
          if (u < minU) minU = u;
          if (u > maxU) maxU = u;
          if (v < minV) minV = v;
          if (v > maxV) maxV = v;
        }
        const width = Math.max(0, maxU - minU);
        const height = Math.max(0, maxV - minV);
        const centerU = (minU + maxU) / 2;
        const centerV = (minV + maxV) / 2;
        // Transform center back to world coordinates
        const centerX = centerU * cos - centerV * sin;
        const centerY = centerU * sin + centerV * cos;
        
        return {
          x: centerX - width / 2,
          y: centerY - height / 2,
          width,
          height,
          centerX,
          centerY,
          rotation: displayAngle
        };
      }
      
      const minX = Math.min(...allCorners.map(c => c.x));
      const maxX = Math.max(...allCorners.map(c => c.x));
      const minY = Math.min(...allCorners.map(c => c.y));
      const maxY = Math.max(...allCorners.map(c => c.y));
      
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
        rotation: 0
      };
    }
    
    return null;
  };

  // Render universal selection handles (for both single and group selection)
  const renderSelectionHandles = () => {
    if (!isEditing || selectedTool !== 'select' || selectedElements.length === 0) return null;
    
    // Don't show selection handles when editing text or table name
    if (editingTextId || editingTableId) return null;
    
    // Always recalculate group bounds to ensure they track current positions
    const groupBounds = getGroupBoundingBox();
    if (!groupBounds) return null;
    
    const isSingleSelection = selectedElements.length === 1;
    const handleSize = 8;
    const rotationHandleSize = 6; // Smaller rotation handle
    const padding = 2; // Minimal padding to keep grips visible
    const rotation = groupBounds.rotation || 0;
    
    // Check if the single selected element is text
    const isTextOnlySelection = isSingleSelection && (() => {
      const elementId = selectedElements[0];
      const currentLayout = interactionLayout || layout;
      return currentLayout.texts?.find(t => t.id === elementId);
    })();
    
    // Hide side handles for circular tables to prevent width/height-only resizing
    const isCircleOnlySelection = isSingleSelection && (() => {
      const elementId = selectedElements[0];
      const currentLayout = interactionLayout || layout;
      const element = currentLayout.tables?.find(t => t.id === elementId);
      return Boolean(element && element.type === 'circle');
    })();
    
    // Treat selection as "circular table with chairs" when the single non-chair element is a circle and others are its chairs.
    const isLockedCircleSelection = (() => {
      const currentLayout = interactionLayout || layout;
      const selectedTables = (currentLayout.tables || []).filter(t => selectedElements.includes(t.id));
      const nonChairs = selectedTables.filter(t => t && t.type !== 'chair');
      if (nonChairs.length !== 1) return false;
      const parent = nonChairs[0];
      if (!(parent && parent.type === 'circle')) return false;
      // Optional: ensure other selected elements (if any) are chairs attached to this parent
      const others = selectedTables.filter(t => t.id !== parent.id);
      return others.every(t => t.type === 'chair' && (t as any).attachedToTableId === parent.id);
    })();
    
    // Chairs now support normal resize handles like other objects
    
    // Expand bounds with padding
    const boundedBox = {
      x: groupBounds.x - padding,
      y: groupBounds.y - padding,
      width: groupBounds.width + padding * 2,
      height: groupBounds.height + padding * 2,
      centerX: groupBounds.centerX,
      centerY: groupBounds.centerY
    };
    return (
      <>
        {/* Selection outline */}
        <div
          className="absolute border-2 border-blue-400/60 bg-blue-400/10 rounded-sm pointer-events-none"
          style={{
            left: `${boundedBox.centerX}px`,
            top: `${boundedBox.centerY}px`,
            width: `${boundedBox.width}px`,
            height: `${boundedBox.height}px`,
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
            transformOrigin: 'center',
            zIndex: 600
          }}
        />
        
        {/* Corner areas: always render rotation trigger; hide actual grips only for text */}
        {(!isTextOnlySelection) && ['tl', 'tr', 'bl', 'br'].map((handle) => {
          // Calculate handle position relative to center
          let relX, relY;
          switch (handle) {
            case 'tl': relX = -boundedBox.width/2; relY = -boundedBox.height/2; break;
            case 'tr': relX = boundedBox.width/2; relY = -boundedBox.height/2; break;
            case 'bl': relX = -boundedBox.width/2; relY = boundedBox.height/2; break;
            case 'br': relX = boundedBox.width/2; relY = boundedBox.height/2; break;
            default: relX = 0; relY = 0;
          }
          
          // Apply rotation to handle position
          const rad = rotation * Math.PI / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const rotatedX = relX * cos - relY * sin;
          const rotatedY = relX * sin + relY * cos;
          
          const x = boundedBox.centerX + rotatedX - handleSize/2;
          const y = boundedBox.centerY + rotatedY - handleSize/2;
          
          // Check if cursor should be rotation cursor
          const isRotationArea = hoveredHandle === `rotation-outside-${handle}`;
          
          // Calculate rotation trigger area position based on grip's visual position after rotation
          const triggerDistance = 20;
          const triggerSize = rotationHandleSize + 20;
          
          // Calculate direction away from center for rotation trigger
          const centerToGripX = rotatedX;
          const centerToGripY = rotatedY;
          const distance = Math.sqrt(centerToGripX * centerToGripX + centerToGripY * centerToGripY);
          
          // Normalize direction and extend outward
          const dirX = centerToGripX / distance;
          const dirY = centerToGripY / distance;
          
          const triggerX = x + dirX * triggerDistance - triggerSize / 2 + handleSize / 2;
          const triggerY = y + dirY * triggerDistance - triggerSize / 2 + handleSize / 2;
          
          // Cursor for corner handles:
          // - If selection rotation is near 45°(+k*90°), corners visually become top/right/bottom/left (diamond).
          //   In that case use cardinal cursors (n/e/s/w) based on corner's angle.
          // - Otherwise, use nearest diagonal cursor (↘/↙/↖/↗).
          const cornerAngle = (Math.atan2(rotatedY, rotatedX) * 180 / Math.PI + 360) % 360;
          const rotNorm = ((rotation % 360) + 360) % 360;
          const nearestDiff = (a: number, b: number) => {
            let d = Math.abs(a - b);
            return d > 180 ? 360 - d : d;
          };
          const diamondAngles = [45, 135, 225, 315];
          const DIAMOND_THRESH = 10; // degrees tolerance for "near 45°"
          const isDiamond = diamondAngles.some(a => nearestDiff(rotNorm, a) <= DIAMOND_THRESH);
          
          let cursor = 'nwse-resize';
          if (isDiamond) {
            // Map to nearest cardinal for diamond orientation
            const cardinals = [
              { angle: 0,   cursor: 'e-resize' },
              { angle: 90,  cursor: 's-resize' },
              { angle: 180, cursor: 'w-resize' },
              { angle: 270, cursor: 'n-resize' },
              { angle: 360, cursor: 'e-resize' }
            ];
            let min = Infinity;
            for (const c of cardinals) {
              const diff = nearestDiff(cornerAngle, c.angle);
              if (diff < min) { min = diff; cursor = c.cursor; }
            }
          } else {
            const diagonals = [
              { angle: 45,  cursor: 'nwse-resize' },
              { angle: 135, cursor: 'nesw-resize' },
              { angle: 225, cursor: 'nwse-resize' },
              { angle: 315, cursor: 'nesw-resize' }
            ];
            let min = Infinity;
            for (const d of diagonals) {
              const diff = nearestDiff(cornerAngle, d.angle);
              if (diff < min) { min = diff; cursor = d.cursor; }
            }
          }
          let cursorClass = '';
          if (isRotationArea) {
            cursorClass = 'cursor-rotate';
            cursor = 'grab'; // fallback
          }
          
          return (
            <div key={`selection-corner-wrapper-${handle}`}>
              {/* Invisible rotation trigger area positioned outward from grip */}
              <div
                className="absolute cursor-rotate"
                style={{
                  left: `${triggerX}px`,
                  top: `${triggerY}px`,
                  width: `${triggerSize}px`,
                  height: `${triggerSize}px`,
                  pointerEvents: 'auto',
                  zIndex: 630
                }}
                onMouseEnter={() => setHoveredHandle(`rotation-outside-${handle}`)}
                onMouseLeave={() => setHoveredHandle(null)}
                onMouseDown={(e) => {
                  if (isSingleSelection) {
                    handleRotationStart(e, selectedElements[0]);
                  } else {
                    handleGroupRotationStart(e);
                  }
                }}
              />
              
              {/* Main handle (hidden for text selections) */}
              {!isTextOnlySelection && (
                <div
                  key={`selection-corner-${handle}`}
                  className={`absolute bg-blue-400 border border-white hover:bg-blue-300 transition-colors ${cursorClass}`}
                  data-handle={handle}
                  style={{
                    left: `${x}px`,
                    top: `${y}px`,
                    width: `${handleSize}px`,
                    height: `${handleSize}px`,
                    borderRadius: '2px',
                    cursor: cursorClass ? undefined : cursor,
                    pointerEvents: 'auto',
                  zIndex: 620
                  }}
                  onMouseDown={(e) => {
                    if (isRotationArea) {
                      if (isSingleSelection) {
                        handleRotationStart(e, selectedElements[0]);
                      } else {
                        handleGroupRotationStart(e);
                      }
                    } else {
                      if (isSingleSelection) {
                        const elementId = selectedElements[0];
                        const currentLayout = interactionLayout || layout;
                        const element = currentLayout.tables?.find(t => t.id === elementId);
                        if (element) {
                          handleTableResizeStart(e, elementId, handle as 'tl' | 'tr' | 'bl' | 'br');
                        }
                        // For walls, use dedicated wall scale
                        const wall = currentLayout.walls?.find(w => w.id === elementId);
                        if (wall) {
                          handleWallScaleStart(e, elementId, handle as 'tl' | 'tr' | 'bl' | 'br');
                        }
                        // Texts don't support scaling - skip
                      } else {
                        const parentId = getParentIdIfSelectionIsParentWithOwnChairs();
                        if (parentId) {
                          handleTableResizeStart(e, parentId, handle as 'tl' | 'tr' | 'bl' | 'br');
                        } else {
                          handleGroupScaleStart(e, handle as 'tl' | 'tr' | 'bl' | 'br');
                        }
                      }
                    }
                  }}
                  onMouseEnter={() => setHoveredHandle(handle)}
                  onMouseMove={() => setHoveredHandle(handle)}
                  onMouseLeave={() => setHoveredHandle(null)}
                />
              )}
            </div>
          );
        })}
        
        {/* Scale handles - sides (not shown for text elements or circular tables or locked circle selections) */}
        {(!isTextOnlySelection && !isCircleOnlySelection && !isLockedCircleSelection) && ['t', 'r', 'b', 'l'].map((handle) => {
          // Calculate handle position relative to center
          let relX, relY;
          let baseCursor;
          switch (handle) {
            case 't': 
              relX = 0; 
              relY = -boundedBox.height/2; 
              baseCursor = 'n-resize';
              break;
            case 'r': 
              relX = boundedBox.width/2; 
              relY = 0; 
              baseCursor = 'e-resize';
              break;
            case 'b': 
              relX = 0; 
              relY = boundedBox.height/2; 
              baseCursor = 's-resize';
              break;
            case 'l': 
              relX = -boundedBox.width/2; 
              relY = 0; 
              baseCursor = 'w-resize';
              break;
            default: relX = 0; relY = 0; baseCursor = 'default';
          }
          
          // Apply rotation to handle position
          const rad = rotation * Math.PI / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const rotatedX = relX * cos - relY * sin;
          const rotatedY = relX * sin + relY * cos;
          
          const x = boundedBox.centerX + rotatedX - handleSize/2;
          const y = boundedBox.centerY + rotatedY - handleSize/2;
          
          // Calculate rotated cursor for side handles
          let cursor = baseCursor;
          if (rotation !== 0) {
            // Calculate cursor based on actual visual position after rotation
            const rad = rotation * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            
            // Get the rotated position vector
            const rotatedX = relX * cos - relY * sin;
            const rotatedY = relX * sin + relY * cos;
            
            // Determine cursor based on actual visual position
            const angle = Math.atan2(rotatedY, rotatedX) * 180 / Math.PI;
            const normalizedAngle = angle < 0 ? angle + 360 : angle;
            
            // Find the closest cursor direction for smooth rotation
            // Available cursor directions and their angles
            const cursorDirections = [
              { angle: 0, cursor: 'e-resize' },      // Right
              { angle: 45, cursor: 'se-resize' },    // Down-Right
              { angle: 90, cursor: 's-resize' },     // Down
              { angle: 135, cursor: 'sw-resize' },   // Down-Left
              { angle: 180, cursor: 'w-resize' },    // Left
              { angle: 225, cursor: 'nw-resize' },   // Up-Left
              { angle: 270, cursor: 'n-resize' },    // Up
              { angle: 315, cursor: 'ne-resize' },   // Up-Right
              { angle: 360, cursor: 'e-resize' }     // Right (wrap around)
            ];
            
            // Find the closest cursor direction
            let minDiff = Infinity;
            let closestCursor = 'e-resize';
            
            for (const direction of cursorDirections) {
              let diff = Math.abs(normalizedAngle - direction.angle);
              // Handle wrap-around (e.g., 350° is close to 0°)
              if (diff > 180) {
                diff = 360 - diff;
              }
              
              if (diff < minDiff) {
                minDiff = diff;
                closestCursor = direction.cursor;
              }
            }
            
            cursor = closestCursor;
          }
          
          return (
            <div
              key={`selection-side-${handle}`}
              className="absolute bg-blue-400 border border-white hover:bg-blue-300 transition-colors"
              data-handle={handle}
                          style={{
              left: `${x}px`,
              top: `${y}px`,
              width: `${handleSize}px`,
              height: `${handleSize}px`,
              borderRadius: '2px',
              cursor,
              pointerEvents: 'auto',
              zIndex: 620
            }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (isSingleSelection) {
                  const elementId = selectedElements[0];
                  const currentLayout = interactionLayout || layout;
                  const element = currentLayout.tables?.find(t => t.id === elementId);
                  if (element) {
                    handleTableResizeStart(e, elementId, handle as 't' | 'r' | 'b' | 'l');
                  }
                  // For walls, use dedicated wall scale
                  const wall = currentLayout.walls?.find(w => w.id === elementId);
                  if (wall) {
                    handleWallScaleStart(e, elementId, handle as 't' | 'r' | 'b' | 'l');
                  }
                  // Texts don't support scaling - skip
                                  } else {
                    const parentId = getParentIdIfSelectionIsParentWithOwnChairs();
                    if (parentId) {
                      handleTableResizeStart(e, parentId, handle as 't' | 'r' | 'b' | 'l');
                    } else {
                      handleGroupScaleStart(e, handle as 't' | 'r' | 'b' | 'l');
                    }
                  }
              }}
            />
          );
        })}
        
        {/* Rotation handle (when not currently rotating) */}
        {!isRotating && !isGroupRotating && (() => {
          // Calculate grip position in local coordinate system of the group
          const localGripX = 0; // centered horizontally
          const localGripY = -boundedBox.height/2 - 30; // 30px above the bounding box
          
          // Apply group rotation to get global position
          const rad = rotation * Math.PI / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          
          // Transform local grip position to global coordinates
          const globalGripX = boundedBox.centerX + (localGripX * cos - localGripY * sin);
          const globalGripY = boundedBox.centerY + (localGripX * sin + localGripY * cos);
          
          // Calculate line start position (connection point to bounding box)
          const localLineStartX = 0;
          const localLineStartY = -boundedBox.height/2;
          const globalLineStartX = boundedBox.centerX + (localLineStartX * cos - localLineStartY * sin);
          const globalLineStartY = boundedBox.centerY + (localLineStartX * sin + localLineStartY * cos);
          
          return (
          <>
            {/* Rotation handle circle */}
            <div
              className="absolute bg-green-400 border border-white rounded-full cursor-rotate hover:bg-green-300 transition-colors"
              style={{
                  left: `${globalGripX - rotationHandleSize/2}px`,
                  top: `${globalGripY - rotationHandleSize/2}px`,
                width: `${rotationHandleSize}px`,
                height: `${rotationHandleSize}px`,
                pointerEvents: 'auto',
                zIndex: 15
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (isSingleSelection) {
                  handleRotationStart(e, selectedElements[0]);
                } else {
                  handleGroupRotationStart(e);
                }
              }}
              title={t('rotate')}
            />
            
              {/* Rotation line using SVG for precise positioning */}
              <svg
                className="absolute pointer-events-none"
              style={{
                  left: '0px',
                  top: '0px',
                  width: '100%',
                  height: '100%',
                  zIndex: 610
                }}
              >
                <line
                  x1={globalLineStartX}
                  y1={globalLineStartY}
                  x2={globalGripX}
                  y2={globalGripY}
                  stroke="rgb(74, 222, 128)"
                  strokeWidth="1"
                  strokeOpacity="0.6"
                  strokeDasharray="3,3"
                />
              </svg>
          </>
          );
        })()}
        
        {/* Rotation angle display */}
        {(isRotating || isGroupRotating) && (
          <div
            className="absolute pointer-events-none bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap"
            style={{
              left: `${boundedBox.centerX}px`,
              top: `${boundedBox.centerY - boundedBox.height/2 - 60}px`,
              transform: 'translateX(-50%)',
              zIndex: 700
            }}
          >
            {Math.round(currentRotationAngle)}°
          </div>
        )}
      </>
    );
  };

  const selectedElementData = () => {
    if (selectedElements.length !== 1) return null;
    const id = selectedElements[0];
    const currentLayout = interactionLayout || layout;
    
    const table = currentLayout.tables?.find(t => t.id === id);
    if (table) return { ...table, elementType: 'table' };

    const wall = currentLayout.walls?.find(w => w.id === id);
    if (wall) return { ...wall, elementType: 'wall' };

    const text = currentLayout.texts?.find(t => t.id === id);
    if (text) return { ...text, elementType: 'text' };
    
    return null;
  }

  // Extract selected element data for the toolbar
  const selectedElement = selectedElementData();
  const isTextSelected = selectedElement && selectedElement.elementType === 'text';

  // Handle click outside to deselect - MOVED BEFORE EARLY RETURN
  useEffect(() => {
    if (!isEditing) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      // Don't deselect if we're in the middle of an operation
      if (isDragging || isResizingTable || isResizingWall || isRotating || isMarqueeSelecting || isDrawing || isGroupScaling || isGroupRotating) {
        return;
      }
      
      // Don't deselect if we just completed marquee selection
      if (justCompletedMarquee) {
        return;
      }
      
      // Don't deselect if clicking on a tool button or other UI elements
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('.canvas-text-editor') || target.closest('input') || target.closest('[role="toolbar"]')) {
        return;
      }
      
      // Only deselect if clicking on empty canvas area
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect && e.clientX >= rect.left && e.clientX <= rect.right && 
          e.clientY >= rect.top && e.clientY <= rect.bottom) {
        const { x: localX, y: localY } = getZoomAdjustedCoordinates(e.clientX, e.clientY, rect);
        const x = localX - canvasOffset.x;
        const y = localY - canvasOffset.y;
        const elementAtPosition = getElementAtPosition(x, y);
        if (!elementAtPosition) {
          setSelectedElements([]);
        }
      }
    };

    window.addEventListener('click', handleClickOutside);
    return () => {
      window.removeEventListener('click', handleClickOutside);
    };
  }, [isEditing, isDragging, isResizingTable, isResizingWall, isRotating, isMarqueeSelecting, isDrawing, isGroupScaling, isGroupRotating, justCompletedMarquee]);

  // Open reservation form from external trigger with optional prefill
  useEffect(() => {
    const handler = () => {
      try {
        const raw = localStorage.getItem('respoint_reservation_prefill');
        const payload = raw ? JSON.parse(raw) : null;
        if (payload) {
          const prefill: any = {
            guestName: payload.guestName || '',
            date: new Date().toISOString().slice(0,10),
            time: `${new Date().getHours().toString().padStart(2,'0')}:00`,
            numberOfGuests: 2,
            zoneId: undefined,
            tableIds: [],
            tableNumbers: Array.isArray(payload.tableNumbers) ? payload.tableNumbers : [],
            phone: payload.phone || '',
            email: payload.email || '',
            notes: '',
            color: '#8B5CF6',
            status: 'waiting'
          };
          setShowForm(true);
          setTimeout(() => {
            try { (window as any).dispatchEvent(new CustomEvent('prefill-reservation', { detail: prefill })); } catch {}
          }, 0);
        } else {
          setShowForm(true);
        }
      } catch {
        setShowForm(true);
      }
    };
    window.addEventListener('respoint-open-reservation', handler as any);
    return () => window.removeEventListener('respoint-open-reservation', handler as any);
  }, []);

  // Reservation form will be rendered as an overlay later (keep canvas visible beneath)

  // Helper function to normalize angles to 0-360 degrees (counterclockwise from center)
  const normalizeAngle = (angle: number): number => {
    let normalized = angle % 360;
    if (normalized < 0) {
      normalized += 360;
    }
    return normalized;
  };

  // Helper function to calculate angle between two points (returns 0-360)
  const calculateAngle = (centerX: number, centerY: number, pointX: number, pointY: number): number => {
    // Math.atan2 returns -π to π, convert to 0-360 degrees
    let angle = Math.atan2(pointY - centerY, pointX - centerX) * 180 / Math.PI;
    return normalizeAngle(angle);
  };

  // Helper function to calculate the shortest angular difference
  const getAngleDifference = (currentAngle: number, startAngle: number): number => {
    let delta = currentAngle - startAngle;
    
    // Handle wrap-around cases
    if (delta > 180) {
      delta -= 360;
    } else if (delta < -180) {
      delta += 360;
    }
    
    return delta;
  };
  return (
            <div className="flex-1 bg-[#0A1929] relative">
      {/* Top Toolbar */}
      {isAuthenticated && (
        <div
          className={
            `absolute top-0 left-0 right-0 z-20 px-4 py-1 border-b overflow-x-auto whitespace-nowrap scrollbar-hide h-10 ` +
            (isLight
              ? 'bg-white border-gray-200'
              : 'bg-[#000814] border-[#1E2A34]')
          }
        >
          <div className="flex items-center justify-between gap-2 min-w-max h-full">
            {/* Left side - Edit controls and tools */}
            <div className="flex items-center gap-3">
              {/* Edit/Save controls */}
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <button
                    onClick={toggleEditMode}
                    className={
                      `px-4 py-0.5 text-sm transition-colors rounded ` +
                      (isLight
                        ? 'text-gray-800 hover:bg-gray-100'
                        : 'text-white hover:bg-white/10')
                    }
                  >
                    {t('edit')}
                  </button>
                ) : (
                  <>
                    {currentLayoutId && (
                      <button
                        onClick={async () => {
                          if (currentLayoutId) {
                            console.log('Updating layout:', currentLayoutId);
                            await updateSavedLayout(currentLayoutId);
                            console.log('Layout updated successfully');
                            setIsEditing(false);
                            setHoveredTable(null);
                          }
                        }}
                        disabled={!hasChanges}
                        className={`px-4 py-0.5 text-sm transition-colors rounded ${
                          hasChanges
                            ? (isLight ? 'text-gray-800 hover:bg-gray-100' : 'text-white hover:bg-white/10')
                            : 'text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {t('updateLayout')}
                      </button>
                    )}
                    <button
                      onClick={() => setShowSaveLayoutModal(true)}
                      className={
                        `px-4 py-0.5 text-sm transition-colors rounded ` +
                        (isLight ? 'text-gray-800 hover:bg-gray-100' : 'text-white hover:bg-white/10')
                      }
                    >
                      {t('saveLayoutAs')}
                    </button>
                    <button
                      onClick={handleCancel}
                      className={
                        `px-4 py-0.5 text-sm transition-colors rounded ` +
                        (isLight ? 'text-gray-800 hover:bg-gray-100' : 'text-white hover:bg-white/10')
                      }
                    >
                      {t('cancel')}
                    </button>
                  </>
                )}
              </div>

              {/* Tools - visible when editing */}
              {isEditing && (
                <>
                  <div className={isLight ? 'w-px h-6 bg-gray-200' : 'w-px h-6 bg-[#1E2A34]'} />
                  
                  <div className="flex items-center gap-1">
                    {/* Move Tool */}
                    <button
                      onClick={() => onToolChange('select')}
                      className={
                        `p-1.5 rounded-md transition-all ` +
                        (isLight
                          ? `${selectedTool === 'select' ? 'bg-gray-200' : ''} hover:bg-gray-100 text-gray-700`
                          : `${selectedTool === 'select' ? 'bg-white/20' : ''} hover:bg-white/10 text-white`)
                      }
                      title={t('moveToolTooltip')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isLight ? '#374151' : 'white'} strokeWidth="2">
                        <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
                      </svg>
                    </button>

                    {/* Square Table */}
                    <button
                      onClick={() => {
                        onToolChange('table');
                        onAddTable('rectangle');
                      }}
                      className={
                        `p-1.5 rounded-md transition-all ` +
                        (isLight
                          ? `${selectedTool === 'table' && tableType === 'rectangle' ? 'bg-gray-200' : ''} hover:bg-gray-100 text-gray-700`
                          : `${selectedTool === 'table' && tableType === 'rectangle' ? 'bg-white/20' : ''} hover:bg-white/10 text-white`)
                      }
                      title={t('squareTableTooltip')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isLight ? '#374151' : 'white'} strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                      </svg>
                    </button>

                    {/* Round Table */}
                    <button
                      onClick={() => {
                        onToolChange('table');
                        onAddTable('circle');
                      }}
                      className={
                        `p-1.5 rounded-md transition-all ` +
                        (isLight
                          ? `${selectedTool === 'table' && tableType === 'circle' ? 'bg-gray-200' : ''} hover:bg-gray-100 text-gray-700`
                          : `${selectedTool === 'table' && tableType === 'circle' ? 'bg-white/20' : ''} hover:bg-white/10 text-white`)
                      }
                      title={t('roundTableTooltip')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isLight ? '#374151' : 'white'} strokeWidth="2">
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                    </button>

                    {/* Wall Tool */}
                    <button
                      onClick={() => onToolChange('wall')}
                      className={
                        `p-1.5 rounded-md transition-all ` +
                        (isLight
                          ? `${selectedTool === 'wall' ? 'bg-gray-200' : ''} hover:bg-gray-100 text-gray-700`
                          : `${selectedTool === 'wall' ? 'bg-white/20' : ''} hover:bg-white/10 text-white`)
                      }
                      title={t('wallToolTooltip')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isLight ? '#374151' : 'white'} strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>

                    {/* Text Tool */}
                    <button
                      onClick={() => onToolChange('text')}
                      className={
                        `p-1.5 rounded-md transition-all ` +
                        (isLight
                          ? `${selectedTool === 'text' ? 'bg-gray-200' : ''} hover:bg-gray-100 text-gray-700`
                          : `${selectedTool === 'text' ? 'bg-white/20' : ''} hover:bg-white/10 text-white`)
                      }
                      title={t('textToolTooltip')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isLight ? '#374151' : 'white'} strokeWidth="2">
                        <path d="M4 7V4h16v3M9 20h6M12 4v16" />
                      </svg>
                    </button>

                    {/* Chair Tool disabled to keep chairs consistent with Add Seats */}

                    {/* Chair size controls when a single chair is selected */}
                    {(() => {
                      if (!isEditing) return null;
                      if (selectedElements.length !== 1) return null;
                      const currentLayout = interactionLayout || layout;
                      const chair = currentLayout.tables?.find(t => t.id === selectedElements[0] && t.type === 'chair');
                      if (!chair) return null;
                      return (
                        <div className="flex items-center gap-1 ml-1">
                          <button
                            onClick={() => {
                              const currentW = chair.width || GRID_SIZE * 4;
                              const currentH = chair.height || GRID_SIZE * 1;
                              const newW = Math.max(GRID_SIZE, snapToGrid(currentW - GRID_SIZE));
                              const newH = Math.max(GRID_SIZE, snapToGrid(currentH - GRID_SIZE));
                              updateTable(chair.id, { width: newW, height: newH });
                            }}
                            className={document.documentElement.getAttribute('data-theme') === 'light' ? 'p-1 rounded hover:bg-gray-100' : 'p-1 rounded hover:bg-white/10'}
                            title={t('decreaseFontSize')}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={document.documentElement.getAttribute('data-theme') === 'light' ? '#374151' : 'white'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                          </button>
                          <button
                            onClick={() => {
                              const currentW = chair.width || GRID_SIZE * 4;
                              const currentH = chair.height || GRID_SIZE * 1;
                              const newW = snapToGrid(currentW + GRID_SIZE);
                              const newH = snapToGrid(currentH + GRID_SIZE);
                              updateTable(chair.id, { width: newW, height: newH });
                            }}
                            className={document.documentElement.getAttribute('data-theme') === 'light' ? 'p-1 rounded hover:bg-gray-100' : 'p-1 rounded hover:bg-white/10'}
                            title={t('increaseFontSize')}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={document.documentElement.getAttribute('data-theme') === 'light' ? '#374151' : 'white'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                          </button>
                        </div>
                      );
                    })()}

                    <div className={document.documentElement.getAttribute('data-theme') === 'light' ? 'w-px h-6 bg-gray-200' : 'w-px h-6 bg-[#1E2A34]'} />

                    {/* Undo */}
                    <button
                      onClick={undo}
                      disabled={!canUndo}
                      className={
                        `p-1.5 rounded-md transition-all  ` +
                        (canUndo
                          ? (document.documentElement.getAttribute('data-theme') === 'light' ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-white')
                          : 'text-gray-400 cursor-not-allowed')
                      }
                      title={t('undo')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={document.documentElement.getAttribute('data-theme') === 'light' ? '#374151' : 'currentColor'} strokeWidth="2">
                        <path d="M9 14l-5-5 5-5"/>
                        <path d="M4 9h11.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/>
                      </svg>
                    </button>

                    {/* Redo */}
                    <button
                      onClick={redo}
                      disabled={!canRedo}
                      className={
                        `p-1.5 rounded-md transition-all ` +
                        (canRedo
                          ? (document.documentElement.getAttribute('data-theme') === 'light' ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-white')
                          : 'text-gray-400 cursor-not-allowed')
                      }
                      title={t('redo')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={document.documentElement.getAttribute('data-theme') === 'light' ? '#374151' : 'currentColor'} strokeWidth="2">
                        <path d="M15 14l5-5-5-5"/>
                        <path d="M20 9H8.5A5.5 5.5 0 0 0 3 14.5v0A5.5 5.5 0 0 0 8.5 20H13"/>
                      </svg>
                    </button>

                    <div className={document.documentElement.getAttribute('data-theme') === 'light' ? 'w-px h-6 bg-gray-200' : 'w-px h-6 bg-[#1E2A34]'} />

                    {/* Delete Tool */}
                    <button
                      onClick={() => onToolChange('delete')}
                      className={
                        `p-1.5 rounded-md transition-all ` +
                        (isLight
                          ? `${selectedTool === 'delete' ? 'bg-red-100' : ''} hover:bg-gray-100 text-gray-700`
                          : `${selectedTool === 'delete' ? 'bg-red-500/20' : ''} hover:bg-white/10 text-white`)
                      }
                      title={t('deleteToolTooltip')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isLight ? '#374151' : 'white'} strokeWidth="2">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6" />
                      </svg>
                    </button>

                    {/* Reset All */}
                    <button
                      onClick={() => {
                        resetLayout();
                      }}
                      className={
                        `p-1.5 rounded-md transition-all ` +
                        (isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-white')
                      }
                      title={t('resetAllTooltip')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isLight ? '#374151' : 'white'} strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8M21 3v5h-5" />
                      </svg>
                    </button>

                    {/* Numbering policy switch moved inside canvas (overlay). */}

                    {/* Font Size Control - visible when text is selected */}
                    {isTextSelected && (
                      <>
                        <div className="w-px h-6 bg-[#1E2A34]" />
                        <div className="flex items-center gap-1">
                          <span className={isLight ? 'text-gray-700 text-sm mr-1' : 'text-white text-sm mr-1'}>{t('fontLabel')}</span>
                          <input
                            type="number"
                            value={(selectedElement as any).fontSize || 16}
                            onChange={(e) => {
                              const newSize = parseInt(e.target.value, 10);
                              if (!isNaN(newSize) && newSize > 0) {
                                updateText(selectedElement.id, { fontSize: newSize });
                              }
                            }}
                            className={
                              isLight
                                ? 'w-12 text-sm bg-white text-gray-900 text-center rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 hide-number-arrows'
                                : 'w-12 text-sm bg-gray-900 text-white text-center rounded border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 hide-number-arrows'
                            }
                            min="1"
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={() => {
                              const currentSize = (selectedElement as any).fontSize || 16;
                              const newSize = Math.max(1, currentSize - 1);
                              updateText(selectedElement.id, { fontSize: newSize });
                            }}
                            className={isLight ? 'p-0.5 rounded hover:bg-gray-100' : 'p-0.5 rounded hover:bg-white/20'}
                            onMouseDown={(e) => e.stopPropagation()}
                            title={t('decreaseFontSize')}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isLight ? '#374151' : 'white'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                          </button>
                          <button
                            onClick={() => {
                              const currentSize = (selectedElement as any).fontSize || 16;
                              const newSize = currentSize + 1;
                              updateText(selectedElement.id, { fontSize: newSize });
                            }}
                            className={isLight ? 'p-0.5 rounded hover:bg-gray-100' : 'p-0.5 rounded hover:bg-white/20'}
                            onMouseDown={(e) => e.stopPropagation()}
                            title={t('increaseFontSize')}
                          >
                            <svg width="14" height="18" viewBox="0 0 24 24" fill="none" stroke={isLight ? '#374151' : 'white'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Right side - Layouts button */}
            <button
                onClick={() => setShowLayoutList(!showLayoutList)}
                className={
                  `px-4 py-0.5 text-sm transition-colors rounded ` +
                  (isLight ? 'text-gray-800 hover:bg-gray-100' : 'text-white hover:bg-white/10')
                }
                title={t('savedLayouts')}
              >
                {t('layouts')}
              </button>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="w-full h-full relative overflow-hidden pt-10 pb-20"
        style={{
          cursor: selectedTool === 'select' ? (isDragging ? 'move' : isShiftPressed && isEditing ? 'copy' : 'default') : (selectedTool === 'text' ? 'crosshair' : 'crosshair'),
          backgroundImage: isEditing
            ? `linear-gradient(${isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255,255,255,0.06)'} 1px, transparent 1px),
               linear-gradient(90deg, ${isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255,255,255,0.06)'} 1px, transparent 1px)`
            : undefined,
          backgroundSize: isEditing ? `${GRID_SIZE}px ${GRID_SIZE}px` : undefined,
          backgroundPosition: isEditing ? `${canvasOffset.x}px ${canvasOffset.y}px` : undefined,
          touchAction: 'none',
        }}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        onDragOver={(e) => {
          const types = e.dataTransfer?.types || [];
          if (types.includes('application/x-respoint-waiter') || types.includes('text/waiter') || types.includes('text/plain')) {
            setIsWaiterDragActive(true);
            setHoveredTable(null);
          }
        }}
        onDrop={() => {
          setIsWaiterDragActive(false);
        }}
        onDragLeave={() => {
          setIsWaiterDragActive(false);
        }}
      >
        {/* Overlay: Numbers Auto Shift toggle inside canvas, top-left, faint until hover */}
        {isEditing && (
          <div
            className="absolute left-2 top-12 z-[160] opacity-40 hover:opacity-100 transition-opacity select-none"
            style={{ background: 'transparent' }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const isSR = (currentLanguage === 'srb') || (typeof currentLanguage === 'string' && (currentLanguage as any).startsWith?.('sr'));
              return (
                <div className="flex items-center gap-3">
                  {/* Auto Shift Numbers */}
                  <div className="flex items-center gap-2">
                    <span className={isLight ? 'text-gray-700 text-xs' : 'text-gray-200 text-xs'}>
                      {isSR ? 'Auto Pomeranje Brojeva' : 'Auto Shift Numbers'}
                    </span>
                    <button
                      onClick={() => setNumberingPolicy(prev => prev === 'autoShift' ? 'allowDuplicates' : 'autoShift')}
                      className={
                        `relative inline-flex h-4 w-8 items-center rounded-full transition-colors ` +
                        (numberingPolicy === 'autoShift'
                          ? (isLight ? 'bg-blue-600' : 'bg-blue-500')
                          : (isLight ? 'bg-gray-300' : 'bg-gray-600'))
                      }
                      title={isSR ? 'Uključi/isključi automatski pomeraj' : 'Toggle auto shift'}
                    >
                      <span
                        className={
                          `inline-block h-3 w-3 transform rounded-full bg-white transition-transform ` +
                          (numberingPolicy === 'autoShift' ? 'translate-x-4' : 'translate-x-1')
                        }
                      />
                    </button>
                  </div>
                  {/* Divider */}
                  <div className={isLight ? 'w-px h-4 bg-gray-300/70' : 'w-px h-4 bg-white/20'} />
                  {/* Standard size preview toggle */}
                  <div className="flex items-center gap-2">
                    <span className={isLight ? 'text-gray-700 text-xs' : 'text-gray-200 text-xs'}>
                      {isSR ? 'Prikaz standardne veličine' : 'Standard size preview'}
                    </span>
                    <button
                      onClick={() => setShowStandardSizePreview(v => !v)}
                      className={
                        `relative inline-flex h-4 w-8 items-center rounded-full transition-colors ` +
                        (showStandardSizePreview
                          ? (isLight ? 'bg-blue-600' : 'bg-blue-500')
                          : (isLight ? 'bg-gray-300' : 'bg-gray-600'))
                      }
                      title={isSR ? 'Uključi/isključi prikaz standardne veličine' : 'Toggle standard size preview'}
                    >
                      <span
                        className={
                          `inline-block h-3 w-3 transform rounded-full bg-white transition-transform ` +
                          (showStandardSizePreview ? 'translate-x-4' : 'translate-x-1')
                        }
                      />
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        {/* Canvas position controls (top-right) */}
        {isEditing && (
          <div
            className="absolute right-2 top-12 z-[160] opacity-40 hover:opacity-100 transition-opacity select-none"
            style={{ background: 'transparent' }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="inline-flex flex-col items-center gap-1 bg-black/40 border border-white/10 rounded-md px-2 py-1">
              <span className="text-[10px] text-gray-200 mb-0.5">
                {currentLanguage === 'srb' ? 'Pozicija šeme' : 'Layout position'}
              </span>
              <button
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-gray-200"
                onClick={() => nudgeCanvas(0, -CANVAS_OFFSET_STEP)}
              >
                ↑
              </button>
              <div className="flex items-center gap-1">
                <button
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-gray-200"
                  onClick={() => nudgeCanvas(-CANVAS_OFFSET_STEP, 0)}
                >
                  ←
                </button>
                <button
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-[10px] text-gray-200"
                  onClick={resetCanvasOffset}
                  title={currentLanguage === 'srb' ? 'Vrati u početni položaj' : 'Reset position'}
                >
                  ●
                </button>
                <button
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-gray-200"
                  onClick={() => nudgeCanvas(CANVAS_OFFSET_STEP, 0)}
                >
                  →
                </button>
              </div>
              <button
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-gray-200"
                onClick={() => nudgeCanvas(0, CANVAS_OFFSET_STEP)}
              >
                ↓
              </button>
            </div>
          </div>
        )}
        {/* Pannable layout content (tables, walls, texts, drawing, marquee, text editing) */}
        <div
          className="absolute inset-0"
          style={{ transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)` }}
        >
        {/* Tables with resize handles */}
        {(interactionLayout || layout).tables?.map(table => renderTableWithHandles(table))}

        {/* Walls - render as SVG for better control */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: '100%', height: '100%', zIndex: 0 }}
        >
          <g style={{ pointerEvents: 'auto' }}>
            {(interactionLayout || layout).walls?.map(wall => renderWall(wall))}
          </g>
        </svg>

        {/* Text elements */}
        {(interactionLayout || layout).texts?.filter(text => !(showTextInput && text.id === editingTextId)).map(text => renderText(text))}

        {/* Drawing preview */}
        {renderDrawingPreview()}

        {/* Marquee selection */}
        {renderMarqueeSelection()}

        {/* Text input */}
        {showTextInput && (
            <div
              className="absolute z-[70]"
                style={{
                left: `${textPosition.x}px`,
                top: `${textPosition.y}px`
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* Action buttons above text editor */}
              <div className="flex items-center justify-center gap-2 mb-2">
                {/* Confirm button */}
                <button
                  onClick={handleTextSubmit}
                  className="w-6 h-6 bg-green-600/80 hover:bg-green-600 border border-green-500/50 rounded-full flex items-center justify-center transition-colors"
                  title={t('confirmTextTooltip')}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20,6 9,17 4,12"></polyline>
                  </svg>
                </button>
                
                {/* Cancel button */}
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsTextInputCancelled(true);
                    setShowTextInput(false);
                    setTextInput('');
                    setEditingTextId(null);
                  }}
                  className="w-6 h-6 bg-red-600/80 hover:bg-red-600 border border-red-500/50 rounded-full flex items-center justify-center transition-colors"
                  title={t('cancelTextTooltip')}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsTextInputCancelled(true);
                    setShowTextInput(false);
                    setTextInput('');
                    setEditingTextId(null);
                  } else if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleTextSubmit();
                  }
                }}
                onBlur={() => {
                  // Add a small delay to allow onMouseDown events to execute first
                  setTimeout(() => {
                    // Don't submit on blur if cancelled
                    if (!isTextInputCancelled) {
                      handleTextSubmit();
                    }
                  }, 10);
                }}
                className="canvas-text-editor"
                placeholder={t('enterTextPlaceholder')}
                autoFocus
              />
            </div>
        )}
        </div>

        {/* Context Menu */}
        {showContextMenu && (
          <div
            ref={contextMenuRef}
            className="absolute z-[10100] rounded-lg shadow-xl py-1 border text-sm"
            style={{
              left: `${contextMenuPosition.x - canvasRef.current!.getBoundingClientRect().left}px`,
              top: `${contextMenuPosition.y - canvasRef.current!.getBoundingClientRect().top}px`,
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            {contextMenuType === 'copy' ? (
              <>
                <button
                  className="px-3 h-8 hover:bg-[var(--chip)] w-full text-left flex items-center gap-2 rounded-md"
                  onClick={() => handleContextMenuAction('copy')}
                >
                  {t('copySelected')}
                  <span className="ml-auto text-[11px] opacity-60">Ctrl+C</span>
                </button>
                <div className="my-1 h-px bg-[var(--border)]" />
                <button
                  className="px-3 h-8 hover:bg-[var(--chip)] w-full text-left flex items-center gap-2 rounded-md"
                  onClick={() => handleContextMenuAction('delete')}
                >
                  {t('delete')}
                  <span className="ml-auto text-[11px] opacity-60">Del</span>
                </button>
              </>
            ) : contextMenuType === 'table' ? (
              <>
                <button
                  className="px-3 h-8 hover:bg-[var(--chip)] w-full text-left flex items-center gap-2 rounded-md"
                  onClick={() => handleContextMenuAction('copy')}
                >
                  {t('copySelected')}
                  <span className="ml-auto text-[11px] opacity-60">Ctrl+C</span>
                </button>
                <div className="my-1 h-px bg-[var(--border)]" />
                <button
                  className="px-3 h-8 hover:bg-[var(--chip)] w-full text-left flex items-center gap-2 rounded-md"
                  onClick={() => handleContextMenuAction('add_seats')}
                >
                  {currentLanguage === 'srb' ? 'Dodaj stolice' : 'Add seats'}
                </button>
                <div className="my-1 h-px bg-[var(--border)]" />
                <button
                  className="px-3 h-8 hover:bg-[var(--chip)] w-full text-left flex items-center gap-2 rounded-md"
                  onClick={() => handleContextMenuAction('delete')}
                >
                  {t('delete')}
                  <span className="ml-auto text-[11px] opacity-60">Del</span>
                </button>
              </>
            ) : contextMenuType === 'chair' ? (
              <>
                <button
                  className="px-3 h-8 hover:bg-[var(--chip)] w-full text-left flex items-center gap-2 rounded-md"
                  onClick={() => handleContextMenuAction('copy')}
                >
                  {t('copySelected')}
                  <span className="ml-auto text-[11px] opacity-60">Ctrl+C</span>
                </button>
                <div className="my-1 h-px bg-[var(--border)]" />
                <div className="px-3 py-1 text-xs opacity-70">Chair style</div>
                <button
                  className="px-3 h-8 hover:bg-[var(--chip)] w-full text-left flex items-center gap-2 rounded-md"
                  onClick={() => handleContextMenuAction('set_chair_variant_standard')}
                >
                  Standard
                </button>
                <button
                  className="px-3 h-8 hover:bg-[var(--chip)] w-full text-left flex items-center gap-2 rounded-md"
                  onClick={() => handleContextMenuAction('set_chair_variant_barstool')}
                >
                  Bar stool
                </button>
                <button
                  className="px-3 h-8 hover:bg-[var(--chip)] w-full text-left flex items-center gap-2 rounded-md"
                  onClick={() => handleContextMenuAction('set_chair_variant_booth_curved')}
                >
                  Semi-circular booth
                </button>
                <button
                  className="px-3 h-8 hover:bg-[var(--chip)] w-full text-left flex items-center gap-2 rounded-md"
                  onClick={() => handleContextMenuAction('set_chair_variant_booth_u')}
                >
                  U booth
                </button>
                <div className="my-1 h-px bg-[var(--border)]" />
                <button
                  className="px-3 h-8 hover:bg-[var(--chip)] w-full text-left flex items-center gap-2 rounded-md"
                  onClick={() => handleContextMenuAction('delete')}
                >
                  {t('delete')}
                  <span className="ml-auto text-[11px] opacity-60">Del</span>
                </button>
              </>
            ) : contextMenuType === 'paste' ? (
              <button
                className="px-3 h-8 hover:bg-[var(--chip)] w-full text-left flex items-center gap-2 rounded-md"
                onClick={() => handleContextMenuAction('paste')}
              >
                {t('pasteSelected')}
                <span className="ml-auto text-[11px] opacity-60">Ctrl+V</span>
              </button>
            ) : null}
          </div>
        )}
        
        {/* Add Seats Modal */}
        {showAddSeatsModal && (() => {
          const currentLayout = interactionLayout || layout;
          const table = currentLayout.tables?.find(t => t.id === addSeatsTableId) || null;
          if (!table || table.type === 'chair') return null;
          return (
            <AddSeatsModal
              isOpen={showAddSeatsModal}
              onClose={() => {
                setShowAddSeatsModal(false);
                setAddSeatsTableId(null);
              }}
              table={table}
              onSave={(guides) => {
                const base = interactionLayout || layout;
                const updated = {
                  ...base,
                  tables: base.tables.map((tb: any) => tb.id === table.id ? { ...tb, chairGuides: { ...(tb.chairGuides || {}), ...guides } } : tb)
                };
                // Auto-generate chairs for this table based on saved guides
                const withChairs = autoGenerateChairsForTable(updated, table.id);
                // Update both working layout and interaction layout (if present) to avoid later overwrites
                setLayout(withChairs);
                if (interactionLayout) {
                  setInteractionLayout(withChairs);
                }
              }}
            />
          );
        })()}

        {/* Pannable overlays tied to layout coordinates (number conflict, hover card, selection, placeholder) */}
        <div
          className="absolute inset-0"
          style={{ transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`, pointerEvents: 'none' }}
        >
        {/* Number conflict popup (quick confirm) */}
        {numberConflict && (() => {
          const currentLayout = interactionLayout || layout;
          const tbl = currentLayout.tables?.find(t => t.id === numberConflict.tableId);
          if (!tbl) return null;
          const anchorX = tbl.x + (tbl.width || 100) / 2;
          const anchorY = tbl.y + (tbl.height || 100) + 8;
          return (
            <div
              className="absolute z-[10100] px-3 py-2 rounded-md shadow-xl border"
              style={{
                left: `${anchorX}px`,
                top: `${anchorY}px`,
                transform: 'translateX(-50%)',
                pointerEvents: 'auto',
                background: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#111827',
                borderColor: document.documentElement.getAttribute('data-theme') === 'light' ? '#E5E7EB' : '#374151',
                color: document.documentElement.getAttribute('data-theme') === 'light' ? '#111827' : '#F9FAFB'
              }}
            >
              <div className="text-sm mb-2">
                Broj {numberConflict.desiredNumber} već postoji. Šta želiš?
              </div>
              <div className="flex gap-2">
                <button
                  className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-500"
                  onClick={() => resolveNumberConflict('duplicate')}
                >
                  Dozvoli duplikat
                </button>
                <button
                  className="px-2 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-500"
                  onClick={() => resolveNumberConflict('shift')}
                >
                  Pomeri ostale
                </button>
                <button
                  className="px-2 py-1 text-xs rounded bg-gray-600 text-white hover:bg-gray-500"
                  onClick={() => resolveNumberConflict('cancel')}
                >
                  Otkaži
                </button>
              </div>
            </div>
          );
        })()}
        
        {/* Reservation Hover Card - only show when not editing */}
        {hoveredTable && !isEditing && !isWaiterDragActive && (
          <div
            className={
              `absolute z-[10200] px-3 py-2 text-xs rounded-lg shadow-xl whitespace-normal break-words select-none border ` +
              (document.documentElement.getAttribute('data-theme') === 'light'
                ? 'bg-white text-gray-900 border-gray-200'
                : 'bg-gray-900 text-white border-gray-700')
            }
            style={{
              left: `${hoveredTable.position.x + 15}px`,
              top: `${hoveredTable.position.y + 15}px`,
              pointerEvents: 'none',
              zIndex: 10200,
              width: 180
            }}
          >
            <div className="font-medium text-accent flex items-center gap-1 flex-wrap">
              {(hoveredTable.reservation as any).__spilloverFromPrevDay ? (
                <span
                  className="inline-flex items-center text-blue-400"
                  title={currentLanguage === 'srb' ? 'Nastavak iz prethodnog dana' : 'Continues from previous day'}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 7h7a4 4 0 0 1 4 4v6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M7 7l4-4M7 7l4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              ) : null}
              {hoveredTable.reservation.guestName}
              {hoveredTable.reservation.isVip ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-500">
                  <path d="M12 2l3 7h7l-5.5 4.2L18 21l-6-3.8L6 21l1.5-7.8L2 9h7z"/>
                </svg>
              ) : null}
              {(hoveredTable.reservation as any).isEventReservation && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] border ${document.documentElement.getAttribute('data-theme') === 'light' ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-purple-500/20 text-purple-300 border-purple-500/30'}`}>
                  Event
                </span>
              )}
            </div>
            <div className={document.documentElement.getAttribute('data-theme') === 'light' ? 'text-gray-700 mt-1' : 'text-gray-300 mt-1'}>
              {((hoveredTable.reservation as any).__spilloverFromPrevDay
                ? ((hoveredTable.reservation as any).__spilloverSourceTime || hoveredTable.reservation.time)
                : hoveredTable.reservation.time)} - {hoveredTable.reservation.numberOfGuests} {t('guests')}
            </div>
            <div className={`text-xs px-2 py-1 rounded mt-1 ${
              hoveredTable.reservation.status === 'waiting' ? (document.documentElement.getAttribute('data-theme') === 'light' ? 'bg-orange-100 text-orange-700' : 'bg-orange-500/20 text-orange-300') :
              hoveredTable.reservation.status === 'confirmed' ? (document.documentElement.getAttribute('data-theme') === 'light' ? 'bg-blue-100 text-blue-700' : 'bg-blue-500/20 text-blue-300') :
              hoveredTable.reservation.status === 'arrived' ? (document.documentElement.getAttribute('data-theme') === 'light' ? 'bg-green-100 text-green-700' : 'bg-green-500/20 text-green-300') : 
              hoveredTable.reservation.status === 'not_arrived' ? (document.documentElement.getAttribute('data-theme') === 'light' ? 'bg-red-100 text-red-700' : 'bg-red-500/20 text-red-300') :
              (document.documentElement.getAttribute('data-theme') === 'light' ? 'bg-gray-100 text-gray-700' : 'bg-gray-500/20 text-gray-300')
            }`}>
              {hoveredTable.reservation.status === 'waiting' ? `Waiting - ${getWaitingRemaining(hoveredTable.reservation)}` :
               hoveredTable.reservation.status === 'confirmed' ? t('confirmed') :
               hoveredTable.reservation.status === 'arrived' ? `Seated - ${getSeatedRemaining(hoveredTable.reservation, hoveredTable.tableId)}` :
               hoveredTable.reservation.status === 'not_arrived' ? t('notArrived') :
               hoveredTable.reservation.status === 'cancelled' ? t('cancelled') :
               hoveredTable.reservation.status}
            </div>
            <div className={document.documentElement.getAttribute('data-theme') === 'light' ? 'text-gray-700' : 'text-gray-300'}>
              {t('tablesLabel')} {formatTableNames(hoveredTable.reservation.tableIds, zoneLayouts)}
            </div>
            {hoveredTable.reservation.phone && (
              <div className={document.documentElement.getAttribute('data-theme') === 'light' ? 'text-gray-700' : 'text-gray-300'}>{t('telLabel')} {hoveredTable.reservation.phone}</div>
            )}
            {hoveredTable.reservation.notes && (
              <div className={document.documentElement.getAttribute('data-theme') === 'light' ? 'text-gray-500 italic mt-1' : 'text-gray-300 italic mt-1'}>"{hoveredTable.reservation.notes}"</div>
            )}
          </div>
        )}
        
        {/* Selection handles (universal for single and group selection) - render last to be on top */}
        {/* Force re-render during rotation/scaling by using key */}
        <div key={`selection-${selectedElements.join('-')}-${currentRotationAngle}-${isGroupRotating}-${isGroupScaling}-${(() => {
          const currentLayout = interactionLayout || layout;
          const selectedTables = currentLayout.tables?.filter(t => selectedElements.includes(t.id)).map(t => ({ x: t.x, y: t.y, rotation: t.rotation })) || [];
          const selectedWalls = currentLayout.walls?.filter(w => selectedElements.includes(w.id)).map(w => ({ x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 })) || [];
          const selectedTexts = currentLayout.texts?.filter(t => selectedElements.includes(t.id)).map(t => ({ x: t.x, y: t.y, rotation: t.rotation })) || [];
          return JSON.stringify({ tables: selectedTables, walls: selectedWalls, texts: selectedTexts });
        })()}`}>
          {renderSelectionHandles()}
        </div>
        
        {/* Empty Layout Placeholder */}
        {currentZone && !isEditing && canEdit && (
          (() => {
            // Check if there are any saved layouts for current zone
            const zoneSavedLayouts = savedLayouts[currentZone.id] || [];
            // Check if current layout is empty
            const isLayoutEmpty = 
              (!layout.tables || layout.tables.length === 0) &&
              (!layout.walls || layout.walls.length === 0) &&
              (!layout.texts || layout.texts.length === 0);
            
            // Show placeholder only if no saved layouts exist and current layout is empty
            if (zoneSavedLayouts.length === 0 && isLayoutEmpty) {
              return (
                <div 
                  className="absolute inset-0 flex items-center justify-center animate-fade-in"
                  style={{ pointerEvents: 'none' }}
                >
                  <div 
                    className="flex flex-col items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity p-8 rounded-lg"
                    style={{ pointerEvents: 'auto' }}
                    onClick={() => {
                      // Enter edit mode to start creating layout
                      toggleEditMode();
                    }}
                  >
                    {/* Plus Icon */}
                    <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center border-2 border-gray-700 hover:border-gray-600 transition-colors">
                      <svg 
                        width="48" 
                        height="48" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                        className="text-gray-500"
                      >
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </div>
                    
                    {/* Text */}
                    <div className="text-gray-400 text-lg font-medium">
                      {t('addDefaultLayout')}
                    </div>
                    
                    <div className="text-gray-500 text-sm">
                      {t('clickToStartDesigning')}
                    </div>
                  </div>
                </div>
              );
            }
            
            return null;
          })()
        )}
        </div>
      </div>

      {/* Timeline at bottom with slide animations on open/close of waiter panel */}
      <AnimatePresence initial={false}>
        {!isWaiterPanelOpen && !isTimelineCollapsed && (
          <motion.div
            key={`timeline-${selectedDate?.toISOString()}`}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'tween', duration: 0.25 }}
            className={`fixed left-80 right-0 bottom-0 ${isAnyModalOpen ? 'z-[120]' : 'z-[120]'}`}
          >
            <div className="relative h-20">
              <button
                aria-label="Collapse timeline"
                title="Sakrij timeline"
                className="absolute top-0 left-4 -translate-y-full mt-px z-[122] w-10 h-7 rounded-t-lg bg-[#000814] text-white flex items-center justify-center shadow-none border-t border-l border-r border-[#1E2A34]"
                onClick={() => setIsTimelineCollapsed(true)}
              >
                <ChevronDown size={16} />
              </button>
              <div
                className="absolute inset-0"
                onDoubleClick={() => setIsTimelineOverlayOpen(true)}
                title="Double-click to open full timeline"
              >
                <TimelineBar selectedDate={selectedDate} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle to show timeline when collapsed (always visible) */}
      {!isWaiterPanelOpen && isTimelineCollapsed && !isAnyModalOpen && (
        <button
          aria-label="Show timeline"
          title="Prikaži timeline"
          className="fixed left-80 ml-4 bottom-0 z-[121] w-10 h-7 rounded-t-lg bg-[#000814] text-white flex items-center justify-center shadow-none border-t border-l border-r border-[#1E2A34]"
          onClick={() => setIsTimelineCollapsed(false)}
        >
          <ChevronUp size={16} />
        </button>
      )}

      {/* Full-screen Timeline Overlay */}
      <TimelineOverlay
        isOpen={isTimelineOverlayOpen}
        onClose={() => setIsTimelineOverlayOpen(false)}
        selectedDate={selectedDate}
      />

      {/* Layout List */}
      <AnimatePresence>
        {showLayoutList && (
          <LayoutList onClose={() => setShowLayoutList(false)} savedLayouts={savedLayouts} loadSavedLayout={loadSavedLayout} deleteSavedLayout={deleteSavedLayout} getDefaultLayout={getDefaultLayout} currentLayoutId={currentLayoutId} />
        )}
      </AnimatePresence>

      {/* Save Layout Modal */}
      {showSaveLayoutModal && (
        <SaveLayoutModal
          onClose={() => setShowSaveLayoutModal(false)}
          onSave={handleSaveLayout}
        />
      )}

      {/* Alert Modal */}
      <DeleteConfirmationModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
      />
      
      {/* Reservation Form Overlay (keeps canvas visible beneath) */}
      {showReservationForm && showForm && (
        <div className="absolute inset-0 z-[1200]">
          <ReservationForm
            isOpen={showForm}
            onClose={onCloseReservationForm}
            selectedDate={selectedDate}
            editReservation={editReservation}
          />
        </div>
      )}
    </div>
  );
};

export default Canvas;