import React from 'react';
import { ArrowRight, Sparkles, Shield, Rocket, CheckCircle, Star, Quote, ChevronRight, Play, BarChart3, Users, DollarSign, Code2, Workflow, Calendar, Zap, Layout, Layers, BrainCircuit, Activity, TrendingUp } from 'lucide-react';

interface Props {
  onEnter: () => void;
}

export const LandingPage: React.FC<Props> = ({ onEnter }) => {
  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 text-white overflow-y-auto scroll-smooth custom-scrollbar">
      {/* Dynamic Background */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px]"></div>
          <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]"></div>
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
          <div className="absolute inset-0" style={{backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.3}}></div>
      </div>

      {/* Header/Nav */}
      <nav className="relative z-50 w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center backdrop-blur-sm sticky top-0 bg-slate-950/50 border-b border-white/5">
          <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-black font-bold shadow-lg shadow-amber-500/20">S</div>
              <span className="font-bold text-xl tracking-tight">Shinkō OS</span>
          </div>
          <div className="flex gap-4">
             <button onClick={onEnter} className="hidden md:block text-sm font-bold text-slate-300 hover:text-white transition-colors">Funcionalidades</button>
             <button onClick={onEnter} className="hidden md:block text-sm font-bold text-slate-300 hover:text-white transition-colors">Cases</button>
             <button onClick={onEnter} className="px-5 py-2 bg-white text-black font-bold text-sm rounded-full hover:bg-slate-200 transition-colors">Login</button>
          </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center w-full">
          
          {/* HERO SECTION */}
          <section className="w-full max-w-6xl px-6 pt-24 pb-32 flex flex-col items-center text-center">
            <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest text-amber-400 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-700 shadow-glow">
                <Sparkles className="w-4 h-4"/> Engineering Innovation Framework
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-200 to-slate-500 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-100">
                Transforme Incerteza <br/> em <span className="text-amber-500">Resultado.</span>
            </h1>

            <p className="text-lg md:text-2xl text-slate-400 max-w-3xl mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
                O primeiro <strong>Sistema Operacional de Inovação</strong> que integra estratégia, engenharia, financeiro e IA em um único fluxo contínuo.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in zoom-in duration-500 delay-300">
                <button 
                    onClick={onEnter}
                    className="group relative px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold text-lg rounded-full flex items-center justify-center gap-3 transition-all shadow-[0_0_40px_-10px_rgba(245,158,11,0.5)] hover:shadow-[0_0_60px_-10px_rgba(245,158,11,0.7)] hover:scale-105"
                >
                    Acessar Plataforma
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/>
                </button>
                <button onClick={onEnter} className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-lg rounded-full flex items-center justify-center gap-3 transition-all backdrop-blur-md hover:scale-105">
                    <Play className="w-5 h-5 fill-white"/> Ver Demonstração
                </button>
            </div>
            
            {/* Dashboard Preview Mockup (Abstract) */}
            <div className="mt-20 w-full max-w-5xl aspect-[16/9] bg-slate-900 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500 group cursor-pointer" onClick={onEnter}>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/80 z-10"></div>
                <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="px-6 py-3 bg-amber-500 text-black font-bold rounded-full shadow-lg transform scale-110">Explorar Interface</span>
                </div>
                {/* Fake UI Elements */}
                <div className="p-6 grid grid-cols-4 gap-4 h-full opacity-50 group-hover:opacity-30 transition-opacity">
                    <div className="col-span-1 bg-slate-800 rounded-xl h-full"></div>
                    <div className="col-span-3 grid grid-rows-3 gap-4">
                        <div className="row-span-1 grid grid-cols-3 gap-4">
                             <div className="bg-slate-800 rounded-xl"></div>
                             <div className="bg-slate-800 rounded-xl"></div>
                             <div className="bg-slate-800 rounded-xl"></div>
                        </div>
                        <div className="row-span-2 bg-slate-800 rounded-xl"></div>
                    </div>
                </div>
            </div>
          </section>

          {/* FEATURE STRIP 1: STRATEGY */}
          <section className="w-full py-24 bg-slate-900/30 border-y border-white/5">
              <div className="max-w-7xl mx-auto px-6">
                  <div className="flex flex-col md:flex-row items-center gap-16">
                      <div className="flex-1 space-y-8">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-wider border border-blue-500/20">
                              <BrainCircuit className="w-4 h-4"/> Módulo Estratégico
                          </div>
                          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                              Decisões baseadas em <span className="text-blue-500">Algoritmos</span>, não em palpites.
                          </h2>
                          <p className="text-slate-400 text-lg leading-relaxed">
                              Pare de gastar recursos em ideias ruins. O Shinkō utiliza modelos matemáticos para classificar oportunidades.
                          </p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-colors">
                                  <BarChart3 className="w-8 h-8 text-blue-500 mb-3"/>
                                  <h3 className="font-bold text-white mb-1">Matriz RDE</h3>
                                  <p className="text-sm text-slate-400">Receita, Dor e Engenharia cruzados para priorização.</p>
                              </div>
                              <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-colors">
                                  <CheckCircle className="w-8 h-8 text-blue-500 mb-3"/>
                                  <h3 className="font-bold text-white mb-1">Validação TADS</h3>
                                  <p className="text-sm text-slate-400">Teste ácido de Tamanho, Acesso, Dor e Solução.</p>
                              </div>
                          </div>
                      </div>
                      <div className="flex-1 relative">
                          <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full"></div>
                          <div className="relative p-8 bg-slate-900 border border-white/10 rounded-3xl shadow-2xl">
                              {/* Visual representation of Matrix */}
                              <div className="aspect-square bg-slate-800/50 rounded-2xl border border-white/5 relative p-4 grid grid-cols-2 grid-rows-2 gap-2">
                                  <div className="bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20 text-red-500 font-bold text-xs uppercase">Descartar</div>
                                  <div className="bg-yellow-500/10 rounded-xl flex items-center justify-center border border-yellow-500/20 text-yellow-500 font-bold text-xs uppercase">Incubar</div>
                                  <div className="bg-orange-500/10 rounded-xl flex items-center justify-center border border-orange-500/20 text-orange-500 font-bold text-xs uppercase">MVP Rápido</div>
                                  <div className="bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20 text-emerald-500 font-bold text-xs uppercase">Escalar</div>
                                  
                                  {/* Dots */}
                                  <div className="absolute top-[30%] left-[70%] w-4 h-4 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50 animate-pulse"></div>
                                  <div className="absolute top-[60%] left-[20%] w-4 h-4 bg-red-500 rounded-full shadow-lg shadow-red-500/50"></div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </section>

          {/* FEATURE STRIP 2: ENGINEERING */}
          <section className="w-full py-24">
              <div className="max-w-7xl mx-auto px-6">
                  <div className="flex flex-col md:flex-row-reverse items-center gap-16">
                      <div className="flex-1 space-y-8">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-purple-500/10 text-purple-400 text-xs font-bold uppercase tracking-wider border border-purple-500/20">
                              <Code2 className="w-4 h-4"/> Engenharia & Execução
                          </div>
                          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                              Gestão de Projetos com precisão de <span className="text-purple-500">Relógio Suíço</span>.
                          </h2>
                          <p className="text-slate-400 text-lg leading-relaxed">
                              Do Kanban ao Gantt, com métricas avançadas de DORA para times de alta performance.
                          </p>
                          
                          <ul className="space-y-4">
                              <li className="flex items-center gap-4">
                                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500"><Layout className="w-5 h-5"/></div>
                                  <div>
                                      <strong className="block text-white">Kanban & Gantt Integrados</strong>
                                      <span className="text-sm text-slate-400">Visualização fluida entre tarefas e cronograma.</span>
                                  </div>
                              </li>
                              <li className="flex items-center gap-4">
                                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500"><Workflow className="w-5 h-5"/></div>
                                  <div>
                                      <strong className="block text-white">BPMS Designer</strong>
                                      <span className="text-sm text-slate-400">Desenhe fluxos e gere tarefas automaticamente.</span>
                                  </div>
                              </li>
                              <li className="flex items-center gap-4">
                                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500"><Activity className="w-5 h-5"/></div>
                                  <div>
                                      <strong className="block text-white">Métricas DORA</strong>
                                      <span className="text-sm text-slate-400">Monitore Lead Time, Deployment Frequency e MTTR.</span>
                                  </div>
                              </li>
                          </ul>
                      </div>
                      
                      <div className="flex-1 w-full">
                          <div className="grid grid-cols-2 gap-4">
                              <div className="p-6 bg-slate-900 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center hover:border-purple-500/50 transition-colors h-48">
                                  <Layout className="w-10 h-10 text-slate-500 mb-4"/>
                                  <h4 className="font-bold text-white">Kanban Board</h4>
                              </div>
                              <div className="p-6 bg-slate-900 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center hover:border-purple-500/50 transition-colors h-48 mt-8">
                                  <Calendar className="w-10 h-10 text-slate-500 mb-4"/>
                                  <h4 className="font-bold text-white">Cronograma Gantt</h4>
                              </div>
                              <div className="p-6 bg-slate-900 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center hover:border-purple-500/50 transition-colors h-48 -mt-8">
                                  <Activity className="w-10 h-10 text-slate-500 mb-4"/>
                                  <h4 className="font-bold text-white">Indicadores DORA</h4>
                              </div>
                              <div className="p-6 bg-slate-900 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center hover:border-purple-500/50 transition-colors h-48">
                                  <Workflow className="w-10 h-10 text-slate-500 mb-4"/>
                                  <h4 className="font-bold text-white">Modelagem BPMS</h4>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </section>

          {/* FEATURE STRIP 3: BUSINESS SUITE */}
          <section className="w-full py-24 bg-slate-900/30 border-y border-white/5">
              <div className="max-w-7xl mx-auto px-6">
                  <div className="flex flex-col md:flex-row items-center gap-16">
                      <div className="flex-1 space-y-8">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/20">
                              <DollarSign className="w-4 h-4"/> Business Suite
                          </div>
                          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                              Financeiro e Clientes sob <span className="text-emerald-500">Controle Total</span>.
                          </h2>
                          <p className="text-slate-400 text-lg leading-relaxed">
                              Uma visão 360º da saúde do seu negócio. Do contrato ao fluxo de caixa.
                          </p>
                          
                          <div className="grid grid-cols-1 gap-4">
                              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                                  <DollarSign className="w-6 h-6 text-emerald-500 mt-1"/>
                                  <div>
                                      <h3 className="font-bold text-white">Gestão de MRR & Churn</h3>
                                      <p className="text-sm text-slate-400">Acompanhe receita recorrente e retenção em tempo real.</p>
                                  </div>
                              </div>
                              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                                  <Users className="w-6 h-6 text-emerald-500 mt-1"/>
                                  <div>
                                      <h3 className="font-bold text-white">CRM & Portal do Cliente</h3>
                                      <p className="text-sm text-slate-400">Área exclusiva para seus clientes acompanharem projetos.</p>
                                  </div>
                              </div>
                              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                                  <BarChart3 className="w-6 h-6 text-emerald-500 mt-1"/>
                                  <div>
                                      <h3 className="font-bold text-white">Métricas de Produto</h3>
                                      <p className="text-sm text-slate-400">NPS, Engajamento (DAU/MAU) e Adoção de Features.</p>
                                  </div>
                              </div>
                          </div>
                      </div>
                      
                      <div className="flex-1">
                          <div className="relative p-1 bg-gradient-to-br from-emerald-500/50 to-slate-800 rounded-3xl">
                              <div className="bg-slate-950 rounded-[22px] p-6 shadow-2xl">
                                  <div className="flex justify-between items-center mb-8">
                                      <h3 className="text-lg font-bold">Resumo Financeiro</h3>
                                      <span className="text-xs bg-emerald-500/20 text-emerald-500 px-2 py-1 rounded">Tempo Real</span>
                                  </div>
                                  <div className="space-y-6">
                                      <div>
                                          <div className="text-slate-500 text-xs uppercase font-bold">Receita Recorrente (MRR)</div>
                                          <div className="text-4xl font-black text-white mt-1">R$ 142.500</div>
                                          <div className="text-emerald-500 text-xs font-bold mt-1 flex items-center gap-1">
                                              <TrendingUp className="w-3 h-3"/> +12.5% este mês
                                          </div>
                                      </div>
                                      <div className="h-px bg-white/10"></div>
                                      <div className="grid grid-cols-2 gap-4">
                                          <div>
                                              <div className="text-slate-500 text-xs uppercase font-bold">Clientes Ativos</div>
                                              <div className="text-2xl font-bold text-white">84</div>
                                          </div>
                                          <div>
                                              <div className="text-slate-500 text-xs uppercase font-bold">Ticket Médio</div>
                                              <div className="text-2xl font-bold text-white">R$ 1.6k</div>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </section>

          {/* FEATURE STRIP 4: AI & AUTOMATION */}
          <section className="w-full py-24 relative overflow-hidden">
              <div className="absolute inset-0 bg-amber-500/5"></div>
              <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider border border-amber-500/30 mb-6">
                      <Sparkles className="w-4 h-4"/> Shinkō AI
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black mb-6">
                      Seu copiloto de <span className="text-amber-500">Inteligência</span>.
                  </h2>
                  <p className="text-xl text-slate-400 mb-12">
                      Deixe a IA quebrar tarefas complexas, estimar prazos, otimizar sua agenda e analisar documentos técnicos.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                      <div className="p-6 rounded-2xl bg-slate-900 border border-white/10 hover:border-amber-500/50 transition-colors">
                          <Zap className="w-8 h-8 text-amber-500 mb-4"/>
                          <h4 className="font-bold text-white text-lg">Otimização de Agenda</h4>
                          <p className="text-sm text-slate-400 mt-2">A IA realoca tarefas automaticamente baseado na carga de trabalho do time.</p>
                      </div>
                      <div className="p-6 rounded-2xl bg-slate-900 border border-white/10 hover:border-amber-500/50 transition-colors">
                          <Layers className="w-8 h-8 text-amber-500 mb-4"/>
                          <h4 className="font-bold text-white text-lg">Geração de Checklists</h4>
                          <p className="text-sm text-slate-400 mt-2">Transforme títulos vagos em planos de ação técnicos detalhados.</p>
                      </div>
                      <div className="p-6 rounded-2xl bg-slate-900 border border-white/10 hover:border-amber-500/50 transition-colors">
                          <Shield className="w-8 h-8 text-amber-500 mb-4"/>
                          <h4 className="font-bold text-white text-lg">Análise de Risco</h4>
                          <p className="text-sm text-slate-400 mt-2">IA avalia viabilidade e riscos antes mesmo do projeto começar.</p>
                      </div>
                  </div>
              </div>
          </section>

          {/* TESTIMONIALS SECTION */}
          <section className="w-full py-24 px-6 border-t border-white/10 bg-slate-950">
              <div className="max-w-6xl mx-auto">
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
                          <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10 relative">
                              <Quote className="w-8 h-8 text-white/20 absolute top-6 right-6"/>
                              <div className="flex gap-1 text-amber-500 mb-4">
                                  {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-current"/>)}
                              </div>
                              <p className="text-slate-300 text-sm leading-relaxed mb-6">"{item.text}"</p>
                              <div>
                                  <div className="font-bold text-white">{item.name}</div>
                                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">{item.role}</div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </section>

          {/* FINAL CTA */}
          <section className="w-full py-24 border-t border-white/5 bg-gradient-to-b from-slate-900 to-black text-center px-6">
              <div className="max-w-2xl mx-auto">
                  <h2 className="text-4xl font-bold mb-6">Pronto para organizar a casa?</h2>
                  <p className="text-slate-400 mb-10 text-lg">Junte-se a empresas que tratam inovação com engenharia, não sorte.</p>
                  <button 
                    onClick={onEnter}
                    className="px-12 py-5 bg-white text-black font-bold text-lg rounded-full hover:scale-105 transition-transform shadow-2xl shadow-white/20"
                  >
                      Começar Agora
                  </button>
              </div>
          </section>

          <footer className="w-full border-t border-white/10 py-12 text-center text-slate-600 text-sm">
              <div className="flex justify-center gap-8 mb-8 font-bold text-slate-500">
                  <a href="#" className="hover:text-white transition-colors">Sobre</a>
                  <a href="#" className="hover:text-white transition-colors">Preços</a>
                  <a href="#" className="hover:text-white transition-colors">Docs</a>
                  <a href="#" className="hover:text-white transition-colors">Contato</a>
              </div>
              <p className="text-xs uppercase tracking-widest opacity-50">&copy; 2026 Shinkō Systems. Todos os direitos reservados.</p>
          </footer>
      </div>
    </div>
  );
};
