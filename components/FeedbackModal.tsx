
import React, { useState, useRef } from 'react';
import { X, Lightbulb, Send, Loader2, Image as ImageIcon, Trash2 } from 'lucide-react';
import { sendFeedback } from '../services/feedbackService';
import { supabase } from '../services/supabaseClient';

interface Props {
    onClose: () => void;
    userId: string;
}

export const FeedbackModal: React.FC<Props> = ({ onClose, userId }) => {
    const [message, setMessage] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImage(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleRemoveImage = () => {
        setImage(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async () => {
        if (!message.trim()) {
            alert("Por favor, descreva sua sugestão ou problema.");
            return;
        }

        setIsSending(true);
        try {
            await sendFeedback(userId, message, image || undefined);
            alert("Obrigado! Sua colaboração foi enviada com sucesso.");
            onClose();
        } catch (error) {
            alert("Erro ao enviar. Tente novamente.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden relative z-10 animate-ios-pop border border-white/10 flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 dark:text-amber-500">
                            <Lightbulb className="w-5 h-5"/>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Central de Melhorias</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Reporte bugs ou sugira ideias.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <X className="w-5 h-5"/>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Mensagem</label>
                        <textarea 
                            className="w-full h-32 glass-input rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none resize-none focus:ring-2 focus:ring-amber-500/50 transition-all placeholder:text-slate-400"
                            placeholder="Descreva o que aconteceu ou sua ideia incrível..."
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Print / Anexo (Opcional)</label>
                        
                        {!image ? (
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-20 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all group"
                            >
                                <ImageIcon className="w-6 h-6 text-slate-400 group-hover:text-amber-500 mb-1 transition-colors"/>
                                <span className="text-xs text-slate-500 group-hover:text-amber-600 dark:group-hover:text-amber-400">Clique para anexar imagem</span>
                            </div>
                        ) : (
                            <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group">
                                <img src={previewUrl!} alt="Preview" className="w-full h-full object-cover"/>
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button 
                                        onClick={handleRemoveImage}
                                        className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>
                        )}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleImageSelect}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex justify-end">
                    <button 
                        onClick={handleSubmit}
                        disabled={isSending || !message.trim()}
                        className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-900/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
                        Enviar Feedback
                    </button>
                </div>
            </div>
        </div>
    );
};
