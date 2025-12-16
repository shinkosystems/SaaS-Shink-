
export enum RDEStatus {
  HOT = 'Quente',
  WARM = 'Morno',
  COLD = 'Frio'
}

export enum Archetype {
  SAAS_ENTRY = 'SaaS de Entrada',
  SAAS_VERTICAL = 'SaaS Verticalizado',
  SERVICE_TECH = 'Serviço + Tecnologia',
  PLATFORM = 'Plataforma de Automação',
  INTERNAL = 'Interno / Marketing' 
}

export enum IntensityLevel {
  L1 = 1,
  L2 = 2,
  L3 = 3,
  L4 = 4
}

// --- CMS TYPES ---
export interface CmsCase {
    id: string;
    title: string;
    category: string;
    description: string;
    metric: string;
    image_url: string;
    link_url?: string;
    created_at?: string;
}

export interface CmsPost {
    id: string;
    title: string;
    slug?: string;
    cover_image: string;
    content: string; // HTML
    tags: string[];
    download_url?: string;
    download_title?: string;
    published: boolean;
    created_at: string;
}

// --- PLAN CONFIGURATION ---
export const PLAN_LIMITS: Record<string, { 
    maxProjects: number; 
    maxUsers: number;
    aiLimit: number; 
    features: { 
        financial: boolean; 
        clients: boolean; 
        metrics: boolean; 
        pdfUpload: boolean; 
        gantt: boolean;
        kanban: boolean; 
        whitelabel: boolean;
        aiAdvanced: boolean;
        crm: boolean; 
    } 
}> = {
    'plan_free': { maxProjects: 1, maxUsers: 1, aiLimit: 0, features: { financial: false, clients: false, metrics: false, pdfUpload: false, gantt: false, kanban: true, whitelabel: false, aiAdvanced: false, crm: true } },
    
    // MONTHLY PLANS
    'plan_solo': { maxProjects: 9999, maxUsers: 1, aiLimit: 50, features: { financial: false, clients: false, metrics: false, pdfUpload: false, gantt: true, kanban: true, whitelabel: false, aiAdvanced: false, crm: true } },
    'plan_studio': { maxProjects: 9999, maxUsers: 5, aiLimit: 500, features: { financial: true, clients: true, metrics: false, pdfUpload: true, gantt: true, kanban: true, whitelabel: false, aiAdvanced: true, crm: true } },
    'plan_scale': { maxProjects: 9999, maxUsers: 15, aiLimit: 9999, features: { financial: true, clients: true, metrics: true, pdfUpload: true, gantt: true, kanban: true, whitelabel: false, aiAdvanced: true, crm: true } },
    
    // YEARLY PLANS (Mirror Monthly Features)
    'plan_solo_yearly': { maxProjects: 9999, maxUsers: 1, aiLimit: 50, features: { financial: false, clients: false, metrics: false, pdfUpload: false, gantt: true, kanban: true, whitelabel: false, aiAdvanced: false, crm: true } },
    'plan_studio_yearly': { maxProjects: 9999, maxUsers: 5, aiLimit: 500, features: { financial: true, clients: true, metrics: false, pdfUpload: true, gantt: true, kanban: true, whitelabel: false, aiAdvanced: true, crm: true } },
    'plan_scale_yearly': { maxProjects: 9999, maxUsers: 15, aiLimit: 9999, features: { financial: true, clients: true, metrics: true, pdfUpload: true, gantt: true, kanban: true, whitelabel: false, aiAdvanced: true, crm: true } },

    'plan_enterprise': { maxProjects: 999999, maxUsers: 999999, aiLimit: 999999, features: { financial: true, clients: true, metrics: true, pdfUpload: true, gantt: true, kanban: true, whitelabel: true, aiAdvanced: true, crm: true } }
};

// --- CRM TYPES ---
export type CrmStage = 'qualification' | 'proposal' | 'negotiation' | 'won' | 'lost';

export interface CrmActivity {
    id: string;
    type: 'call' | 'email' | 'meeting' | 'task';
    subject: string;
    date: string;
    duration?: string;
    status: 'pending' | 'completed';
    owner: string;
}

