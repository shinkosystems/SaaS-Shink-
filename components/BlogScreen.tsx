
import React, { useState, useEffect } from 'react';
import { CmsPost } from '../types';
import { fetchCmsPosts, captureLead, fetchCmsPostBySlug } from '../services/cmsService';
import { ArrowLeft, Calendar, Tag, Download, CheckCircle, Loader2, Search, X, ChevronRight, FileText, ArrowRight, BookOpen, Layers } from 'lucide-react';

interface Props {
    onBack: () => void;
    onEnter?: () => void;
    initialPostSlug?: string | null;
}

const LOGO_URL = "https://zjssfnbcboibqeoubeou.supabase.co/storage/v1/object/public/fotoperfil/fotoperfil/1%20(1).png";

export const BlogScreen: React.FC<Props> = ({ onBack, onEnter, initialPostSlug }) => {
    const [posts, setPosts] = useState<CmsPost[]>([]);
    const [selectedPost, setSelectedPost] = useState<CmsPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTag, setActiveTag] = useState<string | null>(null);
    
    const [showLeadModal, setShowLeadModal] = useState(false);
    const [leadName, setLeadName] = useState('');
    const [leadEmail, setLeadEmail] = useState('');
    const [leadPhone, setLeadPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            const data = await fetchCmsPosts(true);
            setPosts(data);
            
            if (initialPostSlug) {
                const post = await fetchCmsPostBySlug(initialPostSlug);
                if (post) setSelectedPost(post);
            }
            setLoading(false);
        };
        init();
    }, []);

    useEffect(() => {
        if (!initialPostSlug) {
            setSelectedPost(null);
        } else if (initialPostSlug && (!selectedPost || selectedPost.slug !== initialPostSlug)) {
            const found = posts.find(p => p.slug === initialPostSlug);
            if (found) setSelectedPost(found);
            else {
                fetchCmsPostBySlug(initialPostSlug).then(p => {
                    if (p) setSelectedPost(p);
                });
            }
        }
    }, [initialPostSlug, posts]);

    const handleSelectPost = (post: CmsPost | null) => {
        setSelectedPost(post);
        if (post) {
            window.history.pushState({}, '', `/blog/${post.slug || post.id}`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            window.history.pushState({}, '', '/blog');
        }
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

    const allTags: string[] = Array.from(new Set(posts.flatMap(p => p.tags || [])));

    return (
        <div className="fixed inset-0 z-[200] bg-[#050505] text-white flex flex-col overflow-hidden font-sans">
            {/* Background Effects */}
            <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-amber-600/5 rounded-full blur-[100px] mix-blend-screen"></div>
                <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-purple-900/5 rounded-full blur-[100px] mix-blend-screen"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]"></div>
            </div>
            
            {/* Header - Back button on Left */}
            <nav className="h-20 shrink-0 backdrop-blur-md border-b border-white/5 bg-[#050505]/80 z-50 px-6">
                <div className="max-w-[1600px] mx-auto h-full flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <button 
                            onClick={selectedPost ? () => handleSelectPost(null) : onBack} 
                            className="group flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10 text-slate-300 hover:text-white"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform"/>
                            <span className="text-xs font-bold uppercase tracking-wider">Voltar</span>
                        </button>
                        <div className="w-px h-6 bg-white/10 hidden sm:block"></div>
                        <img src={LOGO_URL} alt="Shinkō OS" className="h-7 w-auto object-contain hidden sm:block" />
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden lg:flex items-center gap-6 text-xs font-bold uppercase tracking-widest text-slate-500">
                            <button onClick={onBack} className="hover:text-white transition-colors">Home</button>
                            <button onClick={onBack} className="hover:text-white transition-colors">Cases</button>
                            <button className="text-amber-500 cursor-default">Insights</button>
                        </div>
                        {onEnter && (
                            <button onClick={onEnter} className="px-6 py-2.5 bg-white text-black font-black text-xs uppercase tracking-widest rounded-full hover:bg-slate-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center gap-2">
                                Entrar <ArrowRight className="w-4 h-4"/>
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            <div className="flex-1 flex overflow-hidden relative z-10">
                {/* Sidebar Navigation */}
                <aside className="w-80 shrink-0 border-r border-white/5 bg-black/20 hidden md:flex flex-col overflow-y-auto custom-scrollbar">
                    <div className="p-6 space-y-8">
                        {/* Search in Sidebar */}
                        <div className="relative group">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 group-focus-within:text-amber-500 transition-colors"/>
                            <input 
                                type="text" 
                                placeholder="Buscar insights..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-amber-500/50 text-xs text-white placeholder:text-slate-600 transition-all"
                            />
                        </div>

                        {/* Categories */}
                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
                                <Layers className="w-3 h-3"/> Categorias
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                <button 
                                    onClick={() => setActiveTag(null)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${!activeTag ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/30'}`}
                                >
                                    TODOS
                                </button>
                                {allTags.map((tag: string) => (
                                    <button 
                                        key={tag} 
                                        onClick={() => setActiveTag(tag)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${activeTag === tag ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/30'}`}
                                    >
                                        {tag.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Article List */}
                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
                                <BookOpen className="w-3 h-3"/> Publicações Recentes
                            </h3>
                            <div className="space-y-1">
                                {filteredPosts.map(post => (
                                    <button 
                                        key={post.id}
                                        onClick={() => handleSelectPost(post)}
                                        className={`w-full text-left p-3 rounded-xl transition-all border flex flex-col gap-1 group ${selectedPost?.id === post.id ? 'bg-amber-500/10 border-amber-500/30 shadow-inner' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                                    >
                                        <span className={`text-xs font-bold leading-snug transition-colors ${selectedPost?.id === post.id ? 'text-amber-400' : 'text-slate-300 group-hover:text-white'}`}>
                                            {post.title}
                                        </span>
                                        <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">
                                            {new Date(post.created_at).toLocaleDateString()}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#050505] relative">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
                            <Loader2 className="w-8 h-8 animate-spin text-amber-500"/>
                            <span className="text-xs font-bold uppercase tracking-widest">Sincronizando Insights...</span>
                        </div>
                    ) : selectedPost ? (
                        /* DETAIL VIEW */
                        <article className="max-w-4xl mx-auto px-6 py-12 md:py-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative mb-20">
                                {selectedPost.cover_image && (
                                    <div className="relative h-[25rem] w-full bg-black">
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent z-10"></div>
                                        <img src={selectedPost.cover_image} alt={selectedPost.title} className="w-full h-full object-cover opacity-80"/>
                                    </div>
                                )}
                                
                                <div className="p-8 md:p-14 -mt-40 relative z-20">
                                    <div className="flex flex-wrap gap-2 mb-8">
                                        {selectedPost.tags?.map(tag => (
                                            <span key={tag} className="px-4 py-1.5 bg-amber-500 text-black rounded-full text-[10px] font-black uppercase tracking-[0.15em] shadow-lg shadow-amber-500/20">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    <h1 className="text-4xl md:text-6xl font-black text-white mb-8 leading-[1.1] tracking-tight">
                                        {selectedPost.title}
                                    </h1>

                                    <div className="flex items-center gap-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-12 pb-8 border-b border-white/5">
                                        <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-amber-500"/> {new Date(selectedPost.created_at).toLocaleDateString()}</span>
                                        <span className="hidden sm:inline">•</span>
                                        <span className="hidden sm:inline">Por Shinkō Engineering Team</span>
                                    </div>

                                    <div 
                                        className="prose prose-invert max-w-none text-slate-300 leading-relaxed text-lg prose-headings:font-black prose-headings:text-white prose-a:text-amber-400 prose-img:rounded-3xl prose-strong:text-white"
                                        dangerouslySetInnerHTML={{ __html: selectedPost.content || '' }}
                                    />

                                    {selectedPost.download_url && (
                                        <div className="mt-20 p-1 rounded-[2rem] bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 shadow-2xl">
                                            <div className="bg-[#0A0A0A] rounded-[1.8rem] p-8 md:p-12 relative overflow-hidden">
                                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
                                                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                                                    <div className="text-center md:text-left">
                                                        <h3 className="text-3xl font-black text-white mb-3 flex items-center justify-center md:justify-start gap-4">
                                                            <FileText className="w-8 h-8 text-amber-500"/> Material Rico
                                                        </h3>
                                                        <p className="text-slate-400 text-base max-w-md">Acesse o checklist completo e o framework técnico detalhado: {selectedPost.download_title || 'material'}.</p>
                                                    </div>
                                                    <button onClick={handleDownloadClick} className="px-10 py-5 bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 shrink-0">
                                                        <Download className="w-5 h-5"/> Baixar Agora
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </article>
                    ) : (
                        /* LIST VIEW */
                        <div className="max-w-7xl mx-auto px-6 py-12 md:py-20 animate-in fade-in duration-500">
                            <div className="mb-16">
                                <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight leading-none">
                                    Engenharia de <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600">Insights</span>.
                                </h1>
                                <p className="text-slate-400 text-lg md:text-xl max-w-2xl leading-relaxed">Frameworks e estratégias sobre inovação e construção de produtos digitais de alta performance.</p>
                            </div>

                            {filteredPosts.length === 0 ? (
                                <div className="text-center py-40 text-slate-500 border border-dashed border-white/10 rounded-[3rem] bg-white/5">
                                    Nenhum artigo encontrado.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    {filteredPosts.map(post => (
                                        <div key={post.id} onClick={() => handleSelectPost(post)} className="group bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] overflow-hidden hover:border-amber-500/30 transition-all duration-500 cursor-pointer flex flex-col h-full hover:-translate-y-2 hover:shadow-2xl hover:shadow-amber-500/5 relative">
                                            <div className="h-64 overflow-hidden relative bg-white/5">
                                                {post.cover_image && (
                                                    <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"/>
                                                )}
                                            </div>
                                            <div className="p-8 flex-1 flex flex-col">
                                                <h3 className="text-2xl font-bold text-white mb-6 line-clamp-2 leading-tight group-hover:text-amber-400 transition-colors">
                                                    {post.title}
                                                </h3>
                                                <div className="mt-auto pt-6 flex items-center justify-between text-slate-500 text-[10px] font-black uppercase tracking-widest border-t border-white/5">
                                                    <span className="flex items-center gap-2"><Calendar className="w-3 h-3 text-amber-500/50"/> {new Date(post.created_at).toLocaleDateString()}</span>
                                                    <span className="group-hover:text-amber-500 transition-colors flex items-center gap-2">Ler Artigo <ArrowRight className="w-3 h-3"/></span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>

            {/* Lead Modal */}
            {showLeadModal && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl relative border border-white/10 ring-1 ring-white/5">
                        <button onClick={() => setShowLeadModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors p-2"><X className="w-6 h-6"/></button>
                        <div className="text-center mb-10">
                            <div className="w-16 h-16 bg-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-amber-500/30">
                                <Download className="w-8 h-8"/>
                            </div>
                            <h3 className="text-2xl font-black text-white mb-3">Quase lá!</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">Informe seus dados corporativos para liberar o acesso ao download imediatamente.</p>
                        </div>
                        <form onSubmit={handleLeadSubmit} className="space-y-5">
                            <input required value={leadName} onChange={e => setLeadName(e.target.value)} className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-amber-500 text-white transition-all text-sm" placeholder="Nome Completo"/>
                            <input required type="email" value={leadEmail} onChange={e => setLeadEmail(e.target.value)} className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-amber-500 text-white transition-all text-sm" placeholder="Email Profissional"/>
                            <input required type="tel" value={leadPhone} onChange={e => setLeadPhone(e.target.value)} className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-amber-500 text-white transition-all text-sm" placeholder="WhatsApp"/>
                            <button disabled={isSubmitting} className="w-full py-5 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3">
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <CheckCircle className="w-5 h-5"/>}
                                Liberar Conteúdo
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
