
import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Phone, Building2, MapPin, Save, Camera, Shield, CreditCard, Loader2, UploadCloud, Check, X, Calendar, AlertTriangle, History, Zap, Lock } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { fetchSubscriptionPlans, getPaymentHistory, calculateSubscriptionStatus, getUserSubscriptions, uploadReceiptAndNotify } from '../services/asaasService';
import { createStripePaymentIntent } from '../services/stripeService';
import { AsaasPayment, SubscriptionPlan, AsaasSubscription } from '../types';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const DEFAULT_AVATAR = "https://zjssfnbcboibqeoubeou.supabase.co/storage/v1/object/public/fotoperfil/fotoperfil/1.png";
const PIX_KEY = "60.428.589/0001-55"; // CNPJ

// Initialize Stripe outside component
// WARNING: Replace this placeholder with your actual publishable key from Stripe Dashboard
const STRIPE_PUBLISHABLE_KEY = 'pk_test_PLACEHOLDER_KEY'; 
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

interface Props {
  currentPlan: string;
  onRefresh: () => void;
}

// Inner Component for Stripe Form Logic
const StripeCheckoutForm = ({ onSuccess }: { onSuccess: () => void }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [message, setMessage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) return;

        setIsProcessing(true);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Return URL required, handle success inline if possible
                return_url: window.location.href, 
            },
            redirect: 'if_required'
        });

        if (error) {
            setMessage(error.message || "Erro desconhecido no pagamento.");
            setIsProcessing(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            setMessage("Pagamento realizado com sucesso!");
            onSuccess();
            setIsProcessing(false);
        } else {
            setMessage("Ocorreu algo inesperado. Verifique seu painel.");
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement />
            {message && (
                <div className={`p-3 rounded text-xs font-bold ${message.includes('sucesso') ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                    {message}
                </div>
            )}
            <button 
                disabled={isProcessing || !stripe || !elements} 
                className="w-full mt-4 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-lg font-bold transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
            >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <CreditCard className="w-4 h-4"/>}
                {isProcessing ? "Processando..." : "Pagar Agora"}
            </button>
            <div className="flex justify-center items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest mt-4">
                <Lock className="w-3 h-3"/> Pagamento Seguro via Stripe
            </div>
        </form>
    );
};

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
  
  // Organization Info
  const [orgName, setOrgName] = useState('');

  // Finance State
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [payments, setPayments] = useState<AsaasPayment[]>([]);
  const [subscriptions, setSubscriptions] = useState<AsaasSubscription[]>([]);
  
  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD'>('PIX');
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<SubscriptionPlan | null>(null);
  
  // PIX State
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [pixKeyCopied, setPixKeyCopied] = useState(false);

  // Stripe State
  const [isInitializingStripe, setIsInitializingStripe] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>('');

  // Fetch User Data on Mount
  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      try {
        const plans = await fetchSubscriptionPlans();
        setAvailablePlans(plans);

        const { data } = await supabase.auth.getUser();
        const user = data?.user;

        if (user) {
          setUserId(user.id);
          setEmail(user.email || '');

          const meta = (user.user_metadata as any) || {};
          if (meta.avatar_url) setAvatarUrl(meta.avatar_url);

          const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select(`*, organizacoes (nome)`)
            .eq('id', user.id)
            .single();

          if (!profileError && userProfile) {
            setName(userProfile.nome || meta.full_name || 'Usuário ShinkŌS');
            setPhone(userProfile.telefone || '');
            setRole(userProfile.perfil || 'Colaborador');
            if (userProfile.localizacao) setLocation(userProfile.localizacao as string);
            else if (meta.location) setLocation(meta.location);
            
            // Set Org Name
            if (userProfile.organizacoes) {
                setOrgName(Array.isArray(userProfile.organizacoes) ? userProfile.organizacoes[0].nome : userProfile.organizacoes.nome);
            }
          } else {
             setName(meta.full_name || 'Usuário ShinkŌS');
             if (meta.location) setLocation(meta.location);
          }

          const [history, userSubs] = await Promise.all([
              getPaymentHistory(user.id),
              getUserSubscriptions(user.id)
          ]);

          setPayments(history || []);
          setSubscriptions(userSubs || []);
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
      await supabase.from('users').upsert({
          id: userId, email: email, nome: name, telefone: phone, localizacao: location 
      });
      alert('Perfil atualizado com sucesso!');
    } catch (error: any) {
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
      await supabase.storage.from('fotoperfil').upload(fileName, file, { upsert: true });
      const { data: { publicUrl } } = supabase.storage.from('fotoperfil').getPublicUrl(fileName);
      setAvatarUrl(publicUrl);
      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
    } catch (error: any) {
      alert("Erro ao enviar foto: " + (error?.message || error));
    } finally {
      setUploading(false);
    }
  };
  
  const handlePlanSelection = (plan: SubscriptionPlan) => {
      if (plan.price === 0) return; // Free plan
      if (plan.id === currentPlan) return; // Already on plan
      
      setSelectedPlanForPayment(plan);
      setReceiptFile(null);
      setPaymentMethod('PIX'); // Default reset
      setClientSecret(''); // Clear secret
      setShowPaymentModal(true);
  };

  const handleCloseModal = () => {
      setShowPaymentModal(false);
      // Clean up state to prevent old data from flashing on next open
      setTimeout(() => {
          setSelectedPlanForPayment(null);
          setClientSecret('');
          setPaymentMethod('PIX');
      }, 300);
  };

  const initStripeCheckout = async () => {
      if (!selectedPlanForPayment || !userId) return;
      
      if (STRIPE_PUBLISHABLE_KEY.includes('PLACEHOLDER')) {
          alert("Configuração Pendente: Adicione sua Chave Pública do Stripe no código (ProfileScreen.tsx) para testar pagamentos com cartão.");
          return;
      }

      setIsInitializingStripe(true);
      try {
          const { clientSecret, error } = await createStripePaymentIntent(
              selectedPlanForPayment.dbId || 0,
              selectedPlanForPayment.name,
              userId,
              email
          );

          if (error) throw new Error(error);
          setClientSecret(clientSecret);
          
      } catch (e: any) {
          console.error(e);
          alert("Erro ao iniciar Stripe: " + e.message);
          setPaymentMethod('PIX'); // Fallback
      } finally {
          setIsInitializingStripe(false);
      }
  };

  const handlePaymentMethodChange = (method: 'PIX' | 'CREDIT_CARD') => {
      setPaymentMethod(method);
      if (method === 'CREDIT_CARD' && !clientSecret) {
          initStripeCheckout();
      }
  };

  const handleReceiptSubmit = async () => {
    if (!receiptFile || !selectedPlanForPayment || !userId) {
        alert("Por favor, anexe o comprovante de pagamento.");
        return;
    }
    setIsUploadingReceipt(true);
    try {
        const result = await uploadReceiptAndNotify(userId, selectedPlanForPayment.id, selectedPlanForPayment.price, receiptFile);
        if (result.success) {
            handleCloseModal();
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

  const getPlanStyle = (planId: string) => {
      if (planId === 'plan_free') return { border: 'border-amber-500', titleColor: 'text-amber-600 dark:text-amber-500', buttonColor: 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20' };
      if (planId === 'plan_usuario') return { border: 'border-amber-600', titleColor: 'text-amber-700 dark:text-amber-600', buttonColor: 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20' };
      if (planId === 'plan_studio') return { border: 'border-slate-200 dark:border-white/10', titleColor: 'text-slate-900 dark:text-white', buttonColor: 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20' }; 
      if (planId === 'plan_scale') return { border: 'border-slate-200 dark:border-white/10', titleColor: 'text-slate-900 dark:text-white', buttonColor: 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20' };
      if (planId === 'plan_agency') return { border: 'border-slate-200 dark:border-white/10', titleColor: 'text-slate-900 dark:text-white', buttonColor: 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20' };
      return { border: 'border-slate-200 dark:border-white/10', titleColor: 'text-slate-900 dark:text-white', buttonColor: 'bg-slate-100 dark:bg-white/10' };
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-shinko-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-300 overflow-y-auto pb-10 custom-scrollbar bg-slate-50 dark:bg-black text-slate-900 dark:text-white">

      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-white dark:bg-black/20">
          <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Meu Perfil</h1>
              <p className="text-slate-500 dark:text-slate-400">Gerencie sua assinatura e métodos de pagamento.</p>
          </div>
          {orgName && (
              <div className="bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Organização</span>
                  <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-500"/>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{orgName}</span>
                  </div>
              </div>
          )}
      </div>

      {/* Content Body */}
      <div className="flex-1 flex flex-col md:flex-row p-8 gap-8">

         {/* Sidebar Tabs */}
         <div className="w-full md:w-64 shrink-0 space-y-2">
             <button 
                onClick={() => setActiveTab('personal')}
                className={`w-full h-12 flex items-center gap-3 px-4 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'personal' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
                }`}
             >
                <User className="w-5 h-5" /> Dados Pessoais
             </button>
             <button 
                onClick={() => setActiveTab('workspace')}
                className={`w-full h-12 flex items-center gap-3 px-4 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'workspace' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
                }`}
             >
                <Building2 className="w-5 h-5" /> Planos & Cobrança
             </button>
         </div>

         {/* Form Area */}
         <div className="flex-1">

            {activeTab === 'personal' && (
                <div className="space-y-8 max-w-2xl">
                    <div className="flex items-center gap-6">
                        <div className="relative group shrink-0">
                            <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden ring-2 ring-white dark:ring-white/10">
                                {avatarUrl && <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover"/>}
                            </div>
                            <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full text-white">
                                {uploading ? <Loader2 className="w-6 h-6 animate-spin"/> : <Camera className="w-6 h-6"/>}
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload}/>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{name}</h3>
                            <p className="text-slate-500 dark:text-slate-400">{email}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Nome Completo</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 text-slate-900 dark:text-white outline-none focus:border-amber-500"/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Telefone</label>
                            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 text-slate-900 dark:text-white outline-none focus:border-amber-500"/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Localização</label>
                            <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 text-slate-900 dark:text-white outline-none focus:border-amber-500"/>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button onClick={handleSaveProfile} disabled={saving} className="h-12 px-8 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl flex items-center gap-2 disabled:opacity-50 shadow-lg">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Salvar
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'workspace' && (
                 <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                    <div>
                        <h3 className="text-lg font-bold text-slate-500 uppercase mb-6 tracking-wider">Planos Disponíveis</h3>
                        
                        {/* Responsive Grid: Vertical on mobile, Grid on larger screens */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {availablePlans.map(plan => {
                                const styles = getPlanStyle(plan.id);
                                const isCurrent = currentPlan === plan.id;
                                
                                return (
                                    <div 
                                        key={plan.id} 
                                        className={`relative p-6 rounded-2xl border bg-white dark:bg-black/40 flex flex-col justify-between min-h-[480px] shadow-sm ${isCurrent ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-50 dark:bg-amber-900/10' : styles.border}`}
                                    >
                                        {isCurrent && (
                                            <div className="absolute top-4 right-4 bg-amber-500 text-black text-[10px] font-bold px-2 py-1 rounded uppercase">
                                                Seu Plano
                                            </div>
                                        )}
                                        {plan.recommended && !isCurrent && (
                                            <div className="absolute top-[-12px] left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase shadow-lg z-10">
                                                Mais Popular
                                            </div>
                                        )}

                                        <div>
                                            <h4 className={`text-xl font-bold mb-4 ${styles.titleColor}`}>{plan.name}</h4>
                                            <div className="flex items-baseline gap-1 mb-6">
                                                <span className="text-3xl font-black text-slate-900 dark:text-white">R$ {plan.price.toFixed(2)}</span>
                                                <span className="text-xs text-slate-500">/mês</span>
                                            </div>
                                            
                                            <ul className="space-y-3">
                                                {plan.features.map((feat, i) => {
                                                    const isNegative = feat.startsWith('X') || feat.includes('Sem ');
                                                    return (
                                                        <li key={i} className={`text-xs flex items-start gap-2 ${isNegative ? 'text-slate-400 dark:text-slate-500 line-through decoration-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                                            {isNegative ? <X className="w-3 h-3 text-red-500 mt-0.5 shrink-0"/> : <Check className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0"/>}
                                                            <span className="leading-snug">{feat}</span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>

                                        <button 
                                            onClick={() => handlePlanSelection(plan)}
                                            disabled={isCurrent}
                                            className={`w-full py-3 rounded-lg text-sm font-bold mt-4 transition-colors ${
                                                isCurrent
                                                ? 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white/50 cursor-default'
                                                : styles.buttonColor + ' text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-transparent'
                                        }`}>
                                            {isCurrent ? 'Plano Atual' : 'Selecionar'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>

    {/* Universal Payment Modal */}
    {showPaymentModal && selectedPlanForPayment && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
            <div className="bg-white dark:bg-[#111] w-full max-w-lg p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 animate-ios-pop flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Zap className="w-5 h-5 text-emerald-400"/> Checkout Seguro
                    </h3>
                    <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X className="w-5 h-5"/></button>
                </div>

                <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300 overflow-y-auto custom-scrollbar pr-2">
                    <div className="flex justify-between items-center bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10">
                        <div>
                            <p className="text-xs text-slate-500 uppercase">Plano Selecionado</p>
                            <p className="text-lg font-bold text-slate-900 dark:text-white">{selectedPlanForPayment.name}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-500 uppercase">Valor</p>
                            <p className="text-xl font-bold text-amber-500 dark:text-amber-400">R$ {selectedPlanForPayment.price.toFixed(2)}</p>
                        </div>
                    </div>

                    {/* Method Toggle */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                        <button 
                            onClick={() => handlePaymentMethodChange('PIX')} 
                            className={`py-2 rounded-lg text-xs font-bold transition-all ${paymentMethod === 'PIX' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            PIX (Instantâneo)
                        </button>
                        <button 
                            onClick={() => handlePaymentMethodChange('CREDIT_CARD')} 
                            className={`py-2 rounded-lg text-xs font-bold transition-all ${paymentMethod === 'CREDIT_CARD' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            Cartão de Crédito
                        </button>
                    </div>
                    
                    {/* PIX Flow */}
                    {paymentMethod === 'PIX' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                                <label className="text-xs text-slate-500 uppercase block mb-2">Chave PIX (CNPJ)</label>
                                <div className="flex gap-2">
                                    <input type="text" value={PIX_KEY} readOnly className="flex-1 bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-2 rounded text-xs font-mono text-slate-900 dark:text-white"/>
                                    <button onClick={() => copyToClipboard(PIX_KEY)} className="px-3 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded text-xs font-bold">
                                        {pixKeyCopied ? 'Copiado!' : 'Copiar'}
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${receiptFile ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50 dark:bg-slate-800/50'}`}>
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-xs">
                                        <UploadCloud className="w-6 h-6 mb-2 text-slate-400"/>
                                        {receiptFile ? (
                                            <span className="font-bold text-emerald-500 dark:text-emerald-400">{receiptFile.name}</span>
                                        ) : (
                                            <p className="text-slate-400">Anexar Comprovante</p>
                                        )}
                                    </div>
                                    <input type="file" className="hidden" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} accept="image/*,.pdf"/>
                                </label>
                            </div>
                            
                            <button 
                                onClick={handleReceiptSubmit}
                                disabled={!receiptFile || isUploadingReceipt}
                                className="w-full py-3 rounded-xl text-sm font-bold bg-amber-500 text-black hover:bg-amber-400 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                            >
                                {isUploadingReceipt ? <Loader2 className="w-4 h-4 animate-spin mx-auto"/> : 'Enviar Comprovante'}
                            </button>
                        </div>
                    )}

                    {/* Stripe Card Flow */}
                    {paymentMethod === 'CREDIT_CARD' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                            {isInitializingStripe ? (
                                <div className="py-12 flex flex-col items-center justify-center text-slate-500">
                                    <Loader2 className="w-8 h-8 animate-spin mb-2 text-purple-500"/>
                                    <p className="text-xs">Conectando ao Stripe...</p>
                                </div>
                            ) : clientSecret ? (
                                <div className="bg-white p-4 rounded-xl text-slate-800 border border-purple-500/20 shadow-lg">
                                    <Elements stripe={stripePromise} options={{ clientSecret }}>
                                        <StripeCheckoutForm onSuccess={() => {
                                            handleCloseModal();
                                            alert("Assinatura confirmada! Bem-vindo.");
                                            onRefresh();
                                        }} />
                                    </Elements>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-red-400 text-xs">
                                    Erro ao carregar checkout. Tente PIX.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )}

  </div>
  );
};