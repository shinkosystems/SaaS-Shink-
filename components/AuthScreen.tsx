
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Loader2, X, Sparkles, ArrowRight } from 'lucide-react';

interface Props {
  onGuestLogin: (persona?: any) => void;
  onClose: () => void;
  customOrgName?: string;
  customLogoUrl?: string | null;
  customColor?: string;
}

const LOGO_URL = "https://zjssfnbcboibqeoubeou.supabase.co/storage/v1/object/public/fotoperfil/fotoperfil/1%20(1).png";

const AuthScreen: React.FC<Props> = ({ onClose, customLogoUrl, customOrgName }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const displayLogo = customLogoUrl || LOGO_URL;
  const brandName = customOrgName || "Shinkō OS";

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = mode === 'login' 
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
      if (error) throw error;
      onClose();
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-in fade-in">
      <div className="w-full max-w-md bg-[#0A0A0C] rounded-[3rem] shadow-glass border border-white/10 overflow-hidden relative animate-ios-pop">
        
        <button onClick={onClose} className="absolute top-8 right-8 text-slate-600 hover:text-white transition-colors z-20">
            <X className="w-6 h-6"/>
        </button>

        <div className="p-12 pb-8 flex flex-col items-center text-center">
            <div className="mb-8 relative">
                <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full scale-150"></div>
                <img src={displayLogo} alt={brandName} className="h-20 w-auto object-contain relative z-10 animate-in zoom-in duration-700" />
            </div>
            <h2 className="text-4xl font-black text-white tracking-tighter leading-none">
                Bem-vindo ao <br/><span className="text-amber-500">{brandName}</span>.
            </h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-4">Sistema de Inovação Industrial</p>
        </div>

        <form onSubmit={handleAuth} className="px-12 pb-12 space-y-5">
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                <input 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white outline-none focus:border-amber-500/50 transition-all"
                    required
                    placeholder="seu@email.com"
                />
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Senha de Acesso</label>
                <input 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white outline-none focus:border-amber-500/50 transition-all"
                    required
                    placeholder="••••••••"
                />
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full py-5 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest shinko-button flex items-center justify-center gap-2 mt-4 hover:bg-amber-500 transition-all shadow-xl"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : mode === 'login' ? 'Entrar no Sistema' : 'Criar minha Conta'}
                <ArrowRight className="w-4 h-4"/>
            </button>

            <button 
                type="button"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="w-full text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors mt-6"
            >
                {mode === 'login' ? 'Não tem uma conta? Registre-se' : 'Já possui conta? Faça Login'}
            </button>
        </form>
      </div>
    </div>
  );
};

export default AuthScreen;
