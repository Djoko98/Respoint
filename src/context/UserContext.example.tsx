import React, { createContext, useState, ReactNode, useEffect } from "react";
import { authService } from "../services/authService";
import { User, UserRole } from "../types/user";

interface UserContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string, restaurantName: string) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

export const UserContext = createContext<UserContextType>({
  user: null,
  isAuthenticated: false,
  login: async () => false,
  signup: async () => false,
  logout: () => {},
  setUser: () => {},
});

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const { success, user: currentUser } = await authService.getUser();
      if (success && currentUser) {
        setUser(currentUser);
      }
      setLoading(false);
    };

    initializeAuth();

    // Osluškuj promene autentifikacije
    const { data: authListener } = authService.onAuthStateChange(
      async (event, session) => {
        if (session) {
          const { success, user: currentUser } = await authService.getUser();
          if (success && currentUser) {
            setUser(currentUser);
          }
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const isAuthenticated = !!user;

  const login = async (email: string, password: string): Promise<boolean> => {
    const result = await authService.signIn(email, password);
    if (result.success) {
      const { success, user: currentUser } = await authService.getUser();
      if (success && currentUser) {
        setUser(currentUser);
      }
      return true;
    }
    return false;
  };

  const signup = async (
    email: string, 
    password: string, 
    name: string, 
    restaurantName: string
  ): Promise<boolean> => {
    const result = await authService.signUp(email, password, restaurantName, name);
    return result.success;
  };

  const logout = async () => {
    const result = await authService.signOut();
    if (result.success) {
      setUser(null);
    }
  };

  return (
    <UserContext.Provider value={{ 
      user, 
      isAuthenticated,
      login,
      signup,
      logout,
      setUser 
    }}>
      {!loading && children}
    </UserContext.Provider>
  );
}; 