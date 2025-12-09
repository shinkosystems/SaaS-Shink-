
import React, { useState } from 'react';
import { CrmOpportunity } from '../types';
import { CheckCircle, X, User, DollarSign, Calendar, FileText, Loader2, Building2 } from 'lucide-react';
import { FinalizeDealPayload } from '../services/crmService';

interface Props {
    opportunity: CrmOpportunity;
    onClose: () => void;
    onConfirm: (payload: FinalizeDealPayload) => void;
}

export const CrmWonModal: React.FC<Props> = ({ opportunity, onClose, onConfirm }) => {
    const [isLoading, setIsLoading] = useState(false);
    
    // Client Form
    const [clientName, setClientName] = useState(opportunity.company.name || opportunity.contact.name || '');
    const [clientEmail, setClientEmail] = useState(opportunity.contact.email || '');
    const [clientPhone, setClientPhone] = useState(opportunity.contact.phone || '');
    const [clientDoc, setClientDoc] = useState(opportunity.company.cnpj || '');
    const [clientType, setClientType] = useState<'Física' | 'Jurídica'>(opportunity.company.cnpj ? 'Jurídica' : 'Física');
    const [clientAddress, setClientAddress] = useState(opportunity.company.address || '');

    // Financial Form
    const [amount, setAmount] = useState(opportunity.value);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isContract, setIsContract] = useState(true); // Default to recurring for SaaS usually
    const [contractMonths, setContractMonths] = useState(12);

    const handleSubmit = () => {
        if (!clientName) {
            alert("Nome do cliente é obrigatório.");
            return;
        }

        setIsLoading(true);
        const payload: FinalizeDealPayload = {
            opportunityId: opportunity.id,
            clientData: {
                name: clientName,
                email: clientEmail,
                phone: clientPhone,
                document: clientDoc,
                type: clientType,
                address: clientAddress
            },
            financialData: {
                amount: amount,
                date: date,
                description: `Venda: ${opportunity.title}`,
                isContract: isContract,
                months: isContract ? contractMonths : undefined
            }
        };
        
        onConfirm(payload);
        // Loading state persists until parent closes or handles error
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
            <div className="glass-panel w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-ios-pop border border-emerald-500/30 bg-slate-900/95 relative">
                
                {/* Header */}
                <div className="bg-emerald-600/20 px-6 py-6 border-b border-emerald-500/30 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <CheckCircle className="w-8 h-8 text-emerald-500"/> Negócio Fechado!
                        </h2>
                        <p className="text-emerald-200/80 mt-1">
                            Parabéns! Confirme os dados para gerar o contrato e a fatura.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-6 h-6"/></button>
                </div>

                <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    
                    {/* Section 1: Client Data */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-white/10 pb-2 flex items-center gap-2">
                            <User className="w-4 h-4"/> Dados do Novo Cliente
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Nome do Cliente / Razão Social</label>
                                <input 
                                    value={clientName} 
                                    onChange={e => setClientName(e.target.value)} 
                                    className="w-full glass-input p-3 rounded-xl text-sm outline-none focus:border-emerald-500 text-white bg-black/20 border-white/10"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Tipo de Pessoa</label>
                                <select 
                                    value={clientType} 
                                    onChange={e => setClientType(e.target.value as any)} 
                                    className="w-full glass-input p-3 rounded-xl text-sm outline-none focus:border-emerald-500 text-white bg-black/20 border-white/10"
                                >
                                    <option value="Jurídica" className="bg-slate-900">Pessoa Jurídica</option>
                                    <option value="Física" className="bg-slate-900">Pessoa Física</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">{clientType === 'Jurídica' ? 'CNPJ' : 'CPF'}</label>
                                <input 
                                    value={clientDoc} 
                                    onChange={e => setClientDoc(e.target.value)} 
                                    className="w-full glass-input p-3 rounded-xl text-sm outline-none focus:border-emerald-500 text-white bg-black/20 border-white/10"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Email Financeiro</label>
                                <input 
                                    value={clientEmail} 
                                    onChange={e => setClientEmail(e.target.value)} 
                                    className="w-full glass-input p-3 rounded-xl text-sm outline-none focus:border-emerald-500 text-white bg-black/20 border-white/10"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Telefone</label>
                                <input 
                                    value={clientPhone} 
                                    onChange={e => setClientPhone(e.target.value)} 
                                    className="w-full glass-input p-3 rounded-xl text-sm outline-none focus:border-emerald-500 text-white bg-black/20 border-white/10"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Transaction Data */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-white/10 pb-2 flex items-center gap-2">
                            <DollarSign className="w-4 h-4"/> Faturamento Inicial
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Valor do Fechamento (R$)</label>
                                <input 
                                    type="number"
                                    value={amount} 
                                    onChange={e => setAmount(Number(e.target.value))} 
                                    className="w-full glass-input p-3 rounded-xl text-sm outline-none focus:border-emerald-500 text-white bg-black/20 border-white/10 font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Data de Faturamento</label>
                                <input 
                                    type="date"
                                    value={date} 
                                    onChange={e => setDate(e.target.value)} 
                                    className="w-full glass-input p-3 rounded-xl text-sm outline-none focus:border-emerald-500 text-white bg-black/20 border-white/10"
                                />
                            </div>
                        </div>
                        
                        <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl flex items-center justify-between">
                            <div>
                                <span className="text-sm font-bold text-white block">Contrato Recorrente (MRR)?</span>
                                <span className="text-xs text-slate-400">Gera cobranças mensais automáticas.</span>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={isContract} 
                                onChange={e => setIsContract(e.target.checked)}
                                className="w-5 h-5 rounded border-emerald-500 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                        </div>

                        {isContract && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Duração do Contrato (Meses)</label>
                                <input 
                                    type="number"
                                    value={contractMonths} 
                                    onChange={e => setContractMonths(Number(e.target.value))} 
                                    className="w-full glass-input p-3 rounded-xl text-sm outline-none focus:border-emerald-500 text-white bg-black/20 border-white/10"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-white/10 bg-black/20 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-colors">Cancelar</button>
                    <button 
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/20 flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle className="w-4 h-4"/>}
                        Confirmar & Gerar Cliente
                    </button>
                </div>

            </div>
        </div>
    );
};
