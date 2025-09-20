import React, { useState, useContext, useRef, useEffect, useCallback } from "react";
import { useCanvasLayout, Layout } from "../../hooks/useCanvasLayout";
import { ZoneContext } from "../../context/ZoneContext";
import { UserContext } from "../../context/UserContext";
import { ReservationContext } from "../../context/ReservationContext";
import { Reservation } from "../../types/reservation";
import ReservationForm from "../ReservationForm/ReservationForm";
import TimelineBar from "./TimelineBar";
import FloatingToolbar from "../Toolbar/FloatingToolbar";
import DeleteConfirmationModal from "../common/DeleteConfirmationModal";
import { formatTableNames } from "../../utils/tableHelper";
import { useLanguage } from "../../context/LanguageContext";
import { getAssignedWaiters, setAssignedWaiter, removeAssignedWaiter } from "../../utils/waiters";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getZoom, getZoomAdjustedCoordinates, getZoomAdjustedScreenCoordinates, adjustValueForZoom } from "../../utils/zoom";

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
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showDeleteLayoutModal, setShowDeleteLayoutModal] = useState(false);
  const [layoutToDelete, setLayoutToDelete] = useState<string | null>(null);

  const zoneSavedLayouts = currentZone ? (savedLayouts[currentZone.id] || []) : [];
  const defaultLayout = getDefaultLayout();
  
  // Debug log when savedLayouts change
  useEffect(() => {
    console.log('Layout list updated. Zone:', currentZone?.id, 'Layouts count:', zoneSavedLayouts.length);
    zoneSavedLayouts.forEach((layout: any) => {
      console.log(`- ${layout.name}: ${layout.layout.tables.length} tables`);
    });
  }, [savedLayouts, currentZone]);

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
    <div className="absolute right-0 top-8 bottom-0 w-56 bg-[#000814] border-l border-[#1E2A34] shadow-2xl z-40 flex flex-col">
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
            {zoneSavedLayouts.map((layout: any) => (
              <div
                key={layout.id}
                className={`bg-[#0A1929] rounded p-2 cursor-pointer hover:bg-[#1E2A34] transition-all border ${
                  selectedLayoutId === layout.id ? 'border-blue-500' : 
                  currentLayoutId === layout.id ? 'border-green-500' : 'border-transparent'
                }`}
                onClick={() => setSelectedLayoutId(layout.id)}
                onDoubleClick={() => handleLoad(layout.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className="text-white font-medium text-xs truncate">
                            {layout.name}
                        </h4>
                        {currentLayoutId === layout.id && (
                            <div className="w-2 h-2 bg-green-400 rounded-full" title={t('active')}></div>
                        )}
                    </div>
                    {layout.is_default && (
                    <span className="text-xs bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded-full inline-block mt-0.5">{t('default')}</span>
                    )}
                    <p className="text-gray-500 text-xs mt-0.5">
                    {formatDate(layout.created_at)}
                    </p>
                    <p className="text-gray-400 text-xs">
                    {layout.layout?.tables?.length || 0} {t('tables')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(layout.id, e)}
                    className="text-red-400 hover:text-red-300 ml-1 p-0.5 rounded hover:bg-red-500/10 transition-colors flex-shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                {selectedLayoutId === layout.id && (
                  <button
                    onClick={() => handleLoad(layout.id)}
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
        title={t('deleteZoneTitle')}
        message={t('deleteZoneMessage')}
        confirmText={t('deleteZoneButton')}
        type="delete"
      />
    </div>
  );
};

// Save Layout Modal Component
const SaveLayoutModal: React.FC<{ onClose: () => void; onSave: (name: string, isDefault: boolean) => void }> = ({ onClose, onSave }) => {
  const { t } = useLanguage();
  const [layoutName, setLayoutName] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (layoutName.trim()) {
      onSave(layoutName.trim(), isDefault);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center">
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
  selectedTool: 'select' | 'table' | 'wall' | 'text' | 'delete';
  onToolChange: (tool: 'select' | 'table' | 'wall' | 'text' | 'delete') => void;
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
  const { t } = useLanguage();
  const { user, isAuthenticated, activeRole } = useContext(UserContext);
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
  
  const { reservations } = useContext(ReservationContext);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStartPosition = useRef<{ x: number, y: number } | null>(null);
  const dragThresholdPassed = useRef(false);
  const isDraggingElements = useRef(false);
  const wasElementDragged = useRef(false);
  const groupScaleInitialStates = useRef<{ [id: string]: { x: number, y: number, width: number, height: number } }>({});
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
  useEffect(() => {
    const onOpen = () => setIsWaiterPanelOpen(true);
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
  
  // Alert modal state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    type: 'error' as 'info' | 'error' | 'success'
  });

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

  // Table name editing state
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [tableNameInput, setTableNameInput] = useState('');

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
  const [contextMenuType, setContextMenuType] = useState<'copy' | 'paste' | null>(null);
  const [lastPasteOffset, setLastPasteOffset] = useState(0);
  const [isAltPressed, setIsAltPressed] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Hover state
  const [hoveredTable, setHoveredTable] = useState<{ tableId: string, reservation: Reservation, position: { x: number, y: number } } | null>(null);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);

  // Grid settings
  const GRID_SIZE = 10;
  const DEFAULT_WALL_THICKNESS = 20;

  // Check if user can edit based on activeRole
  const canEdit = isAuthenticated && (activeRole === 'admin' || activeRole === 'manager');

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

  // Move selected elements with arrow keys
  const moveSelectedElements = useCallback((dx: number, dy: number) => {
    setLayout({
      ...layout,
      tables: layout.tables.map(table => 
        selectedElements.includes(table.id)
          ? { ...table, x: table.x + dx, y: table.y + dy }
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
    });
  }, [layout, selectedElements, setLayout]);

  // Delete selected elements and resequence table numbers to fill gaps
  const deleteSelectedElements = useCallback((idsToDelete?: string[]) => {
    const elementsToDelete = idsToDelete || selectedElements;
    if (elementsToDelete.length === 0) return;
    
    const isTableDeleted = elementsToDelete.some(id => 
      layout.tables?.some(t => t.id === id)
    );

    // Delete then resequence tables to keep contiguous numbering
    const remainingTables = layout.tables.filter(table => !elementsToDelete.includes(table.id));
    const wallsLeft = layout.walls.filter(wall => !elementsToDelete.includes(wall.id));
    const textsLeft = layout.texts.filter(text => !elementsToDelete.includes(text.id));
    
    // Resequence by current ascending order of numbers
    const sortedByNumber = [...remainingTables].sort((a, b) => a.number - b.number);
    const idToNewNumber: Record<string, number> = {};
    sortedByNumber.forEach((t, idx) => {
      idToNewNumber[t.id] = idx + 1;
    });
    const resequencedTables = remainingTables.map(t => ({
      ...t,
      number: idToNewNumber[t.id],
      name: `${idToNewNumber[t.id]}`
    }));
    
    setLayout({
        ...layout,
        tables: resequencedTables,
        walls: wallsLeft,
        texts: textsLeft
    });
    
    if (idsToDelete) {
      setSelectedElements(prev => prev.filter(id => !elementsToDelete.includes(id)));
    } else {
      setSelectedElements([]);
    }
  }, [layout, selectedElements, setLayout]);

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
  const copySelectedElements = useCallback(() => {
    const elementsToCopy: any[] = [];
    
    // Get all selected elements
    const selectedTables = layout.tables.filter(t => selectedElements.includes(t.id));
    const selectedWalls = layout.walls.filter(w => selectedElements.includes(w.id));
    const selectedTexts = layout.texts.filter(t => selectedElements.includes(t.id));
    
    elementsToCopy.push(...selectedTables, ...selectedWalls, ...selectedTexts);
    setClipboard(elementsToCopy);
  }, [layout, selectedElements]);

  // Paste elements
  const pasteElements = useCallback((atCursor?: { x: number, y: number }) => {
    if (clipboard.length === 0) return;
    
    // Calculate the center of the copied elements
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    clipboard.forEach(element => {
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
    }
    
    const newElements: string[] = [];
    const newTables: any[] = [];
    const newWalls: any[] = [];
    const newTexts: any[] = [];
    
    clipboard.forEach(element => {
      const id = `${element.id}-${Date.now()}-${Math.random()}`;
      newElements.push(id);
      
      if ('seats' in element) {
        // It's a table - assign new global number
        // Collect all table numbers from ALL zones for global numbering
        let allNumbers: number[] = [];
        
        // Add numbers from current zone
        allNumbers.push(...(layout.tables || []).map(t => t.number).filter(n => typeof n === 'number' && isFinite(n)));
        
        // Add numbers from all other zones
        Object.entries(zoneLayouts || {}).forEach(([zoneId, zoneLayout]) => {
          if (zoneLayout?.tables) {
            allNumbers.push(...zoneLayout.tables.map(t => t.number).filter(n => typeof n === 'number' && isFinite(n)));
          }
        });
        
        // Add numbers from tables already created in this paste batch
        allNumbers.push(...newTables.map(t => t.number).filter(n => typeof n === 'number' && isFinite(n)));
        
        const maxNumber = allNumbers.length > 0 ? Math.max(...allNumbers) : 0;
        const nextTableNumber = maxNumber + 1;
        
        newTables.push({
          ...element,
          id,
          number: nextTableNumber,
          name: `${nextTableNumber}`,
          x: element.x + pasteX,
          y: element.y + pasteY
        });
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
    
    // Add the new elements to the layout
    setLayout({
      ...layout,
      tables: [...layout.tables, ...newTables],
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
        // Clear hover state when entering edit mode
        setHoveredTable(null);
      } else {
        // This case might be handled by the cancel/save buttons now,
        // but as a fallback, we'll just exit edit mode.
        setIsEditing(false);
      }
      setSelectedElements([]);
      setInteractionLayout(null);
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
    // Only allow actions when in edit mode
    if (!isEditing) {
      console.log("Not in edit mode, returning from handleMouseDown");
      return;
    }

    const rect = canvasRef.current!.getBoundingClientRect();
    const { x, y } = getZoomAdjustedCoordinates(e.clientX, e.clientY, rect);
    const gridX = snapToGrid(x);
    const gridY = snapToGrid(y);

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
    const { x, y } = getZoomAdjustedCoordinates(e.clientX, e.clientY, rect);
    const gridX = snapToGrid(x);
    const gridY = snapToGrid(y);

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
      setMarqueeEnd({ x, y });
      updateMarqueeSelection();
    } else if (isDragging && selectedElements.length > 0) {
      // Move all selected elements
      const deltaX = gridX - dragOffset.x;
      const deltaY = gridY - dragOffset.y;
      
      // Use interaction layout during drag
      const currentLayout = interactionLayout || layout;
      
      // Move without delay
      requestAnimationFrame(() => {
        setInteractionLayout({
          ...currentLayout,
          tables: currentLayout.tables.map(table => {
            if (selectedElements.includes(table.id)) {
              const baseTable = layoutBeforeDrag?.tables?.find((t:any) => t.id === table.id);
              if (baseTable) {
                return { ...table, x: baseTable.x + deltaX, y: baseTable.y + deltaY };
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
                  x1: baseWall.x1 + deltaX,
                  y1: baseWall.y1 + deltaY,
                  x2: baseWall.x2 + deltaX,
                  y2: baseWall.y2 + deltaY
                };
              }
            }
            return wall;
          }),
          texts: currentLayout.texts.map(text => {
            if (selectedElements.includes(text.id)) {
              const baseText = layoutBeforeDrag?.texts?.find((t:any) => t.id === text.id);
              if (baseText) {
                return { ...text, x: baseText.x + deltaX, y: baseText.y + deltaY };
              }
            }
            return text;
          })
        });
      });
    } else if (isGroupScaling && originalGroupBounds && groupScaleHandle && originalElementStates.length > 0) {
      // Handle group scaling with rotation awareness
      setHasGroupMoved(true); // Mark that group has moved
      const currentLayout = interactionLayout || layout;
      
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
      
      // Maintain aspect ratio if shift is pressed
      if (isShiftPressed && ['tl', 'tr', 'bl', 'br'].includes(groupScaleHandle)) {
        const avgScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
        scaleX = Math.sign(scaleX) * avgScale;
        scaleY = Math.sign(scaleY) * avgScale;
      }
      
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
              // Calculate original center point
              const originalCenterX = initial.x + initial.width / 2;
              const originalCenterY = initial.y + initial.height / 2;
              
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
              
              // Scale dimensions
              const newWidth = initial.width * Math.abs(scaleX);
              const newHeight = initial.height * Math.abs(scaleY);
              
              // Convert back to top-left position
              const newX = newCenterX - newWidth / 2;
              const newY = newCenterY - newHeight / 2;
        
        return {
          ...table,
          x: newX,
          y: newY,
          width: Math.max(30, newWidth),
          height: Math.max(30, newHeight)
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
              
              // Scale the length based on the primary scaling direction
              let newLength = originalLength;
              if (['l', 'r'].includes(groupScaleHandle)) {
                newLength = originalLength * Math.abs(scaleX);
              } else if (['t', 'b'].includes(groupScaleHandle)) {
                newLength = originalLength;
              } else if (['tl', 'tr', 'bl', 'br'].includes(groupScaleHandle)) {
                newLength = originalLength * Math.abs(scaleX);
              }
              
              // Calculate new endpoints based on scaled center and length
              const halfLength = newLength / 2;
              const newX1 = newCenterX - halfLength * Math.cos(originalAngle);
              const newY1 = newCenterY - halfLength * Math.sin(originalAngle);
              const newX2 = newCenterX + halfLength * Math.cos(originalAngle);
              const newY2 = newCenterY + halfLength * Math.sin(originalAngle);
              
              // Scale wall thickness
              let newThickness = originalState.thickness;
              if (['tl', 'tr', 'bl', 'br'].includes(groupScaleHandle)) {
                const thicknessScale = Math.abs(scaleY);
                newThickness = Math.max(5, originalState.thickness * thicknessScale);
              } else if (['t', 'b'].includes(groupScaleHandle)) {
                const thicknessScale = Math.abs(scaleY);
                newThickness = Math.max(5, originalState.thickness * thicknessScale);
              }
        
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
              // Calculate original center point
              const originalCenterX = initial.x + initial.width / 2;
              const originalCenterY = initial.y + initial.height / 2;
              
              // Calculate relative offset from anchor to center
              const relativeOffsetX = originalCenterX - globalAnchorX;
              const relativeOffsetY = originalCenterY - globalAnchorY;
              
              // Transform offset to local coordinate system
              const localOffsetX = relativeOffsetX * cos + relativeOffsetY * sin;
              const localOffsetY = -relativeOffsetX * sin + relativeOffsetY * cos;
              
              // Apply scaling in local coordinate system (position only)
              const scaledLocalOffsetX = localOffsetX * scaleX;
              const scaledLocalOffsetY = localOffsetY * scaleY;
              
              // Transform back to global coordinates
              const scaledGlobalOffsetX = scaledLocalOffsetX * cos - scaledLocalOffsetY * sin;
              const scaledGlobalOffsetY = scaledLocalOffsetX * sin + scaledLocalOffsetY * cos;
              
              // Calculate new center
              const newCenterX = globalAnchorX + scaledGlobalOffsetX;
              const newCenterY = globalAnchorY + scaledGlobalOffsetY;
              
              // Convert back to top-left position (keep original dimensions)
              const newX = newCenterX - initial.width / 2;
              const newY = newCenterY - initial.height / 2;
        
        return {
          ...text,
          x: newX,
                y: newY
                // Keep original width and height for text rendering
              };
            }
          }
          return text;
        })
      };
      
      setInteractionLayout(updatedLayout);
    } else if (isGroupRotating && originalGroupBounds && Object.keys(groupRotationInitialStates.current).length > 0) {
      // Handle group rotation
      setHasGroupMoved(true); // Mark that group has moved
      const currentLayout = interactionLayout || layout;
      const centerX = originalGroupBounds.centerX;
      const centerY = originalGroupBounds.centerY;
      
      // Calculate current angle and delta using new helper functions
      const currentAngle = calculateAngle(centerX, centerY, x, y);
      let deltaAngle = getAngleDifference(currentAngle, rotationStart);
      
      if (isShiftPressed) {
        deltaAngle = Math.round(deltaAngle / 45) * 45;
      }
      
      // Update current rotation angle for display (calculate average current rotation of all objects)
      let totalCurrentRotation = 0;
      let rotationCount = 0;
      
      // Calculate average current rotation of all selected objects
      selectedElements.forEach(elementId => {
        const initial = groupRotationInitialStates.current[elementId];
        if (initial) {
          const newRotation = normalizeAngle(initial.rotation + deltaAngle);
          totalCurrentRotation += newRotation;
          rotationCount++;
        }
      });
      
      const averageRotation = rotationCount > 0 ? normalizeAngle(totalCurrentRotation / rotationCount) : 0;
      setCurrentRotationAngle(averageRotation);
      
              console.log('🔄 Group rotation - deltaAngle:', deltaAngle, 'averageRotation:', averageRotation, 'selectedElements:', selectedElements.length);
      
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
      
      setInteractionLayout(updatedLayout);
    } else if (isRotating && selectedElements.length > 0) {
      // Handle rotation for selected elements
      const currentLayout = interactionLayout || layout;
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
        
        setInteractionLayout({
          ...currentLayout,
          tables: currentLayout.tables.map(table => 
            selectedElements.includes(table.id)
              ? { ...table, rotation: normalizeAngle((originalRotations[table.id] || 0) + deltaAngle) }
              : table
          ),
          texts: currentLayout.texts.map(text =>
            selectedElements.includes(text.id)
              ? { ...text, rotation: normalizeAngle((originalRotations[text.id] || 0) + deltaAngle) }
              : text
          )
        });
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
      const currentLayout = interactionLayout || layout;
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

                      const newWidth = Math.max(10, Math.abs(d_local.x));  // Reduced min length for wall
          const newHeight = Math.max(5, Math.abs(d_local.y)); // Reduced min thickness for wall

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
                  newHeight = Math.max(5, Math.abs(projLength));
                  
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
                  newHeight = Math.max(5, Math.abs(projLength));
                  
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
                  newWidth = Math.max(10, Math.abs(projLength));
                  
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
                  newWidth = Math.max(10, Math.abs(projLength));

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

      // New logic for rotated resize on corners
      if (originalTableForResize && resizingAnchorPoint && tableResizeHandle && ['tl', 'tr', 'bl', 'br'].includes(tableResizeHandle)) {
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
          const originalAspectRatio = (originalTableForResize.width || 100) / (originalTableForResize.height || 100);
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
        
        const newWidth = Math.max(30, Math.abs(d_local.x));
        const newHeight = Math.max(30, Math.abs(d_local.y));
        
        const c_local = { x: d_local.x / 2, y: d_local.y / 2 };
        
        const cos_pos = Math.cos(rotationRad);
        const sin_pos = Math.sin(rotationRad);

        const c_offset_world = {
          x: c_local.x * cos_pos - c_local.y * sin_pos,
          y: c_local.x * sin_pos + c_local.y * cos_pos,
        };
        
        const newCenterX = resizingAnchorPoint.x + c_offset_world.x;
        const newCenterY = resizingAnchorPoint.y + c_offset_world.y;
        
        const newX = newCenterX - newWidth / 2;
        const newY = newCenterY - newHeight / 2;

        setInteractionLayout({
          ...currentLayout,
          tables: currentLayout.tables.map(t =>
            t.id === elementId
              ? { ...t, x: newX, y: newY, width: newWidth, height: newHeight }
              : t
          )
        });
        return; // Skip old logic
      }

      const rotationRad = (table.rotation || 0) * Math.PI / 180;
      const isRotated = (table.rotation || 0) % 360 !== 0;

      // New logic for rotated resize on sides
      if (isRotated && originalTableForResize && tableResizeHandle && ['t', 'r', 'b', 'l'].includes(tableResizeHandle)) {
        const mouseX = x;
        const mouseY = y;

        const originalWidth = originalTableForResize.width || 100;
        const originalHeight = originalTableForResize.height || 100;
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
              // Anchor at bottom edge of table
              const anchorX = originalCenterX - (originalHeight / 2) * sin;
              const anchorY = originalCenterY + (originalHeight / 2) * cos;
              const mouseVecX = mouseX - anchorX;
              const mouseVecY = mouseY - anchorY;
              
              // Project mouse vector onto local Y-axis {x: sin, y: -cos}
              const projLength = mouseVecX * sin + mouseVecY * -cos;
              const isInverted = projLength < 0;
              newHeight = Math.max(30, Math.abs(projLength));
              
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
              // Anchor at top edge of table
              const anchorX = originalCenterX + (originalHeight / 2) * sin;
              const anchorY = originalCenterY - (originalHeight / 2) * cos;
              const mouseVecX = mouseX - anchorX;
              const mouseVecY = mouseY - anchorY;
              
              // Project mouse vector onto inverted local Y-axis {x: -sin, y: cos}
              const projLength = mouseVecX * -sin + mouseVecY * cos;
              const isInverted = projLength < 0;
              newHeight = Math.max(30, Math.abs(projLength));
              
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
              // Anchor at right edge of table
              const anchorX = originalCenterX + (originalWidth / 2) * cos;
              const anchorY = originalCenterY + (originalWidth / 2) * sin;
              const mouseVecX = mouseX - anchorX;
              const mouseVecY = mouseY - anchorY;
              
              // Project mouse vector onto inverted local X-axis {x: -cos, y: -sin}
              const projLength = mouseVecX * -cos + mouseVecY * -sin;
              const isInverted = projLength < 0;
              newWidth = Math.max(30, Math.abs(projLength));
              
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
              // Anchor at left edge of table
              const anchorX = originalCenterX - (originalWidth / 2) * cos;
              const anchorY = originalCenterY - (originalWidth / 2) * sin;
              const mouseVecX = mouseX - anchorX;
              const mouseVecY = mouseY - anchorY;

              // Project mouse vector onto local X-axis {x: cos, y: sin}
              const projLength = mouseVecX * cos + mouseVecY * sin;
              const isInverted = projLength < 0;
              newWidth = Math.max(30, Math.abs(projLength));

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
        
        const finalNewX = newCenterX - newWidth / 2;
        const finalNewY = newCenterY - newHeight / 2;

        setInteractionLayout({
          ...currentLayout,
          tables: currentLayout.tables.map(t =>
            t.id === elementId
              ? { ...t, x: finalNewX, y: finalNewY, width: newWidth, height: newHeight }
              : t
          )
        });
        return; // Skip old logic
      }


      // Get the original bounds
      const originalLeft = table.x;
      const originalTop = table.y;
      const originalRight = table.x + (table.width || 100);
      const originalBottom = table.y + (table.height || 100);

      let newX = table.x;
      let newY = table.y;
      let newWidth = table.width || 100;
      let newHeight = table.height || 100;

      // Calculate new dimensions based on handle
      if (tableResizeHandle) {
        switch (tableResizeHandle) {
          case 'tl': // Top-left - anchor bottom-right
            newX = Math.min(gridX, originalRight - 30);
            newY = Math.min(gridY, originalBottom - 30);
            newWidth = originalRight - newX;
            newHeight = originalBottom - newY;
            break;
            
          case 'tr': // Top-right - anchor bottom-left
            newY = Math.min(gridY, originalBottom - 30);
            newWidth = Math.max(30, gridX - originalLeft);
            newHeight = originalBottom - newY;
            break;
            
          case 'bl': // Bottom-left - anchor top-right
            newX = Math.min(gridX, originalRight - 30);
            newWidth = originalRight - newX;
            newHeight = Math.max(30, gridY - originalTop);
            break;
            
          case 'br': // Bottom-right - anchor top-left
            newWidth = Math.max(30, gridX - originalLeft);
            newHeight = Math.max(30, gridY - originalTop);
            break;
            
          case 't': // Top - anchor bottom
            newY = Math.min(gridY, originalBottom - 30);
            newHeight = originalBottom - newY;
            break;
            
          case 'r': // Right - anchor left
            newWidth = Math.max(30, gridX - originalLeft);
            break;
            
          case 'b': // Bottom - anchor top
            newHeight = Math.max(30, gridY - originalTop);
            break;
            
          case 'l': // Left - anchor right
            newX = Math.min(gridX, originalRight - 30);
            newWidth = originalRight - newX;
            break;
        }
      }

      // If shift is pressed and using corner handles, maintain aspect ratio
      if (isShiftPressed && tableResizeHandle && ['tl', 'tr', 'bl', 'br'].includes(tableResizeHandle)) {
        const originalAspectRatio = (table.width || 100) / (table.height || 100);
        
        // Calculate which dimension changed more
        const widthChange = Math.abs(newWidth - (table.width || 100));
        const heightChange = Math.abs(newHeight - (table.height || 100));
        
        if (widthChange > heightChange) {
          // Width changed more, adjust height to maintain ratio
          newHeight = Math.round(newWidth / originalAspectRatio);
          
          // Adjust position based on handle
          switch (tableResizeHandle) {
            case 'tl':
              newY = originalBottom - newHeight;
              break;
            case 'tr':
              newY = originalBottom - newHeight;
              break;
          }
        } else {
          // Height changed more, adjust width to maintain ratio
          newWidth = Math.round(newHeight * originalAspectRatio);
          
          // Adjust position based on handle
          switch (tableResizeHandle) {
            case 'tl':
              newX = originalRight - newWidth;
              break;
            case 'bl':
              newX = originalRight - newWidth;
              break;
          }
        }
      }

      // Ensure minimum dimensions
      newWidth = Math.max(30, newWidth);
      newHeight = Math.max(30, newHeight);
      
      // Ensure position doesn't cause negative dimensions
      if (newX > originalRight - 30) {
        newX = originalRight - 30;
        newWidth = 30;
      }
      if (newY > originalBottom - 30) {
        newY = originalBottom - 30;
        newHeight = 30;
      }

      setInteractionLayout({
        ...currentLayout,
        tables: currentLayout.tables.map(t =>
          t.id === elementId
            ? { ...t, x: newX, y: newY, width: newWidth, height: newHeight }
            : t
        )
      });
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
    
    const newSelection: string[] = [];
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
    
    if (isShiftPressed) {
      // Add to existing selection - preserve rotation if adding to same group
      setSelectedElements(prev => {
        const combined = [...new Set([...prev, ...newSelection])];
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
    if (isDrawing) {
      setIsDrawing(false);

      const rect = canvasRef.current!.getBoundingClientRect();
      const { x: endRawX, y: endRawY } = getZoomAdjustedCoordinates(e.clientX, e.clientY, rect);
      const endX = snapToGrid(endRawX);
      const endY = snapToGrid(endRawY);

      if (selectedTool === 'table') {
        const { width, height } = getConstrainedDimensions(drawStart.x, drawStart.y, endX, endY, isShiftPressed);
        
        // Only create table if it has some size
        if (Math.abs(width) > 10 && Math.abs(height) > 10) {
          // Collect all table numbers from ALL zones for global numbering
          let allNumbers: number[] = [];
          
          // Add numbers from current zone
          const currentTables = layout.tables || [];
          allNumbers.push(...currentTables.map(t => t.number).filter(n => typeof n === 'number' && isFinite(n)));
          
          // Add numbers from all other zones
          Object.entries(zoneLayouts || {}).forEach(([zoneId, zoneLayout]) => {
            if (zoneLayout?.tables) {
              allNumbers.push(...zoneLayout.tables.map(t => t.number).filter(n => typeof n === 'number' && isFinite(n)));
            }
          });
          
          // Find the highest number across all zones
          const maxNumber = allNumbers.length > 0 ? Math.max(...allNumbers) : 0;
          const nextTableNumber = maxNumber + 1;

          const newTable = {
            id: `table-${Date.now()}`,
            number: nextTableNumber,
            x: width < 0 ? drawStart.x + width : drawStart.x,
            y: height < 0 ? drawStart.y + height : drawStart.y,
            width: Math.abs(width),
            height: Math.abs(height),
            type: tableType,
            name: `${nextTableNumber}`,
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
          const startX = width < 0 ? drawStart.x + width : drawStart.x;
          const centerY = (height < 0 ? drawStart.y + height : drawStart.y) + wallHeight / 2;
          
          let thickness = wallHeight;
          
          // If shift is pressed, ensure minimum thickness
          if (isShiftPressed) {
            thickness = Math.max(thickness, DEFAULT_WALL_THICKNESS);
          }
          
          const newWall = {
            id: `wall-${Date.now()}`,
            x1: startX,
            y1: centerY,
            x2: startX + wallWidth,
            y2: centerY,
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
      setLayout(interactionLayout);
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
    
    if (!isEditing) return;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const { x, y } = getZoomAdjustedCoordinates(e.clientX, e.clientY, rect);
    
    // Check if clicking on an element
    const clickedElement = getElementAtPosition(x, y);
    
    if (clickedElement) {
      // Show copy menu
      setContextMenuType('copy');
      // Select the element if not already selected
      if (!selectedElements.includes(clickedElement)) {
        setSelectedElements([clickedElement]);
      }
    } else {
      // Show paste menu only if we have something in clipboard
      if (clipboard.length > 0) {
        setContextMenuType('paste');
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
      copySelectedElements();
    } else if (action === 'paste') {
      const rect = canvasRef.current!.getBoundingClientRect();
      const { x: canvasX, y: canvasY } = getZoomAdjustedCoordinates(contextMenuPosition.x, contextMenuPosition.y, rect);
      pasteElements({ x: snapToGrid(canvasX), y: snapToGrid(canvasY) });
    }
    setShowContextMenu(false);
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
    if (e.shiftKey || isShiftPressed) {
      // Toggle selection - preserve group rotation for consistent selection
      setSelectedElements(prev => {
        const newSelection = prev.includes(elementId)
          ? prev.filter(id => id !== elementId)
          : [...prev, elementId];
        // Only reset group rotation if we're selecting completely different elements
        if (newSelection.length > 0 && prev.length > 0) {
          const hasCommonElements = newSelection.some(id => prev.includes(id));
          if (!hasCommonElements) {
            setGroupTotalRotation(0); // Reset only when selecting completely different group
          }
        } else if (newSelection.length === 0) {
          setGroupTotalRotation(0); // Reset when deselecting all
        }
        return newSelection;
      });
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
    if (!isEditing) return;
    
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
    const selectionForDrag = elementId && currentSelection.includes(elementId) 
      ? currentSelection  // Use current group if element is part of it
      : elementId ? [elementId] : currentSelection; // Use single element or current selection
    
    setSelectedElementsBeforeDrag(selectionForDrag);
    
    // Get mouse position
    const rect = canvasRef.current!.getBoundingClientRect();
    const { x: canvasX, y: canvasY } = getZoomAdjustedCoordinates(e.clientX, e.clientY, rect);
    
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
      const { x: mouseCanvasX, y: mouseCanvasY } = getZoomAdjustedCoordinates(e.clientX, e.clientY, rect);
      const centerX = element.x + (element.width || 100) / 2;
      const centerY = element.y + (element.height || 100) / 2;
      const startAngle = calculateAngle(centerX, centerY, mouseCanvasX, mouseCanvasY);
      setRotationStart(startAngle);
    } else if (wall) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const { x: mouseCanvasX, y: mouseCanvasY } = getZoomAdjustedCoordinates(e.clientX, e.clientY, rect);
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

  // Handle group scaling start
  const handleGroupScaleStart = (e: React.MouseEvent, handle: 'tl' | 'tr' | 'bl' | 'br' | 't' | 'r' | 'b' | 'l') => {
    e.stopPropagation();
    e.preventDefault();
    if (!isEditing || selectedTool !== 'select' || selectedElements.length === 0) return;
    
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
        groupScaleInitialStates.current[id] = { x: table.x, y: table.y, width: table.width || 100, height: table.height || 100 };
      } else if (text) {
        groupScaleInitialStates.current[id] = { x: text.x, y: text.y, width: text.width || 200, height: text.height || 30 };
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
      const { x: mouseCanvasX, y: mouseCanvasY } = getZoomAdjustedCoordinates(e.clientX, e.clientY, rect);
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
    
    if (!table || isNaN(newNumber) || newNumber <= 0) {
        setEditingTableId(null);
        setTableNameInput('');
        return;
    }

    // Reorder numbers within the current zone by inserting this table at the desired position.
    // Clamp position to [1, tablesCount]
    const tablesCount = layout.tables.length;
    const targetPos = Math.max(1, Math.min(newNumber, tablesCount));
    
    // Sort tables by their current number to get stable order
    const ordered = [...layout.tables].sort((a, b) => a.number - b.number);
    // Remove the edited table from the ordered list
    const withoutEdited = ordered.filter(t => t.id !== editingTableId);
    // Insert at new position (targetPos - 1)
    withoutEdited.splice(targetPos - 1, 0, table);
    // Build mapping id -> newNumber based on new order
    const idToNewNumber: Record<string, number> = {};
    withoutEdited.forEach((t, idx) => {
      idToNewNumber[t.id] = idx + 1;
    });
    
    const resequencedTables = layout.tables.map(t => ({
      ...t,
      number: idToNewNumber[t.id],
      name: `${idToNewNumber[t.id]}`
    }));
    
    setLayout({
      ...layout,
      tables: resequencedTables
    });
    
    setEditingTableId(null);
    setTableNameInput('');
  };

  // Render table
  const renderTableWithHandles = (table: any) => {
    const isSelected = selectedElements.includes(table.id);
    const isHovered = hoveredElementId === table.id;
    const width = table.width || 100;
    const height = table.height || 100;
    const rotation = table.rotation || 0;
    
    // Find reservation for this table on the selected date - check all zones
    const reservationForTable = reservations.find(r => {
      const reservationDate = new Date(r.date);
      const calendarDate = selectedDate || new Date();
      return r.tableIds?.includes(table.id) && 
             reservationDate.getFullYear() === calendarDate.getFullYear() &&
             reservationDate.getMonth() === calendarDate.getMonth() &&
             reservationDate.getDate() === calendarDate.getDate() &&
             // Only show active reservations (waiting and confirmed)
             (r.status === 'waiting' || r.status === 'confirmed');
    });

    // If this reservation spans multiple tables, only display waiter labels on the first table id to avoid duplicates
    const isPrimaryTableForReservation = reservationForTable ? reservationForTable.tableIds && reservationForTable.tableIds[0] === table.id : false;
    
    const tableColor = reservationForTable ? reservationForTable.color : (table.color || '#FFFFFF');
    
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
    
    const waiterListForReservation = reservationForTable && isPrimaryTableForReservation ? getAssignedWaiters(reservationForTable.id) : [] as string[];
    const hasWaiterLabels = waiterListForReservation && (waiterListForReservation as any).length > 0;

    return (
      <div
        key={table.id}
        className={`absolute transition-none ${isHovered && !isSelected && isEditing ? 'ring-2 ring-blue-300' : ''} ${cursor}`}
        style={{
          left: `${table.x}px`,
          top: `${table.y}px`,
          width: `${width}px`,
          height: `${height}px`,
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center',
          zIndex: isSelected ? 10 : (hasWaiterLabels ? 20 : 1)
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
            if (name && reservationForTable) {
              setAssignedWaiter(reservationForTable.id, name);
              try { window.dispatchEvent(new CustomEvent('respoint-waiter-assigned', { detail: { reservationId: reservationForTable.id, name } })); } catch {}
            }
          } catch {}
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleContextMenu(e);
        }}
        onMouseEnter={(e) => {
          setHoveredElementId(table.id);
          if (reservationForTable && !isEditing) {
            const rect = canvasRef.current!.getBoundingClientRect();
            const { x: canvasX, y: canvasY } = getZoomAdjustedCoordinates(e.clientX, e.clientY, rect);
            setHoveredTable({
              tableId: table.id,
              reservation: reservationForTable,
              position: { x: canvasX, y: canvasY }
            });
          }
        }}
        onMouseLeave={() => {
          setHoveredElementId(null);
          setHoveredTable(null);
        }}
        onMouseMove={(e) => {
          if (hoveredTable && hoveredTable.tableId === table.id && !isEditing) {
            const rect = canvasRef.current!.getBoundingClientRect();
            const { x: canvasX, y: canvasY } = getZoomAdjustedCoordinates(e.clientX, e.clientY, rect);
            setHoveredTable(prev => prev ? ({ ...prev, position: { x: canvasX, y: canvasY } }) : null);
          }
        }}
        onDoubleClick={(e) => handleTableNameDoubleClick(e, table)}
      >
        {table.type === 'rectangle' ? (
          <div
            className="w-full h-full rounded-lg flex items-center justify-center text-black font-medium shadow-lg select-none"
            style={{ backgroundColor: tableColor }}
          >
            {editingTableId === table.id ? (
              <input
                type="number"
                value={tableNameInput}
                onChange={handleTableNameChange}
                onBlur={handleTableNameSubmit}
                onKeyDown={(e) => { if (e.key === 'Enter') handleTableNameSubmit(); if (e.key === 'Escape') setEditingTableId(null); }}
                className="w-full h-full text-center bg-white text-black font-bold text-lg border-4 border-blue-500 rounded-lg outline-none shadow-lg z-[70] hide-number-arrows"
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                min="1"
              />
            ) : (
              <div style={{ transform: `rotate(${-rotation}deg)`, position: 'relative', width: '100%', height: '100%' }} className="select-none">
                <div className="w-full h-full flex items-center justify-center text-black font-medium">{table.name}</div>
                {reservationForTable && isPrimaryTableForReservation ? (() => {
                  const list = getAssignedWaiters(reservationForTable.id);
                  return list && list.length > 0 ? (
                    <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1 px-1 overflow-visible pointer-events-none">
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
                              if (reservationForTable) {
                                removeAssignedWaiter(reservationForTable.id, w);
                                try { window.dispatchEvent(new CustomEvent('respoint-waiter-assigned', { detail: { reservationId: reservationForTable.id, name: null } })); } catch {}
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
            className="w-full h-full rounded-full flex items-center justify-center text-black font-medium shadow-lg select-none"
            style={{ backgroundColor: tableColor }}
          >
             {editingTableId === table.id ? (
              <input
                type="number"
                value={tableNameInput}
                onChange={handleTableNameChange}
                onBlur={handleTableNameSubmit}
                onKeyDown={(e) => { if (e.key === 'Enter') handleTableNameSubmit(); if (e.key === 'Escape') setEditingTableId(null); }}
                className="w-full h-full text-center bg-white text-black font-bold text-lg border-4 border-blue-500 rounded-full outline-none shadow-lg z-[70] hide-number-arrows"
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                min="1"
              />
            ) : (
              <div style={{ transform: `rotate(${-rotation}deg)`, position: 'relative', width: '100%', height: '100%' }} className="select-none">
                <div className="w-full h-full flex items-center justify-center text-black font-medium">{table.name}</div>
                {reservationForTable && isPrimaryTableForReservation ? (() => {
                  const list = getAssignedWaiters(reservationForTable.id);
                  return list && list.length > 0 ? (
                    <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1 px-1 overflow-visible pointer-events-none">
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
                              if (reservationForTable) {
                                removeAssignedWaiter(reservationForTable.id, w);
                                try { window.dispatchEvent(new CustomEvent('respoint-waiter-assigned', { detail: { reservationId: reservationForTable.id, name: null } })); } catch {}
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
      const { width, height } = getConstrainedDimensions(drawStart.x, drawStart.y, drawEnd.x, drawEnd.y, isShiftPressed);
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
              backgroundColor: 'rgba(59, 130, 246, 0.1)'
            }}
          />

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
              backgroundColor: 'rgba(59, 130, 246, 0.3)'
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
          height: `${height}px`
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
        // Collect all table numbers from ALL zones for global numbering
        let allNumbers: number[] = [];
        
        // Add numbers from current zone
        allNumbers.push(...(layout.tables || []).map(t => t.number).filter(n => typeof n === 'number' && isFinite(n)));
        
        // Add numbers from all other zones
        Object.entries(zoneLayouts || {}).forEach(([zoneId, zoneLayout]) => {
          if (zoneLayout?.tables) {
            allNumbers.push(...zoneLayout.tables.map(t => t.number).filter(n => typeof n === 'number' && isFinite(n)));
          }
        });
        
        // Add numbers from tables already created in this duplication batch
        allNumbers.push(...newTables.map(t => t.number).filter(n => typeof n === 'number' && isFinite(n)));
        
        const maxNumber = allNumbers.length > 0 ? Math.max(...allNumbers) : 0;
        const nextTableNumber = maxNumber + 1;
        const newTable = {
          ...table,
          id: newId,
          number: nextTableNumber,
          name: `${nextTableNumber}`,
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
      // For group selection, compute a circular mean of rotations and use OBB
      // This avoids artifacts when elements are around the 0°/360° boundary
      let sumSin = 0;
      let sumCos = 0;
      let rotationCount = 0;
      
      selectedElements.forEach(elementId => {
        const table = currentLayout.tables?.find(t => t.id === elementId);
        const wall = currentLayout.walls?.find(w => w.id === elementId);
        const text = currentLayout.texts?.find(t => t.id === elementId);
        
        let angleDeg: number | undefined;
        if (table) {
          angleDeg = normalizeAngle(table.rotation || 0);
        } else if (wall) {
          angleDeg = normalizeAngle(Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1) * 180 / Math.PI);
        } else if (text) {
          angleDeg = normalizeAngle(text.rotation || 0);
        }
        
        if (angleDeg !== undefined) {
          const angleRad = angleDeg * Math.PI / 180;
          sumSin += Math.sin(angleRad);
          sumCos += Math.cos(angleRad);
          rotationCount++;
        }
      });
      
      if (rotationCount > 0) {
        const meanRad = Math.atan2(sumSin / rotationCount, sumCos / rotationCount);
        const meanDeg = meanRad * 180 / Math.PI;
        groupRotation = normalizeAngle(meanDeg);
      }
      
      // Calculate global center first using AABB
      const minX = Math.min(...allCorners.map(c => c.x));
      const maxX = Math.max(...allCorners.map(c => c.x));
      const minY = Math.min(...allCorners.map(c => c.y));
      const maxY = Math.max(...allCorners.map(c => c.y));
      const globalCenterX = (minX + maxX) / 2;
      const globalCenterY = (minY + maxY) / 2;
      
      // Project all corners to local coordinate system of the group rotation
      const rad = groupRotation * Math.PI / 180;
      const cos = Math.cos(-rad); // Use negative for inverse rotation
      const sin = Math.sin(-rad);
      
      let localMinX = Infinity, localMaxX = -Infinity;
      let localMinY = Infinity, localMaxY = -Infinity;
      
      allCorners.forEach(corner => {
        // Translate to group center
        const translatedX = corner.x - globalCenterX;
        const translatedY = corner.y - globalCenterY;
        
        // Rotate to local coordinate system
        const localX = translatedX * cos - translatedY * sin;
        const localY = translatedX * sin + translatedY * cos;
        
        // Track min/max in local coordinates
        localMinX = Math.min(localMinX, localX);
        localMaxX = Math.max(localMaxX, localX);
        localMinY = Math.min(localMinY, localY);
        localMaxY = Math.max(localMaxY, localY);
      });
      
      // Calculate oriented bounding box dimensions
      const obbWidth = localMaxX - localMinX;
      const obbHeight = localMaxY - localMinY;
      
      // The AABB center rotated into local space might not be the OBB center.
      // Compute the true local center of the OBB, then transform it back to global.
      const localCenterX = (localMinX + localMaxX) / 2;
      const localCenterY = (localMinY + localMaxY) / 2;
      
      // Convert the local center offset back to global coordinates
      const cosForward = Math.cos(rad);
      const sinForward = Math.sin(rad);
      const offsetGlobalX = localCenterX * cosForward - localCenterY * sinForward;
      const offsetGlobalY = localCenterX * sinForward + localCenterY * cosForward;
      
      const obbCenterX = globalCenterX + offsetGlobalX;
      const obbCenterY = globalCenterY + offsetGlobalY;
      
      // Return the oriented bounding box using the true global center
      // The selection outline will handle the rotation via CSS transform
      return {
        x: obbCenterX - obbWidth / 2,
        y: obbCenterY - obbHeight / 2,
        width: obbWidth,
        height: obbHeight,
        centerX: obbCenterX,
        centerY: obbCenterY,
        rotation: groupRotation
      };
    }
    
    return null;
  };

  // Render universal selection handles (for both single and group selection)
  const renderSelectionHandles = () => {
    if (!isEditing || selectedTool !== 'select' || selectedElements.length === 0) return null;
    
    // Don't show selection handles when editing text
    if (editingTextId) return null;
    
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
            zIndex: 10
          }}
        />
        
        {/* Scale handles - corners (not shown for text elements) */}
        {!isTextOnlySelection && ['tl', 'tr', 'bl', 'br'].map((handle) => {
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
          
          // Calculate rotated cursor for corner handles
          let cursor = handle === 'tl' || handle === 'br' ? 'nw-resize' : 'ne-resize';
          let cursorClass = '';
          if (isRotationArea) {
            cursorClass = 'cursor-rotate';
            cursor = 'grab'; // fallback
          } else {
            // Calculate cursor based on actual visual position after rotation
            // Determine which visual quadrant this grip is in after rotation
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
                  zIndex: 16
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
              
              {/* Main handle */}
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
              zIndex: 15
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
                    handleGroupScaleStart(e, handle as 'tl' | 'tr' | 'bl' | 'br');
                  }
                }
              }}
              onMouseEnter={() => setHoveredHandle(handle)}
              onMouseMove={() => setHoveredHandle(handle)}
              onMouseLeave={() => setHoveredHandle(null)}
              />
            </div>
          );
        })}
        
        {/* Scale handles - sides (not shown for text elements) */}
        {!isTextOnlySelection && ['t', 'r', 'b', 'l'].map((handle) => {
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
              zIndex: 15
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
                    handleGroupScaleStart(e, handle as 't' | 'r' | 'b' | 'l');
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
                  zIndex: 14
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
              transform: 'translateX(-50%)'
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
        const { x, y } = getZoomAdjustedCoordinates(e.clientX, e.clientY, rect);
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
            phone: payload.phone || '',
            email: payload.email || '',
            notes: '',
            color: '#8B5CF6',
            status: 'waiting'
          };
          setShowReservationForm(true);
          setShowForm(true);
          setTimeout(() => {
            try { (window as any).dispatchEvent(new CustomEvent('prefill-reservation', { detail: prefill })); } catch {}
          }, 0);
        } else {
          setShowReservationForm(true);
          setShowForm(true);
        }
      } catch {
        setShowReservationForm(true);
        setShowForm(true);
      }
    };
    window.addEventListener('respoint-open-reservation', handler as any);
    return () => window.removeEventListener('respoint-open-reservation', handler as any);
  }, []);

  // If showing reservation form, render it instead of the canvas - MOVED AFTER ALL HOOKS
  if (showReservationForm && showForm) {
    return (
      <div className="flex-1 bg-[#0A1929] relative overflow-hidden">
        <ReservationForm
          isOpen={showForm}
          onClose={onCloseReservationForm}
          selectedDate={selectedDate}
          editReservation={editReservation}
        />
      </div>
    );
  }

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
            `absolute top-0 left-0 right-0 z-20 px-4 py-1 border-b ` +
            (document.documentElement.getAttribute('data-theme') === 'light'
              ? 'bg-white border-gray-200'
              : 'bg-[#000814] border-[#1E2A34]')
          }
        >
          <div className="flex items-center justify-between">
            {/* Left side - Edit controls and tools */}
            <div className="flex items-center gap-3">
              {/* Edit/Save controls */}
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <button
                    onClick={toggleEditMode}
                    className={
                      `px-4 py-0.5 text-sm transition-colors rounded ` +
                      (document.documentElement.getAttribute('data-theme') === 'light'
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
                            ? (document.documentElement.getAttribute('data-theme') === 'light' ? 'text-gray-800 hover:bg-gray-100' : 'text-white hover:bg-white/10')
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
                        (document.documentElement.getAttribute('data-theme') === 'light' ? 'text-gray-800 hover:bg-gray-100' : 'text-white hover:bg-white/10')
                      }
                    >
                      {t('saveLayoutAs')}
                    </button>
                    <button
                      onClick={handleCancel}
                      className={
                        `px-4 py-0.5 text-sm transition-colors rounded ` +
                        (document.documentElement.getAttribute('data-theme') === 'light' ? 'text-gray-800 hover:bg-gray-100' : 'text-white hover:bg-white/10')
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
                  <div className={document.documentElement.getAttribute('data-theme') === 'light' ? 'w-px h-6 bg-gray-200' : 'w-px h-6 bg-[#1E2A34]'} />
                  
                  <div className="flex items-center gap-1">
                    {/* Move Tool */}
                    <button
                      onClick={() => onToolChange('select')}
                      className={
                        `p-1.5 rounded-md transition-all ` +
                        (document.documentElement.getAttribute('data-theme') === 'light'
                          ? `${selectedTool === 'select' ? 'bg-gray-200' : ''} hover:bg-gray-100 text-gray-700`
                          : `${selectedTool === 'select' ? 'bg-white/20' : ''} hover:bg-white/10 text-white`)
                      }
                      title={t('moveToolTooltip')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={document.documentElement.getAttribute('data-theme') === 'light' ? '#374151' : 'white'} strokeWidth="2">
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
                        (document.documentElement.getAttribute('data-theme') === 'light'
                          ? `${selectedTool === 'table' && tableType === 'rectangle' ? 'bg-gray-200' : ''} hover:bg-gray-100 text-gray-700`
                          : `${selectedTool === 'table' && tableType === 'rectangle' ? 'bg-white/20' : ''} hover:bg-white/10 text-white`)
                      }
                      title={t('squareTableTooltip')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={document.documentElement.getAttribute('data-theme') === 'light' ? '#374151' : 'white'} strokeWidth="2">
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
                        (document.documentElement.getAttribute('data-theme') === 'light'
                          ? `${selectedTool === 'table' && tableType === 'circle' ? 'bg-gray-200' : ''} hover:bg-gray-100 text-gray-700`
                          : `${selectedTool === 'table' && tableType === 'circle' ? 'bg-white/20' : ''} hover:bg-white/10 text-white`)
                      }
                      title={t('roundTableTooltip')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={document.documentElement.getAttribute('data-theme') === 'light' ? '#374151' : 'white'} strokeWidth="2">
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                    </button>

                    {/* Wall Tool */}
                    <button
                      onClick={() => onToolChange('wall')}
                      className={
                        `p-1.5 rounded-md transition-all ` +
                        (document.documentElement.getAttribute('data-theme') === 'light'
                          ? `${selectedTool === 'wall' ? 'bg-gray-200' : ''} hover:bg-gray-100 text-gray-700`
                          : `${selectedTool === 'wall' ? 'bg-white/20' : ''} hover:bg-white/10 text-white`)
                      }
                      title={t('wallToolTooltip')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={document.documentElement.getAttribute('data-theme') === 'light' ? '#374151' : 'white'} strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>

                    {/* Text Tool */}
                    <button
                      onClick={() => onToolChange('text')}
                      className={
                        `p-1.5 rounded-md transition-all ` +
                        (document.documentElement.getAttribute('data-theme') === 'light'
                          ? `${selectedTool === 'text' ? 'bg-gray-200' : ''} hover:bg-gray-100 text-gray-700`
                          : `${selectedTool === 'text' ? 'bg-white/20' : ''} hover:bg-white/10 text-white`)
                      }
                      title={t('textToolTooltip')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={document.documentElement.getAttribute('data-theme') === 'light' ? '#374151' : 'white'} strokeWidth="2">
                        <path d="M4 7V4h16v3M9 20h6M12 4v16" />
                      </svg>
                    </button>

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
                        (document.documentElement.getAttribute('data-theme') === 'light'
                          ? `${selectedTool === 'delete' ? 'bg-red-100' : ''} hover:bg-gray-100 text-gray-700`
                          : `${selectedTool === 'delete' ? 'bg-red-500/20' : ''} hover:bg-white/10 text-white`)
                      }
                      title={t('deleteToolTooltip')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={document.documentElement.getAttribute('data-theme') === 'light' ? '#374151' : 'white'} strokeWidth="2">
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
                        (document.documentElement.getAttribute('data-theme') === 'light' ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-white')
                      }
                      title={t('resetAllTooltip')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={document.documentElement.getAttribute('data-theme') === 'light' ? '#374151' : 'white'} strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8M21 3v5h-5" />
                      </svg>
                    </button>

                    {/* Font Size Control - visible when text is selected */}
                    {isTextSelected && (
                      <>
                        <div className="w-px h-6 bg-[#1E2A34]" />
                        <div className="flex items-center gap-1">
                          <span className={document.documentElement.getAttribute('data-theme') === 'light' ? 'text-gray-700 text-sm mr-1' : 'text-white text-sm mr-1'}>{t('fontLabel')}</span>
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
                              document.documentElement.getAttribute('data-theme') === 'light'
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
                            className={document.documentElement.getAttribute('data-theme') === 'light' ? 'p-0.5 rounded hover:bg-gray-100' : 'p-0.5 rounded hover:bg-white/20'}
                            onMouseDown={(e) => e.stopPropagation()}
                            title={t('decreaseFontSize')}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={document.documentElement.getAttribute('data-theme') === 'light' ? '#374151' : 'white'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                          </button>
                          <button
                            onClick={() => {
                              const currentSize = (selectedElement as any).fontSize || 16;
                              const newSize = currentSize + 1;
                              updateText(selectedElement.id, { fontSize: newSize });
                            }}
                            className={document.documentElement.getAttribute('data-theme') === 'light' ? 'p-0.5 rounded hover:bg-gray-100' : 'p-0.5 rounded hover:bg-white/20'}
                            onMouseDown={(e) => e.stopPropagation()}
                            title={t('increaseFontSize')}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={document.documentElement.getAttribute('data-theme') === 'light' ? '#374151' : 'white'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
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
                (document.documentElement.getAttribute('data-theme') === 'light' ? 'text-gray-800 hover:bg-gray-100' : 'text-white hover:bg-white/10')
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
        className="w-full h-full relative overflow-hidden pt-8 pb-20"
        style={{
          cursor: selectedTool === 'select' ? (isDragging ? 'move' : isShiftPressed && isEditing ? 'copy' : 'default') : 'crosshair',
          backgroundImage: isEditing
            ? `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
               linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`
            : undefined,
          backgroundSize: isEditing ? `${GRID_SIZE}px ${GRID_SIZE}px` : undefined,
        }}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
      >
        {/* Tables with resize handles */}
        {(interactionLayout || layout).tables?.map(table => renderTableWithHandles(table))}

        {/* Walls - render as SVG for better control */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: '100%', height: '100%' }}
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

        {/* Context Menu */}
        {showContextMenu && (
          <div
            className="absolute z-[70] bg-gray-800 border border-gray-600 rounded shadow-lg py-1"
            style={{
              left: `${contextMenuPosition.x - canvasRef.current!.getBoundingClientRect().left}px`,
              top: `${contextMenuPosition.y - canvasRef.current!.getBoundingClientRect().top}px`
            }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            {contextMenuType === 'copy' ? (
              <button
                className="px-4 py-2 text-white hover:bg-gray-700 w-full text-left flex items-center gap-2"
                onClick={() => handleContextMenuAction('copy')}
              >
                <span className="text-xs opacity-60">Ctrl+C</span>
                {t('copySelected')}
              </button>
            ) : contextMenuType === 'paste' ? (
              <button
                className="px-4 py-2 text-white hover:bg-gray-700 w-full text-left flex items-center gap-2"
                onClick={() => handleContextMenuAction('paste')}
              >
                <span className="text-xs opacity-60">Ctrl+V</span>
                {t('pasteSelected')}
              </button>
            ) : null}
          </div>
        )}
        
        {/* Reservation Hover Card - only show when not editing */}
        {hoveredTable && !isEditing && (
          <div
            className={
              `absolute z-[70] px-3 py-2 text-xs rounded-lg shadow-xl whitespace-nowrap select-none border ` +
              (document.documentElement.getAttribute('data-theme') === 'light'
                ? 'bg-white text-gray-900 border-gray-200'
                : 'bg-gray-900 text-white border-gray-700')
            }
            style={{
              left: `${hoveredTable.position.x + 15}px`,
              top: `${hoveredTable.position.y + 15}px`,
              pointerEvents: 'none'
            }}
          >
            <div className="font-medium text-accent">{hoveredTable.reservation.guestName}</div>
            <div className={document.documentElement.getAttribute('data-theme') === 'light' ? 'text-gray-700 mt-1' : 'text-gray-300 mt-1'}>{hoveredTable.reservation.time} - {hoveredTable.reservation.numberOfGuests} {t('guests')}</div>
            <div className={`text-xs px-2 py-1 rounded mt-1 ${
              hoveredTable.reservation.status === 'waiting' ? (document.documentElement.getAttribute('data-theme') === 'light' ? 'bg-orange-100 text-orange-700' : 'bg-orange-500/20 text-orange-300') :
              hoveredTable.reservation.status === 'confirmed' ? (document.documentElement.getAttribute('data-theme') === 'light' ? 'bg-blue-100 text-blue-700' : 'bg-blue-500/20 text-blue-300') :
              hoveredTable.reservation.status === 'arrived' ? (document.documentElement.getAttribute('data-theme') === 'light' ? 'bg-green-100 text-green-700' : 'bg-green-500/20 text-green-300') : 
              hoveredTable.reservation.status === 'not_arrived' ? (document.documentElement.getAttribute('data-theme') === 'light' ? 'bg-red-100 text-red-700' : 'bg-red-500/20 text-red-300') :
              (document.documentElement.getAttribute('data-theme') === 'light' ? 'bg-gray-100 text-gray-700' : 'bg-gray-500/20 text-gray-300')
            }`}>
              {hoveredTable.reservation.status === 'waiting' ? t('waiting') :
               hoveredTable.reservation.status === 'confirmed' ? t('confirmed') :
               hoveredTable.reservation.status === 'arrived' ? t('arrived') :
               hoveredTable.reservation.status === 'not_arrived' ? t('notArrived') :
               hoveredTable.reservation.status === 'cancelled' ? t('cancelled') :
               hoveredTable.reservation.status}
            </div>
            <div className={document.documentElement.getAttribute('data-theme') === 'light' ? 'text-gray-700' : 'text-gray-300'}>{t('tablesLabel')} {formatTableNames(hoveredTable.reservation.tableIds, zoneLayouts)}</div>
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

      {/* Timeline at bottom with slide animations on open/close of waiter panel */}
      <AnimatePresence initial={false}>
        {!isWaiterPanelOpen && !isTimelineCollapsed && (
          <motion.div
            key={`timeline-${selectedDate?.toISOString()}`}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'tween', duration: 0.25 }}
            className={`fixed left-80 right-0 bottom-0 ${isAnyModalOpen ? 'z-[80]' : 'z-[120]'}`}
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
              <div className="absolute inset-0">
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

      {/* Layout List */}
      {showLayoutList && (
        <LayoutList onClose={() => setShowLayoutList(false)} savedLayouts={savedLayouts} loadSavedLayout={loadSavedLayout} deleteSavedLayout={deleteSavedLayout} getDefaultLayout={getDefaultLayout} currentLayoutId={currentLayoutId} />
      )}

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
    </div>
  );
};

export default Canvas;