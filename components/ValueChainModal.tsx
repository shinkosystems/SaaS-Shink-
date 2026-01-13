
import React, { useState, useEffect } from 'react';
import { X, Layers, Briefcase, Tag, Target, Link as LinkIcon, Save, Loader2, Plus } from 'lucide-react';
import { createValueChainTask } from '../services/valueChainService';
import { fetchProjects } from '../services/projectService';
import { DbProject, ProcessCategory } from '../types';

interface Props {
    organizationId: number;
    onClose: () => void;
    onSuccess: () => void;
}

const CATEGORIES: ProcessCategory[] = [
    'Apoio-Adm', 'Apoio-Gestão', 'Primária-Modelagem', 'Primária-Interface', 'Primária-Lógica', 'Primária-Marketing'
];

export const ValueChainModal: React.FC<Props> = ({ organizationId, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState<DbProject[]>([]);
    
    const [formData, setFormData] = useState({
        title: '',
        category: 'Primária-Modelagem' as ProcessCategory,
        projectId: '',
        weight: 1,
        evidenceUrl: ''
    });

    useEffect(() => {
        fetchProjects(organizationId).then(setProjects);
    }, [organizationId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.projectId) return alert("Preencha os campos obrigatórios.");
        
        setLoading(true);
        const success = await createValueChainTask({
            title: formData.title,
            category: formData.category,
            projeto_id: Number(formData.projectId),
            estimated_cost_weight: formData.weight,
            evidence_url: formData.evidenceUrl,
            organizacao_id: organizationId,
            status: 'To-do'
        });

        if (success) {
            onSuccess();
            onClose();
        } else {
            alert("Erro ao salvar processo.");
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-xl bg-white dark:bg-[#0A0A0C] rounded-[3rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-ios-pop flex flex-col max-h-[95vh]">
                
                <header className="p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/5 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-black shadow-lg shadow-amber-500/20">
                            <Plus className="w-6 h-6 stroke-[3px]"/>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Novo Processo.</h2>
                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Alimentação da Cadeia de Valor</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-all"><X className="w-6 h-6 text-slate-400"/></button>
                </header>

                <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Atividade / Processo</label>
                        <input 
                            required autoFocus value={formData.title} 
                            onChange={e => setFormData({...formData, title: e.target.value})}
                            placeholder="Ex: Refinamento de Interface do Dashboard"
                            className="w-full p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-base font-bold outline-none focus:border-amber-500 transition-all dark:text-white"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Layers className="w-3 h-3"/> Categoria
                            </label>
                            <select 
                                value={formData.category} 
                                onChange={e => setFormData({...formData, category: e.target.value as any})}
                                className="w-full p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-bold outline-none cursor-pointer dark:text-white"
                            >
                                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Briefcase className="w-3 h-3"/> Projeto Alvo
                            </label>
                            <select 
                                required value={formData.projectId} 
                                onChange={e => setFormData({...formData, projectId: e.target.value})}
                                className="w-full p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-bold outline-none cursor-pointer dark:text-white"
                            >
                                <option value="">Selecionar Projeto...</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Target className="w-3 h-3"/> Peso do Rateio
                            </label>
                            <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                <input 
                                    type="range" min="1" max="10" step="1" 
                                    value={formData.weight} 
                                    onChange={e => setFormData({...formData, weight: parseInt(e.target.value)})}
                                    className="flex-1 accent-amber-500 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer"
                                />
                                <span className="text-xl font-black text-amber-500 min-w-[30px] text-right">{formData.weight}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <LinkIcon className="w-3 h-3"/> URL de Evidência
                            </label>
                            <input 
                                value={formData.evidenceUrl} 
                                onChange={e => setFormData({...formData, evidenceUrl: e.target.value})}
                                placeholder="https://link-para-entrega.com"
                                className="w-full p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-medium outline-none focus:border-amber-500 transition-all dark:text-white"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-6 mt-6 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-30"
                    >
                        {loading ? <Loader2 className="animate-spin w-5 h-5"/> : <Save className="w-5 h-5"/>}
                        Sincronizar Processo
                    </button>
                </form>
            </div>
        </div>
    );
};
