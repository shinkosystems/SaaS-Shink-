export interface SuccessMilestone {
    id: string;
    label: string;
    description: string;
    completed: boolean;
    actionId: string;
}

export interface EcosystemApp {
    id: string;
    name: string;
    description: string;
    category: 'Core' | 'Business' | 'Intelligence' | 'Engineering';
    icon: string;
    price: number;
    status: 'installed' | 'available' | 'coming_soon';
}

export type ProjectStatus = 'Active' | 'Negotiation' | 'Future' | 'Archived' | 'Frozen';

export enum Archetype {
    SAAS_ENTRY = 'SaaS de Entrada',
    SAAS_PLATFORM = 'SaaS Plataforma',
    MOBILE_APP = 'Mobile App',
    INTERNAL_MARKETING = 'Interno / Marketing',
    CONSULTANCY = 'Consultoria / Serviço'
}

export enum IntensityLevel {
    L1 = 1,
    L2 = 2,
    L3 = 3,
    L4 = 4
}

export enum RDEStatus {
    HOT = 'Quente',
    WARM = 'Morno',
    COLD = 'Frio'
}

export interface TadsCriteria {
    scalability: boolean;
    integration: boolean;
    painPoint: boolean;
    recurring: boolean;
    mvpSpeed: boolean;
}

export interface Opportunity {
    id: string;
    title: string;
    description: string;
    clientId?: string;
    organizationId?: number;
    rde: RDEStatus;
    viability: number;
    velocity: number;
    revenue: number;
    prioScore: number;
    archetype: Archetype;
    intensity: IntensityLevel;
    tads: TadsCriteria;
    tadsScore: number;
    evidence: {
        clientsAsk: string[];
        clientsSuffer: string[];
        wontPay: string[];
    };
    status: ProjectStatus | string;
    createdAt: string;
    bpmn?: BpmnStructure;
    dbProjectId?: number;
    docsContext?: string;
    color?: string;
}

export interface BpmnStructure {
    nodes: BpmnNode[];
    lanes: any[];
    edges: any[];
}

export interface BpmnNode {
    id: string;
    label: string;
    checklist: BpmnTask[];
}

export interface BpmnTask {
    id: string;
    dbId?: number;
    displayId?: number;
    text: string;
    description?: string;
    status: TaskStatus;
    completed: boolean;
    estimatedHours?: number;
    dueDate?: string;
    startDate?: string;
    assignee?: string;
    assigneeId?: string;
    gut?: { g: number; u: number; t: number };
    tags?: string[];
    members?: string[];
    attachments?: Attachment[];
    subtasks?: BpmnSubTask[];
    createdAt?: string;
    completedAt?: string;
}

export interface BpmnSubTask {
    id: string;
    dbId?: number;
    text: string;
    completed: boolean;
    estimatedHours?: number;
    assigneeId?: string;
    assignee?: string;
    dueDate?: string;
    startDate?: string;
}

export type TaskStatus = 'todo' | 'doing' | 'review' | 'approval' | 'done' | 'backlog';

export interface DbProject {
    id: number;
    nome: string;
    descricao?: string;
    cliente?: string | null;
    organizacao: number;
    rde?: string;
    viabilidade?: number;
    velocidade?: number;
    receita?: number;
    prioseis?: number;
    arquetipo?: string;
    intensidade?: number;
    tadsescalabilidade?: boolean;
    tadsintegracao?: boolean;
    tadsdorreal?: boolean;
    tadsrecorrencia?: boolean;
    tadsvelocidade?: boolean;
    projoport?: boolean;
    bpmn_structure?: any;
    contexto_ia?: string;
    cor?: string;
    created_at: string;
}

export interface DbTask {
    id: number;
    projeto?: number | null;
    titulo: string;
    descricao?: string;
    status: string;
    responsavel?: string;
    gravidade?: number;
    urgencia?: number;
    tendencia?: number;
    dataproposta?: string;
    deadline?: string;
    datainicio?: string;
    datafim?: string;
    duracaohoras?: number;
    sutarefa?: boolean;
    tarefamae?: number | null;
    organizacao: number;
    membros?: string[];
    etiquetas?: string[];
    createdat: string;
    projetoData?: { nome: string; cor: string };
    responsavelData?: any;
    anexos?: Attachment[];
}

export interface Attachment {
    id: string;
    name: string;
    size: string;
    type: string;
    uploadedAt: string;
    url: string;
}

export interface Comment {
    id: number;
    task: number;
    usuario: string;
    mensagem: string;
    created_at: string;
    user_data?: {
        id: string;
        nome: string;
        avatar_url: string | null;
    };
}

export const PLAN_LIMITS = {
    plan_free: { projects: 1, users: 1 },
    plan_solo: { projects: 5, users: 1 },
    plan_studio: { projects: 20, users: 5 },
    plan_scale: { projects: 100, users: 15 },
    plan_enterprise: { projects: 1000, users: 1000 }
};

export interface AsaasPayment {
    id: string;
    date: string;
    value: number;
    description: string;
    status: string;
    invoiceUrl?: string;
}

export interface SubscriptionPlan {
    id: string;
    dbId?: number;
    name: string;
    price: number;
    features: string[];
    recommended: boolean;
    cycle: 'MONTHLY' | 'YEARLY';
    colabtotal: number;
    meses: number;
    descricao_raw?: string;
}

