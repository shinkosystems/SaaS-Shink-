
export type ProcessCategory = 'Apoio-Adm' | 'Apoio-Gestão' | 'Primária-Modelagem' | 'Primária-Interface' | 'Primária-Lógica' | 'Primária-Marketing';
export type ProcessStatus = 'To-do' | 'Doing' | 'Done';

export interface TaskProcess {
    id: string;
    projeto_id: number;
    title: string;
    category: ProcessCategory;
    status: ProcessStatus;
    estimated_cost_weight: number;
    evidence_url?: string;
    organizacao_id: number;
    created_at: string;
}

export enum RDEStatus {
    HOT = 'Quente',
    WARM = 'Morno',
    COLD = 'Frio'
}

export enum Archetype {
    SAAS_ENTRY = 'SaaS de Entrada',
    SAAS_PLATFORM = 'SaaS Plataforma',
    SERVICE_TECH = 'Serviço Tecnológico',
    INTERNAL_MARKETING = 'Interno / Marketing'
}

export enum IntensityLevel {
    L1 = 1,
    L2 = 2,
    L3 = 3,
    L4 = 4
}

export interface TadsCriteria {
    scalability: boolean;
    integration: boolean;
    painPoint: boolean;
    recurring: boolean;
    mvpSpeed: boolean;
}

export type ProjectStatus = 'Active' | 'Negotiation' | 'Future' | 'Frozen' | 'Archived' | 'won' | 'lost';

export interface Attachment {
    id: string;
    name: string;
    size: string;
    type: string;
    url: string;
    uploadedAt: string;
}

export type TaskStatus = 'todo' | 'doing' | 'review' | 'approval' | 'done' | 'backlog';

export interface BpmnSubTask {
    id: string;
    dbId?: number;
    text: string;
    completed: boolean;
    assigneeId?: string;
    dueDate?: string;
    startDate?: string;
    estimatedHours?: number;
}

export interface BpmnTask {
    id: string;
    dbId?: number;
    displayId?: number;
    text: string;
    description: string;
    category?: string;
    status: TaskStatus;
    completed: boolean;
    completedAt?: string;
    dueDate?: string;
    startDate?: string;
    createdAt?: string;
    assignee?: string;
    assigneeId?: string;
    estimatedHours?: number;
    gut?: { g: number; u: number; t: number };
    tags?: string[];
    members?: string[];
    attachments?: Attachment[];
    subtasks?: BpmnSubTask[];
}

export interface BpmnNode {
    id: string;
    label: string;
    checklist: BpmnTask[];
}

export interface Opportunity {
    id: string;
    dbProjectId?: number;
    title: string;
    description: string;
    clientId?: string;
    organizationId?: number;
    rde: RDEStatus;
    viability: number;
    velocity: number;
    revenue: number;
    prioScore: number;
    tads: TadsCriteria;
    tadsScore: number;
    archetype: Archetype;
    intensity: IntensityLevel;
    status: ProjectStatus;
    createdAt: string;
    mrr: number;
    meses: number;
    bpmn?: {
        nodes: BpmnNode[];
        lanes: any[];
        edges: any[];
        status?: string;
    };
    docsContext?: string;
    pdfUrl?: string;
    color?: string;
    dbId?: string;
}

export interface DbProject {
    id: number;
    nome: string;
    descricao?: string;
    cliente?: string;
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
    created_at: string;
    bpmn_structure?: any;
    contexto_ia?: string;
    pdf_url?: string;
    cor?: string;
    projoport?: boolean;
    mrr?: number;
    meses?: number;
}

export interface DbTask {
    id: number;
    projeto?: number;
    projetoData?: { nome: string; cor: string, mrr?: number, meses?: number };
    titulo: string;
    descricao: string;
    status: string;
    responsavel: string;
    responsavelData?: any;
    category?: string;
    gravidade?: number;
    urgencia?: number;
    tendencia?: number;
    dataproposta: string;
    datainicio?: string;
    datafim?: string;
    duracaohoras?: number;
    sutarefa?: boolean;
    tarefamae?: number;
    organizacao: number;
    membros?: string[];
    etiquetas?: string[];
    createdat: string;
    anexos?: Attachment[];
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
    isRecurring?: boolean;
    periodicity?: 'monthly' | 'quarterly' | 'semiannual' | 'yearly';
    installments?: number;
    metadata?: any;
    pago?: boolean;
    comprovante?: string;
    orgName?: string;
    modulos?: number[];
}

export interface Comment {
    id: string;
    task: number;
    usuario: string;
    mensagem: string;
    created_at: string;
    user_data?: {
        nome: string;
        avatar_url: string | null;
    }
}

export interface AsaasPayment {
    id: string;
    value: number;
    status: string;
    date: string;
    invoiceUrl?: string;
    bankSlipUrl?: string;
}

export interface SubscriptionPlan {
    id: string;
    dbId: number;
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

export interface DbClient {
    id: string;
    nome: string;
    email: string;
    telefone: string;
    cnpj: string;
    endereco: string;
    numcolaboradores: number;
    valormensal: number;
    meses: number;
    data_inicio: string;
    contrato: string;
    logo_url: string;
    status: string;
    organizacao: number;
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
    event_type: 'page_view' | 'feature_use' | 'nps_response' | 'error';
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

export interface AreaAtuacao {
    id: number;
    nome: string;
    custo_base?: number;
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
    image_url: string;
    metric?: string;
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
    updated_at: string;
    seo_title?: string;
    seo_description?: string;
    keywords?: string;
    download_title?: string;
    download_url?: string;
    download_image_url?: string;
    og_image?: string;
}

export const PLAN_LIMITS: Record<string, number> = {
    'plan_free': 1,
    'plan_solo': 1,
    'plan_studio': 5,
    'plan_scale': 15,
    'plan_enterprise': 100
};

export type CrmStage = 'qualification' | 'proposal' | 'negotiation' | 'won' | 'lost';

export interface CrmActivity {
    id: string;
    type: 'call' | 'email' | 'meeting' | 'task';
    subject: string;
    date: string;
    status: 'pending' | 'completed';
    owner: string;
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

export const getTerminology = (orgType?: string) => {
    return {
        painPointLabel: "Dor do Usuário",
        mvpLabel: "Tempo para MVP",
        viabilityLabel: "Viabilidade Técnica",
        revenueLabel: "Potencial de Receita",
        scalabilityLabel: "Escalabilidade",
        integrationLabel: "Integração",
        recurringLabel: "Recorrência",
        mrrLabel: "MRR",
        archetypes: {
            [Archetype.SAAS_ENTRY]: { label: "SaaS de Entrada", desc: "Software simples with foco em dor única." },
            [Archetype.SAAS_PLATFORM]: { label: "Plataforma SaaS", desc: "Ecossistema complexo com múltiplas features." },
            [Archetype.SERVICE_TECH]: { label: "Serviço Tech", desc: "Híbrido entre software e consultoria especializada." },
            [Archetype.INTERNAL_MARKETING]: { label: "Interno / Marketing", desc: "Ferramenta para otimização de processos próprios." }
        },
        intensities: {
            [IntensityLevel.L1]: "Foco em MVP e validação de hipótese.",
            [IntensityLevel.L2]: "Desenvolvimento de core features.",
            [IntensityLevel.L3]: "Escalonamento e otimização de performance.",
            [IntensityLevel.L4]: "Manutenção crítica e expansão de mercado."
        }
    };
};
