import React, { useState } from 'react';
import { CrmOpportunity } from '../types';
import { X, User, Building2, Save, Mail, Phone, MapPin } from 'lucide-react';

interface Props {
    entity: CrmOpportunity;
    type: 'contact' | 'company';
    onClose: () => void;
    onSave: (updatedOpp: CrmOpportunity) => void;
}

export const CrmEntityModal: React.FC<Props> = ({ entity, type, onClose, onSave }) => {
    const [data, setData] = useState<CrmOpportunity>(entity);

    const handleSave = () => {
        onSave(data);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="glass-panel w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-ios-pop border border-white/10 bg-slate-900/95">
                
                <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {type === 'contact' ? <User className="w-5 h-5 text-blue-500"/> : <Building2 className="w-5 h-5 text-purple-500"/>}
                        Editar {type === 'contact' ? 'Contato' : 'Empresa'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5"/>
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {type === 'contact' ? (
                        <>
                            <div>
                                <label className="text-xs text-slate-500 font-bold block mb-1">Nome Completo</label>
                                <input 
                                    value={data.contact.name} 
                                    onChange={e => setData({...data, contact: {...data.contact, name: e.target.value}})}
                                    className="w-full glass-input p-3 rounded-xl text-sm bg-black/20 border-white/10 text-white focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-bold block mb-1">Cargo</label>
                                <input 
                                    value={data.contact.role} 
                                    onChange={e => setData({...data, contact: {...data.contact, role: e.target.value}})}
                                    className="w-full glass-input p-3 rounded-xl text-sm bg-black/20 border-white/10 text-white focus:border-blue-500"
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-xs text-slate-500 font-bold block mb-1 flex items-center gap-1"><Mail className="w-3 h-3"/> Email</label>
                                    <input 
                                        value={data.contact.email} 
                                        onChange={e => setData({...data, contact: {...data.contact, email: e.target.value}})}
                                        className="w-full glass-input p-3 rounded-xl text-sm bg-black/20 border-white/10 text-white focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 font-bold block mb-1 flex items-center gap-1"><Phone className="w-3 h-3"/> Telefone</label>
                                    <input 
                                        value={data.contact.phone} 
                                        onChange={e => setData({...data, contact: {...data.contact, phone: e.target.value}})}
                                        className="w-full glass-input p-3 rounded-xl text-sm bg-black/20 border-white/10 text-white focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="text-xs text-slate-500 font-bold block mb-1">Nome da Empresa</label>
                                <input 
                                    value={data.company.name} 
                                    onChange={e => setData({...data, company: {...data.company, name: e.target.value}})}
                                    className="w-full glass-input p-3 rounded-xl text-sm bg-black/20 border-white/10 text-white focus:border-purple-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-500 font-bold block mb-1">CNPJ</label>
                                    <input 
                                        value={data.company.cnpj} 
                                        onChange={e => setData({...data, company: {...data.company, cnpj: e.target.value}})}
                                        className="w-full glass-input p-3 rounded-xl text-sm bg-black/20 border-white/10 text-white focus:border-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 font-bold block mb-1">Setor</label>
                                    <input 
                                        value={data.company.sector} 
                                        onChange={e => setData({...data, company: {...data.company, sector: e.target.value}})}
                                        className="w-full glass-input p-3 rounded-xl text-sm bg-black/20 border-white/10 text-white focus:border-purple-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-bold block mb-1 flex items-center gap-1"><MapPin className="w-3 h-3"/> Endereço</label>
                                <textarea 
                                    value={data.company.address} 
                                    onChange={e => setData({...data, company: {...data.company, address: e.target.value}})}
                                    className="w-full glass-input p-3 rounded-xl text-sm bg-black/20 border-white/10 text-white focus:border-purple-500 resize-none h-24"
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white font-bold text-sm transition-colors">Cancelar</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 transition-all active:scale-95">
                        <Save className="w-4 h-4"/> Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};