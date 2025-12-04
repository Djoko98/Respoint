import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  hideCloseButton?: boolean;
  contentScrollable?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  hideCloseButton = false,
  contentScrollable = true
}) => {
  // Handle keyboard events
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !hideCloseButton) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    try { window.dispatchEvent(new CustomEvent('modal-open')); } catch {}
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
      try { window.dispatchEvent(new CustomEvent('modal-close')); } catch {}
    };
  }, [isOpen, onClose, hideCloseButton]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-3xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    '3xl': 'max-w-7xl'
  };

  const modalContent = (
    <div className="fixed inset-x-0 bottom-0 top-[var(--titlebar-h)] bg-black/70 backdrop-blur-sm z-[12000] flex items-center justify-center p-4">
      <div className={`bg-[#000814] rounded-lg shadow-2xl w-full ${sizeClasses[size]} max-h-[92vh] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-xl font-light text-white tracking-wide">{title}</h2>
          {!hideCloseButton && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors p-1"
              aria-label="Close modal"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className={`modal-content flex-1 ${contentScrollable ? 'overflow-y-auto statistics-scrollbar' : 'overflow-hidden'}`}>
          {children}
        </div>
      </div>
    </div>
  );

  // Portal inside zoomed app root so auto-zoom affects modals; fallback to body
  const portalTarget = document.getElementById('app-zoom-root') || document.body;
  return createPortal(modalContent, portalTarget);
};

export default Modal; 