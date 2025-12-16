
import React, { useState, useRef, useEffect } from 'react';
import { Settings, Sun, Moon, Palette, Building2, UploadCloud, Save, Monitor, Users, Briefcase, Plus, Trash2, Check, User, BrainCircuit, Sparkles, BookOpen, Fingerprint, Loader2, AlertTriangle, Lock, Copy, CheckCircle, LayoutGrid, DollarSign, Code2, BarChart3, Calendar, TrendingUp, ShieldCheck, ShoppingCart, CreditCard, ExternalLink, Receipt, X, Image as ImageIcon, FileText, ArrowRight } from 'lucide-react';
import { fetchRoles, createRole, deleteRole, fetchOrganizationMembersWithRoles, updateUserRole, updateOrgModules } from '../services/organizationService';
import { createModuleCheckoutSession, createCustomerPortalSession, uploadReceiptAndNotify } from '../services/asaasService';

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
  initialTab?: 'general' | 'team' | 'ai' | 'modules';
}

const AVAILABLE_MODULES = [
    { id: 'projects', label: 'Gestão de Projetos', desc: 'Portfólio e lista.', icon: Briefcase, price: 0, core: true },
    { id: 'kanban', label: 'Kanban Board', desc: 'Gestão visual de tarefas.', icon: LayoutGrid, price: 0, core: true },
    { id: 'calendar', label: 'Agenda & Prazos', desc: 'Visualização mensal/semanal.', icon: Calendar, price: 0, core: true },
    { id: 'gantt', label: 'Cronograma Gantt', desc: 'Linha do tempo e dependências.', icon: CheckCircle, price: 29.90 }, 
    { id: 'financial', label: 'Gestão Financeira', desc: 'Fluxo de caixa e MRR.', icon: DollarSign, price: 39.90 }, 
    { id: 'crm', label: 'CRM de Vendas', desc: 'Pipeline e contratos.', icon: TrendingUp, price: 49.90 }, 
    { id: 'ia', label: 'Shinkō Guru AI', desc: 'Seu CTO Virtual (IA).', icon: BrainCircuit, price: 59.90 },
    { id: 'engineering', label: 'Engenharia (DORA)', desc: 'Métricas de performance.', icon: Code2, price: 69.90 },
    { id: 'product', label: 'Métricas de Produto', desc: 'Analytics e engajamento.', icon: BarChart3, price: 69.90 },
    { id: 'clients', label: 'Portal do Cliente', desc: 'Área externa de aprovação.', icon: Users, price: 39.90 },
    { id: 'whitelabel', label: 'White Label', desc: 'Personalização da marca.', icon: Palette, price: 1500.00 }
];

const PIX_KEY = "60.428.589/0001-55";

