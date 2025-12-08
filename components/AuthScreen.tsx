
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
        alert('Verifique seu email para confirmar o cadastro!');
        setMode('login');
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRandomGuest = () => {
    onGuestLogin({
      name: 'Visitante Demo',
      email: 'demo@shinko.os',
      role: 'dono'
    });
  };

  const primaryColor = customColor || '#F59E0B';
  const primaryTextColorStyle = { color: primaryColor };
  
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-white dark:bg-black/40 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 relative animate-in zoom-in-95 duration-300 backdrop-blur-xl ring-1 ring-white/10">
        
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5"/>
        </button>

        <div className="p-8 pb-0 flex flex-col items-center">
            {customLogoUrl ? (
                <img src={customLogoUrl} alt="Logo" className="h-16 w-auto mb-4" />
            ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center mb-4 shadow-lg">
                    <Sparkles className="w-8 h-8 text-white"/>
                </div>
            )}
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center">
                {customOrgName || 'Bem-vindo ao Shinkō OS'}
            </h2>
            <p className="text-sm text-slate-500 text-center mt-2">
                Sistema Operacional de Inovação
            </p>
        </div>

        <form onSubmit={handleAuth} className="p-8 space-y-4">
            {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold text-center">
                    {error}
                </div>
            )}

            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email</label>
                <div className="relative">
                    <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-3.5"/>
                    <input 
                        type="email" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-100 dark:bg-black/30 text-slate-900 dark:text-white border border-transparent dark:border-white/10 focus:border-amber-500 focus:bg-white dark:focus:bg-black/50 outline-none transition-all backdrop-blur-md"
                        placeholder="seu@email.com"
                        required
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Senha</label>
                <div className="relative">
                    <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-3.5"/>
                    <input 
                        type="password" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-100 dark:bg-black/30 text-slate-900 dark:text-white border border-transparent dark:border-white/10 focus:border-amber-500 focus:bg-white dark:focus:bg-black/50 outline-none transition-all backdrop-blur-md"
                        placeholder="••••••••"
                        required
                    />
                </div>
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                style={{ backgroundColor: primaryColor }}
            >
                {loading && <Loader2 className="w-4 h-4 animate-spin"/>}
                {mode === 'login' ? 'Entrar' : 'Criar Conta'}
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mt-4">
                <span>{mode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}</span>
                <button 
                    type="button"
                    onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                    className="font-bold hover:underline"
                    style={{ color: primaryColor }}
                >
                    {mode === 'login' ? 'Cadastre-se' : 'Faça Login'}
                </button>
            </div>
        </form>

        <div className="p-8 pt-0">
            <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                    <span className="bg-white dark:bg-black/20 px-2 text-slate-500 backdrop-blur-xl rounded">Ou continue como</span>
                </div>
            </div>

            <button 
                onClick={handleRandomGuest}
                className="w-full py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 group border border-transparent dark:border-white/5"
            >
                <Sparkles className="w-4 h-4 group-hover:brightness-110 transition-colors" style={primaryTextColorStyle} />
                Entrar como Convidado (Demo)
            </button>
        </div>

        <div className="py-4 text-center bg-slate-50 dark:bg-black/20 border-t border-slate-200 dark:border-white/10">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 opacity-60">
                Desenvolvido por Shinkō Systems©
            </span>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
