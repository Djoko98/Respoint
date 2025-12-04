import React, { useContext, useMemo, useState, useCallback } from "react";
import { ZoneContext } from "../../context/ZoneContext";
import { LayoutContext } from "../../context/LayoutContext";
import { useLanguage } from "../../context/LanguageContext";
import { useRolePermissions } from "../../hooks/useRolePermissions";
import ZoneModal from "./ZoneModal";
import DeleteConfirmationModal from "../common/DeleteConfirmationModal";

const ZoneTabs: React.FC = () => {
  const { zones, currentZone, setCurrentZone, showZoneModal, setShowZoneModal } = useContext(ZoneContext);
  const { isEditing } = useContext(LayoutContext);
  const { hasPermission } = useRolePermissions();
  const { t } = useLanguage();
  const canManageZones = hasPermission('manage_zones');
  
  // Alert modal state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'error' | 'success' | 'warning'
  });

  // Helper function to show alert modal
  const showAlert = useCallback((title: string, message: string, type: 'info' | 'error' | 'success' | 'warning' = 'info') => {
    setAlertConfig({ title, message, type });
    setShowAlertModal(true);
  }, []);
  
  // Ensure zones are always sorted by order
  const sortedZones = useMemo(() => {
    return [...zones].sort((a, b) => a.order - b.order);
  }, [zones]);
  
  const handleZoneChange = (zone: any) => {
    if (isEditing) {
      showAlert(t('saveRequired'), t('saveBeforeSwitchingZones'), "warning");
      return;
    }
    setCurrentZone(zone);
  };

  const handleShowZoneModal = () => {
    if (isEditing) {
      showAlert(t('saveRequired'), t('saveBeforeManagingZones'), "warning");
      return;
    }
    if (!canManageZones) {
      showAlert(t('actionNotAllowed'), t('insufficientPermissions'), 'error');
      return;
    }
    setShowZoneModal(true);
  }

  return (
    <>
      <div className="flex items-center gap-0">
        {sortedZones.map((zone) => (
          <button
            key={zone.id}
            onClick={() => handleZoneChange(zone)}
            disabled={isEditing && currentZone?.id !== zone.id}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              currentZone?.id === zone.id
                ? "text-[#FFB800] border-b-2 border-[#FFB800]"
                : "text-gray-500 border-b-2 border-transparent hover:text-gray-300"
            } ${isEditing && currentZone?.id !== zone.id ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            {zone.name}
          </button>
        ))}
        
        {/* Plus button */}
        <button
          onClick={handleShowZoneModal}
          disabled={isEditing || !canManageZones}
          className={`ml-4 w-5 h-5 rounded-full border border-[#FFB800] text-[#FFB800] flex items-center justify-center hover:bg-[#FFB800] hover:text-[#0A1929] transition-all duration-200 ${
            isEditing || !canManageZones ? 'cursor-not-allowed opacity-50' : ''
          }`}
          title={t('manageZones')}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>

      {/* Zone Management Modal */}
      <ZoneModal 
        isOpen={showZoneModal} 
        onClose={() => setShowZoneModal(false)} 
      />

      {/* Alert Modal */}
      <DeleteConfirmationModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
      />
    </>
  );
};

export default ZoneTabs;
