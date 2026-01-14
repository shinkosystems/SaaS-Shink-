
import React, { useState, useEffect, useRef } from 'react';
import { 
    User, Save, Camera, CreditCard, Loader2, Building2, Clock, 
    History, LogOut, ArrowRight, Zap, Users, Calendar, 
    Copy, CheckCircle2, UploadCloud, FileText, X, ShieldCheck,
    Minus, Plus, Check, Sparkles
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { uploadAvatar, fetchOrganizationMembersWithRoles, updateOrgDetails } from '../services/organizationService';
import { uploadReceiptAndNotify, calculateDynamicPrice, PRICING_MODULES } from '../services/asaasService';

const DEFAULT_AVATAR = "https://zjssfnbcboibqeoubeou.supabase.co/storage/v1/object/public/fotoperfil/fotoperfil/1.png";
const PIX_KEY = "60.428.589/0001-55";

interface Props {
  currentPlan: string;
  onRefresh: () => void;
}

export const ProfileScreen: React.FC<Props> = ({ currentPlan, onRefresh }) => {
  const [loading, setLoading] = useState(true);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR);
  const [orgData, setOrgData] = useState<any>(null);
  const [orgName, setOrgName] = useState('');
  const [orgSector, setOrgSector] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [userRole, setUserRole] = useState('');
  const [userId, setUserId] = useState('');
  
  // Calculator & Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  
  const [calcUsers, setCalcUsers] = useState(1);
  const [calcModules, setCalcModules] = useState<string[]>([]);
  const [calcCycle, setCalcCycle] = useState<'monthly' | 'yearly'>('monthly');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          setUserId(user.id);
          setEmail(user.email || '');
          const { data } = await supabase.from('users').select('*, organizacoes(*)').eq('id', user.id).single();
          if (data) {
              setName(data.nome || '');
              setAvatarUrl(data.avatar_url || DEFAULT_AVATAR);
              setUserRole(data.perfil || '');
              if (data.organizacoes) {
                  setOrgData(data.organizacoes);
                  setOrgName(data.organizacoes.nome || '');
                  setOrgSector(data.organizacoes.setor || '');
                  setCalcUsers(Number(data.organizacoes.colaboradores) || 1);
                  if (data.perfil === 'dono') {
                      const team = await fetchOrganizationMembersWithRoles(data.organizacoes.id);
                      setMembers(team);
                  }
              }
          }
      }
      setLoading(false);
  };

  const pricing = calculateDynamicPrice(calcUsers, calcModules, calcCycle);

  const toggleModule = (id: string) => {
      setCalcModules(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const handleSave = async () => {
      if (!userId) return;
      setIsUpdatingAvatar(true);
      try {
          await supabase.from('users').update({ nome: name }).eq('id', userId);
          if (userRole === 'dono' && orgData?.id) {
              await updateOrgDetails(orgData.id, { name: orgName, aiSector: orgSector });
          }
          alert("Perfil sincronizado com sucesso!");
          onRefresh();
      } catch (e: any) {
          alert("Erro ao salvar: " + e.message);
      } finally {
          setIsUpdatingAvatar(false);
      }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !userId) return;
      setIsUpdatingAvatar(true);
      try {
          const newUrl = await uploadAvatar(userId, file);
          setAvatarUrl(newUrl);
          onRefresh();
      } catch (err: any) { alert(`Erro: ${err.message}`); } 
      finally { setIsUpdatingAvatar(false); }
  };

  const handleSendReceipt = async () => {
      if (!receiptFile || !orgData) return;
      setIsUploadingReceipt(true);
      try {
          const res = await uploadReceiptAndNotify(
              userId,
              orgData.id,
              pricing.planId,
              pricing.total,
              receiptFile,
              `Assinatura: ${calcUsers} Usuários + ${calcModules.length} Módulos`,
              { users: calcUsers, modules: calcModules }
          );
          if (res.success) {
              alert("Comprovante enviado! O Root aprovará em breve.");
              setShowPayModal(false);
              setReceiptFile(null);
          } else throw new Error(res.error);
      } catch (e: any) { alert("Erro: " + e.message); } 
      finally { setIsUploadingReceipt(false); }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-amber-500"/></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24">
        
        {/* PROFILE HEADER */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-white/5 shadow-soft space-y-10">
                <div className="flex items-center gap-8">
                    <div className="relative group cursor-pointer" onClick={() => !isUpdatingAvatar && fileInputRef.current?.click()}>
                        <div className="w-28 h-28 rounded-[2rem] bg-slate-100 dark:bg-white/5 overflow-hidden ring-4 ring-slate-50 dark:ring-black flex items-center justify-center">
                            {isUpdatingAvatar ? <Loader2 className="w-8 h-8 animate-spin text-amber-500"/> : <img src={avatarUrl} className="w-full h-full object-cover"/>}
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload}/>
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{name}</h2>
                        <p className="text-slate-500 font-medium">{email}</p>
                        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-500"/> Perfil {userRole}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome de Exibição</label>
                        <input value={name} onChange={e => setName(e.target.value)} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 outline-none focus:border-amber-500/50 font-bold" />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Setor</label>
                        <input value={orgSector} onChange={e => setOrgSector(e.target.value)} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 outline-none focus:border-amber-500/50 font-bold" />
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button onClick={handleSave} className="px-10 py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">Sincronizar Dados</button>
                </div>
            </div>

            {/* SUBSCRIPTION CARD */}
            <div className="bg-slate-900 rounded-[2.5rem] p-10 border border-white/10 text-white relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div>
                    <div className="flex justify-between items-start mb-8">
                        <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20"><Zap className="w-6 h-6"/></div>
                        <span className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10">Ativo</span>
                    </div>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Status</h3>
                    <div className="text-4xl font-black tracking-tighter mb-6">{currentPlan.replace('plan_', '').toUpperCase()}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase mb-2">Limite: {orgData?.colaboradores || 1} usuários</div>
                </div>
                {userRole === 'dono' && (
                    <button onClick={() => setShowPayModal(true)} className="w-full py-4 mt-10 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-glow-white hover:scale-105 active:scale-95 transition-all">Gerenciar Assinatura</button>
                )}
            </div>
        </div>

        {/* UPGRADE MODAL - DYNAMIC CALCULATOR */}
        {showPayModal && (
            <div className="fixed inset-0 z-[3000] flex items-center justify-center p-8 md:p-12 lg:p-24 bg-black/90 backdrop-blur-2xl animate-in fade-in">
                <div className="w-full max-w-5xl bg-white dark:bg-[#0A0A0C] rounded-[3rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-ios-pop flex flex-col md:flex-row max-h-full">
                    
                    {/* Left: Configuration */}
                    <div className="flex-1 p-10 space-y-8 overflow-y-auto custom-scrollbar border-r border-slate-100 dark:border-white/5">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Upgrade Shinkō.</h2>
                            <button onClick={() => setShowPayModal(false)} className="p-2 text-slate-400 hover:text-red-500"><X className="w-6 h-6"/></button>
                        </div>

                        {/* Users Slider */}
                        <div className="space-y-4 bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Tamanho do Time</span>
                                <span className="text-2xl font-black text-amber-500">{calcUsers} usuários</span>
                            </div>
                            <input type="range" min="1" max="30" step="1" value={calcUsers} onChange={e => setCalcUsers(parseInt(e.target.value))} className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-amber-500" />
                            <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest"><span>SOLO (1)</span><span>SCALE (15+)</span></div>
                        </div>

                        {/* Modules Selection */}
                        <div className="space-y-4">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Módulos de Engenharia</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {PRICING_MODULES.map(mod => (
                                    <button 
                                        key={mod.id} 
                                        onClick={() => toggleModule(mod.id)}
                                        className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between group ${calcModules.includes(mod.id) ? 'bg-amber-500/10 border-amber-500/50 text-amber-600' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500'}`}
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-tight">{mod.label}</span>
                                        {calcModules.includes(mod.id) ? <Check className="w-4 h-4"/> : <Plus className="w-4 h-4 opacity-30 group-hover:opacity-100"/>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Cycle Switch */}
                        <div className="flex bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl border border-slate-200 dark:border-white/10">
                            <button onClick={() => setCalcCycle('monthly')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${calcCycle === 'monthly' ? 'bg-white dark:bg-white/10 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}>Mensal</button>
                            <button onClick={() => setCalcCycle('yearly')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${calcCycle === 'yearly' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500'}`}>Anual (-20%)</button>
                        </div>
                    </div>

                    {/* Right: Checkout & PIX */}
                    <div className="w-full md:w-96 bg-slate-50 dark:bg-[#08080A] p-10 flex flex-col justify-between overflow-y-auto custom-scrollbar">
                        <div className="space-y-8">
                            <div className="text-center">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Investimento Total</span>
                                <div className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter mt-2">
                                    <span className="text-sm font-bold mr-1">R$</span>{pricing.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 mt-2">por {calcCycle === 'monthly' ? 'mês' : 'ano'}</div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">Pague com PIX (CNPJ)</label>
                                <div className="p-6 bg-white dark:bg-black/40 rounded-[2rem] border border-slate-200 dark:border-white/10 flex flex-col items-center gap-4">
                                    <div className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{PIX_KEY}</div>
                                    <button 
                                        onClick={() => { navigator.clipboard.writeText(PIX_KEY); setIsCopied(true); setTimeout(()=>setIsCopied(false), 2000); }}
                                        className={`w-full py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${isCopied ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300'}`}
                                    >
                                        {isCopied ? <CheckCircle2 className="w-4 h-4"/> : <Copy className="w-4 h-4"/>}
                                        {isCopied ? 'Copiado!' : 'Copiar CNPJ'}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">Subir Comprovante</label>
                                {!receiptFile ? (
                                    <div onClick={() => receiptInputRef.current?.click()} className="py-8 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:border-amber-500 transition-all">
                                        <UploadCloud className="w-8 h-8 text-slate-400 mb-2"/>
                                        <span className="text-[8px] font-black text-slate-500 uppercase">Anexar Arquivo</span>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
                                        <FileText className="w-4 h-4 text-emerald-500"/>
                                        <span className="text-[9px] font-bold text-emerald-600 truncate max-w-[150px]">{receiptFile.name}</span>
                                        <button onClick={() => setReceiptFile(null)}><X className="w-4 h-4 text-red-500"/></button>
                                    </div>
                                )}
                                <input type="file" ref={receiptInputRef} hidden accept="image/*,application/pdf" onChange={e => e.target.files?.[0] && setReceiptFile(e.target.files[0])} />
                            </div>
                        </div>

                        <button 
                            onClick={handleSendReceipt}
                            disabled={!receiptFile || isUploadingReceipt}
                            className="w-full py-5 mt-10 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[1.8rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-3 disabled:opacity-30"
                        >
                            {isUploadingReceipt ? <Loader2 className="w-5 h-5 animate-spin"/> : <Zap className="w-5 h-5"/>}
                            Solicitar Upgrade
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
