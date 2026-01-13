import React, { useState, useRef, useEffect } from 'react';
import { 
    Settings, Sun, Moon, Palette, Building2, UploadCloud, Save, Monitor, Users, 
    Briefcase, Plus, Trash2, Check, User, BrainCircuit, Sparkles, BookOpen, 
    Fingerprint, Loader2, AlertTriangle, Lock, Copy, CheckCircle, LayoutGrid, 
    DollarSign, Code2, BarChart3, Calendar, TrendingUp, ShieldCheck, ShoppingCart, 
    Receipt, X, Image as ImageIcon, FileText, ArrowRight, ChevronRight,
    UserPlus, Mail, Shield, Zap, Rocket, Building, MonitorSmartphone, Activity,
    Gem, CheckCircle2, Clock, Crown, CreditCard, Copy as CopyIcon, CheckCircle2 as CheckCircleIcon,
    Barcode, ExternalLink, ArrowLeft, Download, Info, MapPin
} from 'lucide-react';
import { fetchRoles, createRole, deleteRole, fetchOrganizationMembersWithRoles, updateUserRole, updateOrgModules, createOrganization, SYSTEM_MODULES_DEF, updateOrgDetails } from '../services/organizationService';
import { fetchSubscriptionPlans, createAsaasPayment, uploadReceiptAndNotify, AsaasPaymentResponse } from '../services/asaasService';
import { ElasticSwitch } from './ElasticSwitch';
import { supabase } from '../services/supabaseClient';
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
  initialTab?: 'general' | 'modules' | 'team' | 'ai' | 'plans';
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
    theme, onToggleTheme, onlineUsers, userOrgId, orgDetails, onUpdateOrgDetails, setView, userRole, userData, currentPlan, activeModules, onRefreshModules, initialTab = 'general'
}) => {
  const isOwner = userRole === 'dono';
  const [activeTab, setActiveTab] = useState<'general' | 'modules' | 'team' | 'ai' | 'plans'>(initialTab);
  const [roles, setRoles] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  
  // Checkout State
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentData, setPaymentData] = useState<AsaasPaymentResponse | null>(null);
  const [isGeneratingPayment, setIsGeneratingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'BOLETO' | 'CREDIT_CARD' | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Estados Unificados (Faturamento + IA)
  const [billingConfig, setBillingConfig] = useState({
      nome: orgDetails?.name || '',
      cpf_cnpj: orgDetails?.cpf_cnpj || '',
      cep: orgDetails?.cep || '',
      endereco_numero: orgDetails?.endereco_numero || ''
  });

  const [aiConfig, setAiConfig] = useState({
      sector: orgDetails?.aiSector || '',
      tone: orgDetails?.aiTone || '',
      dna: orgDetails?.aiContext || ''
  });

  useEffect(() => { if (userOrgId) loadTeamData(); }, [userOrgId]);
  useEffect(() => { if (activeTab === 'plans' && isOwner) loadPlans(); }, [activeTab, isOwner]);

  const loadTeamData = async () => {
    if (!userOrgId) return;
    const [r, m] = await Promise.all([fetchRoles(userOrgId), fetchOrganizationMembersWithRoles(userOrgId)]);
    setRoles(r); setMembers(m);
  };

  const loadPlans = async () => {
      setIsLoadingPlans(true);
      const data = await fetchSubscriptionPlans();
      setPlans(data);
      setIsLoadingPlans(false);
  };

  const handleSelectPlan = (plan: SubscriptionPlan) => {
      setSelectedPlan(plan);
      setPaymentMethod(null);
      setPaymentData(null);
  };

  const handleExecutePayment = async (method: 'PIX' | 'BOLETO' | 'CREDIT_CARD') => {
      if (!selectedPlan) return;
      setPaymentMethod(method);
      setIsGeneratingPayment(true);
      try {
          const res = await createAsaasPayment(userData.id, method, selectedPlan.price, `Assinatura Shinkō OS: ${selectedPlan.name}`);
          if (res) {
              setPaymentData(res);
              if (method === 'CREDIT_CARD' && res.invoiceUrl) window.open(res.invoiceUrl, '_blank');
          } else alert("Erro de conexão com o Gateway.");
      } catch (e) { alert("Erro ao processar faturamento."); } 
      finally { setIsGeneratingPayment(false); }
  };

  const handleSendReceipt = async () => {
      if (!receiptFile || !userOrgId || !selectedPlan) return;
      setIsUploadingReceipt(true);
      try {
          const res = await uploadReceiptAndNotify(userData.id, userOrgId, selectedPlan.dbId || 0, selectedPlan.price, receiptFile, `Pagamento Confirmado: ${selectedPlan.name}`, { users: selectedPlan.colabtotal, modules: activeModules });
          if (res.success) {
              alert("Comprovante enviado!");
              setSelectedPlan(null); setPaymentData(null); setReceiptFile(null);
          } else throw new Error(res.error);
      } catch (e: any) { alert("Falha: " + e.message); } 
      finally { setIsUploadingReceipt(false); }
  };

  const handleSaveGeneral = async () => {
      if (!userOrgId) return;
      setIsSaving(true);
      await updateOrgDetails(userOrgId, { 
          nome: billingConfig.nome, 
          cpf_cnpj: billingConfig.cpf_cnpj.replace(/\D/g, ''), 
          cep: billingConfig.cep.replace(/\D/g, ''), 
          endereco_numero: billingConfig.endereco_numero 
      });
      onUpdateOrgDetails({}); // Refresh App context
      setIsSaving(false);
      alert("Configurações Gerais Salvas!");
  };

  const handleSaveAi = async () => {
      if (!userOrgId) return;
      setIsSaving(true);
      await updateOrgDetails(userOrgId, { aiSector: aiConfig.sector, aiTone: aiConfig.tone, aiContext: aiConfig.dna });
      setIsSaving(false);
      alert("DNA Industrial atualizado!");
  };

  const handleCreateRole = async () => {
      if (!newRoleName.trim() || !userOrgId) return;
      await createRole(newRoleName, userOrgId);
      setNewRoleName(''); loadTeamData();
  };

  const tabs = [
      { id: 'general', label: 'GERAL' },
      { id: 'modules', label: 'MARKETPLACE' },
      ...(isOwner ? [{ id: 'plans', label: 'PLANOS' }] : []),
      { id: 'team', label: 'TIME' },
      { id: 'ai', label: 'INTELIGÊNCIA' }
  ];

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-700 max-w-7xl mx-auto p-4 md:p-8 space-y-12">
        <div className="space-y-3 pt-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-full text-[10px] font-black text-orange-600 uppercase tracking-widest">
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
                    <div className="space-y-2">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Perfil & Faturamento</h3>
                        <p className="text-slate-500 text-sm font-medium">Configure a identidade e dados para emissão de faturas.</p>
                    </div>
                    <div className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[3rem] p-10 space-y-8">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razão Social</label>
                                <input value={billingConfig.nome} onChange={e => setBillingConfig({...billingConfig, nome: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 p-5 rounded-2xl text-sm font-black outline-none focus:border-orange-500 transition-all dark:text-white" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest ml-1">CPF ou CNPJ</label>
                                <input value={billingConfig.cpf_cnpj} onChange={e => setBillingConfig({...billingConfig, cpf_cnpj: e.target.value})} placeholder="Obrigatório para Asaas" className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 p-5 rounded-2xl text-sm font-black outline-none focus:border-orange-500 transition-all dark:text-white" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CEP</label>
                                <input value={billingConfig.cep} onChange={e => setBillingConfig({...billingConfig, cep: e.target.value})} placeholder="00000-000" className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 p-5 rounded-2xl text-sm font-black outline-none focus:border-orange-500 transition-all dark:text-white" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número</label>
                                <input value={billingConfig.endereco_numero} onChange={e => setBillingConfig({...billingConfig, endereco_numero: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 p-5 rounded-2xl text-sm font-black outline-none focus:border-orange-500 transition-all dark:text-white" />
                            </div>
                        </div>
                        <button onClick={handleSaveGeneral} disabled={isSaving} className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[1.8rem] font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>} SALVAR ALTERAÇÕES
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'plans' && isOwner && (
                <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div className="space-y-2">
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Gestão de Escala</h3>
                            <p className="text-slate-500 text-sm font-medium">Controle sua assinatura e capacidade operacional.</p>
                        </div>
                    </div>
                    {(!billingConfig.cpf_cnpj || !billingConfig.cep) && (
                        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-[2rem] flex items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <AlertTriangle className="w-6 h-6 text-red-500"/>
                                <p className="text-xs font-black text-red-500 uppercase">Configure CPF/CNPJ e CEP na aba GERAL para habilitar pagamentos.</p>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {plans.map(plan => (
                            <div key={plan.id} className={`glass-card p-8 rounded-[3rem] flex flex-col justify-between min-h-[550px] relative transition-all group border-2 ${plan.recommended ? 'border-orange-500 bg-orange-500/[0.03]' : 'border-slate-100 dark:border-white/5 bg-white'}`}>
                                <div>
                                    <h4 className="text-3xl font-black text-slate-900 dark:text-white mb-4">{plan.name}</h4>
                                    <div className="flex items-baseline gap-1 mb-8">
                                        <span className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter">R$ {plan.price}</span>
                                    </div>
                                    <div className="space-y-3 mb-10">
                                        {plan.features.map((f, i) => ( <div key={i} className="flex items-center gap-2 text-xs font-bold text-slate-500"><CheckCircle2 className="w-4 h-4 text-orange-500"/>{f}</div> ))}
                                    </div>
                                </div>
                                <button disabled={currentPlan === plan.id || (!billingConfig.cpf_cnpj || !billingConfig.cep)} onClick={() => handleSelectPlan(plan)} className="w-full py-5 rounded-[1.8rem] font-black text-[11px] uppercase tracking-widest bg-orange-500 text-white disabled:opacity-30">
                                    {currentPlan === plan.id ? 'Plano Ativo' : 'Contratar Agora'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Checkout Modal Integrado */}
            {selectedPlan && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl animate-in fade-in">
                    <div className="w-full max-w-4xl bg-[#0A0A0C] rounded-[3rem] border border-white/10 flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
                        <div className="flex-1 p-10 space-y-8 overflow-y-auto border-r border-white/5">
                            <div className="flex justify-between items-center">
                                <h2 className="text-3xl font-black text-white">Assinar <span className="text-orange-500">{selectedPlan.name}</span></h2>
                                <button onClick={() => setSelectedPlan(null)} className="text-slate-500 hover:text-red-500"><X className="w-7 h-7"/></button>
                            </div>
                            {!paymentMethod ? (
                                <div className="grid grid-cols-1 gap-4">
                                    <button onClick={() => handleExecutePayment('PIX')} className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-between group">
                                        <div className="flex items-center gap-4"><Zap className="w-6 h-6 text-orange-500"/><span className="text-white font-black uppercase">PIX Instantâneo</span></div>
                                        <ChevronRight className="text-slate-700"/>
                                    </button>
                                    <button onClick={() => handleExecutePayment('CREDIT_CARD')} className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-between group">
                                        <div className="flex items-center gap-4"><CreditCard className="w-6 h-6 text-blue-500"/><span className="text-white font-black uppercase">Cartão de Crédito</span></div>
                                        <ChevronRight className="text-slate-700"/>
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {isGeneratingPayment ? <div className="py-10 flex flex-col items-center"><Loader2 className="animate-spin text-orange-500 w-10 h-10"/></div> : paymentData && (
                                        <div className="space-y-6">
                                            {paymentMethod === 'PIX' && (
                                                <div className="p-8 bg-white rounded-[2rem] flex flex-col items-center gap-4">
                                                    <img src={paymentData.qrCode?.startsWith('data') ? paymentData.qrCode : `data:image/png;base64,${paymentData.qrCode}`} className="w-48 h-48" />
                                                    <button onClick={() => { navigator.clipboard.writeText(paymentData.copyPaste || ''); setIsCopied(true); setTimeout(()=>setIsCopied(false), 2000); }} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase">{isCopied ? 'Copiado!' : 'Copiar Código'}</button>
                                                </div>
                                            )}
                                            <div className="space-y-4">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Passo Final: Subir Comprovante</p>
                                                {!receiptFile ? (
                                                    <div onClick={() => document.getElementById('receipt-upload')?.click()} className="py-10 border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center cursor-pointer"><ImageIcon className="text-slate-700 mb-2"/><span className="text-[9px] font-black text-slate-600 uppercase">Anexar Documento</span></div>
                                                ) : (
                                                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between"><div className="flex items-center gap-2"><FileText className="text-emerald-500"/><span className="text-white text-xs font-bold truncate max-w-[150px]">{receiptFile.name}</span></div><button onClick={() => setReceiptFile(null)}><X className="text-red-500"/></button></div>
                                                )}
                                                <input id="receipt-upload" type="file" hidden onChange={e => e.target.files?.[0] && setReceiptFile(e.target.files[0])} />
                                                <button onClick={handleSendReceipt} disabled={!receiptFile || isUploadingReceipt} className="w-full py-5 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl disabled:opacity-20">{isUploadingReceipt ? <Loader2 className="animate-spin mx-auto"/> : 'Sincronizar Assinatura'}</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="w-full md:w-[320px] bg-white/[0.02] p-10 flex flex-col justify-between border-l border-white/5">
                            <div className="text-center">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Investimento</span>
                                <div className="text-5xl font-black text-white mt-2">R$ {selectedPlan.price}</div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-emerald-500/5 rounded-2xl"><ShieldCheck className="text-emerald-500 w-5 h-5"/><p className="text-[8px] text-slate-500">Dados protegidos via Asaas Gateway.</p></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Abas Team, AI e Modules mantidas integralmente */}
            {activeTab === 'team' && (
                <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Gestão de Acesso</h3>
                            <div className="space-y-3">
                                {members.map(m => (
                                    <div key={m.id} className="p-6 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-3xl flex items-center justify-between">
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center font-black text-xs text-slate-500">
                                                {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover rounded-2xl" /> : m.nome.charAt(0)}
                                            </div>
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
                                    <input value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="Novo Cargo..." className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl p-3 text-xs font-bold outline-none dark:text-white" />
                                    <button onClick={handleCreateRole} className="p-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl"><Plus className="w-4 h-4"/></button>
                                </div>
                                <div className="space-y-2">
                                    {roles.map(r => (
                                        <div key={r.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-50 dark:border-white/5 text-[10px] font-black uppercase text-slate-500">
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
                    </div>
                    <div className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[3rem] p-10 space-y-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Setor</label>
                            <input value={aiConfig.sector} onChange={e => setAiConfig({...aiConfig, sector: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 p-5 rounded-2xl text-base font-black outline-none focus:border-orange-500 dark:text-white" placeholder="Ex: Software" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Contexto Mestre</label>
                            <textarea value={aiConfig.dna} onChange={e => setAiConfig({...aiConfig, dna: e.target.value})} className="w-full h-48 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 p-5 rounded-2xl outline-none resize-none dark:text-white" placeholder="Explique seu diferencial..." />
                        </div>
                        <button onClick={handleSaveAi} disabled={isSaving} className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[1.8rem] font-black uppercase tracking-widest shadow-xl">
                            {isSaving ? <Loader2 className="animate-spin mx-auto"/> : 'SINCRONIZAR DNA'}
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'modules' && (
                <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[2.5rem] overflow-hidden">
                        <div className="divide-y divide-slate-50 dark:divide-white/5">
                            {AVAILABLE_MODULES.map(mod => {
                                const isOwned = activeModules.includes(mod.id);
                                return (
                                    <div key={mod.id} className="p-8 flex items-center justify-between hover:bg-slate-50/50 transition-all group">
                                        <div className="flex items-center gap-6">
                                            <div className={`p-4 rounded-2xl ${mod.bg} ${mod.color}`}><mod.icon className="w-6 h-6"/></div>
                                            <div><h4 className="text-base font-black text-slate-900 dark:text-white">{mod.label}</h4><p className="text-[11px] text-slate-500 font-medium">{mod.desc}</p></div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[9px] font-black uppercase ${isOwned ? 'text-orange-500' : 'text-slate-400'}`}>{isOwned ? 'ATIVO' : 'OFF'}</span>
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

export default SettingsScreen;