export interface CrmContact {
    name: string;
    role: string;
    email: string;
    phone: string;
    linkedin?: string;
    source?: string;
}

export interface CrmCompany {
    name: string;
    cnpj?: string;
    site?: string;
    address?: string;
    sector?: string;
    size?: string;
}

export interface CrmOpportunity {
    id: string;
    organizationId?: number;
    title: string;
    value: number;
    probability: number;
    stage: CrmStage;
    expectedCloseDate: string;
    owner: string;
    contact: CrmContact;
    company: CrmCompany;
    activities: CrmActivity[];
    createdAt: string;
    lastInteraction: string;
}

// --- DB SCHEMA TYPES (POSTGRESQL) ---

export interface AreaAtuacao {
    id: number;
    nome: string;
}

export interface DbPlan {
  id: number;
  nome: string;
  valor: number;
  meses: number;
  descricao: string;
  colabtotal?: number;
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
  created_at: string;
  organizacao: number;
  tipo_pessoa?: string; 
}

export interface DbProject {
  id: number;
  nome: string;
  cliente: string | null;
  descricao: string;
  rde: string;
  velocidade: number;
  viabilidade: number;
  receita: number;
  prioseis: number;
  arquetipo: string;
  intensidade: number;
  tadsescalabilidade: boolean;
  tadsintegracao: boolean;
  tadsdorreal: boolean;
  tadsrecorrencia: boolean;
  tadsvelocidade: boolean;
  organizacao: number;
  projoport: boolean;
  created_at: string;
  cor?: string;
  bpmn_structure?: any;
  contexto_ia?: string;
  clienteData?: { nome: string, logo_url?: string };
  tasks?: DbTask[];
}

// Mapped to table 'tasks'
export interface DbTask {
  id: number; // BigInt
  projeto: number | null; 
  titulo: string;
  descricao: string;
  status: string;
  responsavel: string; // UUID FK
  
  // New Arrays
  membros: string[]; // UUID[]
  etiquetas: string[]; // text[]
  anexos?: Attachment[]; // JSONB for attachments

  // GUT
  gravidade: number;
  urgencia: number;
  tendencia: number;
  
  // Dates & Time
  dataproposta: string;
  deadline?: string;
  datainicio?: string;
  datafim?: string;
  
  // Lifecycle Dates
  dataafazer?: string;
  datafazendo?: string;
  datarealizando?: string;
  datarevisao?: string;
  dataaprovacao?: string;
  dataconclusao?: string;

  duracaohoras: number;
  
  // Structure
  sutarefa: boolean;
  tarefa?: number | null;
  tarefamae?: number | null;
  
  organizacao: number;
  createdat: string;

  // Relations
  projetoData?: { nome: string, cor?: string }; 
  responsavelData?: { nome: string, desenvolvedor: boolean, organizacao: number, avatar_url?: string };
}

// --- FRONTEND ADAPTERS ---

export type TaskStatus = 'todo' | 'doing' | 'review' | 'approval' | 'done' | 'backlog';

export interface Attachment {
    id: string;
    name: string;
    size: string;
    type: string;
    uploadedAt: string;
    url: string;
    taskId?: string;
}

export interface BpmnTask {
  id: string; 
  displayId?: number;
  text: string; 
  description?: string;
  completed: boolean;
  completedAt?: string;
  createdAt?: string; 
  status: TaskStatus;
  startDate?: string;
  dueDate?: string;
  deadline?: string;
  assignee?: string;
  assigneeId?: string; // Main Assignee
  members?: string[]; // Multiple Assignees (UUIDs)
  tags?: string[]; // Labels
  
  subtasks?: BpmnSubTask[];
  gut?: { g: number, u: number, t: number };
  estimatedHours?: number;
  
  dbId?: number;
  projectId?: number;
  projectTitle?: string;
  isSubtask?: boolean;
  parentId?: number;
  assigneeIsDev?: boolean; 
  suggestedRoleId?: number;
  attachments?: Attachment[];

