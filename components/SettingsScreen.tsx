
import React, { useState, useEffect } from 'react';
import { 
    Settings, Sun, Moon, Palette, Building2, UploadCloud, Save, Monitor, Users, 
    Briefcase, Plus, Trash2, Check, User, BrainCircuit, Sparkles,
    Loader2, DollarSign, Calendar, TrendingUp, ShieldCheck, 
    X, ImageIcon, ChevronRight, Zap, Target, Activity, ChevronDown, RefreshCw, AlertCircle, Database, Layout, CreditCard, Wallet, FileText
} from 'lucide-react';
import { 
    fetchRoles, createRole, deleteRole, updateRoleCost,
    fetchOrganizationMembersWithRoles, updateUserRole, updateUserCost, updateOrgDetails
} from '../services/organizationService';
import { fetchSubscriptionPlans, createAsaasCheckout } from '../services/asaasService';
import { ElasticSwitch } from './ElasticSwitch';
import { SubscriptionPlan } from '../types';

interface Props {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onlineUsers: string[];
  userOrgId: number | null;
  orgDetails: any;
  onUpdateOrgDetails: (updates: any) => Promise<void> | void;
  setView: (view: any) => void;
  userRole: string;
  userData: any;
  currentPlan?: string;
  activeModules: string[];
  onRefreshModules: () => void;
  initialTab?: 'general' | 'modules' | 'team' | 'ai' | 'plans' | 'costs';
}

