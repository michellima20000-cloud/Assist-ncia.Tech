export type UserRole = 'superadmin' | 'admin' | 'gerente' | 'tecnico' | 'atendente' | 'employee' | 'barbeiro';

export interface Company {
  id: string;
  name: string;
  slug?: string;
  email?: string;
  ownerEmail?: string;
  ownerName?: string;
  phone?: string;
  document?: string;
  cnpj?: string;
  address?: string;
  plan?: string;
  active?: boolean;
  createdAt: string;
  updatedAt?: string;
  userCount?: number;
  osCount?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  status?: 'ativo' | 'inativo' | 'pendente' | 'bloqueado';
  active?: boolean;
  avatarIcon?: string;
  avatarColor?: string;
  customBadgeTitle?: string;
  companyId?: string;
  companyName?: string;
  phone?: string;
  // Assinatura e Controle de Barbeiros / Usuários
  plan?: string; // "essencial" | "profissional" | "extra" | "mensal_60"
  planName?: string; // "ESSENCIAL (1 CONTA)" | "PROFISSIONAL (3 CONTAS)"
  planCapacity?: number; // 1, 3 etc.
  extraAccounts?: number; // 0, 1, 2 etc.
  subscriptionStatus?: 'active' | 'trial' | 'pending_pix' | 'expired';
  trialEndsAt?: string; // Data ISO ex: "2026-10-15"
  expiresAt?: string; // Data ISO ex: "2026-10-01"
  daysPaid?: number; // dias pagos
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  comprovanteUrl?: string;
  paymentNotes?: string;
  createdAt?: string;
  activatedAt?: string;
  activatedBy?: string;
}

export interface PixConfig {
  id?: string;
  pixKey: string;
  pixKeyType: 'cpf' | 'cnpj' | 'phone' | 'email' | 'random';
  pixFormat?: 'standard' | 'qr_emv' | 'simple';
  receiverName: string;
  receiverCity?: string;
  receiverBank?: string;
  planEssencialPrice?: number;
  planProfissionalPrice?: number;
  trialDays?: number;
  audioUrl?: string;
  audioTitle?: string;
  audioBase64?: string;
  instructionText?: string;
  updatedAt?: string;
}

