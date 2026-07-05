import React from "react";
import { X, Printer, Check, Copy, MessageSquare } from "lucide-react";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  phone?: string;
  clientName?: string;
}

export default function ReceiptModal({ isOpen, onClose, title, content, phone, clientName }: ReceiptModalProps) {
  if (!isOpen) return null;

  const [phoneInput, setPhoneInput] = React.useState(phone || "");
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    setPhoneInput(phone || "");
  }, [phone]);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=350,height=600");
    if (printWindow) {
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
            <div class="center bold" style="font-size: 13px;">MINHA ASSISTÊNCIA</div>
            <div class="center">GESTÃO DE ELETRÔNICOS</div>
            <div class="line"></div>
            <pre>${content}</pre>
            <div class="line"></div>
            <div class="center" style="margin-top: 10px;">Obrigado pela preferência!</div>
            <div class="center bold" style="font-size: 10px; margin-top: 5px;">Minha Assistência © 2026</div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      alert("Habilite pop-ups para imprimir diretamente no navegador.");
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    let cleanPhone = phoneInput.replace(/\D/g, "");
    if (!cleanPhone) {
      alert("Por favor, preencha o número de telefone/WhatsApp do cliente.");
      return;
    }
    
    // Add Brazil country code if missing and it looks like a brazilian number
    if (cleanPhone.length >= 10 && !cleanPhone.startsWith("55")) {
      cleanPhone = "55" + cleanPhone;
    }

    // Customize message based on title/type
    let message = "";
    if (title.toLowerCase().includes("entrada")) {
      message = `Olá! Segue o comprovante de *Entrada de Equipamento* na nossa Assistência Técnica:\n\n${content}\n\nAcompanhe o status do seu aparelho. Obrigado pela confiança!`;
    } else if (title.toLowerCase().includes("saída") || title.toLowerCase().includes("garantia") || title.toLowerCase().includes("saida")) {
      message = `Olá! Seu aparelho foi retirado e a ordem de serviço foi finalizada com sucesso! Segue seu *Comprovante de Saída & Garantia*:\n\n${content}\n\nAgradecemos a preferência!`;
    } else {
      message = `Olá! Segue o comprovante de atendimento da nossa Assistência Técnica:\n\n${content}`;
    }

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const baseUrl = isMobile ? "https://api.whatsapp.com/send" : "https://web.whatsapp.com/send";
    const url = `${baseUrl}?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-sm">{title}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Receipt Simulation */}
        <div className="p-6 bg-slate-950 flex-1 overflow-y-auto flex justify-center">
          <div className="bg-white text-black p-4 w-[58mm] min-h-[300px] shadow-lg rounded font-mono text-[10px] leading-tight select-all">
            <div className="text-center font-bold text-xs uppercase mb-1">Minha Assistência</div>
            <div className="text-center text-[9px] text-slate-600 mb-2">Suporte Técnico</div>
            <div className="border-b border-dashed border-black my-1"></div>
            <pre className="whitespace-pre-wrap font-mono">{content}</pre>
            <div className="border-b border-dashed border-black my-1"></div>
            <div className="text-center text-[8px] text-slate-500 mt-2">© 2026 - Minha Assistência</div>
          </div>
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
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="DDD + Número (ex: 11999998888)"
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-blue-500 font-mono placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-4 bg-slate-800 border-t border-slate-700 flex flex-col gap-2.5">
          <button
            onClick={handleSendWhatsApp}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-500/20"
          >
            <MessageSquare className="w-4 h-4" />
            Enviar por WhatsApp
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCopyToClipboard}
              className={`py-2.5 font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 transition ${
                copied
                  ? "bg-emerald-600 text-white border border-emerald-500/30"
                  : "bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar Texto
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="py-2.5 bg-[#1E88E5] hover:bg-blue-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow-lg shadow-blue-500/20"
            >
              <Printer className="w-4 h-4" />
              Imprimir Recibo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
