
import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Phone, Building2, MapPin, Save, Camera, Shield, CreditCard, Bell, Globe, Loader2, UploadCloud, Sparkles, Check, X, Copy, ExternalLink, FileText, History, ArrowUpRight, ArrowDownRight, Zap, Lock, Calendar, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { fetchSubscriptionPlans, getPaymentHistory, calculateSubscriptionStatus, getUserSubscriptions, uploadReceiptAndNotify } from '../services/asaasService';
import { AsaasPayment, SubscriptionPlan, AsaasSubscription } from '../types';

const DEFAULT_AVATAR = "https://zjssfnbcboibqeoubeou.supabase.co/storage/v1/object/public/fotoperfil/fotoperfil/1.png";
const PIX_KEY = "60.428.589/0001-55"; // CNPJ

interface Props {
  currentPlan: string;
  onRefresh: () => void;
}

export const ProfileScreen: React.FC<Props> = ({ currentPlan, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'personal' | 'workspace'>('personal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [userId, setUserId] = useState<string>('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR);
  const [role, setRole] = useState('Usuário');

  // Finance State
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [payments, setPayments] = useState<AsaasPayment[]>([]);
  const [subscriptions, setSubscriptions] = useState<AsaasSubscription[]>([]);
  
  // Manual PIX Flow State
  const [showPixModal, setShowPixModal] = useState(false);
  const [selectedPlanForPix, setSelectedPlanForPix] = useState<SubscriptionPlan | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [pixKeyCopied, setPixKeyCopied] = useState(false);

  // Subscription Info
  const [subscriptionInfo, setSubscriptionInfo] = useState<{daysRemaining: number, expireDate: Date, shouldWarn: boolean} | null>(null);
  
  const activeSub = subscriptions.find(sub => sub.status === 'ACTIVE');

  // Fetch User Data on Mount
  useEffect(() => {
    const pendingMessage = sessionStorage.getItem('shinko_subscription_pending');
    if (pendingMessage) {
        alert(pendingMessage);
        sessionStorage.removeItem('shinko_subscription_pending');
        onRefresh();
    }
      
    const loadUserData = async () => {
      setLoading(true);
      try {
        // 1. Load Plans
        const plans = await fetchSubscriptionPlans();
        setAvailablePlans(plans);

        // 2. Load User
        const { data } = await supabase.auth.getUser();
        const user = data?.user;

        if (user) {
          setUserId(user.id);
          setEmail(user.email || '');

          const meta = (user.user_metadata as any) || {};
          if (meta.avatar_url) setAvatarUrl(meta.avatar_url);

          const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

          if (!profileError && userProfile) {
            setName(userProfile.nome || meta.full_name || 'Usuário ShinkŌS');
            setPhone(userProfile.telefone || '');
            setRole(userProfile.perfil || 'Colaborador');
            if (userProfile.localizacao) setLocation(userProfile.localizacao as string);
            else if (meta.location) setLocation(meta.location);
          } else {
             setName(meta.full_name || 'Usuário ShinkŌS');
             if (meta.location) setLocation(meta.location);
          }

          // 3. Load Finances & Subscriptions
          const [history, userSubs] = await Promise.all([
              getPaymentHistory(user.id),
              getUserSubscriptions(user.id)
          ]);

          setPayments(history || []);
          setSubscriptions(userSubs || []);

          // 4. Determine Subscription Validity
          const activeSub = (userSubs || []).find((s: AsaasSubscription) => s.status === 'ACTIVE');
          if (activeSub) {
             const nextDue = new Date(activeSub.nextDueDate);
             const today = new Date();
             const diffTime = nextDue.getTime() - today.getTime();
             const days = Math.ceil(diffTime / (1000 * 3600 * 24));

             setSubscriptionInfo({
                 daysRemaining: days,
                 expireDate: nextDue,
                 shouldWarn: days <= 5 && days > 0
             });
          } else if ((history || []).length > 0) {
              const lastPaid = history.find((p: AsaasPayment) => p.status === 'RECEIVED' || p.status === 'CONFIRMED');
              if (lastPaid) {
                  const subStatus = calculateSubscriptionStatus(lastPaid.dateCreated);
                  if (subStatus.isValid) {
                      setSubscriptionInfo({
                          daysRemaining: subStatus.daysRemaining,
                          expireDate: subStatus.expireDate,
                          shouldWarn: subStatus.shouldWarn
                      });
                  }
              }
          }
        }
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [onRefresh]);

  const handleSaveProfile = async () => {
    if (!userId) return;
    setSaving(true);

    try {
      const { error: dbError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email: email,
          nome: name,
          telefone: phone,
          localizacao: location 
        });

      if (dbError) throw dbError;

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: name,
          location: location,
          avatar_url: avatarUrl
        }
      });

      if (authError) throw authError;

      alert('Perfil atualizado com sucesso!');
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      alert('Erro ao atualizar perfil: ' + (error?.message || error));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `fotoperfil/${userId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('fotoperfil')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('fotoperfil')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);

      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

    } catch (error: any) {
      console.error("Erro no upload:", error);
      alert("Erro ao enviar foto: " + (error?.message || error));
    } finally {
      setUploading(false);
    }
  };
  
  const handlePlanSelection = (plan: SubscriptionPlan) => {
      if (plan.price === 0) return;
      if (plan.id === currentPlan && subscriptionInfo?.daysRemaining && subscriptionInfo.daysRemaining > 5) return;
      
      setSelectedPlanForPix(plan);
      setReceiptFile(null);
      setShowPixModal(true);
  };

  const handleReceiptSubmit = async () => {
    if (!receiptFile || !selectedPlanForPix || !userId) {
        alert("Por favor, anexe o comprovante de pagamento.");
        return;
    }
    setIsUploadingReceipt(true);
    try {
        const result = await uploadReceiptAndNotify(userId, selectedPlanForPix.id, selectedPlanForPix.price, receiptFile);
        if (result.success) {
            setShowPixModal(false);
            alert("Comprovante enviado com sucesso! Sua assinatura será ativada em até 24h úteis.");
            onRefresh();
        } else {
            throw new Error(result.error || 'Erro desconhecido');
        }
    } catch (err: any) {
        alert(`Erro ao enviar comprovante: ${err.message}`);
    } finally {
        setIsUploadingReceipt(false);
    }
  };
  
  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text).then(() => {
          setPixKeyCopied(true);
          setTimeout(() => setPixKeyCopied(false), 2000);
      });
  };


  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-shinko-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-300 overflow-y-auto pb-10 custom-scrollbar">

      {/* Header / Cover */}
      <div className="h-52 bg-gradient-to-r from-slate-800 to-slate-900 relative rounded-t-2xl shrink-0 z-10">
        <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] rounded-t-2xl overflow-hidden"></div>
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white/90 dark:from-[#1E1E1E]/90 to-transparent rounded-t-2xl"></div>

        <div className="absolute -bottom-20 left-1/2 md:left-10 -translate-x-1/2 md:translate-x-0 flex flex-col md:flex-row items-center md:items-end gap-6 z-20 w-auto">
          <div className="relative group shrink-0">
            {/* Foto Aumentada */}
            <div className="w-40 h-40 rounded-full p-1.5 bg-white dark:bg-[#1E1E1E] shadow-2xl relative overflow-hidden ring-4 ring-white/5 dark:ring-white/5">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-shinko-primary to-shinko-secondary flex items-center justify-center text-5xl font-bold text-white">
                    {name.charAt(0) || 'U'}
                  </div>
                )}
            </div>

            {/* Camera Button */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-30"
            >
                {uploading ? <Loader2 className="w-8 h-8 text-white animate-spin"/> : <Camera className="w-8 h-8 text-white" />}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleAvatarUpload}
            />
          </div>

          <div className="mb-0 md:mb-2 text-center md:text-left pb-2 pt-2 md:pt-0">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white shadow-white dark:shadow-black drop-shadow-md">{name || 'Usuário ShinkŌS'}</h1>
            <p className="text-slate-500 dark:text-slate-300 text-base flex items-center justify-center md:justify-start gap-1 capitalize mt-1 font-medium">
                <Shield className="w-4 h-4 text-shinko-primary" /> {role}
            </p>
          </div>
        </div>
      </div>

      {/* Content Body */}
      <div className="flex-1 flex flex-col md:flex-row mt-24 md:mt-28 px-4 md:px-6 pb-6 gap-8 z-0">

         {/* Sidebar Tabs */}
         <div className="w-full md:w-64 shrink-0 space-y-2">
             <button 
                onClick={() => setActiveTab('personal')}
                className={`w-full h-12 flex items-center gap-3 px-4 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'personal' 
                    ? 'bg-shinko-primary/10 text-shinko-primary border border-shinko-primary/20' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
             >
                <User className="w-5 h-5" /> Dados Pessoais
             </button>
             <button 
                onClick={() => setActiveTab('workspace')}
                className={`w-full h-12 flex items-center gap-3 px-4 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'workspace' 
                    ? 'bg-shinko-primary/10 text-shinko-primary border border-shinko-primary/20' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
             >
                <Building2 className="w-5 h-5" /> Workspace & Cobrança
             </button>
         </div>

         {/* Form Area */}
         <div className="flex-1 glass-panel rounded-2xl border border-slate-200/50 dark:border-white/10 p-8 shadow-sm relative overflow-hidden">

            {activeTab === 'personal' && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Informações do Perfil</h2>
                        <p className="text-sm text-slate-500">Atualize seus dados de identificação e contato.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Nome Completo</label>
                            <div className="relative">
                                <User className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
                                <input 
                                  type="text" 
                                  value={name}
                                  onChange={e => setName(e.target.value)}
                                  className="w-full h-12 glass-input rounded-lg pl-10 pr-4 text-base text-slate-900 dark:text-white focus:ring-2 focus:ring-shinko-primary/50 focus:border-shinko-primary outline-none transition-all" 
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Email Corporativo</label>
                            <div className="relative">
                                <Mail className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
                                <input 
                                  type="email" 
                                  value={email}
                                  disabled
                                  className="w-full h-12 glass-input bg-slate-100 dark:bg-white/5 rounded-lg pl-10 pr-4 text-base text-slate-500 cursor-not-allowed" 
                                />
                            </div>
                        </div>

        
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Telefone / Whatsapp</label>
                            <div className="relative">
                                <Phone className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
                                <input 
                                  type="text" 
                                  value={phone}
                                  onChange={e => setPhone(e.target.value)}
                                  className="w-full h-12 glass-input rounded-lg pl-10 pr-4 text-base text-slate-900 dark:text-white focus:ring-2 focus:ring-shinko-primary/50 focus:border-shinko-primary outline-none transition-all" 
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Localização</label>
                            <div className="relative">
                                <MapPin className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
                                <input 
                                  type="text" 
                                  value={location}
                                  onChange={e => setLocation(e.target.value)}
                                  placeholder="Cidade, Estado"
                                  className="w-full h-12 glass-input rounded-lg pl-10 pr-4 text-base text-slate-900 dark:text-white focus:ring-2 focus:ring-shinko-primary/50 focus:border-shinko-primary outline-none transition-all" 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 dark:border-white/10 pt-6 mt-6 flex justify-end">
                        <button 
                          onClick={handleSaveProfile}
                          disabled={saving}
                          className="h-12 flex items-center gap-2 bg-shinko-primary hover:brightness-110 text-white px-8 rounded-lg font-bold text-sm shadow-lg shadow-amber-900/20 transition-transform active:scale-95 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5" />}
                            {saving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'workspace' && (
                 <div className="h-full flex flex-col space-y-8 animate-in slide-in-from-right-4 duration-300">

                    {/* WARNING BANNER */}
                    {subscriptionInfo && subscriptionInfo.shouldWarn && (
                        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-4 animate-pulse">
                            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0" />
                            <div>
                                <h3 className="font-bold text-red-800 dark:text-red-300">Atenção: Sua assinatura expira em {subscriptionInfo.daysRemaining} dias!</h3>
                                <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                                    Renove agora para evitar interrupção no acesso ao sistema.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-6">
                         <div>
                             <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                 <Building2 className="w-6 h-6 text-shinko-primary"/> Meu Workspace
                             </h2>
                             <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                                 Gerencie sua assinatura e métodos de pagamento.
                             </p>
                         </div>
                    </div>
                    
                    {/* Active Subscription Card */}
                    {activeSub && (
                        <div className="mb-8">
                            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                                <CreditCard className="w-4 h-4"/> Sua Assinatura
                            </h3>
                            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-emerald-200 dark:border-emerald-800 flex justify-between items-center shadow-sm ring-2 ring-emerald-500/20">
                                <div>
                                    <div className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                                        {activeSub.description || 'Assinatura Shinkō OS'}
                                    </div>
                                    <div className="text-xs text-slate-500 flex items-center gap-2">
                                        <CreditCard className="w-3 h-3"/> 
                                        {activeSub.billingType} • Ciclo: {activeSub.cycle}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                        <Calendar className="w-3 h-3"/>
                                        Próxima cobrança: {new Date(activeSub.nextDueDate).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-black text-slate-900 dark:text-white">R$ {activeSub.value.toFixed(2)}</div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded uppercase mt-1 inline-block bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400`}>
                                        Ativa
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* PLANS GRID */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">Planos Disponíveis</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {availablePlans.map(plan => (
                                <div 
                                    key={plan.id} 
                                    className={`relative p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between glass-card ${
                                        currentPlan === plan.id 
                                        ? 'border-shinko-primary shadow-glow ring-2 ring-shinko-primary/20' 
                                        : 'border-slate-200/50 dark:border-white/10 hover:border-shinko-primary/50 hover:-translate-y-1'
                                    }`}
                                >
                                    {currentPlan === plan.id && (
                                        <div className="absolute top-3 right-3 bg-shinko-primary text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shadow-sm z-10">
                                            Seu Plano
                                        </div>
                                    )}
                                    {plan.recommended && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-shinko-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase shadow-sm">
                                            Mais Popular
                                        </div>
                                    )}
                                    <div>
                                        <h4 className={`text-lg font-bold mb-2 ${currentPlan === plan.id ? 'text-shinko-primary' : 'text-slate-900 dark:text-white'}`}>{plan.name}</h4>
                                        <div className="flex items-baseline gap-1 mb-4">
                                            <span className="text-2xl font-black">R$ {plan.price.toFixed(2)}</span>
                                            <span className="text-xs opacity-60">/mês</span>
                                        </div>
                                        <ul className="space-y-2">
                                            {plan.features.slice(0,3).map((feat, i) => (
                                                <li key={i} className="text-xs flex items-start gap-2 opacity-80">
                                                    <Check className="w-3 h-3 mt-0.5 text-emerald-500 shrink-0"/> {feat}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <button 
                                        onClick={() => handlePlanSelection(plan)}
                                        className={`w-full py-2 rounded-lg text-xs font-bold mt-4 transition-colors ${
                                            currentPlan === plan.id
                                            ? 'bg-slate-200/50 dark:bg-white/20 text-white cursor-default'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-shinko-primary hover:text-white cursor-pointer'
                                    }`}>
                                        {currentPlan === plan.id ? (subscriptionInfo?.shouldWarn ? 'Renovar Agora' : 'Plano Atual') : 'Selecionar'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* INVOICE HISTORY */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                             <History className="w-4 h-4"/> Histórico de Faturas
                        </h3>
                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="p-4 font-medium">Data</th>
                                        <th className="p-4 font-medium">Descrição</th>
                                        <th className="p-4 font-medium">Valor</th>
                                        <th className="p-4 font-medium text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {payments.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-6 text-center text-slate-500 italic">Nenhuma fatura encontrada.</td>
                                        </tr>
                                    )}
                                    {payments.map(pay => (
                                        <tr key={pay.id} className="bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="p-4 text-slate-600 dark:text-slate-400">{new Date(pay.dateCreated).toLocaleDateString()}</td>
                                            <td className="p-4 text-slate-900 dark:text-white font-medium flex items-center gap-2">
                                                {pay.billingType === 'PIX' ? <Zap className="w-3 h-3 text-emerald-500"/> : <CreditCard className="w-3 h-3 text-blue-500"/>}
                                                {pay.description}
                                            </td>
                                            <td className="p-4 text-slate-600 dark:text-slate-300">R$ {pay.value.toFixed(2)}</td>
                                            <td className="p-4 text-right">
                                                <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${
                                                    (pay.status === 'RECEIVED' || pay.status === 'CONFIRMED') ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                    (pay.status === 'PENDING') ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                                    'bg-red-100 text-red-600'
                                                }`}>
                                                    {pay.status === 'RECEIVED' ? 'Pago' : pay.status === 'PENDING' ? 'Pendente' : pay.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>

    {/* PIX Payment Modal */}
    {showPixModal && selectedPlanForPix && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
            <div className="glass-panel w-full max-w-lg p-8 rounded-3xl shadow-2xl border border-white/10 animate-ios-pop flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Zap className="w-5 h-5 text-emerald-400"/> Pagamento Manual via PIX
                    </h3>
                    <button onClick={() => setShowPixModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
                </div>

                <div className="space-y-4 text-sm text-slate-300 overflow-y-auto custom-scrollbar pr-2">
                    <p>Para ativar o plano <strong>{selectedPlanForPix.name}</strong>, siga os passos:</p>
                    
                    <ol className="list-decimal list-inside space-y-3 p-4 bg-white/5 rounded-xl border border-white/10">
                        <li>
                            Copie a chave PIX (CNPJ) abaixo.
                            <div className="flex gap-2 mt-2">
                                <input type="text" value={PIX_KEY} readOnly className="flex-1 glass-input p-2 rounded text-xs font-mono"/>
                                <button onClick={() => copyToClipboard(PIX_KEY)} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-bold">
                                    {pixKeyCopied ? 'Copiado!' : 'Copiar'}
                                </button>
                            </div>
                        </li>
                        <li>
                            Faça o pagamento no valor exato de <strong className="text-amber-400">R$ {selectedPlanForPix.price.toFixed(2)}</strong>.
                        </li>
                        <li>
                            Anexe o comprovante de pagamento (imagem ou PDF) abaixo.
                            <div className="mt-2">
                                <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${receiptFile ? 'border-emerald-500 bg-emerald-900/20' : 'border-slate-600 hover:border-slate-500 bg-slate-800/50'}`}>
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-xs">
                                        <UploadCloud className="w-6 h-6 mb-2 text-slate-400"/>
                                        {receiptFile ? (
                                            <span className="font-bold text-emerald-400">{receiptFile.name}</span>
                                        ) : (
                                            <p className="text-slate-400">Clique para anexar o comprovante</p>
                                        )}
                                    </div>
                                    <input type="file" className="hidden" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} accept="image/*,.pdf"/>
                                </label>
                            </div>
                        </li>
                        <li>
                            Clique em "Enviar Comprovante". Sua assinatura será ativada em até 24h úteis.
                        </li>
                    </ol>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                    <button onClick={() => setShowPixModal(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5">
                        Cancelar
                    </button>
                    <button 
                        onClick={handleReceiptSubmit}
                        disabled={!receiptFile || isUploadingReceipt}
                        className="px-6 py-2 rounded-xl text-sm font-bold bg-amber-500 text-white hover:bg-amber-400 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isUploadingReceipt ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Enviar Comprovante'}
                    </button>
                </div>
            </div>
        </div>
    )}

  </div>
  );
};


export default ProfileScreen;
