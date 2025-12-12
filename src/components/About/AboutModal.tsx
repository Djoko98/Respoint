import React from 'react';
import Modal from '../common/Modal';
import { useLanguage } from '../../context/LanguageContext';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const { currentLanguage } = useLanguage();
  const [version, setVersion] = React.useState<string | null>(null);
  const [appName, setAppName] = React.useState<string>('ResPoint');

  React.useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    (async () => {
      try {
        // Dynamically import Tauri app API; in non‑desktop contexts this may fail.
        const mod = await import('@tauri-apps/api/app');
        const [v, name] = await Promise.all([
          mod.getVersion().catch(() => null),
          mod.getName().catch(() => null)
        ]);
        if (cancelled) return;
        if (name) setAppName(name);
        if (v) setVersion(v);
      } catch {
        if (!cancelled) {
          setVersion(null);
          setAppName('ResPoint');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const isSrb = currentLanguage === 'srb';

  const title = isSrb ? 'O aplikaciji' : 'About ResPoint';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="px-6 py-5 space-y-6 text-sm text-gray-300">
        {/* Title */}
        <div>
          <p className="text-base font-medium text-white mb-1">
            ResPoint – Restaurant Management System
          </p>
        </div>

        {/* Meta info */}
        <div className="space-y-1 text-sm">
          <p className="text-gray-300">
            <span className="font-medium">Version:</span>{' '}
            {version || '--trenutna verzija--'}
          </p>
          <p className="text-gray-300">
            <span className="font-medium">Platform:</span> Windows x64
          </p>
          <p className="text-gray-300">
            <span className="font-medium">Build Date:</span> December 2025
          </p>
        </div>

        {/* About */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white">
            About ResPoint
          </h3>
          <p className="text-sm text-gray-300">
            ResPoint is a modern, high-performance system designed to streamline reservation handling,
            table organization, and operational flow in hospitality environments.
          </p>
          <p className="text-sm text-gray-300">
            Created with precision, speed, and clarity in mind, ResPoint empowers restaurants to manage layouts,
            zones, seated guests, reservations, and staff workflows with complete control and efficiency.
          </p>
          <p className="text-sm text-gray-300">
            The application is built using cutting-edge desktop technologies, ensuring smooth performance,
            automatic updates, and a seamless user experience for everyday operations.
          </p>
        </div>

        {/* Developer */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white">
            Developer
          </h3>
          <p className="text-sm text-gray-300">
            Developed by Đorđe Stefanović,
            founder of the ResPoint platform.
          </p>
          <p className="text-sm text-gray-300">
            For inquiries, support, or business collaboration, please contact:
          </p>
          <p className="text-sm text-gray-300">
            <a
              href="mailto:respoint.support@gmail.com"
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
            >
              respoint.support@gmail.com
            </a>
          </p>
        </div>

        {/* Copyright */}
        <div className="space-y-2 border-t border-gray-800 pt-4">
          <p className="text-xs text-gray-400">
            © 2025 ResPoint. All rights reserved.
          </p>
          <p className="text-xs text-gray-500">
            Unauthorized distribution or modification of this software is prohibited.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default AboutModal;

