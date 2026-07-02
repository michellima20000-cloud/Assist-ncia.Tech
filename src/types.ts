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
  observations: string;
  photoUrl?: string;
  services: AtendimentoServico[];
  products: AtendimentoProduto[];
  entryDate: string;
  exitDate?: string;
  totalAmount: number;
  notesFin?: string;
  paymentId?: string;
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
  stock: number;
  minStockAlert: number;
  barcode: string;
  position: number;
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
  atendimentoId: string;
  totalAmount: number;
  receivedAmount: number;
  change: number;
  method: 'cash' | 'debit' | 'credit';
  date: string;
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
