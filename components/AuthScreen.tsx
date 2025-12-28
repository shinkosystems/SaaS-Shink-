
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { findOrgIdByOwnerEmail, createOrganization } from '../services/organizationService';
import { Loader2, X, Sparkles, ArrowRight, Building2, Users, Eye, EyeOff } from 'lucide-react';

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
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  
  // Registration Flow state
  const [orgFlow, setOrgFlow] = useState<'new' | 'join'>('new');
  const [newOrgName, setNewOrgName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');

  const displayLogo = customLogoUrl || LOGO_URL;
  const brandName = customOrgName || "Shinkō OS";

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        // Validation for registration
        if (!name.trim()) throw new Error("Informe seu nome.");
        
        let targetOrgId: number | null = null;

        if (orgFlow === 'join') {
          if (!ownerEmail.trim()) throw new Error("Informe o e-mail do dono da organização.");
          targetOrgId = await findOrgIdByOwnerEmail(ownerEmail);
          if (!targetOrgId) throw new Error("Não encontramos uma organização para este e-mail de dono.");
        } else {
          if (!newOrgName.trim()) throw new Error("Informe o nome da sua nova organização.");
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: {
                    full_name: name,
                    perfil: orgFlow === 'new' ? 'dono' : 'colaborador'
                }
            }
        });

        if (signUpError) throw signUpError;

        if (signUpData.user) {
            // Se for nova organização, criamos agora
            if (orgFlow === 'new') {
                await createOrganization(signUpData.user.id, newOrgName, 'Tecnologia');
            } else {
                // Se estiver entrando, vinculamos ao ID localizado
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ organizacao: targetOrgId, perfil: 'colaborador' })
                    .eq('id', signUpData.user.id);
                
                if (updateError) console.error("Erro ao vincular organização:", updateError);
            }
        }
      }
      onClose();
    } catch (err: any) { 
        alert(err.message); 
    } finally { 
        setLoading(false); 
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-in fade-in">
      <div className="w-full max-w-md bg-[#0A0A0C] rounded-[3rem] shadow-glass border border-white/10 overflow-hidden relative animate-ios-pop max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        <button onClick={onClose} className="absolute top-8 right-8 text-slate-600 hover:text-white transition-colors z-20">
            <X className="w-6 h-6"/>
        </button>

        <div className="p-12 pb-8 flex flex-col items-center text-center">
            <div className="mb-8 relative">
                <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full scale-150"></div>
                <img src={displayLogo} alt={brandName} className="h-20 w-auto object-contain relative z-10 animate-in zoom-in duration-700" />
            </div>
            <h2 className="text-4xl font-black text-white tracking-tighter leading-none">
                {mode === 'login' ? 'Bem-vindo ao' : 'Crie sua conta no'} <br/><span className="text-amber-500">{brandName}</span>.
            </h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-4">Sistema de Inovação Industrial</p>
        </div>

        <form onSubmit={handleAuth} className="px-12 pb-12 space-y-5">
            {mode === 'register' && (
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Seu Nome Completo</label>
                    <input 
                        type="text" 
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white outline-none focus:border-amber-500/50 transition-all"
                        required
                        placeholder="Ex: João Silva"
                    />
                </div>
            )}

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
                <div className="relative group">
                    <input 
                        type={showPassword ? 'text' : 'password'} 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full p-4 pr-12 rounded-2xl bg-white/5 border border-white/10 text-white outline-none focus:border-amber-500/50 transition-all"
                        required
                        placeholder="••••••••"
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    >
                        {showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                    </button>
                </div>
            </div>

            {mode === 'register' && (
                <div className="pt-4 space-y-4">
                    <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10">
                        <button 
                            type="button"
                            onClick={() => setOrgFlow('new')}
                            className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${orgFlow === 'new' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-500'}`}
                        >
                            <Building2 className="w-3 h-3"/> Nova Empresa
                        </button>
                        <button 
                            type="button"
                            onClick={() => setOrgFlow('join')}
                            className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${orgFlow === 'join' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-500'}`}
                        >
                            <Users className="w-3 h-3"/> Entrar em Time
                        </button>
                    </div>

                    {orgFlow === 'new' ? (
                        <div className="space-y-1 animate-in slide-in-from-top-2">
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Nome da Organização</label>
                            <input 
                                type="text" 
                                value={newOrgName}
                                onChange={e => setNewOrgName(e.target.value)}
                                className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white outline-none focus:border-amber-500/50 transition-all"
                                placeholder="Ex: Minha Startup Ltda"
                            />
                        </div>
                    ) : (
                        <div className="space-y-1 animate-in slide-in-from-top-2">
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">E-mail do Proprietário</label>
                            <input 
                                type="email" 
                                value={ownerEmail}
                                onChange={e => setOwnerEmail(e.target.value)}
                                className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white outline-none focus:border-amber-500/50 transition-all"
                                placeholder="E-mail de quem te convidou"
                            />
                            <p className="text-[8px] text-slate-500 font-bold uppercase mt-1 px-1">Você entrará como colaborador.</p>
                        </div>
                    )}
                </div>
            )}

            <button 
                type="submit" 
                disabled={loading}
                className="w-full py-5 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest shinko-button flex items-center justify-center gap-2 mt-4 hover:bg-amber-500 transition-all shadow-xl"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : mode === 'login' ? 'Entrar no Sistema' : 'Finalizar Cadastro'}
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
