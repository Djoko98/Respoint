import React, { useContext, useState } from "react";
import { UserContext } from "../../context/UserContext";
import UserMenu from "./UserMenu";
import { ThemeContext } from "../../context/ThemeContext";

const UserMenuTrigger: React.FC = () => {
  const { user, isAuthenticated } = useContext(UserContext);
  const [showMenu, setShowMenu] = useState(false);
  const { theme } = useContext(ThemeContext);
  const isLight = theme === 'light';

  if (!isAuthenticated) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
          isLight ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' : 'bg-gray-700 text-white hover:bg-gray-600'
        }`}
      >
        {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
      </button>
      
      <UserMenu isOpen={showMenu} onClose={() => setShowMenu(false)} />
    </div>
  );
};

export default UserMenuTrigger;
