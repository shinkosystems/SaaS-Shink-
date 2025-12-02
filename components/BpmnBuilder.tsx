
import React, { useState, useEffect, useRef } from 'react';
import { Opportunity, BpmnData, BpmnNode, BpmnTask, BpmnSubTask, PLAN_LIMITS } from '../types';
import { generateBpmn, extractPdfContext, generateSubtasksForTask } from '../services/geminiService';
import { fetchAreasAtuacao, fetchOrgMembers, syncBpmnTasks } from '../services/projectService';
import TaskDetailModal from './TaskDetailModal';
import { Loader2, Sparkles, PlayCircle, CheckSquare, Square, Save, RefreshCw, Plus, Trash2, ArrowRight, FileText, X, UploadCloud, FileType, Calendar as CalendarIcon, MoreHorizontal, User, BarChart3, CalendarClock, Layers, Hash, Lock, Share2, CheckCircle2 } from 'lucide-react';

interface Props {
  opportunity: Opportunity;
  onSave: (data: BpmnData, docsContext?: string) => void;
  currentPlan?: string;
}

const generateDisplayId = () => Math.floor(100000 + Math.random() * 900000);

const BpmnBuilder: React.FC<Props> = ({ opportunity, onSave, currentPlan }) => {
  const [data, setData] = useState<BpmnData>(opportunity.bpmn || { lanes: [], nodes: [], edges: [] });
  const [docsContext, setDocsContext] = useState<string>(opportunity.docsContext || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isSyncingTasks, setIsSyncingTasks] = useState(false);
  const [hasSynced, setHasSynced] = useState(false); // New state for sync feedback
  const [isReadingPdf, setIsReadingPdf] = useState(false);
  const [selectedNode, setSelectedNode] = useState<BpmnNode | null>(null);
  const [editingTask, setEditingTask] = useState<{nodeId: string, task: BpmnTask} | null>(null);
  const [showDocs, setShowDocs] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Organization Context State
  const [orgRoles, setOrgRoles] = useState<{id: number, nome: string}[]>([]);
  const [orgMembers, setOrgMembers] = useState<{id: string, nome: string, cargo: number}[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUploadPdf = PLAN_LIMITS[currentPlan || 'plan_free']?.features.pdfUpload !== false;

  // Sync state if opportunity changes externally
  useEffect(() => {
      if (opportunity.bpmn) setData(opportunity.bpmn);
      if (opportunity.docsContext) setDocsContext(opportunity.docsContext);
  }, [opportunity.id, opportunity.bpmn]); 

  // Load Organization Context on Mount
  useEffect(() => {
      const loadOrgContext = async () => {
          if (opportunity.organizationId) {
              const [roles, members] = await Promise.all([
                  fetchAreasAtuacao(),
                  fetchOrgMembers(opportunity.organizationId)
              ]);
              setOrgRoles(roles);
              setOrgMembers(members);
          }
      };
      loadOrgContext();
  }, [opportunity.organizationId]);

  // Simple layout calculation
  const getLayoutedNodes = (currentData: BpmnData) => {
     const LANE_HEIGHT = 180;
     const START_X = 50;
     const SPACING_X = 180;

     const laneY: Record<string, number> = {};
     currentData.lanes.forEach((l, idx) => {
         laneY[l.id] = idx * LANE_HEIGHT + 60; // center in lane
     });

     const laneCounter: Record<string, number> = {};
     
     return currentData.nodes.map(node => {
         const lId = node.laneId || currentData.lanes[0]?.id;
         const count = laneCounter[lId] || 0;
         laneCounter[lId] = count + 1;

         // If node already has positions (saved), use them. Otherwise calculate.
         const index = currentData.nodes.findIndex(n => n.id === node.id);
         
         return {
             ...node,
             x: START_X + (index * SPACING_X),
             y: laneY[lId] || 60
         };
     });
  };

  const handleGenerateAi = async () => {
      setIsLoading(true);
      setHasSynced(false); // Reset sync status on regeneration
      try {
          // Determine Org Type based on roles or string
          const orgTypeStr = "Organizacional"; // This could be passed via prop if needed

          const result = await generateBpmn(
              opportunity.title, 
              opportunity.description, 
              opportunity.archetype,
              docsContext,
              orgTypeStr,
              orgRoles // Pass available roles to AI
          );
          
          if (result) {
              // Inject IDs immediately for new tasks and Assign Users based on Role
              const hydratedResult = { ...result };
              
              if (hydratedResult.nodes && Array.isArray(hydratedResult.nodes)) {
                  hydratedResult.nodes.forEach((node: BpmnNode) => {
                      if (!node.checklist) node.checklist = [];
                      
                      if (Array.isArray(node.checklist)) {
                          node.checklist.forEach((task: BpmnTask) => {
                              if (!task.displayId) task.displayId = generateDisplayId();
                              
                              // AUTO-ASSIGN LOGIC
                              // If AI suggested a role ID, find a member with that role
                              if (task.suggestedRoleId) {
                                  const matchingMember = orgMembers.find(m => m.cargo === task.suggestedRoleId);
                                  if (matchingMember) {
                                      task.assigneeId = matchingMember.id;
                                      task.assignee = matchingMember.nome;
                                  }
                              } else {
                                  // Fallback: Assign to current user or leave unassigned
                                  // Keep unassigned for now so user decides
                              }
                          });
                      }
                  });
              }

              setData(hydratedResult);
              setHasUnsavedChanges(false); // We autosave immediately
              setShowDocs(false);
              // Automatically save initial generation to trigger global balancing
              onSave(hydratedResult, docsContext);
          } else {
              alert("A IA não retornou um fluxo válido. Tente detalhar mais o contexto.");
          }
      } catch (error) {
          console.error(error);
          alert("Erro ao conectar com o serviço de IA.");
      } finally {
          setIsLoading(false);
      }
  };

  const handleEnrichAllTasks = async () => {
    setIsEnriching(true);
    setHasSynced(false); // Reset sync status on enrichment
    const newNodes = JSON.parse(JSON.stringify(data.nodes)) as BpmnNode[];
    let changed = false;

    // Iterate sequentially to avoid rate limits and race conditions
    for (const node of newNodes) {
        if (!node.checklist) continue;
        
        for (let i = 0; i < node.checklist.length; i++) {
            const task = node.checklist[i];
            // Only generate if no subtasks exist
            if (!task.subtasks || task.subtasks.length === 0) {
                const generated = await generateSubtasksForTask(task.text, opportunity.description);
                if (generated && generated.length > 0) {
                    const newSubs: BpmnSubTask[] = generated.map(item => ({
                        id: crypto.randomUUID(),
                        text: item.title,
                        completed: false,
                        estimatedHours: item.hours
                    }));
                    node.checklist[i].subtasks = newSubs;
                    changed = true;
                }
            }
        }
    }

    if (changed) {
        const newData = { ...data, nodes: newNodes };
        setData(newData);
        onSave(newData, docsContext);
        // Update selected node view if active
        if (selectedNode) {
            const updatedSelected = newNodes.find(n => n.id === selectedNode.id);
            if (updatedSelected) setSelectedNode(updatedSelected);
        }
    } else {
        alert("Não foram geradas novas sub-tarefas (talvez a IA não tenha respondido corretamente).");
    }

    setIsEnriching(false);
  };

  const handleSyncToDb = async () => {
      if (!opportunity.dbProjectId || !opportunity.organizationId) {
          alert("O projeto precisa estar salvo e vinculado a uma organização para sincronizar.");
          return;
      }

      setIsSyncingTasks(true);
      try {
          const updatedNodes = await syncBpmnTasks(
              opportunity.dbProjectId, 
              opportunity.organizationId, 
              data.nodes
          );
          
          const newData = { ...data, nodes: updatedNodes };
          setData(newData);
          onSave(newData, docsContext); // Update BPMN structure with new DB IDs
          setHasSynced(true); // Disable button and show success text
      } catch (err) {
          console.error(err);
          alert("Erro ao sincronizar tarefas.");
      } finally {
          setIsSyncingTasks(false);
      }
  };

  const handleSave = () => {
      onSave(data, docsContext);
      setHasUnsavedChanges(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.type !== 'application/pdf') {
          alert('Por favor, envie apenas arquivos PDF.');
          return;
      }

      setIsReadingPdf(true);

      const reader = new FileReader();
      reader.onloadend = async () => {
          const base64String = reader.result as string;
          const base64Content = base64String.split(',')[1];

          const extractedText = await extractPdfContext(base64Content);
          
          const newContext = docsContext 
              ? `${docsContext}\n\n--- CONTEÚDO EXTRAÍDO DO PDF (${file.name}) ---\n${extractedText}`
              : `--- CONTEÚDO EXTRAÍDO DO PDF (${file.name}) ---\n${extractedText}`;
          
          setDocsContext(newContext);
          setHasUnsavedChanges(true);
          setIsReadingPdf(false);
          
          if (fileInputRef.current) fileInputRef.current.value = '';
      };

      reader.readAsDataURL(file);
  };

  const updateTask = (nodeId: string, updatedTask: BpmnTask) => {
      const newNodes = data.nodes.map(n => {
          if (n.id === nodeId) {
              return {
                  ...n,
                  checklist: n.checklist.map(t => t.id === updatedTask.id ? updatedTask : t)
              };
          }
          return n;
      });
      
      const updatedNode = newNodes.find(n => n.id === nodeId) || null;
      setSelectedNode(updatedNode);
      
      const newData = { ...data, nodes: newNodes };
      setData(newData);
      
      // Auto-save on task update to ensure Calendar gets updated and Balanced immediately
      onSave(newData, docsContext);
  };

  const layoutNodes = getLayoutedNodes(data);

  const deleteTask = (nodeId: string, taskId: string) => {
      const newNodes = data.nodes.map(n => {
          if (n.id === nodeId) {
              return {
                  ...n,
                  checklist: n.checklist.filter(t => t.id !== taskId)
              };
          }
          return n;
      });
      
      const updatedNode = newNodes.find(n => n.id === nodeId) || null;
      setSelectedNode(updatedNode);
      
      const newData = { ...data, nodes: newNodes };
      setData(newData);
      onSave(newData, docsContext);
      setEditingTask(null);
  }

  return (
    <div className="flex flex-col lg:flex-row h-auto lg:h-[600px] border border-slate-700 rounded-xl overflow-hidden bg-slate-900 relative">
        
        {/* Sidebar / Canvas Area */}
        <div className="flex-1 relative overflow-hidden bg-slate-950/50 flex flex-col h-[500px] lg:h-auto">
            
            {/* Toolbar */}
            <div className="p-4 z-10 flex gap-2 flex-wrap bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 items-center">
                <button 
                    onClick={() => setShowDocs(!showDocs)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        showDocs 
                        ? 'bg-blue-600 border-blue-500 text-white' 
                        : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                    }`}
                >
                    <FileText className="w-4 h-4" />
                    Docs {docsContext && <span className="w-2 h-2 bg-green-500 rounded-full"></span>}
                </button>

                <button 
                    onClick={handleGenerateAi}
                    disabled={isLoading || isEnriching}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg shadow-lg transition-all active:scale-95 text-sm font-medium"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4" />}
                    {data.nodes.length > 0 ? "Regerar" : "Gerar AI"}
                </button>

                {data.nodes.length > 0 && (
                    <>
                        <button 
                            onClick={handleEnrichAllTasks}
                            disabled={isEnriching || isLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-purple-300 rounded-lg shadow-lg transition-all active:scale-95 text-sm font-medium whitespace-nowrap"
                            title="Preencher subtasks vazias automaticamente"
                        >
                            {isEnriching ? <Loader2 className="w-4 h-4 animate-spin"/> : <Layers className="w-4 h-4" />}
                            Detalhar
                        </button>

                        <div className="ml-auto flex items-center gap-3">
                            {hasSynced && (
                                <span className="text-emerald-500 text-xs font-bold flex items-center gap-1 animate-in fade-in slide-in-from-left-2">
                                    <CheckCircle2 className="w-4 h-4"/> Tarefas Inseridas
                                </span>
                            )}
                            <button 
                                onClick={handleSyncToDb}
                                disabled={isSyncingTasks || hasSynced}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg transition-all text-sm font-medium whitespace-nowrap ${
                                    hasSynced 
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                                    : 'bg-emerald-700 hover:bg-emerald-600 text-white active:scale-95'
                                }`}
                                title={hasSynced ? "Tarefas já exportadas" : "Criar tarefas reais no Kanban"}
                            >
                                {isSyncingTasks ? <Loader2 className="w-4 h-4 animate-spin"/> : <Share2 className="w-4 h-4" />}
                                Exportar Tasks
                            </button>
                        </div>
                    </>
                )}
                
                {hasUnsavedChanges && (
                    <button 
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-lg text-sm font-medium animate-pulse"
                    >
                        <Save className="w-4 h-4" /> Salvar
                    </button>
                )}
            </div>

            {/* Canvas Content (Scrollable) */}
            <div className="flex-1 overflow-auto relative min-w-full">
                <div className="min-w-[800px] min-h-[600px] p-8 relative">
                    
                    {data.lanes.length === 0 && !isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 pointer-events-none">
                            <RefreshCw className="w-12 h-12 mb-4 opacity-20" />
                            <p>Nenhum fluxo desenhado.</p>
                            <p className="text-sm max-w-xs text-center mt-2">
                                Cole os documentos do projeto no botão "Docs" e clique em "Gerar AI".
                            </p>
                        </div>
                    )}

                    {/* Lanes Background */}
                    {data.lanes.map((lane, idx) => (
                        <div key={lane.id} className="absolute left-0 right-0 border-b border-slate-800/50 flex" style={{ top: idx * 180 + 20, height: 180 }}>
                            <div className="w-8 bg-slate-900 border-r border-slate-800 flex items-center justify-center">
                                <span className="text-xs text-slate-500 -rotate-90 font-bold tracking-widest whitespace-nowrap">{lane.label}</span>
                            </div>
                        </div>
                    ))}

                    {/* Edges */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                        <defs>
                            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
                            </marker>
                        </defs>
                        {data.edges.map((edge, i) => {
                            const fromNode = layoutNodes.find(n => n.id === edge.from);
                            const toNode = layoutNodes.find(n => n.id === edge.to);
                            if (!fromNode || !toNode) return null;

                            return (
                                <line 
                                    key={i}
                                    x1={fromNode.x! + 70}
                                    y1={fromNode.y! + 40}
                                    x2={toNode.x! + 70}
                                    y2={toNode.y! + 40}
                                    stroke="#475569"
                                    strokeWidth="2"
                                    markerEnd="url(#arrowhead)"
                                />
                            )
                        })}
                    </svg>

                    {/* Nodes */}
                    {layoutNodes.map(node => {
                        const isStart = node.type === 'start';
                        const isEnd = node.type === 'end';
                        // Check array safety
                        const checklist = node.checklist || [];
                        const completedCount = checklist.filter(t => t.completed).length;
                        const totalCount = checklist.length;
                        const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
                        
                        return (
                            <div 
                                key={node.id}
                                onClick={() => setSelectedNode(node)}
                                className={`absolute w-[140px] h-[80px] rounded-xl border-2 flex flex-col items-center justify-center p-2 text-center cursor-pointer transition-all hover:scale-105 z-10 shadow-lg ${
                                    selectedNode?.id === node.id 
                                    ? 'border-blue-500 bg-slate-800 ring-4 ring-blue-500/20' 
                                    : isStart 
                                        ? 'border-emerald-500/50 bg-emerald-900/20' 
                                        : isEnd 
                                            ? 'border-red-500/50 bg-red-900/20'
                                            : 'border-slate-600 bg-slate-800'
                                }`}
                                style={{ top: node.y, left: node.x }}
                            >
                                <span className="text-xs font-bold text-white line-clamp-2">{node.label}</span>
                                {totalCount > 0 && (
                                    <div className="w-full h-1 bg-slate-700 mt-2 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }}></div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* Documentation Panel (Overlay) */}
        {showDocs && (
            <div className="absolute inset-y-0 left-0 w-full md:w-96 bg-slate-900 border-r border-slate-700 p-6 z-20 animate-in slide-in-from-left shadow-2xl flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-white flex items-center gap-2"><FileText className="w-4 h-4"/> Documentação</h3>
                     <button onClick={() => setShowDocs(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5"/></button>
                </div>
                
                {/* PDF Upload Area */}
                {canUploadPdf ? (
                    <div className="mb-4 p-4 border border-dashed border-slate-600 rounded-lg bg-slate-800/50 text-center group hover:border-blue-500 transition-colors relative">
                        <input 
                            type="file" 
                            accept="application/pdf"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            disabled={isReadingPdf}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                        {isReadingPdf ? (
                            <div className="flex flex-col items-center text-blue-400">
                                <Loader2 className="w-6 h-6 animate-spin mb-2"/>
                                <span className="text-xs font-bold">Lendo PDF...</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-slate-400 group-hover:text-blue-300">
                                <UploadCloud className="w-6 h-6 mb-2"/>
                                <span className="text-xs font-bold">Upload PDF</span>
                                <span className="text-[10px] opacity-70">Extração automática via AI</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="mb-4 p-4 border border-slate-700 rounded-lg bg-slate-800/50 text-center opacity-70">
                        <div className="flex flex-col items-center text-slate-500">
                            <Lock className="w-6 h-6 mb-2"/>
                            <span className="text-xs font-bold">Upload PDF Bloqueado</span>
                            <span className="text-[10px]">Disponível no plano Studio.</span>
                        </div>
                    </div>
                )}

                <div className="mb-2 text-xs text-slate-400">
                    Conteúdo de Contexto:
                </div>
                <textarea 
                    className="flex-1 w-full bg-slate-800 border border-slate-700 rounded p-3 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono"
                    placeholder="Cole aqui especificações ou faça upload do PDF..."
                    value={docsContext}
                    onChange={(e) => {
                        setDocsContext(e.target.value);
                        setHasUnsavedChanges(true);
                    }}
                />
                <div className="mt-4">
                    <button 
                        onClick={() => { setShowDocs(false); handleGenerateAi(); }}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold flex items-center justify-center gap-2"
                    >
                        <Sparkles className="w-4 h-4" /> Salvar & Gerar
                    </button>
                </div>
            </div>
        )}

        {/* Inspector Panel (Right) - Responsive: Bottom on mobile, Right on desktop */}
        {selectedNode ? (
             <div className="absolute lg:static inset-x-0 bottom-0 lg:inset-auto lg:w-96 h-[300px] lg:h-auto bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-6 flex flex-col animate-in slide-in-from-bottom lg:slide-in-from-right z-30 shadow-2xl">
                 <div className="flex justify-between items-center mb-6">
                     <h3 className="font-bold text-white text-lg truncate pr-2">Detalhes: {selectedNode.label}</h3>
                     <button onClick={() => setSelectedNode(null)} className="text-slate-500 hover:text-white p-1 bg-slate-800 rounded-full"><X className="w-5 h-5"/></button>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto">
                    <div className="flex justify-between items-center mb-3">
                        <label className="text-xs text-slate-400 uppercase tracking-wider">Tarefas</label>
                        <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">
                            {selectedNode.checklist ? selectedNode.checklist.filter(t => t.completed).length : 0}/{selectedNode.checklist ? selectedNode.checklist.length : 0}
                        </span>
                    </div>
                    
                    <div className="space-y-3">
                        {(selectedNode.checklist || []).map(task => {
                            // Derived visual status
                            const isDone = task.status === 'done' || task.completed;
                            const isDoing = task.status === 'doing';
                            const gutScore = task.gut ? task.gut.g * task.gut.u * task.gut.t : 0;
                            
                            return (
                                <div 
                                    key={task.id} 
                                    className={`p-3 rounded border transition-all flex flex-col gap-2 group ${
                                        isDone
                                        ? 'bg-emerald-900/10 border-emerald-900/30' 
                                        : isDoing
                                        ? 'bg-blue-900/10 border-blue-900/30'
                                        : 'bg-slate-800 border-slate-700'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex gap-3 items-start flex-1 min-w-0">
                                            {/* Checkbox Toggle - SEPARATED CLICK */}
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); updateTask(selectedNode.id, { ...task, completed: !isDone, status: !isDone ? 'done' : 'todo' }); }}
                                                className="mt-0.5 shrink-0 focus:outline-none"
                                            >
                                                {isDone
                                                    ? <CheckSquare className="w-5 h-5 text-emerald-500" /> 
                                                    : <Square className={`w-5 h-5 ${isDoing ? 'text-blue-400' : 'text-slate-500'}`} />
                                                }
                                            </button>

                                            {/* Text Content - OPENS MODAL */}
                                            <div 
                                                className="min-w-0 cursor-pointer flex-1"
                                                onClick={() => setEditingTask({ nodeId: selectedNode.id, task })}
                                            >
                                                <span className={`text-sm leading-snug block truncate ${isDone ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                                                    {task.text}
                                                </span>
                                                {task.displayId && (
                                                    <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">#{task.displayId}</span>
                                                )}
                                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                    {task.assignee && (
                                                        <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-850 px-1.5 py-0.5 rounded">
                                                            <User className="w-3 h-3"/> {task.assignee}
                                                        </div>
                                                    )}
                                                    {gutScore > 0 && (
                                                        <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                                                            gutScore > 60 ? 'text-red-400 bg-red-900/20' : 'text-slate-400 bg-slate-850'
                                                        }`}>
                                                            <BarChart3 className="w-3 h-3"/> {gutScore}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Quick Edit Button - OPENS MODAL */}
                                        <button 
                                            onClick={() => setEditingTask({ nodeId: selectedNode.id, task })}
                                            className="text-slate-600 hover:text-white p-1 rounded hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <MoreHorizontal className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                 </div>
             </div>
        ) : (
            <div className="hidden lg:flex w-80 bg-slate-900 border-l border-slate-800 p-6 flex-col items-center justify-center text-slate-500 text-center z-10">
                 <PlayCircle className="w-16 h-16 opacity-20 mb-4" />
                 <p className="text-sm">Selecione uma caixa no fluxo.</p>
            </div>
        )}

        {/* Detail Screen Overlay */}
        {editingTask && (
            <TaskDetailModal 
                task={editingTask.task}
                nodeTitle={selectedNode?.label || 'Etapa'}
                opportunityTitle={opportunity.title}
                onClose={() => setEditingTask(null)}
                onSave={(updatedTask) => updateTask(editingTask.nodeId, updatedTask)}
                onDelete={(id) => deleteTask(editingTask.nodeId, id)}
            />
        )}
    </div>
  );
};

export default BpmnBuilder;
