
import React, { useState, useEffect } from 'react';
import { CmsPost } from '../types';
import { fetchCmsPosts, captureLead, fetchCmsPostBySlug } from '../services/cmsService';
import { 
    ArrowLeft, Calendar, Tag, Download, CheckCircle, Loader2, Search, X, 
    ChevronRight, FileText, ArrowRight, BookOpen, Layers, Sparkles, 
    Clock, Share2, Bookmark, MessageSquare, Newspaper
} from 'lucide-react';
import { MetaController } from './MetaController';

interface Props {
    onBack: () => void;
    onEnter?: () => void;
    initialPostSlug?: string | null;
}

const BRAND_LOGO = "https://zjssfnbcboibqeoubeou.supabase.co/storage/v1/object/public/fotoperfil/fotoperfil/1%20(1).png";

export const InsightCenter: React.FC<Props> = ({ onBack, onEnter, initialPostSlug }) => {
    const [posts, setPosts] = useState<CmsPost[]>([]);
    const [selectedPost, setSelectedPost] = useState<CmsPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTag, setActiveTag] = useState<string | null>(null);
    
    const [showLeadModal, setShowLeadModal] = useState(false);
    const [leadForm, setLeadForm] = useState({ name: '', email: '', phone: '' });
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
        const success = await captureLead(leadForm.name, leadForm.email, leadForm.phone, selectedPost.download_title || selectedPost.title);
        setIsSubmitting(false);

        if (success) {
            setShowLeadModal(false);
            if (selectedPost.download_url) window.open(selectedPost.download_url, '_blank');
        } else {
            alert("Erro ao processar. Tente novamente.");
        }
    };

    const filteredPosts = posts.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTag = activeTag ? p.tags?.includes(activeTag) : true;
        return matchesSearch && matchesTag;
    });

    const allTags: string[] = Array.from(new Set(posts.flatMap(p => p.tags || [])));

    if (loading) {
        return (
            <div className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center gap-6">
                <div className="w-16 h-16 relative">
                    <div className="absolute inset-0 rounded-2xl border-4 border-amber-500/20"></div>
                    <div className="absolute inset-0 rounded-2xl border-4 border-t-amber-500 animate-spin"></div>
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.5em] text-amber-500 animate-pulse">Sincronizando Insights</div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[200] bg-[#020203] text-white flex flex-col overflow-hidden selection:bg-amber-500 selection:text-black">
            <MetaController 
                title={selectedPost ? (selectedPost.seo_title || selectedPost.title) : "Blog de Engenharia & Valor"}
                description={selectedPost ? (selectedPost.seo_description || selectedPost.content?.substring(0, 160)) : "Insights sobre inovação, SaaS e arquitetura de elite."}
                image={selectedPost?.og_image || selectedPost?.cover_image}
                type={selectedPost ? 'article' : 'website'}
            />

            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.05)_0%,transparent_50%)]"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] mix-blend-overlay"></div>
            </div>

            <nav className="h-20 shrink-0 border-b border-white/5 bg-black/40 backdrop-blur-3xl z-[100] px-6 lg:px-12">
                <div className="max-w-[1600px] mx-auto h-full flex justify-between items-center">
                    <div className="flex items-center gap-8">
                        <button onClick={selectedPost ? () => handleSelectPost(null) : onBack} className="p-3 hover:bg-white/5 rounded-2xl transition-all text-slate-400 hover:text-white border border-transparent hover:border-white/10">
                            <ArrowLeft className="w-6 h-6"/>
                        </button>
                        <div className="hidden md:flex items-center gap-4">
                            <img src={BRAND_LOGO} alt="Shinkō" className="h-8 w-auto opacity-80" />
                            <div className="w-px h-6 bg-white/10"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Engineering Blog</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden lg:flex items-center gap-8 text-[11px] font-black uppercase tracking-widest text-slate-500">
                            <button onClick={onBack} className="hover:text-white transition-colors">Framework</button>
                            <button onClick={onBack} className="hover:text-white transition-colors">Ecosystem</button>
                            <button className="text-amber-500">Insights</button>
                        </div>
                        {onEnter && (
                            <button onClick={onEnter} className="px-8 py-3 bg-white text-black font-black text-[10px] uppercase tracking-widest rounded-full hover:bg-amber-500 transition-all shadow-xl active:scale-95">
                                Acessar Sistema
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            <div className="flex-1 flex overflow-hidden">
                {!selectedPost && (
                    <aside className="w-96 shrink-0 border-r border-white/5 bg-black/20 hidden xl:flex flex-col overflow-y-auto custom-scrollbar">
                        <div className="p-10 space-y-12">
                            <div className="space-y-4">
                                <h2 className="text-4xl font-black tracking-tighter leading-none">Descubra <br/><span className="text-amber-500">Valor</span>.</h2>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed">Frameworks técnicos para líderes que constroem o futuro.</p>
                            </div>

                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-500 transition-colors"/>
                                <input 
                                    placeholder="Pesquisar artigos..." 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-amber-500/50 text-sm font-medium transition-all"
                                />
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                                    <Layers className="w-3 h-3"/> Tópicos de Engenharia
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    <button 
                                        onClick={() => setActiveTag(null)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all border ${!activeTag ? 'bg-amber-500 text-black border-amber-500' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/30'}`}
                                    >
                                        TODOS
                                    </button>
                                    {allTags.map(tag => (
                                        <button 
                                            key={tag} 
                                            onClick={() => setActiveTag(tag)}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all border ${activeTag === tag ? 'bg-amber-500 text-black border-amber-500' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/30'}`}
                                        >
                                            {tag.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </aside>
                )}

                <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#020203] relative">
                    {selectedPost ? (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <header className="relative h-[60vh] min-h-[500px] w-full flex items-end">
                                <div className="absolute inset-0">
                                    <img src={selectedPost.cover_image} className="w-full h-full object-cover opacity-40 grayscale-[0.5]" alt=""/>
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#020203] via-[#020203]/40 to-transparent"></div>
                                </div>
                                <div className="max-w-4xl mx-auto px-6 pb-20 relative z-10 w-full">
                                    <div className="flex flex-wrap gap-3 mb-8">
                                        {selectedPost.tags?.map(t => (
                                            <span key={t} className="px-4 py-1.5 bg-amber-500 text-black rounded-full text-[10px] font-black uppercase tracking-widest shadow-glow-amber">{t}</span>
                                        ))}
                                    </div>
                                    <h1 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tighter leading-[0.95]">{selectedPost.title}</h1>
                                    <div className="flex items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                        <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-amber-500"/> {new Date(selectedPost.created_at).toLocaleDateString()}</span>
                                        <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-amber-500"/> 8 min leitura</span>
                                    </div>
                                </div>
                            </header>

                            <div className="max-w-4xl mx-auto px-6 py-20">
                                <div 
                                    className="prose-shinko text-slate-300 leading-relaxed text-xl"
                                    dangerouslySetInnerHTML={{ __html: selectedPost.content || '' }}
                                />

                                {selectedPost.download_url && (
                                    <div className="mt-32 p-1 rounded-[3rem] bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 shadow-2xl">
                                        <div className="bg-[#0A0A0C] rounded-[2.8rem] p-10 md:p-20 relative overflow-hidden flex flex-col md:flex-row items-center gap-12">
                                            <div className="flex-1 space-y-6 text-center md:text-left">
                                                <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                    <Download className="w-8 h-8"/>
                                                </div>
                                                <h3 className="text-4xl font-black text-white tracking-tight">Material <span className="text-amber-500">Técnico</span>.</h3>
                                                <p className="text-slate-400 text-lg">Acesse o checklist de implementação e os assets originais deste framework: <strong>{selectedPost.download_title}</strong>.</p>
                                                <button onClick={handleDownloadClick} className="w-full md:w-auto px-12 py-5 bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-amber-500 transition-all flex items-center justify-center gap-3">
                                                    Baixar Agora <ArrowRight className="w-5 h-5"/>
                                                </button>
                                            </div>
                                            {selectedPost.download_image_url && (
                                                <div className="w-64 h-80 shrink-0 bg-white rounded-2xl shadow-2xl overflow-hidden ring-8 ring-white/5 rotate-3 hover:rotate-0 transition-transform duration-500">
                                                    <img src={selectedPost.download_image_url} className="w-full h-full object-cover" alt="Preview"/>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                
                                <footer className="mt-32 pt-12 border-t border-white/5 flex justify-between items-center">
                                    <button onClick={() => handleSelectPost(null)} className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">
                                        <ArrowLeft className="w-4 h-4"/> Voltar ao Feed
                                    </button>
                                    <div className="flex gap-4">
                                        <button className="p-3 bg-white/5 rounded-xl border border-white/10 hover:border-white/30 transition-all"><Share2 className="w-5 h-5"/></button>
                                        <button className="p-3 bg-white/5 rounded-xl border border-white/10 hover:border-white/30 transition-all"><Bookmark className="w-5 h-5"/></button>
                                    </div>
                                </footer>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 md:p-12 lg:p-20 max-w-7xl mx-auto space-y-20 animate-in fade-in duration-1000">
                            <div className="flex flex-col md:flex-row justify-between items-end gap-10">
                                <div className="space-y-4">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] font-black text-amber-500 uppercase tracking-widest">
                                        <Sparkles className="w-3 h-3"/> Insights Recém Sincronizados
                                    </div>
                                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none">
                                        Mente <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600">Shinkō</span>.
                                    </h1>
                                </div>
                                <div className="text-right hidden md:block">
                                    <div className="text-4xl font-black text-white">{filteredPosts.length}</div>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Artigos Disponíveis</div>
                                </div>
                            </div>

                            {filteredPosts.length === 0 ? (
                                <div className="py-40 text-center border-2 border-dashed border-white/5 rounded-[4rem] flex flex-col items-center gap-6">
                                    <Newspaper className="w-16 h-16 text-slate-800"/>
                                    <p className="text-slate-500 font-bold uppercase tracking-widest">Nenhum insight encontrado para os filtros.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
                                    {filteredPosts.map((post, idx) => (
                                        <div 
                                            key={post.id} 
                                            onClick={() => handleSelectPost(post)}
                                            className={`group cursor-pointer space-y-8 animate-in slide-in-from-bottom-12 duration-1000 delay-${idx * 100}`}
                                        >
                                            <div className="aspect-[16/10] rounded-[3rem] overflow-hidden bg-slate-900 border border-white/5 relative shadow-2xl group-hover:border-amber-500/30 transition-all duration-700 group-hover:-translate-y-2">
                                                <img 
                                                    src={post.cover_image} 
                                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-1000" 
                                                    alt=""
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                                <div className="absolute bottom-8 left-8 flex gap-2">
                                                    {post.tags?.slice(0, 1).map(t => (
                                                        <span key={t} className="px-4 py-1 bg-white/10 backdrop-blur-xl rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10">{t}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-4 px-2">
                                                <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-slate-500">
                                                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                                                    <div className="w-1 h-1 rounded-full bg-amber-500"></div>
                                                    <span>8 min read</span>
                                                </div>
                                                <h3 className="text-3xl md:text-4xl font-black text-white leading-tight group-hover:text-amber-500 transition-colors tracking-tight">
                                                    {post.title}
                                                </h3>
                                                <div className="flex items-center gap-2 text-[10px] font-black text-amber-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                                                    Ler Artigo Completo <ArrowRight className="w-4 h-4"/>
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

            {showLeadModal && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="w-full max-w-lg bg-[#0A0A0C] rounded-[3.5rem] p-12 shadow-[0_0_100px_rgba(245,158,11,0.15)] relative border border-amber-500/20 overflow-hidden animate-ios-pop">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                        
                        <button onClick={() => setShowLeadModal(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white p-2 bg-white/5 rounded-full"><X className="w-6 h-6"/></button>
                        
                        <div className="text-center mb-12">
                            <div className="w-20 h-20 bg-amber-500 rounded-[2rem] flex items-center justify-center text-black mx-auto mb-8 shadow-glow-amber">
                                <Download className="w-10 h-10"/>
                            </div>
                            <h3 className="text-3xl font-black text-white mb-4 tracking-tight">Liberar Acesso.</h3>
                            <p className="text-slate-400 font-medium">Informe seus dados técnicos para baixar o asset imediatamente em seu workspace.</p>
                        </div>

                        <form onSubmit={handleLeadSubmit} className="space-y-5">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                                <input required value={leadForm.name} onChange={e => setLeadForm({...leadForm, name: e.target.value})} className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-amber-500 transition-all font-bold" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Corporativo</label>
                                <input required type="email" value={leadForm.email} onChange={e => setLeadForm({...leadForm, email: e.target.value})} className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-amber-500 transition-all font-bold" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">WhatsApp</label>
                                <input required type="tel" value={leadForm.phone} onChange={e => setLeadForm({...leadForm, phone: e.target.value})} className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-amber-500 transition-all font-bold" />
                            </div>
                            
                            <button disabled={isSubmitting} className="w-full py-6 bg-white text-black font-black uppercase tracking-[0.2em] text-[11px] rounded-[1.8rem] shadow-xl hover:bg-amber-500 transition-all flex items-center justify-center gap-3 mt-8">
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <CheckCircle className="w-5 h-5"/>}
                                Sincronizar Download
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .prose-shinko h2 { font-size: 2.5rem; font-weight: 900; margin-top: 2em; margin-bottom: 1em; color: white; tracking: -0.02em; }
                .prose-shinko h3 { font-size: 1.8rem; font-weight: 800; margin-top: 1.5em; margin-bottom: 0.8em; color: white; }
                .prose-shinko p { margin-bottom: 2em; line-height: 1.8; }
                .prose-shinko b, .prose-shinko strong { color: white; font-weight: 800; }
                .prose-shinko blockquote { border-left: 4px solid #F59E0B; padding-left: 2rem; font-style: italic; color: #94a3b8; margin: 3rem 0; font-size: 1.5rem; }
                .prose-shinko ul { list-style: disc; padding-left: 2rem; margin-bottom: 2rem; }
                .prose-shinko li { margin-bottom: 0.5rem; }
                .prose-shinko img { border-radius: 3rem; margin: 4rem 0; width: 100%; border: 1px solid rgba(255,255,255,0.05); }
            `}</style>
        </div>
    );
};
