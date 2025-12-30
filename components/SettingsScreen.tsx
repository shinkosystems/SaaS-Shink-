
import React, { useState, useRef, useEffect } from 'react';
import { 
    Settings, Sun, Moon, Palette, Building2, UploadCloud, Save, Monitor, Users, 
    Briefcase, Plus, Trash2, Check, User, BrainCircuit, Sparkles, BookOpen, 
    Fingerprint, Loader2, AlertTriangle, Lock, Copy, CheckCircle, LayoutGrid, 
    DollarSign, Code2, BarChart3, Calendar, TrendingUp, ShieldCheck, ShoppingCart, 
    CreditCard, ExternalLink, Receipt, X, Image as ImageIcon, FileText, ArrowRight, ChevronRight,
    UserPlus, Mail, Shield, Zap, Rocket, Building, MonitorSmartphone, Activity
} from 'lucide-react';
import { fetchRoles, createRole, deleteRole, fetchOrganizationMembersWithRoles, updateUserRole, updateOrgModules, createOrganization, SYSTEM_MODULES_DEF } from '../services/organizationService';
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
    { id: 'projects', label: 'Gestão de Projetos', desc: 'Portfólio e lista.', icon: Briefcase, price: 0, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { id: 'kanban', label: 'Kanban Board', desc: 'Gestão visual de tarefas.', icon: LayoutGrid, price: 0, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'calendar', label: 'Agenda & Prazos', desc: 'Visualização mensal/semanal.', icon: Calendar, price: 0, color: 'text-teal-500', bg: 'bg-teal-50' },
    { id: 'assets', label: 'Gestão de Ativos', desc: 'Infraestrutura e performance.', icon: MonitorSmartphone, price: 29.90, color: 'text-indigo-500', bg: 'bg-indigo-50' }, 
    { id: 'crm', label: 'Vendas CRM', desc: 'Pipeline e contratos.', icon: TrendingUp, price: 49.90, color: 'text-orange-500', bg: 'bg-orange-50' }, 
    { id: 'financial', label: 'Finanças & MRR', desc: 'Fluxo de caixa e recorrência.', icon: DollarSign, price: 39.90, color: 'text-emerald-600', bg: 'bg-emerald-50' }, 
    { id: 'ia', label: 'Inteligência (Guru)', desc: 'Seu CTO Virtual (IA).', icon: BrainCircuit, price: 59.90, color: 'text-purple-500', bg: 'bg-purple-50' },
    { id: 'engineering', label: 'Engenharia (DORA)', desc: 'Métricas de performance.', icon: Code2, price: 69.90, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'product', label: 'Métricas de Produto', desc: 'Analytics e engajamento.', icon: BarChart3, price: 69.90, color: 'text-pink-500', bg: 'bg-pink-50' },
    { id: 'clients', label: 'Stakeholders', desc: 'Portal externo do cliente.', icon: Users, price: 39.90, color: 'text-amber-600', bg: 'bg-amber-50' },
];

