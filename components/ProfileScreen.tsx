
import React, { useState, useEffect, useRef } from 'react';
import { User, Save, Camera, CreditCard, Loader2, Building2, Clock, History, LogOut, ArrowRight, Zap } from 'lucide-react';
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

  // Calculator State
  const [calcUsers, setCalcUsers] = useState(3);
  const [billing, setBilling] = useState<'monthly'|'yearly'>('monthly');

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

  const getPlanDetails = (users: number) => {
      if (users === 1) return { name: 'Core Solo', price: 89.90, color: 'text-blue-500', bg: 'bg-blue-500', desc: 'Para solopreneurs.' };
      if (users <= 5) return { name: 'Core Studio', price: 297.90, color: 'text-amber-500', bg: 'bg-amber-500', desc: 'Times de alta performance.' };
      if (users <= 15) return { name: 'Core Scale', price: 899.90, color: 'text-purple-500', bg: 'bg-purple-500', desc: 'Scale-ups com processos.' };
      return { name: 'Enterprise', price: null, color: 'text-emerald-500', bg: 'bg-emerald-500', desc: 'Grandes operações.' };
  };

  const formatPlanName = (planKey: string) => {
      let name = planKey.replace('plan_', '');
      if (name.includes('_yearly')) {
          name = name.replace('_yearly', ' (Anual)');
      }
      return name;
  };

  const planCalc = getPlanDetails(calcUsers);
  const finalPrice = planCalc.price ? (billing === 'yearly' ? planCalc.price * 0.8 : planCalc.price) : null;

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin"/></div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in duration-500 space-y-8">
        
        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-white/5 shadow-sm space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Meu Perfil</h1>
                <div className="text-xs font-bold px-3 py-1 bg-slate-100 dark:bg-white/10 rounded-full text-slate-500 uppercase tracking-wider">
                    {formatPlanName(currentPlan)}
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden ring-4 ring-white dark:ring-black">
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
                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 outline-none focus:border-slate-400 transition-all"
                    />
                </div>
            </div>

            <div className="flex justify-end">
                <button onClick={handleSave} className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm shadow-lg hover:scale-105 transition-transform flex items-center gap-2">
                    <Save className="w-4 h-4"/> Salvar Alterações
                </button>
            </div>
        </div>

        {/* Pricing Calculator Section */}
        <div className="bg-gradient-to-br from-slate-900 to-black rounded-3xl p-8 md:p-10 border border-white/10 relative overflow-hidden text-white">
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row gap-10">
                <div className="flex-1 space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Zap className="w-6 h-6 text-yellow-400"/> Simulador de Upgrade
                        </h2>
                        <p className="text-slate-400 text-sm mt-2">
                            Sua empresa está crescendo? Calcule o valor do próximo nível e veja qual plano se adapta ao tamanho do seu time.
                        </p>
                    </div>

                    <div className="space-y-4 pt-4">
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-sm">Quantos usuários você precisa?</span>
                            <span className={`font-mono text-xl font-black ${planCalc.color}`}>{calcUsers}</span>
                        </div>
                        <input 
                            type="range" min="1" max="50" step="1" 
                            value={calcUsers} onChange={(e) => setCalcUsers(Number(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-white"
                        />
                        <div className="flex bg-white/10 p-1 rounded-xl w-full max-w-xs">
                            <button 
                                onClick={() => setBilling('monthly')}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${billing === 'monthly' ? 'bg-white text-black' : 'text-slate-400 hover:text-white'}`}
                            >
                                Mensal
                            </button>
                            <button 
                                onClick={() => setBilling('yearly')}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${billing === 'yearly' ? 'bg-white text-black' : 'text-slate-400 hover:text-white'}`}
                            >
                                Anual (-20%)
                            </button>
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-80 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-between hover:border-white/20 transition-colors">
                    <div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Plano Sugerido</div>
                        <h3 className={`text-2xl font-black mb-1 ${planCalc.color}`}>{planCalc.name}</h3>
                        <p className="text-xs text-slate-400 mb-6">{planCalc.desc}</p>
                        
                        <div className="flex items-end gap-1 mb-4">
                            <span className="text-4xl font-black text-white">
                                {finalPrice ? `R$ ${finalPrice.toFixed(2)}` : 'Consulte'}
                            </span>
                            {finalPrice && <span className="text-sm text-slate-500 font-bold mb-1">/mês</span>}
                        </div>
                        
                        {billing === 'yearly' && planCalc.price && (
                            <div className="text-xs text-emerald-400 font-bold mb-4">
                                Economia anual de R$ {((planCalc.price * 12) - (finalPrice! * 12)).toFixed(2)}
                            </div>
                        )}
                    </div>

                    <button className="w-full py-3 bg-white text-black font-bold rounded-xl text-sm hover:scale-105 transition-transform flex items-center justify-center gap-2">
                        Falar com Consultor <ArrowRight className="w-4 h-4"/>
                    </button>
                </div>
            </div>
        </div>

    </div>
  );
};
