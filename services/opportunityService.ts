
import { supabase } from './supabaseClient';
import { Opportunity, DbProject, RDEStatus, Archetype, IntensityLevel, TadsCriteria, DbTask, BpmnTask, BpmnNode } from '../types';
import { linkProjectToClient } from './clientService';

const TABLE_NAME = 'projetos';

export const fetchOpportunities = async (organizationId?: number, clientId?: string): Promise<Opportunity[] | null> => {
  if (!supabase) return null;
  
  try {
    let query = supabase
      .from(TABLE_NAME)
      .select(`*, clienteData:clientes(nome, logo_url)`)
      .order('prioseis', { ascending: false });

    if (clientId) {
        query = query.eq('cliente', clientId);
    } else if (organizationId !== undefined && organizationId !== null) {
        query = query.eq('organizacao', organizationId);
    } else {
        return [];
    }

    const { data: projects, error } = await query;
    if (error) return null;

    if (!projects || projects.length === 0) return [];

    const projectIds = projects.map(p => p.id);

    let tasksQuery = supabase.from('tasks').select('*').in('projeto', projectIds);
    const { data: tasks } = await tasksQuery;

    let userMap = new Map<string, any>();
    if (tasks && tasks.length > 0) {
        const userIds = [...new Set(tasks.map((t: any) => t.responsavel).filter(Boolean))];
        if (userIds.length > 0) {
            const { data: users } = await supabase.from('users').select('id, nome, avatar_url').in('id', userIds);
            users?.forEach(u => userMap.set(u.id, u));
        }
    }

    return projects.map((row: any) => {
        const projectTasks = tasks ? tasks.filter((t: any) => t.projeto === row.id) : [];
        const hydratedTasks = projectTasks.map((t: any) => ({
            ...t,
            responsavelData: userMap.get(t.responsavel)
        }));
        return mapDbProjectToOpportunity(row, hydratedTasks);
    });
  } catch (err) {
    console.error("fetchOpportunities error:", err);
    return null;
  }
};

export const fetchOpportunityById = async (id: string | number): Promise<Opportunity | null> => {
    if (!supabase) return null;
    try {
        const { data: project, error } = await supabase.from(TABLE_NAME).select(`*, clienteData:clientes(nome, logo_url)`).eq('id', id).single();
        if (error || !project) return null;

        const { data: tasks } = await supabase.from('tasks').select('*').eq('projeto', id);
        return mapDbProjectToOpportunity(project, tasks || []);
    } catch (e) { return null; }
};

export const createOpportunity = async (opp: Opportunity): Promise<Opportunity | null> => {
    if (!supabase) return null;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Sessão expirada. Faça login novamente.");

        let targetOrgId = opp.organizationId;

        if (!targetOrgId || targetOrgId === 0) {
            const { data: u } = await supabase.from('users').select('organizacao').eq('id', user.id).single();
            targetOrgId = u?.organizacao;
        }

        if (!targetOrgId) {
            throw new Error("Não foi possível detectar sua organização ativa.");
        }

        const dbPayload = mapOpportunityToDbProject({ ...opp, organizationId: Number(targetOrgId) });
        const { id, ...insertData } = dbPayload;
        
        let { data, error } = await supabase
            .from(TABLE_NAME)
            .insert(insertData)
            .select()
            .single();
        
        if (error) {
            console.error("Erro no Insert Supabase:", error.message);
            throw new Error(`Erro do Banco: ${error.message}`);
        }

        if (data.cliente && data.id) {
            try {
                await linkProjectToClient(data.cliente, data.id);
            } catch (linkErr) {
                console.warn("Aviso: Projeto criado, mas falha ao atualizar lista no cliente.");
            }
        }

        return mapDbProjectToOpportunity(data, []);
    } catch (err: any) {
        console.error("createOpportunity catch:", err.message);
        throw err;
    }
};

export const updateOpportunity = async (opp: Opportunity): Promise<Opportunity | null> => {
    if (!supabase) return null;
    
    const numericId = Number(opp.id);
    if (isNaN(numericId)) {
        console.error("Tentativa de atualizar registro sem ID numérico válido:", opp.id);
        return null;
    }

    try {
        const dbPayload = mapOpportunityToDbProject(opp);
        const { id, ...updateData } = dbPayload;
        
        let { data, error } = await supabase
            .from(TABLE_NAME)
            .update(updateData)
            .eq('id', numericId)
            .select()
            .single();
        
        if (error) {
            console.error("Erro no Update Supabase:", error.message, error.details);
            throw new Error(`Erro ao atualizar banco: ${error.message}`);
        }

        if (data.cliente && data.id) {
            linkProjectToClient(data.cliente, data.id).catch(err => 
                console.warn("Falha silenciosa ao vincular cliente no update:", err)
            );
        }

        const { data: tasks } = await supabase.from('tasks').select('*').eq('projeto', numericId);
        return mapDbProjectToOpportunity(data, tasks || []); 
    } catch (err: any) {
        console.error("Falha crítica no updateOpportunity:", err.message);
        throw err;
    }
};

