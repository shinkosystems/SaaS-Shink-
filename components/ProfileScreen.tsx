import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Mail, Phone, Building2, MapPin, Save, Camera, Shield, CreditCard, Loader2, UploadCloud, Check, X, Calendar, AlertTriangle, History, Zap, Lock, Calculator, Minus, Plus, HelpCircle, Clock, CheckCircle, XCircle, FileText } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { fetchSubscriptionPlans, getPaymentHistory, calculateSubscriptionStatus, getUserSubscriptions, uploadReceiptAndNotify } from '../services/asaasService';
import { createStripePaymentIntent } from '../services/stripeService';
import { AsaasPayment, SubscriptionPlan, AsaasSubscription, FinancialTransaction } from '../types';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const DEFAULT_AVATAR = "https://zjssfnbcboibqeoubeou.supabase.co/storage/v1/object/public/fotoperfil/fotoperfil/1.png";
const PIX_KEY = "60.428.589/0001-55"; // CNPJ

// Initialize Stripe outside component
const STRIPE_PUBLISHABLE_KEY = 'pk_test_PLACEHOLDER_KEY'; 
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

// --- CONFIGURAÇÃO DE PREÇOS (BASEADA NA IMAGEM/OCR) ---
const PRICING = {
    USER_BASE: 89.90, // 1º Usuário
    USER_EXTRA: 69.90, // N - 1
    AI: {
        price: 199.00,
        quotaPrice: 99.00,
        baseQuota: 500
    }
};

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
  const [orgId, setOrgId] = useState<number | null>(null);
  const [orgExpiration, setOrgExpiration] = useState<string | null>(null);

  // Finance State
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  
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

  // --- CALCULATOR STATE ---
  const [calcUsers, setCalcUsers] = useState(1);
  const [calcAi, setCalcAi] = useState(false);
  const [calcAiExtra, setCalcAiExtra] = useState(0); // Extra quotas

  // --- CALCULATOR LOGIC (MEMOIZED) ---
  const calculation = useMemo(() => {
      // 1. License Cost
      const licenseBase = PRICING.USER_BASE;
      const licenseExtra = Math.max(0, calcUsers - 1) * PRICING.USER_EXTRA;
      const licenseTotal = licenseBase + licenseExtra;

      // 2. AI Cost
      const aiBase = calcAi ? PRICING.AI.price : 0;
      const aiExtra = calcAi ? (calcAiExtra * PRICING.AI.quotaPrice) : 0;
      const aiTotal = aiBase + aiExtra;

      const grandTotal = licenseTotal + aiTotal;

      return {
          licenseTotal,
          aiTotal,
          grandTotal,
          details: {
              users: calcUsers,
              extraUsers: Math.max(0, calcUsers - 1),
              aiQuotas: 500 + (calcAiExtra * 500)
          }
      };
  }, [calcUsers, calcAi, calcAiExtra]);

  // Fetch User Data on Mount
  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;

        if (user) {
          setUserId(user.id);
          setEmail(user.email || '');

          const meta = (user.user_metadata as any) || {};
          if (meta.avatar_url) setAvatarUrl(meta.avatar_url);

          const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select(`*, organizacoes (id, nome, vencimento)`)
            .eq('id', user.id)
            .single();

          if (!profileError && userProfile) {
            setName(userProfile.nome || meta.full_name || 'Usuário ShinkŌS');
            setPhone(userProfile.telefone || '');
            setRole(userProfile.perfil || 'Colaborador');
            if (userProfile.localizacao) setLocation(userProfile.localizacao as string);
            else if (meta.location) setLocation(meta.location);
            
            // Set Org Info
            if (userProfile.organizacoes) {
                const org = Array.isArray(userProfile.organizacoes) ? userProfile.organizacoes[0] : userProfile.organizacoes;
                setOrgName(org.nome);
                setOrgId(org.id);
                setOrgExpiration(org.vencimento);

                // Fetch Last Transactions
                const { data: txs } = await supabase
                    .from('transacoes')
                    .select('*')
                    .eq('organization_id', org.id)
                    .order('date', { ascending: false })
                    .limit(10);
                
                if (txs) {
                    setTransactions(txs.map((t:any) => ({
                        id: t.id,
                        date: t.date,
                        description: t.description,
                        amount: Number(t.amount),
                        type: t.type,
                        category: t.category,
                        organizationId: t.organization_id,
                        pago: t.pago,
                        comprovante: t.comprovante
                    })));
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
      setSelectedPlanForPayment(plan);
      setReceiptFile(null);
      setPaymentMethod('PIX'); // Default reset
      setClientSecret(''); // Clear secret
      setShowPaymentModal(true);
  };

  // --- HANDLE CUSTOM PLAN SELECTION ---
  const handleCustomPlanCheckout = () => {
      const customFeatures = [`${calcUsers} Colaboradores`];
      if (calcAi) customFeatures.push(`IA (${calculation.details.aiQuotas} cotas)`);

      const customPlan: SubscriptionPlan = {
          id: 'plan_custom',
          name: 'Plano Personalizado',
          price: calculation.grandTotal,
          features: customFeatures,
          recommended: false,
          cycle: 'MONTHLY',
          dbId: 999 // Special ID for custom plans
      };

      handlePlanSelection(customPlan);
  };

  const handleCloseModal = () => {
      setShowPaymentModal(false);
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
    if (!receiptFile || !selectedPlanForPayment || !userId || !orgId) {
        alert("Por favor, anexe o comprovante de pagamento. Verifique se sua organização está carregada.");
        return;
    }
    setIsUploadingReceipt(true);
    try {
        // Construct Detailed Description
        let detailedDescription = '';
        if (selectedPlanForPayment.id === 'plan_custom') {
            const parts = [];
            parts.push(`Assinatura Personalizada: ${calcUsers} Usuário(s)`);
            if (calcAi) parts.push(`IA (${calculation.details.aiQuotas} cotas)`);
            detailedDescription = parts.join(', ');
        } else {
            detailedDescription = `Assinatura Plano: ${selectedPlanForPayment.name}`;
        }

        const result = await uploadReceiptAndNotify(
            userId, 
            orgId,
            selectedPlanForPayment.id, 
            selectedPlanForPayment.price, 
            receiptFile,
            detailedDescription
        );

        if (result.success) {
            handleCloseModal();
            alert("Comprovante enviado com sucesso! Sua assinatura será ativada em até 24h úteis após aprovação.");
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
                <Calculator className="w-5 h-5" /> Calculadora Modular
             </button>
         </div>

         {/* Form Area */}
         <div className="flex-1">

            {activeTab === 'personal' && (
                <div className="space-y-8">
                    {/* Expiration Card */}
                    <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900 to-slate-800 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
                        <div className="relative z-10 flex justify-between items-center">
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                    <Clock className="w-4 h-4"/> Vencimento da Assinatura
                                </h3>
                                <div className="text-3xl font-black">
                                    {orgExpiration ? new Date(orgExpiration).toLocaleDateString() : '—'}
                                </div>
                                <div className="text-xs text-slate-400 mt-2">
                                    Mantenha sua assinatura em dia para evitar bloqueios.
                                </div>
                            </div>
                            <button onClick={() => setActiveTab('workspace')} className="px-6 py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-200 transition-colors shadow-lg">
                                Renovar Agora
                            </button>
                        </div>
                    </div>

                    <div className="max-w-2xl space-y-8">
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

                    {/* Transactions List */}
                    <div className="mt-12">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                            <History className="w-5 h-5 text-blue-500"/> Últimas Transações
                        </h3>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="p-4 font-medium">Data</th>
                                        <th className="p-4 font-medium">Descrição</th>
                                        <th className="p-4 font-medium text-right">Valor</th>
                                        <th className="p-4 font-medium text-center">Status</th>
                                        <th className="p-4 font-medium text-center">Comprovante</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {transactions.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-500">
                                                Nenhuma transação encontrada.
                                            </td>
                                        </tr>
                                    )}
                                    {transactions.map((t) => (
                                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="p-4 text-slate-600 dark:text-slate-400 font-mono text-xs">
                                                {new Date(t.date).toLocaleDateString()}
                                            </td>
                                            <td className="p-4 font-medium text-slate-900 dark:text-white">
                                                {t.description}
                                            </td>
                                            <td className={`p-4 text-right font-bold ${t.type === 'inflow' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {t.type === 'inflow' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-4 text-center">
                                                {t.pago ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                        <CheckCircle className="w-3 h-3"/> Pago
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                                                        <Clock className="w-3 h-3"/> Pendente
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                {t.comprovante ? (
                                                    <a href={t.comprovante} target="_blank" className="text-blue-500 hover:underline text-xs font-bold flex items-center justify-center gap-1">
                                                        <FileText className="w-3 h-3"/> Ver
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'workspace' && (
                 <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                        <div className="animate-in fade-in slide-in-from-bottom-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                
                                {/* Controls */}
                                <div className="space-y-8">
                                    <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/50">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                            <User className="w-5 h-5 text-blue-500"/> Usuários & Licenças
                                        </h3>
                                        <div className="mb-6">
                                            <div className="flex justify-between mb-2">
                                                <label className="text-sm font-bold text-slate-600 dark:text-slate-300">Número de Colaboradores (N)</label>
                                                <span className="text-lg font-black text-blue-600 dark:text-blue-400">{calcUsers}</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="1" 
                                                max="50" 
                                                value={calcUsers} 
                                                onChange={(e) => setCalcUsers(parseInt(e.target.value))}
                                                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                            />
                                            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg text-xs text-slate-600 dark:text-slate-400 border border-blue-100 dark:border-blue-900/20">
                                                <strong>Regra de Cálculo:</strong> R$ 89,90 (1º usuário) + R$ 69,90 por usuário extra.
                                            </div>
                                        </div>
                                    </div>

                                    <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/50">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                <Zap className="w-5 h-5 text-yellow-500"/> Módulo Inteligência Artificial
                                            </h3>
                                            <div 
                                                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${calcAi ? 'bg-yellow-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                                                onClick={() => setCalcAi(!calcAi)}
                                            >
                                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${calcAi ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                            </div>
                                        </div>
                                        <div className={`transition-all duration-300 ${calcAi ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                            <div className="flex justify-between items-center mb-4 text-sm">
                                                <span className="text-slate-600 dark:text-slate-300">Base (500 cotas inclusas)</span>
                                                <span className="font-bold text-slate-900 dark:text-white">R$ 199,00</span>
                                            </div>
                                            <div className="bg-slate-100 dark:bg-black/20 p-4 rounded-xl border border-slate-200 dark:border-white/5">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs font-bold text-slate-500 uppercase">Cotas Extras (+500 cada)</span>
                                                    <span className="text-xs font-bold text-slate-900 dark:text-white">+{calcAiExtra} pacotes</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <button onClick={() => setCalcAiExtra(Math.max(0, calcAiExtra - 1))} className="p-1 bg-white dark:bg-slate-800 rounded shadow hover:bg-slate-100"><Minus className="w-4 h-4"/></button>
                                                    <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                        <div className="h-full bg-yellow-500" style={{ width: `${Math.min(100, calcAiExtra * 10)}%` }}></div>
                                                    </div>
                                                    <button onClick={() => setCalcAiExtra(calcAiExtra + 1)} className="p-1 bg-white dark:bg-slate-800 rounded shadow hover:bg-slate-100"><Plus className="w-4 h-4"/></button>
                                                </div>
                                                <div className="text-right text-xs text-slate-500 mt-2">
                                                    + R$ {(calcAiExtra * 99).toFixed(2)}/mês
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Receipt / Summary */}
                                <div className="lg:sticky lg:top-4 h-fit space-y-6">
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden relative">
                                        {/* Paper tear effect (CSS simulation) */}
                                        <div className="h-2 bg-slate-900 dark:bg-black w-full absolute top-0 left-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle, transparent 50%, inherit 50%)', backgroundSize: '10px 10px', backgroundPosition: '0 5px'}}></div>
                                        
                                        <div className="p-8">
                                            <h3 className="text-center text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1 border-b-2 border-slate-900 dark:border-white pb-4">
                                                Resumo do Plano
                                            </h3>
                                            <div className="text-center text-xs text-slate-500 mt-2 mb-6 font-mono">
                                                {new Date().toLocaleDateString()} • CALCULADORA SHINKŌ
                                            </div>

                                            <div className="space-y-4 text-sm">
                                                {/* License Breakdown */}
                                                <div className="flex justify-between items-start pb-4 border-b border-slate-100 dark:border-white/5 border-dashed">
                                                    <div>
                                                        <div className="font-bold text-slate-800 dark:text-slate-200">Licenças de Usuário ({calcUsers})</div>
                                                        <div className="text-xs text-slate-500 mt-1 pl-2">
                                                            <div>1x Base (R$ 89,90)</div>
                                                            {calcUsers > 1 && <div>{calcUsers - 1}x Extra (R$ 69,90)</div>}
                                                        </div>
                                                    </div>
                                                    <div className="font-mono font-bold text-slate-900 dark:text-white">
                                                        R$ {calculation.licenseTotal.toFixed(2)}
                                                    </div>
                                                </div>

                                                {/* AI Breakdown */}
                                                {calcAi && (
                                                    <div className="flex justify-between items-start pb-4 border-b border-slate-100 dark:border-white/5 border-dashed">
                                                        <div>
                                                            <div className="font-bold text-slate-800 dark:text-slate-200">Módulo IA</div>
                                                            <div className="text-xs text-slate-500 mt-1 pl-2">
                                                                <div>Base (+R$ 199,00)</div>
                                                                {calcAiExtra > 0 && <div>{calcAiExtra}x Cotas Extras (+R$ {(calcAiExtra * 99).toFixed(2)})</div>}
                                                            </div>
                                                        </div>
                                                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                                                            R$ {calculation.aiTotal.toFixed(2)}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-8 pt-4 border-t-2 border-slate-900 dark:border-white flex justify-between items-end">
                                                <div className="text-xs font-bold text-slate-500 uppercase">Custo Mensal Total</div>
                                                <div className="text-3xl font-black text-slate-900 dark:text-white">
                                                    R$ {calculation.grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-50 dark:bg-black/30 p-4 border-t border-slate-200 dark:border-slate-800">
                                            <button 
                                                onClick={handleCustomPlanCheckout}
                                                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-black font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                            >
                                                Contratar Personalizado <Zap className="w-4 h-4 fill-current"/>
                                            </button>
                                            <p className="text-[10px] text-center text-slate-400 mt-3">
                                                Cobrança mensal recorrente. Cancelamento a qualquer momento.
                                            </p>
                                        </div>
                                    </div>
                                </div>
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