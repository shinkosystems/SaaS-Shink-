
import React, { useEffect } from 'react';

interface MetaProps {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: 'website' | 'article';
}

/**
 * MetaController gerencia dinamicamente o head do documento para SEO.
 * Em uma SPA, o Googlebot e redes sociais precisam ver mudanças no head.
 */
export const MetaController: React.FC<MetaProps> = ({ 
    title, 
    description, 
    image = "https://zjssfnbcboibqeoubeou.supabase.co/storage/v1/object/public/fotoperfil/fotoperfil/1.png", 
    url, 
    type = 'website' 
}) => {
    const defaultTitle = "Shinkō OS | Sistema de Engenharia de Inovação";
    const defaultDesc = "A plataforma definitiva para gerenciar projetos, ativos e performance de engenharia com precisão industrial.";
    
    useEffect(() => {
        const fullTitle = title ? `${title} | Shinkō OS` : defaultTitle;
        const fullDesc = description || defaultDesc;
        const currentUrl = url || window.location.href;

        // 1. Atualiza Título da Aba
        document.title = fullTitle;

        // 2. Helper para atualizar/criar meta tags
        const setMeta = (property: string, content: string, isName = false) => {
            let element = document.querySelector(`meta[${isName ? 'name' : 'property'}="${property}"]`);
            if (!element) {
                element = document.createElement('meta');
                element.setAttribute(isName ? 'name' : 'property', property);
                document.head.appendChild(element);
            }
            element.setAttribute('content', content);
        };

        // 3. Atualiza Meta Tags Padrão
        setMeta('description', fullDesc, true);

        // 4. Open Graph (WhatsApp, LinkedIn, Facebook)
        setMeta('og:title', fullTitle);
        setMeta('og:description', fullDesc);
        setMeta('og:image', image);
        setMeta('og:url', currentUrl);
        setMeta('og:type', type);

        // 5. Twitter Card
        setMeta('twitter:card', 'summary_large_image');
        setMeta('twitter:title', fullTitle);
        setMeta('twitter:description', fullDesc);
        setMeta('twitter:image', image);

    }, [title, description, image, url, type]);

    return null; // Componente puramente funcional de side-effect
};
