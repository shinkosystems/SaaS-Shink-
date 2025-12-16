
import React, { useState, useEffect } from 'react';
import { CmsPost } from '../types';
import { fetchCmsPosts, captureLead } from '../services/cmsService';
import { ArrowLeft, Calendar, Tag, Download, CheckCircle, Loader2, Search, X, ChevronRight, FileText, ArrowRight } from 'lucide-react';

interface Props {
    onBack: () => void;
    onEnter?: () => void;
}

const LOGO_URL = "https://zjssfnbcboibqeoubeou.supabase.co/storage/v1/object/public/fotoperfil/fotoperfil/1%20(1).png";

export const BlogScreen: React.FC<Props> = ({ onBack, onEnter }) => {
    const [posts, setPosts] = useState<CmsPost[]>([]);
    const [selectedPost, setSelectedPost] = useState<CmsPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTag, setActiveTag] = useState<string | null>(null);
    
    // Lead Capture State
    const [showLeadModal, setShowLeadModal] = useState(false);
    const [leadName, setLeadName] = useState('');
    const [leadEmail, setLeadEmail] = useState('');
    const [leadPhone, setLeadPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        setLoading(true);
        const data = await fetchCmsPosts(true);
        setPosts(data);
        setLoading(false);
    };

    const handleDownloadClick = () => {
        setShowLeadModal(true);
    };

    const handleLeadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPost) return;
        
        setIsSubmitting(true);
        const success = await captureLead(leadName, leadEmail, leadPhone, selectedPost.download_title || selectedPost.title);
        setIsSubmitting(false);

        if (success) {
            setShowLeadModal(false);
            if (selectedPost.download_url) {
                const win = window.open(selectedPost.download_url, '_blank');
                if (!win) {
                    alert("Por favor, permita popups para baixar o arquivo.");
                    window.location.href = selectedPost.download_url;
                }
            } else {
                alert("Erro: Link do arquivo não encontrado.");
            }
        } else {
            alert("Erro ao processar seus dados. Tente novamente.");
        }
    };

    const filteredPosts = posts.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTag = activeTag ? p.tags?.includes(activeTag) : true;
        return matchesSearch && matchesTag;
    });

    const allTags = Array.from(new Set(posts.flatMap(p => p.tags || [])));

    // --- DETAIL VIEW ---
    if (selectedPost) {
        return (
            <div className="fixed inset-0 z-[250] bg-[#050505] text-white animate-in fade-in slide-in-from-right-8 overflow-y-auto custom-scrollbar">
                {/* Background Noise & Brand Glow */}
                <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-amber-600/10 rounded-full blur-[120px] mix-blend-screen"></div>
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                </div>
                
                {/* Standard Header in Detail */}
                <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-white/5 bg-[#050505]/80">
                    <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setSelectedPost(null)}>
                            <img src={LOGO_URL} alt="Shinkō OS" className="h-8 w-auto object-contain relative z-10" />
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSelectedPost(null)} className="group relative px-6 py-2.5 bg-white/10 text-white font-bold text-sm rounded-xl hover:bg-white/20 transition-all border border-white/10 flex items-center gap-2">
                                <ArrowLeft className="w-4 h-4"/> Voltar
                            </button>
                        </div>
                    </div>
                </nav>

                <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 pt-32">
                    <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl mb-20 relative">
                        {selectedPost.cover_image && (
                            <div className="relative h-64 md:h-96 w-full">
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/50 to-transparent opacity-90 z-10"></div>
                                <img src={selectedPost.cover_image} alt={selectedPost.title} className="w-full h-full object-cover"/>
                            </div>
                        )}
                        
                        <div className="p-8 md:p-12 -mt-32 relative z-20">
                            <div className="flex flex-wrap gap-2 mb-6">
                                {selectedPost.tags?.map(tag => (
                                    <span key={tag} className="px-3 py-1 bg-amber-500 text-black rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-amber-500/20 border border-amber-400">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            <h1 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight tracking-tight drop-shadow-xl">
                                {selectedPost.title}
                            </h1>

                            <div className="flex items-center gap-4 text-xs font-bold text-slate-300 uppercase tracking-wider mb-10 pb-8 border-b border-white/10">
                                <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-amber-500"/> {new Date(selectedPost.created_at).toLocaleDateString()}</span>
                                <span>•</span>
                                <span>Por Shinkō Team</span>
                            </div>

                            <div 
                                className="prose prose-invert max-w-none text-slate-300 leading-relaxed prose-headings:font-bold prose-headings:text-white prose-a:text-amber-400 prose-img:rounded-xl prose-strong:text-white"
                                dangerouslySetInnerHTML={{ __html: selectedPost.content || '' }}
                            />

                            {/* Call to Action - Download */}
                            {selectedPost.download_url && (
                                <div className="mt-16 p-1 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 shadow-2xl animate-pulse-slow">
                                    <div className="bg-[#0A0A0A] rounded-xl p-8 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                                            <div>
                                                <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                                                    <FileText className="w-6 h-6 text-amber-500"/> Material Exclusivo
                                                </h3>
                                                <p className="text-slate-400 text-sm">Acesse o conteúdo completo: {selectedPost.download_title || 'material'}.</p>
                                            </div>
                                            <button 
                                                onClick={handleDownloadClick}
                                                className="px-8 py-4 bg-white text-black font-bold rounded-xl shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
                                            >
                                                <Download className="w-5 h-5"/> Baixar Agora
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Lead Modal */}
                {showLeadModal && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
                        <div className="glass-panel w-full max-w-md rounded-3xl p-8 shadow-2xl relative border border-white/10 bg-slate-900/90">
                            <button onClick={() => setShowLeadModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
                            
                            <div className="text-center mb-8">
                                <div className="w-12 h-12 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
                                    <Download className="w-6 h-6"/>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Quase lá!</h3>
                                <p className="text-slate-400 text-xs">Preencha seus dados para liberar o download imediatamente.</p>
                            </div>
                            
                            <form onSubmit={handleLeadSubmit} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Nome</label>
                                    <input required value={leadName} onChange={e => setLeadName(e.target.value)} className="w-full p-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-amber-500 text-white transition-colors text-sm"/>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Email Profissional</label>
                                    <input required type="email" value={leadEmail} onChange={e => setLeadEmail(e.target.value)} className="w-full p-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-amber-500 text-white transition-colors text-sm"/>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Telefone / WhatsApp</label>
                                    <input required type="tel" value={leadPhone} onChange={e => setLeadPhone(e.target.value)} className="w-full p-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-amber-500 text-white transition-colors text-sm"/>
                                </div>
                                <button disabled={isSubmitting} className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4">
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <CheckCircle className="w-5 h-5"/>}
                                    Liberar Download
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // --- LIST VIEW ---
    return (
        <div className="fixed inset-0 z-[200] bg-[#050505] text-white flex flex-col overflow-y-auto custom-scrollbar">
            {/* Background Noise & Brand Glow */}
            <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-amber-600/10 rounded-full blur-[120px] mix-blend-screen"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
            </div>
            
            {/* --- STANDARD HEADER (Consistent with Landing) --- */}
            <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-white/5 bg-[#050505]/80">
                <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={onBack}>
                        <img src={LOGO_URL} alt="Shinkō OS" className="h-8 w-auto object-contain relative z-10" />
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400 mr-4">
                            <button onClick={onBack} className="hover:text-white transition-colors">Home</button>
                            <button onClick={onBack} className="hover:text-white transition-colors">Cases</button>
                            <button className="text-white font-bold cursor-default">Blog</button>
                        </div>
                        {onEnter && (
                            <button onClick={onEnter} className="group relative px-6 py-2.5 bg-white text-black font-bold text-sm rounded-full hover:bg-slate-200 transition-all shadow-glow-white overflow-hidden">
                                <span className="relative z-10 flex items-center gap-2">Entrar <ArrowRight className="w-4 h-4"/></span>
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-12 pt-32 w-full relative z-10 flex-1">
                
                {/* Search & Tags */}
                <div className="mb-12">
                    <h1 className="text-4xl md:text-6xl font-black text-white mb-2 tracking-tight">
                        Blog & Insights
                    </h1>
                    <p className="text-slate-400 text-sm md:text-base max-w-lg mb-8">
                        Estratégias, frameworks e deep-dives sobre inovação, engenharia de software e modelos de negócio.
                    </p>

                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-500"/>
                            <input 
                                type="text" 
                                placeholder="Buscar artigos..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-amber-500/50 focus:bg-white/10 text-sm text-white transition-all placeholder:text-slate-500 focus:ring-1 focus:ring-amber-500/50"
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto max-w-full pb-2 md:pb-0 scrollbar-hide">
                            <button 
                                onClick={() => setActiveTag(null)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${!activeTag ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20' : 'bg-transparent border-white/10 text-slate-400 hover:border-white/30 hover:text-white'}`}
                            >
                                Todos
                            </button>
                            {allTags.map(tag => (
                                <button 
                                    key={tag}
                                    onClick={() => setActiveTag(tag)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${activeTag === tag ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20' : 'bg-transparent border-white/10 text-slate-400 hover:border-white/30 hover:text-white'}`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="flex justify-center py-40"><Loader2 className="w-10 h-10 animate-spin text-amber-500 opacity-50"/></div>
                ) : filteredPosts.length === 0 ? (
                    <div className="text-center py-40 text-slate-500 border border-dashed border-white/10 rounded-3xl bg-white/5">Nenhum artigo encontrado.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredPosts.map(post => (
                            <div 
                                key={post.id}
                                onClick={() => setSelectedPost(post)}
                                className="group bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden hover:border-amber-500/30 transition-all duration-500 cursor-pointer flex flex-col h-full hover:-translate-y-2 hover:shadow-2xl hover:shadow-amber-500/10 relative"
                            >
                                <div className="h-56 overflow-hidden relative bg-white/5">
                                    {post.cover_image && (
                                        <>
                                            <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors z-10"></div>
                                            <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"/>
                                        </>
                                    )}
                                    {post.download_url && (
                                        <div className="absolute top-4 right-4 bg-amber-500 text-black text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 z-20 border border-amber-400 shadow-amber-500/50">
                                            <Download className="w-3 h-3"/> Material Rico
                                        </div>
                                    )}
                                </div>
                                <div className="p-6 flex-1 flex flex-col relative bg-[#0A0A0A] group-hover:bg-white/5 transition-colors">
                                    <div className="flex gap-2 mb-4">
                                        {post.tags?.slice(0, 2).map(tag => (
                                            <span key={tag} className="text-[10px] font-bold uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">{tag}</span>
                                        ))}
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 leading-tight group-hover:text-amber-400 transition-colors">
                                        {post.title}
                                    </h3>
                                    <div className="mt-auto pt-6 flex items-center justify-between text-slate-500 text-xs font-bold border-t border-white/5 group-hover:border-white/10 transition-colors">
                                        <span className="flex items-center gap-2"><Calendar className="w-3 h-3"/> {new Date(post.created_at).toLocaleDateString()}</span>
                                        <span className="group-hover:text-amber-500 transition-colors flex items-center gap-1 text-slate-400">Ler Artigo <ChevronRight className="w-3 h-3"/></span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
