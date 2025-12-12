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
  fullScreen?: boolean;
  hideHeaderBorder?: boolean;
  /**
   * Optional visual/layout variant.
   * - 'default' (or undefined): centered modal over dimmed backdrop
   * - 'canvas-right': full-height panel aligned with the canvas area (to the right of sidebar)
   */
  variant?: 'default' | 'canvas-right';
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  hideCloseButton = false,
  contentScrollable = true,
  fullScreen = false,
  hideHeaderBorder = false,
  variant = 'default'
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

  let wrapperClasses: string;
  let innerClasses: string;

  if (variant === 'canvas-right') {
    // Panel aligned with the canvas area (to the right of the 20rem sidebar)
    wrapperClasses =
      'fixed left-80 right-0 bottom-0 top-[var(--titlebar-h)] bg-[#0A1929] z-[12000] flex items-stretch justify-center p-0';
    innerClasses =
      'bg-[#000814] w-full h-full max-w-none rounded-none shadow-none overflow-hidden flex flex-col';
  } else if (fullScreen) {
    wrapperClasses =
      'fixed inset-x-0 bottom-0 top-[var(--titlebar-h)] bg-black/70 backdrop-blur-sm z-[12000] flex items-stretch justify-center p-0';
    innerClasses =
      'bg-[#000814] w-full h-full max-w-none rounded-none shadow-2xl overflow-hidden flex flex-col';
  } else {
    wrapperClasses =
      'fixed inset-x-0 bottom-0 top-[var(--titlebar-h)] bg-black/70 backdrop-blur-sm z-[12000] flex items-center justify-center p-4';
    innerClasses = `bg-[#000814] rounded-lg shadow-2xl w-full ${sizeClasses[size]} max-h-[92vh] overflow-hidden flex flex-col`;
  }

  const headerClasses = hideHeaderBorder
    ? 'flex items-center justify-between px-6 py-4'
    : 'flex items-center justify-between px-6 py-4 border-b border-gray-800';

  const modalContent = (
    <div className={wrapperClasses}>
      <div className={innerClasses}>
        {/* Header */}
        <div className={headerClasses}>
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
        <div
          className={
            contentScrollable
              ? 'modal-content flex-1 overflow-y-auto statistics-scrollbar'
              : 'modal-content flex-1 overflow-hidden flex flex-col'
          }
        >
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