export const SettingsScreen: React.FC<Props> = ({ 
    theme, onToggleTheme, onlineUsers, userOrgId, orgDetails, onUpdateOrgDetails, userRole, userData, activeModules, onRefreshModules, initialTab = 'general'
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'modules' | 'team' | 'ai' | 'plans' | 'costs'>(initialTab);
  const [roles, setRoles] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => { 
      if (userOrgId) {
          loadTeamData(); 
          if (activeTab === 'plans') loadPlans();
      }
  }, [userOrgId, activeTab]);

  const loadPlans = async () => {
    setLoading(true);
    const data = await fetchSubscriptionPlans();
    setPlans(data);
    setLoading(false);
  };

  const handleCheckout = async (method: 'PIX' | 'BOLETO' | 'CREDIT_CARD') => {
    if (!selectedPlan || !userOrgId || !userData?.id) return;
    
    setIsRedirecting(true);
    try {
        const res = await createAsaasCheckout({
            userId: userData.id,
            orgId: userOrgId,
            planId: selectedPlan.dbId,
            value: selectedPlan.price,
            billingType: method
        });

        if (res.success && res.url) {
            window.location.href = res.url;
        } else {
            alert("Erro ao gerar pagamento: " + (res.error || "Tente novamente mais tarde."));
        }
    } catch (e) {
        alert("Falha na comunicação com o servidor de pagamento.");
    } finally {
        setIsRedirecting(false);
    }
  };

  const loadTeamData = async () => {
    if (!userOrgId) return;
    try {
        const [r, m] = await Promise.all([
            fetchRoles(userOrgId), 
            fetchOrganizationMembersWithRoles(userOrgId)
        ]);
        setRoles(r); 
        setMembers(m);
    } catch (e: any) {
        console.error("Erro no carregamento do time:", e.message);
    }
  };

  const tabs = [
      { id: 'general', label: 'GERAL' },
      { id: 'plans', label: 'PLANOS' },
      { id: 'team', label: 'TIME' },
      { id: 'costs', label: 'CUSTOS' },
      { id: 'ai', label: 'IA DNA' }
  ];

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-700 max-w-7xl mx-auto p-4 md:p-8 space-y-12">
        <div className="space-y-3 pt-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-full text-[10px] font-black text-orange-600 uppercase tracking-widest">
                <Settings className="w-3.5 h-3.5"/> SISTEMA OPERACIONAL
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter">Ajustes <span className="text-orange-500">Mestres</span>.</h1>
        </div>

        <div className="flex bg-white dark:bg-white/5 p-1.5 rounded-[2rem] border border-slate-100 dark:border-white/5 w-fit shadow-soft overflow-x-auto no-scrollbar max-w-full">
            {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-8 py-3.5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-orange-500 text-white shadow-xl scale-105' : 'text-slate-400 hover:text-slate-600'}`}>{tab.label}</button>
            ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pb-32">
            {activeTab === 'general' && (
                <div className="max-w-4xl space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[3rem] p-10 space-y-8 shadow-sm">
                        <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white dark:bg-white/10 rounded-2xl shadow-sm">
                                    {theme === 'dark' ? <Moon className="w-5 h-5 text-orange-500"/> : <Sun className="w-5 h-5 text-orange-500"/>}
                                </div>
                                <div>
                                    <div className="text-sm font-black text-slate-900 dark:text-white">Modo de Exibição</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Alternar Light/Dark</div>
                                </div>
                            </div>
                            <ElasticSwitch checked={theme === 'dark'} onChange={onToggleTheme} />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'plans' && (
                <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Acessando Tabela de Preços...</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {plans.map(plan => (
                                <div key={plan.id} className={`group bg-white dark:bg-slate-900 rounded-[3rem] p-10 border transition-all flex flex-col justify-between relative overflow-hidden ${selectedPlan?.id === plan.id ? 'ring-4 ring-orange-500 border-orange-500 shadow-2xl' : 'border-slate-200 dark:border-white/10 shadow-soft hover:border-orange-500/50'}`}>
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-10">
                                            <div className={`p-4 rounded-2xl ${plan.recommended ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400'} transition-transform group-hover:scale-110`}>
                                                <Zap className="w-6 h-6"/>
                                            </div>
                                            {plan.recommended && <span className="px-4 py-1.5 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-orange-500/20">Recomendado</span>}
                                        </div>
                                        <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">{plan.name}</h3>
                                        <div className="flex items-baseline gap-1 mb-8">
                                            <span className="text-sm font-bold text-slate-400">R$</span>
                                            <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">{plan.price.toLocaleString('pt-BR')}</span>
                                            <span className="text-xs font-bold text-slate-400">/ciclo</span>
                                        </div>
                                        <ul className="space-y-4 mb-10">
                                            {plan.features.map((feat, i) => (
                                                <li key={i} className="flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                                                    <Check className="w-4 h-4 text-emerald-500 shrink-0" /> {feat}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    
                                    <button 
                                        onClick={() => setSelectedPlan(plan)}
                                        className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${selectedPlan?.id === plan.id ? 'bg-orange-500 text-white shadow-xl' : 'bg-slate-900 dark:bg-white text-white dark:text-black hover:scale-105 active:scale-95'}`}
                                    >
                                        {selectedPlan?.id === plan.id ? 'PLANO SELECIONADO' : 'SELECIONAR PLANO'}
                                    </button>

                                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-orange-500/10 transition-all"></div>
                                </div>
                            ))}
                        </div>
                    )}

                    {selectedPlan && (
                        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl animate-in fade-in">
                            <div className="w-full max-w-lg bg-white dark:bg-[#0A0A0C] rounded-[3.5rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-ios-pop flex flex-col">
                                <div className="p-10 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/5">
                                    <div>
                                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Checkout Seguro.</h2>
                                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Plano: {selectedPlan.name} • R$ {selectedPlan.price.toLocaleString('pt-BR')}</p>
                                    </div>
                                    <button onClick={() => setSelectedPlan(null)} className="p-3 hover:bg-white/10 text-slate-400 rounded-full transition-all"><X className="w-6 h-6"/></button>
                                </div>

                                <div className="p-10 space-y-6">
                                    <p className="text-sm font-bold text-slate-500 text-center mb-4">Escolha seu método de pagamento para ser redirecionado ao Asaas Sandbox:</p>
                                    
                                    <div className="grid grid-cols-1 gap-4">
                                        <button 
                                            disabled={isRedirecting}
                                            onClick={() => handleCheckout('PIX')}
                                            className="w-full p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl flex items-center justify-between group hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 group-hover:bg-white/20 group-hover:text-white flex items-center justify-center"><Wallet className="w-6 h-6"/></div>
                                                <div className="text-left">
                                                    <div className="text-sm font-black uppercase">Pagar via PIX</div>
                                                    <div className="text-[10px] opacity-60">Confirmação instantânea</div>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 opacity-30 group-hover:opacity-100"/>
                                        </button>

                                        <button 
                                            disabled={isRedirecting}
                                            onClick={() => handleCheckout('BOLETO')}
                                            className="w-full p-6 bg-blue-500/5 border border-blue-500/20 rounded-3xl flex items-center justify-between group hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 group-hover:bg-white/20 group-hover:text-white flex items-center justify-center"><FileText className="w-6 h-6"/></div>
                                                <div className="text-left">
                                                    <div className="text-sm font-black uppercase">Boleto Bancário</div>
                                                    <div className="text-[10px] opacity-60">Compensação em até 48h</div>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 opacity-30 group-hover:opacity-100"/>
                                        </button>

                                        <button 
                                            disabled={isRedirecting}
                                            onClick={() => handleCheckout('CREDIT_CARD')}
                                            className="w-full p-6 bg-purple-500/5 border border-purple-500/20 rounded-3xl flex items-center justify-between group hover:bg-purple-500 hover:text-white transition-all shadow-sm"
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 group-hover:bg-white/20 group-hover:text-white flex items-center justify-center"><CreditCard className="w-6 h-6"/></div>
                                                <div className="text-left">
                                                    <div className="text-sm font-black uppercase">Cartão de Crédito</div>
                                                    <div className="text-[10px] opacity-60">Visa, Master, Amex e Elo</div>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 opacity-30 group-hover:opacity-100"/>
                                        </button>
                                    </div>

                                    {isRedirecting && (
                                        <div className="flex items-center justify-center gap-3 text-orange-500 font-black text-[10px] uppercase tracking-widest mt-6 animate-pulse">
                                            <Loader2 className="w-4 h-4 animate-spin"/> Preparando Ambiente Seguro...
                                        </div>
                                    )}
                                </div>
                                
                                <div className="p-8 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 text-center">
                                    <p className="text-[9px] text-slate-400 font-bold leading-relaxed">AO CONTINUAR, VOCÊ SERÁ REDIRECIONADO PARA O GATEWAY DO ASAAS SANDBOX PARA CONCLUIR A TRANSAÇÃO.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'costs' && (
                <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        <div className="lg:col-span-4 space-y-6">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                <Target className="w-4 h-4 text-amber-500"/> Estrutura de Cargos
                            </h3>
                            <div className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 p-6 rounded-[2.5rem] space-y-4 shadow-sm">
                                <div className="space-y-3">
                                    {roles.map(r => (
                                        <div key={r.id} className="p-4 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 rounded-2xl flex items-center justify-between group">
                                            <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">{r.nome}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-bold text-slate-400">R$</span>
                                                <input 
                                                    type="number"
                                                    defaultValue={r.custo_base}
                                                    onBlur={(e) => updateRoleCost(r.id, Number(e.target.value)).then(loadTeamData)}
                                                    className="w-20 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg p-1.5 text-right text-[10px] font-black outline-none"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default SettingsScreen;
