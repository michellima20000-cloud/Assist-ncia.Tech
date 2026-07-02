import React from "react";
import { X, Printer, Check, Copy } from "lucide-react";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export default function ReceiptModal({ isOpen, onClose, title, content }: ReceiptModalProps) {
  if (!isOpen) return null;

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
    alert("Conteúdo do recibo copiado para a área de transferência!");
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

        {/* Actions Footer */}
        <div className="p-4 bg-slate-800 border-t border-slate-700 grid grid-cols-2 gap-3">
          <button
            onClick={handleCopyToClipboard}
            className="py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
          >
            <Copy className="w-4 h-4" />
            Copiar Texto
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
  );
}
