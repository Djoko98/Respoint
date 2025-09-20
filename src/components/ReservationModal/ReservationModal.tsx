import React, { useState, useContext, useEffect } from "react";
import { ReservationContext, Reservation } from "../../context/ReservationContext";
import { ZoneContext } from "../../context/ZoneContext";
import { LayoutContext } from "../../context/LayoutContext";
import ReservationForm from "../ReservationForm/ReservationForm";
import DeleteConfirmationModal from "../common/DeleteConfirmationModal";
import { formatTableNames } from "../../utils/tableHelper";
import { useLanguage } from "../../context/LanguageContext";

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation | null;
  onEdit?: (reservation: Reservation) => void;
}

const ReservationModal: React.FC<ReservationModalProps> = ({ isOpen, onClose, reservation, onEdit }) => {
  const { t } = useLanguage();
  const { deleteReservation, fetchReservations } = useContext(ReservationContext);
  const { zones } = useContext(ZoneContext);
  const { layout, zoneLayouts } = useContext(LayoutContext);
  
  const [showEditForm, setShowEditForm] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // GLOBAL MODAL INPUT LOCK FIX: Delayed ReservationForm rendering
  useEffect(() => {
    if (showEditForm) {
      console.log('🚀 ReservationModal opening with delayed content rendering...');
      console.log('📍 Active element on modal open:', document.activeElement);
      const timeout = setTimeout(() => setShowForm(true), 0);
      return () => clearTimeout(timeout);
    } else {
      setShowForm(false);
    }
  }, [showEditForm]);

  useEffect(() => {
    if (!isOpen) return;
    try { window.dispatchEvent(new CustomEvent('modal-open')); } catch {}
    return () => { try { window.dispatchEvent(new CustomEvent('modal-close')); } catch {} };
  }, [isOpen]);

  if (!isOpen || !reservation) return null;

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteReservation(reservation.id);
      
      // Refresh reservations list to reflect changes immediately
      await fetchReservations();
      
      onClose();
    } catch (error) {
      console.error('❌ Failed to delete reservation:', error);
      // Don't close modal if delete failed
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(reservation);
      onClose();
    }
  };

  const getZoneName = (zoneId: string) => {
    const zone = zones.find(z => z.id === zoneId);
    return zone?.name || 'Unknown Zone';
  };

  const getTableNames = (tableIds: string[]) => {
    return formatTableNames(tableIds, zoneLayouts);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (showEditForm && showForm) {
    return (
      <ReservationForm
        isOpen={showForm}
        onClose={() => setShowEditForm(false)}
        editReservation={reservation}
      />
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm backdrop-brightness-75 z-[200]" 
        onClick={onClose}
      />
      
      {/* Modal panel */}
      <div className="fixed right-0 top-0 h-full w-96 bg-[#000814] border-l border-gray-800 shadow-2xl z-[201] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-light text-white tracking-wide">{t('reservationDetails')}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors p-1"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Status badge */}
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded text-sm ${
              reservation.status === 'confirmed' 
                ? 'bg-green-500/10 text-green-400'
                : reservation.status === 'arrived'
                ? 'bg-green-500/10 text-green-400'
                : reservation.status === 'not_arrived'
                ? 'bg-red-500/10 text-red-400'
                : reservation.status === 'cancelled'
                ? 'bg-gray-500/10 text-gray-400'
                : reservation.status === 'pending'
                ? 'bg-yellow-500/10 text-yellow-400'
                : 'bg-blue-500/10 text-blue-400'
            }`}>
              {reservation.status === 'not_arrived' ? t('notArrived') : 
               reservation.status === 'arrived' ? t('arrived') :
               reservation.status === 'cancelled' ? t('cancelled') :
               reservation.status === 'confirmed' ? t('confirmed') :
               reservation.status === 'waiting' ? t('waiting') :
               reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
            </span>
            <span className="text-gray-500 text-xs">
              {t('created')} {new Date(reservation.createdAt).toLocaleDateString('en-GB')}
            </span>
          </div>
        </div>

        {/* Content - View Mode */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 statistics-scrollbar">
          {/* Guest Info */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">{reservation.guestName}</h3>
            
            <div className="space-y-3">
              {/* Date & Time */}
              <div className="bg-[#0A1929] border border-gray-800 rounded p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500 text-xs block mb-1">{t('date')}</span>
                    <span className="text-white text-sm">{formatDate(reservation.date)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs block mb-1">{t('time')}</span>
                    <span className="text-white text-sm">{reservation.time}</span>
                  </div>
                </div>
              </div>

              {/* Party Size & Zone */}
              <div className="bg-[#0A1929] border border-gray-800 rounded p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500 text-xs block mb-1">{t('numberOfGuests')}</span>
                    <span className="text-white text-sm">{reservation.numberOfGuests} {t('guests')}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs block mb-1">{t('zone')}</span>
                    <span className="text-white text-sm">{getZoneName(reservation.zoneId)}</span>
                  </div>
                </div>
              </div>

              {/* Tables */}
              <div className="bg-[#0A1929] border border-gray-800 rounded p-4">
                <span className="text-gray-500 text-xs block mb-1">{t('tables')}</span>
                <span className="text-white text-sm">{getTableNames(reservation.tableIds || [])}</span>
              </div>

              {/* Contact Info */}
              {(reservation.phone || reservation.email) && (
                <div className="bg-[#0A1929] border border-gray-800 rounded p-4">
                  <span className="text-gray-500 text-xs block mb-1">{t('contactInformation')}</span>
                  <div className="space-y-2">
                    {reservation.phone && (
                      <div>
                        <span className="text-white text-sm">{reservation.phone}</span>
                      </div>
                    )}
                    {reservation.email && (
                      <div>
                        <span className="text-white text-sm">{reservation.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {reservation.notes && (
                <div className="bg-[#0A1929] border border-gray-800 rounded p-4">
                  <span className="text-gray-500 text-xs block mb-1">{t('notes')}</span>
                  <p className="text-white text-sm whitespace-pre-wrap">{reservation.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-800">
          <div className="flex gap-3">
            {/* Only show Edit button if reservation is not finalized */}
            {(!reservation.status || reservation.status === 'waiting' || reservation.status === 'confirmed') && (
              <button
                onClick={() => {
                  console.log('🚀 Opening edit form with delayed rendering...');
                  setShowEditForm(true);
                }}
                className="flex-1 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              >
                {t('edit')}
              </button>
            )}
            <button
              onClick={handleDelete}
              className={`py-2 text-red-400 text-sm rounded hover:bg-red-500/10 transition-colors ${
                (!reservation.status || reservation.status === 'waiting' || reservation.status === 'confirmed') ? 'flex-1' : 'w-full'
              }`}
            >
              {t('delete')}
            </button>
          </div>
          {/* Show message for finalized reservations */}
          {(reservation.status === 'arrived' || reservation.status === 'not_arrived' || reservation.status === 'cancelled') && (
            <p className="text-gray-500 text-xs mt-3 text-center">
              {t('finalizedCannotEdit')}
            </p>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title={t('deleteReservation')}
        message={t('deleteReservationMessage').replace('{name}', reservation?.guestName || '')}
        confirmText={t('deleteReservation')}
        type="delete"
      />
    </>
  );
};

export default ReservationModal; 