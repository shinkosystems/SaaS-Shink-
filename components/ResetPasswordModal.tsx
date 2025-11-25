
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Lock, Save, Loader2, X, CheckCircle, Mail } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const ResetPasswordModal: React.FC<Props> = ({ onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
      const getUserEmail = async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && user.email) {
              setEmail(user.email);
          }
      };
      getUserEmail();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
        setError("A senha deve ter no mínimo 6 caracteres.");
        return;
    }
    if (password !== confirmPassword) {
        setError("As senhas não coincidem.");
        return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password: password });

      if (error) throw error;

      setSuccess(true);
      // Aguarda um pouco para o usuário ver a mensagem de sucesso antes de fechar
      setTimeout(() => {
          onClose();
          // Redireciona ou recarrega para garantir estado limpo
          window.location.href = "/"; 
      }, 2000);

    } catch (err: any) {
      setError(err.message || "Erro ao atualizar a senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
      
      <div className="w-full max-w-md p-8 rounded-3xl shadow-2xl relative z-10 animate-ios-pop bg-black/40 backdrop-blur-xl border border-white/10 ring-1 ring-white/5">
        
        {success ? (
            <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <CheckCircle className="w-8 h-8"/>
                </div>
                <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">Senha Atualizada!</h3>
                <p className="text-slate-500 mt-2">Você será redirecionado para o sistema...</p>
            </div>
        ) : (
            <>
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5"/>
                </button>

                <div className="mb-6 text-center">
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Lock className="w-6 h-6"/>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Definir Nova Senha</h2>
                    <p className="text-sm text-slate-500">Crie uma nova senha para sua conta.</p>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold text-center border border-red-200 dark:border-red-800">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Conta</label>
                        <div className="relative">
                            <Mail className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                            <input 
                                type="email" 
                                value={email}
                                disabled
                                className="glass-input w-full pl-10 pr-4 py-3 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 cursor-not-allowed border-transparent"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Nova Senha</label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="glass-input w-full p-3 rounded-xl outline-none focus:border-amber-500 transition-all"
                            placeholder="Mínimo 6 caracteres"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Confirmar Senha</label>
                        <input 
                            type="password" 
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="glass-input w-full p-3 rounded-xl outline-none focus:border-amber-500 transition-all"
                            placeholder="Repita a senha"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-black font-bold rounded-xl shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>}
                        Salvar Nova Senha
                    </button>
                </form>
            </>
        )}
      </div>
    </div>
  );
};
