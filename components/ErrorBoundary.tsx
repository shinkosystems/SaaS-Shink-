
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  // Explicitly declare props to ensure TS recognizes it
  declare props: Readonly<Props>;

  constructor(props: Props) {
    super(props);
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white p-8 text-center font-sans">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Ops! Ocorreu um erro inesperado.</h1>
          <p className="mb-6 text-slate-400 max-w-md">
            O sistema encontrou uma falha crítica e precisou ser interrompido para sua segurança.
          </p>
          
          <div className="w-full max-w-2xl bg-black/50 p-4 rounded-xl text-xs font-mono text-red-300 overflow-auto border border-red-900/30 mb-8 text-left shadow-inner max-h-64">
            {this.state.error?.toString()}
            {this.state.error?.stack && (
                <div className="mt-2 pt-2 border-t border-red-900/30 opacity-75">
                    {this.state.error.stack}
                </div>
            )}
          </div>
          
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-900/20 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4"/> Recarregar Sistema
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