export const deleteOpportunity = async (id: string | number): Promise<boolean> => {
    if (!supabase) return false;
    try {
        const numericId = Number(id);
        
        // 1. Localizar todas as tarefas ligadas ao projeto
        const { data: tasks } = await supabase.from('tasks').select('id').eq('projeto', numericId);
        
        if (tasks && tasks.length > 0) {
            const taskIds = tasks.map((t: any) => t.id);
            
            // 2. Apagar comentários das tarefas para evitar erro de FK
            await supabase.from('comentarios').delete().in('task', taskIds);
            
            // 3. Apagar as tarefas propriamente ditas
            await supabase.from('tasks').delete().eq('projeto', numericId);
        }
        
        // 4. Apagar o projeto ( Ativo )
        const { error } = await supabase.from(TABLE_NAME).delete().eq('id', numericId);
        
        return !error;
    } catch (err) { 
        console.error("Erro ao deletar ativo em cascata:", err);
        return false; 
    }
};

const mapDbProjectToOpportunity = (row: DbProject, tasks: DbTask[] = []): Opportunity => {
    const tads: TadsCriteria = {
        scalability: !!row.tadsescalabilidade,
        integration: !!row.tadsintegracao,
        painPoint: !!row.tadsdorreal,
        recurring: !!row.tadsrecorrencia,
        mvpSpeed: !!row.tadsvelocidade
    };

    const bpmnStructure = row.bpmn_structure || { lanes: [], nodes: [], edges: [] };
    const savedStatus = (bpmnStructure as any).status || (row.projoport ? 'Future' : 'Active');

    return {
        id: row.id.toString(),
        title: row.nome,
        description: row.descricao || '',
        clientId: row.cliente || undefined,
        organizationId: row.organizacao,
        rde: (row.rde as RDEStatus) || RDEStatus.WARM,
        viability: row.viabilidade || 1,
        velocity: row.velocidade || 1,
        revenue: row.receita || 1,
        prioScore: row.prioseis || 0,
        archetype: (row.arquetipo as Archetype) || Archetype.SAAS_ENTRY,
        intensity: (row.intensidade as IntensityLevel) || IntensityLevel.L1,
        tads: tads,
        tadsScore: Object.values(tads).filter(Boolean).length * 2, 
        status: savedStatus,
        createdAt: row.created_at,
        bpmn: bpmnStructure,
        dbProjectId: row.id,
        docsContext: row.contexto_ia || '',
        pdfUrl: '', 
        color: row.cor || '#F59E0B',
        mrr: row.mrr || 0,
        meses: row.meses || 12
    };
};

const mapOpportunityToDbProject = (opp: Opportunity): any => {
    const updatedBpmn = { ...opp.bpmn, status: opp.status };

    return {
        nome: opp.title || 'Sem Título',
        descricao: opp.description || '',
        cliente: opp.clientId || null,
        rde: opp.rde || 'Morno',
        velocidade: Number(opp.velocity) || 1,
        viabilidade: Number(opp.viability) || 1,
        receita: Number(opp.revenue) || 1,
        prioseis: Number(opp.prioScore) || 0,
        arquetipo: opp.archetype || 'SaaS de Entrada',
        intensidade: Number(opp.intensity) || 1,
        tadsescalabilidade: !!opp.tads?.scalability,
        tadsintegracao: !!opp.tads?.integration,
        tadsdorreal: !!opp.tads?.painPoint,
        tadsrecorrencia: !!opp.tads?.recurring,
        tadsvelocidade: !!opp.tads?.mvpSpeed,
        organizacao: Number(opp.organizationId) || 0, 
        projoport: opp.status !== 'Active',
        bpmn_structure: updatedBpmn,
        contexto_ia: opp.docsContext || '',
        cor: opp.color || '#F59E0B',
        mrr: Number(opp.mrr) || 0,
        meses: Number(opp.meses) || 12
    };
};
