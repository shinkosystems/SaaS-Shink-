
import React, { useState, useEffect } from 'react';
import { X, ArrowRight, TrendingUp, Loader2, ExternalLink } from 'lucide-react';
import { fetchCmsCases } from '../services/cmsService';
import { CmsCase } from '../types';

interface Props {
  onClose: () => void;
}

const LOGO_URL = "https://zjssfnbcboibqeoubeou.supabase.co/storage/v1/object/public/fotoperfil/fotoperfil/1%20(1).png";

export const CasesGallery: React.FC<Props> = ({ onClose }) => {
  const [cases, setCases] = useState<CmsCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      const load = async () => {
          setLoading(true);
          const data = await fetchCmsCases();
          setCases(data);
          setLoading(false);
      };
      load();
  }, []);

  return (
    <div className="fixed inset-0 z-[250] bg-[#050505] text-white overflow-y-auto animate-in fade-in duration-300">
        
        {/* Background Effects (Shinkō Amber Identity) */}
        <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-amber-600/10 rounded-full blur-[120px] animate-pulse mix-blend-screen"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[120px] mix-blend-screen"></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        </div>

        {/* --- STANDARD HEADER (Consistent with Landing) --- */}
        <nav className="relative z-50 w-full px-6 py-6 sticky top-0 backdrop-blur-xl border-b border-white/5 bg-[#050505]/80">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="flex items-center gap-3 cursor-pointer group" onClick={onClose}>
                    <img src={LOGO_URL} alt="Shinkō OS" className="h-8 w-auto object-contain" />
                </div>
                
                <div className="flex items-center gap-6">
                    <button onClick={onClose} className="group relative px-6 py-2.5 bg-white/10 text-white font-bold text-sm rounded-xl hover:bg-white/20 transition-all border border-white/10 flex items-center gap-2">
                        <X className="w-4 h-4"/> Fechar
                    </button>
                </div>
            </div>
        </nav>

        <div className="min-h-full p-6 md:p-12 relative z-10">
            <div className="max-w-7xl mx-auto relative">
                
                <div className="mb-16 text-center">
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight">
                        Cases de <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600">Sucesso</span>
                    </h2>
                    <p className="text-lg text-slate-400 max-w-2xl font-medium leading-relaxed mx-auto">
                        Descubra como o framework Shinkō transformou incerteza em resultado previsível para empresas líderes.
                    </p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-40">
                        <div className="relative">
                            <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
                        </div>
                    </div>
                ) : cases.length === 0 ? (
                    <div className="text-slate-500 text-center py-40 text-lg border border-dashed border-white/10 rounded-3xl bg-white/5">
                        Em breve novos cases serão publicados.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {cases.map((item) => (
                            <div key={item.id} className="group relative rounded-3xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-amber-500/10 hover:border-amber-500/30">
                                
                                {/* Image Area */}
                                <div className="aspect-[16/9] overflow-hidden relative bg-[#0a0a0a]">
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent z-10 opacity-80 group-hover:opacity-60 transition-opacity"></div>
                                    <img 
                                        src={item.image_url} 
                                        alt={item.title} 
                                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 opacity-90 grayscale group-hover:grayscale-0"
                                    />
                                    <div className="absolute top-4 left-4 z-20 flex gap-2">
                                        <span className="px-3 py-1 bg-amber-500 text-black border border-amber-400 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg">
                                            {item.category}
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Content Area */}
                                <div className="p-8 relative z-20">
                                    <div className="flex justify-between items-start mb-6">
                                        <h3 className="text-2xl font-bold text-white group-hover:text-amber-400 transition-colors leading-tight max-w-[70%]">
                                            {item.title}
                                        </h3>
                                        {item.metric && (
                                            <div className="flex items-center gap-2 text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 text-xs shadow-glow">
                                                <TrendingUp className="w-3 h-3"/> {item.metric}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <p className="text-slate-400 leading-relaxed text-sm mb-8 line-clamp-3">
                                        {item.description}
                                    </p>
                                    
                                    {item.link_url && (
                                        <a 
                                            href={item.link_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-amber-500 font-bold text-sm group/btn hover:text-amber-400 transition-colors"
                                        >
                                            <span className="border-b border-amber-500/30 pb-0.5">Ver Estudo Completo</span>
                                            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform"/>
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
