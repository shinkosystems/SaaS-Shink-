
import React, { useState, useEffect } from 'react';
import { 
    Settings, Sun, Moon, Palette, Building2, UploadCloud, Save, Monitor, Users, 
    Briefcase, Plus, Trash2, Check, User, BrainCircuit, Sparkles,
    Loader2, DollarSign, Calendar, TrendingUp, ShieldCheck, 
    X, ImageIcon, ChevronRight, Zap, Target, Activity, ChevronDown, RefreshCw, AlertCircle, Database, Layout, Link as LinkIcon, Copy, CheckCircle2, ExternalLink
} from 'lucide-react';
import { 
    fetchRoles, createRole, deleteRole, updateRoleCost,
    fetchOrganizationMembersWithRoles, updateUserRole, updateUserCost, updateOrgDetails
} from '../services/organizationService';
import { ElasticSwitch } from './ElasticSwitch';

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
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [isSavingCosts, setIsSavingCosts] = useState(false);
  const [isSavingAi, setIsSavingAi] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Estados para IA
  const [aiSector, setAiSector] = useState(orgDetails?.aiSector || '');
  const [aiTone, setAiTone] = useState(orgDetails?.aiTone || '');
  const [aiContext, setAiContext] = useState(orgDetails?.aiContext || '');

  // Estados locais para edição em lote (Bulk Edit)
  const [localCosts, setLocalCosts] = useState<Record<string, number>>({});
  const [localRoles, setLocalRoles] = useState<Record<string, number | null>>({});

  useEffect(() => { 
      if (userOrgId) loadTeamData(); 
  }, [userOrgId]);

  const loadTeamData = async () => {
    if (!userOrgId) return;
    setLoadingMembers(true);
    try {
        const [r, m] = await Promise.all([
            fetchRoles(userOrgId), 
            fetchOrganizationMembersWithRoles(userOrgId)
        ]);
        
        setRoles(r); 
        
        let finalMembers = m;
        if (!m || m.length === 0) {
            if (userData?.id) {
                finalMembers = [{
                    id: userData.id,
                    nome: userData.name || 'Você',
                    email: userData.email,
                    perfil: userRole,
                    cargo: null,
                    custo_mensal: 0
                }];
            }
        }
        
        setMembers(finalMembers);
        
        const costs: Record<string, number> = {};
        const memberRoles: Record<string, number | null> = {};
        
        finalMembers.forEach(member => {
            memberRoles[member.id] = member.cargo || null;
            if (!member.custo_mensal || member.custo_mensal === 0) {
                const roleObj = r.find((role: any) => role.id === member.cargo);
                costs[member.id] = roleObj?.custo_base || 0;
            } else {
                costs[member.id] = member.custo_mensal;
            }
        });
        
        setLocalCosts(costs);
        setLocalRoles(memberRoles);
    } catch (e: any) {
        console.error("Erro no carregamento do time:", e.message);
    } finally {
        setLoadingMembers(false);
    }
  };

  const handleRoleChange = (memberId: string, roleId: number | null) => {
      setLocalRoles(prev => ({ ...prev, [memberId]: roleId }));
      const selectedRole = roles.find(r => r.id === roleId);
      if (selectedRole) {
          setLocalCosts(prev => ({ ...prev, [memberId]: selectedRole.custo_base }));
      }
  };

  const handleSaveAllCosts = async () => {
      if (!userOrgId) return;
      setIsSavingCosts(true);
      let failures = 0;
      try {
          const promises = members.map(async m => {
              if (localCosts[m.id] !== m.custo_mensal) {
                  const ok = await updateUserCost(m.id, localCosts[m.id]);
                  if (!ok) failures++;
              }
              if (localRoles[m.id] !== m.cargo) {
                  const ok = await updateUserRole(m.id, localRoles[m.id]);
                  if (!ok) failures++;
              }
          });
          await Promise.all(promises);
          await loadTeamData();
          alert(failures > 0 ? "Atenção: Alguns dados não puderam ser sincronizados." : "Engenharia de Custos sincronizada!");
      } catch (e) {
          alert("Erro operacional ao salvar.");
      } finally {
          setIsSavingCosts(false);
      }
  };

  const handleSaveAiDNA = async () => {
    if (!userOrgId) return;
    setIsSavingAi(true);
    try {
        const res = await updateOrgDetails(userOrgId, {
            aiSector, aiTone, aiContext
        });
        if (res.success) {
            alert("Mente da IA sincronizada com o DNA da empresa!");
            onRefreshModules();
        }
    } catch (e) {
        alert("Erro ao salvar DNA.");
    } finally {
        setIsSavingAi(false);
    }
  };

  const ticketPortalUrl = userOrgId ? `${window.location.origin}/ticket/${userOrgId}` : '';

  const handleCopyLink = () => {
      if (!ticketPortalUrl) return;
      navigator.clipboard.writeText(ticketPortalUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
  };

  const tabs = [
      { id: 'general', label: 'GERAL' },
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
                    <div className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[3rem] p-10 space-y-10 shadow-sm">
                        
                        {/* Seção de Aparência */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                <Palette className="w-4 h-4 text-orange-500"/> Personalização Visual
                            </h3>
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

                        {/* Seção de Suporte Externo */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                <LinkIcon className="w-4 h-4 text-blue-500"/> Portais Externos
                            </h3>
                            <div className="p-8 bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-slate-200 dark:border-white/10 space-y-6">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl border border-blue-500/20">
                                            <Activity className="w-6 h-6"/>
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Portal de Tickets Shinkō</div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Link para clientes abrirem chamados</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 w-full md:w-auto">
                                        <a href={ticketPortalUrl} target="_blank" className="p-3 bg-white dark:bg-white/10 rounded-xl border border-slate-200 dark:border-white/10 text-slate-400 hover:text-blue-500 transition-all">
                                            <ExternalLink className="w-4 h-4"/>
                                        </a>
                                        <button 
                                            onClick={handleCopyLink}
                                            className={`flex-1 md:flex-none flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isCopied ? 'bg-emerald-500 text-white shadow-glow-emerald' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg'}`}
                                        >
                                            {isCopied ? <CheckCircle2 className="w-4 h-4"/> : <Copy className="w-4 h-4"/>}
                                            {isCopied ? 'Copiado!' : 'Copiar Link Público'}
                                        </button>
                                    </div>
                                </div>
                                <div className="text-[9px] text-slate-500 font-medium leading-relaxed bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-slate-100 dark:border-white/5 italic">
                                    DICA: Compartilhe este link com seus stakeholders. Todos os chamados abertos através dele cairão automaticamente no seu card "Central de Suporte & Voz do Cliente".
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'ai' && (
                <div className="max-w-5xl space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[3rem] p-10 space-y-10 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
                            <BrainCircuit className="w-64 h-64 text-amber-500"/>
                        </div>
                        
                        <div className="space-y-2 relative z-10">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Mente da IA <span className="text-amber-500">(DNA)</span>.</h3>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Ajuste o comportamento do Guru IA para o seu contexto de negócio.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Setor de Atuação</label>
                                <input value={aiSector} onChange={e => setAiSector(e.target.value)} placeholder="Ex: SaaS Financeiro, EdTech..." className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-white/10 text-sm font-bold outline-none focus:border-amber-500 transition-all dark:text-white" />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tom de Voz</label>
                                <select value={aiTone} onChange={e => setAiTone(e.target.value)} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-white/10 text-sm font-bold outline-none cursor-pointer appearance-none dark:text-white">
                                    <option value="Técnico/Analítico">Técnico & Analítico</option>
                                    <option value="Inspirador/Visionário">Inspirador & Visionário</option>
                                    <option value="Direto/Agressivo">Direto & Executivo</option>
                                    <option value="Amigável/Suporte">Amigável & Prestativo</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4 relative z-10">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contexto Estratégico (DNA da Empresa)</label>
                            <textarea 
                                value={aiContext} 
                                onChange={e => setAiContext(e.target.value)} 
                                placeholder="Descreva brevemente quem é a empresa, qual o grande objetivo do ano e as restrições técnicas atuais..."
                                className="w-full h-48 p-6 rounded-3xl bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-white/10 text-sm font-medium outline-none focus:border-amber-500 transition-all resize-none dark:text-white"
                            />
                        </div>

                        <div className="flex justify-end pt-4 relative z-10">
                            <button 
                                onClick={handleSaveAiDNA}
                                disabled={isSavingAi}
                                className="px-10 py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isSavingAi ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                                Sincronizar Mente IA
                            </button>
                        </div>
                    </div>
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
                                <div className="flex gap-2 mb-4">
                                    <input value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="Novo Cargo..." className="flex-1 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-xs font-bold outline-none dark:text-white" />
                                    <button onClick={() => { if(newRoleName) createRole(newRoleName, userOrgId!).then(() => { setNewRoleName(''); loadTeamData(); }); }} className="p-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl hover:scale-105 transition-all"><Plus className="w-4 h-4"/></button>
                                </div>
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
                                                <button onClick={() => deleteRole(r.id).then(loadTeamData)} className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5"/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-8 space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                    <Users className="w-4 h-4 text-blue-500"/> Apontamento Industrial
                                </h3>
                                <button 
                                    onClick={handleSaveAllCosts}
                                    disabled={isSavingCosts || loadingMembers}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                >
                                    {isSavingCosts ? <Loader2 className="w-3 h-3 animate-spin"/> : <Save className="w-3 h-3"/>}
                                    Sincronizar RH
                                </button>
                            </div>
                            <div className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-[2.5rem] overflow-hidden shadow-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                                        <tr>
                                            <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
                                            <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Cargo Shinkō</th>
                                            <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Custo Mensal (Salário)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {members.map(m => (
                                            <tr key={m.id} className="group hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs border border-slate-200 dark:border-white/5 overflow-hidden shrink-0 shadow-inner">
                                                            {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover" /> : (m.nome ? m.nome.charAt(0) : '?')}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-[11px] font-black text-slate-900 dark:text-white truncate">{m.nome}</div>
                                                            <div className="text-[9px] font-medium text-slate-400 truncate">{m.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="relative">
                                                        <select 
                                                            value={localRoles[m.id] || ''} 
                                                            onChange={e => handleRoleChange(m.id, e.target.value ? parseInt(e.target.value) : null)}
                                                            className={`w-full bg-slate-100 dark:bg-black/40 border-2 rounded-xl p-2.5 text-[10px] font-black uppercase appearance-none outline-none transition-all ${localRoles[m.id] !== m.cargo ? 'border-amber-500/50' : 'border-transparent'}`}
                                                        >
                                                            <option value="">Sem Cargo...</option>
                                                            {roles.map(r => <option key={r.id} value={r.id}>{r.nome.toUpperCase()}</option>)}
                                                        </select>
                                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <span className="text-[10px] font-bold text-slate-400">R$</span>
                                                        <input 
                                                            type="number"
                                                            value={localCosts[m.id] || ''}
                                                            placeholder="0"
                                                            onChange={(e) => setLocalCosts({...localCosts, [m.id]: Number(e.target.value)})}
                                                            className={`w-32 bg-slate-100 dark:bg-black/40 border-2 rounded-xl p-2.5 text-right text-xs font-black outline-none transition-all ${localCosts[m.id] !== m.custo_mensal ? 'border-emerald-500/50' : 'border-transparent'} dark:text-white`}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'team' && (
                <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {members.map(m => (
                            <div key={m.id} className="p-6 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-3xl flex items-center justify-between group">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center font-black text-xs text-slate-500 border border-slate-200 dark:border-white/10 shrink-0">
                                        {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover rounded-2xl" /> : (m.nome ? m.nome.charAt(0) : '?')}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-black text-slate-900 dark:text-white truncate">{m.nome}</div>
                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{m.perfil}</div>
                                    </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${onlineUsers.includes(m.id) ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                                    {onlineUsers.includes(m.id) ? 'Online' : 'Offline'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default SettingsScreen;