export interface PixSubscriptionRequest {
  id: string;
  userId?: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  plan: string;
  planName: string;
  planInterval: 'monthly' | 'annual';
  amount: number;
  extraAccounts?: number;
  comprovanteUrl?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface SubscriptionInvoice {
  id: string;
  planName: string;
  paidAt: string;
  expiresAt: string;
  amount: number;
  status?: string;
}

export interface SubscriptionConfig {
  activePlan: 'mensal' | 'anual';
  status: 'active' | 'trial' | 'expired';
  validUntil: string;
  monthlyPrice: number;
  annualPrice: number;
  pixKey: string;
  pixKeyType: string;
  pixReceiverName: string;
  pixCity: string;
  whatsappContact: string;
  history: SubscriptionInvoice[];
}

export interface SubscriptionInfo {
  id: string;
  companyId: string;
  companyName: string;
  planId: string;
  planName: string;
  status: "active" | "trial" | "past_due" | "suspended";
  expiresAt: string;
  startedAt?: string;
  maxAccounts: number;
  maxEmployees: number;
  price?: number;
  notes?: string;
  contactEmail?: string;
  contactPhone?: string;
  phone?: string;
  isExpired?: boolean;
  daysRemaining?: number;
  ownerName?: string;
  lastPaymentDate?: string;
}

export interface Cliente {
  id: string;
  companyId?: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  cnpj?: string;
  documentType?: 'cpf' | 'cnpj';
  address: string;
}

export interface AtendimentoServico {
  serviceId: string;
  name: string;
  price: number;
}

export interface AtendimentoProduto {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  cost?: number;
}

export type AtendimentoStatus = 'na_assistencia' | 'entrega' | 'finalizado';

export interface Atendimento {
  id: string;
  companyId?: string;
  controlNumber: string;
  status: AtendimentoStatus;
  clienteId: string;
  item: string;
  brand: string;
  model: string;
  imei?: string;
  defeito?: string;
  observations: string;
  photoUrl?: string;
  photoUrls?: string[];
  services: AtendimentoServico[];
  products: AtendimentoProduto[];
  entryDate: string;
  exitDate?: string;
  totalAmount: number;
  notesFin?: string;
  paymentId?: string;
  senhaDesbloqueio?: string;
  padraoDesbloqueio?: string;
  inicioServico?: string;
  fimServico?: string;
  numeroSerie?: string;
  detailedStatus?: string;
  garantia?: string;
}

export interface Servico {
  id: string;
  companyId?: string;
  name: string;
  description: string;
  price: number;
  position: number;
  isPriceCustom: boolean; // Valor definido pelo atendente
}

export interface Produto {
  id: string;
  companyId?: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  stock: number;
  minStockAlert: number;
  barcode: string;
  position: number;
  imageUrl?: string;
  warranty?: string;
  autoRestock?: boolean; // Flag to indicate product should be tracked for automated shopping/replenishment
  targetStock?: number; // Ideal/target quantity in stock after restock
  supplier?: string; // Preferred supplier or distributor name
  supplierPhone?: string; // Supplier WhatsApp/phone for direct ordering
}

export interface Despesa {
  id: string;
  companyId?: string;
  description: string;
  amount: number;
  date: string;
}

export interface Convenio {
  id: string;
  companyId?: string;
  name: string;
  discountPercent: number;
}

export interface Agendamento {
  id: string;
  companyId?: string;
  clienteId: string;
  date: string;
  time: string;
  service: string;
  notes: string;
}

export interface SplitPaymentDetail {
  cash?: number;
  cashGiven?: number;
  cashChange?: number;
  pix?: number;
  debit?: number;
  credit?: number;
  total?: number;
}

export interface Pagamento {
  id: string;
  companyId?: string;
  atendimentoId?: string;
  vendaId?: string;
  isVendaDirecta?: boolean;
  totalAmount: number;
  receivedAmount: number;
  change: number;
  method: 'cash' | 'debit' | 'credit' | 'pix' | 'misto' | 'split';
  splitPayments?: SplitPaymentDetail;
  notesFin?: string;
  date: string;
}

export interface VendaItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  cost?: number;
}

export interface Venda {
  id: string;
  companyId?: string;
  clienteId?: string;
  clienteName?: string;
  items: VendaItem[];
  totalAmount: number;
  receivedAmount: number;
  change: number;
  method: 'cash' | 'debit' | 'credit' | 'pix' | 'misto' | 'split';
  splitPayments?: SplitPaymentDetail;
  date: string;
  sellerId?: string;
  sellerName?: string;
  observations?: string;
  garantia?: string;
  status?: 'finalizada' | 'estornada' | 'aberta';
  estornoReason?: string;
  estornoDate?: string;
}

export interface Marca {
  id: string;
  companyId?: string;
  name: string;
}

export interface Item {
  id: string;
  companyId?: string;
  name: string;
}

export interface DashboardStats {
  naAssistenciaCount: number;
  entregaCount: number;
  financials: {
    cash: number;
    card: number;
    pending: number;
    expenses: number;
    totalCollected: number;
    directSalesTotal?: number;
    serviceOrdersTotal?: number;
  };
}

export interface FeedbackItem {
  id: string;
  companyId?: string;
  clienteId?: string;
  clienteName: string;
  clientePhone: string;
  atendimentoId?: string;
  controlNumber?: string;
  vendaId?: string;
  item?: string;
  brand?: string;
  model?: string;
  scheduledTime: string;
  status: 'pending' | 'sent' | 'canceled';
  messageText: string;
  createdAt: string;
  sentAt?: string;
}

export interface FeedbackConfig {
  enabled: boolean;
  delayHours: number;
  messageTemplate: string;
  readyMessageTemplate?: string;
  entryMessageTemplate?: string;
  googleReviewUrl?: string;
}

export type ThemeMode = 'light' | 'black' | 'pure_black';

export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor: string;
  headerColor: string;
  headerStyle: 'primary' | 'black' | 'gradient';
  cardContrast?: 'normal' | 'high';
  companyName?: string;
  logoUrl?: string;
  showLogoInHeader?: boolean;
  showLogoAsBackground?: boolean;
  backgroundLogoOpacity?: number; // e.g., 0.04 to 0.25 (default 0.07)
  updatedAt?: string;
}
