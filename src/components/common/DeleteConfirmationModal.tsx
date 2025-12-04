import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../context/LanguageContext';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'delete' | 'warning' | 'danger' | 'info' | 'success' | 'error';
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  type = 'delete'
}) => {
  const { t } = useLanguage();
  
  // Check if this is an informational modal (only OK button) - DEFINE EARLY
  const isInfoModal = type === 'info' || type === 'success' || type === 'error';

  // Handle keyboard accessibility
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        if (isInfoModal) {
          // For info modals, Enter closes the modal
          onClose();
        } else if (e.ctrlKey || e.metaKey) {
          // Ctrl/Cmd + Enter to confirm for action modals
          if (onConfirm) onConfirm();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    try { window.dispatchEvent(new CustomEvent('modal-open')); } catch {}
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
      try { window.dispatchEvent(new CustomEvent('modal-close')); } catch {}
    };
  }, [isOpen, onClose, onConfirm]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Focus the appropriate button based on modal type
      const timeout = setTimeout(() => {
        if (isInfoModal) {
          // For info modals, focus the OK button
          const okButton = document.querySelector('[data-ok-button]') as HTMLButtonElement;
          if (okButton) {
            okButton.focus();
          }
        } else {
          // For confirmation modals, focus the cancel button for safety
          const cancelButton = document.querySelector('[data-cancel-button]') as HTMLButtonElement;
          if (cancelButton) {
            cancelButton.focus();
          }
        }
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [isOpen, isInfoModal]);

  if (!isOpen) return null;



  const getConfirmButtonStyles = () => {
    switch (type) {
      case 'delete':
      case 'danger':
      case 'error':
        return 'text-red-400 hover:bg-red-500/10 transition-colors font-medium';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'success':
        return 'text-green-400 hover:bg-green-500/10 transition-colors font-medium';
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white';
    }
  };

  const modalContent = (
    <div className="fixed inset-x-0 bottom-0 top-[var(--titlebar-h)] bg-black/70 backdrop-blur-sm backdrop-brightness-75 z-[12050] flex items-center justify-center p-4">
      <div className="bg-[#000814] rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-xl font-light text-white tracking-wide">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1"
            aria-label="Close modal"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-8 text-center">
          <p className="text-gray-300 leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className={`flex items-center gap-3 px-6 py-4 border-t border-gray-800 justify-center`}>
          {isInfoModal ? (
            // Info modal - only OK button (centered)
            <button
              data-ok-button
              onClick={onClose}
              className={`px-6 py-2 text-sm rounded transition-colors font-medium ${getConfirmButtonStyles()}`}
            >
              {t('ok')}
            </button>
          ) : (
            // Confirmation modal - Cancel and Confirm buttons
            <>
              <button
                data-cancel-button
                onClick={onClose}
                className="px-4 py-2 text-gray-300 text-sm rounded hover:bg-gray-800 transition-colors font-medium"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  if (onConfirm) onConfirm();
                  onClose();
                }}
                className={`px-4 py-2 text-sm rounded transition-colors font-medium ${getConfirmButtonStyles()}`}
              >
                {confirmText}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // Use Portal to ensure modal renders on top of everything
  const portalTarget = document.getElementById('app-zoom-root') || document.body;
  return createPortal(modalContent, portalTarget);
};

export default DeleteConfirmationModal; 