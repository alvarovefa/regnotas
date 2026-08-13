import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';

type User = {
  id: number;
  rut: string;
  nombre_completo: string;
  foto_perfil?: string;
  rol: 'alumno' | 'profesor' | 'directivo' | 'administrador';
};

type AuthContextType = {
  user: User | null;
  login: (user: User) => void;
  logout: (reason?: string) => void;
  sessionMessage: string | null;
  clearSessionMessage: () => void;
};

const INACTIVITY_LIMIT_MS = 10 * 60 * 1000; // 10 minutos de inactividad
const CLOSED_LIMIT_MS = 5 * 60 * 1000;     // 5 minutos con la página cerrada

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  // Verificar validez de la sesión al cargar la app
  const checkInitialSession = (): User | null => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) return null;

    const now = Date.now();

    // 1. Verificar tiempo transcurrido desde que se cerró la web
    const lastClosed = localStorage.getItem('last_closed_timestamp');
    if (lastClosed) {
      const closedElapsed = now - Number(lastClosed);
      if (closedElapsed > CLOSED_LIMIT_MS) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('last_activity_timestamp');
        localStorage.removeItem('last_closed_timestamp');
        setSessionMessage('Tu sesión ha expirado tras haber cerrado la página por más de 5 minutos.');
        return null;
      }
    }

    // 2. Verificar inactividad (10 minutos)
    const lastActivity = localStorage.getItem('last_activity_timestamp');
    if (lastActivity) {
      const activityElapsed = now - Number(lastActivity);
      if (activityElapsed > INACTIVITY_LIMIT_MS) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('last_activity_timestamp');
        localStorage.removeItem('last_closed_timestamp');
        setSessionMessage('Tu sesión ha expirado por inactividad (10 minutos sin interacción).');
        return null;
      }
    }

    // Si todo está dentro del límite, mantenemos la sesión y reseteamos el marcador de cierre
    localStorage.removeItem('last_closed_timestamp');
    localStorage.setItem('last_activity_timestamp', String(now));
    try {
      return JSON.parse(savedUser);
    } catch {
      return null;
    }
  };

  const [user, setUser] = useState<User | null>(checkInitialSession);
  const lastActivityRef = useRef<number>(Date.now());

  const logout = useCallback((reason?: string) => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('last_activity_timestamp');
    localStorage.removeItem('last_closed_timestamp');

    if (reason === 'inactivity') {
      setSessionMessage('Tu sesión ha expirado por inactividad (10 minutos sin interacción).');
    } else if (reason === 'closed_timeout') {
      setSessionMessage('Tu sesión ha expirado tras haber cerrado la página por más de 5 minutos.');
    }
  }, []);

  const login = (userData: User) => {
    const now = Date.now();
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('last_activity_timestamp', String(now));
    localStorage.removeItem('last_closed_timestamp');
    lastActivityRef.current = now;
    setSessionMessage(null);
  };

  const clearSessionMessage = () => {
    setSessionMessage(null);
  };

  // Guardar marca de tiempo al cerrar la ventana/pestaña
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (localStorage.getItem('user')) {
        const now = Date.now();
        localStorage.setItem('last_closed_timestamp', String(now));
        localStorage.setItem('last_activity_timestamp', String(now));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Detector de interacción del usuario (resetea el timer de inactividad de 10 min)
  useEffect(() => {
    if (!user) return;

    let throttleTimer: ReturnType<typeof setTimeout> | null = null;

    const handleUserInteraction = () => {
      if (throttleTimer) return;

      throttleTimer = setTimeout(() => {
        throttleTimer = null;
      }, 2000);

      const now = Date.now();
      lastActivityRef.current = now;
      localStorage.setItem('last_activity_timestamp', String(now));
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => window.addEventListener(event, handleUserInteraction, { passive: true }));

    // Timer de verificación en segundo plano cada 5 segundos
    const interval = setInterval(() => {
      const now = Date.now();
      const storedLastActivity = Number(localStorage.getItem('last_activity_timestamp') || lastActivityRef.current);
      const elapsed = now - storedLastActivity;

      if (elapsed >= INACTIVITY_LIMIT_MS) {
        logout('inactivity');
      }
    }, 5000);

    return () => {
      events.forEach(event => window.removeEventListener(event, handleUserInteraction));
      clearInterval(interval);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [user, logout]);

  return (
    <AuthContext.Provider value={{ user, login, logout, sessionMessage, clearSessionMessage }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
