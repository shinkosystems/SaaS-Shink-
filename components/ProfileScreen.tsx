
import React, { useState, useEffect, useRef } from 'react';
import { 
    User, Save, Camera, CreditCard, Loader2, Building2, Clock, 
    History, LogOut, ArrowRight, Zap, Users, Calendar, 
    Copy, CheckCircle2, UploadCloud, FileText, X, ShieldCheck,
    Briefcase, Globe
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { uploadAvatar, fetchOrganizationDetails, fetchOrganizationMembersWithRoles, updateOrgDetails } from '../services/organizationService';
import { uploadReceiptAndNotify, fetchSubscriptionPlans } from '../services/asaasService';

const DEFAULT_AVATAR = "https://zjssfnbcboibqeoubeou.supabase.co/storage/v1/object/public/fotoperfil/fotoperfil/1.png";
// Chave PIX CNPJ atualizada
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
  
  // Payment Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

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
                  if (data.perfil === 'dono') {
                      const team = await fetchOrganizationMembersWithRoles(data.organizacoes.id);
                      setMembers(team);
                  }
              }
          }
      }
      setLoading(false);
  };

  const handleSave = async () => {
      if (!userId) return;
      setIsUpdatingAvatar(true);
      try {
          await supabase.from('users').update({ nome: name }).eq('id', userId);
          if (userRole === 'dono' && orgData?.id) {
              await updateOrgDetails(orgData.id, {
                  name: orgName,
                  aiSector: orgSector
              });
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
      } catch (err: any) {
          alert(`Erro no upload: ${err.message}`);
      } finally {
          setIsUpdatingAvatar(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleCopyPix = () => {
      navigator.clipboard.writeText(PIX_KEY);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSendReceipt = async () => {
      if (!receiptFile || !orgData) return;
      setIsUploadingReceipt(true);
      try {
          const res = await uploadReceiptAndNotify(
              userId,
              orgData.id,
              orgData.plano || '4',
              0, 
              receiptFile,
              `Renovação de Assinatura - ${orgData.nome}`
          );
          if (res.success) {
              alert("Comprovante enviado! O Super Admin validará o acesso em breve.");
              setShowPayModal(false);
              setReceiptFile(null);
          } else throw new Error(res.error);
      } catch (e: any) {
          alert("Erro ao enviar: " + e.message);
      } finally {
          setIsUploadingReceipt(false);
      }
  };

  const formatPlanName = (planKey: string) => {
      return planKey.replace('plan_', '').toUpperCase();
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-amber-500"/></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24">
        
        {/* TOP SECTION: PROFILE & PLAN SNAPSHOT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-white/5 shadow-soft space-y-10">
                <div className="flex items-center gap-8">
                    <div className="relative group cursor-pointer" onClick={() => !isUpdatingAvatar && fileInputRef.current?.click()}>
                        <div className="w-28 h-28 rounded-[2rem] bg-slate-100 dark:bg-white/5 overflow-hidden ring-4 ring-slate-50 dark:ring-black flex items-center justify-center shadow-inner">
                            {isUpdatingAvatar ? <Loader2 className="w-8 h-8 animate-spin text-amber-500"/> : <img src={avatarUrl} className="w-full h-full object-cover"/>}
                        </div>
                        {!isUpdatingAvatar && (
                            <div className="absolute inset-0 bg-black/40 rounded-[2rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-8 h-8 text-white"/>
                            </div>
                        )}
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

                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome de Exibição</label>
                            <input value={name} onChange={e => setName(e.target.value)} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 outline-none focus:border-amber-500/50 transition-all font-bold text-slate-900 dark:text-white shadow-inner" />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail (Leitura)</label>
                            <input value={email} disabled className="w-full p-4 rounded-2xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 outline-none font-bold text-slate-400 shadow-inner" />
                        </div>
                    </div>

                    {userRole === 'dono' && (
                        <div className="pt-6 border-t border-slate-100 dark:border-white/5 space-y-6">
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-amber-500"/> Dados da Organização
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Empresa</label>
                                    <input value={orgName} onChange={e => setOrgName(e.target.value)} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 outline-none focus:border-amber-500/50 transition-all font-bold text-slate-900 dark:text-white shadow-inner" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nicho de Atuação</label>
                                    <select value={orgSector} onChange={e => setOrgSector(e.target.value)} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 outline-none focus:border-amber-500/50 transition-all font-bold text-slate-900 dark:text-white shadow-inner cursor-pointer">
                                        <option value="SaaS / Software">SaaS / Software</option>
                                        <option value="Arquitetura & Design">Arquitetura & Design</option>
                                        <option value="Marketing & Growth">Marketing & Growth</option>
                                        <option value="Consultoria">Consultoria</option>
                                        <option value="E-commerce">E-commerce</option>
                                        <option value="Outros">Outros</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button 
                            onClick={handleSave} 
                            disabled={isUpdatingAvatar}
                            className="px-10 py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                            {isUpdatingAvatar ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                            Sincronizar Tudo
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] p-10 border border-white/10 text-white relative overflow-hidden flex flex-col justify-between h-full">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div>
                    <div className="flex justify-between items-start mb-8">
                        <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <Zap className="w-6 h-6"/>
                        </div>
                        <span className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10">Ativo</span>
                    </div>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Plano Atual</h3>
                    <div className="text-4xl font-black tracking-tighter mb-6">{formatPlanName(currentPlan)}</div>
                    {userRole === 'dono' && orgData?.vencimento && (
                        <div className="space-y-1">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Vencimento</div>
                            <div className="text-lg font-bold flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-amber-500"/>
                                {new Date(orgData.vencimento).toLocaleDateString('pt-BR')}
                            </div>
                        </div>
                    )}
                </div>
                {userRole === 'dono' && (
                    <button 
                        onClick={() => setShowPayModal(true)}
                        className="w-full py-4 mt-10 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-glow-white hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <CreditCard className="w-4 h-4"/> Renovar Agora
                    </button>
                )}
            </div>
        </div>

        {userRole === 'dono' && (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-white/5 shadow-soft space-y-8 animate-in slide-in-from-bottom-4 duration-700">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                            <Users className="w-6 h-6"/>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Time da Organização.</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Gerencie os usuários vinculados à sua conta</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-black text-slate-900 dark:text-white">{members.length} / {orgData?.colaboradores || 1}</div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Licenças em Uso</div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {members.map(member => (
                        <div key={member.id} className="p-5 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/20 flex items-center justify-between group hover:border-amber-500/30 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center font-black text-xs">
                                    {member.avatar_url ? <img src={member.avatar_url} className="w-full h-full object-cover"/> : member.nome.charAt(0)}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{member.nome}</div>
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{member.roleName}</div>
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded-[6px] text-[8px] font-black uppercase tracking-widest ${member.perfil === 'dono' ? 'bg-amber-500/10 text-amber-600' : 'bg-white dark:bg-white/5 text-slate-500 border border-slate-200 dark:border-white/10'}`}>
                                {member.perfil}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* PAYMENT MODAL - REFINED BREATHING ROOM */}
        {showPayModal && (
            <div className="fixed inset-0 z-[3000] flex items-center justify-center p-8 md:p-12 lg:p-24 bg-black/90 backdrop-blur-2xl animate-in fade-in">
                <div className="w-full max-w-md bg-white dark:bg-[#0A0A0C] rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)] border border-slate-200 dark:border-white/10 overflow-hidden animate-ios-pop flex flex-col max-h-full">
                    
                    <div className="p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-start shrink-0">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Renovação Manual.</h3>
                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1">SISTEMA DE FATURAMENTO PIX</p>
                        </div>
                        <button onClick={() => setShowPayModal(false)} className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-400 transition-colors"><X className="w-6 h-6"/></button>
                    </div>

                    <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pagamento via PIX (CNPJ)</label>
                            <div className="p-8 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-[2.5rem] space-y-6 flex flex-col items-center">
                                <div className="w-full py-10 px-6 bg-white dark:bg-slate-900 rounded-[2rem] border-4 border-amber-500/10 shadow-inner flex flex-col items-center justify-center text-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">CHAVE PIX</span>
                                    <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight break-all selection:bg-amber-500/30">
                                        {PIX_KEY}
                                    </div>
                                    <div className="mt-6 px-4 py-1.5 bg-amber-500/10 text-amber-600 rounded-full text-[8px] font-black uppercase tracking-widest border border-amber-500/20">
                                        Instituição: Itaú Unibanco
                                    </div>
                                </div>
                                <button 
                                    onClick={handleCopyPix}
                                    className={`w-full py-4 rounded-2xl border flex items-center justify-center gap-3 transition-all font-black text-xs uppercase tracking-widest ${isCopied ? 'bg-emerald-500 border-emerald-400 text-white shadow-glow-emerald scale-[0.98]' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white shadow-soft hover:border-amber-500/50'}`}
                                >
                                    {isCopied ? <CheckCircle2 className="w-4 h-4"/> : <Copy className="w-4 h-4"/>}
                                    {isCopied ? 'Copiado!' : 'Copiar Chave CNPJ'}
                                </button>
                                <p className="text-[9px] text-slate-400 font-bold uppercase text-center tracking-widest opacity-60">Favorecido: Shinkō OS Saas Solutions</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Comprovante de Pagamento</label>
                            {!receiptFile ? (
                                <div 
                                    onClick={() => receiptInputRef.current?.click()}
                                    className="w-full py-10 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:border-amber-500/50 hover:bg-amber-500/5 transition-all group"
                                >
                                    <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-amber-500 mb-2 transition-colors" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Anexar Arquivo</span>
                                </div>
                            ) : (
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between animate-in zoom-in-95 duration-300">
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-5 h-5 text-emerald-500"/>
                                        <span className="text-xs font-bold text-emerald-600 truncate max-w-[200px]">{receiptFile.name}</span>
                                    </div>
                                    <button onClick={() => setReceiptFile(null)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><X className="w-4 h-4"/></button>
                                </div>
                            )}
                            <input type="file" ref={receiptInputRef} hidden accept="image/*,application/pdf" onChange={e => e.target.files?.[0] && setReceiptFile(e.target.files[0])} />
                        </div>
                    </div>

                    <div className="p-8 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 shrink-0">
                        <button 
                            onClick={handleSendReceipt}
                            disabled={!receiptFile || isUploadingReceipt}
                            className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[1.8rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:hover:scale-100"
                        >
                            {isUploadingReceipt ? <Loader2 className="w-5 h-5 animate-spin"/> : <Zap className="w-5 h-5"/>}
                            Solicitar Liberação
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
