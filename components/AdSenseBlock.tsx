import React, { useEffect } from 'react';

interface AdSenseProps {
  slot: string;
  format?: 'auto' | 'fluid' | 'rectangle';
  responsive?: 'true' | 'false';
  className?: string;
}

export const AdSenseBlock: React.FC<AdSenseProps> = ({ 
  slot, 
  format = 'auto', 
  responsive = 'true',
  className = "" 
}) => {
  useEffect(() => {
    // Verificação ultra-segura para evitar "Script error"
    const timer = setTimeout(() => {
        try {
          if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
            const ads = (window as any).adsbygoogle || [];
            // AdSense requer um push por slot renderizado
            ads.push({});
          }
        } catch (e) {
          // Falha silenciosa em caso de bloqueadores de anúncio ou erro de carregamento
          console.warn("AdSense logic bypassed safely.");
        }
    }, 2000); 
    
    return () => clearTimeout(timer);
  }, [slot]);

  return (
    <div className={`my-8 overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col items-center ${className}`}>
      <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-600 mb-2">Espaço Patrocinado</span>
      <div className="w-full flex justify-center min-h-[100px]">
        <ins 
          className="adsbygoogle"
          style={{ display: 'block', minWidth: '250px' }}
          data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" 
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive={responsive}
        />
      </div>
    </div>
  );
};