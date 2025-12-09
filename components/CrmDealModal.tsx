
import React, { useState } from 'react';
import { CrmOpportunity, CrmActivity } from '../types';
import { X, User, Building2, Calendar, Phone, Mail, Globe, MapPin, CheckCircle2, Clock, Plus, Trash2, Save, MessageSquare } from 'lucide-react';

interface Props {
    opportunity: CrmOpportunity;
    onClose: () => void;
    onSave: (opp: CrmOpportunity) => void;
    onDelete: (id: string) => void;
}

export const CrmDealModal: React.FC<Props> = ({ opportunity, onClose, onSave, onDelete }) => {
    const [formData, setFormData] = useState<CrmOpportunity>({ ...opportunity });
    const [activeTab, setActiveTab] = useState<'details' | 'activities'>('details');
    const [newActivity, setNewActivity] = useState<Partial<CrmActivity>>({ type: 'call', status: 'pending' });

    const handleSave = () => {
        onSave(formData);
        onClose();
    };

    const handleAddActivity = () => {
        if (!newActivity.subject) return;
        
        const activity: CrmActivity = {
            id: crypto.randomUUID(),
            type: newActivity.type || 'call',
            subject: newActivity.subject,
            date: newActivity.date || new Date().toISOString().split('T')[0],
            status: 'pending',
            owner: 'Eu' // Em produção, pegar do usuário logado
        };

        setFormData(prev => ({
            ...prev,
            activities: [activity, ...(prev.activities || [])]
        }));
        setNewActivity({ type: 'call', subject: '', date: '', status: 'pending' });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="glass-panel w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-ios-pop border border-white/10 bg-slate-900/95">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            {formData.title}
                        </h2>
                        <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">
                            {formData.stage.toUpperCase()} • R$ {formData.value.toLocaleString()}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => onDelete(formData.id)} className="p-2 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors">
                            <Trash2 className="w-5 h-5"/>
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors">
                            <X className="w-5 h-5"/>
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10 px-6 gap-6">
                    <button 
                        onClick={() => setActiveTab('details')}
                        className={`py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'details' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                    >
                        Detalhes (Contato/Empresa)
                    </button>
                    <button 
                        onClick={() => setActiveTab('activities')}
                        className={`py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'activities' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                    >
                        Atividades ({formData.activities?.length || 0})
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    
                    {activeTab === 'details' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Contact Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase border-b border-white/10 pb-2 flex items-center gap-2">
                                    <User className="w-4 h-4"/> Contato Principal
                                </h3>
                                <div>
                                    <label className="text-xs text-slate-500 font-bold block mb-1">Nome Completo</label>
                                    <input 
                                        value={formData.contact.name} 
                                        onChange={e => setFormData({...formData, contact: {...formData.contact, name: e.target.value}})}
                                        className="w-full glass-input p-2 rounded-lg text-sm bg-black/20 border-white/10 focus:border-emerald-500 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 font-bold block mb-1">Cargo / Função</label>
                                    <input 
                                        value={formData.contact.role} 
                                        onChange={e => setFormData({...formData, contact: {...formData.contact, role: e.target.value}})}
                                        className="w-full glass-input p-2 rounded-lg text-sm bg-black/20 border-white/10 focus:border-emerald-500 text-white"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-500 font-bold block mb-1">Email</label>
                                        <input 
                                            value={formData.contact.email} 
                                            onChange={e => setFormData({...formData, contact: {...formData.contact, email: e.target.value}})}
                                            className="w-full glass-input p-2 rounded-lg text-sm bg-black/20 border-white/10 focus:border-emerald-500 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 font-bold block mb-1">Telefone</label>
                                        <input 
                                            value={formData.contact.phone} 
                                            onChange={e => setFormData({...formData, contact: {...formData.contact, phone: e.target.value}})}
                                            className="w-full glass-input p-2 rounded-lg text-sm bg-black/20 border-white/10 focus:border-emerald-500 text-white"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 font-bold block mb-1">Origem do Lead</label>
                                    <input 
                                        value={formData.contact.source} 
                                        onChange={e => setFormData({...formData, contact: {...formData.contact, source: e.target.value}})}
                                        className="w-full glass-input p-2 rounded-lg text-sm bg-black/20 border-white/10 focus:border-emerald-500 text-white"
                                    />
                                </div>
                            </div>

                            {/* Company Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase border-b border-white/10 pb-2 flex items-center gap-2">
                                    <Building2 className="w-4 h-4"/> Empresa / Conta
                                </h3>
                                <div>
                                    <label className="text-xs text-slate-500 font-bold block mb-1">Nome da Empresa</label>
                                    <input 
                                        value={formData.company.name} 
                                        onChange={e => setFormData({...formData, company: {...formData.company, name: e.target.value}})}
                                        className="w-full glass-input p-2 rounded-lg text-sm bg-black/20 border-white/10 focus:border-emerald-500 text-white"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-500 font-bold block mb-1">CNPJ</label>
                                        <input 
                                            value={formData.company.cnpj} 
                                            onChange={e => setFormData({...formData, company: {...formData.company, cnpj: e.target.value}})}
                                            className="w-full glass-input p-2 rounded-lg text-sm bg-black/20 border-white/10 focus:border-emerald-500 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 font-bold block mb-1">Setor</label>
                                        <input 
                                            value={formData.company.sector} 
                                            onChange={e => setFormData({...formData, company: {...formData.company, sector: e.target.value}})}
                                            className="w-full glass-input p-2 rounded-lg text-sm bg-black/20 border-white/10 focus:border-emerald-500 text-white"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 font-bold block mb-1">Endereço</label>
                                    <textarea 
                                        value={formData.company.address} 
                                        onChange={e => setFormData({...formData, company: {...formData.company, address: e.target.value}})}
                                        className="w-full glass-input p-2 rounded-lg text-sm bg-black/20 border-white/10 focus:border-emerald-500 text-white resize-none h-20"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'activities' && (
                        <div className="space-y-6">
                            {/* New Activity Input */}
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Nova Atividade</h4>
                                <div className="flex gap-2 mb-2">
                                    <select 
                                        value={newActivity.type} 
                                        onChange={e => setNewActivity({...newActivity, type: e.target.value as any})}
                                        className="bg-black/30 text-white text-sm rounded-lg p-2 border border-white/10 outline-none"
                                    >
                                        <option value="call">📞 Ligação</option>
                                        <option value="email">✉️ Email</option>
                                        <option value="meeting">📅 Reunião</option>
                                        <option value="task">✅ Tarefa</option>
                                    </select>
                                    <input 
                                        type="text" 
                                        placeholder="Assunto (ex: Ligar para agendar demo)"
                                        value={newActivity.subject}
                                        onChange={e => setNewActivity({...newActivity, subject: e.target.value})}
                                        className="flex-1 bg-black/30 text-white text-sm rounded-lg p-2 border border-white/10 outline-none focus:border-emerald-500"
                                    />
                                    <input 
                                        type="date" 
                                        value={newActivity.date}
                                        onChange={e => setNewActivity({...newActivity, date: e.target.value})}
                                        className="bg-black/30 text-white text-sm rounded-lg p-2 border border-white/10 outline-none"
                                    />
                                    <button 
                                        onClick={handleAddActivity}
                                        className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                                    >
                                        <Plus className="w-5 h-5"/>
                                    </button>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="space-y-4">
                                {formData.activities?.map(act => (
                                    <div key={act.id} className="flex gap-4 group">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${act.status === 'completed' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'bg-slate-800 border-slate-600 text-slate-400'}`}>
                                                {act.type === 'call' && <Phone className="w-4 h-4"/>}
                                                {act.type === 'email' && <Mail className="w-4 h-4"/>}
                                                {act.type === 'meeting' && <Calendar className="w-4 h-4"/>}
                                                {act.type === 'task' && <CheckCircle2 className="w-4 h-4"/>}
                                            </div>
                                            <div className="w-px h-full bg-white/10 my-2 group-last:hidden"></div>
                                        </div>
                                        <div className="flex-1 pb-4">
                                            <div className="bg-white/5 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                                <div className="flex justify-between items-start">
                                                    <span className={`text-sm font-bold ${act.status === 'completed' ? 'text-slate-500 line-through' : 'text-white'}`}>
                                                        {act.subject}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 uppercase font-bold">{act.date}</span>
                                                </div>
                                                <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                                                    <span>{act.owner}</span>
                                                    <span>•</span>
                                                    <button 
                                                        onClick={() => {
                                                            const updatedActivities = formData.activities?.map(a => a.id === act.id ? { ...a, status: a.status === 'completed' ? 'pending' : 'completed' } : a) as any;
                                                            setFormData({...formData, activities: updatedActivities});
                                                        }}
                                                        className="hover:text-white underline"
                                                    >
                                                        {act.status === 'completed' ? 'Reabrir' : 'Concluir'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!formData.activities || formData.activities.length === 0) && (
                                    <div className="text-center text-slate-500 py-8 text-sm">
                                        Nenhuma atividade registrada.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-2 text-slate-400 hover:text-white font-bold text-sm transition-colors">Cancelar</button>
                    <button onClick={handleSave} className="px-8 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 transition-all active:scale-95">
                        <Save className="w-4 h-4"/> Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
};
