
import React, { useState, useRef, useEffect } from 'react';
import { Settings, Sun, Moon, Palette, Building2, UploadCloud, Save, Monitor, Users, Briefcase, Plus, Trash2, Check, User, BrainCircuit, Sparkles, BookOpen, Fingerprint, Loader2, AlertTriangle, Lock, Copy, CheckCircle, LayoutGrid, DollarSign, Code2, BarChart3, Calendar, TrendingUp, ShieldCheck } from 'lucide-react';
import { fetchRoles, createRole, deleteRole, fetchOrganizationMembersWithRoles, updateUserRole, updateOrgModules } from '../services/organizationService';
import { ElasticSwitch } from './ElasticSwitch';

interface Props {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onlineUsers: string[];
  userOrgId: number | null;
  orgDetails: { 
      name: string, 
      limit: number, 
      logoUrl: string | null, 
      primaryColor: string,
      aiSector: string,
      aiTone: string,
      aiContext: string,
      isWhitelabelActive?: boolean; 
  };
  onUpdateOrgDetails: (updates: { logoFile?: File, color?: string, name?: string, limit?: number, aiSector?: string, aiTone?: string, aiContext?: string }) => Promise<void> | void;
  setView: (view: any) => void;
  userRole: string;
  userData: any;
  currentPlan?: string;
  activeModules: string[];
  onRefreshModules: () => void;
}

const AVAILABLE_MODULES = [
    { id: 'ia', label: 'Inteligência Artificial', desc: 'Assistentes virtuais e automação.', icon: Sparkles },
    { id: 'projects', label: 'Projetos', desc: 'Gestão de portfólio.', icon: Briefcase },
    { id: 'kanban', label: 'Kanban', desc: 'Quadro visual de tarefas.', icon: LayoutGrid },
    { id: 'gantt', label: 'Gantt', desc: 'Cronograma visual.', icon: CheckCircle }, 
    { id: 'calendar', label: 'Agenda', desc: 'Visualização de prazos.', icon: Calendar }, 
    { id: 'crm', label: 'CRM', desc: 'Pipeline de vendas.', icon: TrendingUp },
    { id: 'financial', label: 'Financeiro', desc: 'Controle de caixa.', icon: DollarSign }, 
    { id: 'clients', label: 'Clientes', desc: 'Base de contatos.', icon: Users },
    { id: 'engineering', label: 'Engenharia', desc: 'Métricas DORA.', icon: Code2 },
    { id: 'product', label: 'Produto', desc: 'Indicadores de uso.', icon: BarChart3 },
    { id: 'whitelabel', label: 'Whitelabel', desc: 'Marca própria.', icon: Palette }
];

