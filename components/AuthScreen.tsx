
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { findOrgIdByOwnerEmail, createOrganization } from '../services/organizationService';
import { Loader2, X, ArrowRight, Eye, EyeOff, AlertTriangle } from 'lucide-react';

interface Props {
  onGuestLogin: (persona?: any) => void;
  onClose: () => void;
  customOrgName?: string;
  customLogoUrl?: string | null;
}

const LOGO_URL = "https://zjssfnbcboibqeoubeou.supabase.co/storage/v1/object/public/fotoperfil/fotoperfil/3.png";

const AuthScreen: React.FC<Props> = ({ onClose, customLogoUrl, customOrgName }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const displayLogo = customLogoUrl || LOGO_URL;
  const brandName = customOrgName || "Shinkō OS";

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (!name.trim()) throw new Error("Informe seu nome.");
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ 
            email, password, options: { data: { full_name: name, perfil: 'dono' } }
        });
        if (signUpError) throw signUpError;
        if (signUpData.user) {
            await createOrganization(signUpData.user.id, "Minha Empresa", 'Tecnologia', '', email, name);
        }
      }
      onClose();
    } catch (err: any) { 
        setErrorMessage(err.message);
    } finally { 
        setLoading(false); 
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-white/95 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm bg-white border border-slate-200 overflow-hidden relative rounded-2xl shadow-sm">
        
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 transition-colors z-20">
            <X className="w-5 h-5"/>
        </button>

        <div className="p-8 pt-12 text-center">
            <img src={displayLogo} alt={brandName} className="h-12 w-auto mx-auto mb-6" />
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {mode === 'login' ? 'Entrar no Shinkō' : 'Criar nova conta'}
            </h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-2">Gerenciamento Operacional</p>
        </div>

        {errorMessage && (
            <div className="mx-8 mb-4 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-[10px] text-red-600 font-bold leading-tight">
                <AlertTriangle className="w-4 h-4 shrink-0"/> {errorMessage}
            </div>
        )}

        <form onSubmit={handleAuth} className="px-8 pb-8 space-y-4">
            {mode === 'register' && (
                <input 
                    type="text" value={name} onChange={e => setName(e.target.value)} required
                    className="w-full p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm font-bold outline-none focus:border-amber-500 transition-all"
                    placeholder="Seu nome"
                />
            )}
            <input 
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm font-bold outline-none focus:border-amber-500 transition-all"
                placeholder="Seu e-mail"
            />
            <div className="relative">
                <input 
                    type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                    className="w-full p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm font-bold outline-none focus:border-amber-500 transition-all"
                    placeholder="Sua senha"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
            </div>

            <button 
                type="submit" disabled={loading}
                className="w-full py-4 bg-slate-900 text-white rounded-lg font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-500 transition-all active:scale-95 disabled:opacity-50"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : mode === 'login' ? 'Entrar' : 'Registrar'}
                <ArrowRight className="w-4 h-4"/>
            </button>

            <button 
                type="button"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="w-full text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors mt-6"
            >
                {mode === 'login' ? 'Não tem conta? Registre-se' : 'Já tem conta? Entre'}
            </button>
        </form>
      </div>
    </div>
  );
};

// Added default export to resolve "Module has no default export" error in App.tsx
export default AuthScreen;
