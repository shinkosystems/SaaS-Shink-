
import React, { useState, useMemo, useEffect } from 'react';
import { 
    ArrowRight, Sparkles, CheckCircle, Play, 
    DollarSign, Workflow, BrainCircuit, Target,
    ChevronDown, Minus, Plus, X, Calculator, Users, Zap, LayoutGrid, Shield, Globe, Activity, Layers, CreditCard, Check, Sun, Moon
} from 'lucide-react';
import { CasesGallery } from './CasesGallery';

interface Props {
  onEnter: () => void;
  customName?: string;
  customLogo?: string | null;
  customColor?: string;
}

const LOGO_HORIZONTAL = "https://zjssfnbcboibqeoubeou.supabase.co/storage/v1/object/public/fotoperfil/fotoperfil/1%20(1).png";

export const LandingPage: React.FC<Props> = ({ onEnter, customName, customLogo, customColor }) => {
  const [showCases, setShowCases] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isDark, setIsDark] = useState(true);

  // --- CALCULATOR STATE ---
  const [numUsers, setNumUsers] = useState(5);
  const [selectedModules, setSelectedModules] = useState<string[]>(['projects']);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Fallback defaults
  const brandName = customName || "Shinkō OS";
  const primaryColor = customColor || "#F59E0B";

  useEffect(() => {
      // Check initial theme
      const html = document.documentElement;
      setIsDark(html.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
      const html = document.documentElement;
      if (html.classList.contains('dark')) {
          html.classList.remove('dark');
          setIsDark(false);
          localStorage.setItem('shinko-theme', 'light');
      } else {
          html.classList.add('dark');
          setIsDark(true);
          localStorage.setItem('shinko-theme', 'dark');
      }
  };

  const modulesConfig = [
      { id: 'projects', name: 'Gestão de Projetos', price: 0, required: true, desc: 'Kanban, Cronograma e Tarefas.' },
      { id: 'financial', name: 'Módulo Financeiro', price: 129, required: false, desc: 'Fluxo de caixa, Boletos e Pix.' },
      { id: 'crm', name: 'CRM de Vendas', price: 99, required: false, desc: 'Pipeline de oportunidades e contatos.' },
      { id: 'ia', name: 'Shinkō AI (Guru)', price: 199, required: false, desc: 'Geração de escopo e análise preditiva.' },
      { id: 'metrics', name: 'Engenharia (DORA)', price: 149, required: false, desc: 'Métricas de performance de time.' },
      { id: 'whitelabel', name: 'White Label', price: 299, required: false, desc: 'Sua marca, cores e domínio.' }
  ];

  const pricePerUser = numUsers === 1 ? 89.90 : 59.90;

  const calculatedPrice = useMemo(() => {
      const basePrice = 49.90; // Preço base por usuário
      const usersCost = numUsers * pricePerUser;
      
      const modulesCost = modulesConfig.reduce((acc, mod) => {
          return selectedModules.includes(mod.id) ? acc + mod.price : acc;
      }, 0);

      let total = usersCost + modulesCost;

      if (billingCycle === 'yearly') {
          total = total * 0.8; // 20% desconto
      }

      return total;
  }, [numUsers, selectedModules, billingCycle, pricePerUser]);

  const toggleModule = (id: string) => {
      if (id === 'projects') return; // Cannot toggle required
      setSelectedModules(prev => 
          prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
      );
  };

  const faqs = [
      { q: "O Shinkō substitui o Jira?", a: "Sim. Para 95% das empresas, o Jira é complexo demais. O Shinkō oferece a robustez necessária para engenharia com a simplicidade que o negócio precisa." },
      { q: "Como funciona a IA?", a: "Nossa IA (Gemini 2.5) analisa a descrição do seu projeto e gera automaticamente estruturas de tarefas, sugere prazos e identifica riscos baseados no seu setor." },
      { q: "Posso usar minha marca (Whitelabel)?", a: "Sim! No módulo White Label, você pode alterar o logotipo, cores e até o domínio para oferecer uma experiência 100% personalizada aos seus clientes." },
      { q: "O financeiro emite nota fiscal?", a: "Atualmente controlamos fluxo de caixa e emissão de cobranças (Boletos/Pix). A emissão de NF está no roadmap para Q4/2026." }
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white overflow-y-auto scroll-smooth custom-scrollbar selection:bg-amber-500 selection:text-black transition-colors duration-500">
      
      {showCases && <CasesGallery onClose={() => setShowCases(false)} />}

      {/* --- BACKGROUND EFFECTS --- */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-purple-600/10 dark:bg-purple-600/10 rounded-full blur-[120px] animate-pulse mix-blend-multiply dark:mix-blend-normal"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-normal"></div>
          <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-normal"></div>
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
          <div className="absolute inset-0" style={{backgroundImage: 'linear-gradient(rgba(100, 100, 100, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(100, 100, 100, 0.05) 1px, transparent 1px)', backgroundSize: '50px 50px', maskImage: 'linear-gradient(to bottom, transparent, black, transparent)'}}></div>
      </div>

      {/* --- NAVIGATION --- */}
      <nav className="relative z-50 w-full px-6 py-6 flex justify-between items-center backdrop-blur-md sticky top-0 bg-white/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-white/5 transition-all">
          <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
                {customLogo ? (
                    <img src={customLogo} alt={brandName} className="h-10 md:h-12 w-auto object-contain" />
                ) : (
                    <img src={LOGO_HORIZONTAL} alt={brandName} className="h-10 md:h-12 w-auto object-contain" />
                )}
            </div>
            <div className="flex items-center gap-4 md:gap-8">
                <div className="hidden md:flex gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
                    <a href="#features" className="hover:text-black dark:hover:text-white transition-colors">Solução</a>
                    <a href="#pricing" className="hover:text-black dark:hover:text-white transition-colors">Preços</a>
                    <button onClick={() => setShowCases(true)} className="hover:text-black dark:hover:text-white transition-colors">Cases</button>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={toggleTheme}
                        className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                        {isDark ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}
                    </button>
                    <button onClick={onEnter} className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-black font-bold text-sm rounded-full hover:bg-slate-800 dark:hover:bg-slate-200 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                        Entrar
                    </button>
                </div>
            </div>
          </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <div className="relative z-10 flex flex-col items-center w-full">
          <section className="w-full max-w-7xl px-6 pt-24 pb-32 flex flex-col items-center text-center relative">
            
            {/* Badge */}
            <div className="mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-widest backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-700 shadow-sm cursor-default hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors" style={{ color: primaryColor, borderColor: `${primaryColor}30` }}>
                <Sparkles className="w-3 h-3"/> Engineering Innovation Framework 2.5
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 tracking-tight leading-[1.1] bg-clip-text text-transparent bg-gradient-to-b from-slate-900 via-slate-700 to-slate-500 dark:from-white dark:via-slate-200 dark:to-slate-500 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100 max-w-5xl">
                Transforme Incerteza <br/> em <span className="relative inline-block" style={{ color: primaryColor }}>
                    Resultado
                    <svg className="absolute w-full h-3 -bottom-1 left-0 opacity-60" viewBox="0 0 100 10" preserveAspectRatio="none" style={{ color: primaryColor }}>
                        <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                    </svg>
                </span>.
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                O primeiro <strong>Sistema Operacional de Inovação</strong> que integra estratégia, engenharia, financeiro e IA em um único fluxo contínuo e previsível.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in zoom-in duration-500 delay-300">
                <button 
                    onClick={onEnter}
                    className="group relative px-8 py-4 font-bold text-lg rounded-full flex items-center justify-center gap-3 transition-all hover:-translate-y-1"
                    style={{ backgroundColor: primaryColor, color: '#000', boxShadow: `0 0 40px -10px ${primaryColor}80` }}
                >
                    Começar Agora
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/>
                </button>
                <button onClick={onEnter} className="px-8 py-4 bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold text-lg rounded-full flex items-center justify-center gap-3 transition-all backdrop-blur-md hover:-translate-y-1 shadow-sm">
                    <Play className="w-5 h-5 fill-slate-900 dark:fill-white"/> Ver Demonstração
                </button>
            </div>
            
            {/* Dashboard Mockup (Abstract CSS Art) */}
            <div className="mt-24 w-full max-w-6xl aspect-[16/10] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500 group">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent dark:from-slate-950 dark:via-transparent dark:to-transparent z-10 pointer-events-none"></div>
                
                {/* Navbar Mock */}
                <div className="h-16 border-b border-slate-200 dark:border-white/5 flex items-center px-6 gap-4 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                        <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
                    </div>
                    <div className="h-2 w-32 bg-slate-200 dark:bg-slate-800 rounded-full ml-4"></div>
                </div>

                {/* Body Mock */}
                <div className="p-8 grid grid-cols-12 gap-6 h-full bg-white dark:bg-slate-900">
                    {/* Sidebar */}
                    <div className="col-span-2 hidden md:block space-y-4">
                        <div className="h-8 w-full bg-slate-100 dark:bg-slate-800/50 rounded-lg"></div>
                        <div className="h-4 w-2/3 bg-slate-100 dark:bg-slate-800/30 rounded-lg"></div>
                        <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-800/30 rounded-lg"></div>
                        <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-800/30 rounded-lg"></div>
                    </div>
                    
                    {/* Main */}
                    <div className="col-span-12 md:col-span-10 grid grid-rows-6 gap-6">
                        {/* Stats Row */}
                        <div className="row-span-1 grid grid-cols-4 gap-6">
                            {[1,2,3,4].map(i => (
                                <div key={i} className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 rounded-xl p-4 flex flex-col justify-between">
                                    <div className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-700/50 mb-2"></div>
                                    <div className="w-16 h-4 bg-slate-200 dark:bg-slate-700/50 rounded"></div>
                                </div>
                            ))}
                        </div>
                        {/* Big Chart Area */}
                        <div className="row-span-3 grid grid-cols-3 gap-6">
                            <div className="col-span-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 rounded-xl p-6 relative overflow-hidden">
                                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-emerald-500/10 to-transparent"></div>
                                <svg className="absolute bottom-6 left-6 right-6 h-24 overflow-visible" preserveAspectRatio="none">
                                    <path d="M0 100 Q 150 20 300 60 T 600 10" fill="none" stroke="#10b981" strokeWidth="3" />
                                </svg>
                            </div>
                            <div className="col-span-1 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 rounded-xl p-4 space-y-3">
                                {[1,2,3,4,5].map(i => <div key={i} className="h-8 w-full bg-slate-200 dark:bg-slate-700/30 rounded"></div>)}
                            </div>
                        </div>
                        {/* Kanban */}
                        <div className="row-span-2 grid grid-cols-3 gap-6">
                             <div className="bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-white/5 rounded-xl p-3 space-y-2">
                                 <div className="h-20 w-full bg-slate-200 dark:bg-slate-700/30 rounded border-l-2 border-blue-500"></div>
                                 <div className="h-20 w-full bg-slate-200 dark:bg-slate-700/30 rounded border-l-2 border-blue-500"></div>
                             </div>
                             <div className="bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-white/5 rounded-xl p-3 space-y-2">
                                 <div className="h-24 w-full bg-slate-200 dark:bg-slate-700/30 rounded border-l-2 border-purple-500"></div>
                             </div>
                             <div className="bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-white/5 rounded-xl p-3 space-y-2">
                                 <div className="h-16 w-full bg-slate-200 dark:bg-slate-700/30 rounded border-l-2 border-emerald-500"></div>
                                 <div className="h-16 w-full bg-slate-200 dark:bg-slate-700/30 rounded border-l-2 border-emerald-500"></div>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Overlay Action */}
                <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-white/20 dark:bg-black/40 backdrop-blur-[2px]">
                    <button onClick={onEnter} className="px-8 py-4 text-black font-bold rounded-full shadow-2xl transform scale-110 hover:scale-125 transition-transform flex items-center gap-2" style={{ backgroundColor: primaryColor }}>
                        <LayoutGrid className="w-5 h-5"/> Explorar Interface Real
                    </button>
                </div>
            </div>
          </section>

          {/* --- SOCIAL PROOF --- */}
          <div className="w-full border-y border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
              <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-8">
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest shrink-0">Inovando com</p>
                  <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500 text-slate-800 dark:text-white">
                      <div className="flex items-center gap-2 font-bold text-xl"><Globe className="w-6 h-6"/> GlobalTech</div>
                      <div className="flex items-center gap-2 font-bold text-xl"><Zap className="w-6 h-6"/> NextEnergy</div>
                      <div className="flex items-center gap-2 font-bold text-xl"><Shield className="w-6 h-6"/> SecureNet</div>
                      <div className="flex items-center gap-2 font-bold text-xl"><Layers className="w-6 h-6"/> StackBuild</div>
                  </div>
              </div>
          </div>

          {/* --- DETAILED FEATURES SECTIONS --- */}
          <div id="features" className="w-full flex flex-col gap-0 border-t border-slate-200 dark:border-white/5">
              
              {/* Feature 1: RDE */}
              <section className="w-full border-b border-slate-200 dark:border-white/5 bg-white dark:bg-slate-950">
                  <div className="max-w-7xl mx-auto px-6 py-24 flex flex-col lg:flex-row items-center gap-16">
                      <div className="lg:w-1/2">
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-600 dark:text-emerald-500 text-xs font-bold uppercase tracking-widest mb-6">
                              <Target className="w-3 h-3"/> Estratégia
                          </div>
                          <h2 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight text-slate-900 dark:text-white">
                              Matemática sobre <br/> <span className="text-slate-400 dark:text-slate-500">Opinião.</span>
                          </h2>
                          <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed mb-8">
                              Pare de discutir o que fazer. Nossa Matriz RDE cruza <strong>Receita</strong>, <strong>Dor</strong> e <strong>Esforço</strong> para revelar, matematicamente, qual projeto deve ser atacado agora. Elimine o "achismo" da sua gestão.
                          </p>
                          <ul className="space-y-3">
                              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckCircle className="w-5 h-5 text-emerald-500"/> Priorização automática baseada em score.</li>
                              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckCircle className="w-5 h-5 text-emerald-500"/> Identificação visual de "Quick Wins".</li>
                              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckCircle className="w-5 h-5 text-emerald-500"/> Alinhamento instantâneo entre sócios.</li>
                          </ul>
                      </div>
                      <div className="lg:w-1/2 relative">
                          <div className="absolute -inset-4 bg-emerald-500/20 blur-3xl rounded-full opacity-30"></div>
                          <div className="relative bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-2xl aspect-square flex flex-col">
                              {/* Abstract Chart UI */}
                              <div className="flex-1 relative border-l border-b border-slate-300 dark:border-slate-700 m-4">
                                  <div className="absolute bottom-10 left-10 w-4 h-4 bg-red-500 rounded-full animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]"></div>
                                  <div className="absolute top-10 right-10 w-6 h-6 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.5)]"></div>
                                  <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-yellow-500 rounded-full opacity-50"></div>
                                  <div className="absolute bottom-20 right-20 w-3 h-3 bg-blue-500 rounded-full opacity-50"></div>
                                  
                                  <div className="absolute top-8 right-16 bg-white dark:bg-slate-800 text-xs px-2 py-1 rounded border border-slate-200 dark:border-white/10 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm">Alta Prioridade</div>
                              </div>
                              <div className="h-8 flex items-center justify-between px-4 text-xs text-slate-500 font-mono uppercase">
                                  <span>Difícil &larr;</span>
                                  <span>Viabilidade</span>
                                  <span>&rarr; Fácil</span>
                              </div>
                          </div>
                      </div>
                  </div>
              </section>

              {/* Feature 2: Unified Flow */}
              <section className="w-full border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-900/30">
                  <div className="max-w-7xl mx-auto px-6 py-24 flex flex-col lg:flex-row-reverse items-center gap-16">
                      <div className="lg:w-1/2">
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-600 dark:text-blue-500 text-xs font-bold uppercase tracking-widest mb-6">
                              <Workflow className="w-3 h-3"/> Ecossistema
                          </div>
                          <h2 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight text-slate-900 dark:text-white">
                              Do Lead ao <br/> <span className="text-slate-400 dark:text-slate-500">Recebível.</span>
                          </h2>
                          <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed mb-8">
                              CRM, Projetos e Financeiro não deveriam ser ferramentas separadas. No Shinkō, vender cria o projeto, entregar o marco gera a cobrança automática. Tudo conectado.
                          </p>
                          <ul className="space-y-3">
                              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckCircle className="w-5 h-5 text-blue-500"/> Pipeline de vendas integrado ao Kanban.</li>
                              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckCircle className="w-5 h-5 text-blue-500"/> Emissão de boletos/Pix automática.</li>
                              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckCircle className="w-5 h-5 text-blue-500"/> Visão clara de margem por projeto.</li>
                          </ul>
                      </div>
                      <div className="lg:w-1/2 relative">
                          <div className="absolute -inset-4 bg-blue-500/20 blur-3xl rounded-full opacity-30"></div>
                          {/* Abstract Flow Visual */}
                          <div className="relative grid grid-cols-2 gap-4">
                              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 rounded-2xl h-40 flex flex-col justify-between shadow-xl">
                                  <div className="w-8 h-8 bg-orange-500/20 rounded text-orange-600 dark:text-orange-500 flex items-center justify-center"><Target className="w-4 h-4"/></div>
                                  <div className="text-sm font-bold text-slate-900 dark:text-white">CRM</div>
                                  <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden"><div className="w-3/4 h-full bg-orange-500"></div></div>
                              </div>
                              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 rounded-2xl h-40 flex flex-col justify-between mt-8 shadow-xl">
                                  <div className="w-8 h-8 bg-blue-500/20 rounded text-blue-600 dark:text-blue-500 flex items-center justify-center"><Workflow className="w-4 h-4"/></div>
                                  <div className="text-sm font-bold text-slate-900 dark:text-white">Projetos</div>
                                  <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden"><div className="w-1/2 h-full bg-blue-500"></div></div>
                              </div>
                              <div className="col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 rounded-2xl h-24 flex items-center justify-between shadow-xl">
                                  <div className="flex items-center gap-4">
                                      <div className="w-8 h-8 bg-emerald-500/20 rounded text-emerald-600 dark:text-emerald-500 flex items-center justify-center"><DollarSign className="w-4 h-4"/></div>
                                      <div>
                                          <div className="text-xs text-slate-500 uppercase">Fluxo de Caixa</div>
                                          <div className="font-bold text-lg text-emerald-600 dark:text-emerald-500">+ R$ 145.000</div>
                                      </div>
                                  </div>
                                  <Activity className="w-8 h-8 text-slate-300 dark:text-slate-700"/>
                              </div>
                          </div>
                      </div>
                  </div>
              </section>

              {/* Feature 3: AI */}
              <section className="w-full border-b border-slate-200 dark:border-white/5 bg-white dark:bg-slate-950">
                  <div className="max-w-7xl mx-auto px-6 py-24 flex flex-col lg:flex-row items-center gap-16">
                      <div className="lg:w-1/2">
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-600 dark:text-purple-500 text-xs font-bold uppercase tracking-widest mb-6">
                              <BrainCircuit className="w-3 h-3"/> Shinkō Guru
                          </div>
                          <h2 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight text-slate-900 dark:text-white">
                              Seu COO <br/> <span className="text-slate-400 dark:text-slate-500">Digital.</span>
                          </h2>
                          <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed mb-8">
                              Nossa IA não apenas escreve textos. Ela analisa seus gargalos, sugere quebras de tarefas complexas e prevê atrasos antes que aconteçam. É como ter um gerente sênior trabalhando 24/7.
                          </p>
                          <ul className="space-y-3">
                              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckCircle className="w-5 h-5 text-purple-500"/> Geração automática de escopo (WBS).</li>
                              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckCircle className="w-5 h-5 text-purple-500"/> Alertas de risco e desvios de prazo.</li>
                              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckCircle className="w-5 h-5 text-purple-500"/> Chat inteligente com contexto do seu negócio.</li>
                          </ul>
                      </div>
                      <div className="lg:w-1/2 relative">
                          <div className="absolute -inset-4 bg-purple-500/20 blur-3xl rounded-full opacity-30"></div>
                          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-8 shadow-2xl space-y-4">
                              {/* Fake Chat UI */}
                              <div className="flex justify-end">
                                  <div className="bg-purple-600 text-white p-3 rounded-2xl rounded-tr-none text-sm max-w-[80%] shadow-sm">
                                      Como está o cronograma do App Delivery?
                                  </div>
                              </div>
                              <div className="flex justify-start">
                                  <div className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 p-3 rounded-2xl rounded-tl-none text-sm max-w-[90%] border border-slate-200 dark:border-white/5">
                                      <p className="mb-2">Analisando... 🤖</p>
                                      <p>O projeto está com <strong>risco médio</strong>. A etapa de "Integração de Pagamento" está 3 dias atrasada em relação à média histórica.</p>
                                      <div className="mt-3 flex gap-2">
                                          <button className="px-3 py-1 bg-white/50 dark:bg-white/10 rounded text-xs hover:bg-white/80 dark:hover:bg-white/20 border border-slate-200 dark:border-transparent">Reajustar Prazos</button>
                                          <button className="px-3 py-1 bg-white/50 dark:bg-white/10 rounded text-xs hover:bg-white/80 dark:hover:bg-white/20 border border-slate-200 dark:border-transparent">Ver Gargalo</button>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </section>
          </div>

          {/* --- PRICING CALCULATOR SECTION --- */}
          <section id="pricing" className="w-full max-w-7xl px-6 py-24">
              <div className="text-center mb-16">
                  <h2 className="text-3xl md:text-5xl font-bold mb-6 text-slate-900 dark:text-white">Preço justo e transparente.</h2>
                  <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
                      Monte seu plano ideal. Pague apenas pelo que seu time realmente usa.
                  </p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                  
                  {/* Configuration Panel */}
                  <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-xl">
                      
                      {/* Users Slider */}
                      <div className="mb-10">
                          <div className="flex justify-between items-end mb-4">
                              <label className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><Users className="w-5 h-5 text-amber-500"/> Número de Usuários</label>
                              <span className="text-3xl font-black text-amber-500">{numUsers}</span>
                          </div>
                          <input 
                              type="range" 
                              min="1" 
                              max="50" 
                              value={numUsers} 
                              onChange={(e) => setNumUsers(parseInt(e.target.value))}
                              className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                          />
                          <div className="flex justify-between text-xs text-slate-500 mt-2">
                              <span>1 (Solo)</span>
                              <span>50+ (Enterprise)</span>
                          </div>
                      </div>

                      {/* Modules Grid */}
                      <div>
                          <label className="text-lg font-bold text-slate-900 dark:text-white mb-6 block flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-blue-500"/> Módulos Adicionais</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {modulesConfig.map(mod => {
                                  const isSelected = selectedModules.includes(mod.id);
                                  return (
                                      <div 
                                          key={mod.id} 
                                          onClick={() => toggleModule(mod.id)}
                                          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-4 ${isSelected ? 'bg-slate-50 dark:bg-white/5 border-amber-500/50' : 'bg-transparent border-slate-200 dark:border-white/10 opacity-60 hover:opacity-100 hover:border-slate-300 dark:hover:border-white/20'}`}
                                      >
                                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? 'bg-amber-500 border-amber-500' : 'border-slate-400 dark:border-slate-500'}`}>
                                              {isSelected && <Check className="w-3 h-3 text-white dark:text-black"/>}
                                          </div>
                                          <div>
                                              <div className="flex justify-between items-center mb-1">
                                                  <h4 className={`font-bold text-sm ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{mod.name}</h4>
                                                  {mod.price > 0 ? (
                                                      <span className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">+R${mod.price}</span>
                                                  ) : (
                                                      <span className="text-xs bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded">Incluso</span>
                                                  )}
                                              </div>
                                              <p className="text-xs text-slate-500 leading-snug">{mod.desc}</p>
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-slate-50 dark:bg-gradient-to-b dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-2xl sticky top-24">
                      <div className="flex justify-center mb-6">
                          <div className="bg-slate-200 dark:bg-slate-950 p-1 rounded-xl flex items-center border border-slate-300 dark:border-white/5">
                              <button 
                                  onClick={() => setBillingCycle('monthly')}
                                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}
                              >
                                  Mensal
                              </button>
                              <button 
                                  onClick={() => setBillingCycle('yearly')}
                                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${billingCycle === 'yearly' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}
                              >
                                  Anual (-20%)
                              </button>
                          </div>
                      </div>

                      <div className="space-y-4 mb-8 border-b border-slate-200 dark:border-white/10 pb-8">
                          <div className="flex justify-between text-sm">
                              <span className="text-slate-500 dark:text-slate-400">Usuários ({numUsers})</span>
                              <span className="text-slate-900 dark:text-white font-mono">R$ {(numUsers * pricePerUser).toFixed(2)}</span>
                          </div>
                          {modulesConfig.filter(m => selectedModules.includes(m.id) && m.price > 0).map(m => (
                              <div key={m.id} className="flex justify-between text-sm">
                                  <span className="text-slate-500 dark:text-slate-400">{m.name}</span>
                                  <span className="text-slate-900 dark:text-white font-mono">R$ {m.price.toFixed(2)}</span>
                              </div>
                          ))}
                          {billingCycle === 'yearly' && (
                              <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400 font-bold">
                                  <span>Desconto Anual (20%)</span>
                                  <span>- R$ {((calculatedPrice / 0.8) * 0.2).toFixed(2)}</span>
                              </div>
                          )}
                      </div>

                      <div className="mb-8">
                          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Investimento Total</span>
                          <div className="flex items-baseline gap-1 mt-1">
                              <span className="text-sm text-slate-400 mb-1">R$</span>
                              <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">{calculatedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              <span className="text-sm text-slate-500 dark:text-slate-400 font-bold">/mês</span>
                          </div>
                          {billingCycle === 'yearly' && (
                              <p className="text-xs text-slate-500 mt-2">Faturado anualmente: R$ {(calculatedPrice * 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          )}
                      </div>

                      <button 
                          onClick={onEnter}
                          className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] transition-all transform hover:-translate-y-1"
                      >
                          Começar Teste Grátis
                      </button>
                      <p className="text-center text-[10px] text-slate-500 dark:text-slate-600 mt-4">
                          14 dias grátis. Não requer cartão de crédito.
                      </p>
                  </div>
              </div>
          </section>

          {/* --- FAQ SECTION --- */}
          <section className="w-full max-w-3xl mx-auto px-6 py-24 border-t border-slate-200 dark:border-white/5">
              <h2 className="text-3xl font-bold text-center mb-12 text-slate-900 dark:text-white">Perguntas Frequentes</h2>
              <div className="space-y-4">
                  {faqs.map((faq, idx) => (
                      <div key={idx} className="border border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                          <button 
                              onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                              className="w-full flex justify-between items-center p-6 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                          >
                              <span className="font-bold text-slate-800 dark:text-slate-200">{faq.q}</span>
                              {openFaq === idx ? <Minus className="w-5 h-5 text-slate-400"/> : <Plus className="w-5 h-5 text-slate-400"/>}
                          </button>
                          {openFaq === idx && (
                              <div className="px-6 pb-6 text-slate-600 dark:text-slate-400 text-sm leading-relaxed animate-in slide-in-from-top-2">
                                  {faq.a}
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          </section>
          
          {/* --- FOOTER --- */}
          <footer className="w-full border-t border-slate-200 dark:border-white/10 py-12 text-center text-slate-600 text-sm bg-slate-50 dark:bg-black mt-auto">
              <div className="flex flex-wrap justify-center gap-8 mb-8 font-bold text-slate-500">
                  <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Sobre</a>
                  <a href="#pricing" className="hover:text-black dark:hover:text-white transition-colors">Preços</a>
                  <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Docs</a>
                  <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Contato</a>
                  <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Termos</a>
              </div>
              <div className="flex justify-center gap-4 mb-8">
                  {/* Social Icons Placeholder */}
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/5 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-white/10 cursor-pointer transition-colors text-slate-600 dark:text-white"><Globe className="w-4 h-4"/></div>
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/5 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-white/10 cursor-pointer transition-colors text-slate-600 dark:text-white"><Activity className="w-4 h-4"/></div>
              </div>
              <p className="text-xs uppercase tracking-widest opacity-50">&copy; 2026 {brandName} Systems. Todos os direitos reservados.</p>
          </footer>
      </div>
    </div>
  );
};