export const SettingsScreen: React.FC<Props> = ({ 
    theme, onToggleTheme, onlineUsers, userOrgId, orgDetails, onUpdateOrgDetails, setView, userRole, userData, currentPlan, activeModules, onRefreshModules, initialTab = 'modules'
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'modules' | 'team' | 'ai'>(initialTab);
  const [roles, setRoles] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  const [newOrgData, setNewOrgData] = useState({ name: '', sector: '', dna: '' });

  const [editOrg, setEditOrg] = useState({
      name: orgDetails?.name || '',
      sector: orgDetails?.aiSector || '',
      primaryColor: orgDetails?.primaryColor || '#F59E0B',
      logoFile: null as File | null,
      logoPreview: orgDetails?.logoUrl || null
  });

  const [aiConfig, setAiConfig] = useState({
      sector: orgDetails?.aiSector || '',
      tone: orgDetails?.aiTone || '',
      context: orgDetails?.aiContext || ''
  });

  const isAdmin = userRole === 'dono';

  useEffect(() => {
    if (userOrgId) loadTeamData();
  }, [userOrgId]);

  useEffect(() => {
    setEditOrg(prev => ({
        ...prev,
        name: orgDetails?.name || '',
        sector: orgDetails?.aiSector || '',
        primaryColor: orgDetails?.primaryColor || '#F59E0B',
        logoPreview: orgDetails?.logoUrl || null
    }));
  }, [orgDetails]);

  const loadTeamData = async () => {
    if (!userOrgId) return;
    const [r, m] = await Promise.all([
        fetchRoles(userOrgId),
        fetchOrganizationMembersWithRoles(userOrgId)
    ]);
    setRoles(r);
    setMembers(m);
  };

  const handleSaveOrgProfile = async () => {
      setIsSaving(true);
      try {
          await onUpdateOrgDetails({
              name: editOrg.name,
              aiSector: editOrg.sector,
              primaryColor: editOrg.primaryColor,
              logoFile: editOrg.logoFile
          });
      } finally {
          setIsSaving(false);
      }
  };

  const handleUpdateMemberRole = async (userId: string, roleId: string) => {
      await updateUserRole(userId, roleId === "" ? null : Number(roleId));
      loadTeamData();
  };

  const handleSaveAiConfig = async () => {
      setIsSaving(true);
      await onUpdateOrgDetails({
          aiSector: aiConfig.sector,
          aiTone: aiConfig.tone,
          aiContext: aiConfig.context
      });
      setIsSaving(false);
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-700 max-w-7xl mx-auto p-4 md:p-8 space-y-8 md:space-y-12">
        {/* Top Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-4">
            <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-full text-[10px] font-black text-orange-600 uppercase tracking-widest">
                    <Settings className="w-3.5 h-3.5"/> SISTEMA OPERACIONAL
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">
                    Ajustes <span className="text-orange-500">Mestres</span>.
                </h1>
            </div>
            <button className="px-8 py-4 bg-white border border-slate-200 dark:border-white/10 rounded-[1.5rem] flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white transition-all shadow-soft hover:bg-slate-50">
                <Receipt className="w-4.5 h-4.5 text-orange-500"/> GERENCIAR ASSINATURA
            </button>
        </div>

        {/* Tab Switcher - Match screenshot style */}
        <div className="flex bg-white dark:bg-white/5 p-1.5 rounded-[2rem] border border-slate-100 dark:border-white/5 w-fit shadow-soft">
            {[
                { id: 'general', label: 'GERAL', icon: Monitor },
                { id: 'modules', label: 'MARKETPLACE', icon: ShoppingCart },
                { id: 'team', label: 'TIME', icon: Users },
                { id: 'ai', label: 'INTELIGÊNCIA', icon: BrainCircuit }
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-3 px-8 py-3.5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab.id ? 'bg-orange-500 text-white shadow-xl scale-105' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                >
                    {tab.label}
                </button>
            ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-24">
            
            {/* TAB: MARKETPLACE - VISUAL MATCH WITH SCREENSHOT */}
            {activeTab === 'modules' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                    {AVAILABLE_MODULES.map(mod => {
                        const isOwned = activeModules.includes(mod.id);
                        return (
                            <div key={mod.id} className="group relative p-10 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[2rem] transition-all duration-500 flex flex-col justify-between h-72 hover:border-orange-500/30 hover:shadow-xl shadow-soft">
                                <div className="flex justify-between items-start">
                                    <div className={`p-4 rounded-[1.2rem] ${mod.bg} ${mod.color} border border-white/10 shadow-sm`}>
                                        <mod.icon className="w-6 h-6"/>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {isOwned ? (
                                            <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-100">ATIVO</span>
                                        ) : (
                                            <span className="px-3 py-1 rounded-lg bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest border border-slate-100">DISPONÍVEL</span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white">{mod.label}</h3>
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{mod.desc}</p>
                                </div>

                                {!isOwned && (
                                    <button className="mt-4 flex items-center justify-between group/btn pt-4 border-t border-slate-50 dark:border-white/5">
                                        <span className="text-lg font-black text-slate-900 dark:text-white">R$ {mod.price.toFixed(2)}<span className="text-[10px] text-slate-500">/mês</span></span>
                                        <div className="w-10 h-10 rounded-full bg-slate-900 dark:bg-white text-white dark:text-black flex items-center justify-center group-hover/btn:bg-orange-500 group-hover/btn:text-white transition-colors">
                                            <ChevronRight className="w-6 h-6"/>
                                        </div>
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Other tabs maintained as standard shinko style */}
            {activeTab === 'general' && (
                <div className="max-w-4xl space-y-16 animate-in slide-in-from-left-4">
                    <div className="space-y-6">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-2">
                            <Monitor className="w-4 h-4" /> EXPERIÊNCIA DE USO
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                            <button onClick={onToggleTheme} className={`p-8 rounded-[2.5rem] border transition-all flex flex-col items-center gap-4 shadow-soft ${theme === 'light' ? 'bg-white border-orange-500/50 text-orange-600' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                                <Sun className="w-8 h-8"/> <span className="text-[10px] font-black uppercase tracking-widest">MODO CLARO</span>
                            </button>
                            <button onClick={onToggleTheme} className={`p-8 rounded-[2.5rem] border transition-all flex flex-col items-center gap-4 shadow-soft ${theme === 'dark' ? 'bg-slate-900 border-orange-500/30 text-white shadow-glow-amber' : 'bg-black/10 border-white/5 text-slate-500'}`}>
                                <Moon className="w-8 h-8"/> <span className="text-[10px] font-black uppercase tracking-widest">MODO ESCURO</span>
                            </button>
                        </div>
                    </div>

                    {isAdmin && (
                        <div className="space-y-10 animate-in fade-in duration-1000">
                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-2">
                                <Building className="w-4 h-4 text-orange-500" /> PERFIL DA ORGANIZAÇÃO
                            </h3>
                            
                            <div className="bg-white dark:bg-white/5 p-10 rounded-[3rem] border border-slate-100 dark:border-white/5 space-y-10 shadow-soft">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Identificação da Marca</label>
                                            <div className="flex items-center gap-6">
                                                <div 
                                                    onClick={() => logoInputRef.current?.click()}
                                                    className="w-24 h-24 rounded-[1.8rem] bg-slate-50 dark:bg-black/40 border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-orange-500/50 hover:bg-orange-50 transition-all group overflow-hidden shadow-inner"
                                                >
                                                    {editOrg.logoPreview ? (
                                                        <img src={editOrg.logoPreview} className="w-full h-full object-contain p-2" />
                                                    ) : (
                                                        <>
                                                            <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-orange-500 mb-1" />
                                                            <span className="text-[8px] font-black text-slate-500 uppercase">Logo</span>
                                                        </>
                                                    )}
                                                </div>
                                                <input type="file" ref={logoInputRef} hidden accept="image/*" />
                                                <div className="flex-1 space-y-3">
                                                    <div>
                                                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Cor Primária</label>
                                                        <input type="color" value={editOrg.primaryColor} onChange={e => setEditOrg({...editOrg, primaryColor: e.target.value})} className="w-full h-10 rounded-xl cursor-pointer bg-transparent border-none" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Nome Comercial</label>
                                            <input value={editOrg.name} onChange={e => setEditOrg({...editOrg, name: e.target.value})} className="w-full bg-slate-50 dark:bg-black/20 p-4 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-orange-500/50 shadow-inner" />
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Nicho de Atuação</label>
                                            <select value={editOrg.sector} onChange={e => setEditOrg({...editOrg, sector: e.target.value})} className="w-full bg-slate-50 dark:bg-black/20 p-4 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none cursor-pointer shadow-inner">
                                                <option value="SaaS / Software">SaaS / Software House</option>
                                                <option value="Arquitetura & Design">Arquitetura & Design</option>
                                                <option value="Marketing & Growth">Marketing & Growth</option>
                                                <option value="Consultoria Técnica">Consultoria Técnica</option>
                                            </select>
                                        </div>
                                        <div className="p-6 bg-orange-50 rounded-[2rem] border border-orange-100 space-y-3">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-orange-600 uppercase tracking-widest"><Sparkles className="w-3.5 h-3.5" /> AUTOMAÇÃO E WHITE LABEL</div>
                                            <p className="text-[10px] text-slate-500 font-bold leading-relaxed">Afeta como o sistema apresenta sua marca para colaboradores e clientes.</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-6 border-t border-slate-50 dark:border-white/5">
                                    <button onClick={handleSaveOrgProfile} disabled={isSaving} className="px-12 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} SINCRONIZAR ORGANIZAÇÃO
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Other tabs: Time and AI */}
            {activeTab === 'team' && (
                <div className="space-y-12 animate-in fade-in duration-500">
                    <div className="flex justify-between items-center">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">MEMBROS DA ORGANIZAÇÃO</h3>
                        <button className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-soft hover:scale-105 transition-all">
                            <UserPlus className="w-4 h-4"/> CONVIDAR
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {members.map(member => (
                            <div key={member.id} className="bg-white dark:bg-white/5 p-6 rounded-[2rem] border border-slate-100 dark:border-white/10 flex items-center justify-between shadow-soft hover:border-orange-500/20 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-100 overflow-hidden flex items-center justify-center">
                                        {member.avatar_url ? <img src={member.avatar_url} className="w-full h-full object-cover"/> : <User className="w-5 h-5 text-slate-300"/>}
                                    </div>
                                    <div>
                                        <div className="font-black text-slate-900 dark:text-white leading-none">{member.nome}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">{member.email}</div>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded-[6px] text-[8px] font-black uppercase tracking-widest ${member.perfil === 'dono' ? 'bg-orange-500 text-white' : 'bg-slate-50 text-slate-400'}`}>
                                    {member.perfil}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'ai' && (
                <div className="max-w-4xl space-y-12 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-6 p-10 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/20 rounded-[3rem] shadow-soft">
                        <div className="w-20 h-20 rounded-[2rem] bg-purple-500 flex items-center justify-center text-white shadow-xl shadow-purple-500/20">
                            <BrainCircuit className="w-10 h-10"/>
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white leading-none">DNA da Organização.</h2>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-2">TREINE O SHINKŌ GURU PARA AGIR COMO SEU CTO VIRTUAL.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">SETOR DE ATUAÇÃO</label>
                                <input value={aiConfig.sector} onChange={e => setAiConfig({...aiConfig, sector: e.target.value})} className="w-full bg-slate-50 dark:bg-black/20 p-5 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500/50 shadow-inner" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">TOM DE VOZ IA</label>
                                <select value={aiConfig.tone} onChange={e => setAiConfig({...aiConfig, tone: e.target.value})} className="w-full bg-slate-50 dark:bg-black/20 p-5 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none cursor-pointer shadow-inner">
                                    <option value="Técnico e Direto">Técnico e Direto</option>
                                    <option value="Consultivo e Estratégico">Consultivo e Estratégico</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">CONTEXTO MESTRE (DNA)</label>
                            <textarea value={aiConfig.context} onChange={e => setAiConfig({...aiConfig, context: e.target.value})} className="w-full h-44 bg-slate-50 dark:bg-black/20 p-6 rounded-[2rem] text-sm leading-relaxed font-medium text-slate-700 dark:text-slate-300 outline-none focus:border-purple-500/50 resize-none shadow-inner" />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button onClick={handleSaveAiConfig} disabled={isSaving} className="px-12 py-5 bg-purple-600 text-white rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-purple-600/20 hover:scale-105 transition-all">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Zap className="w-4 h-4"/>} SINCRONIZAR INTELIGÊNCIA
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
