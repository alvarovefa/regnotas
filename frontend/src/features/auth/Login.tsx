import { useState } from 'react';
import { UserCircle, Lock, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

export default function Login() {
  const { login } = useAuth();
  const [step, setStep] = useState<'rut' | 'setup' | 'login'>('rut');
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const formatRut = (value: string) => {
    let clean = value.replace(/[^0-9Kk]/g, '').toUpperCase();
    if (clean.length > 1) {
      clean = clean.slice(0, -1) + '-' + clean.slice(-1);
    }
    return clean;
  };

  const handleCheckRut = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/check-rut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rut }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Error al verificar RUT');

      setName(data.name);
      if (data.status === 'needs_password') {
        setStep('setup');
      } else {
        setStep('login');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginOrSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rut, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Error al autenticar');

      if (data.token) localStorage.setItem('token', data.token);
      login(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative flex items-center justify-center p-4 overflow-hidden">
      {/* Background Decorators */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/50 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-200/50 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative bg-white/70 backdrop-blur-xl p-8 sm:p-10 rounded-[2rem] shadow-2xl shadow-indigo-900/5 w-full max-w-md border border-white/50"
      >
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-violet-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/30"
          >
            <Sparkles className="w-8 h-8" />
          </motion.div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
            {step === 'rut' ? 'Bienvenido' : step === 'setup' ? 'Crear Clave' : 'Iniciar Sesión'}
          </h2>
          <p className="text-slate-500 mt-2 font-medium">
            {step === 'rut' && 'Ingresa tu RUT para acceder a la plataforma.'}
            {step === 'setup' && `Hola ${name}, ingresa una contraseña segura.`}
            {step === 'login' && `Hola de vuelta, ${name}.`}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-rose-50/80 backdrop-blur-sm text-rose-600 rounded-2xl text-sm font-semibold text-center border border-rose-100/50"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {step === 'rut' ? (
            <motion.form 
              key="rut-form"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              onSubmit={handleCheckRut} 
              className="space-y-6"
            >
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 ml-1">RUT</label>
                <div className="relative">
                  <UserCircle className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="12345678-9"
                    value={rut}
                    onChange={(e) => setRut(formatRut(e.target.value))}
                    className={cn(
                      "w-full pl-11 pr-4 py-3.5 rounded-2xl border bg-white/50 backdrop-blur-sm outline-none transition-all duration-300 font-medium text-slate-800",
                      rut.length >= 9 && !error ? "border-emerald-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" 
                      : error ? "border-rose-200 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10" 
                      : "border-slate-200/80 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    )}
                    required
                  />
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading || rut.length < 9}
                className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-semibold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-slate-900 shadow-md shadow-slate-900/10"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continuar'}
                {!loading && <ArrowRight className="w-5 h-5" />}
              </motion.button>
            </motion.form>
          ) : (
            <motion.form 
              key="pwd-form"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              onSubmit={handleLoginOrSetup} 
              className="space-y-6"
            >
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 ml-1">
                  {step === 'setup' ? 'Nueva Contraseña' : 'Contraseña'}
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cn(
                      "w-full pl-11 pr-4 py-3.5 rounded-2xl border bg-white/50 backdrop-blur-sm outline-none transition-all duration-300 font-medium text-slate-800",
                      password.length >= 4 && !error ? "border-emerald-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" 
                      : error ? "border-rose-200 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10" 
                      : "border-slate-200/80 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    )}
                    required
                  />
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading || password.length < 4}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-600/20"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (step === 'setup' ? 'Guardar y Entrar' : 'Acceder')}
              </motion.button>
              <button
                type="button"
                onClick={() => { setStep('rut'); setPassword(''); setError(''); }}
                className="w-full text-slate-400 text-sm font-semibold hover:text-slate-600 transition-colors"
              >
                Volver atrás
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
