
import React, { useState } from 'react';
import { 
    ArrowRight, Sparkles, Shield, Rocket, CheckCircle, Star, Quote, 
    ChevronRight, Play, BarChart3, Users, DollarSign, Code2, 
    Workflow, Calendar, Zap, Layout, Layers, BrainCircuit, 
    Activity, TrendingUp, Lock, Check
} from 'lucide-react';

interface Props {
  onEnter: () => void;
}

export const LandingPage: React.FC<Props> = ({ onEnter }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
      {
          name: "Free",
          price: "0",
          desc: "Para entusiastas e validação inicial.",
          features: ["1 Usuário (Dono)", "Até 3 Projetos Ativos", "Kanban & Cronograma", "Metodologia Shinkō"],
          cta: "Começar Grátis",
          highlight: false
      },
      {
          name: "Consultant",
          price: "89,90",
          desc: "Para consultores autônomos.",
          features: ["2 Usuários", "Projetos Ilimitados", "Matriz RDE & Prio-6", "IA Generativa Básica"],
          cta: "Assinar Consultant",
          highlight: false
      },
      {
          name: "Studio",
          price: "297,00",
          desc: "Para pequenas equipes ágeis.",
          features: ["5 Usuários", "Módulo Financeiro & Contratos", "Portal do Cliente", "IA Leitura de Docs (OCR)", "Upload de Arquivos"],
          cta: "Assinar Studio",
          highlight: true,
          badge: "Mais Popular"
      },
      {
          name: "Scale",
          price: "799,00",
          desc: "Para empresas em crescimento.",
          features: ["15 Usuários", "Métricas de Engenharia (DORA)", "Métricas de Produto (NPS)", "IA Avançada", "Suporte Dedicado"],
          cta: "Assinar Scale",
          highlight: false
      },
      {
          name: "Agency",
          price: "1.500",
          desc: "Para grandes operações.",
          features: ["Whitelabel (Sua Marca)", "Usuários Ilimitados*", "Gestão Multi-Workspace", "API Access", "Onboarding Personalizado"],
          cta: "Falar com Vendas",
          highlight: false
      }
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 text-white overflow-y-auto scroll-smooth custom-scrollbar selection:bg-amber-500 selection:text-black">
      
      {/* --- BACKGROUND EFFECTS --- */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px]"></div>
          <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]"></div>
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
          <div className="absolute inset-0" style={{backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)', backgroundSize: '50px 50px', maskImage: 'linear-gradient(to bottom, transparent, black, transparent)'}}></div>
      </div>

      {/* --- NAVIGATION --- */}
      <nav className="relative z-50 w-full px-6 py-6 flex justify-between items-center backdrop-blur-md sticky top-0 bg-slate-950/70 border-b border-white/5">
          <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
                <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-black font-bold shadow-lg shadow-amber-500/20">S</div>
                <span className="font-bold text-xl tracking-tight">Shinkō OS</span>
            </div>
            <div className="flex items-center gap-6">
                <div className="hidden md:flex gap-6 text-sm font-medium text-slate-400">
                    <a href="#features" className="hover:text-white transition-colors">Funcionalidades</a>
                    <a href="#pricing" className="hover:text-white transition-colors">Preços</a>
                    <a href="#testimonials" className="hover:text-white transition-colors">Cases</a>
                </div>
                <button onClick={onEnter} className="px-5 py-2 bg-white text-black font-bold text-sm rounded-full hover:bg-slate-200 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                    Entrar
                </button>
            </div>
          </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <div className="relative z-10 flex flex-col items-center w-full">
          <section className="w-full max-w-7xl px-6 pt-20 pb-32 flex flex-col items-center text-center relative">
            
            {/* Badge */}
            <div className="mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/50 border border-slate-700 text-[11px] font-bold uppercase tracking-widest text-amber-400 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-700 shadow-glow cursor-default hover:bg-slate-800 transition-colors">
                <Sparkles className="w-3 h-3"/> Engineering Innovation Framework 2.5
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 tracking-tight leading-[1.1] bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-200 to-slate-500 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100 max-w-5xl">
                Transforme Incerteza <br/> em <span className="text-amber-500 relative inline-block">
                    Resultado
                    <svg className="absolute w-full h-3 -bottom-1 left-0 text-amber-500 opacity-60" viewBox="0 0 100 10" preserveAspectRatio="none">
                        <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                    </svg>
                </span>.
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                O primeiro <strong>Sistema Operacional de Inovação</strong> que integra estratégia, engenharia, financeiro e IA em um único fluxo contínuo e previsível.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in zoom-in duration-500 delay-300">
                <button 
                    onClick={onEnter}
                    className="group relative px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold text-lg rounded-full flex items-center justify-center gap-3 transition-all shadow-[0_0_40px_-10px_rgba(245,158,11,0.5)] hover:shadow-[0_0_60px_-10px_rgba(245,158,11,0.7)] hover:-translate-y-1"
                >
                    Começar Agora
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/>
                </button>
                <button onClick={onEnter} className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-lg rounded-full flex items-center justify-center gap-3 transition-all backdrop-blur-md hover:-translate-y-1">
                    <Play className="w-5 h-5 fill-white"/> Ver Demonstração
                </button>
            </div>
            
            {/* Dashboard Mockup (Abstract CSS Art) */}
            <div className="mt-24 w-full max-w-6xl aspect-[16/10] bg-slate-900 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500 group">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10 pointer-events-none"></div>
                
                {/* Navbar Mock */}
                <div className="h-16 border-b border-white/5 flex items-center px-6 gap-4">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                        <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
                    </div>
                    <div className="h-2 w-32 bg-slate-800 rounded-full ml-4"></div>
                </div>

                {/* Body Mock */}
                <div className="p-8 grid grid-cols-12 gap-6 h-full">
                    {/* Sidebar */}
                    <div className="col-span-2 hidden md:block space-y-4">
                        <div className="h-8 w-full bg-slate-800/50 rounded-lg"></div>
                        <div className="h-4 w-2/3 bg-slate-800/30 rounded-lg"></div>
                        <div className="h-4 w-3/4 bg-slate-800/30 rounded-lg"></div>
                        <div className="h-4 w-1/2 bg-slate-800/30 rounded-lg"></div>
                    </div>
                    
                    {/* Main */}
                    <div className="col-span-12 md:col-span-10 grid grid-rows-6 gap-6">
                        {/* Stats Row */}
                        <div className="row-span-1 grid grid-cols-4 gap-6">
                            {[1,2,3,4].map(i => (
                                <div key={i} className="bg-slate-800/40 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                                    <div className="w-8 h-8 rounded bg-slate-700/50 mb-2"></div>
                                    <div className="w-16 h-4 bg-slate-700/50 rounded"></div>
                                </div>
                            ))}
                        </div>
                        {/* Big Chart Area */}
                        <div className="row-span-3 grid grid-cols-3 gap-6">
                            <div className="col-span-2 bg-slate-800/40 border border-white/5 rounded-xl p-6 relative overflow-hidden">
                                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-emerald-500/10 to-transparent"></div>
                                <svg className="absolute bottom-6 left-6 right-6 h-24 overflow-visible" preserveAspectRatio="none">
                                    <path d="M0 100 Q 150 20 300 60 T 600 10" fill="none" stroke="#10b981" strokeWidth="3" />
                                </svg>
                            </div>
                            <div className="col-span-1 bg-slate-800/40 border border-white/5 rounded-xl p-4 space-y-3">
                                {[1,2,3,4,5].map(i => <div key={i} className="h-8 w-full bg-slate-700/30 rounded"></div>)}
                            </div>
                        </div>
                        {/* Kanban */}
                        <div className="row-span-2 grid grid-cols-3 gap-6">
                             <div className="bg-slate-800/20 border border-white/5 rounded-xl p-3 space-y-2">
                                 <div className="h-20 w-full bg-slate-700/30 rounded border-l-2 border-blue-500"></div>
                                 <div className="h-20 w-full bg-slate-700/30 rounded border-l-2 border-blue-500"></div>
                             </div>
                             <div className="bg-slate-800/20 border border-white/5 rounded-xl p-3 space-y-2">
                                 <div className="h-24 w-full bg-slate-700/30 rounded border-l-2 border-purple-500"></div>
                             </div>
                             <div className="bg-slate-800/20 border border-white/5 rounded-xl p-3 space-y-2">
                                 <div className="h-16 w-full bg-slate-700/30 rounded border-l-2 border-emerald-500"></div>
                                 <div className="h-16 w-full bg-slate-700/30 rounded border-l-2 border-emerald-500"></div>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Overlay Action */}
                <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
                    <button onClick={onEnter} className="px-8 py-4 bg-amber-500 text-black font-bold rounded-full shadow-2xl transform scale-110 hover:scale-125 transition-transform flex items-center gap-2">
                        <Layout className="w-5 h-5"/> Explorar Interface Real
                    </button>
                </div>
            </div>
          </section>

          {/* --- SOCIAL PROOF --- */}
          <section className="w-full border-y border-white/5 bg-slate-900/50 py-10 overflow-hidden">
              <div className="max-w-7xl mx-auto px-6 text-center">
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-8">Empresas que escalaram com Shinkō</p>
                  <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                      {/* Fake Logos using Text/Icons for demo */}
                      <div className="flex items-center gap-2 text-xl font-black text-white"><Zap className="w-6 h-6"/> StarkInd</div>
                      <div className="flex items-center gap-2 text-xl font-black text-white"><Layers className="w-6 h-6"/> WayneCorp</div>
                      <div className="flex items-center gap-2 text-xl font-black text-white"><Activity className="w-6 h-6"/> Massive</div>
                      <div className="flex items-center gap-2 text-xl font-black text-white"><BrainCircuit className="w-6 h-6"/> CyberDy</div>
                      <div className="flex items-center gap-2 text-xl font-black text-white"><Rocket className="w-6 h-6"/> Acellera</div>
                  </div>
              </div>
          </section>

          {/* --- STRATEGY SECTION --- */}
          <section id="features" className="w-full py-32 relative">
              <div className="max-w-7xl mx-auto px-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                      <div className="space-y-8">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-wider border border-blue-500/20">
                              <BrainCircuit className="w-4 h-4"/> Módulo Estratégico
                          </div>
                          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                              Decisões baseadas em <span className="text-blue-500">Algoritmos</span>, não em palpites.
                          </h2>
                          <p className="text-slate-400 text-lg leading-relaxed">
                              Pare de gastar recursos em ideias ruins. O Shinkō utiliza modelos matemáticos (Matriz RDE e Score Prio-6) para classificar oportunidades com frieza.
                          </p>
                          
                          <div className="space-y-6">
                              <div className="flex gap-4">
                                  <div className="mt-1 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 h-fit">
                                      <BarChart3 className="w-6 h-6"/>
                                  </div>
                                  <div>
                                      <h3 className="text-xl font-bold text-white">Matriz RDE</h3>
                                      <p className="text-slate-400 mt-1">Cruzamento automático de Receita, Dor e Engenharia para identificar o que atacar agora.</p>
                                  </div>
                              </div>
                              <div className="flex gap-4">
                                  <div className="mt-1 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 h-fit">
                                      <CheckCircle className="w-6 h-6"/>
                                  </div>
                                  <div>
                                      <h3 className="text-xl font-bold text-white">Validação TADS</h3>
                                      <p className="text-slate-400 mt-1">Teste ácido de Tamanho, Acesso, Dor e Solução. Se não passar, nem entra no backlog.</p>
                                  </div>
                              </div>
                          </div>
                      </div>
                      
                      {/* Visual Component */}
                      <div className="relative group">
                          <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full group-hover:bg-blue-500/30 transition-colors duration-1000"></div>
                          <div className="relative bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl transform rotate-1 group-hover:rotate-0 transition-transform duration-500">
                              <div className="flex justify-between items-center mb-6">
                                  <h4 className="font-bold text-slate-300">Matriz de Decisão</h4>
                                  <div className="flex gap-2">
                                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                  </div>
                              </div>
                              <div className="aspect-square bg-slate-800/50 rounded-2xl border border-white/5 relative grid grid-cols-2 grid-rows-2 gap-1 p-1">
                                  <div className="bg-red-500/5 border border-red-500/10 rounded-lg flex items-center justify-center text-red-700 font-bold text-xs uppercase tracking-widest hover:bg-red-500/20 transition-colors">Descartar</div>
                                  <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg flex items-center justify-center text-yellow-600 font-bold text-xs uppercase tracking-widest hover:bg-yellow-500/20 transition-colors">Estratégico</div>
                                  <div className="bg-orange-500/5 border border-orange-500/10 rounded-lg flex items-center justify-center text-orange-600 font-bold text-xs uppercase tracking-widest hover:bg-orange-500/20 transition-colors">MVP Rápido</div>
                                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center flex-col hover:bg-emerald-500/30 transition-colors relative overflow-hidden">
                                      <span className="text-emerald-500 font-bold text-sm uppercase tracking-widest z-10">Atacar</span>
                                      <div className="absolute inset-0 bg-emerald-500/10 animate-pulse"></div>
                                  </div>
                                  
                                  {/* Animated Dot */}
                                  <div className="absolute top-[25%] left-[75%] w-6 h-6 bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.6)] border-2 border-white z-20 animate-bounce">
                                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap border border-white/10">Projeto Alpha</div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </section>

          {/* --- ENGINEERING SECTION --- */}
          <section className="w-full py-32 bg-slate-900/30 border-y border-white/5">
              <div className="max-w-7xl mx-auto px-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                      {/* Left: Visual Grid */}
                      <div className="order-2 lg:order-1 grid grid-cols-2 gap-4">
                          <div className="p-6 bg-slate-900 border border-white/10 rounded-3xl flex flex-col items-center justify-center text-center hover:border-purple-500/50 transition-all hover:-translate-y-1 h-48 shadow-lg">
                              <Layout className="w-10 h-10 text-slate-500 mb-4"/>
                              <h4 className="font-bold text-white text-lg">Kanban Board</h4>
                              <p className="text-xs text-slate-500 mt-2">Fluxo contínuo</p>
                          </div>
                          <div className="p-6 bg-slate-900 border border-white/10 rounded-3xl flex flex-col items-center justify-center text-center hover:border-purple-500/50 transition-all hover:-translate-y-1 h-48 mt-8 shadow-lg">
                              <Calendar className="w-10 h-10 text-slate-500 mb-4"/>
                              <h4 className="font-bold text-white text-lg">Gantt Chart</h4>
                              <p className="text-xs text-slate-500 mt-2">Visão temporal</p>
                          </div>
                          <div className="p-6 bg-slate-900 border border-white/10 rounded-3xl flex flex-col items-center justify-center text-center hover:border-purple-500/50 transition-all hover:-translate-y-1 h-48 -mt-8 shadow-lg">
                              <Activity className="w-10 h-10 text-slate-500 mb-4"/>
                              <h4 className="font-bold text-white text-lg">DORA Metrics</h4>
                              <p className="text-xs text-slate-500 mt-2">Lead Time & Bugs</p>
                          </div>
                          <div className="p-6 bg-slate-900 border border-white/10 rounded-3xl flex flex-col items-center justify-center text-center hover:border-purple-500/50 transition-all hover:-translate-y-1 h-48 shadow-lg">
                              <Workflow className="w-10 h-10 text-slate-500 mb-4"/>
                              <h4 className="font-bold text-white text-lg">BPMS Designer</h4>
                              <p className="text-xs text-slate-500 mt-2">Processos visuais</p>
                          </div>
                      </div>

                      {/* Right: Content */}
                      <div className="order-1 lg:order-2 space-y-8">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-purple-500/10 text-purple-400 text-xs font-bold uppercase tracking-wider border border-purple-500/20">
                              <Code2 className="w-4 h-4"/> Engenharia & Execução
                          </div>
                          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                              Gestão de Projetos com precisão de <span className="text-purple-500">Relógio Suíço</span>.
                          </h2>
                          <p className="text-slate-400 text-lg leading-relaxed">
                              Do Kanban ao Gantt, com métricas avançadas de DORA para times de alta performance. Saiba exatamente onde está o gargalo.
                          </p>
                          
                          <div className="pl-6 border-l-2 border-purple-500/30 space-y-6">
                              <div>
                                  <strong className="block text-white text-lg mb-1">Integração Total</strong>
                                  <p className="text-slate-400">Uma tarefa criada no Kanban reflete instantaneamente no Cronograma e nas métricas de Lead Time.</p>
                              </div>
                              <div>
                                  <strong className="block text-white text-lg mb-1">Métricas Reais</strong>
                                  <p className="text-slate-400">Acompanhe Deployment Frequency e Change Failure Rate em tempo real.</p>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </section>

          {/* --- FINANCE/BUSINESS SECTION --- */}
          <section className="w-full py-32 relative">
              <div className="max-w-7xl mx-auto px-6">
                  <div className="flex flex-col md:flex-row items-center gap-20">
                      <div className="flex-1 space-y-8">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/20">
                              <DollarSign className="w-4 h-4"/> Business Suite
                          </div>
                          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                              Financeiro e Clientes sob <span className="text-emerald-500">Controle Total</span>.
                          </h2>
                          <p className="text-slate-400 text-lg leading-relaxed">
                              Uma visão 360º da saúde do seu negócio. Do contrato ao fluxo de caixa, do MRR ao Churn.
                          </p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {[
                                  { icon: DollarSign, title: "Gestão de MRR", desc: "Receita recorrente em tempo real." },
                                  { icon: Users, title: "Portal do Cliente", desc: "Área exclusiva para clientes." },
                                  { icon: TrendingUp, title: "Fluxo de Caixa", desc: "Entradas e saídas categorizadas." },
                                  { icon: BarChart3, title: "Product Analytics", desc: "NPS, DAU/MAU e Engajamento." }
                              ].map((item, i) => (
                                  <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-colors">
                                      <item.icon className="w-6 h-6 text-emerald-500 mb-2"/>
                                      <h3 className="font-bold text-white">{item.title}</h3>
                                      <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                                  </div>
                              ))}
                          </div>
                      </div>
                      
                      <div className="flex-1 w-full">
                          <div className="relative p-1 bg-gradient-to-br from-emerald-500 to-slate-800 rounded-3xl shadow-2xl transform hover:scale-[1.02] transition-transform duration-500">
                              <div className="bg-slate-950 rounded-[22px] p-8">
                                  <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                                      <h3 className="text-xl font-bold">Resumo Financeiro</h3>
                                      <span className="text-xs bg-emerald-500/20 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20 font-bold uppercase">Tempo Real</span>
                                  </div>
                                  <div className="space-y-8">
                                      <div>
                                          <div className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-2">Receita Recorrente (MRR)</div>
                                          <div className="text-5xl font-black text-white">R$ 142.500</div>
                                          <div className="text-emerald-500 text-sm font-bold mt-2 flex items-center gap-1">
                                              <TrendingUp className="w-4 h-4"/> +12.5% este mês
                                          </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                          <div className="bg-slate-900 p-4 rounded-xl border border-white/5">
                                              <div className="text-slate-500 text-xs uppercase font-bold mb-1">Clientes Ativos</div>
                                              <div className="text-3xl font-bold text-white">84</div>
                                          </div>
                                          <div className="bg-slate-900 p-4 rounded-xl border border-white/5">
                                              <div className="text-slate-500 text-xs uppercase font-bold mb-1">Ticket Médio</div>
                                              <div className="text-3xl font-bold text-white">R$ 1.6k</div>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </section>

          {/* --- AI SECTION --- */}
          <section className="w-full py-24 relative overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900">
              <div className="absolute inset-0 bg-amber-500/5"></div>
              <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider border border-amber-500/30 mb-6">
                      <Sparkles className="w-4 h-4"/> Shinkō AI
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black mb-6">
                      Seu copiloto de <span className="text-amber-500">Inteligência</span>.
                  </h2>
                  <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
                      A IA não é apenas um chat. Ela opera o sistema: quebra tarefas, estima prazos, otimiza sua agenda e lê contratos.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                      <div className="p-8 rounded-3xl bg-slate-900 border border-white/10 hover:border-amber-500/50 transition-colors shadow-xl">
                          <Zap className="w-10 h-10 text-amber-500 mb-6"/>
                          <h4 className="font-bold text-white text-xl">Otimização de Agenda</h4>
                          <p className="text-sm text-slate-400 mt-3 leading-relaxed">A IA analisa a carga de trabalho de cada membro e realoca tarefas automaticamente para evitar gargalos.</p>
                      </div>
                      <div className="p-8 rounded-3xl bg-slate-900 border border-white/10 hover:border-amber-500/50 transition-colors shadow-xl">
                          <Layers className="w-10 h-10 text-amber-500 mb-6"/>
                          <h4 className="font-bold text-white text-xl">Gerador de Escopo</h4>
                          <p className="text-sm text-slate-400 mt-3 leading-relaxed">Transforme um título vago ("Criar App") em um checklist técnico detalhado com horas estimadas.</p>
                      </div>
                      <div className="p-8 rounded-3xl bg-slate-900 border border-white/10 hover:border-amber-500/50 transition-colors shadow-xl">
                          <Shield className="w-10 h-10 text-amber-500 mb-6"/>
                          <h4 className="font-bold text-white text-xl">Análise de Risco</h4>
                          <p className="text-sm text-slate-400 mt-3 leading-relaxed">Antes de iniciar, a IA avalia a viabilidade e os riscos potenciais do projeto com base no histórico.</p>
                      </div>
                  </div>
              </div>
          </section>

          {/* --- PRICING SECTION --- */}
          <section id="pricing" className="w-full py-32 bg-slate-950 border-t border-white/5 relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[500px] bg-amber-500/5 blur-[100px] pointer-events-none"></div>
              
              <div className="max-w-7xl mx-auto px-6 relative z-10">
                  <div className="text-center mb-16">
                      <h2 className="text-4xl md:text-5xl font-black mb-6">Planos Transparentes</h2>
                      <p className="text-lg text-slate-400 mb-8">Comece pequeno, escale rápido. Cancele quando quiser.</p>
                      
                      {/* Toggle */}
                      <div className="inline-flex bg-white/5 p-1 rounded-xl border border-white/10 relative">
                          <button 
                            onClick={() => setBillingCycle('monthly')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all relative z-10 ${billingCycle === 'monthly' ? 'text-black' : 'text-slate-400 hover:text-white'}`}
                          >
                              Mensal
                          </button>
                          <button 
                            onClick={() => setBillingCycle('yearly')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all relative z-10 ${billingCycle === 'yearly' ? 'text-black' : 'text-slate-400 hover:text-white'}`}
                          >
                              Anual <span className="text-[10px] text-emerald-600 bg-emerald-100 px-1 rounded ml-1">-20%</span>
                          </button>
                          <div className={`absolute top-1 bottom-1 w-[50%] bg-white rounded-lg transition-transform duration-300 ${billingCycle === 'monthly' ? 'left-1' : 'translate-x-[96%]'}`}></div>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
                      {plans.map((plan, i) => (
                          <div 
                            key={i} 
                            className={`relative p-6 rounded-2xl border transition-all duration-300 flex flex-col h-full ${
                                plan.highlight 
                                ? 'bg-slate-900 border-amber-500 shadow-[0_0_30px_-5px_rgba(245,158,11,0.3)] transform scale-105 z-10' 
                                : 'bg-slate-900/50 border-white/10 hover:border-white/20'
                            }`}
                          >
                              {plan.badge && (
                                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase shadow-lg whitespace-nowrap">
                                      {plan.badge}
                                  </div>
                              )}
                              
                              <div className="mb-6">
                                  <h3 className={`font-bold text-lg ${plan.highlight ? 'text-amber-500' : 'text-white'}`}>{plan.name}</h3>
                                  <div className="flex items-baseline gap-1 mt-2">
                                      <span className="text-sm align-top text-slate-400">R$</span>
                                      <span className="text-3xl font-black text-white">{plan.price}</span>
                                      <span className="text-xs text-slate-500">/mês</span>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-2 min-h-[32px]">{plan.desc}</p>
                              </div>

                              <ul className="space-y-3 mb-8 flex-1">
                                  {plan.features.map((feat, idx) => (
                                      <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                                          <Check className={`w-3 h-3 mt-0.5 shrink-0 ${plan.highlight ? 'text-amber-500' : 'text-slate-500'}`}/>
                                          <span className="leading-snug">{feat}</span>
                                      </li>
                                  ))}
                              </ul>

                              <button 
                                onClick={onEnter}
                                className={`w-full py-3 rounded-xl text-xs font-bold transition-transform active:scale-95 ${
                                    plan.highlight 
                                    ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-lg' 
                                    : 'bg-white/10 text-white hover:bg-white/20'
                                }`}
                              >
                                  {plan.cta}
                              </button>
                          </div>
                      ))}
                  </div>
              </div>
          </section>

          {/* --- TESTIMONIALS --- */}
          <section id="testimonials" className="w-full py-24 bg-slate-900/30 border-t border-white/5">
              <div className="max-w-6xl mx-auto px-6">
                  <div className="text-center mb-16">
                      <h2 className="text-3xl font-bold mb-4">O que dizem os Líderes</h2>
                      <p className="text-slate-400">Empresas que transformaram caos em processo.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[
                          { name: "Carlos M.", role: "CTO, TechFlow", text: "A precisão da Matriz RDE mudou como priorizamos features. Finalmente paramos de discutir opiniões e focamos em dados." },
                          { name: "Fernanda L.", role: "Product Manager", text: "O Shinkō OS trouxe a governança que faltava para escalar nosso time de 5 para 50 pessoas sem perder o controle." },
                          { name: "Ricardo S.", role: "Fundador, ArqStudio", text: "Adaptamos para nosso escritório de arquitetura e o portal do cliente reduziu em 80% os emails de cobrança." }
                      ].map((item, i) => (
                          <div key={i} className="p-8 rounded-3xl bg-slate-800/50 border border-white/5 relative hover:bg-slate-800 transition-colors">
                              <Quote className="w-8 h-8 text-white/10 absolute top-6 right-6"/>
                              <div className="flex gap-1 text-amber-500 mb-4">
                                  {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-current"/>)}
                              </div>
                              <p className="text-slate-300 text-sm leading-relaxed mb-6 italic">"{item.text}"</p>
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center font-bold text-white text-xs">
                                      {item.name.charAt(0)}
                                  </div>
                                  <div>
                                      <div className="font-bold text-white text-sm">{item.name}</div>
                                      <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">{item.role}</div>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </section>

          {/* --- FINAL CTA --- */}
          <section className="w-full py-32 border-t border-white/5 bg-gradient-to-b from-slate-900 to-black text-center px-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
              <div className="max-w-2xl mx-auto relative z-10">
                  <h2 className="text-4xl md:text-5xl font-black mb-8 leading-tight">Pronto para organizar a casa?</h2>
                  <p className="text-slate-400 mb-12 text-xl">Junte-se a empresas que tratam inovação com engenharia, não sorte. Crie sua conta gratuita em segundos.</p>
                  <button 
                    onClick={onEnter}
                    className="px-12 py-5 bg-white text-black font-bold text-lg rounded-full hover:scale-105 transition-transform shadow-[0_0_50px_rgba(255,255,255,0.2)]"
                  >
                      Criar Conta Grátis
                  </button>
                  <p className="mt-6 text-xs text-slate-500">Sem cartão de crédito necessário para o plano Free.</p>
              </div>
          </section>

          <footer className="w-full border-t border-white/10 py-12 text-center text-slate-600 text-sm bg-black">
              <div className="flex flex-wrap justify-center gap-8 mb-8 font-bold text-slate-500">
                  <a href="#" className="hover:text-white transition-colors">Sobre</a>
                  <a href="#" className="hover:text-white transition-colors">Preços</a>
                  <a href="#" className="hover:text-white transition-colors">Docs</a>
                  <a href="#" className="hover:text-white transition-colors">Contato</a>
                  <a href="#" className="hover:text-white transition-colors">Termos</a>
              </div>
              <div className="flex justify-center gap-4 mb-8">
                  {/* Social Icons Placeholder */}
                  <div className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"></div>
                  <div className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"></div>
                  <div className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"></div>
              </div>
              <p className="text-xs uppercase tracking-widest opacity-50">&copy; 2026 Shinkō Systems. Todos os direitos reservados.</p>
          </footer>
      </div>
    </div>
  );
};
