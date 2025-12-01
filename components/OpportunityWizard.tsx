
import React, { useState, useEffect } from 'react';
import { Opportunity, RDEStatus, Archetype, IntensityLevel, TadsCriteria, ProjectStatus } from '../types';
import { analyzeOpportunity, suggestEvidence } from '../services/geminiService';
import { createProject } from '../services/projectService';
import { supabase } from '../services/supabaseClient';
import { Target, Zap, Rocket, BrainCircuit, ChevronRight, Check, Loader2, Lightbulb, DollarSign, AlertTriangle, ChevronDown, User, UserPlus, X, Phone, Lock, ArrowLeft, Layers, Calendar, Clock } from 'lucide-react';
import { ElasticSwitch } from './ElasticSwitch';
import { logEvent } from '../services/analyticsService';

interface Props {
  initialData?: Partial<Opportunity>;
  onSave: (opp: Opportunity) => void;
  onCancel: () => void;
}

interface SimpleUser {
    id: string;
    nome: string;
    email: string;
}

const STEPS = [
  'Conceito',
  'Decisão',
  'Arquétipo',
  'Aderência',
  'Evidências',
  'Aprovação'
];

const OpportunityWizard: React.FC<Props> = ({ initialData, onSave, onCancel }) => {
  const [step, setStep] = useState(0);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  
  // Client Management State
  const [clients, setClients] = useState<SimpleUser[]>([]);
  const [showCreateClient, setShowCreateClient] = useState(false);
  
  // New Client Form
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('');
  
  // New Client Contract Form
  const [newClientValue, setNewClientValue] = useState<number>(0);
  const [newClientStart, setNewClientStart] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newClientMonths, setNewClientMonths] = useState<number>(12);

  const [isCreatingClient, setIsCreatingClient] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus | null>(null);

  const [formData, setFormData] = useState<Partial<Opportunity>>(initialData || {
    title: '',
    description: '',
    clientId: '',
    rde: RDEStatus.WARM,
    viability: 3,
    velocity: 3,
    revenue: 3,
    prioScore: 0,
    archetype: Archetype.SAAS_ENTRY,
    intensity: IntensityLevel.L1,
    tads: {
      scalability: false,
      integration: false,
      painPoint: false,
      recurring: false,
      mvpSpeed: false
    },
    evidence: {
      clientsAsk: [],
      clientsSuffer: [],
      wontPay: []
    },
    status: 'Future' 
  });

  useEffect(() => {
      const fetchClients = async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // BUSCA A ORGANIZAÇÃO DO USUÁRIO PRIMEIRO
          const { data: userProfile } = await supabase
              .from('users')
              .select('organizacao')
              .eq('id', user.id)
              .single();

          if (!userProfile || !userProfile.organizacao) {
              console.warn("Usuário sem organização definida. Não é possível listar clientes.");
              return;
          }

          // FILTRA CLIENTES ESTRITAMENTE PELA ORGANIZAÇÃO
          let query = supabase
            .from('clientes')
            .select('id, nome, email')
            .eq('organizacao', userProfile.organizacao) // FILTRO CRÍTICO DE SEGURANÇA
            .order('nome');

          const { data } = await query;
          if (data) setClients(data);
      };
      fetchClients();
  }, []);

  const handleCreateClient = async () => {
      if (!newClientName || !newClientEmail) {
          alert("Preencha nome e email.");
          return;
      }
      setIsCreatingClient(true);

      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("Usuário não autenticado.");

          // Fetch user's organization to bind the new client
          const { data: userProfile } = await supabase.from('users').select('organizacao').eq('id', user.id).single();
          
          if (!userProfile?.organizacao) {
              throw new Error("Erro de perfil: Organização não encontrada.");
          }
          
          const orgId = userProfile.organizacao;

          // Match schema exactly: valormensal, numcolaboradores, cnpj, organizacao, contrato, logo_url
          const { data, error } = await supabase.from('clientes').insert({
              nome: newClientName,
              email: newClientEmail,
              telefone: newClientPhone || '',
              cnpj: '00.000.000/0000-00', // Placeholder or Input
              endereco: 'Endereço Padrão',
              numcolaboradores: 1, // Correct column name
              valormensal: newClientValue, // Correct column name
              meses: newClientMonths,
              data_inicio: newClientStart,
              status: 'Ativo',
              contrato: '', // Required NOT NULL
              logo_url: '', // Required NOT NULL
              organizacao: orgId // Required NOT NULL FK
          }).select().single();

          if (error) throw error;

          const newClient = { id: data.id, nome: newClientName, email: newClientEmail };
          setClients(prev => [...prev, newClient].sort((a,b) => a.nome.localeCompare(b.nome)));
          setFormData({ ...formData, clientId: data.id });
          setShowCreateClient(false);
          setNewClientName(''); setNewClientEmail(''); setNewClientPhone(''); setNewClientPassword('');
          setNewClientValue(0); setNewClientMonths(12);
          
          logEvent('feature_use', { feature: 'Create Client Inline' });

      } catch (err: any) {
          console.error("Erro detalhado:", err);
          alert('Erro ao criar cliente: ' + (err.message || JSON.stringify(err)));
      } finally {
          setIsCreatingClient(false);
      }
  };

  const tadsScore = Object.values(formData.tads || {}).filter(Boolean).length * 2;

  const calculatePrio6 = () => {
    const v = formData.velocity || 1;
    const t = formData.viability || 1;
    const r = formData.revenue || 1;
    const score = (v * 0.4) + (t * 0.35) + (r * 0.25);
    return Number(score.toFixed(2));
  };

  const prioScore = calculatePrio6();

  const getSuggestedStatus = (): ProjectStatus => {
      if (tadsScore < 4) return 'Archived';
      if (prioScore >= 4.0) return 'Active';
      if (prioScore >= 3.0) return 'Negotiation';
      return 'Future';
  };

  useEffect(() => {
      if (step === 5 && !selectedStatus) {
          if (formData.id && formData.status) {
              setSelectedStatus(formData.status);
          } else {
              setSelectedStatus(getSuggestedStatus());
          }
      }
  }, [step]);

  const handleAiAnalysis = async () => {
    if (!formData.title || !formData.description) return;
    setIsLoadingAi(true);
    setAiSuggestion(null);
    
    let result = await analyzeOpportunity(formData.title, formData.description);
    
    // Auto-fix mechanism for missing key
    if ((result === "API Key not found." || result.includes("API Key")) && (window as any).aistudio) {
        try {
            await (window as any).aistudio.openSelectKey();
            // Retry once
            result = await analyzeOpportunity(formData.title, formData.description);
        } catch (e) {
            console.error("AI Key retry failed", e);
        }
    }

    setAiSuggestion(result);
    setIsLoadingAi(false);
    logEvent('feature_use', { feature: 'AI Analysis' });
  };

  const handleAiEvidence = async () => {
    if (!formData.title) return;
    setIsLoadingAi(true);
    
    let result = await suggestEvidence(formData.title);
    
    // Auto-fix mechanism for missing key
    if ((result === "API Key not found." || result.includes("API Key")) && (window as any).aistudio) {
        try {
            await (window as any).aistudio.openSelectKey();
            // Retry once
            result = await suggestEvidence(formData.title);
        } catch (e) {
            console.error("AI Key retry failed", e);
        }
    }

    setAiSuggestion(result);
    setIsLoadingAi(false);
    logEvent('feature_use', { feature: 'AI Evidence' });
  };

  const nextStep = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const handleFinalSave = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      let currentOrgId = undefined; // Force lookup
      
      if (user) {
          const { data: userProfile } = await supabase.from('users').select('organizacao').eq('id', user.id).single();
          if (userProfile) currentOrgId = userProfile.organizacao;
      }

      if (!currentOrgId) {
          alert("Erro crítico: Organização não identificada. Não é possível salvar.");
          return;
      }

      const finalData = {
          ...formData,
          id: initialData?.id || crypto.randomUUID(),
          tadsScore,
          prioScore: calculatePrio6(),
          createdAt: initialData?.createdAt || new Date().toISOString(),
          status: selectedStatus,
          organizationId: currentOrgId // Force organization ID on save
      } as Opportunity;

      logEvent('feature_use', { feature: 'Save Opportunity', type: initialData?.id ? 'edit' : 'create' });
      
      // **CRITICAL STEP**: Se Status=Active, cria linha na tabela PROJETOS para o Kanban funcionar
      if (selectedStatus === 'Active' && !formData.dbProjectId && user) {
          const newProj = await createProject(
              formData.title || 'Novo Projeto', 
              formData.clientId || null, 
              user.id
          );
          if (newProj) {
              finalData.dbProjectId = newProj.id;
          }
      }

      onSave(finalData);
  };

  const renderStepContent = () => {
    switch(step) {
      case 0: 
        return (
          <div className="space-y-6 animate-ios-slide-right">
            <div className="grid gap-5">
              <label className="block">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nome do Projeto</span>
                <input 
                  type="text" 
                  className="glass-input w-full mt-2 h-14 text-lg font-bold px-4 rounded-xl"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="Ex: Sistema de Gestão de Resíduos"
                  autoFocus
                />
              </label>

              <div className="block">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cliente / Solicitante</span>
                <div className="flex gap-2 mt-2">
                    <div className="relative flex-1">
                        <select 
                            value={formData.clientId || ''}
                            onChange={e => setFormData({...formData, clientId: e.target.value})}
                            className="glass-input w-full h-12 px-4 rounded-xl appearance-none cursor-pointer"
                        >
                            <option value="" className="text-slate-500">-- Selecione um Cliente --</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id} className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">{c.nome}</option>
                            ))}
                        </select>
                        <User className="absolute right-4 top-3.5 text-slate-400 w-5 h-5 pointer-events-none"/>
                    </div>
                    <button 
                        onClick={() => setShowCreateClient(true)}
                        className="h-12 px-4 glass-button rounded-xl flex items-center gap-2 whitespace-nowrap hover:bg-white/20 transition-colors"
                    >
                        <UserPlus className="w-5 h-5"/> Novo
                    </button>
                </div>
              </div>
              
              <label className="block">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Descrição da Dor/Demanda</span>
                <textarea 
                  className="glass-input w-full mt-2 p-4 rounded-xl h-32 resize-none leading-relaxed"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Descreva a dor do cliente e a solução proposta..."
                />
              </label>

              <div className="flex justify-end">
                <button 
                  onClick={handleAiAnalysis}
                  disabled={isLoadingAi}
                  className="glass-button px-6 py-2 rounded-xl flex items-center gap-2 text-purple-500 hover:text-purple-400 hover:bg-purple-500/10 transition-all"
                >
                  {isLoadingAi ? <Loader2 className="animate-spin w-4 h-4"/> : <BrainCircuit className="w-4 h-4" />}
                  <span>Análise Shinkō AI</span>
                </button>
              </div>

              {aiSuggestion && (
                <div className="glass-panel p-4 rounded-xl text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap animate-ios-pop border-l-4 border-purple-500">
                  <h4 className="text-purple-500 font-bold flex items-center gap-2 mb-2"><BrainCircuit className="w-4 h-4"/> Análise da IA</h4>
                  {aiSuggestion}
                </div>
              )}

              <div className="mt-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-3">1. Radar de Demandas (RDE)</span>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: RDEStatus.HOT, color: 'border-red-500 bg-red-500/10 text-red-500' }, 
                    { id: RDEStatus.WARM, color: 'border-orange-500 bg-orange-500/10 text-orange-500' }, 
                    { id: RDEStatus.COLD, color: 'border-blue-500 bg-blue-500/10 text-blue-500' }
                  ].map((status) => (
                    <button
                      key={status.id}
                      onClick={() => setFormData({...formData, rde: status.id})}
                      className={`p-4 h-20 rounded-xl border transition-all ${
                        formData.rde === status.id 
                          ? `${status.color} shadow-[0_0_15px_rgba(0,0,0,0.2)] scale-105 ring-1 ring-white/20`
                          : 'glass-panel border-transparent hover:bg-white/5 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <span className="font-bold block text-lg">{status.id}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 1: 
        return (
          <div className="space-y-8 animate-ios-slide-right">
            <div className="glass-panel p-8 rounded-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2"><Target className="text-blue-500"/> Triângulo da Decisão</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Calibre os vetores para definir a prioridade matemática.</p>
              
              <div className="space-y-8 relative z-10">
                {/* Velocity */}
                <div>
                  <div className="flex justify-between mb-3">
                    <label className="font-bold text-green-600 dark:text-green-400 flex items-center gap-2 text-sm uppercase tracking-wide">
                        <Zap className="w-4 h-4"/> Velocidade (40%)
                    </label>
                    <span className="text-green-600 dark:text-green-400 font-black text-xl">{formData.velocity}/5</span>
                  </div>
                  <input 
                    type="range" min="1" max="5" step="1"
                    value={formData.velocity}
                    onChange={e => setFormData({...formData, velocity: parseInt(e.target.value)})}
                    className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-green-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-medium uppercase">
                      <span>Lento / Complexo</span>
                      <span>Rápido / MVP</span>
                  </div>
                </div>

                {/* Viability */}
                <div>
                  <div className="flex justify-between mb-3">
                    <label className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2 text-sm uppercase tracking-wide">
                        <Target className="w-4 h-4"/> Viabilidade (35%)
                    </label>
                    <span className="text-blue-600 dark:text-blue-400 font-black text-xl">{formData.viability}/5</span>
                  </div>
                  <input 
                    type="range" min="1" max="5" step="1"
                    value={formData.viability}
                    onChange={e => setFormData({...formData, viability: parseInt(e.target.value)})}
                    className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-medium uppercase">
                      <span>Dependência Externa</span>
                      <span>Time Autônomo</span>
                  </div>
                </div>

                {/* Revenue */}
                <div>
                  <div className="flex justify-between mb-3">
                    <label className="font-bold text-yellow-600 dark:text-yellow-400 flex items-center gap-2 text-sm uppercase tracking-wide">
                        <DollarSign className="w-4 h-4"/> Receita (25%)
                    </label>
                    <span className="text-yellow-600 dark:text-yellow-400 font-black text-xl">{formData.revenue}/5</span>
                  </div>
                  <input 
                    type="range" min="1" max="5" step="1"
                    value={formData.revenue || 3}
                    onChange={e => setFormData({...formData, revenue: parseInt(e.target.value)})}
                    className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                  />
                   <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-medium uppercase">
                      <span>Incerto / Baixo</span>
                      <span>Alto Potencial</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-white/10 text-center">
                 <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">Score PRIO-6</span>
                 <div className="text-5xl font-black mt-2 text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-400">
                    {prioScore.toFixed(2)}
                 </div>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
           <div className="space-y-8 animate-ios-slide-right">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-500"/> Arquétipo do Projeto
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {Object.values(Archetype).map(arch => (
                    <button
                      key={arch}
                      onClick={() => setFormData({...formData, archetype: arch})}
                      className={`p-5 h-24 rounded-2xl text-left text-sm transition-all flex flex-col justify-center relative overflow-hidden ${
                        formData.archetype === arch
                        ? 'bg-indigo-500/20 border border-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                        : 'glass-panel hover:bg-white/10 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <span className={`font-bold text-base z-10 ${formData.archetype === arch ? 'text-indigo-300' : ''}`}>{arch}</span>
                      {formData.archetype === arch && <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-indigo-500/40 blur-xl rounded-full"></div>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-pink-500"/> Trilha de Intensidade
                </h3>
                <div className="space-y-3">
                  {[
                    { val: IntensityLevel.L1, label: 'Nível 1 - Otimização', desc: 'Melhora o existente. Rápido.' },
                    { val: IntensityLevel.L2, label: 'Nível 2 - Automação', desc: 'Elimina etapas manuais. ROI alto.' },
                    { val: IntensityLevel.L3, label: 'Nível 3 - Transformação', desc: 'Muda a operação do setor.' },
                    { val: IntensityLevel.L4, label: 'Nível 4 - Disrupção', desc: 'Cria nova categoria.' },
                  ].map(item => (
                    <div 
                      key={item.val}
                      onClick={() => setFormData({...formData, intensity: item.val})}
                      className={`p-4 rounded-xl cursor-pointer flex justify-between items-center transition-all ${
                        formData.intensity === item.val
                        ? 'bg-pink-500/10 border border-pink-500/50 text-white'
                        : 'glass-panel hover:bg-white/10 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <div>
                        <div className={`font-bold ${formData.intensity === item.val ? 'text-pink-400' : ''}`}>{item.label}</div>
                        <div className="text-xs opacity-70 mt-0.5">{item.desc}</div>
                      </div>
                      {formData.intensity === item.val && <div className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center shadow-glow"><Check className="w-3 h-3 text-white"/></div>}
                    </div>
                  ))}
                </div>
              </div>
           </div>
        );
      case 3: 
        return (
          <div className="space-y-6 animate-ios-slide-right">
             <div className="glass-panel p-8 rounded-3xl border-l-4 border-emerald-500">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Teste TADS</h3>
                    <div className={`text-3xl font-black ${
                        tadsScore >= 8 ? 'text-emerald-500' : tadsScore >= 5 ? 'text-yellow-500' : 'text-red-500'
                    }`}>
                        {tadsScore}<span className="text-sm text-slate-500">/10</span>
                    </div>
                </div>
                
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Validação binária. Se não passar aqui, o projeto não escala.</p>

                <div className="space-y-4">
                  {[
                    { k: 'scalability', q: 'Escalabilidade', d: 'O custo marginal tende a zero?' },
                    { k: 'integration', q: 'Integração', d: 'Conecta fácil com o ecossistema?' },
                    { k: 'painPoint', q: 'Dor Real', d: 'O cliente chora por essa solução?' },
                    { k: 'recurring', q: 'Recorrência', d: 'Gera receita mensal (MRR)?' },
                    { k: 'mvpSpeed', q: 'Velocidade MVP', d: 'Dá pra lançar em < 30 dias?' },
                  ].map((item) => (
                    <div key={item.k} className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                      <div>
                          <div className="font-bold text-slate-200">{item.q}</div>
                          <div className="text-xs text-slate-500">{item.d}</div>
                      </div>
                      <ElasticSwitch 
                        checked={(formData.tads as any)[item.k]} 
                        onChange={() => {
                          const newTads = { ...formData.tads, [item.k]: !(formData.tads as any)[item.k] } as TadsCriteria;
                          setFormData({ ...formData, tads: newTads });
                        }}
                      />
                    </div>
                  ))}
                </div>
             </div>
          </div>
        );
      case 4: 
        return (
          <div className="space-y-6 animate-ios-slide-right">
             <div className="flex justify-between items-end">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Mapa de Evidências</h3>
              <button 
                  onClick={handleAiEvidence}
                  disabled={isLoadingAi}
                  className="flex items-center gap-2 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-500/20"
                >
                  <Lightbulb className="w-3 h-3" />
                  Sugerir Evidências
              </button>
             </div>

             {aiSuggestion && (
                <div className="glass-panel p-4 rounded-xl text-sm text-slate-300 mb-4 animate-ios-pop border-l-2 border-purple-500">
                  {aiSuggestion}
                </div>
              )}

             <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-xs font-bold text-emerald-500 uppercase mb-2 tracking-wide">O que o cliente pede (Quente)</label>
                  <textarea 
                    className="glass-input w-full p-4 rounded-xl h-32 text-sm leading-relaxed"
                    placeholder="- Cliente X pediu ontem&#10;- 3 tickets de suporte sobre isso"
                    value={formData.evidence?.clientsAsk.join('\n')}
                    onChange={e => setFormData({
                      ...formData, 
                      evidence: { ...formData.evidence!, clientsAsk: e.target.value.split('\n') }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-500 uppercase mb-2 tracking-wide">O que o cliente sofre (Latente)</label>
                  <textarea 
                     className="glass-input w-full p-4 rounded-xl h-32 text-sm leading-relaxed"
                     placeholder="- Estagiários reclamam de processo manual&#10;- Demora 3 dias para fechar folha"
                     value={formData.evidence?.clientsSuffer.join('\n')}
                     onChange={e => setFormData({
                       ...formData, 
                       evidence: { ...formData.evidence!, clientsSuffer: e.target.value.split('\n') }
                     })}
                  />
                </div>
             </div>
          </div>
        );
      case 5: 
        const finalScore = calculatePrio6();
        const suggestedStatus = getSuggestedStatus();
        
        const statusConfig = {
            'Active': { label: 'Sprint Ativo', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500' },
            'Negotiation': { label: 'Em Negociação', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500' },
            'Future': { label: 'Backlog Futuro', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500' },
            'Frozen': { label: 'Congelado', color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500' },
            'Archived': { label: 'Arquivado', color: 'text-slate-400', bg: 'bg-slate-500/20', border: 'border-slate-500' },
        }[selectedStatus || 'Future'];

        return (
          <div className="animate-ios-pop text-center h-full flex flex-col justify-center items-center py-4">
            
            {/* Score Circle */}
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-emerald-500 blur-3xl opacity-30 rounded-full"></div>
                <div className="relative w-40 h-40 rounded-full bg-slate-900 border-4 border-slate-800 flex flex-col items-center justify-center shadow-2xl">
                     <div className="text-5xl font-black text-white tracking-tighter">{finalScore.toFixed(2)}</div>
                     <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Score PRIO-6</div>
                </div>
            </div>

            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Veredito do Algoritmo</h2>

            {/* Status Selector Card */}
            <div className={`w-full max-w-md p-6 rounded-2xl border-2 transition-all relative group ${statusConfig?.bg} ${statusConfig?.border}`}>
                 <div className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2">Status Definido</div>
                 
                 <div className="relative z-10 flex items-center justify-center gap-2 text-2xl font-black text-white cursor-pointer">
                      {statusConfig?.label} <ChevronDown className="w-5 h-5 opacity-50"/>
                      <select 
                            value={selectedStatus || 'Future'}
                            onChange={(e) => setSelectedStatus(e.target.value as ProjectStatus)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        >
                             <option value="Active" className="bg-slate-900">Ativo (Sprint)</option>
                             <option value="Negotiation" className="bg-slate-900">Em Negociação</option>
                             <option value="Future" className="bg-slate-900">Futuro (Backlog)</option>
                             <option value="Frozen" className="bg-slate-900">Congelado</option>
                             <option value="Archived" className="bg-slate-900">Arquivado</option>
                        </select>
                 </div>

                 {suggestedStatus !== selectedStatus && (
                     <div className="mt-4 pt-3 border-t border-white/10 text-xs text-slate-300">
                         <span className="opacity-60">IA Sugeriu:</span> <strong>{suggestedStatus}</strong>
                     </div>
                 )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 w-full max-w-md mt-8">
                 <div className="glass-panel p-3 rounded-xl flex flex-col items-center">
                      <span className="text-xs text-slate-500 font-bold uppercase">Velocidade</span>
                      <span className="text-xl font-bold text-green-400">{formData.velocity}</span>
                 </div>
                 <div className="glass-panel p-3 rounded-xl flex flex-col items-center">
                      <span className="text-xs text-slate-500 font-bold uppercase">Viabilidade</span>
                      <span className="text-xl font-bold text-blue-400">{formData.viability}</span>
                 </div>
                 <div className="glass-panel p-3 rounded-xl flex flex-col items-center">
                      <span className="text-xs text-slate-500 font-bold uppercase">Aderência</span>
                      <span className="text-xl font-bold text-purple-400">{tadsScore}</span>
                 </div>
            </div>

            <button 
              onClick={handleFinalSave}
              className="w-full max-w-md mt-8 h-14 bg-gradient-to-r from-shinko-primary to-shinko-secondary text-white font-bold text-lg rounded-xl shadow-lg shadow-amber-900/30 transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <Rocket className="w-5 h-5"/> {formData.id ? 'Salvar Alterações' : 'Lançar Projeto'}
            </button>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      {/* Backdrop Glass Dark */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={onCancel}></div>

      {/* Main Modal Window */}
      <div className="relative w-full max-w-3xl h-[85vh] glass-panel rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-ios-pop">
        
        {/* Header Glass */}
        <div className="px-8 py-6 border-b border-slate-200/50 dark:border-white/5 flex justify-between items-center shrink-0">
          <div>
             <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                {initialData ? <Target className="w-5 h-5 text-shinko-primary"/> : <Rocket className="w-5 h-5 text-shinko-primary"/>}
                {initialData ? 'Editar Oportunidade' : 'Novo Projeto'}
             </h2>
             <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Shinkō Framework v2.5</p>
          </div>
          <button onClick={onCancel} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center transition-colors text-slate-500 dark:text-white">
              <X className="w-5 h-5"/>
          </button>
        </div>

        {/* Progress Line */}
        <div className="h-1 bg-slate-100 dark:bg-white/5 w-full">
          <div 
            className="h-full bg-gradient-to-r from-shinko-primary to-shinko-secondary transition-all duration-500 ease-out shadow-[0_0_10px_var(--brand-primary)]" 
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
             {/* Ambient Light inside modal */}
             <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-shinko-primary/5 rounded-full blur-3xl pointer-events-none"></div>
             <div className="relative z-10">
                {renderStepContent()}
             </div>
        </div>

        {/* Footer Glass */}
        {step < 5 && (
          <div className="p-6 border-t border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-md flex justify-between items-center shrink-0">
            <button 
              onClick={prevStep} 
              disabled={step === 0}
              className="px-6 py-3 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-bold text-sm transition-colors disabled:opacity-30 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4"/> Voltar
            </button>
            
            <div className="flex gap-2">
               {STEPS.map((_, i) => (
                   <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-shinko-primary w-6' : 'bg-slate-300 dark:bg-white/10'}`}></div>
               ))}
            </div>

            <button 
              onClick={nextStep}
              className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-200 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition-transform active:scale-95"
            >
              Próximo <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Create Client Modal (Inner) */}
      {showCreateClient && (
          <div className="absolute inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
              <div className="glass-panel w-full max-w-md p-8 rounded-3xl shadow-2xl border border-white/10 animate-ios-pop overflow-y-auto max-h-[90vh]">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-white">Novo Cliente</h3>
                      <button onClick={() => setShowCreateClient(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome da Empresa</label>
                          <input 
                              type="text" 
                              value={newClientName}
                              onChange={e => setNewClientName(e.target.value)}
                              className="glass-input w-full p-3 rounded-xl text-white"
                              placeholder="Acme Corp"
                          />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">E-mail de Acesso</label>
                          <input 
                              type="email" 
                              value={newClientEmail}
                              onChange={e => setNewClientEmail(e.target.value)}
                              className="glass-input w-full p-3 rounded-xl text-white"
                              placeholder="login@acme.com"
                          />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Phone className="w-3 h-3"/> Telefone</label>
                          <input 
                              type="tel" 
                              value={newClientPhone}
                              onChange={e => setNewClientPhone(e.target.value)}
                              className="glass-input w-full p-3 rounded-xl text-white"
                          />
                      </div>
                      {/* Password logic removed as client creation via user auth usually handles invites or default passwords differently, simplified for this view */}

                      <div className="pt-4 border-t border-white/10 mt-4">
                          <h4 className="text-xs font-bold text-emerald-500 uppercase mb-3 flex items-center gap-2">
                              <DollarSign className="w-4 h-4"/> Dados do Contrato
                          </h4>
                          <div className="space-y-3">
                              <div>
                                  <label className="text-xs font-bold text-slate-500 mb-1 block">Valor Mensal (MRR)</label>
                                  <input 
                                      type="number" 
                                      value={newClientValue}
                                      onChange={e => setNewClientValue(parseFloat(e.target.value))}
                                      className="glass-input w-full p-3 rounded-xl text-white"
                                      placeholder="0.00"
                                  />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                  <div>
                                      <label className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> Início</label>
                                      <input 
                                          type="date" 
                                          value={newClientStart}
                                          onChange={e => setNewClientStart(e.target.value)}
                                          className="glass-input w-full p-3 rounded-xl text-white text-xs"
                                      />
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Meses</label>
                                      <input 
                                          type="number" 
                                          value={newClientMonths}
                                          onChange={e => setNewClientMonths(parseInt(e.target.value))}
                                          className="glass-input w-full p-3 rounded-xl text-white"
                                      />
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="mt-8 flex justify-end gap-3">
                      <button 
                          onClick={() => setShowCreateClient(false)}
                          className="px-4 py-2 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5"
                      >
                          Cancelar
                      </button>
                      <button 
                          onClick={handleCreateClient}
                          disabled={isCreatingClient}
                          className="px-6 py-2 rounded-xl text-sm font-bold bg-amber-500 text-white hover:bg-amber-400 shadow-lg"
                      >
                          {isCreatingClient ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Criar Cliente'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default OpportunityWizard;
