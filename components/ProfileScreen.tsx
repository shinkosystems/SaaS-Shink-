
import React, { useState, useEffect, useRef } from 'react';
import { User, Save, Camera, CreditCard, Loader2, Building2, Clock, History, LogOut } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

const DEFAULT_AVATAR = "https://zjssfnbcboibqeoubeou.supabase.co/storage/v1/object/public/fotoperfil/fotoperfil/1.png";

interface Props {
  currentPlan: string;
  onRefresh: () => void;
}

export const ProfileScreen: React.FC<Props> = ({ currentPlan, onRefresh }) => {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR);
  const [orgName, setOrgName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setEmail(user.email || '');
            const { data } = await supabase.from('users').select('*, organizacoes(nome)').eq('id', user.id).single();
            if (data) {
                setName(data.nome || '');
                setAvatarUrl(data.avatar_url || DEFAULT_AVATAR);
                if (data.organizacoes) setOrgName(data.organizacoes.nome);
            }
        }
        setLoading(false);
    };
    loadData();
  }, []);

  const handleSave = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('users').update({ nome: name }).eq('id', user.id);
      alert("Perfil atualizado!");
      onRefresh();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      // Upload logic (simplified for UI focus)
      alert("Upload simulado. Funcionalidade completa no backend.");
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin"/></div>;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">Meu Perfil</h1>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-white/5 shadow-sm space-y-8">
            <div className="flex items-center gap-6">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                        <img src={avatarUrl} className="w-full h-full object-cover"/>
                    </div>
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-6 h-6 text-white"/>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleAvatarUpload}/>
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{name}</h2>
                    <p className="text-slate-500">{email}</p>
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300">
                        <Building2 className="w-3 h-3"/> {orgName || 'Sem Organização'}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome Completo</label>
                    <input 
                        type="text" 
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:border-slate-400 transition-all"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Plano Atual</label>
                    <div className="w-full p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex justify-between items-center">
                        <div>
                            <div className="font-bold text-lg capitalize">{currentPlan.replace('plan_', '')}</div>
                            <div className="text-xs text-slate-400">Assinatura ativa</div>
                        </div>
                        <CreditCard className="w-6 h-6 opacity-50"/>
                    </div>
                </div>
            </div>

            <div className="pt-4 flex justify-end">
                <button onClick={handleSave} className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm shadow-lg hover:scale-105 transition-transform">
                    Salvar Alterações
                </button>
            </div>
        </div>
    </div>
  );
};
