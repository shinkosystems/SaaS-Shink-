
import React, { useState, useEffect, useRef } from 'react';
import { 
    ArrowRight, Sparkles, Play, 
    Zap, Target, BrainCircuit, ShieldCheck, 
    Check, ChevronRight, BarChart3, Layers,
    Terminal, GitBranch, MessageSquare, Users,
    Globe, Lock, Cpu, DollarSign, Activity, Send,
    Settings, LayoutGrid, Calendar, TrendingUp, Code2, Palette, GanttChartSquare, Briefcase, Plus, Minus,
    CheckCircle, Rocket, Fingerprint, Database, Workflow, Loader2, BarChart, FileText, Smartphone
} from 'lucide-react';
import { CasesGallery } from './CasesGallery';

interface Props {
  onEnter: () => void;
  onOpenBlog?: () => void;
  customName?: string;
  customLogo?: string | null;
  customColor?: string;
}

const LOGO_URL = "https://zjssfnbcboibqeoubeou.supabase.co/storage/v1/object/public/fotoperfil/fotoperfil/1%20(1).png";

export const LandingPage: React.FC<Props> = ({ onEnter, onOpenBlog, customName, customLogo }) => {
  const [showCases, setShowCases] = useState(false);
  const brandName = customName || "Shinkō OS";
  const displayLogo = customLogo || LOGO_URL;

  // --- MODULAR PRICING STATE ---
  const [billingCycle, setBillingCycle] = useState<'monthly'|'yearly'>('monthly');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [userCount, setUserCount] = useState(5); 

  const getBasePlan = (users: number) => {
      if (users === 1) return { name: 'Core Solo', price: 89.90 };
      if (users <= 5) return { name: 'Core Studio', price: 297.90 };
      return { name: 'Core Scale', price: 899.90 };
  };

  const currentBase = getBasePlan(userCount);
  
  const AVAILABLE_MODULES = [
      { id: 'gantt', label: 'Cronograma Gantt', price: 29.90, icon: GanttChartSquare, desc: 'Linha do tempo visual e dependências técnicas.' },
      { id: 'financial', label: 'Gestão Financeira', price: 39.90, icon: DollarSign, desc: 'Fluxo de caixa, MRR e automação de faturamento.' },
      { id: 'crm', label: 'CRM de Vendas', price: 49.90, icon: TrendingUp, desc: 'Pipeline visual e gestão de contratos e leads.' },
      { id: 'ia', label: 'Shinkō Guru AI', price: 59.90, icon: BrainCircuit, desc: 'Seu CTO Virtual para análise de viabilidade e escopo.' },
      { id: 'engineering', label: 'Engenharia (DORA)', price: 69.90, icon: Code2, desc: 'Métricas de elite: Lead Time, Cycle Time e Throughput.' },
      { id: 'whitelabel', label: 'White Label', price: 1500.00, icon: Palette, desc: 'Sua marca, suas cores. Experiência 100% personalizada.' }
  ];

  const toggleModule = (id: string) => {
      setSelectedModules(prev => 
          prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
      );
  };

  const calculateTotal = () => {
      const modulesTotal = selectedModules.reduce((acc, modId) => {
          const mod = AVAILABLE_MODULES.find(m => m.id === modId);
          return acc + (mod ? mod.price : 0);
      }, 0);
      const totalMonthly = currentBase.price + modulesTotal;
      return billingCycle === 'yearly' ? totalMonthly * 0.8 : totalMonthly;
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#020202] text-white overflow-y-auto scroll-smooth custom-scrollbar selection:bg-amber-500 selection:text-black font-sans">
      
      {showCases && (
        <CasesGallery 
            onClose={() => setShowCases(false)} 
            onOpenBlog={onOpenBlog} 
            onEnter={onEnter} 
        />
      )}

      {/* --- BACKGROUND ENGINE --- */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[120px] mix-blend-screen animate-pulse"></div>
          <div className="absolute bottom-[10%] right-[10%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[120px] mix-blend-screen animate-pulse animation-delay-2000"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      </div>

      {/* --- HEADER --- */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-white/5 bg-[#020202]/80">
          <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo(0, 0)}>
                <img src={displayLogo} alt={brandName} className="h-10 w-auto object-contain transition-transform hover:scale-105" />
            </div>
            
            <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400 mr-4">
                    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-white transition-colors">Home</button>
                    <button onClick={() => setShowCases(true)} className="hover:text-white transition-colors">Cases</button>
                    {onOpenBlog && <button onClick={onOpenBlog} className="hover:text-white transition-colors">Blog</button>}
                </div>
                <button onClick={onEnter} className="group relative px-6 py-2.5 bg-white text-black font-bold text-sm rounded-full hover:bg-slate-200 transition-all shadow-glow-white overflow-hidden">
                    <span className="relative z-10 flex items-center gap-2">Entrar <ArrowRight className="w-4 h-4"/></span>
                </button>
            </div>
          </div>
      </nav>

      <main className="relative z-10 flex flex-col items-center">
          
          {/* --- HERO SECTION --- */}
          <section className="w-full min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 relative">
            <div className="max-w-5xl mx-auto relative z-10">
                <img 
                    src={displayLogo} 
                    alt="Logo Topo" 
                    className="h-32 md:h-48 w-auto object-contain mx-auto mb-12 animate-in fade-in zoom-in duration-1000"
                />

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <Sparkles className="w-3 h-3"/> Framework v2.5 Liberado
                </div>

                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 tracking-tighter leading-[0.95] text-white animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
                    Engenharia de <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600">Resultados Reais</span>.
                </h1>

                <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed font-light animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                    O sistema operacional que substitui "achismos" por <strong>dados</strong>. 
                    Integre <span className="text-white font-medium">Estratégia</span>, <span className="text-white font-medium">Dev</span> e <span className="text-white font-medium">Financeiro</span>.
                </p>

                <div className="flex flex-col sm:flex-row justify-center gap-6 animate-in fade-in zoom-in duration-500 delay-300">
                    <button onClick={onEnter} className="px-10 py-5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-lg rounded-full flex items-center justify-center gap-3 transition-all hover:scale-105 shadow-[0_0_50px_-10px_rgba(245,158,11,0.4)]">
                        Começar Agora
                    </button>
                    {onOpenBlog && (
                        <button onClick={onOpenBlog} className="px-10 py-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-lg rounded-full flex items-center justify-center gap-3 transition-all hover:scale-105 backdrop-blur-md">
                            <Layers className="w-5 h-5"/> Ler Artigos
                        </button>
                    )}
                </div>
            </div>
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
                <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center pt-2">
                    <div className="w-1 h-2 bg-white/50 rounded-full"></div>
                </div>
            </div>
          </section>

          {/* --- 1. MATRIZ RDE SECTION --- */}
          <section id="rde" className="w-full py-32 border-t border-white/5 bg-[#050505] overflow-hidden">
              <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                  <div className="order-2 lg:order-1 relative">
                      <div className="aspect-square rounded-[3rem] bg-gradient-to-br from-slate-900 to-black border border-white/10 relative overflow-hidden shadow-2xl group p-8">
                          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                          <div className="relative h-full w-full border border-white/10 rounded-2xl flex flex-col items-center justify-center">
                              <Target className="w-20 h-20 text-amber-500 mb-6 animate-pulse"/>
                              <div className="text-center">
                                  <div className="text-4xl font-black text-white">9.8</div>
                                  <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-1">Score de Prioridade</div>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="order-1 lg:order-2 space-y-8">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/30">
                          <Target className="w-6 h-6"/>
                      </div>
                      <h2 className="text-4xl md:text-6xl font-black text-white leading-tight">Matriz RDE™ <br/><span className="text-amber-500">Decisões Matemáticas.</span></h2>
                      <p className="text-lg text-slate-400 leading-relaxed">Pare de priorizar baseado em opiniões. Nosso algoritmo proprietário cruza <strong>Receita</strong>, <strong>Dor Técnica</strong> e <strong>Esforço</strong> para garantir foco total no que traz lucro real.</p>
                      <ul className="space-y-4">
                          {['Cálculo automático de PRIO-6', 'Identificação de "Vaca Leiteira" vs "Dreno"', 'Visualização em quadrantes de ação'].map(i => (
                              <li key={i} className="flex items-center gap-3 text-slate-300 font-medium">
                                  <CheckCircle className="w-5 h-5 text-amber-500"/> {i}
                              </li>
                          ))}
                      </ul>
                  </div>
              </div>
          </section>

          {/* --- 2. CRONOGRAMA GANTT SECTION --- */}
          <section id="gantt" className="w-full py-32 border-t border-white/5 bg-[#020202] overflow-hidden">
              <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                  <div className="space-y-8">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                          <GanttChartSquare className="w-6 h-6"/>
                      </div>
                      <h2 className="text-4xl md:text-6xl font-black text-white leading-tight">Linha do Tempo <br/><span className="text-blue-500">Visão de Longo Prazo.</span></h2>
                      <p className="text-lg text-slate-400 leading-relaxed">Visualize a carga horária do seu time e as dependências entre tarefas em um gráfico de Gantt moderno e interativo.</p>
                      <ul className="space-y-4">
                          {['Gestão visual de prazos e milestones', 'Identificação de gargalos de equipe', 'Arrasta-e-solta para reagendamento'].map(i => (
                              <li key={i} className="flex items-center gap-3 text-slate-300 font-medium">
                                  <CheckCircle className="w-5 h-5 text-blue-500"/> {i}
                              </li>
                          ))}
                      </ul>
                  </div>
                  <div className="relative">
                      <div className="aspect-video bg-slate-900 rounded-3xl border border-white/10 p-6 shadow-2xl relative">
                          <div className="space-y-4">
                              {[80, 45, 90].map((w, i) => (
                                  <div key={i} className="h-6 bg-blue-500/20 rounded-md overflow-hidden relative">
                                      <div className="h-full bg-blue-500 rounded-md shadow-glow" style={{ width: `${w}%`, marginLeft: `${i * 10}%` }}></div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          </section>

          {/* --- 3. GESTÃO FINANCEIRA SECTION --- */}
          <section id="financial" className="w-full py-32 border-t border-white/5 bg-[#050505] overflow-hidden">
              <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                  <div className="order-2 lg:order-1 relative">
                      <div className="bg-gradient-to-br from-emerald-900/40 to-black rounded-[3rem] p-10 border border-emerald-500/30 shadow-2xl">
                          <div className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-4">Fluxo de Caixa Mensal</div>
                          <div className="text-4xl font-black text-white mb-8">R$ 142.500,00</div>
                          <div className="flex items-end gap-2 h-32">
                              {[40, 70, 55, 90, 65, 85].map((h, i) => (
                                  <div key={i} className="flex-1 bg-emerald-500/20 rounded-t-lg relative group">
                                      <div className="absolute bottom-0 w-full bg-emerald-500 rounded-t-lg transition-all duration-1000" style={{ height: `${h}%` }}></div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
                  <div className="order-1 lg:order-2 space-y-8">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                          <DollarSign className="w-6 h-6"/>
                      </div>
                      <h2 className="text-4xl md:text-6xl font-black text-white leading-tight">Finanças <br/><span className="text-emerald-500">Métricas SaaS.</span></h2>
                      <p className="text-lg text-slate-400 leading-relaxed">Transforme seus contratos em dados. Acompanhe MRR, Churn e Fluxo de Caixa integrado diretamente aos seus projetos.</p>
                      <ul className="space-y-4">
                          {['Gestão de contratos e parcelas automáticas', 'Dashboard de rentabilidade por projeto', 'Previsão de faturamento (Cash Runway)'].map(i => (
                              <li key={i} className="flex items-center gap-3 text-slate-300 font-medium">
                                  <CheckCircle className="w-5 h-5 text-emerald-500"/> {i}
                              </li>
                          ))}
                      </ul>
                  </div>
              </div>
          </section>

          {/* --- 4. CRM DE VENDAS SECTION --- */}
          <section id="crm" className="w-full py-32 border-t border-white/5 bg-[#020202] overflow-hidden">
              <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                  <div className="space-y-8">
                      <div className="w-12 h-12 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
                          <TrendingUp className="w-6 h-6"/>
                      </div>
                      <h2 className="text-4xl md:text-6xl font-black text-white leading-tight">CRM Vendas <br/><span className="text-orange-500">Pipeline de Elite.</span></h2>
                      <p className="text-lg text-slate-400 leading-relaxed">Gerencie leads e oportunidades comerciais antes que elas se tornem projetos. Converta mais com visibilidade total do funil.</p>
                      <ul className="space-y-4">
                          {['Funil de vendas visual e intuitivo', 'Histórico completo de interações', 'Conversão direta de Deal para Projeto'].map(i => (
                              <li key={i} className="flex items-center gap-3 text-slate-300 font-medium">
                                  <CheckCircle className="w-5 h-5 text-orange-500"/> {i}
                              </li>
                          ))}
                      </ul>
                  </div>
                  <div className="relative">
                      <div className="aspect-video bg-[#0a0a0a] rounded-3xl border border-white/10 p-4 shadow-2xl flex gap-4">
                          {[1, 2, 3].map(col => (
                              <div key={col} className="flex-1 bg-white/5 rounded-xl p-3 border border-white/5">
                                  <div className="h-2 w-10 bg-white/10 rounded mb-4"></div>
                                  <div className="h-16 bg-white/5 rounded-lg mb-2"></div>
                                  <div className="h-16 bg-white/5 rounded-lg"></div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </section>

          {/* --- 5. GURU AI SECTION --- */}
          <section id="ai" className="w-full py-32 border-t border-white/5 bg-[#050505] overflow-hidden">
              <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                  <div className="order-2 lg:order-1 relative">
                      <div className="aspect-video bg-gradient-to-br from-purple-900/40 to-black rounded-3xl border border-purple-500/30 p-1 shadow-2xl relative overflow-hidden group">
                          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                          <div className="h-full w-full bg-[#050505] rounded-[22px] flex items-center justify-center flex-col p-10 text-center">
                              <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4"/>
                              <div className="text-xs font-mono text-purple-400 mb-2">GURU-AI-ENGINE_V2.5</div>
                              <div className="text-lg font-bold text-white">"Analise a viabilidade do Projeto Alpha"</div>
                          </div>
                      </div>
                  </div>
                  <div className="order-1 lg:order-2 space-y-8">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                          <BrainCircuit className="w-6 h-6"/>
                      </div>
                      <h2 className="text-4xl md:text-6xl font-black text-white leading-tight">Guru AI <br/><span className="text-purple-500">Seu CTO Virtual.</span></h2>
                      <p className="text-lg text-slate-400 leading-relaxed">Nossa inteligência artificial não apenas escreve código; ela entende o <strong>negócio</strong>. Gere cronogramas, escopos técnicos e matrizes de risco em segundos.</p>
                      <ul className="space-y-4">
                          {['Geração automática de WBS (BPMN)', 'Análise de viabilidade técnica imediata', 'Sugestão de membros baseada em skills'].map(i => (
                              <li key={i} className="flex items-center gap-3 text-slate-300 font-medium">
                                  <CheckCircle className="w-5 h-5 text-purple-500"/> {i}
                              </li>
                          ))}
                      </ul>
                  </div>
              </div>
          </section>

          {/* --- 6. ENGENHARIA DORA SECTION --- */}
          <section id="engineering" className="w-full py-32 border-t border-white/5 bg-[#020202] overflow-hidden">
              <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                  <div className="space-y-8">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                          <Code2 className="w-6 h-6"/>
                      </div>
                      <h2 className="text-4xl md:text-6xl font-black text-white leading-tight">Métricas DORA <br/><span className="text-blue-500">Alta Performance.</span></h2>
                      <p className="text-lg text-slate-400 leading-relaxed">Meça o que realmente importa. Transforme seu time de dev em um centro de performance usando métricas globais de eficiência de software.</p>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                              <div className="text-3xl font-black text-white mb-1">2.4d</div>
                              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Lead Time Médio</div>
                          </div>
                          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                              <div className="text-3xl font-black text-white mb-1">98%</div>
                              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Sucesso de Deploy</div>
                          </div>
                      </div>
                  </div>
                  <div className="relative">
                      <div className="aspect-square max-w-md mx-auto relative bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-10 flex flex-col justify-between overflow-hidden shadow-2xl">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>
                          <Activity className="w-10 h-10 text-blue-500 mb-8"/>
                          <div className="space-y-4">
                              {[80, 45, 95].map((w, i) => (
                                  <div key={i} className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${w}%` }}></div>
                                  </div>
                              ))}
                          </div>
                          <div className="text-[10px] font-mono text-slate-600 mt-10 uppercase tracking-widest">Real-time Data sync...</div>
                      </div>
                  </div>
              </div>
          </section>

          {/* --- 7. WHITE LABEL SECTION --- */}
          <section id="whitelabel" className="w-full py-32 border-t border-white/5 bg-[#050505] overflow-hidden">
              <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                  <div className="order-2 lg:order-1 relative">
                      <div className="aspect-video bg-white rounded-3xl p-8 shadow-2xl flex items-center justify-center border-4 border-amber-500 animate-in zoom-in duration-700">
                          <div className="flex flex-col items-center">
                              <div className="w-20 h-20 bg-slate-900 rounded-2xl mb-4 flex items-center justify-center">
                                  <Palette className="w-10 h-10 text-white"/>
                              </div>
                              <div className="h-4 w-32 bg-slate-200 rounded-full"></div>
                          </div>
                      </div>
                  </div>
                  <div className="order-1 lg:order-2 space-y-8">
                      <div className="w-12 h-12 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center border border-pink-500/30">
                          <Palette className="w-6 h-6"/>
                      </div>
                      <h2 className="text-4xl md:text-6xl font-black text-white leading-tight">White Label <br/><span className="text-pink-500">Sua Marca.</span></h2>
                      <p className="text-lg text-slate-400 leading-relaxed">Personalize toda a experiência da plataforma com seu logotipo, cores e domínio. Ofereça um portal profissional para seus clientes sob sua identidade.</p>
                      <ul className="space-y-4">
                          {['Logotipo e Favicon personalizados', 'Paleta de cores customizada', 'Domínio próprio (CNAME)'].map(i => (
                              <li key={i} className="flex items-center gap-3 text-slate-300 font-medium">
                                  <CheckCircle className="w-5 h-5 text-pink-500"/> {i}
                              </li>
                          ))}
                      </ul>
                  </div>
              </div>
          </section>

          {/* --- PRICING CALCULATOR SECTION --- */}
          <section id="pricing" className="w-full py-32 bg-[#020202] border-t border-white/5 relative">
              <div className="max-w-7xl mx-auto px-6">
                  <div className="text-center mb-20">
                      <h2 className="text-4xl md:text-6xl font-black text-white mb-4">Escolha seu <span className="text-amber-500">Arsenal</span></h2>
                      <p className="text-slate-400 max-w-2xl mx-auto">Comece com o Core e adicione módulos conforme sua empresa escala. Pague apenas pelo que usar.</p>
                      
                      <div className="mt-10 flex items-center justify-center gap-4">
                          <span className={`text-sm font-bold ${billingCycle === 'monthly' ? 'text-white' : 'text-slate-500'}`}>Mensal</span>
                          <button 
                            onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                            className="w-14 h-7 rounded-full bg-white/10 border border-white/10 relative p-1 flex items-center transition-colors"
                          >
                              <div className={`w-5 h-5 rounded-full bg-amber-500 shadow-glow transition-all ${billingCycle === 'yearly' ? 'translate-x-7' : 'translate-x-0'}`}></div>
                          </button>
                          <span className={`text-sm font-bold ${billingCycle === 'yearly' ? 'text-white' : 'text-slate-500'}`}>
                              Anual <span className="ml-1 text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">-20% OFF</span>
                          </span>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      <div className="lg:col-span-8 space-y-8">
                          <div className="p-8 rounded-3xl bg-white/5 border border-white/10">
                              <div className="flex justify-between items-center mb-8">
                                  <div>
                                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                          <Users className="w-5 h-5 text-blue-500"/> Core: Tamanho do Time
                                      </h3>
                                      <p className="text-xs text-slate-500 mt-1">Inclui Gestão de Projetos, Kanban e Matrizes.</p>
                                  </div>
                                  <div className="text-right">
                                      <div className="text-2xl font-black text-white">{userCount} usuários</div>
                                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{currentBase.name}</div>
                                  </div>
                              </div>
                              <input 
                                type="range" min="1" max="30" step="1" 
                                value={userCount} onChange={e => setUserCount(parseInt(e.target.value))}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white mb-6"
                              />
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  {['Projetos', 'Kanban', 'RDE', 'TADS'].map(f => (
                                      <div key={f} className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                                          <Check className="w-3 h-3 text-emerald-500"/> {f}
                                      </div>
                                  ))}
                              </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {AVAILABLE_MODULES.map(mod => {
                                  const isActive = selectedModules.includes(mod.id);
                                  return (
                                      <div 
                                        key={mod.id} 
                                        onClick={() => toggleModule(mod.id)}
                                        className={`p-5 rounded-2xl border transition-all cursor-pointer group ${isActive ? 'bg-amber-500/10 border-amber-500/50 shadow-glow' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                                      >
                                          <div className="flex justify-between items-start mb-3">
                                              <div className={`p-2.5 rounded-xl ${isActive ? 'bg-amber-500 text-black' : 'bg-white/5 text-slate-400 group-hover:text-white'}`}>
                                                  <mod.icon className="w-5 h-5"/>
                                              </div>
                                              <div className="text-xs font-black text-white">R$ {mod.price.toFixed(2)}</div>
                                          </div>
                                          <h4 className="font-bold text-sm text-white mb-1">{mod.label}</h4>
                                          <p className="text-[10px] text-slate-500 leading-tight">{mod.desc}</p>
                                          <div className="mt-4 flex justify-end">
                                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isActive ? 'bg-amber-500 border-amber-500' : 'border-white/10'}`}>
                                                  {isActive && <Check className="w-3 h-3 text-black"/>}
                                              </div>
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>

                      <div className="lg:col-span-4 sticky top-24">
                          <div className="p-8 rounded-3xl bg-white border border-white text-black shadow-2xl relative overflow-hidden group">
                              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-8">Resumo</h3>
                              <div className="space-y-4 mb-10">
                                  <div className="flex justify-between items-center text-sm font-bold">
                                      <span>{currentBase.name}</span>
                                      <span>R$ {currentBase.price.toFixed(2)}</span>
                                  </div>
                                  {selectedModules.map(id => (
                                      <div key={id} className="flex justify-between items-center text-[11px] text-slate-500 font-bold">
                                          <span>+ {AVAILABLE_MODULES.find(m => m.id === id)?.label}</span>
                                          <span>R$ {AVAILABLE_MODULES.find(m => m.id === id)?.price.toFixed(2)}</span>
                                      </div>
                                  ))}
                              </div>
                              <div className="border-t border-slate-100 pt-6 mb-8">
                                  <div className="text-4xl font-black">R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                  <div className="text-xs text-slate-400 font-bold">por mês</div>
                              </div>
                              <button onClick={onEnter} className="w-full py-4 bg-black text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                                  Ativar Agora <ArrowRight className="w-4 h-4"/>
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </section>

          {/* --- FOOTER --- */}
          <footer className="w-full border-t border-white/5 bg-[#020202] py-20 px-6">
              <div className="max-w-7xl mx-auto text-center">
                  <img src={displayLogo} alt="Shinkō" className="h-10 w-auto mx-auto mb-8 grayscale opacity-50" />
                  <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed mb-8">
                      O sistema operacional para construção de produtos de software de alta performance. Desenvolvido para transformar times em centros de receita.
                  </p>
                  <p className="text-slate-700 text-xs italic">© 2025 Shinkō Innovation Framework. Todos os direitos reservados.</p>
              </div>
          </footer>
      </main>
    </div>
  );
};
