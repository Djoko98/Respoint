import React, { useState, useContext, useEffect, useCallback } from "react";
import { ZoneContext } from "../../context/ZoneContext";
import { useLanguage } from "../../context/LanguageContext";
import DeleteConfirmationModal from "../common/DeleteConfirmationModal";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  rectIntersection,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Zone } from "../../context/ZoneContext";
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';

interface ZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SortableZoneItemProps {
  zone: Zone;
  isEditing: boolean;
  editName: string;
  onStartEdit: (zone: Zone) => void;
  onUpdateZone: (zoneId: string) => void;
  onCancelEdit: () => void;
  onEditNameChange: (name: string) => void;
  onDeleteZone: (zoneId: string) => void;
  totalZones: number;
  isDragOverlay?: boolean;
  t: (key: any) => string;
}

const SortableZoneItem: React.FC<SortableZoneItemProps> = ({
  zone,
  isEditing,
  editName,
  onStartEdit,
  onUpdateZone,
  onCancelEdit,
  onEditNameChange,
  onDeleteZone,
  totalZones,
  isDragOverlay = false,
  t,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: zone.id,
    disabled: isEditing, // Disable dragging while editing
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 bg-[#0A1929] border border-gray-800 rounded transition-all duration-200 ${
        isDragging ? 'shadow-lg ring-2 ring-[#FFB800]/50' : 'hover:bg-[#0A1929]/80'
      } ${isDragOverlay ? 'shadow-2xl ring-2 ring-[#FFB800]' : ''}`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className={`flex-shrink-0 p-1 transition-colors ${
          isEditing 
            ? 'cursor-not-allowed text-gray-600' 
            : 'cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-400'
        }`}
        title={isEditing ? "Cannot drag while editing" : t('dragToReorder')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="12" r="1" />
          <circle cx="9" cy="5" r="1" />
          <circle cx="9" cy="19" r="1" />
          <circle cx="15" cy="12" r="1" />
          <circle cx="15" cy="5" r="1" />
          <circle cx="15" cy="19" r="1" />
        </svg>
      </div>

      {isEditing ? (
        <>
          <input
            type="text"
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            className="flex-1 px-3 py-2 bg-[#000814] border border-gray-800 rounded text-sm text-white focus:border-gray-600 focus:outline-none transition-colors"
            onKeyPress={(e) => e.key === 'Enter' && onUpdateZone(zone.id)}
            autoFocus
          />
          <button
            onClick={() => onUpdateZone(zone.id)}
            className="text-green-500 hover:text-green-400 transition-colors p-1"
            title="Save changes"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </button>
          <button
            onClick={onCancelEdit}
            className="text-gray-500 hover:text-white transition-colors p-1"
            title="Cancel editing"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 text-white text-sm">{zone.name}</span>
          <button
            onClick={() => onStartEdit(zone)}
            className="text-gray-500 hover:text-white transition-colors p-1"
            title={t('editZoneName')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            onClick={() => onDeleteZone(zone.id)}
            className="text-gray-500 hover:text-red-400 transition-colors p-1"
            disabled={totalZones <= 1}
            title={totalZones <= 1 ? t('cannotDeleteLastZone') : t('deleteZoneTooltip')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
};

const ZoneModal: React.FC<ZoneModalProps> = ({ isOpen, onClose }) => {
  const { zones, addZone, updateZone, deleteZone, reorderZones } = useContext(ZoneContext);
  const { t } = useLanguage();
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [newZoneName, setNewZoneName] = useState("");
  const [editName, setEditName] = useState("");
  const [localZones, setLocalZones] = useState<Zone[]>(zones);
  const [isReordering, setIsReordering] = useState(false);
  const [activeZone, setActiveZone] = useState<Zone | null>(null);
  
  // GLOBAL MODAL INPUT LOCK FIX: Delayed modal content rendering
  const [showModalContent, setShowModalContent] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [zoneToDelete, setZoneToDelete] = useState<string | null>(null);
  
  // Alert modal state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    type: 'error' as 'info' | 'error' | 'success'
  });

  // Helper function to show alert modal
  const showAlert = useCallback((title: string, message: string, type: 'info' | 'error' | 'success' = 'error') => {
    setAlertConfig({ title, message, type });
    setShowAlertModal(true);
  }, []);
  
  useEffect(() => {
    if (isOpen) {
      console.log('🚀 ZoneModal opening with delayed content rendering...');
      console.log('📍 Active element on modal open:', document.activeElement);
      const timeout = setTimeout(() => setShowModalContent(true), 0);
      return () => clearTimeout(timeout);
    } else {
      setShowModalContent(false);
    }
  }, [isOpen]);

  // Update local zones when context zones change (but not during reordering)
  React.useEffect(() => {
    if (!isReordering) {
      setLocalZones([...zones].sort((a, b) => a.order - b.order));
    }
  }, [zones, isReordering]);

  // Global modal open/close events for backdrop/timeline layering
  React.useEffect(() => {
    if (!isOpen) return;
    try { window.dispatchEvent(new CustomEvent('modal-open')); } catch {}
    return () => { try { window.dispatchEvent(new CustomEvent('modal-close')); } catch {} };
  }, [isOpen]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!isOpen || !showModalContent) return null;

  const handleAddZone = async () => {
    if (newZoneName.trim()) {
      await addZone(newZoneName.trim());
      setNewZoneName("");
    }
  };

  const handleUpdateZone = async (zoneId: string) => {
    if (editName.trim()) {
      await updateZone(zoneId, editName.trim());
      setEditingZone(null);
      setEditName("");
    }
  };

  const handleDeleteZone = (zoneId: string) => {
    setZoneToDelete(zoneId);
    setShowDeleteModal(true);
  };

  const confirmDeleteZone = async () => {
    if (zoneToDelete) {
      await deleteZone(zoneToDelete);
      setZoneToDelete(null);
    }
  };

  const startEditing = (zone: Zone) => {
    setEditingZone(zone.id);
    setEditName(zone.name);
  };

  const cancelEditing = () => {
    setEditingZone(null);
    setEditName("");
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const zone = localZones.find(z => z.id === active.id);
    setActiveZone(zone || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveZone(null);

    if (active.id !== over?.id) {
      const oldIndex = localZones.findIndex((zone) => zone.id === active.id);
      const newIndex = localZones.findIndex((zone) => zone.id === over?.id);
      
      const reorderedZones = arrayMove(localZones, oldIndex, newIndex);
      
      // Optimistic UI update - update local state immediately
      setLocalZones(reorderedZones);
      setIsReordering(true);
      
      try {
        console.log('🔄 Reordering zones...');
        
        // Update the order in the database
        await reorderZones(reorderedZones);
        
        console.log('✅ Zones reordered successfully');
        
        // The ZoneContext will automatically update and trigger a re-fetch
        // which will update both the modal and the main layout tabs
        
      } catch (error) {
        console.error('❌ Failed to reorder zones:', error);
        
        // Rollback optimistic update on failure
        setLocalZones([...zones].sort((a, b) => a.order - b.order));
        
        // Show user-friendly error message
        showAlert('Reorder Failed', 'Failed to reorder zones. Please try again.', 'error');
        
      } finally {
        setIsReordering(false);
      }
    }
  };

  const handleDragCancel = () => {
    setActiveZone(null);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm backdrop-brightness-75 z-[200] flex items-center justify-center">
      <div className="w-full max-w-md mx-auto flex flex-col p-4">
        <div className="bg-[#000814] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800 flex-shrink-0">
            <h2 className="text-lg font-light text:white tracking-wide">{t('manageZones')}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors p-1"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 statistics-scrollbar">
            {/* Add new zone */}
            <div className="mb-6">
              <label className="block text-xs text-gray-500 mb-1">{t('addNewZone')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder={t('zoneName')}
                  className="flex-1 px-3 py-2 bg-[#0A1929] border border-gray-800 rounded text-sm text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none transition-colors"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddZone()}
                  autoFocus
                />
                <button
                  onClick={handleAddZone}
                  disabled={!newZoneName.trim()}
                  className="px-4 py-1.5 text-[#FFB800] text-sm rounded hover:bg-[#FFB800]/10 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('addZone')}
                </button>
              </div>
            </div>

            {/* Draggable zones list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-500">{t('existingZones')}</label>
                <span className="text-xs text-gray-500">{t('dragToReorder')}</span>
              </div>
              
              {isReordering && (
                <div className="flex items-center gap-2 text-xs text-[#FFB800]">
                  <div className="animate-spin rounded-full h-3 w-3 border border-[#FFB800] border-t-transparent"></div>
                  {t('saving')}
                </div>
              )}
              
              {/* Zones container */}
              <div 
                className="space-y-2 max-h-64 overflow-y-auto pr-1 statistics-scrollbar"
                id="zones-container"
              >
                <DndContext
                  sensors={sensors}
                  collisionDetection={rectIntersection}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragCancel={handleDragCancel}
                  modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                >
                  <SortableContext items={localZones.map(z => z.id)} strategy={verticalListSortingStrategy}>
                    {localZones.map((zone) => (
                      <SortableZoneItem
                        key={zone.id}
                        zone={zone}
                        isEditing={editingZone === zone.id}
                        editName={editName}
                        onStartEdit={startEditing}
                        onUpdateZone={handleUpdateZone}
                        onCancelEdit={cancelEditing}
                        onEditNameChange={setEditName}
                        onDeleteZone={handleDeleteZone}
                        totalZones={localZones.length}
                        t={t}
                      />
                    ))}
                  </SortableContext>
                  {/* Removed DragOverlay to keep dragging within container and avoid zoom drift */}
                </DndContext>
              </div>
              
              {localZones.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  {t('noZonesYet')} {t('addFirstZone')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setZoneToDelete(null);
        }}
        onConfirm={confirmDeleteZone}
        title={t('deleteZoneTitle')}
        message={t('deleteZoneMessage')}
        confirmText={t('deleteZoneButton')}
        cancelText={t('cancel')}
        type="delete"
      />

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

export default ZoneModal; 