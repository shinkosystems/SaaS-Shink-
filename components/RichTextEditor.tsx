
import React, { useEffect, useRef, useState } from 'react';
import { 
    Bold, Italic, Heading1, Heading2, List, ListOrdered, 
    Quote, Link as LinkIcon, RemoveFormatting, Code, 
    Undo, Redo, Image as ImageIcon
} from 'lucide-react';

interface Props {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    className?: string;
}

export const RichTextEditor: React.FC<Props> = ({ value, onChange, placeholder, className }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    // Initial Sync (Only once to avoid cursor jumping)
    useEffect(() => {
        if (editorRef.current && value && editorRef.current.innerHTML !== value) {
            // Only update if completely empty to prevent overwriting user input
            if (editorRef.current.innerText.trim() === "") {
                editorRef.current.innerHTML = value;
            }
        }
    }, []); 

    const handleInput = () => {
        if (editorRef.current) {
            const html = editorRef.current.innerHTML;
            onChange(html);
        }
    };

    const execCommand = (command: string, arg: string | undefined = undefined) => {
        document.execCommand(command, false, arg);
        editorRef.current?.focus();
        handleInput(); // Sync changes immediately
    };

    const addLink = () => {
        const url = prompt("Digite a URL do link:");
        if (url) execCommand('createLink', url);
    };

    const addImage = () => {
        const url = prompt("Digite a URL da imagem:");
        if (url) {
            // execCommand('insertImage', url) works but sometimes we want more control
            const imgHtml = `<img src="${url}" class="max-w-full h-auto rounded-3xl my-6 block mx-auto shadow-2xl" alt="Imagem do Insight" />`;
            execCommand('insertHTML', imgHtml);
        }
    };

    const ToolbarButton = ({ icon: Icon, cmd, arg, title }: { icon: any, cmd: string, arg?: string, title: string }) => (
        <button
            type="button"
            onClick={(e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                if (cmd === 'link') addLink();
                else if (cmd === 'image') addImage();
                else execCommand(cmd, arg); 
            }}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
            title={title}
        >
            <Icon className="w-4 h-4" />
        </button>
    );

    return (
        <div className={`flex flex-col bg-slate-50 dark:bg-black/20 border transition-all duration-300 rounded-xl overflow-hidden ${isFocused ? 'border-shinko-primary ring-1 ring-shinko-primary/20 shadow-lg' : 'border-slate-200 dark:border-white/10'} ${className}`}>
            
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-sm">
                <ToolbarButton icon={Bold} cmd="bold" title="Negrito" />
                <ToolbarButton icon={Italic} cmd="italic" title="Itálico" />
                <div className="w-px h-4 bg-slate-300 dark:bg-white/10 mx-1"></div>
                <ToolbarButton icon={Heading1} cmd="formatBlock" arg="H2" title="Título Principal" />
                <ToolbarButton icon={Heading2} cmd="formatBlock" arg="H3" title="Subtítulo" />
                <div className="w-px h-4 bg-slate-300 dark:bg-white/10 mx-1"></div>
                <ToolbarButton icon={List} cmd="insertUnorderedList" title="Lista com Marcadores" />
                <ToolbarButton icon={ListOrdered} cmd="insertOrderedList" title="Lista Numerada" />
                <ToolbarButton icon={Quote} cmd="formatBlock" arg="BLOCKQUOTE" title="Citação" />
                <div className="w-px h-4 bg-slate-300 dark:bg-white/10 mx-1"></div>
                <ToolbarButton icon={LinkIcon} cmd="link" title="Inserir Link" />
                <ToolbarButton icon={ImageIcon} cmd="image" title="Inserir Imagem" />
                <ToolbarButton icon={RemoveFormatting} cmd="removeFormat" title="Limpar Formatação" />
            </div>

            {/* Editor Area */}
            <div 
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="flex-1 p-4 min-h-[300px] outline-none text-sm leading-relaxed text-slate-800 dark:text-slate-200 overflow-y-auto custom-scrollbar prose-custom"
                data-placeholder={placeholder}
            />

            {/* Custom Styles for ContentEditable (Simulating Tailwind Typography) */}
            <style>{`
                .prose-custom:empty:before {
                    content: attr(data-placeholder);
                    color: #94a3b8;
                    font-style: italic;
                }
                .prose-custom h2 { font-size: 1.5rem; font-weight: 800; margin-top: 1.5em; margin-bottom: 0.5em; color: var(--text-primary); }
                .prose-custom h3 { font-size: 1.25rem; font-weight: 700; margin-top: 1.5em; margin-bottom: 0.5em; color: var(--text-primary); }
                .prose-custom ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1.5em; }
                .prose-custom ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1.5em; }
                .prose-custom blockquote { border-left: 4px solid #F59E0B; padding-left: 1em; font-style: italic; margin: 1.5em 0; color: #94a3b8; }
                .prose-custom a { color: #3b82f6; text-decoration: underline; }
                .prose-custom b, .prose-custom strong { font-weight: 800; }
                .prose-custom img { display: block; margin: 2rem auto; max-width: 100%; border-radius: 1.5rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
            `}</style>
        </div>
    );
};
