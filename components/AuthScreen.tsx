
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Lock, Mail, ArrowRight, Loader2, ShieldCheck, UserCircle2, User, Phone, Briefcase, Building2, Sparkles, X, KeyRound } from 'lucide-react';
import { logEvent } from '../services/analyticsService';

interface GuestPersona {
  name: string;
  email: string;
  role: 'dono' | 'admin' | 'colaborador' | 'cliente';
  avatar?: string;
}

interface Props {
  onGuestLogin: (persona?: GuestPersona) => void;
  onClose: () => void;
}

const LOGO_URL = "https://zjssfnbcboibqeoubeou.supabase.co/storage/v1/object/public/fotoperfil/fotoperfil/1.png";

const DEMO_PERSONAS: GuestPersona[] = [
  { name: 'Ana Silva (CTO)', email: 'ana.silva@techcorp.com', role: 'dono' },
  { name: 'Roberto Mendes', email: 'roberto.m@shinko.os', role: 'colaborador' },
  { name: 'Carla Dias (Cliente)', email: 'carla.compras@varejo.com.br', role: 'cliente' },
  { name: 'Fernando Souza', email: 'fernando.ops@shinko.os', role: 'admin' },
];

interface Organization {
  id: number;
  nome: string;
}

const AuthScreen: React.FC<Props> = ({ onGuestLogin, onClose }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('colaborador'); // Default
  const [selectedOrg, setSelectedOrg] = useState('');
  const [newOrgName, setNewOrgName] = useState('');
  
  // Data State
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Organizations when entering register mode
  useEffect(() => {
    if (isRegistering) {
      const fetchOrgs = async () => {
        const { data } = await supabase
          .from('organizacoes')
          .select('id, nome')
          .order('nome');
        
        if (data) {
          setOrganizations(data);
        }
      };
      fetchOrgs();
    }
  }, [isRegistering]);

  const handleRecovery = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email) {
          setError("Digite seu e-mail para recuperar a senha.");
          return;
      }
      setLoading(true);
      setError(null);

      try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: window.location.origin, // Garante que volta para a home do app
          });

          if (error) throw error;

          alert("E-mail enviado! Verifique sua caixa de entrada. Ao clicar no link, você será redirecionado para definir a nova senha.");
          setIsRecovering(false);
      } catch (err: any) {
          setError(err.message || "Erro ao enviar e-mail de recuperação.");
      } finally {
          setLoading(false);
      }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegistering) {
        let orgIdToSave: number | null = null;

        // Lógica de Organização Baseada no Perfil
        if (role === 'dono') {
            // CASO DONO: Cria a organização primeiro
            if (!newOrgName.trim()) {
                throw new Error("Para cadastrar como Dono, informe o Nome da Empresa.");
            }

            const { data: newOrg, error: orgError } = await supabase
                .from('organizacoes')
                .insert({ nome: newOrgName })
                .select('id')
                .single();

            if (orgError) throw new Error("Erro ao criar organização: " + orgError.message);
            if (!newOrg) throw new Error("Erro inesperado ao criar organização.");

            orgIdToSave = newOrg.id;
            console.log("Organização criada com sucesso, ID:", orgIdToSave);

        } else if (role === 'colaborador' || role === 'cliente') {
             // CASO COLABORADOR/CLIENTE: Deve selecionar existente
             if (!selectedOrg) throw new Error("Por favor, selecione a organização vinculada.");
             orgIdToSave = parseInt(selectedOrg);
        }
        
        // Criar Usuário no Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              phone: phone,
              role: role,
              org_id: orgIdToSave,
              new_org_name: role === 'dono' ? newOrgName : undefined
            }
          }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Erro ao criar usuário (sem dados retornados).");

        // Upsert na tabela pública 'users' com o ID da organização correto
        const { error: dbError } = await supabase.from('users').upsert({
            id: authData.user.id,
            email: email,
            nome: name,
            telefone: phone,
            perfil: role,
            organizacao: orgIdToSave, // Vincula ID correto (recém criado ou selecionado)
            status: role === 'dono' ? 'Aprovado' : 'Pendente' // Donos se auto-aprovam ao criar a org
        });

        if (dbError) {
             console.warn("Aviso de Insert User:", dbError.message);
        }

        logEvent('activation_step', { step: 'register_complete', role });

        alert(role === 'dono' 
            ? `Empresa "${newOrgName}" criada! Bem-vindo, Dono.` 
            : 'Cadastro realizado! Aguarde aprovação do administrador.'
        );
        
        // Se for Dono, já faz login direto se o Supabase permitir
        if (role === 'dono' && authData.session) {
            logEvent('login', { method: 'email_register' });
            onClose();
        } else {
            setIsRegistering(false);
        }

      } else {
        // LOGIN NORMAL
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;

        // Se login for bem sucedido, fecha o modal imediatamente
        if (data.session) {
            logEvent('login', { method: 'email' });
            onClose(); // Force close on success
        }
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : (typeof err === 'object' ? JSON.stringify(err) : String(err));
      setError(msg || 'Erro ao autenticar');
      logEvent('error', { type: 'auth_fail', message: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleRandomGuest = () => {
      const persona = DEMO_PERSONAS[Math.floor(Math.random() * DEMO_PERSONAS.length)];
      onGuestLogin(persona);
  };

  const showOrgSelect = role === 'colaborador' || role === 'cliente';
  const showNewOrgInput = role === 'dono';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
      
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}></div>

      <div className="w-full max-w-md glass-panel p-8 rounded-[32px] shadow-2xl relative z-10 animate-ios-pop duration-300 border border-white/10">
        
        {/* Close Button */}
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
        >
            <X className="w-6 h-6" />
        </button>

        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 relative group">
             <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full group-hover:bg-amber-500/30 transition-all duration-700"></div>
             <img 
                src={LOGO_URL} 
                alt="Shinko Logo" 
                className="w-full h-full object-contain relative z-10 drop-shadow-2xl"
             />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight font-sans">Shink<span className="text-amber-500">ŌS</span></h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 tracking-widest uppercase text-[10px]">
              {isRecovering ? 'Recuperação de Acesso' : (isRegistering ? 'Criar Nova Conta' : 'Login do Sistema')}
          </p>
        </div>

        {/* Forms */}
        {isRecovering ? (
            /* FORM RECOVERY */
            <form onSubmit={handleRecovery} className="space-y-6 animate-in slide-in-from-right duration-300">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 p-3 rounded text-xs text-center font-medium animate-pulse flex items-center justify-center gap-2 break-words">
                        <ShieldCheck className="w-4 h-4 shrink-0"/> 
                        <span>{error}</span>
                    </div>
                )}
                <div className="text-sm text-center text-slate-500 dark:text-slate-400 px-4">
                    Informe seu e-mail para redefinir a senha.
                </div>
                <div className="relative group">
                    <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                    <input 
                        type="email" 
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Seu e-mail"
                        className="glass-input w-full rounded-xl py-3.5 pl-10 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-amber-900/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5"/>}
                    Enviar Link
                </button>
                <button 
                    type="button"
                    onClick={() => { setIsRecovering(false); setError(null); }}
                    className="w-full text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors py-2"
                >
                    Voltar para Login
                </button>
            </form>
        ) : (
            /* FORM LOGIN/REGISTER */
            <form onSubmit={handleAuth} className="space-y-4 animate-in slide-in-from-left duration-300">
            
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 p-3 rounded text-xs text-center font-medium animate-pulse flex items-center justify-center gap-2 break-words">
                <ShieldCheck className="w-4 h-4 shrink-0"/> 
                <span>{error}</span>
                </div>
            )}

            {isRegistering && (
                <>
                <div className="relative group animate-ios-slide-right animate-delay-100">
                    <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                    <input 
                        type="text" 
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Nome Completo"
                        className="glass-input w-full rounded-xl py-3.5 pl-10 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
                    />
                </div>

                <div className="relative group animate-ios-slide-right animate-delay-100">
                    <Phone className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                    <input 
                        type="tel" 
                        required
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="Telefone / WhatsApp"
                        className="glass-input w-full rounded-xl py-3.5 pl-10 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
                    />
                </div>

                <div className="relative group animate-ios-slide-right animate-delay-200">
                    <Briefcase className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                    <select
                        required
                        value={role}
                        onChange={e => setRole(e.target.value)}
                        className="glass-input w-full rounded-xl py-3.5 pl-10 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all appearance-none cursor-pointer"
                    >
                        <option value="colaborador" className="bg-white dark:bg-slate-900">Colaborador</option>
                        <option value="cliente" className="bg-white dark:bg-slate-900">Cliente</option>
                        <option value="dono" className="bg-white dark:bg-slate-900">Dono (Proprietário)</option>
                    </select>
                </div>

                {showOrgSelect && (
                    <div className="relative group animate-ios-slide-right animate-delay-200">
                        <Building2 className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                        <select
                            required
                            value={selectedOrg}
                            onChange={e => setSelectedOrg(e.target.value)}
                            className="glass-input w-full rounded-xl py-3.5 pl-10 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all appearance-none cursor-pointer"
                        >
                            <option value="" className="bg-white dark:bg-slate-900">Selecione a Organização</option>
                            {organizations.map(org => (
                                <option key={org.id} value={org.id} className="bg-white dark:bg-slate-900">{org.nome}</option>
                            ))}
                        </select>
                    </div>
                )}

                {showNewOrgInput && (
                    <div className="relative group animate-ios-slide-right animate-delay-200">
                        <Building2 className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                        <input 
                        type="text" 
                        value={newOrgName}
                        onChange={e => setNewOrgName(e.target.value)}
                        placeholder="Nome da Sua Empresa"
                        className="glass-input w-full rounded-xl py-3.5 pl-10 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
                    />
                    </div>
                )}
                </>
            )}

            <div className="relative group">
                <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                <input 
                    type="email" 
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="E-mail corporativo"
                    className="glass-input w-full rounded-xl py-3.5 pl-10 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
                />
            </div>

            <div className="relative group">
                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                <input 
                    type="password" 
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Senha de acesso"
                    className="glass-input w-full rounded-xl py-3.5 pl-10 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
                />
            </div>

            {!isRegistering && (
                <div className="flex justify-end">
                    <button 
                        type="button"
                        onClick={() => { setIsRecovering(true); setError(null); }}
                        className="text-xs font-medium text-amber-500 hover:text-amber-400 transition-colors"
                    >
                        Esqueceu a senha?
                    </button>
                </div>
            )}

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-amber-900/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4 hover:shadow-amber-500/30 border border-white/10"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isRegistering ? <ShieldCheck className="w-5 h-5"/> : <ArrowRight className="w-5 h-5"/>)}
                {isRegistering ? 'Finalizar Cadastro' : 'Entrar'}
            </button>
            </form>
        )}

        {/* Footer Actions */}
        {!isRecovering && (
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/10 text-center space-y-4">
                <button 
                    onClick={() => {
                        setError(null);
                        setIsRegistering(!isRegistering);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                    {isRegistering ? 'Já possui credencial? Fazer Login' : 'Não tem acesso? Criar conta'}
                </button>

                <button 
                    onClick={handleRandomGuest}
                    className="w-full py-2.5 glass-button hover:bg-white/20 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl text-sm font-medium transition-colors border border-slate-200 dark:border-white/10 flex items-center justify-center gap-2 group shadow-sm"
                >
                    <Sparkles className="w-4 h-4 text-amber-500 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors"/>
                    Entrar como Convidado (Demo)
                </button>
            </div>
        )}

      </div>
    </div>
  );
};

export default AuthScreen;
