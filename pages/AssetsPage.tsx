
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, Filter, Image as ImageIcon, FileText, Download, 
    ExternalLink, X, Eye, Calendar, HardDrive, Package, 
    ArrowUpRight, Loader2, Link as LinkIcon, Trash2, Maximize2
} from 'lucide-react';
import { fetchAllTasks, fetchProjects } from '../services/projectService';
import { Attachment, DbTask, DbProject } from '../types';

interface Props {
    organizationId?: number;
}

export const AssetsPage: React.FC<Props> = ({ organizationId }) => {
    const [tasks, setTasks] = useState<DbTask[]>([]);
    const [projects, setProjects] = useState<DbProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterProject, setFilterProject] = useState<string>('all');
    const [selectedAsset, setSelectedAsset] = useState<any | null>(null);

    useEffect(() => {
        if (organizationId) {
            loadData();
        }
    }, [organizationId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [tData, pData] = await Promise.all([
                fetchAllTasks(organizationId!),
                fetchProjects(organizationId!)
            ]);
            setTasks(tData);
            setProjects(pData);
        } catch (e) {
            console.error("Erro ao carregar assets:", e);
        } finally {
            setLoading(false);
        }
    };

    const assets = useMemo(() => {
        const allAssets: any[] = [];
        tasks.forEach(task => {
            if (task.anexos && Array.isArray(task.anexos)) {
                task.anexos.forEach(att => {
                    allAssets.push({
                        ...att,
                        taskId: task.id,
                        taskTitle: task.titulo,
                        projectId: task.projeto,
                        projectData: task.projetoData,
                    });
                });
            }
        });
        return allAssets.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    }, [tasks]);

    const filteredAssets = useMemo(() => {
        return assets.filter(asset => {
            const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesProject = filterProject === 'all' || asset.projectId?.toString() === filterProject;
            return matchesSearch && matchesProject;
        });
    }, [assets, searchTerm, filterProject]);

    const stats = useMemo(() => {
        const total = assets.length;
        const images = assets.filter(a => a.type?.startsWith('image/')).length;
        const docs = total - images;
        return { total, images, docs };
    }, [assets]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin text-amber-500"/>
                <span className="text-[10px] font-black uppercase tracking-widest">Acessando Cofre de Assets...</span>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-6 lg:p-12 space-y-10 animate-in fade-in duration-700 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-transparent pb-32">
            
            {/* Header Industrial */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[9px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-4">
                        <HardDrive className="w-3 h-3"/> Repositório Central
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">
                        Cofre de <span className="text-amber-500">Assets</span>.
                    </h1>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-4 flex items-center gap-2">
                        <Package className="w-3.5 h-3.5"/> {stats.total} arquivos sincronizados na organização
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                        <input 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            placeholder="Buscar arquivo por nome..." 
                            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-[#333] rounded-2xl text-sm font-bold outline-none focus:border-amber-500 transition-all shadow-sm"
                        />
                    </div>
                    <select 
                        value={filterProject} 
                        onChange={e => setFilterProject(e.target.value)}
                        className="p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-[#333] rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer appearance-none min-w-[200px]"
                    >
                        <option value="all">TODOS OS PROJETOS</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.nome.toUpperCase()}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Quick KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl"><ImageIcon className="w-5 h-5"/></div>
                        <div>
                            <div className="text-[9px] font-black text-slate-400 uppercase">Imagens</div>
                            <div className="text-xl font-black">{stats.images}</div>
                        </div>
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg">Assets Visuais</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl"><FileText className="w-5 h-5"/></div>
                        <div>
                            <div className="text-[9px] font-black text-slate-400 uppercase">Documentos</div>
                            <div className="text-xl font-black">{stats.docs}</div>
                        </div>
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg">Arquivos Técnicos</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl"><Download className="w-5 h-5"/></div>
                        <div>
                            <div className="text-[9px] font-black text-slate-400 uppercase">Acessibilidade</div>
                            <div className="text-xl font-black">Global</div>
                        </div>
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg">Snapshot Cloud</div>
                </div>
            </div>

            {/* Gallery Grid */}
            {filteredAssets.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-40 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[3rem] opacity-30 gap-4">
                    <Package className="w-16 h-16"/>
                    <span className="text-xs font-black uppercase tracking-[0.3em]">Nenhum asset encontrado</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {filteredAssets.map(asset => {
                        const isImage = asset.type?.startsWith('image/');
                        return (
                            <div 
                                key={asset.id} 
                                className="group bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-[2.2rem] overflow-hidden flex flex-col hover:shadow-2xl transition-all hover:-translate-y-1 hover:border-amber-500/30"
                            >
                                <div 
                                    className="aspect-square bg-slate-50 dark:bg-black/40 relative overflow-hidden flex items-center justify-center cursor-pointer"
                                    onClick={() => isImage && setSelectedAsset(asset)}
                                >
                                    {isImage ? (
                                        <img src={asset.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={asset.name}/>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                                                <FileText className="w-8 h-8"/>
                                            </div>
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{asset.type?.split('/')[1] || 'FILE'}</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        {isImage && <button className="p-3 bg-white text-black rounded-xl hover:scale-110 transition-all"><Maximize2 className="w-4 h-4"/></button>}
                                        <a href={asset.url} target="_blank" className="p-3 bg-amber-500 text-black rounded-xl hover:scale-110 transition-all"><Download className="w-4 h-4"/></a>
                                    </div>
                                </div>
                                
                                <div className="p-6 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-amber-500 transition-colors" title={asset.name}>{asset.name}</h3>
                                            <p className="text-[9px] text-slate-500 mt-1 uppercase font-bold">{asset.size} • {new Date(asset.uploadedAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="pt-4 border-t border-slate-50 dark:border-white/5 space-y-3">
                                        <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
                                            <span>Projeto</span>
                                            <span className="text-amber-500 truncate max-w-[120px]">{asset.projectData?.nome || 'Ad-hoc'}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
                                            <span>Tarefa</span>
                                            <span className="text-slate-600 dark:text-slate-300 truncate max-w-[120px]">{asset.taskTitle}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Lightbox Modal */}
            {selectedAsset && (
                <div className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
                    <button 
                        onClick={() => setSelectedAsset(null)}
                        className="absolute top-8 right-8 p-4 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all z-[2001]"
                    >
                        <X className="w-8 h-8"/>
                    </button>
                    
                    <div className="max-w-6xl w-full max-h-full flex flex-col gap-6 items-center">
                        <img src={selectedAsset.url} className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl ring-1 ring-white/10" alt=""/>
                        <div className="text-center space-y-3">
                            <h2 className="text-2xl font-black text-white tracking-tight">{selectedAsset.name}</h2>
                            <div className="flex gap-4 items-center justify-center">
                                <span className="text-[10px] font-black text-slate-500 uppercase bg-white/5 px-3 py-1.5 rounded-lg">{selectedAsset.size}</span>
                                <span className="text-[10px] font-black text-amber-500 uppercase bg-amber-500/10 px-3 py-1.5 rounded-lg">{selectedAsset.projectData?.nome || 'PROJETO AD-HOC'}</span>
                                <a 
                                    href={selectedAsset.url} 
                                    download 
                                    className="flex items-center gap-2 px-6 py-2 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 transition-all"
                                >
                                    <Download className="w-3 h-3"/> Download Asset
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
