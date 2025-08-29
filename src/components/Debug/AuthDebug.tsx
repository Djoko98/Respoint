import React, { useContext, useState, useEffect } from 'react';
import { UserContext } from '../../context/UserContext';
import { supabase } from '../../utils/supabaseClient';

const AuthDebug: React.FC = () => {
  const { user, isAuthenticated } = useContext(UserContext);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (!window.location.search.includes('debug=true')) {
    return null;
  }

  return (
    <div className="fixed top-0 right-0 bg-black/90 text-white p-4 m-4 rounded-lg text-xs max-w-sm z-[80]">
      <h3 className="font-bold mb-2">Auth Debug Info</h3>
      <div className="space-y-1">
        <p>Loading: {loading ? 'Yes' : 'No'}</p>
        <p>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
        <p>User: {user ? user.email : 'None'}</p>
        <p>Session: {session ? 'Active' : 'None'}</p>
        {session && (
          <>
            <p>Session User: {session.user?.email}</p>
            <p>Expires: {new Date(session.expires_at * 1000).toLocaleString()}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthDebug; 