export const SettingsScreen: React.FC<Props> = ({ 
    theme, onToggleTheme, onlineUsers, userOrgId, orgDetails, onUpdateOrgDetails, setView, userRole, userData, currentPlan, activeModules, onRefreshModules
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'team' | 'ai' | 'modules'>('general');
  const [color, setColor] = useState(orgDetails.primaryColor || '#F59E0B');
  const [orgName, setOrgName] = useState(orgDetails.name);
  const fileRef = useRef<HTMLInputElement>(null);

  // Team
  const [roles, setRoles] = useState<{id: number, nome: string}[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [loadingTeam, setLoadingTeam] = useState(false);
  
  // Modules
  const [localModules, setLocalModules] = useState<string[]>(activeModules || []);
  const [isSavingModules, setIsSavingModules] = useState(false);
  
  // AI
  const [aiSector, setAiSector] = useState(orgDetails.aiSector || '');
  const [aiTone, setAiTone] = useState(orgDetails.aiTone || 'Técnico e Direto');
  const [aiContext, setAiContext] = useState(orgDetails.aiContext || '');
  const [isSavingAi, setIsSavingAi] = useState(false);

  const isAdmin = userRole === 'dono';

  useEffect(() => {
      setLocalModules(activeModules);
  }, [activeModules]);

  useEffect(() => {
      if (activeTab === 'team' && userOrgId && isAdmin) {
          loadTeamData();
      }
  }, [activeTab, userOrgId]);

  const loadTeamData = async () => {
      if (!userOrgId) return;
      setLoadingTeam(true);
      try {
          const [rolesData, membersData] = await Promise.all([
              fetchRoles(userOrgId),
              fetchOrganizationMembersWithRoles(userOrgId)
          ]);
          setRoles(rolesData);
          setMembers(membersData);
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingTeam(false);
      }
  };

  const handleSaveModules = async () => {
      if (!userOrgId) return;
      setIsSavingModules(true);
      try {
          await updateOrgModules(userOrgId, localModules);
          onRefreshModules();
          alert("Módulos atualizados!");
      } catch (e: any) {
          alert("Erro: " + e.message);
      } finally {
          setIsSavingModules(false);
      }
  };

  const handleCreateRole = async () => {
      if (!userOrgId || !newRoleName.trim()) return;
      try {
          await createRole(newRoleName, userOrgId);
          setNewRoleName('');
          loadTeamData();
      } catch (e) { alert("Erro ao criar cargo."); }
  };

  const handleDeleteRole = async (id: number) => {
      if (!window.confirm("Excluir cargo?")) return;
      try {
          await deleteRole(id);
          loadTeamData();
      } catch (e) { alert("Erro ao excluir cargo (pode estar em uso)."); }
  };

  const handleUpdateMemberRole = async (userId: string, roleId: string) => {
      try {
          await updateUserRole(userId, roleId ? Number(roleId) : null);
          loadTeamData();
      } catch (e) { alert("Erro ao atualizar membro."); }
  };

  const handleSaveAiSettings = async () => {
      setIsSavingAi(true);
      try {
          await onUpdateOrgDetails({
              aiSector,
              aiTone,
              aiContext
          });
          alert("Configurações de IA salvas!");
      } catch (e) {
          alert("Erro ao salvar.");
      } finally {
          setIsSavingAi(false);
      }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-5xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configurações</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gerencie sua organização e preferências.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-slate-200 dark:border-white/10 pb-1 overflow-x-auto">
            {[
                { id: 'general', label: 'Geral', icon: Monitor },
                { id: 'modules', label: 'Módulos', icon: LayoutGrid },
                { id: 'team', label: 'Time', icon: Users },
                { id: 'ai', label: 'Inteligência', icon: BrainCircuit }
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-bold transition-colors border-b-2 ${activeTab === tab.id ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    <tab.icon className="w-4 h-4"/> {tab.label}
                </button>
            ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
            {activeTab === 'general' && (
                <div className="space-y-8 max-w-2xl animate-in slide-in-from-left-4">
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Aparência</h3>
                        <div className="flex gap-4">
                            <button onClick={onToggleTheme} className={`flex-1 p-4 rounded-xl border flex items-center justify-center gap-3 transition-all ${theme === 'light' ? 'bg-white border-slate-300 shadow-sm' : 'bg-slate-50 border-transparent text-slate-400'}`}>
                                <Sun className="w-5 h-5"/> Claro
                            </button>
                            <button onClick={onToggleTheme} className={`flex-1 p-4 rounded-xl border flex items-center justify-center gap-3 transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white shadow-sm' : 'bg-slate-100 border-transparent text-slate-400'}`}>
                                <Moon className="w-5 h-5"/> Escuro
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/10">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Organização</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">Nome da Empresa</label>
                                <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none text-sm" disabled={!isAdmin}/>
                            </div>
                            {isAdmin && (
                                <button onClick={() => onUpdateOrgDetails({ name: orgName })} className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold shadow-sm hover:opacity-90">
                                    Salvar Alterações
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'modules' && (
                <div className="animate-in slide-in-from-right-4">
                    <div className="flex justify-between items-center mb-6">
                        <p className="text-sm text-slate-500">Ative as funcionalidades que seu time usa.</p>
                        {isAdmin && (
                            <button onClick={handleSaveModules} disabled={isSavingModules} className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold shadow-sm hover:opacity-90">
                                {isSavingModules ? 'Salvando...' : 'Salvar Módulos'}
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {AVAILABLE_MODULES.map(mod => {
                            const isActive = localModules.includes(mod.id);
                            return (
                                <div key={mod.id} onClick={() => isAdmin && setLocalModules(prev => prev.includes(mod.id) ? prev.filter(m => m !== mod.id) : [...prev, mod.id])} className={`p-4 rounded-xl border cursor-pointer transition-all ${isActive ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 shadow-sm' : 'bg-slate-50 dark:bg-white/5 border-transparent opacity-60'}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white">
                                            <mod.icon className="w-5 h-5"/>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isActive ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                                            {isActive && <Check className="w-3 h-3"/>}
                                        </div>
                                    </div>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{mod.label}</h4>
                                    <p className="text-xs text-slate-500 mt-1">{mod.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeTab === 'team' && (
                <div className="animate-in slide-in-from-right-4 space-y-8">
                    {/* Roles Management */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Cargos & Permissões</h3>
                        <div className="flex gap-2 mb-4">
                            <input 
                                value={newRoleName}
                                onChange={e => setNewRoleName(e.target.value)}
                                placeholder="Novo Cargo (ex: Designer)"
                                className="flex-1 p-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none"
                            />
                            <button onClick={handleCreateRole} className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold">
                                Adicionar
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {roles.map(role => (
                                <div key={role.id} className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 group">
                                    {role.nome}
                                    <button onClick={() => handleDeleteRole(role.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="w-3 h-3"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Members List */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Membros do Time</h3>
                        <div className="space-y-2">
                            {loadingTeam ? <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto"/> : members.map(member => (
                                <div key={member.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                                            {member.avatar_url ? <img src={member.avatar_url} className="w-full h-full object-cover"/> : <User className="w-4 h-4 m-2 text-slate-500"/>}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-900 dark:text-white">{member.nome}</div>
                                            <div className="text-xs text-slate-500">{member.email}</div>
                                        </div>
                                    </div>
                                    <select 
                                        value={member.cargo || ''} 
                                        onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
                                        className="bg-slate-50 dark:bg-white/5 border-transparent rounded-lg text-xs p-2 outline-none cursor-pointer"
                                    >
                                        <option value="">Sem Cargo</option>
                                        {roles.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'ai' && (
                <div className="animate-in slide-in-from-right-4 max-w-2xl space-y-6">
                    <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl mb-6">
                        <h3 className="text-sm font-bold text-purple-600 dark:text-purple-400 flex items-center gap-2">
                            <Sparkles className="w-4 h-4"/> Personalidade da IA
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Defina como a inteligência artificial deve se comportar ao gerar tarefas e análises para sua empresa.
                        </p>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Setor de Atuação</label>
                        <input 
                            value={aiSector}
                            onChange={e => setAiSector(e.target.value)}
                            placeholder="Ex: SaaS B2B, Logística, Marketing..."
                            className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tom de Voz</label>
                        <select 
                            value={aiTone}
                            onChange={e => setAiTone(e.target.value)}
                            className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none cursor-pointer"
                        >
                            <option>Técnico e Direto</option>
                            <option>Executivo e Estratégico</option>
                            <option>Criativo e Informal</option>
                            <option>Formal e Corporativo</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">DNA da Empresa (Contexto)</label>
                        <textarea 
                            value={aiContext}
                            onChange={e => setAiContext(e.target.value)}
                            placeholder="Descreva brevemente o que sua empresa faz, seus valores e objetivos. A IA usará isso para contextualizar sugestões."
                            className="w-full p-3 h-32 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none resize-none"
                        />
                    </div>

                    <button 
                        onClick={handleSaveAiSettings} 
                        disabled={isSavingAi}
                        className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
                    >
                        {isSavingAi ? <Loader2 className="w-4 h-4 animate-spin"/> : <BrainCircuit className="w-4 h-4"/>}
                        Salvar Preferências
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};
