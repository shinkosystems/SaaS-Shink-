
import React from 'react';
import { X, ArrowRight, TrendingUp, ExternalLink, Zap, Activity, BrainCircuit, Smartphone, Layout } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const CasesGallery: React.FC<Props> = ({ onClose }) => {
  const cases = [
    {
      id: 0, 
      title: "EM Power",
      category: "HealthTech & AI",
      description: "Monitoramento inteligente para Esclerose Múltipla. Interface adaptada para redução de carga cognitiva com correlações de IA.",
      metric: "+5.000 Sintomas",
      image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80", 
      url: "https://empower-comunidade.vercel.app/"
    },
    {
      id: 1,
      title: "NeoBank Fintech",
      category: "Fintech",
      description: "Banco digital completo com gestão de cartões, investimentos e integração Open Finance.",
      metric: "R$ 200M TPV",
      image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80",
      url: "#"
    },
    {
      id: 2,
      title: "LogiTrack",
      category: "Logistics",
      description: "Plataforma de rastreamento de frota em tempo real com otimização de rotas e manutenção preditiva.",
      metric: "-15% Custos",
      image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80",
      url: "#"
    },
    {
      id: 3,
      title: "EduLearn",
      category: "EdTech",
      description: "LMS gamificado para engajamento de alunos com trilhas de aprendizado personalizadas por IA.",
      metric: "92% Conclusão",
      image: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&w=1200&q=80",
      url: "#"
    }
  ];

  return (
    <div className="fixed inset-0 z-[250] bg-black/90 backdrop-blur-xl overflow-y-auto animate-in fade-in duration-300">
        <div className="min-h-full p-6 md:p-12">
            <div className="max-w-7xl mx-auto relative">
                <button 
                    onClick={onClose}
                    className="absolute -top-2 -right-2 md:top-0 md:right-0 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50"
                >
                    <X className="w-6 h-6"/>
                </button>

                <div className="mb-12">
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Cases de Sucesso</h2>
                    <p className="text-xl text-slate-400 max-w-2xl">
                        Projetos reais desenvolvidos utilizando a metodologia Shinkō OS.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {cases.map((item) => (
                        <div key={item.id} className="group relative rounded-3xl overflow-hidden bg-slate-900 border border-white/10 hover:border-amber-500/50 transition-all duration-500 hover:-translate-y-2">
                            <div className="aspect-video overflow-hidden relative">
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent z-10 opacity-80"></div>
                                <img 
                                    src={item.image} 
                                    alt={item.title} 
                                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                                />
                                <div className="absolute top-4 left-4 z-20">
                                    <span className="px-3 py-1 bg-black/50 backdrop-blur-md border border-white/10 rounded-full text-xs font-bold text-white uppercase tracking-wider">
                                        {item.category}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="p-8 relative z-20 -mt-20">
                                <div className="flex justify-between items-end mb-4">
                                    <h3 className="text-3xl font-bold text-white group-hover:text-amber-500 transition-colors">{item.title}</h3>
                                    <div className="flex items-center gap-2 text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                                        <TrendingUp className="w-4 h-4"/> {item.metric}
                                    </div>
                                </div>
                                <p className="text-slate-400 leading-relaxed mb-6">
                                    {item.description}
                                </p>
                                <a 
                                    href={item.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-white font-bold border-b border-amber-500 pb-0.5 hover:text-amber-500 transition-colors"
                                >
                                    Ver Projeto <ArrowRight className="w-4 h-4"/>
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
};
