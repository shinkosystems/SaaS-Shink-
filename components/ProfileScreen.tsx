import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Mail, Phone, Building2, MapPin, Save, Camera, Shield, CreditCard,
  Bell, Globe, Loader2, UploadCloud, Sparkles, Check, X, Copy, ExternalLink,
  FileText, History, ArrowUpRight, ArrowDownRight, Zap, Lock, Calendar,
  AlertTriangle, RefreshCw 
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { 
  fetchSubscriptionPlans, createAsaasPayment, getPaymentHistory, 
  checkPaymentStatus, calculateSubscriptionStatus, getFixedPaymentLink,
  getUserSubscriptions 
} from '../services/asaasService';
import { AsaasPayment, SubscriptionPlan, AsaasSubscription } from '../types';

const DEFAULT_AVATAR = "https://zjssfnbcboibqeoubeou.supabase.co/storage/v1/object/public/fotoperfil/fotoperfil/1.png";

export const ProfileScreen: React.FC = () => {
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
  const [currentPlan, setCurrentPlan] = useState('plan_start');
  const [payments, setPayments] = useState<AsaasPayment[]>([]);
  const [subscriptions, setSubscriptions] = useState<AsaasSubscription[]>([]);
  const [showCheckout, setShowCheckout] = useState<SubscriptionPlan | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [pixData, setPixData] = useState<{qrCode: string, copyPaste: string} | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    daysRemaining: number,
    expireDate: Date,
    shouldWarn: boolean
  } | null>(null);

  // Fetch user
  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      try {
        const plans = await fetchSubscriptionPlans();
        setAvailablePlans(plans);

        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);
          setEmail(user.email || '');

          const meta = user.user_metadata || {};
          if (meta.avatar_url) setAvatarUrl(meta.avatar_url);

          const { data: userProfile } = await supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .single();

          if (userProfile) {
            setName(userProfile.nome || meta.full_name || "Usuário ShinkŌS");
            setPhone(userProfile.telefone || "");
            setRole(userProfile.perfil || "Colaborador");
            setLocation(userProfile.localizacao || meta.location || "");
          } else {
            setName(meta.full_name || "Usuário ShinkŌS");
            if (meta.location) setLocation(meta.location);
          }

          const [history, userSubs] = await Promise.all([
            getPaymentHistory(user.id),
            getUserSubscriptions(user.id),
          ]);

          setPayments(history);
          setSubscriptions(userSubs);

          const activeSub = userSubs.find((s) => s.status === "ACTIVE");
          if (activeSub) {
            const nextDue = new Date(activeSub.nextDueDate);
            const diffDays = Math.ceil((nextDue.getTime() - Date.now()) / (1000 * 3600 * 24));

            setSubscriptionInfo({
              daysRemaining: diffDays,
              expireDate: nextDue,
              shouldWarn: diffDays <= 5 && diffDays > 0,
            });

            const matched = plans.find((p) =>
              activeSub.description?.toLowerCase().includes(p.name.toLowerCase())
            );
            if (matched) setCurrentPlan(matched.id);
          } else if (history.length > 0) {
            const lastPaid = history.find(
              (p) => p.status === "RECEIVED" || p.status === "CONFIRMED"
            );
            if (lastPaid) {
              const matched = plans.find((p) =>
                lastPaid.description.toLowerCase().includes(p.name.toLowerCase())
              );
              if (matched) setCurrentPlan(matched.id);

              const subStatus = calculateSubscriptionStatus(lastPaid.dateCreated);
              if (subStatus.isValid) {
                setSubscriptionInfo({
                  daysRemaining: subStatus.daysRemaining,
                  expireDate: subStatus.expireDate,
                  shouldWarn: subStatus.shouldWarn,
                });
              }
            }
          }
        }
      } catch (err) {
        console.error("Erro ao carregar perfil:", err);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);
  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          nome: name,
          telefone: phone,
          localizacao: location,
          perfil: role
        })
        .eq("id", userId);

      if (error) throw error;

      await supabase.auth.updateUser({
        data: {
          full_name: name,
          phone: phone,
          location: location,
          avatar_url: avatarUrl
        }
      });

    } catch (err) {
      console.error("Erro ao salvar:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('fotoperfil')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from('fotoperfil')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl.publicUrl);

      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl.publicUrl },
      });
    } catch (err) {
      console.error("Erro ao enviar foto:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleCreatePayment = async (plan: SubscriptionPlan) => {
    setProcessingPayment(true);
    try {
      const payment = await createAsaasPayment(userId, plan);

      if (payment?.encodedImage || payment?.payload) {
        setPixData({
          qrCode: payment.encodedImage,
          copyPaste: payment.payload
        });
        setShowCheckout(plan);
      }
    } catch (err) {
      console.error("Erro ao gerar pagamento PIX:", err);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCopyPix = () => {
    if (!pixData) return;
    navigator.clipboard.writeText(pixData.copyPaste);
  };

  const checkPixStatus = async () => {
    if (!pixData || !userId) return;

    try {
      const status = await checkPaymentStatus(userId);

      if (status?.status === "RECEIVED" || status?.status === "CONFIRMED") {
        setPaymentSuccess(true);
        setTimeout(() => {
          setShowCheckout(null);
          setPixData(null);
        }, 2000);
      }
    } catch (err) {
      console.error("Erro ao verificar pagamento:", err);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-20">

      {/* Título */}
      <h1 className="text-3xl font-bold mt-6 mb-3 flex items-center gap-2">
        <User className="w-7 h-7" />
        Meu Perfil
      </h1>

      {/* Aviso de assinatura */}
      {subscriptionInfo?.shouldWarn && (
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-xl shadow-sm mb-4 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6" />
          <div>
            Sua assinatura expira em{" "}
            <strong>{subscriptionInfo.daysRemaining}</strong> dias.  
            <button
              className="underline ml-2"
              onClick={() => setActiveTab("workspace")}
            >
              Renovar agora
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          className={`px-4 py-2 rounded-lg font-semibold ${
            activeTab === 'personal'
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
          onClick={() => setActiveTab('personal')}
        >
          Dados Pessoais
        </button>

        <button
          className={`px-4 py-2 rounded-lg font-semibold ${
            activeTab === 'workspace'
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
          onClick={() => setActiveTab('workspace')}
        >
          Assinatura & Pagamentos
        </button>
      </div>

      {/* --- ABA DE DADOS PESSOAIS --- */}
      {activeTab === 'personal' && (
        <div className="space-y-6">

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-24 h-24 rounded-full border shadow"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  Trocar foto
                </>
              )}
            </button>

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handleUpload}
            />
          </div>

          {/* Nome */}
          <div className="flex flex-col">
            <label className="font-semibold mb-1 flex items-center gap-2">
              <User className="w-5 h-5" /> Nome
            </label>
            <input
              className="border rounded-lg px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Email */}
          <div className="flex flex-col">
            <label className="font-semibold mb-1 flex items-center gap-2">
              <Mail className="w-5 h-5" /> Email
            </label>
            <input
              className="border rounded-lg px-3 py-2 bg-gray-100"
              value={email}
              disabled
            />
          </div>

          {/* Telefone */}
          <div className="flex flex-col">
            <label className="font-semibold mb-1 flex items-center gap-2">
              <Phone className="w-5 h-5" /> Telefone
            </label>
            <input
              className="border rounded-lg px-3 py-2"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {/* Localização */}
          <div className="flex flex-col">
            <label className="font-semibold mb-1 flex items-center gap-2">
              <MapPin className="w-5 h-5" /> Localização
            </label>
            <input
              className="border rounded-lg px-3 py-2"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* Salvar */}
          <button
            onClick={handleSave}
            className="w-full py-3 bg-green-600 text-white rounded-lg flex items-center justify-center gap-2 shadow hover:bg-green-700"
          >
            {saving ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Save className="w-6 h-6" />
                Salvar alterações
              </>
            )}
          </button>

        </div>
      )}
      {/* --- ABA DE ASSINATURA & PAGAMENTOS --- */}
      {activeTab === 'workspace' && (
        <div className="space-y-6">

          {/* Plano atual */}
          <div className="bg-white border rounded-xl shadow p-4">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-3">
              <Shield className="w-6 h-6" />
              Seu plano atual
            </h2>

            {subscriptionInfo ? (
              <p>
                Seu plano expira em{" "}
                <strong>{subscriptionInfo.daysRemaining} dias</strong>.
              </p>
            ) : (
              <p className="text-gray-500">Nenhuma assinatura ativa.</p>
            )}
          </div>

          {/* Seleção de planos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {availablePlans.map((plan) => (
              <div
                key={plan.id}
                className={`border rounded-xl p-4 shadow hover:shadow-lg transition relative ${
                  currentPlan === plan.id ? "border-blue-600" : "border-gray-300"
                }`}
              >
                {currentPlan === plan.id && (
                  <span className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 text-xs rounded-lg">
                    Atual
                  </span>
                )}

                <h3 className="font-bold text-lg">{plan.name}</h3>
                <p className="text-gray-700 mt-1">R$ {plan.price}</p>

                <button
                  className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                  onClick={() => handleCreatePayment(plan)}
                >
                  Assinar / Renovar
                </button>
              </div>
            ))}
          </div>

          {/* Histórico */}
          <div className="bg-white border rounded-xl shadow p-4">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-3">
              <History className="w-6 h-6" />
              Histórico de Pagamentos
            </h2>

            {payments.length === 0 ? (
              <p className="text-gray-500">Nenhum pagamento encontrado.</p>
            ) : (
              <div className="space-y-3">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 border rounded-lg flex justify-between"
                  >
                    <div>
                      <p className="font-semibold">{p.description}</p>
                      <p className="text-gray-600 text-sm">
                        {new Date(p.dateCreated).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-lg text-white ${
                        p.status === "RECEIVED" || p.status === "CONFIRMED"
                          ? "bg-green-600"
                          : "bg-gray-500"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* --- MODAL DE PAGAMENTO PIX --- */}
      {showCheckout && pixData && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CreditCard className="w-6 h-6" />
              Pagamento via PIX — {showCheckout.name}
            </h2>

            {paymentSuccess ? (
              <div className="text-center py-6">
                <Check className="w-14 h-14 text-green-600 mx-auto mb-3" />
                <p className="text-lg font-semibold">Pagamento confirmado!</p>
              </div>
            ) : (
              <>
                <img
                  src={pixData.qrCode}
                  alt="QR Code PIX"
                  className="w-64 h-64 mx-auto border rounded-lg"
                />

                <p className="text-center my-3 font-semibold">
                  Aproxime o app do seu banco
                </p>

                <button
                  onClick={handleCopyPix}
                  className="w-full py-2 bg-gray-200 rounded-lg flex items-center justify-center gap-2 mb-3"
                >
                  <Copy className="w-5 h-5" />
                  Copiar código PIX
                </button>

                <button
                  onClick={checkPixStatus}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Verificar pagamento
                </button>

                <button
                  onClick={() => {
                    setShowCheckout(null);
                    setPixData(null);
                  }}
                  className="w-full py-2 mt-3 bg-red-500 text-white rounded-lg flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Fechar
                </button>
              </>
            )}
          </div>
        </div>
      )}

    </div>  {/* ← FECHAMENTO DO CONTAINER PRINCIPAL */}
  );         {/* ← FECHAMENTO DO return() */}
};           {/* ← FECHAMENTO FINAL DO COMPONENTE */}

export default ProfileScreen;
