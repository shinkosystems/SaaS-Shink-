
import React, { useState, useRef, useEffect } from 'react';
import { 
    Settings, Sun, Moon, Palette, Building2, UploadCloud, Save, Monitor, Users, 
    Briefcase, Plus, Trash2, Check, User, BrainCircuit, Sparkles, BookOpen, 
    Fingerprint, Loader2, AlertTriangle, Lock, Copy, CheckCircle, LayoutGrid, 
    DollarSign, Code2, BarChart3, Calendar, TrendingUp, ShieldCheck, ShoppingCart, 
    Receipt, X, Image as ImageIcon, FileText, ArrowRight, ChevronRight,
    UserPlus, Mail, Shield, Zap, Rocket, Building, MonitorSmartphone, Activity
} from 'lucide-react';
import { fetchRoles, createRole, deleteRole, fetchOrganizationMembersWithRoles, updateUserRole, updateOrgModules, createOrganization, SYSTEM_MODULES_DEF, updateOrgDetails } from '../services/organizationService';
import { ElasticSwitch } from './ElasticSwitch';
import { supabase } from '../services/supabaseClient';

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
  initialTab?: 'general' | 'modules' | 'team' | 'ai';
}

const AVAILABLE_MODULES = [
    { id: 'projects', label: 'Gestão de Projetos', desc: 'Portfólio e lista de ativos estratégicos.', icon: Briefcase, price: 0, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { id: 'kanban', label: 'Kanban Board', desc: 'Gestão visual de tarefas e fluxos técnicos.', icon: LayoutGrid, price: 0, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'calendar', label: 'Agenda & Prazos', desc: 'Visualização cronológica de marcos e entregas.', icon: Calendar, price: 0, color: 'text-teal-500', bg: 'bg-teal-50' },
    { id: 'crm', label: 'Vendas CRM', desc: 'Pipeline comercial e gestão de contratos.', icon: TrendingUp, price: 49.90, color: 'text-orange-500', bg: 'bg-orange-50' }, 
    { id: 'financial', label: 'Finanças & MRR', desc: 'Fluxo de caixa, DRE e métricas de recorrência.', icon: DollarSign, price: 39.90, color: 'text-emerald-600', bg: 'bg-emerald-50' }, 
    { id: 'ia', label: 'Inteligência (Guru)', desc: 'Assistente COO/CTO Virtual via IA Generativa.', icon: BrainCircuit, price: 59.90, color: 'text-purple-500', bg: 'bg-purple-50' },
];

export const SettingsScreen: React.FC<Props> = ({ 
    theme, onToggleTheme, onlineUsers, userOrgId, orgDetails, onUpdateOrgDetails, setView, userRole, userData, currentPlan, activeModules, onRefreshModules, initialTab = 'modules'
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'modules' | 'team' | 'ai'>(initialTab);
  const [roles, setRoles] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  const [aiConfig, setAiConfig] = useState({
      sector: orgDetails?.aiSector || '',
      tone: orgDetails?.aiTone || '',
      dna: orgDetails?.aiContext || ''
  });

  useEffect(() => {
    if (userOrgId) loadTeamData();
  }, [userOrgId]);

  const loadTeamData = async () => {
    if (!userOrgId) return;
    const [r, m] = await Promise.all([
        fetchRoles(userOrgId),
        fetchOrganizationMembersWithRoles(userOrgId)
    ]);
    setRoles(r);
    setMembers(m);
  };

  const handleCreateRole = async () => {
      if (!newRoleName.trim() || !userOrgId) return;
      await createRole(newRoleName, userOrgId);
      setNewRoleName('');
      loadTeamData();
  };

  const handleSaveAi = async () => {
      if (!userOrgId) return;
      setIsSaving(true);
      await updateOrgDetails(userOrgId, { aiSector: aiConfig.sector, aiTone: aiConfig.tone, aiContext: aiConfig.dna });
      setIsSaving(false);
      alert("DNA Industrial atualizado!");
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-700 max-w-7xl mx-auto p-4 md:p-8 space-y-12">
        <div className="space-y-3 pt-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-full text-[10px] font-black text-orange-600 uppercase tracking-widest">
                <Settings className="w-3.5 h-3.5"/> SISTEMA OPERACIONAL
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter">Ajustes <span className="text-orange-500">Mestres</span>.</h1>
        </div>

        <div className="flex bg-white dark:bg-white/5 p-1.5 rounded-[2rem] border border-slate-100 dark:border-white/5 w-fit shadow-soft">
            {[
                { id: 'general', label: 'GERAL' },
                { id: 'modules', label: 'MARKETPLACE' },
                { id: 'team', label: 'TIME' },
                { id: 'ai', label: 'INTELIGÊNCIA' }
            ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-8 py-3.5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-orange-500 text-white shadow-xl scale-105' : 'text-slate-400 hover:text-slate-600'}`}>{tab.label}</button>
            ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pb-32">
            {activeTab === 'team' && (
                <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Gestão de Acesso</h3>
                            <div className="space-y-3">
                                {members.map(m => (
                                    <div key={m.id} className="p-6 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-3xl flex items-center justify-between">
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center font-black text-slate-500">{m.nome.charAt(0)}</div>
                                            <div>
                                                <div className="text-sm font-black text-slate-900 dark:text-white">{m.nome}</div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{m.perfil} • {roles.find(r => r.id === m.cargo)?.nome || 'Sem Cargo'}</div>
                                            </div>
                                        </div>
                                        <select value={m.cargo || ''} onChange={e => updateUserRole(m.id, parseInt(e.target.value)).then(loadTeamData)} className="bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/10 rounded-xl p-2 text-[10px] font-black uppercase">
                                            <option value="">Cargo...</option>
                                            {roles.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Cargos & Estrutura</h3>
                            <div className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 p-6 rounded-[2.5rem] space-y-4">
                                <div className="flex gap-2">
                                    <input value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="Novo Cargo..." className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl p-3 text-xs font-bold outline-none" />
                                    <button onClick={handleCreateRole} className="p-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl"><Plus className="w-4 h-4"/></button>
                                </div>
                                <div className="space-y-2">
                                    {roles.map(r => (
                                        <div key={r.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-50 dark:border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                            <span>{r.nome}</span>
                                            <button onClick={() => deleteRole(r.id).then(loadTeamData)}><Trash2 className="w-3.5 h-3.5 text-red-500/50 hover:text-red-500"/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'ai' && (
                <div className="max-w-3xl space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-2">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">DNA Industrial da IA</h3>
                        <p className="text-slate-500 text-sm font-medium">Configure como o Guru AI deve se comportar no seu Workspace.</p>
                    </div>

                    <div className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[3rem] p-10 space-y-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Setor de Atuação</label>
                            <input value={aiConfig.sector} onChange={e => setAiConfig({...aiConfig, sector: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 p-5 rounded-2xl text-base font-black outline-none focus:border-orange-500 transition-all" placeholder="Ex: Software / Fintech / Consultoria" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tom de Voz</label>
                            <select value={aiConfig.tone} onChange={e => setAiConfig({...aiConfig, tone: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 p-5 rounded-2xl text-sm font-black outline-none uppercase tracking-widest">
                                <option value="Tecnico">🤖 Engenheiro / Técnico</option>
                                <option value="Estrategico">🎯 Estratégico / COO</option>
                                <option value="Vendas">💰 Comercial / Growth</option>
                                <option value="Apoio">🤝 Parceiro / Suporte</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Contexto Mestre (Diferencial Competitivo)</label>
                            <textarea value={aiConfig.dna} onChange={e => setAiConfig({...aiConfig, dna: e.target.value})} className="w-full h-48 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 p-5 rounded-2xl text-base font-medium outline-none resize-none" placeholder="Explique qual o diferencial técnico ou estratégico da sua empresa..." />
                        </div>

                        <button onClick={handleSaveAi} disabled={isSaving} className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[1.8rem] font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : <Zap className="w-5 h-5"/>} SINCRONIZAR DNA
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'modules' && (
                <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[2.5rem] overflow-hidden shadow-soft">
                        <div className="p-8 border-b border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Ativos Operacionais</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configure as funcionalidades do seu Workspace</p>
                                </div>
                                <span className="px-4 py-1.5 rounded-full bg-orange-50 text-orange-600 text-[9px] font-black uppercase tracking-widest border border-orange-100">
                                    {activeModules.length} ATIVOS
                                </span>
                            </div>
                        </div>

                        <div className="divide-y divide-slate-50 dark:divide-white/5">
                            {AVAILABLE_MODULES.map(mod => {
                                const isOwned = activeModules.includes(mod.id);
                                return (
                                    <div key={mod.id} className="p-8 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all group">
                                        <div className="flex items-center gap-6">
                                            <div className={`p-4 rounded-2xl ${mod.bg} ${mod.color} border border-white/10 shadow-sm`}>
                                                <mod.icon className="w-6 h-6"/>
                                            </div>
                                            <div>
                                                <h4 className="text-base font-black text-slate-900 dark:text-white">{mod.label}</h4>
                                                <p className="text-[11px] text-slate-500 font-medium">{mod.desc}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${isOwned ? 'text-orange-500' : 'text-slate-400'}`}>
                                                {isOwned ? 'ATIVO' : 'OFF'}
                                            </span>
                                            <ElasticSwitch checked={isOwned} onChange={() => {}} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
