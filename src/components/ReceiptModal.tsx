import React, { useState, useEffect } from "react";
import { X, Printer, Check, Copy, MessageSquare, Settings, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { jsPDF } from "jspdf";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  phone?: string;
  clientName?: string;
}

interface BusinessSettings {
  name: string;
  address: string;
  phone: string;
  cnpj: string;
  showQrCode: boolean;
}

const DEFAULT_BUSINESS: BusinessSettings = {
  name: "L Tec Assistência Técnica e Acessórios",
  address: "Rua Benfica N08 Box 04",
  phone: "(91) 98306-9881",
  cnpj: "66.204.339.0001/18",
  showQrCode: true,
};

// Vector-perfect SVG Logo matching L-Tec's real visual brand!
const LTecLogo = ({ className = "w-16 h-16" }: { className?: string }) => (
  <svg viewBox="0 0 100 115" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Laptop Screen in background */}
    <rect x="18" y="16" width="64" height="41" rx="4" stroke="#000000" strokeWidth="4.5" fill="none" />
    {/* Laptop Base */}
    <path d="M 15 57 L 9 66 H 91 L 85 57" stroke="#000000" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    {/* Smartphone (white fill masks background laptop screen lines) */}
    <rect x="33" y="5" width="34" height="48" rx="6" stroke="#000000" strokeWidth="4.5" fill="#ffffff" />
    {/* Smartphone Screen */}
    <rect x="38.5" y="14" width="23" height="28" rx="2.5" stroke="#000000" strokeWidth="3.5" fill="none" />
    {/* Smartphone Speaker */}
    <rect x="45" y="10" width="10" height="2" rx="1" fill="#000000" />
    {/* Smartphone Home Button */}
    <rect x="45" y="45" width="10" height="2" rx="1" fill="#000000" />
    
    {/* Text Logo Details matching real L-Tec attached brand */}
    <text x="50" y="82" fill="#000000" fontSize="15" fontWeight="900" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.5">L.Tec</text>
    <text x="50" y="96" fill="#000000" fontSize="7" fontWeight="800" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.8">ASSISTÊNCIA TÉCNICA</text>
    <text x="50" y="106" fill="#000000" fontSize="5.5" fontWeight="700" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.2">CELULARES E INFORMÁTICA</text>
  </svg>
);

const ltecLogoSvgHtml = `
  <svg viewBox="0 0 100 115" style="width: 85px; height: 98px;" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Laptop Screen in background -->
    <rect x="18" y="16" width="64" height="41" rx="4" stroke="#000000" stroke-width="4.5" fill="none" />
    <!-- Laptop Base -->
    <path d="M 15 57 L 9 66 H 91 L 85 57" stroke="#000000" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <!-- Smartphone (white fill masks background laptop screen lines) -->
    <rect x="33" y="5" width="34" height="48" rx="6" stroke="#000000" stroke-width="4.5" fill="#ffffff" />
    <!-- Smartphone Screen -->
    <rect x="38.5" y="14" width="23" height="28" rx="2.5" stroke="#000000" stroke-width="3.5" fill="none" />
    <!-- Smartphone Speaker -->
    <rect x="45" y="10" width="10" height="2" rx="1" fill="#000000" />
    <!-- Smartphone Home Button -->
    <rect x="45" y="45" width="10" height="2" rx="1" fill="#000000" />
    
    <!-- Text Logo Details matching real L-Tec attached brand -->
    <text x="50" y="82" fill="#000000" font-size="15" font-weight="900" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" letter-spacing="0.5">L.Tec</text>
    <text x="50" y="96" fill="#000000" font-size="7" font-weight="800" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" letter-spacing="0.8">ASSISTÊNCIA TÉCNICA</text>
    <text x="50" y="106" fill="#000000" font-size="5.5" font-weight="700" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" letter-spacing="0.2">CELULARES E INFORMÁTICA</text>
  </svg>
`;

interface ParsedItem {
  name: string;
  quantity: number;
  price: number;
}

interface ParsedReceipt {
  isServiceOrder: boolean;
  isVenda: boolean;
  title: string;
  controlNumber: string;
  date: string;
  clientName: string;
  clientPhone: string;
  clientCpf: string;
  equipmentName: string;
  imei: string;
  defeito: string;
  observations: string;
  items: ParsedItem[];
  totalAmount: number;
  receivedAmount: number;
  change: number;
  paymentMethod: string;
}

