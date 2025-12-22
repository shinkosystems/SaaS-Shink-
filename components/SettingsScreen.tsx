
import React, { useState, useRef, useEffect } from 'react';
import { 
    Settings, Sun, Moon, Palette, Building2, UploadCloud, Save, Monitor, Users, 
    Briefcase, Plus, Trash2, Check, User, BrainCircuit, Sparkles, BookOpen, 
    Fingerprint, Loader2, AlertTriangle, Lock, Copy, CheckCircle, LayoutGrid, 
    DollarSign, Code2, BarChart3, Calendar, TrendingUp, ShieldCheck, ShoppingCart, 
    CreditCard, ExternalLink, Receipt, X, Image as ImageIcon, FileText, ArrowRight, ChevronRight,
    UserPlus, Mail, Shield, Zap, Rocket, Building
} from 'lucide-react';
import { fetchRoles, createRole, deleteRole, fetchOrganizationMembersWithRoles, updateUserRole, updateOrgModules, createOrganization } from '../services/organizationService';
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

export const SettingsScreen: React.FC<Props> = ({ 
    theme, onToggleTheme, onlineUsers, userOrgId, orgDetails, onUpdateOrgDetails, setView, userRole, userData, currentPlan, activeModules, onRefreshModules, initialTab = 'general'
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'team' | 'ai' | 'modules'>(initialTab);
  const [roles, setRoles] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  // Create Org State
  const [newOrgData, setNewOrgData] = useState({ name: '', sector: '', dna: '' });

  // Organization Local Edit State (Loaded from props)
  const [editOrg, setEditOrg] = useState({
      name: orgDetails?.name || '',
      sector: orgDetails?.aiSector || '',
      primaryColor: orgDetails?.primaryColor || '#F59E0B',
      logoFile: null as File | null,
      logoPreview: orgDetails?.logoUrl || null
  });

  // AI Config Local State
  const [aiConfig, setAiConfig] = useState({
      sector: orgDetails?.aiSector || '',
      tone: orgDetails?.aiTone || '',
      context: orgDetails?.aiContext || ''
  });

  const isAdmin = userRole === 'dono';

  useEffect(() => {
    if (userOrgId) {
        loadTeamData();
    }
  }, [userOrgId]);

  // Sync edit state when orgDetails change
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

  const handleCreateOrg = async () => {
      if (!newOrgData.name.trim() || !newOrgData.sector.trim()) {
          alert("Nome e Setor são obrigatórios.");
          return;
      }
      setIsSaving(true);
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("Sessão não identificada.");
          
          await createOrganization(user.id, newOrgData.name, newOrgData.sector, newOrgData.dna);
          alert("Organização criada com sucesso!");
          window.location.reload();
      } catch (e: any) {
          alert(e.message);
      } finally {
          setIsSaving(false);
      }
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

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setEditOrg({ ...editOrg, logoFile: file, logoPreview: URL.createObjectURL(file) });
      }
  };

  const handleCreateRole = async () => {
      if (!newRoleName.trim() || !userOrgId) return;
      await createRole(newRoleName, userOrgId);
      setNewRoleName('');
      loadTeamData();
  };

  const handleDeleteRole = async (id: number) => {
      if (!confirm("Excluir este cargo? Usuários vinculados ficarão 'Sem Cargo'.")) return;
      await deleteRole(id);
      loadTeamData();
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

  // RENDER: CREATE ORGANIZATION VIEW FOR OWNERS WITHOUT ORG
  if (!userOrgId && userRole === 'dono') {
      return (
          <div className="flex flex-col h-full items-center justify-center p-8 animate-in fade-in duration-700 bg-slate-50 dark:bg-[#020203]">
              <div className="max-w-2xl w-full space-y-12">
                  <div className="text-center space-y-4">
                      <div className="w-20 h-20 bg-amber-500 rounded-[2rem] flex items-center justify-center text-black shadow-glow-amber mx-auto mb-8 animate-ios-pop">
                          <Rocket className="w-10 h-10" />
                      </div>
                      <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                          Nova <span className="text-amber-500">Organização</span>.
                      </h1>
                      <p className="text-slate-500 text-lg font-bold uppercase tracking-widest">Inicie sua operação no ecossistema Shinkō</p>
                  </div>

                  <div className="glass-panel p-10 rounded-[3rem] space-y-8 border-slate-200 dark:border-white/5 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                      
                      <div className="space-y-6">
                          <div>
                              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] mb-3 ml-1">Nome da Empresa / Razão Social</label>
                              <input 
                                  value={newOrgData.name}
                                  onChange={e => setNewOrgData({...newOrgData, name: e.target.value})}
                                  placeholder="Ex: Shinkō Software House"
                                  className="w-full glass-panel p-5 rounded-2xl text-base font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500/50 shadow-inner"
                              />
                          </div>

                          <div>
                              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] mb-3 ml-1">Setor Principal</label>
                              <select 
                                  value={newOrgData.sector}
                                  onChange={e => setNewOrgData({...newOrgData, sector: e.target.value})}
                                  className="w-full glass-panel p-5 rounded-2xl text-base font-bold text-slate-900 dark:text-white outline-none cursor-pointer shadow-inner"
                              >
                                  <option value="">Selecione seu nicho...</option>
                                  <option value="SaaS / Software">SaaS / Software House</option>
                                  <option value="Arquitetura & Design">Arquitetura & Design</option>
                                  <option value="Marketing & Growth">Marketing & Growth</option>
                                  <option value="Consultoria Técnica">Consultoria Técnica</option>
                                  <option value="E-commerce / Retail">E-commerce / Retail</option>
                                  <option value="Outros">Outros</option>
                              </select>
                          </div>

                          <div>
                              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] mb-3 ml-1">DNA Mestre (IA Context)</label>
                              <textarea 
                                  value={newOrgData.dna}
                                  onChange={e => setNewOrgData({...newOrgData, dna: e.target.value})}
                                  placeholder="Conte um pouco sobre o que sua empresa faz para treinar seu Guru AI..."
                                  className="w-full h-32 glass-panel p-6 rounded-[2rem] text-sm leading-relaxed font-medium text-slate-700 dark:text-slate-300 outline-none focus:border-amber-500/50 resize-none shadow-inner"
                              />
                          </div>
                      </div>

                      <button 
                          onClick={handleCreateOrg}
                          disabled={isSaving}
                          className="w-full py-6 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[1.8rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                          {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : <CheckCircle className="w-5 h-5"/>}
                          Configurar Minha Organização
                      </button>
                  </div>
                  
                  <p className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                      <ShieldCheck className="w-3 h-3 text-emerald-500"/> Segurança e Governança Garantidas pelo Framework
                  </p>
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-700 max-w-7xl mx-auto p-8 space-y-12">
        {/* Header Shinko OS */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[9px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest">
                    <Settings className="w-3 h-3"/> Sistema Operacional
                </div>
                <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">
                    Ajustes <span className="text-amber-500">Mestres</span>.
                </h1>
            </div>
            <button className="px-8 py-4 glass-panel rounded-[1.5rem] flex items-center gap-3 text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white transition-all shadow-sm">
                <Receipt className="w-4 h-4 text-amber-500"/> Gerenciar Assinatura
            </button>
        </div>

        {/* Tab Switcher Ultra Gloss */}
        <div className="flex p-2 glass-panel rounded-[2rem] backdrop-blur-3xl w-fit">
            {[
                { id: 'general', label: 'Geral', icon: Monitor },
                { id: 'modules', label: 'Marketplace', icon: ShoppingCart },
                { id: 'team', label: 'Time', icon: Users },
                { id: 'ai', label: 'Inteligência', icon: BrainCircuit }
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab.id ? 'bg-amber-500 text-black shadow-lg scale-105' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-black/5'}`}
                >
                    <tab.icon className="w-4 h-4"/> {tab.label}
                </button>
            ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
            
            {/* TAB: GENERAL */}
            {activeTab === 'general' && (
                <div className="max-w-4xl space-y-16 animate-in slide-in-from-left-4">
                    
                    {/* User Theme Config */}
                    <div className="space-y-6">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-2">
                            <Monitor className="w-4 h-4" /> Experiência de Uso
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                            <button onClick={onToggleTheme} className={`p-8 rounded-[2.5rem] border transition-all flex flex-col items-center gap-4 ${theme === 'light' ? 'bg-white border-amber-500/50 shadow-xl text-amber-600' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                                <Sun className="w-8 h-8"/> <span className="text-[10px] font-black uppercase tracking-widest">Modo Claro</span>
                            </button>
                            <button onClick={onToggleTheme} className={`p-8 rounded-[2.5rem] border transition-all flex flex-col items-center gap-4 ${theme === 'dark' ? 'bg-slate-900 border-amber-500/30 text-white shadow-glow-amber' : 'bg-black/10 border-white/5 text-slate-500'}`}>
                                <Moon className="w-8 h-8"/> <span className="text-[10px] font-black uppercase tracking-widest">Modo Escuro</span>
                            </button>
                        </div>
                    </div>

                    {/* Organization Management (ONLY FOR OWNERS) */}
                    {isAdmin && (
                        <div className="space-y-10 animate-in fade-in duration-1000">
                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-2">
                                <Building className="w-4 h-4 text-amber-500" /> Perfil da Organização
                            </h3>
                            
                            <div className="glass-panel p-10 rounded-[2.5rem] border-slate-200 dark:border-white/5 space-y-10 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Identificação da Marca</label>
                                            <div className="flex items-center gap-6">
                                                <div 
                                                    onClick={() => logoInputRef.current?.click()}
                                                    className="w-24 h-24 rounded-[1.8rem] bg-slate-100 dark:bg-black/40 border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-amber-500/50 hover:bg-amber-500/5 transition-all group overflow-hidden shadow-inner"
                                                >
                                                    {editOrg.logoPreview ? (
                                                        <img src={editOrg.logoPreview} className="w-full h-full object-contain p-2" />
                                                    ) : (
                                                        <>
                                                            <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-amber-500 mb-1" />
                                                            <span className="text-[8px] font-black text-slate-500 uppercase">Logo</span>
                                                        </>
                                                    )}
                                                </div>
                                                <input type="file" ref={logoInputRef} hidden accept="image/*" onChange={handleLogoChange} />
                                                
                                                <div className="flex-1 space-y-3">
                                                    <div>
                                                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Cor Primária</label>
                                                        <div className="flex items-center gap-3 bg-white/50 dark:bg-black/20 p-2.5 rounded-xl border border-slate-200 dark:border-white/5 shadow-inner">
                                                            <input 
                                                                type="color" 
                                                                value={editOrg.primaryColor}
                                                                onChange={e => setEditOrg({...editOrg, primaryColor: e.target.value})}
                                                                className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none"
                                                            />
                                                            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">{editOrg.primaryColor.toUpperCase()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Nome Comercial</label>
                                            <input 
                                                value={editOrg.name}
                                                onChange={e => setEditOrg({...editOrg, name: e.target.value})}
                                                className="w-full glass-panel p-4 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500/50 shadow-inner"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Nicho de Atuação</label>
                                            <select 
                                                value={editOrg.sector}
                                                onChange={e => setEditOrg({...editOrg, sector: e.target.value})}
                                                className="w-full glass-panel p-4 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none cursor-pointer shadow-inner"
                                            >
                                                <option value="SaaS / Software">SaaS / Software House</option>
                                                <option value="Arquitetura & Design">Arquitetura & Design</option>
                                                <option value="Marketing & Growth">Marketing & Growth</option>
                                                <option value="Consultoria Técnica">Consultoria Técnica</option>
                                                <option value="E-commerce / Retail">E-commerce / Retail</option>
                                                <option value="Outros">Outros</option>
                                            </select>
                                        </div>

                                        <div className="p-6 bg-amber-500/5 rounded-[2rem] border border-amber-500/10 space-y-3">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-amber-500 uppercase tracking-widest">
                                                <Sparkles className="w-3.5 h-3.5" /> Automação e White Label
                                            </div>
                                            <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                                                Estas configurações afetam como o sistema apresenta sua marca para colaboradores e clientes em portais externos.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-6 border-t border-slate-200 dark:border-white/5">
                                    <button 
                                        onClick={handleSaveOrgProfile}
                                        disabled={isSaving}
                                        className="px-12 py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                                        Sincronizar Organização
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB: MARKETPLACE */}
            {activeTab === 'modules' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                    {AVAILABLE_MODULES.map(mod => {
                        const isOwned = activeModules.includes(mod.id);
                        return (
                            <div key={mod.id} className={`group relative p-10 glass-card transition-all duration-500 flex flex-col justify-between h-72 ${isOwned ? 'border-emerald-500/40 shadow-emerald-500/5' : 'hover:border-amber-500/30'}`}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-amber-500/10 transition-colors"></div>
                                
                                <div className="relative z-10 flex justify-between items-start">
                                    <div className={`p-4 rounded-[1.2rem] ${isOwned ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500' : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500'} border border-white/10 shadow-sm`}>
                                        <mod.icon className="w-6 h-6"/>
                                    </div>
                                    {isOwned ? (
                                        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">Ativo</span>
                                    ) : (
                                        <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 text-[9px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/10">Disponível</span>
                                    )}
                                </div>

                                <div className="relative z-10">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{mod.label}</h3>
                                    <p className="text-xs text-slate-500 font-bold leading-relaxed">{mod.desc}</p>
                                </div>

                                {!isOwned && (
                                    <button className="mt-4 flex items-center justify-between group/btn">
                                        <span className="text-lg font-black text-slate-900 dark:text-white">R$ {mod.price.toFixed(2)}<span className="text-[10px] text-slate-500">/mês</span></span>
                                        <div className="w-10 h-10 rounded-full bg-slate-900 dark:bg-white text-white dark:text-black flex items-center justify-center group-hover/btn:bg-amber-500 group-hover/btn:text-black transition-colors">
                                            <ChevronRight className="w-6 h-6"/>
                                        </div>
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* TAB: TEAM (TIME) */}
            {activeTab === 'team' && (
                <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {/* Membros */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Membros da Organização.</h3>
                                <button className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <UserPlus className="w-3.5 h-3.5"/> Convidar
                                </button>
                            </div>
                            <div className="space-y-3">
                                {members.map(member => (
                                    <div key={member.id} className="glass-card p-6 flex items-center justify-between group">
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center">
                                                {member.avatar_url ? <img src={member.avatar_url} className="w-full h-full object-cover"/> : <User className="w-5 h-5 text-slate-400"/>}
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-900 dark:text-white leading-none">{member.nome}</div>
                                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">{member.email}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <select 
                                                value={member.cargo || ""} 
                                                onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
                                                className="bg-transparent text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest outline-none cursor-pointer text-right"
                                            >
                                                <option value="" className="bg-white dark:bg-slate-900">Sem Cargo</option>
                                                {roles.map(r => <option key={r.id} value={r.id} className="bg-white dark:bg-slate-900">{r.nome}</option>)}
                                            </select>
                                            <div className="w-px h-8 bg-slate-200 dark:bg-white/5"></div>
                                            <span className={`px-2 py-1 rounded-[6px] text-[8px] font-black uppercase tracking-widest ${member.perfil === 'dono' ? 'bg-amber-500/10 text-amber-600' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}>
                                                {member.perfil}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Cargos */}
                        <div className="space-y-6">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Cargos & Estrutura.</h3>
                            <div className="glass-panel p-6 rounded-[2rem] space-y-6">
                                <div className="flex gap-2">
                                    <input 
                                        value={newRoleName}
                                        onChange={e => setNewRoleName(e.target.value)}
                                        placeholder="Ex: Designer Sênior"
                                        className="flex-1 bg-white/50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-amber-500/50"
                                    />
                                    <button onClick={handleCreateRole} className="p-2.5 bg-amber-500 text-black rounded-xl hover:scale-105 transition-transform"><Plus className="w-5 h-5"/></button>
                                </div>
                                <div className="space-y-2">
                                    {roles.map(role => (
                                        <div key={role.id} className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-white/5 border border-slate-100 dark:border-white/5 group hover:border-amber-500/20 transition-all">
                                            <span className="text-[10px] font-black text-slate-900 dark:text-slate-300 uppercase tracking-widest">{role.nome}</span>
                                            <button onClick={() => handleDeleteRole(role.id)} className="opacity-0 group-hover:opacity-100 text-red-500 p-1.5 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5"/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: AI (INTELIGÊNCIA) */}
            {activeTab === 'ai' && (
                <div className="max-w-4xl space-y-12 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-6 p-8 glass-card border-purple-500/30 bg-purple-500/5 shadow-purple-500/5">
                        <div className="w-20 h-20 rounded-[2rem] bg-purple-500 flex items-center justify-center text-black shadow-lg">
                            <BrainCircuit className="w-10 h-10"/>
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white leading-none">DNA da Organização.</h2>
                            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-2">Configure o Shinkō Guru para agir como seu CTO/COO.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] mb-3 ml-1">Setor de Atuação</label>
                                <input 
                                    value={aiConfig.sector} 
                                    onChange={e => setAiConfig({...aiConfig, sector: e.target.value})}
                                    placeholder="Ex: SaaS de Logística, Fintech..."
                                    className="w-full glass-panel p-5 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] mb-3 ml-1">Tom de Voz da IA</label>
                                <select 
                                    value={aiConfig.tone} 
                                    onChange={e => setAiConfig({...aiConfig, tone: e.target.value})}
                                    className="w-full glass-panel p-5 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
                                >
                                    <option value="" className="bg-white dark:bg-slate-900">Selecione...</option>
                                    <option value="Técnico e Direto" className="bg-white dark:bg-slate-900">Técnico e Direto</option>
                                    <option value="Consultivo e Estratégico" className="bg-white dark:bg-slate-900">Consultivo e Estratégico</option>
                                    <option value="Criativo e Visionário" className="bg-white dark:bg-slate-900">Criativo e Visionário</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] mb-3 ml-1">Contexto Mestre (DNA)</label>
                            <textarea 
                                value={aiConfig.context}
                                onChange={e => setAiConfig({...aiConfig, context: e.target.value})}
                                placeholder="Conte para a IA sobre sua empresa, tecnologias usadas e objetivos de longo prazo..."
                                className="w-full h-[184px] glass-panel p-6 rounded-[2rem] text-sm leading-relaxed font-medium text-slate-700 dark:text-slate-300 outline-none focus:border-purple-500/50 resize-none"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button 
                            onClick={handleSaveAiConfig}
                            disabled={isSaving}
                            className="px-12 py-5 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shinko-button flex items-center gap-3 shadow-lg shadow-purple-500/20"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Zap className="w-4 h-4"/>}
                            Sincronizar Inteligência
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
