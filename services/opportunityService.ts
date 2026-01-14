
import { supabase } from './supabaseClient';
import { Opportunity, DbProject, RDEStatus, Archetype, IntensityLevel, TadsCriteria, DbTask, BpmnTask, BpmnNode } from '../types';

const TABLE_NAME = 'projetos';

// Função utilitária para garantir que o objeto seja mutável e não esteja "frozen"
const atomicClone = (data: any) => {
    if (!data) return data;
    return JSON.parse(JSON.stringify(data));
};

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
    const { data: tasks } = await supabase.from('tasks').select('*').in('projeto', projectIds);

    const results = projects.map((row: any) => {
        const projectTasks = tasks ? tasks.filter((t: any) => t.projeto === row.id) : [];
        return mapDbProjectToOpportunity(row, projectTasks);
    });

    return atomicClone(results);
  } catch (err) {
    console.error("fetchOpportunities fatal error:", err);
    return null;
  }
};

export const fetchOpportunityById = async (id: string | number): Promise<Opportunity | null> => {
    if (!supabase) return null;
    try {
        const { data: project, error } = await supabase.from(TABLE_NAME).select(`*, clienteData:clientes(nome, logo_url)`).eq('id', id).single();
        if (error || !project) return null;
        const { data: tasks } = await supabase.from('tasks').select('*').eq('projeto', id);
        return atomicClone(mapDbProjectToOpportunity(project, tasks || []));
    } catch (e) { return null; }
};

export const createOpportunity = async (opp: Opportunity): Promise<Opportunity | null> => {
    if (!supabase) return null;
    try {
        const dbPayload = mapOpportunityToDbProject(opp);
        const { id, ...insertData } = dbPayload;
        const { data, error } = await supabase.from(TABLE_NAME).insert(insertData).select().single();
        if (error) throw error;
        return atomicClone(mapDbProjectToOpportunity(data, []));
    } catch (err: any) { return null; }
};

export const updateOpportunity = async (opp: Opportunity): Promise<Opportunity | null> => {
    if (!supabase) return null;
    try {
        const dbPayload = mapOpportunityToDbProject(opp);
        const { id, ...updateData } = dbPayload;
        const { data, error } = await supabase.from(TABLE_NAME).update(updateData).eq('id', opp.id).select().single();
        if (error) return null;
        const { data: tasks } = await supabase.from('tasks').select('*').eq('projeto', opp.id);
        return atomicClone(mapDbProjectToOpportunity(data, tasks || [])); 
    } catch (err) { return null; }
};

export const deleteOpportunity = async (id: string | number): Promise<boolean> => {
    if (!supabase) return false;
    const numericId = Number(id);
    try {
        const { error } = await supabase.from(TABLE_NAME).delete().eq('id', numericId);
        return !error;
    } catch (err) { return false; }
};

const mapDbProjectToOpportunity = (row: DbProject, tasks: DbTask[] = []): Opportunity => {
    const tads: TadsCriteria = {
        scalability: !!row.tadsescalabilidade,
        integration: !!row.tadsintegracao,
        painPoint: !!row.tadsdorreal,
        recurring: !!row.tadsrecorrencia,
        mvpSpeed: !!row.tadsvelocidade
    };
    const bpmn = row.bpmn_structure || { nodes: [], lanes: [], edges: [] };
    return {
        id: row.id.toString(),
        title: row.nome,
        // FIX: Changed row.description to row.descricao because DbProject interface uses 'descricao'
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
        status: (bpmn as any).status || (row.projoport ? 'Future' : 'Active'),
        createdAt: row.created_at,
        bpmn: bpmn,
        dbProjectId: row.id,
        docsContext: row.contexto_ia || '',
        color: row.cor || '#F59E0B',
        mrr: row.mrr || 0,
        meses: row.meses || 12
    };
};

const mapOpportunityToDbProject = (opp: Opportunity): any => {
    return {
        nome: opp.title,
        descricao: opp.description,
        cliente: opp.clientId || null,
        rde: opp.rde,
        velocidade: opp.velocity,
        viabilidade: opp.viability,
        receita: opp.revenue,
        prioseis: opp.prioScore,
        arquetipo: opp.archetype,
        intensidade: opp.intensity,
        tadsescalabilidade: opp.tads?.scalability,
        tadsintegracao: opp.tads?.integration,
        tadsdorreal: opp.tads?.painPoint,
        tadsrecorrencia: opp.tads?.recurring,
        tadsvelocidade: opp.tads?.mvpSpeed,
        organizacao: opp.organizationId,
        projoport: opp.status !== 'Active',
        bpmn_structure: { ...opp.bpmn, status: opp.status },
        contexto_ia: opp.docsContext,
        cor: opp.color,
        mrr: opp.mrr,
        meses: opp.meses
    };
};