// Structured line-by-line receipt parser
function parseReceipt(content: string, defaultClientName: string = "", defaultPhone: string = "", originalTitle: string = ""): ParsedReceipt {
  const lines = content.split("\n").map(l => l.trim());
  
  const isServiceOrder = content.includes("CONTROLE:") || content.includes("APARELHO:") || content.includes("EQUIPAMENTO:") || content.includes("ORDEM DE SERVIÇO") || originalTitle.toLowerCase().includes("os") || originalTitle.toLowerCase().includes("entrada");
  const isVenda = content.includes("CUPOM DE VENDA DIRETA") || content.includes("VENDA:") || content.includes("ITENS VENDIDOS:") || originalTitle.toLowerCase().includes("venda");

  let controlNumber = "";
  let date = "";
  let clientName = defaultClientName;
  let clientPhone = defaultPhone;
  let clientCpf = "";
  let equipmentName = "";
  let imei = "";
  let defeito = "";
  let observations = "";
  let items: ParsedItem[] = [];
  let totalAmount = 0;
  let receivedAmount = 0;
  let change = 0;
  let paymentMethod = "Dinheiro";

  let inEquipment = false;
  let inServices = false;
  let inProducts = false;
  let inItemsVendidos = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const upper = line.toUpperCase();

    // Direct matches
    if (upper.startsWith("CONTROLE:")) {
      controlNumber = line.replace(/CONTROLE:\s*/i, "").trim();
    } else if (upper.startsWith("VENDA:")) {
      controlNumber = line.replace(/VENDA:\s*/i, "").trim();
    } else if (upper.startsWith("DATA:") || upper.startsWith("ENTRADA:") || upper.startsWith("FINALIZADO:")) {
      date = line.substring(line.indexOf(":") + 1).trim();
    } else if (upper.startsWith("CLIENTE:")) {
      clientName = line.replace(/CLIENTE:\s*/i, "").trim();
    } else if (upper.startsWith("FONE:") || upper.startsWith("FONE / WHATSAPP:") || upper.startsWith("CONTATO:")) {
      clientPhone = line.substring(line.indexOf(":") + 1).trim();
    } else if (upper.startsWith("CPF:")) {
      clientCpf = line.replace(/CPF:\s*/i, "").trim();
    } else if (upper.startsWith("DEFEITO:")) {
      defeito = line.replace(/DEFEITO:\s*/i, "").trim();
    } else if (upper.startsWith("ESTADO / OBS:") || upper.startsWith("ESTADO/OBS:") || upper.startsWith("LAUDO / OBSERVACOES SAIDA:") || upper.startsWith("LAUDO/OBSERVAÇÕES SAÍDA:")) {
      observations = line.substring(line.indexOf(":") + 1).trim();
    } else if (upper.startsWith("TOTAL ESTIMADO:") || upper.startsWith("TOTAL GERAL:") || upper.startsWith("TOTAL:")) {
      const match = line.match(/R\$\s*([\d.,]+)/i);
      if (match) {
        totalAmount = parseFloat(match[1].replace(/\./g, "").replace(",", "."));
      }
    } else if (upper.startsWith("VALOR RECEBIDO:") || upper.startsWith("RECEBIDO:")) {
      const match = line.match(/R\$\s*([\d.,]+)/i);
      if (match) {
        receivedAmount = parseFloat(match[1].replace(/\./g, "").replace(",", "."));
      }
    } else if (upper.startsWith("TROCO REGISTRADO:") || upper.startsWith("TROCO:")) {
      const match = line.match(/R\$\s*([\d.,]+)/i);
      if (match) {
        change = parseFloat(match[1].replace(/\./g, "").replace(",", "."));
      }
    } else if (upper.startsWith("FORMA DE PGTO:") || upper.startsWith("FORMA PAGAMENTO:")) {
      paymentMethod = line.substring(line.indexOf(":") + 1).trim();
    }

    // Section triggers
    if (upper.startsWith("EQUIPAMENTO:") || upper.startsWith("APARELHO:")) {
      inEquipment = true;
      inServices = false;
      inProducts = false;
      inItemsVendidos = false;
      continue;
    } else if (upper.startsWith("SERVICOS ADICIONADOS:") || upper.startsWith("SERVICOS REALIZADOS:") || upper.startsWith("SERVICOS ESTIMADOS:")) {
      inEquipment = false;
      inServices = true;
      inProducts = false;
      inItemsVendidos = false;
      continue;
    } else if (upper.startsWith("PRODUTOS/PECAS:") || upper.startsWith("PECAS TROCADAS:")) {
      inEquipment = false;
      inServices = false;
      inProducts = true;
      inItemsVendidos = false;
      continue;
    } else if (upper.startsWith("ITENS VENDIDOS:")) {
      inEquipment = false;
      inServices = false;
      inProducts = false;
      inItemsVendidos = true;
      continue;
    } else if (line.startsWith("----------------") || line.startsWith("================")) {
      inEquipment = false;
      continue;
    }

    // Content processing
    if (inEquipment) {
      if (upper.startsWith("IMEI:")) {
        imei = line.replace(/IMEI:\s*/i, "").trim();
      } else {
        equipmentName = equipmentName ? `${equipmentName} ${line}` : line;
      }
    } else if (inServices || inProducts) {
      if (line.startsWith("-")) {
        const itemLine = line.substring(1).trim();
        const match = itemLine.match(/(.*?):\s*R\$\s*([\d.,]+)/i) || itemLine.match(/(.*?)\s+R\$\s*([\d.,]+)/i);
        if (match) {
          const rawName = match[1].trim();
          const price = parseFloat(match[2].replace(/\./g, "").replace(",", "."));
          let qty = 1;
          let cleanName = rawName;
          
          const qtyMatch = rawName.match(/\(x(\d+)\)/) || rawName.match(/x(\d+)/);
          if (qtyMatch) {
            qty = parseInt(qtyMatch[1], 10);
            cleanName = rawName.replace(/\(x\d+\)/, "").replace(/x\d+$/, "").trim();
          }
          items.push({ name: cleanName, quantity: qty, price });
        } else {
          items.push({ name: itemLine, quantity: 1, price: 0 });
        }
      }
    } else if (inItemsVendidos) {
      const match = line.match(/^(.*?)\s+x(\d+)\s+R\$\s*([\d.,]+)/i) || line.match(/^(.*?)\s+R\$\s*([\d.,]+)/i);
      if (match) {
        const name = match[1].trim();
        let qty = 1;
        let price = 0;
        if (match.length === 4) {
          qty = parseInt(match[2], 10);
          price = parseFloat(match[3].replace(/\./g, "").replace(",", "."));
        } else {
          price = parseFloat(match[2].replace(/\./g, "").replace(",", "."));
        }
        items.push({ name, quantity: qty, price: price / qty });
      }
    }
  }

  // Pre-fill some defaults if missing
  if (!clientName) clientName = defaultClientName || "Consumidor Final";
  if (!clientPhone) clientPhone = defaultPhone || "";
  if (!equipmentName && isServiceOrder) {
    // Attempt fallback from parsing
    equipmentName = "Aparelho em Manutenção";
  }

  // Check if title is Ordem de Serviço
  let displayTitle = originalTitle;
  if (isServiceOrder) {
    displayTitle = "Ordem de serviço";
  } else if (isVenda) {
    displayTitle = "Cupom de Venda Direta";
  }

  return {
    isServiceOrder,
    isVenda,
    title: displayTitle,
    controlNumber: controlNumber || "OS-" + Math.floor(Math.random() * 900000 + 100000),
    date: date || new Date().toLocaleString("pt-BR"),
    clientName,
    clientPhone,
    clientCpf,
    equipmentName,
    imei,
    defeito: defeito || "Avaliação de hardware/bateria",
    observations: observations || "Aparelho sob responsabilidade técnica",
    items,
    totalAmount: totalAmount || items.reduce((sum, it) => sum + (it.price * it.quantity), 0),
    receivedAmount,
    change,
    paymentMethod
  };
}

