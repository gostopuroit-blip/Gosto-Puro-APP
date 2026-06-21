import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState({});
  const settledRef = useRef(false);

  useEffect(() => {
    // Fail-safe: NUNCA deixar a tela branca travada. Se getSession rejeitar/travar
    // (deadlock conhecido do navigator.locks em PWA, ou sessão corrompida), ou se o
    // carregamento demorar demais, manda pro login em vez de ficar no spinner pra sempre.
    const goLogin = (message) => {
      if (settledRef.current) return;
      settledRef.current = true;
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_required', message });
      setIsLoadingAuth(false);
    };

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (settledRef.current) return;
        if (session?.user) {
          loadProfile(session.user);
        } else {
          goLogin('Authentication required');
        }
      })
      .catch((err) => {
        console.error('getSession failed', err);
        goLogin('Authentication required');
      });

    // Watchdog: se em 8s nada resolveu, libera a tela (cai no login) em vez de travar.
    const watchdog = setTimeout(() => goLogin('Authentication timeout'), 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Recupero password: o link de reset pode cair em qualquer rota (ex.: raiz,
      // quando o Supabase usa o Site URL). Marca o modo recovery e leva ao /Login,
      // que mostra a tela de "nuova password" — evita o usuário ficar preso na Home.
      if (_event === 'PASSWORD_RECOVERY') {
        try { sessionStorage.setItem('gp_pw_recovery', '1'); } catch (_) { /* ignore */ }
        if (!window.location.pathname.toLowerCase().startsWith('/login')) {
          window.location.replace('/Login');
          return;
        }
      }
      if (session?.user) {
        loadProfile(session.user);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      }
    });

    return () => { clearTimeout(watchdog); subscription.unsubscribe(); };
  }, []);

  const loadProfile = async (authUser) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      const fullUser = {
        ...profile,
        id: authUser.id,
        email: authUser.email,
        plan: profile?.plan || 'free',
        role: profile?.role || 'user',
      };

      settledRef.current = true;
      setUser(fullUser);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch {
      settledRef.current = true;
      setUser({ id: authUser.id, email: authUser.email, plan: 'free', role: 'user' });
      setIsAuthenticated(true);
      setAuthError(null);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = async (shouldRedirect = true) => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      window.location.href = '/Login';
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/Login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState: () => {},
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
