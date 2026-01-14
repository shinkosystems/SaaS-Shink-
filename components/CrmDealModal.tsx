
import React, { useState } from 'react';
import { CrmOpportunity, CrmActivity } from '../types';
import { X, User, Building2, Calendar, Phone, Mail, Globe, MapPin, CheckCircle2, Clock, Plus, Trash2, Save, MessageSquare, DollarSign } from 'lucide-react';

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
            <div className="glass-panel w-full max-w-4xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-ios-pop border border-white/10 bg-slate-900/95">
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-2">
                            {formData.title}
                        </h2>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">
                            {formData.stage.toUpperCase()} • <span className="text-amber-500">R$ {formData.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </span>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => onDelete(formData.id)} className="p-3 hover:bg-red-500/20 text-red-500 rounded-2xl transition-colors">
                            <Trash2 className="w-5 h-5"/>
                        </button>
                        <button onClick={onClose} className="p-3 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl transition-colors">
                            <X className="w-6 h-6"/>
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10 px-8 gap-10">
                    <button 
                        onClick={() => setActiveTab('details')}
                        className={`py-4 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'details' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                    >
                        Detalhes (Contato/Empresa)
                    </button>
                    <button 
                        onClick={() => setActiveTab('activities')}
                        className={`py-4 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'activities' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                    >
                        Atividades ({formData.activities?.length || 0})
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-900/50">
                    
                    {activeTab === 'details' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            {/* Contact Section */}
                            <div className="space-y-6">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] border-b border-white/5 pb-3 flex items-center gap-2">
                                    <User className="w-4 h-4 text-amber-500"/> Contato Principal
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 ml-1">Nome Completo</label>
                                        <input 
                                            value={formData.contact.name} 
                                            onChange={e => setFormData({...formData, contact: {...formData.contact, name: e.target.value}})}
                                            className="w-full glass-input p-4 rounded-2xl text-sm font-bold bg-black/20 border-white/10 focus:border-amber-500 text-white outline-none transition-all"
                                            placeholder="Ex: Leonardo Matos"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 ml-1">Cargo / Função</label>
                                        <input 
                                            value={formData.contact.role} 
                                            onChange={e => setFormData({...formData, contact: {...formData.contact, role: e.target.value}})}
                                            className="w-full glass-input p-4 rounded-2xl text-sm font-bold bg-black/20 border-white/10 focus:border-amber-500 text-white outline-none transition-all"
                                            placeholder="Ex: CEO"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 ml-1">Email</label>
                                            <input 
                                                value={formData.contact.email} 
                                                onChange={e => setFormData({...formData, contact: {...formData.contact, email: e.target.value}})}
                                                className="w-full glass-input p-4 rounded-2xl text-xs font-bold bg-black/20 border-white/10 focus:border-amber-500 text-white outline-none transition-all"
                                                placeholder="leonardo@homosapiens.age"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 ml-1">Telefone</label>
                                            <input 
                                                value={formData.contact.phone} 
                                                onChange={e => setFormData({...formData, contact: {...formData.contact, phone: e.target.value}})}
                                                className="w-full glass-input p-4 rounded-2xl text-xs font-bold bg-black/20 border-white/10 focus:border-amber-500 text-white outline-none transition-all"
                                                placeholder="+55 11 94681-1873"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 ml-1">Origem do Lead</label>
                                        <input 
                                            value={formData.contact.source} 
                                            onChange={e => setFormData({...formData, contact: {...formData.contact, source: e.target.value}})}
                                            className="w-full glass-input p-4 rounded-2xl text-sm font-bold bg-black/20 border-white/10 focus:border-amber-500 text-white outline-none transition-all"
                                            placeholder="Networking"
                                        />
                                    </div>
                                </div>

                                {/* FINANCE SECTION */}
                                <div className="pt-6">
                                    <div className="bg-amber-500/5 border border-amber-500/10 p-6 rounded-[2rem] space-y-4">
                                        <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] flex items-center gap-2">
                                            <DollarSign className="w-4 h-4"/> Valor da Proposta
                                        </h4>
                                        <div className="relative group">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-amber-500/50">R$</span>
                                            <input 
                                                type="number"
                                                value={formData.value} 
                                                onChange={e => setFormData({...formData, value: Number(e.target.value)})}
                                                className="w-full glass-input p-5 pl-12 rounded-[1.5rem] text-3xl font-black bg-black/40 border-amber-500/20 focus:border-amber-500 text-amber-500 outline-none transition-all"
                                                placeholder="0,00"
                                            />
                                        </div>
                                        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest ml-1">Defina o valor bruto total desta negociação.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Company Section */}
                            <div className="space-y-6">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] border-b border-white/5 pb-3 flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-amber-500"/> Empresa / Conta
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 ml-1">Nome da Empresa</label>
                                        <input 
                                            value={formData.company.name} 
                                            onChange={e => setFormData({...formData, company: {...formData.company, name: e.target.value}})}
                                            className="w-full glass-input p-4 rounded-2xl text-sm font-bold bg-black/20 border-white/10 focus:border-amber-500 text-white outline-none transition-all"
                                            placeholder="Ex: SAV"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 ml-1">CNPJ</label>
                                            <input 
                                                value={formData.company.cnpj} 
                                                onChange={e => setFormData({...formData, company: {...formData.company, cnpj: e.target.value}})}
                                                className="w-full glass-input p-4 rounded-2xl text-xs font-bold bg-black/20 border-white/10 focus:border-amber-500 text-white outline-none transition-all"
                                                placeholder="-"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 ml-1">Setor</label>
                                            <input 
                                                value={formData.company.sector} 
                                                onChange={e => setFormData({...formData, company: {...formData.company, sector: e.target.value}})}
                                                className="w-full glass-input p-4 rounded-2xl text-xs font-bold bg-black/20 border-white/10 focus:border-amber-500 text-white outline-none transition-all"
                                                placeholder="-"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 ml-1">Endereço / Contexto</label>
                                        <textarea 
                                            value={formData.company.address} 
                                            onChange={e => setFormData({...formData, company: {...formData.company, address: e.target.value}})}
                                            className="w-full glass-input p-5 rounded-[1.8rem] text-sm font-medium bg-black/20 border-white/10 focus:border-amber-500 text-white outline-none transition-all resize-none h-32 leading-relaxed"
                                            placeholder="Trabalhar marketing e tráfego."
                                        />
                                    </div>
                                    <div className="pt-4">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1 flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5 text-blue-500"/> Previsão de Fechamento
                                        </label>
                                        <input 
                                            type="date"
                                            value={formData.expectedCloseDate ? formData.expectedCloseDate.split('T')[0] : ''} 
                                            onChange={e => setFormData({...formData, expectedCloseDate: e.target.value})}
                                            className="w-full glass-input p-4 rounded-2xl text-xs font-black uppercase bg-black/20 border-white/10 focus:border-blue-500 text-white outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'activities' && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            {/* New Activity Input */}
                            <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 shadow-xl">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Novo Registro de Interação</h4>
                                <div className="flex flex-col md:flex-row gap-3">
                                    <select 
                                        value={newActivity.type} 
                                        onChange={e => setNewActivity({...newActivity, type: e.target.value as any})}
                                        className="bg-black/30 text-white text-xs font-bold rounded-xl p-3 border border-white/10 outline-none"
                                    >
                                        <option value="call">📞 Ligação</option>
                                        <option value="email">✉️ Email</option>
                                        <option value="meeting">📅 Reunião</option>
                                        <option value="task">✅ Tarefa</option>
                                    </select>
                                    <input 
                                        type="text" 
                                        placeholder="Assunto da atividade..."
                                        value={newActivity.subject}
                                        onChange={e => setNewActivity({...newActivity, subject: e.target.value})}
                                        className="flex-1 bg-black/30 text-white text-sm font-medium rounded-xl p-3 border border-white/10 outline-none focus:border-emerald-500"
                                    />
                                    <input 
                                        type="date" 
                                        value={newActivity.date}
                                        onChange={e => setNewActivity({...newActivity, date: e.target.value})}
                                        className="bg-black/30 text-white text-xs font-black rounded-xl p-3 border border-white/10 outline-none"
                                    />
                                    <button 
                                        onClick={handleAddActivity}
                                        className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-lg active:scale-95"
                                    >
                                        <Plus className="w-6 h-6"/>
                                    </button>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="space-y-6">
                                {formData.activities?.map((act, idx) => (
                                    <div key={act.id} className="flex gap-6 group animate-in slide-in-from-left-4" style={{ animationDelay: `${idx * 100}ms` }}>
                                        <div className="flex flex-col items-center">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all ${act.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-slate-800 border-slate-600 text-slate-400'}`}>
                                                {act.type === 'call' && <Phone className="w-5 h-5"/>}
                                                {act.type === 'email' && <Mail className="w-5 h-5"/>}
                                                {act.type === 'meeting' && <Calendar className="w-5 h-5"/>}
                                                {act.type === 'task' && <CheckCircle2 className="w-5 h-5"/>}
                                            </div>
                                            <div className="w-px h-full bg-white/10 my-2 group-last:hidden"></div>
                                        </div>
                                        <div className="flex-1 pb-6">
                                            <div className="bg-white/5 p-5 rounded-[1.8rem] border border-white/5 hover:border-white/10 transition-all shadow-soft group-hover:bg-white/[0.08]">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className={`text-base font-bold ${act.status === 'completed' ? 'text-slate-600 line-through' : 'text-white'}`}>
                                                        {act.subject}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{new Date(act.date).toLocaleDateString('pt-BR')}</span>
                                                </div>
                                                <div className="mt-3 flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                                                    <span className="text-slate-500">Dono: <span className="text-slate-300">{act.owner}</span></span>
                                                    <button 
                                                        onClick={() => {
                                                            const updatedActivities = formData.activities?.map(a => a.id === act.id ? { ...a, status: a.status === 'completed' ? 'pending' : 'completed' } : a) as any;
                                                            setFormData({...formData, activities: updatedActivities});
                                                        }}
                                                        className={`px-3 py-1 rounded-lg transition-all ${act.status === 'completed' ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black'}`}
                                                    >
                                                        {act.status === 'completed' ? 'Reabrir Registro' : 'Marcar como Concluído'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!formData.activities || formData.activities.length === 0) && (
                                    <div className="text-center py-20 bg-black/10 rounded-[2rem] border-2 border-dashed border-white/5">
                                        <MessageSquare className="w-12 h-12 text-slate-700 mx-auto mb-4 opacity-30"/>
                                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhum histórico de atividades para este lead.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-8 border-t border-white/10 bg-white/5 flex justify-between items-center shrink-0">
                    <button onClick={onClose} className="px-6 py-2 text-slate-500 hover:text-red-500 font-black text-[11px] uppercase tracking-[0.2em] transition-all">Descartar Mudanças</button>
                    <button onClick={handleSave} className="px-12 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[1.8rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex items-center gap-4 transition-all hover:scale-[1.02] active:scale-95">
                        <Save className="w-5 h-5"/> Sincronizar Oportunidade
                    </button>
                </div>
            </div>
        </div>
    );
};