const formatPhoneNumber = (value: string) => {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length === 0) return "";
  if (cleaned.length <= 2) return `(${cleaned}`;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  if (cleaned.length <= 10) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
};

export default function ReceiptModal({ isOpen, onClose, title, content, phone, clientName }: ReceiptModalProps) {
  const [phoneInput, setPhoneInput] = useState(() => formatPhoneNumber(phone || ""));
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Business Profile persisted in LocalStorage
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>(() => {
    const saved = localStorage.getItem("business_settings");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }
    return DEFAULT_BUSINESS;
  });

  // Parse raw receipt string on mount/update
  const parsed = parseReceipt(content, clientName || "", phone || "", title);

  // Default to A4 layout for OS and thermal for standard retail sales
  const [layoutType, setLayoutType] = useState<'thermal' | 'a4'>(
    parsed.isServiceOrder ? 'a4' : 'thermal'
  );

  useEffect(() => {
    setPhoneInput(formatPhoneNumber(phone || parsed.clientPhone || ""));
  }, [phone, parsed.clientPhone]);

  if (!isOpen) return null;

  const handleSaveSettings = (field: keyof BusinessSettings, value: any) => {
    const updated = { ...businessSettings, [field]: value };
    setBusinessSettings(updated);
    localStorage.setItem("business_settings", JSON.stringify(updated));
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) {
      alert("Habilite pop-ups para imprimir diretamente no navegador.");
      return;
    }

    if (layoutType === 'thermal') {
      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body {
                font-family: 'Courier New', Courier, monospace;
                width: 58mm;
                margin: 0;
                padding: 12px;
                font-size: 11px;
                color: #000;
                line-height: 1.3;
              }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .line { border-bottom: 1px dashed #000; margin: 8px 0; }
              pre { margin: 0; font-family: inherit; white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <div class="center bold" style="font-size: 13px;">${businessSettings.name.toUpperCase()}</div>
            <div class="center" style="font-size: 9px; margin-bottom: 4px;">${businessSettings.address}</div>
            <div class="center" style="font-size: 9px;">CNPJ: ${businessSettings.cnpj} • Whats: ${businessSettings.phone}</div>
            <div class="line"></div>
            <pre>${content}</pre>
            <div class="line"></div>
            <div class="center" style="margin-top: 10px;">Obrigado pela preferência!</div>
            <div class="center bold" style="font-size: 10px; margin-top: 5px;">${businessSettings.name} © 2026</div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }
            </script>
          </body>
        </html>
      `);
    } else {
      printWindow.document.write(`
        <html>
          <head>
            <title>${parsed.title} #${parsed.controlNumber}</title>
            <style>
              @page {
                size: A4;
                margin: 15mm;
              }
              body {
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                margin: 0;
                padding: 0;
                color: #0f172a;
                font-size: 12px;
                line-height: 1.5;
                background-color: #fff;
              }
              .os-container {
                max-width: 100%;
                margin: 0 auto;
                padding: 0;
              }
              .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
              }
              .header-logo {
                width: 85px;
                height: 98px;
                display: block;
              }
              .header-info {
                text-align: right;
              }
              .header-info h1 {
                margin: 0 0 4px 0;
                font-size: 18px;
                font-weight: 800;
                color: #0f172a;
                letter-spacing: -0.5px;
              }
              .header-info p {
                margin: 2px 0;
                font-size: 11px;
                color: #475569;
              }
              .divider-thick {
                border-bottom: 2px solid #0f172a;
                margin-bottom: 15px;
              }
              .title-box {
                text-align: center;
                background-color: #f1f5f9;
                border-top: 1px solid #cbd5e1;
                border-bottom: 1px solid #cbd5e1;
                padding: 8px 0;
                margin-bottom: 20px;
              }
              .title-box h2 {
                margin: 0;
                font-size: 16px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                color: #0f172a;
              }
              .qr-container {
                text-align: center;
                margin-bottom: 25px;
              }
              .qr-container img {
                width: 110px;
                height: 110px;
                display: inline-block;
                border: 1px solid #e2e8f0;
                padding: 4px;
                background: white;
              }
              .grid-section {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px 30px;
                margin-bottom: 30px;
                background: #f8fafc;
                border-radius: 12px;
                padding: 16px;
                border: 1px solid #f1f5f9;
              }
              .grid-item {
                display: flex;
                flex-direction: column;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 6px;
              }
              .grid-item-label {
                font-size: 10px;
                font-weight: 800;
                color: #0284c7;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 2px;
              }
              .grid-item-value {
                font-size: 13px;
                font-weight: 700;
                color: #0f172a;
              }
              .section-block {
                margin-bottom: 25px;
              }
              .section-title {
                font-size: 12px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #0f172a;
                border-bottom: 1px solid #cbd5e1;
                padding-bottom: 6px;
                margin: 0 0 10px 0;
              }
              .section-content {
                font-size: 13px;
                color: #334155;
                font-weight: 500;
                padding-left: 4px;
              }
              .table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
              }
              .table th {
                text-align: left;
                font-size: 11px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #0f172a;
                border-bottom: 1px solid #0f172a;
                padding-bottom: 6px;
              }
              .table th.right, .table td.right {
                text-align: right;
              }
              .table td {
                padding: 10px 0;
                border-bottom: 1px solid #f1f5f9;
                font-size: 13px;
              }
              .table td .item-name {
                font-weight: 700;
                color: #0f172a;
              }
              .table td .item-qty {
                font-size: 11px;
                color: #64748b;
                margin-left: 5px;
              }
              .total-block {
                display: flex;
                justify-content: space-between;
                font-size: 15px;
                font-weight: 800;
                border-top: 2px solid #0f172a;
                padding-top: 12px;
                margin-top: 20px;
                color: #0f172a;
              }
              .total-label {
                color: #0284c7;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .signature-block {
                text-align: center;
                margin-top: 70px;
                page-break-inside: avoid;
              }
              .signature-line {
                width: 280px;
                border-bottom: 1px solid #475569;
                margin: 0 auto 8px auto;
              }
              .signature-label {
                font-size: 11px;
                color: #475569;
                font-weight: 600;
              }
            </style>
          </head>
          <body>
            <div class="os-container">
              <!-- Header -->
              <div class="header">
                <div class="header-logo">
                  ${ltecLogoSvgHtml}
                </div>
                <div class="header-info">
                  <h1>${businessSettings.name}</h1>
                  <p>${businessSettings.address}</p>
                  <p>WhatsApp: ${businessSettings.phone}</p>
                  <p>CNPJ: ${businessSettings.cnpj}</p>
                </div>
              </div>

              <div class="divider-thick"></div>

              <!-- Title -->
              <div class="title-box">
                <h2>${parsed.title}</h2>
              </div>

              <!-- QR Code -->
              ${businessSettings.showQrCode ? `
              <div class="qr-container">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(`${window.location.origin}/?os=${parsed.controlNumber}`)}" alt="QR Code" />
              </div>
              ` : ''}

              <!-- Client Grid -->
              <div class="grid-section">
                <div class="grid-item">
                  <span class="grid-item-label">Nome</span>
                  <span class="grid-item-value">${parsed.clientName}</span>
                </div>
                <div class="grid-item">
                  <span class="grid-item-label">Telefone</span>
                  <span class="grid-item-value">${parsed.clientPhone || 'Não informado'}</span>
                </div>
                ${parsed.isServiceOrder ? `
                <div class="grid-item" style="grid-column: span 2;">
                  <span class="grid-item-label">Equipamento / Item em manutenção</span>
                  <span class="grid-item-value">${parsed.equipmentName || 'Não informado'}</span>
                </div>
                ` : ''}
                <div class="grid-item">
                  <span class="grid-item-label">Número / Controle</span>
                  <span class="grid-item-value" style="font-family: monospace;">${parsed.controlNumber}</span>
                </div>
                <div class="grid-item">
                  <span class="grid-item-label">${parsed.isServiceOrder ? 'Data/Hora Entrada' : 'Data/Hora da Venda'}</span>
                  <span class="grid-item-value">${parsed.date}</span>
                </div>
                ${parsed.clientCpf ? `
                <div class="grid-item">
                  <span class="grid-item-label">CPF</span>
                  <span class="grid-item-value">${parsed.clientCpf}</span>
                </div>
                ` : ''}
                ${parsed.imei ? `
                <div class="grid-item">
                  <span class="grid-item-label">${parsed.isServiceOrder ? 'IMEI' : 'Identificação'}</span>
                  <span class="grid-item-value" style="font-family: monospace;">${parsed.imei}</span>
                </div>
                ` : ''}
              </div>

              ${parsed.isServiceOrder ? `
              <!-- Defeito -->
              <div class="section-block">
                <h3 class="section-title">Defeito</h3>
                <div class="section-content">${parsed.defeito || 'Avaliação de hardware'}</div>
              </div>
              ` : ''}

              <!-- Serviços / Produtos Table -->
              <div class="section-block">
                <table class="table">
                  <thead>
                    <tr>
                      <th>${parsed.isServiceOrder ? 'Nome do Serviço / Item' : 'Nome do Produto / Item'}</th>
                      <th class="right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${parsed.items.length > 0 ? parsed.items.map(item => `
                      <tr>
                        <td>
                          <span class="item-name">${item.name}</span>
                          ${item.quantity > 1 ? `<span class="item-qty">(x${item.quantity})</span>` : ''}
                        </td>
                        <td class="right" style="font-weight: 700; font-family: monospace;">R$ ${item.price.toFixed(2).replace('.', ',')}</td>
                      </tr>
                    `).join('') : `
                      <tr>
                        <td style="color: #64748b; font-style: italic;">${parsed.isServiceOrder ? 'Diagnóstico inicial a realizar' : 'Nenhum item registrado'}</td>
                        <td class="right" style="font-family: monospace;">R$ 0,00</td>
                      </tr>
                    `}
                  </tbody>
                </table>
              </div>

              <!-- Observações -->
              <div class="section-block">
                <h3 class="section-title">${parsed.isServiceOrder ? 'Observações' : 'Garantia / Observações'}</h3>
                <div class="section-content">${parsed.observations || (parsed.isServiceOrder ? 'Nenhuma observação cadastrada' : 'Garantia de acordo com os termos descritos.')}</div>
              </div>

              <!-- Total -->
              <div class="total-block">
                <span class="total-label">Total Geral</span>
                <span style="font-family: monospace; font-size: 17px;">R$ ${parsed.totalAmount.toFixed(2).replace('.', ',')}</span>
              </div>

              <!-- Signature -->
              <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-label">Assinatura do cliente</div>
              </div>
            </div>

            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }
            </script>
          </body>
        </html>
      `);
    }
    printWindow.document.close();
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLinkToClipboard = () => {
    const shareUrl = `${window.location.origin}/?os=${parsed.controlNumber}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const generateReceiptPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // 1. BRAND HEADER
    doc.setFillColor(30, 136, 229); // #1E88E5 blue primary
    doc.rect(15, 15, 180, 1.5, "F"); // minimalist blue bar on top
    
    // Logo Text "L.Tec"
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(30, 136, 229); // #1E88E5 blue primary
    doc.text("L.Tec", 15, 26);
    
    doc.setFontSize(8);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("ASSISTÊNCIA TÉCNICA", 15, 31);
    
    doc.setFontSize(6.5);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("CELULARES E INFORMÁTICA", 15, 34);

    // Business details right-aligned
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(businessSettings.name, 195, 23, { align: "right" });
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(businessSettings.address, 195, 27, { align: "right" });
    doc.text(`WhatsApp: ${businessSettings.phone}`, 195, 31, { align: "right" });
    doc.text(`CNPJ: ${businessSettings.cnpj}`, 195, 35, { align: "right" });

    // Divider line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.4);
    doc.line(15, 40, 195, 40);

    const isReport = content.toUpperCase().includes("FECHAMENTO DO DIA") || 
                     content.toUpperCase().includes("FECHAMENTO DE CAIXA") || 
                     content.toUpperCase().includes("RESUMO DO CAIXA") ||
                     title.toUpperCase().includes("FECHAMENTO") ||
                     title.toUpperCase().includes("RELATÓRIO") ||
                     (!parsed.isServiceOrder && !parsed.isVenda && parsed.items.length === 0);

    if (isReport) {
      // 2. REPORT TITLE
      doc.setFontSize(13);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(title.toUpperCase(), 15, 48);

      // 3. META DATA BOX
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(15, 52, 180, 16, "F");
      
      doc.setDrawColor(241, 245, 249); // slate-100
      doc.setLineWidth(0.5);
      doc.rect(15, 52, 180, 16, "S");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(2, 132, 199); // sky-700
      doc.text("INFORMAÇÕES DE CONTROLE DE CAIXA", 20, 58);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text(`Operador: Administrador`, 20, 64);
      doc.text(`Data/Hora de Emissão: ${parsed.date || new Date().toLocaleString("pt-BR")}`, 110, 64);

      let currentY = 78;

      // Split the raw content by lines and format beautifully
      const lines = content.split("\n").map(l => l.trim());
      
      lines.forEach((line) => {
        if (!line) {
          currentY += 3;
          return;
        }

        // Handle page break
        if (currentY > 270) {
          doc.addPage();
          currentY = 20;
        }

        const upper = line.toUpperCase();

        if (line.startsWith("---") || line.startsWith("===")) {
          doc.setDrawColor(226, 232, 240); // slate-200
          doc.setLineWidth(0.4);
          doc.line(15, currentY, 195, currentY);
          currentY += 5;
        } else if (
          upper.startsWith("FECHAMENTO") || 
          upper.startsWith("RESUMO DO CAIXA") || 
          upper.startsWith("ORDENS ENTREGUES") ||
          upper.startsWith("ASSINATURA RESPONSÁVEL")
        ) {
          currentY += 4;
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(30, 136, 229); // blue primary
          doc.text(line, 15, currentY);
          currentY += 7;
        } else {
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(9);
          
          const colonIndex = line.indexOf(":");
          if (colonIndex !== -1) {
            const label = line.substring(0, colonIndex + 1).trim();
            const val = line.substring(colonIndex + 1).trim();

            doc.setFont("Helvetica", "bold");
            doc.setTextColor(15, 23, 42); // slate-900
            doc.text(label, 15, currentY);

            doc.setFont("Helvetica", "bold");
            if (val.includes("R$")) {
              if (val.includes("(+)") || val.includes("Total") || val.includes("Saldo") || val.includes("ARRECADADO")) {
                doc.setTextColor(16, 185, 129); // emerald-600
              } else if (val.includes("(-)") || val.includes("DESPESAS")) {
                doc.setTextColor(239, 68, 68); // red-600
              } else {
                doc.setTextColor(15, 23, 42);
              }
            } else {
              doc.setFont("Helvetica", "normal");
              doc.setTextColor(71, 85, 105); // slate-600
            }
            doc.text(val, 195, currentY, { align: "right" });
          } else {
            doc.setTextColor(71, 85, 105); // slate-600
            doc.text(line, 15, currentY);
          }
          currentY += 6.5;
        }
      });

      // Signature line for report if space is available
      if (currentY < 240) {
        currentY += 15;
        doc.setDrawColor(148, 163, 184); // slate-400
        doc.setLineWidth(0.3);
        doc.line(70, currentY, 140, currentY);
        
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text("Assinatura do Responsável", 105, currentY + 4, { align: "center" });
      }

      const filename = `relatorio-caixa-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      return;
    }

    // 2. DOCUMENT SUBTITLE FOR STANDARD OS / VENDA
    doc.setFontSize(13);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(15, 23, 42); // slate-900
    const docTitle = parsed.isServiceOrder 
      ? `ORDEM DE SERVIÇO Nº ${parsed.controlNumber}` 
      : `COMPROVANTE DE VENDA DIRETA Nº ${parsed.controlNumber}`;
    doc.text(docTitle, 15, 48);

    // 3. CLIENT INFO / IDENTIFICAÇÃO BOX
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(15, 52, 180, 26, "F");
    
    // Borders for Client Info Box
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.setLineWidth(0.5);
    doc.rect(15, 52, 180, 26, "S");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(2, 132, 199); // sky-700
    doc.text("IDENTIFICAÇÃO DO CLIENTE", 20, 58);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(`Cliente: ${parsed.clientName || "Consumidor Final"}`, 20, 65);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(`Telefone: ${parsed.clientPhone || "Não cadastrado"}`, 20, 71);
    
    if (parsed.clientCpf) {
      doc.text(`CPF: ${parsed.clientCpf}`, 110, 65);
    }
    doc.text(`Data: ${parsed.date}`, 110, 71);

    // If Service Order, add equipment info
    let tableStartY = 88;
    if (parsed.isServiceOrder && parsed.equipmentName) {
      doc.setFillColor(254, 243, 199); // amber-100
      doc.rect(15, 79, 180, 10, "F");
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(180, 83, 9); // amber-700
      doc.text(`Equipamento: ${parsed.equipmentName}`, 20, 85);
      
      if (parsed.imei) {
        doc.text(`IMEI/Nº Série: ${parsed.imei}`, 110, 85);
      }
      tableStartY = 98;
    }

    // 4. ITEMS TABLE HEADERS
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 136, 229); // blue primary
    doc.text(parsed.isServiceOrder ? "DESCRIÇÃO DOS ITENS E SERVIÇOS" : "DESCRIÇÃO DOS PRODUTOS", 15, tableStartY);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("Qtd", 15, tableStartY + 6);
    doc.text(parsed.isServiceOrder ? "Descrição do Produto / Serviço" : "Nome do Produto", 27, tableStartY + 6);
    doc.text("Valor Unit.", 145, tableStartY + 6, { align: "right" });
    doc.text("Subtotal", 195, tableStartY + 6, { align: "right" });

    // Table bottom line
    doc.setDrawColor(15, 23, 42); // slate-900
    doc.setLineWidth(0.4);
    doc.line(15, tableStartY + 8, 195, tableStartY + 8);

    // 5. RENDER ROWS
    let currentY = tableStartY + 14;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85); // slate-700

    if (parsed.items.length > 0) {
      parsed.items.forEach((item, index) => {
        // Handle page overflow for item list
        if (currentY > 260) {
          doc.addPage();
          
          // Draw a small header on the next page
          doc.setFillColor(30, 136, 229);
          doc.rect(15, 15, 180, 1.5, "F");
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(`Comprovante ${parsed.controlNumber} - Continuação`, 15, 22);
          
          doc.setDrawColor(226, 232, 240);
          doc.line(15, 25, 195, 25);
          
          currentY = 35;
        }

        // Stripe background
        if (index % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, currentY - 4.5, 180, 7, "F");
        }

        doc.setFont("Helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(item.quantity.toString(), 18, currentY, { align: "center" });

        doc.setFont("Helvetica", "normal");
        doc.setTextColor(51, 65, 85);

        // Truncate name safely to avoid overflow
        let displayName = item.name;
        if (doc.getTextWidth(displayName) > 110) {
          displayName = displayName.substring(0, 52) + "...";
        }
        doc.text(displayName, 27, currentY);

        doc.text(`R$ ${item.price.toFixed(2).replace(".", ",")}`, 145, currentY, { align: "right" });

        const subTotal = item.price * item.quantity;
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(`R$ ${subTotal.toFixed(2).replace(".", ",")}`, 195, currentY, { align: "right" });

        // Row border
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.2);
        doc.line(15, currentY + 2.5, 195, currentY + 2.5);

        currentY += 7.5;
      });
    } else {
      doc.setFont("Helvetica", "oblique");
      doc.text("Nenhum item registrado nesta venda/OS.", 15, currentY);
      currentY += 7.5;
    }

    // Table boundary
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(15, currentY - 2, 195, currentY - 2);
    
    currentY += 4;

    // Handle page overflow for Total row
    if (currentY > 255) {
      doc.addPage();
      currentY = 25;
    }

    // 6. TOTAL ROW
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`Forma de Pagamento: ${parsed.paymentMethod || "Dinheiro"}`, 15, currentY);
    
    doc.setFontSize(11);
    doc.text("TOTAL GERAL:", 145, currentY, { align: "right" });
    doc.setTextColor(30, 136, 229); // blue primary
    doc.text(`R$ ${parsed.totalAmount.toFixed(2).replace(".", ",")}`, 195, currentY, { align: "right" });

    currentY += 12;

    // 7. WARRANTY & OBSERVATIONS FOOTER BOX
    const defaultObs = parsed.isServiceOrder 
      ? "Garantia legal de 90 dias (3 meses) cobrindo exclusivamente defeitos de fabricação ou de aplicação da película/peças, sob condições normais de uso."
      : "Garantia legal conforme termos estabelecidos. Os produtos adquiridos possuem garantia conforme especificação do fabricante ou estabelecimento.";
    const rawObs = parsed.observations || defaultObs;
    const splitObs = doc.splitTextToSize(rawObs, 172);
    const boxHeight = Math.max(26, 12 + (splitObs.length * 4.5));

    // Handle page overflow for observations box
    if (currentY + boxHeight > 265) {
      doc.addPage();
      currentY = 25;
    }

    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.4);
    doc.rect(15, currentY, 180, boxHeight, "FD");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(2, 132, 199); // sky-700
    doc.text(parsed.isServiceOrder ? "OBSERVAÇÕES TÉCNICAS & GARANTIA" : "OBSERVAÇÕES & GARANTIA DE VENDA", 19, currentY + 5.5);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(splitObs, 19, currentY + 11);

    currentY += boxHeight + 12;

    // Handle page overflow for signature block
    if (currentY + 25 > 280) {
      doc.addPage();
      currentY = 25;
    }

    // 8. SIGNATURE
    doc.setDrawColor(148, 163, 184); // slate-400
    doc.setLineWidth(0.3);
    doc.line(70, currentY, 140, currentY);
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Assinatura do cliente", 105, currentY + 4, { align: "center" });

    currentY += 10;

    // 9. GREETING
    doc.setFont("Helvetica", "oblique");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Agradecemos imensamente a sua preferência!", 105, currentY, { align: "center" });

    const filename = `comprovante-${parsed.controlNumber}.pdf`;
    doc.save(filename);
  };

  const handleSendWhatsApp = () => {
    let cleanPhone = phoneInput.replace(/\D/g, "");
    if (!cleanPhone) {
      alert("Por favor, preencha o número de telefone/WhatsApp do cliente.");
      return;
    }
    
    if (cleanPhone.length >= 10 && !cleanPhone.startsWith("55")) {
      cleanPhone = "55" + cleanPhone;
    }

    // Automatically generate and download the PDF
    generateReceiptPDF();

    const isVenda = parsed.isVenda || !parsed.isServiceOrder;
    const documentType = isVenda ? "Comprovante de Venda" : "Ordem de Serviço";
    const obsText = parsed.observations || "Garantia de 3 meses inclusa para películas e serviços.";

    const message = `Olá *${parsed.clientName}*! Tudo bem? 🌟\n\n` +
      `Seguindo o nosso compromisso com a transparência e organização, o *${documentType} em PDF* foi gerado e baixado automaticamente no seu dispositivo! 📂📄\n\n` +
      `*Resumo da Transação:*\n` +
      `📅 *Data:* ${parsed.date}\n` +
      `🔢 *Nº de Controle:* ${parsed.controlNumber}\n` +
      `💰 *Valor Total:* R$ ${parsed.totalAmount.toFixed(2).replace('.', ',')}\n` +
      `🛡️ *Garantia / Obs:* ${obsText}\n\n` +
      `_Por favor, se desejar, anexe o arquivo PDF que acabou de ser baixado nesta conversa para guardá-lo com você!_\n\n` +
      `Agradecemos imensamente a preferência e a confiança na *${businessSettings.name}*! Qualquer dúvida, estamos à disposição. 🤝📱`;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const baseUrl = isMobile ? "https://api.whatsapp.com/send" : "https://web.whatsapp.com/send";
    const url = `${baseUrl}?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-sm">Visualizar Documento</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Settings toggler */}
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded-lg transition flex items-center gap-1 text-xs font-medium ${
                showSettings ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-300'
              }`}
            >
              <Settings className="w-4 h-4 animate-spin-hover" />
              <span>Configurar Cabeçalho</span>
              {showSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Business Settings Expandable Pane */}
        {showSettings && (
          <div className="p-4 bg-slate-800/80 border-b border-slate-700/60 text-slate-300 space-y-3 animate-fade-in-down">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Informações da Assistência Técnica</h4>
              <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">Sincronizado</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Nome da Empresa</label>
                <input
                  type="text"
                  value={businessSettings.name}
                  onChange={(e) => handleSaveSettings("name", e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">CNPJ</label>
                <input
                  type="text"
                  value={businessSettings.cnpj}
                  onChange={(e) => handleSaveSettings("cnpj", e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Endereço comercial</label>
                <input
                  type="text"
                  value={businessSettings.address}
                  onChange={(e) => handleSaveSettings("address", e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">WhatsApp / Telefone</label>
                <input
                  type="text"
                  value={businessSettings.phone}
                  onChange={(e) => handleSaveSettings("phone", e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="show_qr_toggle"
                checked={businessSettings.showQrCode}
                onChange={(e) => handleSaveSettings("showQrCode", e.target.checked)}
                className="w-4 h-4 text-blue-500 rounded border-slate-700 bg-slate-900 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="show_qr_toggle" className="text-xs text-slate-300 font-bold select-none cursor-pointer">
                Exibir código QR de controle de ordens de serviço
              </label>
            </div>
          </div>
        )}

        {/* Format selector tabs */}
        <div className="bg-slate-950 px-4 pt-3 flex border-b border-slate-800">
          <button
            onClick={() => setLayoutType('a4')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl border-t border-x transition flex items-center gap-1.5 ${
              layoutType === 'a4'
                ? 'bg-white text-slate-900 border-slate-200'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/50'
            }`}
          >
            <FileText className="w-4 h-4 text-blue-600" />
            Folha A4 (Ordem de Serviço)
          </button>
          <button
            onClick={() => setLayoutType('thermal')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl border-t border-x transition flex items-center gap-1.5 ${
              layoutType === 'thermal'
                ? 'bg-white text-slate-900 border-slate-200'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/50'
            }`}
          >
            <Printer className="w-4 h-4 text-amber-600" />
            Cupom Bobina (58mm)
          </button>
        </div>

        {/* Paper Simulation */}
        <div className="p-6 bg-slate-950 flex-1 overflow-y-auto flex justify-center max-h-[50vh]">
          {layoutType === 'thermal' ? (
            /* Traditional Thermal Receipt */
            <div className="bg-white text-black p-4 w-[58mm] min-h-[300px] shadow-lg rounded font-mono text-[10px] leading-tight select-all">
              <div className="text-center font-bold text-xs uppercase mb-1">{businessSettings.name}</div>
              <div className="text-center text-[8px] text-slate-600 mb-1">{businessSettings.address}</div>
              <div className="text-center text-[7px] text-slate-500 mb-2">CNPJ: {businessSettings.cnpj} • Whats: {businessSettings.phone}</div>
              <div className="border-b border-dashed border-black my-1"></div>
              <pre className="whitespace-pre-wrap font-mono">{content}</pre>
              <div className="border-b border-dashed border-black my-1"></div>
              <div className="text-center text-[8px] text-slate-500 mt-2">© 2026 - {businessSettings.name}</div>
            </div>
          ) : (
            /* Beautiful simulated A4 paper exactly matching the user's uploaded image */
            <div className="bg-white text-slate-900 p-6 w-[100%] max-w-[210mm] shadow-lg rounded-xl border border-slate-200 flex flex-col font-sans text-xs select-all">
              
              {/* Top Row Header with Logo on Left and Metadata on Right */}
              <div className="flex justify-between items-center mb-4">
                <LTecLogo className="w-20 h-[92px]" />
                <div className="text-right">
                  <h3 className="font-extrabold text-slate-900 text-sm">{businessSettings.name}</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">{businessSettings.address}</p>
                  <p className="text-[10px] text-slate-500">WhatsApp: {businessSettings.phone}</p>
                  <p className="text-[10px] text-slate-500 font-mono">CNPJ: {businessSettings.cnpj}</p>
                </div>
              </div>

              <div className="border-b-2 border-slate-900 mb-4"></div>

              {/* Boxed Title */}
              <div className="bg-slate-100 border-y border-slate-300 text-center py-2 mb-4">
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-widest">{parsed.title}</h4>
              </div>

              {/* QR Code */}
              {businessSettings.showQrCode && (
                <div className="flex justify-center mb-4">
                  <div className="border border-slate-200 p-1.5 rounded-lg bg-white shadow-sm flex flex-col items-center">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(`${window.location.origin}/?os=${parsed.controlNumber}`)}`} 
                      alt="QR Code de Controle" 
                      className="w-16 h-16"
                    />
                    <span className="text-[8px] text-slate-400 font-bold font-mono mt-1"># {parsed.controlNumber}</span>
                  </div>
                </div>
              )}

              {/* Client Grid */}
              <div className="grid-cols-2 gap-x-6 gap-y-3 mb-6 text-[11px] leading-relaxed grid">
                <div className="flex flex-col border-b border-slate-100 pb-1.5">
                  <span className="text-[9px] font-black text-sky-700 uppercase tracking-wider mb-0.5">Nome</span>
                  <span className="font-bold text-slate-800">{parsed.clientName}</span>
                </div>
                <div className="flex flex-col border-b border-slate-100 pb-1.5">
                  <span className="text-[9px] font-black text-sky-700 uppercase tracking-wider mb-0.5">Telefone</span>
                  <span className="font-bold text-slate-800">{parsed.clientPhone || "Não cadastrado"}</span>
                </div>
                {parsed.isServiceOrder && (
                  <div className="flex flex-col border-b border-slate-100 pb-1.5 col-span-2">
                    <span className="text-[9px] font-black text-sky-700 uppercase tracking-wider mb-0.5">Item em manutenção</span>
                    <span className="font-bold text-slate-800">{parsed.equipmentName || "Dispositivo em diagnóstico"}</span>
                  </div>
                )}
                <div className="flex flex-col border-b border-slate-100 pb-1.5">
                  <span className="text-[9px] font-black text-sky-700 uppercase tracking-wider mb-0.5">Número de Controle</span>
                  <span className="font-mono font-bold text-slate-800">{parsed.controlNumber}</span>
                </div>
                <div className="flex flex-col border-b border-slate-100 pb-1.5">
                  <span className="text-[9px] font-black text-sky-700 uppercase tracking-wider mb-0.5">
                    {parsed.isServiceOrder ? "Data de Entrada" : "Data da Venda"}
                  </span>
                  <span className="font-bold text-slate-800">{parsed.date}</span>
                </div>
                {parsed.clientCpf && (
                  <div className="flex flex-col border-b border-slate-100 pb-1.5">
                    <span className="text-[9px] font-black text-sky-700 uppercase tracking-wider mb-0.5">CPF</span>
                    <span className="font-mono font-bold text-slate-800">{parsed.clientCpf}</span>
                  </div>
                )}
                {parsed.imei && (
                  <div className="flex flex-col border-b border-slate-100 pb-1.5">
                    <span className="text-[9px] font-black text-sky-700 uppercase tracking-wider mb-0.5">
                      {parsed.isServiceOrder ? "IMEI / Identificação" : "Identificação"}
                    </span>
                    <span className="font-mono font-bold text-slate-800">{parsed.imei}</span>
                  </div>
                )}
              </div>

              {/* Defeito Section */}
              {parsed.isServiceOrder && (
                <div className="mb-4">
                  <h5 className="font-bold text-slate-900 border-b border-slate-200 pb-1 text-[11px] uppercase tracking-wider mb-1.5">Defeito</h5>
                  <p className="text-slate-700 font-medium whitespace-pre-wrap pl-1">{parsed.defeito || "Problemas gerais na placa ou circuito"}</p>
                </div>
              )}

              {/* Services List Table */}
              <div className="mb-4">
                <div className="flex justify-between font-black text-slate-900 border-b border-slate-900 pb-1 text-[11px] uppercase tracking-wider mb-1.5">
                  <span>{parsed.isServiceOrder ? "Nome do serviço / peça" : "Nome do produto"}</span>
                  <span>Valor R$</span>
                </div>
                <div className="space-y-1.5">
                  {parsed.items.length > 0 ? parsed.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-baseline py-1 border-b border-slate-100 text-[11px]">
                      <div>
                        <span className="font-bold text-slate-800">{it.name}</span>
                        {it.quantity > 1 && <span className="text-slate-500 font-mono text-[9px] ml-1.5">(x{it.quantity})</span>}
                      </div>
                      <span className="font-mono font-bold text-slate-800">
                        R$ {(it.price * it.quantity).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  )) : (
                    <div className="text-slate-400 italic text-[11px] py-1">
                      {parsed.isServiceOrder ? "Análise inicial do hardware pendente" : "Nenhum produto registrado"}
                    </div>
                  )}
                </div>
              </div>

              {/* Observações Section */}
              <div className="mb-4">
                <h5 className="font-bold text-slate-900 border-b border-slate-200 pb-1 text-[11px] uppercase tracking-wider mb-1.5">
                  {parsed.isServiceOrder ? "Observações" : "Garantia / Observações"}
                </h5>
                <p className="text-slate-700 font-medium whitespace-pre-wrap pl-1">
                  {parsed.observations || (parsed.isServiceOrder ? "Nenhuma observação técnica registrada." : "Garantia de acordo com os termos descritos.")}
                </p>
              </div>

              {/* Total Row */}
              <div className="flex justify-between font-black border-t-2 border-slate-900 pt-2 text-xs uppercase tracking-wider text-slate-900 mb-8 mt-auto">
                <span className="text-sky-800">Total Geral</span>
                <span className="font-mono text-sm">R$ {parsed.totalAmount.toFixed(2).replace('.', ',')}</span>
              </div>

              {/* Signature Line */}
              <div className="text-center mt-6">
                <div className="w-56 border-b border-slate-400 mx-auto mb-1"></div>
                <span className="text-[10px] font-bold text-slate-500">Assinatura do cliente</span>
              </div>

            </div>
          )}
        </div>

        {/* Client WhatsApp Number Input */}
        <div className="p-4 bg-slate-800/50 border-t border-slate-700/40 flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp do Cliente</label>
          <div className="flex gap-2">
            <span className="flex items-center px-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-400 font-mono">
              +55
            </span>
            <input
              type="text"
              value={phoneInput}
              onChange={(e) => setPhoneInput(formatPhoneNumber(e.target.value))}
              placeholder="(DD) 99999-9999"
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-blue-500 font-mono placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-4 bg-slate-800 border-t border-slate-700 flex flex-col gap-2.5">
          <button
            onClick={handleSendWhatsApp}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-500/20 uppercase tracking-wider"
          >
            <MessageSquare className="w-4 h-4" />
            Enviar por WhatsApp
          </button>

          {parsed.isServiceOrder && (
            <button
              onClick={handleCopyLinkToClipboard}
              className={`w-full py-2.5 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition uppercase tracking-wider border border-slate-700 ${
                copiedLink
                  ? "bg-emerald-600 text-white border-emerald-500/30"
                  : "bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white"
              }`}
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  Link de Acompanhamento Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar Link de Acompanhamento
                </>
              )}
            </button>
          )}

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleCopyToClipboard}
              className={`py-2.5 font-extrabold text-[10px] rounded-xl flex items-center justify-center gap-1.5 transition uppercase tracking-wider ${
                copied
                  ? "bg-emerald-600 text-white border border-emerald-500/30"
                  : "bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copiar Texto
                </>
              )}
            </button>
            <button
              onClick={() => generateReceiptPDF()}
              className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] rounded-xl flex items-center justify-center gap-1.5 transition shadow-lg shadow-rose-500/20 uppercase tracking-wider"
              title="Baixar Comprovante em PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              Baixar PDF
            </button>
            <button
              onClick={handlePrint}
              className="py-2.5 bg-[#1E88E5] hover:bg-blue-600 text-white font-extrabold text-[10px] rounded-xl flex items-center justify-center gap-1.5 transition shadow-lg shadow-blue-500/20 uppercase tracking-wider"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
