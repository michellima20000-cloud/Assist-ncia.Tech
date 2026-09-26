import React, { useState, useEffect } from "react";
import {
  X, Check, Copy, Upload, QrCode, AlertCircle,
  Clock, ShieldCheck, Sparkles, Send, FileText, Smartphone, ExternalLink, HelpCircle
} from "lucide-react";
import { PixConfig, PixSubscriptionRequest } from "../types";
import { compressImage } from "../lib/imageCompressor";

interface PixCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: {
    id: string;
    name: string;
    title: string;
    price: number;
    interval: "monthly" | "annual";
    capacity: number;
    description: string;
  };
  currentUserEmail?: string;
  currentUserName?: string;
  onRequestSubmitted?: () => void;
}

export default function PixCheckoutModal({
  isOpen,
  onClose,
  selectedPlan,
  currentUserEmail = "",
  currentUserName = "",
  onRequestSubmitted
}: PixCheckoutModalProps) {
  const [pixConfig, setPixConfig] = useState<PixConfig>({
    pixKey: "michel.lima20000@gmail.com",
    pixKeyType: "email",
    receiverName: "Michel Lima (Admin Assistência)",
    receiverCity: "São Paulo",
    receiverBank: "Banco Inter / Nubank",
    audioUrl: "",
    audioTitle: "Instruções em Áudio para Pagamento via Pix",
    instructionText: "Faça o Pix no valor exato do plano escolhido e anexe o comprovante abaixo para liberação imediata da sua conta."
  });

  const [loadingConfig, setLoadingConfig] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Form states
  const [name, setName] = useState(currentUserName || "");
  const [email, setEmail] = useState(currentUserEmail || "");
  const [phone, setPhone] = useState("");
  const [comprovanteBase64, setComprovanteBase64] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSubmittedSuccess(false);
      setErrorMessage("");
      if (currentUserEmail) setEmail(currentUserEmail);
      if (currentUserName) setName(currentUserName);

      setLoadingConfig(true);
      fetch("/api/pix/config")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.pixKey) {
            setPixConfig(data);
          }
        })
        .catch((err) => console.error("Erro ao carregar Pix config:", err))
        .finally(() => setLoadingConfig(false));
    }
  }, [isOpen, currentUserEmail, currentUserName]);

  if (!isOpen) return null;

  // Handle Pix Copy
  const handleCopyPixKey = () => {
    if (!pixConfig.pixKey) return;
    navigator.clipboard.writeText(pixConfig.pixKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  // Generate a mock / static Pix EMV payload or QR code content
  const pixKeyVal = pixConfig.pixKey || "michel.lima20000@gmail.com";
  const formattedAmount = selectedPlan.price.toFixed(2);
  const pixPayload = `00020126580014BR.GOV.BCB.PIX0136${pixKeyVal}520400005303986540${formattedAmount.length}${formattedAmount}5802BR5925${(pixConfig.receiverName || "ASSISTENCIA").substring(0, 25)}6009SAO PAULO62070503***6304`;

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(pixPayload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2500);
  };

  // Handle Comprovante File
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      try {
        const compressed = await compressImage(file, 1024, 0.75);
        setComprovanteBase64(compressed);
      } catch (err) {
        console.error("Erro ao comprimir imagem:", err);
        const reader = new FileReader();
        reader.onload = (re) => setComprovanteBase64(re.target?.result as string);
        reader.readAsDataURL(file);
      }
    } else {
      // PDF or other
      const reader = new FileReader();
      reader.onload = (re) => setComprovanteBase64(re.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Submit request
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Por favor, preencha o seu nome.");
      return;
    }
    if (!email.trim()) {
      setErrorMessage("Por favor, preencha o seu e-mail.");
      return;
    }
    if (!comprovanteBase64) {
      setErrorMessage("Por favor, anexe a foto ou arquivo do comprovante Pix.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/pix/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: name.trim(),
          userEmail: email.trim().toLowerCase(),
          userPhone: phone.trim(),
          plan: selectedPlan.id,
          planName: selectedPlan.title,
          planInterval: selectedPlan.interval,
          amount: selectedPlan.price,
          extraAccounts: selectedPlan.id === "extra" ? 1 : 0,
          comprovanteUrl: comprovanteBase64,
          notes: notes.trim()
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao registrar solicitação Pix.");
      }

      setSubmittedSuccess(true);
      if (onRequestSubmitted) {
        onRequestSubmitted();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao enviar comprovante. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    pixPayload
  )}&margin=10`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-[#11141a] border border-[#232936] text-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-[#232936] flex items-center justify-between bg-[#161a22]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                Pagamento & Ativação via Pix
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                  À vista com Desconto
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Transfira e envie o comprovante para liberação imediata
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {submittedSuccess ? (
            /* SUCCESS STATE */
            <div className="text-center py-8 px-4 space-y-5 animate-fade-in">
              <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <Check className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Comprovante Enviado com Sucesso!</h3>
                <p className="text-sm text-slate-300 mt-2 max-w-md mx-auto">
                  Sua solicitação de assinatura para o plano <strong>{selectedPlan.title}</strong> foi registrada no sistema. O administrador validará o seu Pix e sua conta será ativada.
                </p>
              </div>

              <div className="bg-[#181c24] border border-[#272e3d] p-4 rounded-2xl max-w-md mx-auto text-left text-xs space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>Assinante:</span>
                  <span className="font-bold text-white">{name}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>E-mail da Conta:</span>
                  <span className="font-bold text-white">{email}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Plano Solicitado:</span>
                  <span className="font-bold text-emerald-400">{selectedPlan.title}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Valor:</span>
                  <span className="font-bold text-white font-mono">R$ {selectedPlan.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Status:</span>
                  <span className="font-bold text-amber-400">Pendente de Validação</span>
                </div>
              </div>

              {phone && (
                <div className="pt-2">
                  <a
                    href={`https://wa.me/55${phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                      `Olá! Acabei de enviar o comprovante Pix no valor de R$ ${selectedPlan.price.toFixed(
                        2
                      )} referente ao plano ${selectedPlan.title} (${name} - ${email}). Por favor, ative minha conta!`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
                  >
                    <Smartphone className="w-4 h-4" />
                    Notificar Administrador no WhatsApp
                  </a>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full max-w-md mx-auto py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Concluir & Fechar
              </button>
            </div>
          ) : (
            /* CHECKOUT FORM */
            <>
              {/* PLAN SUMMARY BOX */}
              <div className="bg-gradient-to-r from-amber-500/10 via-[#181c24] to-emerald-500/10 border border-amber-500/30 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">
                    Plano Escolhido
                  </span>
                  <h3 className="text-lg font-black text-white">{selectedPlan.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedPlan.description}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">
                    Valor à Vista no Pix
                  </span>
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    R$ {selectedPlan.price.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {selectedPlan.interval === "annual" ? "Assinatura Anual" : "Assinatura Mensal"}
                  </span>
                </div>
              </div>

              {/* INSTRUCTION NOTE (IF CONFIGURED) */}
              {pixConfig.instructionText && (
                <div className="bg-[#181c24] border border-[#272e3d] px-4 py-3 rounded-2xl text-xs text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                  <span>{pixConfig.instructionText}</span>
                </div>
              )}

              {/* PIX DETAILS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* QR CODE BOX */}
                <div className="bg-[#181c24] border border-[#272e3d] p-4 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
                  <div className="p-2 bg-white rounded-2xl shadow-inner border-2 border-slate-300">
                    <img
                      src={qrCodeUrl}
                      alt="QR Code Pix"
                      className="w-36 h-36 object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-300">
                      Abra o app do seu banco e aponte a câmera
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Chave Pix e valor de R$ {selectedPlan.price.toFixed(2)} já inclusos
                    </p>
                  </div>
                </div>

                {/* PIX KEY & BANK INFO */}
                <div className="bg-[#181c24] border border-[#272e3d] p-4 rounded-2xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">
                        Chave Pix ({pixConfig.pixKeyType.toUpperCase()})
                      </span>
                      <div className="mt-1 flex items-center justify-between bg-[#12151c] p-2.5 rounded-xl border border-slate-800">
                        <span className="font-mono text-emerald-400 font-bold text-xs truncate max-w-[200px]">
                          {pixConfig.pixKey || "michel.lima20000@gmail.com"}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyPixKey}
                          className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold text-[10px] rounded-lg transition flex items-center gap-1 cursor-pointer border border-emerald-500/30"
                        >
                          {copiedKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey ? "Copiado!" : "Copiar Chave"}</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">
                        Favorecido / Beneficiário
                      </span>
                      <p className="font-bold text-white text-xs mt-0.5">
                        {pixConfig.receiverName || "Michel Lima"}
                      </p>
                    </div>

                    {pixConfig.receiverBank && (
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                          Instituição / Banco
                        </span>
                        <p className="text-slate-300 text-xs mt-0.5">{pixConfig.receiverBank}</p>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyPayload}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
                  >
                    {copiedPayload ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPayload ? "Código Pix Copiado!" : "Copiar Código Pix Copia e Cola"}</span>
                  </button>
                </div>
              </div>

              {/* COMPROVANTE & SUBSCRIBER FORM */}
              <form onSubmit={handleSubmit} className="bg-[#181c24] border border-[#272e3d] p-4 rounded-2xl space-y-4">
                <div className="border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    Envio do Comprovante para Ativação
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Preencha os dados do barbeiro/conta e anexe o comprovante de transferência
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">
                      Nome do Barbeiro / Usuário *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Siqueira Jhonattan"
                      className="w-full p-2.5 bg-[#12151c] border border-slate-800 rounded-xl outline-none text-white focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">
                      E-mail de Login do Sistema *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="siqueira@gmail.com"
                      className="w-full p-2.5 bg-[#12151c] border border-slate-800 rounded-xl outline-none text-white focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">
                      WhatsApp / Celular com DDD
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 99999-8888"
                      className="w-full p-2.5 bg-[#12151c] border border-slate-800 rounded-xl outline-none text-white focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">
                      Observações (opcional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ex: Pago via Nubank às 14h"
                      className="w-full p-2.5 bg-[#12151c] border border-slate-800 rounded-xl outline-none text-white focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* COMPROVANTE UPLOAD SECTION */}
                <div>
                  <label className="block text-slate-400 mb-1.5 font-semibold text-xs">
                    Comprovante de Pagamento Pix *
                  </label>
                  <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/70 transition p-4 rounded-2xl bg-[#12151c] text-center space-y-2">
                    {comprovanteBase64 ? (
                      <div className="space-y-3">
                        <div className="relative inline-block">
                          <img
                            src={comprovanteBase64}
                            alt="Comprovante"
                            className="max-h-44 mx-auto rounded-xl border border-slate-700 shadow-md object-contain"
                          />
                          <button
                            type="button"
                            onClick={() => setComprovanteBase64("")}
                            className="absolute -top-2 -right-2 p-1 bg-red-600 hover:bg-red-500 text-white rounded-full transition"
                            title="Remover anexo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-emerald-400 font-bold flex items-center justify-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Comprovante anexado com sucesso!
                        </p>
                      </div>
                    ) : (
                      <label className="cursor-pointer block">
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-1 animate-pulse" />
                        <span className="text-xs font-bold text-white block">
                          Clique para anexar a foto ou PDF do comprovante
                        </span>
                        <span className="text-[10px] text-slate-500">
                          PNG, JPG, JPEG ou PDF até 10MB
                        </span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm rounded-xl uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Enviando Comprovante...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enviar Comprovante & Solicitar Liberação</span>
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
