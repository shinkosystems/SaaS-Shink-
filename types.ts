
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

// --- PLAN CONFIGURATION ---
export const PLAN_LIMITS: Record<string, { 
    maxProjects: number; 
    features: { 
        financial: boolean; 
        clients: boolean; 
        metrics: boolean; 
        pdfUpload: boolean; 
        gantt: boolean;
    } 
}> = {
    'plan_free': {
        maxProjects: 3,
        features: { financial: false, clients: false, metrics: false, pdfUpload: false, gantt: true }
    },
    'plan_consultant': {
        maxProjects: 9999,
        features: { financial: false, clients: false, metrics: false, pdfUpload: false, gantt: true }
    },
    'plan_studio': {
        maxProjects: 9999,
        features: { financial: true, clients: true, metrics: false, pdfUpload: true, gantt: true }
    },
    'plan_scale': {
        maxProjects: 9999,
        features: { financial: true, clients: true, metrics: true, pdfUpload: true, gantt: true }
    },
    'plan_agency': {
        maxProjects: 9999,
        features: { financial: true, clients: true, metrics: true, pdfUpload: true, gantt: true }
    }
};

// --- DB SCHEMA TYPES (POSTGRESQL) ---

export interface DbPlan {
  id: number;
  nome: string;
  valor: number;
  meses: number;
  descricao: string;
}

export interface DbClientPlan {
  id: number;
  created_at: string;
  dono: string; // UUID
  plano: number; // FK
  datainicio: string;
  datafim: string;
  valor: number;
}

export interface DbClient {
  id: string; // UUID
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
  id: number; // BigInt
  nome: string;
  cliente: string | null; // UUID FK -> clientes.id
  descricao: string;
  
  // Shinko Framework Fields
  rde: string;
  velocidade: number;
  viabilidade: number;
  receita: number;
  prioseis: number;
  arquetipo: string;
  intensidade: number;
  
  // TADS Flags
  tadsescalabilidade: boolean;
  tadsintegracao: boolean;
  tadsdorreal: boolean;
  tadsrecorrencia: boolean;
  tadsvelocidade: boolean;

  organizacao: number;
  projoport: boolean; // True se for apenas oportunidade, False se virou projeto
  created_at: string;
  
  // AI & Structure
  bpmn_structure?: any;
  contexto_ia?: string;

  // Relations (Hydrated in Service)
  clienteData?: { nome: string, logo_url?: string };
  tasks?: DbTask[];
}

// Mapped to table 'tasks'
export interface DbTask {
  id: number; // BigInt
  projeto: number | null; // FK -> projetos.id (Null allowed for Free Tasks)
  titulo: string;
  descricao: string;
  status: string;
  responsavel: string; // UUID FK -> auth.users.id (NOT NULL)
  
  // GUT
  gravidade: number;
  urgencia: number;
  tendencia: number;
  
  // Dates & Time
  dataproposta: string;
  deadline?: string;
  datainicio?: string;
  datafim?: string;
  duracaohoras: number;
  
  // Structure
  sutarefa: boolean;
  tarefa?: number | null; // Parent Task ID (or tarefamae)
  tarefamae?: number | null; // Optional alias if DB schema uses this
  
  organizacao: number;
  createdat: string;

  // Relations (Manually Hydrated)
  projetoData?: { nome: string }; 
  responsavelData?: { nome: string, desenvolvedor: boolean, organizacao: number, avatar_url?: string };
}

// --- FRONTEND ADAPTERS ---

export type TaskStatus = 'todo' | 'doing' | 'review' | 'approval' | 'done' | 'backlog';

export interface BpmnTask {
  id: string; 
  displayId?: number;
  text: string; 
  description?: string;
  completed: boolean;
  completedAt?: string;
  status: TaskStatus;
  startDate?: string;
  dueDate?: string;
  assignee?: string;
  assigneeId?: string; // UUID for DB
  subtasks?: BpmnSubTask[];
  gut?: { g: number, u: number, t: number };
  estimatedHours?: number;
  
  // Internal tracking
  dbId?: number;
  projectId?: number;
  isSubtask?: boolean;
  parentId?: number;
  assigneeIsDev?: boolean; 
}

export interface BpmnSubTask {
  id: string;
  text: string;
  completed: boolean;
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

export interface Attachment {
    id: string;
    name: string;
    size: string;
    type: string;
    uploadedAt: string;
    url: string;
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

// Unified Opportunity Interface (Frontend Model)
export interface Opportunity {
  id: string; // Cast from BigInt to string for frontend consistency
  title: string;
  description: string;
  
  clientId?: string;
  organizationId?: number;
  
  // Framework Fields
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
  
  // Execution
  bpmn?: BpmnData; // Construct this from 'tasks' relation
  
  status: ProjectStatus;
  createdAt: string;
  priorityLock?: boolean;
  
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
    organizationId: number; // Mapped from organization_id
    isContract?: boolean;
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
    name: string;
    price: number;
    features: string[];
    recommended: boolean;
    cycle: 'MONTHLY' | 'YEARLY';
}