import React, { useContext, useState } from "react";
import { UserContext } from "../../context/UserContext";
import { useLanguage } from "../../context/LanguageContext";
import AccountSettings from "../AccountSettings/AccountSettings";
import Statistics from "../Statistics/Statistics";
import Subscribe from "../Subscribe/Subscribe";
import DeleteConfirmationModal from "../common/DeleteConfirmationModal";
import { ThemeContext } from "../../context/ThemeContext";

interface UserMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ isOpen, onClose }) => {
  const { user, logout, isAuthenticated, activeRole } = useContext(UserContext);
  const { t } = useLanguage();
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { theme } = useContext(ThemeContext);
  const isLight = theme === 'light';

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    onClose();
    await logout();
    // Refresh the page to ensure clean state
    window.location.reload();
  };

  const handleAccountSettings = () => {
    setShowAccountSettings(true);
    onClose();
  };

  const handleStatistics = () => {
    setShowStatistics(true);
    onClose();
  };

  const handleSubscribe = () => {
    setShowSubscribe(true);
    onClose();
  };

  const menuItems = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
        </svg>
      ),
      label: t('accountSettings'),
      action: handleAccountSettings
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ),
      label: t('subscribe'),
      action: handleSubscribe
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
        </svg>
      ),
      label: t('statistics'),
      action: handleStatistics
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
        </svg>
      ),
      label: t('logout'),
      action: handleLogout,
      className: isLight ? "text-red-600 hover:text-red-700" : "text-red-400 hover:text-red-300"
    }
  ];

  return (
    <>
      {/* Render menu only when open and authenticated */}
      {isOpen && isAuthenticated && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={onClose}
          />
          
          {/* Menu */}
          <div className={`absolute right-0 top-full mt-2 w-64 rounded-lg shadow-xl border z-[80] ${isLight ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-800'}`}>
            {/* User Info */}
            <div className={`p-4 border-b ${isLight ? 'border-gray-200' : 'border-gray-800'}`}>
              <p className={`${isLight ? 'text-gray-900' : 'text-white'} font-medium truncate`} title={user?.name}>{user?.name}</p>
              <p 
                className={`${isLight ? 'text-gray-600' : 'text-gray-400'} text-sm truncate cursor-default`} 
                title={user?.email}
              >
                {user?.email}
              </p>
              {user?.restaurantName && (
                <p 
                  className={`${isLight ? 'text-gray-500' : 'text-gray-500'} text-xs mt-1 truncate`} 
                  title={user.restaurantName}
                >
                  {user.restaurantName}
                </p>
              )}
            </div>

            {/* Menu Items */}
            <div className="py-2">
              {menuItems.map((item, index) => {
                const isDisabled =
                  ((activeRole === 'manager' || activeRole === 'waiter') &&
                   (item.label === t('accountSettings') || item.label === t('subscribe')));
                return (
                  <button
                    key={index}
                    onClick={() => {
                      if (isDisabled) return;
                      item.action();
                      if (item.label !== t('accountSettings')) {
                        onClose();
                      }
                    }}
                    className={`w-full px-4 py-3 flex items-center gap-3 transition ${
                      isDisabled
                        ? (isLight ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 cursor-not-allowed')
                        : (item.className || (isLight ? 'text-gray-700 hover:text-gray-900 hover:bg-gray-50' : 'text-gray-300 hover:text-white hover:bg-gray-800'))
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Account Settings Modal - rendered outside of menu condition */}
      <AccountSettings 
        isOpen={showAccountSettings}
        onClose={() => setShowAccountSettings(false)}
      />
      
      {/* Statistics Modal */}
      <Statistics
        isOpen={showStatistics}
        onClose={() => setShowStatistics(false)}
      />

      {/* Subscribe Modal */}
      <Subscribe
        isOpen={showSubscribe}
        onClose={() => setShowSubscribe(false)}
      />
      
      {/* Logout Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
        title={t('confirmLogout')}
        message={t('logoutMessage')}
        confirmText={t('logOutButton')}
        cancelText={t('stayLoggedIn')}
        type="danger"
      />
    </>
  );
};

export default UserMenu;
