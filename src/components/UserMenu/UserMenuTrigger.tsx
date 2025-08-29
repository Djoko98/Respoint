import React, { useContext, useState } from "react";
import { UserContext } from "../../context/UserContext";
import UserMenu from "./UserMenu";

const UserMenuTrigger: React.FC = () => {
  const { user, isAuthenticated } = useContext(UserContext);
  const [showMenu, setShowMenu] = useState(false);

  if (!isAuthenticated) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white hover:bg-gray-600 transition"
      >
        {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
      </button>
      
      <UserMenu isOpen={showMenu} onClose={() => setShowMenu(false)} />
    </div>
  );
};

export default UserMenuTrigger;