export interface AsaasSubscription {
    id: string;
    status: string;
    value: number;
    cycle: string;
    nextDueDate: string;
}

export interface FinancialRecord {
    id: string;
    date: string;
    organizationId: number;
    mrr: number;
    gross_revenue: number;
    cogs: number;
    total_expenses: number;
    marketing_spend: number;
    sales_spend: number;
    active_customers: number;
    new_customers: number;
    churned_customers: number;
    churned_mrr: number;
}

export interface FinancialTransaction {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'inflow' | 'outflow';
    category: string;
    organizationId: number;
    isContract?: boolean;
    pago?: boolean;
    comprovante?: string;
    orgName?: string;
    metadata?: any;
    modulos?: number[];
}

export interface DbClient {
    id: string;
    nome: string;
    email: string;
    telefone?: string;
    cnpj?: string;
    endereco?: string;
    numcolaboradores?: number;
    valormensal?: number;
    meses?: number;
    data_inicio?: string;
    contrato?: string;
    logo_url?: string;
    status?: string;
    organizacao?: number;
    tipo_pessoa?: 'Física' | 'Jurídica';
}

export interface ProductMetricsData {
    dau: number;
    mau: number;
    engagementRatio: number;
    nps: number;
    featureEngagement: { feature: string; count: number; percentage: number }[];
    featureAdoption: any[];
    timeToValue: number;
    activationRate: number;
    retentionRate: number;
    reactivationRate: number;
    crashRate: number;
    avgSessionDuration: number;
}

export interface ProductEvent {
    id?: string;
    user_id: string;
    event_type: 'page_view' | 'feature_use' | 'nps_response' | 'error' | 'session_start';
    event_data: any;
    created_at: string;
}

export interface DevMetricsData {
    leadTime: { value: number; unit: string; delta: number };
    cycleTime: { value: number; unit: string; delta: number };
    throughput: { value: number; unit: string; delta: number };
    wip: { value: number; unit: string; delta: number };
    deploymentFrequency: { value: number; unit: string; rating: string };
    changeFailureRate: { value: number; unit: string; rating: string };
    mttr: { value: number; unit: string; rating: string };
    leadTimeForChanges: { value: number; unit: string; rating: string };
    bugRate: { value: number; unit: string; delta: number };
    codeChurn: { value: number; unit: string; delta: number };
    charts: {
        throughputHistory: { date: string; count: number }[];
        leadTimeHistory: { date: string; days: number }[];
    };
}

export interface DbPlan {
    id: number;
    nome: string;
    valor: number;
    meses: number;
    descricao: string;
    colabtotal: number;
}

export interface CmsCase {
    id: string;
    title: string;
    category: string;
    description: string;
    metric: string;
    image_url: string;
    link_url?: string;
    created_at: string;
}

export interface CmsPost {
    id: string;
    title: string;
    slug: string;
    content: string;
    cover_image?: string;
    tags: string[];
    published: boolean;
    created_at: string;
    updated_at?: string;
    download_title?: string;
    download_url?: string;
    download_image_url?: string;
    seo_title?: string;
    seo_description?: string;
    keywords?: string;
    og_image?: string;
}

export interface CrmOpportunity {
    id: string;
    organizationId: number;
    title: string;
    value: number;
    probability: number;
    stage: CrmStage;
    expectedCloseDate: string;
    owner: string;
    createdAt: string;
    lastInteraction: string;
    contact: {
        name: string;
        role: string;
        email: string;
        phone: string;
        source?: string;
    };
    company: {
        name: string;
        cnpj?: string;
        sector?: string;
        address?: string;
    };
    activities: CrmActivity[];
}

export type CrmStage = 'qualification' | 'proposal' | 'negotiation' | 'won' | 'lost';

export interface CrmActivity {
    id: string;
    type: 'call' | 'email' | 'meeting' | 'task';
    subject: string;
    date: string;
    status: 'pending' | 'completed';
    owner: string;
}

export interface AreaAtuacao {
    id: number;
    nome: string;
}

export const getTerminology = (orgType?: string) => {
    return {
        painPointLabel: "Dor",
        revenueLabel: "Receita",
        viabilityLabel: "Viabilidade",
        mvpLabel: "Velocidade",
        scalabilityLabel: "Escalabilidade",
        integrationLabel: "Integração",
        recurringLabel: "Recorrência",
        mrrLabel: "MRR",
        intensities: {
            1: "Baixa Intensidade",
            2: "Média Intensidade",
            3: "Alta Intensidade",
            4: "Crítica"
        },
        archetypes: {
            [Archetype.SAAS_ENTRY]: { label: 'SaaS de Entrada', desc: 'Software pronto para escala com baixo toque humano.' },
            [Archetype.SAAS_PLATFORM]: { label: 'SaaS Plataforma', desc: 'Ecossistema complexo com múltiplas integrações.' },
            [Archetype.MOBILE_APP]: { label: 'Mobile App', desc: 'Foco em experiência mobile nativa de alta performance.' },
            [Archetype.INTERNAL_MARKETING]: { label: 'Interno / Marketing', desc: 'Otimização de processos, landing pages ou infra de marketing.' },
            [Archetype.CONSULTANCY]: { label: 'Consultoria / Serviço', desc: 'Entrega de valor baseada em horas técnicas e autoridade.' }
        }
    };
};