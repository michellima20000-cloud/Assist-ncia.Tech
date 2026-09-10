export type UserRole = 'admin' | 'employee';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
}

export interface Cliente {
  id: string;
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
  name: string;
  description: string;
  price: number;
  position: number;
  isPriceCustom: boolean; // Valor definido pelo atendente
}

export interface Produto {
  id: string;
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
  description: string;
  amount: number;
  date: string;
}

export interface Convenio {
  id: string;
  name: string;
  discountPercent: number;
}

export interface Agendamento {
  id: string;
  clienteId: string;
  date: string;
  time: string;
  service: string;
  notes: string;
}

export interface Pagamento {
  id: string;
  atendimentoId?: string;
  vendaId?: string;
  isVendaDirecta?: boolean;
  totalAmount: number;
  receivedAmount: number;
  change: number;
  method: 'cash' | 'debit' | 'credit' | 'pix';
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
  clienteId?: string;
  clienteName?: string;
  items: VendaItem[];
  totalAmount: number;
  receivedAmount: number;
  change: number;
  method: 'cash' | 'debit' | 'credit' | 'pix';
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
  name: string;
}

export interface Item {
  id: string;
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
  };
}

export interface FeedbackItem {
  id: string;
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