  // Lifecycle for Timeline
  lifecycle?: {
      created: string;
      todo?: string;
      doing?: string;
      review?: string;
      approval?: string;
      done?: string;
  };
}

export interface BpmnSubTask {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
  dbId?: number;
  dueDate?: string;
  startDate?: string;
  estimatedHours?: number;
  assignee?: string;
  assigneeId?: string;
}

export type ProjectStatus = 'Active' | 'Negotiation' | 'Future' | 'Archived' | 'Frozen' | 'Priority' | 'High';

export interface BpmnNode {
    id: string; 
    label: string; 
    laneId: string; 
    type: 'start' | 'task' | 'decision' | 'end';
    checklist: BpmnTask[];
    x?: number;
    y?: number;
}

export interface BpmnLane {
    id: string;
    label: string;
}

export interface BpmnEdge {
    from: string; 
    to: string;
}

export interface Comment {
    id: string;
    text: string;
    author: string;
    createdAt: string;
    type: 'user' | 'system';
    metadata?: any;
}

export interface BpmnData {
    lanes: BpmnLane[];
    nodes: BpmnNode[];
    edges: BpmnEdge[];
    priorityLock?: boolean;
    attachments?: Attachment[];
    comments?: Comment[];
    clientId?: string;
    organizationId?: number;
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
  evidence: any;
  bpmn?: BpmnData;
  status: ProjectStatus;
  createdAt: string;
  priorityLock?: boolean;
  color?: string;
  attachments?: Attachment[];
  comments?: Comment[];
  dbProjectId?: number;
  docsContext?: string;
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

export interface ProductEvent {
    id: string;
    user_id: string;
    event_type: string;
    event_data?: any;
    created_at: string;
}

export interface ProductMetricsData {
    dau: number;
    mau: number;
    engagementRatio: number;
    nps: number;
    featureEngagement: { feature: string, count: number, percentage: number }[];
    featureAdoption: { feature: string, percentage: number }[];
    timeToValue: number;
    activationRate: number;
    retentionRate: number;
    reactivationRate: number;
    crashRate: number;
    avgSessionDuration: number;
}

export interface DevMetricsData {
    leadTime: { value: number, unit: string, delta: number };
    cycleTime: { value: number, unit: string, delta: number };
    throughput: { value: number, unit: string, delta: number };
    wip: { value: number, unit: string, delta: number };
    deploymentFrequency: { value: number, unit: string, rating: string };
    changeFailureRate: { value: number, unit: string, rating: string };
    mttr: { value: number, unit: string, rating: string };
    leadTimeForChanges: { value: number, unit: string, rating: string };
    bugRate: { value: number, unit: string, delta: number };
    codeChurn: { value: number, unit: string, delta: number };
    charts: {
        throughputHistory: { date: string, count: number }[];
        leadTimeHistory: { date: string, days: number }[];
    };
}

export interface AsaasPayment {
    id: string;
    dateCreated: string;
    customer: string;
    paymentLink: string | null;
    value: number;
    netValue: number;
    billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO' | 'UNDEFINED';
    status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'RECEIVED_IN_CASH' | 'REFUND_REQUESTED' | 'CHARGEBACK_REQUESTED' | 'CHARGEBACK_DISPUTE' | 'AWAITING_CHARGEBACK_REVERSAL' | 'DUNNING_REQUESTED' | 'DUNNING_RECEIVED' | 'AWAITING_RISK_ANALYSIS';
    description: string;
    invoiceUrl: string;
}

export interface AsaasSubscription {
    id: string;
    dateCreated: string;
    customer: string;
    paymentLink?: string;
    value: number;
    nextDueDate: string;
    cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
    description?: string;
    billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO' | 'UNDEFINED';
    status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'OVERDUE';
}

export interface SubscriptionPlan {
    id: string; 
    dbId?: number;
    name: string;
    price: number;
    features: string[];
    recommended: boolean;
    cycle: 'MONTHLY' | 'YEARLY';
}
