
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Mail, Lock, Loader2, Sparkles, X, ArrowRight, User } from 'lucide-react';

interface Props {
  onGuestLogin: (persona?: any) => void;
  onClose: () => void;
  customOrgName?: string;
  customLogoUrl?: string | null;
  customColor?: string;
}

const AuthScreen: React.FC<Props> = ({ onGuestLogin, onClose, customOrgName, customLogoUrl, customColor }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Verifique seu email!');
        setMode('login');
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const primaryColor = customColor || '#0f172a'; // Default slate-900

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-sm bg-white dark:bg-black rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 relative">
        
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5"/>
        </button>

        <div className="p-8 pb-0 flex flex-col items-center">
            {customLogoUrl ? (
                <img src={customLogoUrl} alt="Logo" className="h-12 w-auto mb-6" />
            ) : (
                <div className="w-12 h-12 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center mb-6 shadow-lg">
                    <span className="text-white dark:text-black font-bold text-xl">S</span>
                </div>
            )}
            <h2 className="text-xl font-bold text-slate-900 dark:text-white text-center">
                {customOrgName || 'Bem-vindo'}
            </h2>
            <p className="text-xs text-slate-500 text-center mt-2">
                Acesse sua conta para continuar.
            </p>
        </div>

        <form onSubmit={handleAuth} className="p-8 space-y-4">
            {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-xs font-bold text-center">
                    {error}
                </div>
            )}

            <div className="space-y-1">
                <input 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm outline-none focus:border-slate-400 transition-all"
                    placeholder="Email"
                    required
                />
            </div>

            <div className="space-y-1">
                <input 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm outline-none focus:border-slate-400 transition-all"
                    placeholder="Senha"
                    required
                />
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 rounded-xl text-white font-bold text-sm shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 bg-slate-900 dark:bg-white dark:text-black"
                style={customColor ? { backgroundColor: primaryColor } : {}}
            >
                {loading && <Loader2 className="w-4 h-4 animate-spin"/>}
                {mode === 'login' ? 'Entrar' : 'Criar Conta'}
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mt-4">
                <span>{mode === 'login' ? 'Novo por aqui?' : 'Já tem conta?'}</span>
                <button 
                    type="button"
                    onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                    className="font-bold hover:underline text-slate-900 dark:text-white"
                >
                    {mode === 'login' ? 'Cadastre-se' : 'Login'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default AuthScreen;