export const SettingsScreen: React.FC<Props> = ({ 
    theme, onToggleTheme, onlineUsers, userOrgId, orgDetails, onUpdateOrgDetails, setView, userRole, userData, currentPlan, activeModules, onRefreshModules, initialTab = 'general'
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'team' | 'ai' | 'modules'>(initialTab);
  const [orgName, setOrgName] = useState(orgDetails.name);
  const [roles, setRoles] = useState<{id: number, nome: string}[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [localModules, setLocalModules] = useState<string[]>(activeModules || []);
  
  // Modal States
  const [moduleToBuy, setModuleToBuy] = useState<any | null>(null);
  const [showSubModal, setShowSubModal] = useState(false);
  
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const [aiSector, setAiSector] = useState(orgDetails.aiSector || '');
  const [aiTone, setAiTone] = useState(orgDetails.aiTone || 'Técnico e Direto');
  const [aiContext, setAiContext] = useState(orgDetails.aiContext || '');
  const [isSavingAi, setIsSavingAi] = useState(false);

  const isAdmin = userRole === 'dono';
  const hasGuruAi = activeModules.includes('ia');

  useEffect(() => { setLocalModules(activeModules); }, [activeModules]);
  useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);
  useEffect(() => { if (activeTab === 'team' && userOrgId && isAdmin) loadTeamData(); }, [activeTab, userOrgId, isAdmin]);

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
      } catch (e) { console.error(e); } finally { setLoadingTeam(false); }
  };

  const handleCopyPix = () => {
      navigator.clipboard.writeText(PIX_KEY);
      alert("Chave PIX copiada!");
  };

  const handleSendReceipt = async () => {
      if (!userOrgId || !moduleToBuy || !receiptFile) return;
      setIsProcessingPurchase(true);
      try {
          const result = await uploadReceiptAndNotify(
              userData.id || 'unknown',
              userOrgId,
              moduleToBuy.id,
              moduleToBuy.price,
              receiptFile,
              `Compra Módulo: ${moduleToBuy.label}`,
              { modules: [moduleToBuy.id], moduleName: moduleToBuy.label, type: 'module_purchase' }
          );
          if (result.success) {
              alert("Enviado com sucesso! Aguarde a ativação.");
              setModuleToBuy(null);
              setReceiptFile(null);
          }
      } catch (e: any) { alert("Erro ao enviar: " + e.message); } 
      finally { setIsProcessingPurchase(false); }
  };

  const handleManageSubscription = () => {
      setShowSubModal(true);
  };

  const handleModuleClick = (mod: any) => {
      if (!isAdmin || localModules.includes(mod.id)) return;
      setReceiptFile(null);
      setModuleToBuy(mod);
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
      } catch (e) { alert("Erro ao excluir cargo."); }
  };

  const handleUpdateMemberRole = async (userId: string, roleId: string) => {
      try {
          await updateUserRole(userId, roleId ? Number(roleId) : null);
          loadTeamData();
      } catch (e) { alert("Erro ao atualizar cargo do membro."); }
  };

  const handleSaveAiSettings = async () => {
      setIsSavingAi(true);
      try {
          await onUpdateOrgDetails({ aiSector, aiTone, aiContext });
          alert("Configurações de IA salvas!");
      } catch (e) { alert("Erro ao salvar."); } 
      finally { setIsSavingAi(false); }
  };

  const formatPlanName = (planKey?: string) => {
      if (!planKey) return 'Gratuito';
      let name = planKey.replace('plan_', '');
      if (name === 'free') return 'Gratuito';
      if (name === 'solo') return 'Core Solo';
      if (name === 'studio') return 'Core Studio';
      if (name === 'scale') return 'Core Scale';
      if (name === 'enterprise') return 'Enterprise';
      if (name.includes('yearly')) name = name.replace('_yearly', ' (Anual)');
      return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const visibleTabs = [
      { id: 'general', label: 'Geral', icon: Monitor },
      { id: 'modules', label: 'Marketplace', icon: ShoppingCart },
      { id: 'team', label: 'Time', icon: Users },
      { id: 'ai', label: 'Inteligência', icon: BrainCircuit, locked: !hasGuruAi }
  ];

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-5xl mx-auto p-4 md:p-8">
        <div className="mb-8 flex justify-between items-start">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configurações</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gerencie sua organização e preferências.</p>
            </div>
            {isAdmin && (
                <button 
                    onClick={handleManageSubscription} 
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-lg text-xs font-bold transition-all"
                >
                    <Receipt className="w-3 h-3"/>
                    Gerenciar Assinatura
                </button>
            )}
        </div>

        <div className="flex gap-2 mb-8 border-b border-slate-200 dark:border-white/10 pb-1 overflow-x-auto">
            {visibleTabs.map(tab => (
                <button 
                    key={tab.id} 
                    onClick={() => setActiveTab(tab.id as any)} 
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    <tab.icon className="w-4 h-4"/> 
                    {tab.label} 
                    {tab.locked && <Lock className="w-3 h-3 text-slate-400 ml-1"/>}
                </button>
            ))}
        </div>

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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in slide-in-from-right-4">
                    {AVAILABLE_MODULES.map(mod => {
                        const isOwned = localModules.includes(mod.id);
                        return (
                            <div key={mod.id} onClick={() => handleModuleClick(mod)} className={`p-5 rounded-2xl border transition-all group ${isOwned ? 'bg-white dark:bg-slate-900 border-emerald-500/30 shadow-sm' : 'bg-slate-50 dark:bg-white/5 border-transparent hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-xl ${isOwned ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>
                                        <mod.icon className="w-6 h-6"/>
                                    </div>
                                    {isOwned ? (
                                        <div className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full uppercase flex items-center gap-1">
                                            <Check className="w-3 h-3"/> Ativo
                                        </div>
                                    ) : (
                                        <div className="text-[10px] font-bold text-slate-400 border border-slate-200 dark:border-white/10 px-2 py-1 rounded-full uppercase">
                                            + Comprar
                                        </div>
                                    )}
                                </div>
                                <h4 className="font-bold text-slate-900 dark:text-white mb-1">{mod.label}</h4>
                                <p className="text-xs text-slate-500 h-8 line-clamp-2">{mod.desc}</p>
                                {!isOwned && (
                                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 flex justify-between items-center">
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">R$ {mod.price.toFixed(2)}</span>
                                        <button className="text-xs bg-slate-900 dark:bg-white text-white dark:text-black px-3 py-1.5 rounded-lg font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                            Adicionar
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {activeTab === 'team' && (
                <div className="animate-in slide-in-from-right-4 space-y-8">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Cargos & Permissões</h3>
                        <div className="flex gap-2 mb-4">
                            <input value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="Novo Cargo" className="flex-1 p-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none"/>
                            <button onClick={handleCreateRole} className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold">Adicionar</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {roles.map(role => (
                                <div key={role.id} className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 flex items-center gap-2 text-xs font-bold group">
                                    {role.nome}
                                    <button onClick={() => handleDeleteRole(role.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="w-3 h-3"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Membros do Time</h3>
                        <div className="space-y-2">
                            {loadingTeam ? <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto"/> : members.map(member => (
                                <div key={member.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                                            {member.avatar_url ? <img src={member.avatar_url} alt="avatar" className="w-full h-full object-cover"/> : <User className="w-4 h-4 m-2 text-slate-500"/>}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-900 dark:text-white">{member.nome}</div>
                                            <div className="text-xs text-slate-500">{member.email}</div>
                                        </div>
                                    </div>
                                    <select value={member.cargo || ''} onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)} className="bg-slate-50 dark:bg-white/5 border-transparent rounded-lg text-xs p-2 outline-none">
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
                    {!hasGuruAi ? (
                        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-300 dark:border-white/10 rounded-3xl bg-slate-50 dark:bg-white/5 text-center">
                            <Lock className="w-16 h-16 text-slate-400 mb-6"/>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Guru AI Bloqueado</h3>
                            <p className="text-slate-500 text-sm mb-8">Personalize o DNA da IA contratando este módulo.</p>
                            <button onClick={() => handleModuleClick(AVAILABLE_MODULES.find(m => m.id === 'ia'))} className="px-8 py-3 bg-purple-600 text-white font-bold rounded-xl text-sm flex items-center gap-2">
                                <Sparkles className="w-4 h-4"/> Adicionar Módulo AI
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl mb-6">
                                <h3 className="text-sm font-bold text-purple-600 flex items-center gap-2"><Sparkles className="w-4 h-4"/> Personalidade do Guru</h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Setor de Atuação</label>
                                    <input value={aiSector} onChange={e => setAiSector(e.target.value)} placeholder="Ex: SaaS B2B..." className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none"/>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tom de Voz</label>
                                    <select value={aiTone} onChange={e => setAiTone(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none">
                                        <option>Técnico e Direto</option>
                                        <option>Executivo e Estratégico</option>
                                        <option>Criativo e Informal</option>
                                        <option>Formal e Corporativo</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">DNA da Empresa</label>
                                    <textarea value={aiContext} onChange={e => setAiContext(e.target.value)} placeholder="Descreva brevemente o que sua empresa faz..." className="w-full h-32 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none resize-none"/>
                                </div>
                                <button onClick={handleSaveAiSettings} disabled={isSavingAi} className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                                    {isSavingAi ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                                    Salvar Configurações
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>

        {/* Modal: SUBSCRIPTION MANAGER */}
        {showSubModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-0 shadow-2xl relative border border-white/10 animate-in zoom-in-95 overflow-hidden">
                    <div className="p-6 bg-gradient-to-br from-indigo-900 to-slate-900 border-b border-white/10 text-white relative">
                        <button onClick={() => setShowSubModal(false)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X className="w-5 h-5"/></button>
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-1">
                            <CreditCard className="w-5 h-5 text-emerald-400"/> Assinatura
                        </h2>
                        <p className="text-indigo-200 text-xs">Detalhes do seu plano atual.</p>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                            <div>
                                <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Plano Atual</span>
                                <span className="text-lg font-bold text-slate-900 dark:text-white">{formatPlanName(currentPlan)}</span>
                            </div>
                            <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full border border-emerald-200 dark:border-emerald-800">
                                Ativo
                            </span>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-white/5 pb-3">
                                <span className="text-slate-500">Próxima Cobrança</span>
                                <span className="font-mono text-slate-700 dark:text-slate-300">
                                    {new Date(new Date().setDate(new Date().getDate() + 15)).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Módulos Extras</span>
                                <span className="font-mono text-slate-700 dark:text-slate-300">{localModules.length - 2} ativos</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button 
                                onClick={() => { setShowSubModal(false); setView('financial'); }} 
                                className="py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                            >
                                <Receipt className="w-3 h-3"/> Histórico
                            </button>
                            <button 
                                onClick={() => { setShowSubModal(false); setActiveTab('modules'); }} 
                                className="py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold transition-colors shadow-lg flex items-center justify-center gap-2"
                            >
                                <ArrowRight className="w-3 h-3"/> Alterar Plano
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Modal: BUY MODULE (Existing) */}
        {moduleToBuy && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-8 shadow-2xl relative border border-white/10 animate-in zoom-in-95">
                    <button onClick={() => setModuleToBuy(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center text-white mb-4"><moduleToBuy.icon className="w-8 h-8"/></div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Ativar {moduleToBuy.label}</h3>
                    </div>
                    <div className="space-y-4 mb-6">
                        <div className="bg-slate-50 dark:bg-black/30 p-4 rounded-xl border border-slate-200 dark:border-white/5 text-sm">
                            <div className="flex justify-between mb-2"><span className="text-slate-500">Valor</span><span className="font-bold dark:text-white">R$ {moduleToBuy.price.toFixed(2)}</span></div>
                            <div className="flex justify-between items-center"><span className="text-slate-500">PIX</span><div className="flex items-center gap-2"><span className="font-mono text-[10px]">{PIX_KEY}</span><button onClick={handleCopyPix} className="text-slate-400 hover:text-emerald-500"><Copy className="w-4 h-4"/></button></div></div>
                        </div>
                        <div className="border-2 border-dashed border-slate-300 dark:border-white/10 rounded-xl p-4 text-center cursor-pointer" onClick={() => receiptInputRef.current?.click()}>
                            {receiptFile ? <div className="text-emerald-500 text-xs font-bold">{receiptFile.name}</div> : <div className="text-slate-400 text-xs">Anexar Comprovante</div>}
                            <input ref={receiptInputRef} type="file" className="hidden" onChange={(e) => e.target.files && setReceiptFile(e.target.files[0])}/>
                        </div>
                    </div>
                    <button onClick={handleSendReceipt} disabled={isProcessingPurchase || !receiptFile} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                        {isProcessingPurchase ? <Loader2 className="w-5 h-5 animate-spin"/> : <CheckCircle className="w-5 h-5"/>}
                        Enviar Comprovante
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};
