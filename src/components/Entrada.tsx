import React, { useState, useEffect } from "react";
import { ArrowLeft, Save, Search, UserPlus, FileText, Camera, CheckSquare, Square, Trash2, ShieldCheck, Printer, Eye, QrCode, Image, Plus } from "lucide-react";
import { Cliente, Servico, Produto, AtendimentoServico, AtendimentoProduto, Marca, Item } from "../types";
import Clientes from "./Clientes";
import ProductScanner from "./ProductScanner";
import { compressImage } from "../lib/imageCompressor";

interface EntradaProps {
  onBack: () => void;
  onSaveSuccess: (receiptContent: string, phone: string, clientName: string) => void;
}

export default function Entrada({ onBack, onSaveSuccess }: EntradaProps) {
  // Client selection
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);

  // Applet configuration lookups
  const [itens, setItens] = useState<Item[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [allServices, setAllServices] = useState<Servico[]>([]);
  const [allProducts, setAllProducts] = useState<Produto[]>([]);

  // Form Fields
  const [selectedItem, setSelectedItem] = useState("Celular");
  const [selectedBrand, setSelectedBrand] = useState("Samsung");
  const [model, setModel] = useState("");
  const [imei, setImei] = useState("");
  const [defeito, setDefeito] = useState("");
  const [observations, setObservations] = useState("");
  const [garantia, setGarantia] = useState("Garantia de 90 dias (3 meses)");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [printTicket, setPrintTicket] = useState(true);

  // Selected Services/Products checklists
  const [selectedServices, setSelectedServices] = useState<AtendimentoServico[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<AtendimentoProduto[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Manual values custom prices overrides
  const [customPriceInputId, setCustomPriceInputId] = useState<string | null>(null);
  const [tempCustomPrice, setTempCustomPrice] = useState("");

  // Manual items input
  const [manualItemName, setManualItemName] = useState("");
  const [manualItemPrice, setManualItemPrice] = useState("");

  // Quick auxiliary brand / category addition states
  const [showNewBrandInput, setShowNewBrandInput] = useState(false);
  const [quickBrandName, setQuickBrandName] = useState("");

  const [showNewItemInput, setShowNewItemInput] = useState(false);
  const [quickItemName, setQuickItemName] = useState("");

  const fetchData = async () => {
    try {
      const [it, ma, se, pr] = await Promise.all([
        fetch("/api/itens").then(r => r.json()),
        fetch("/api/marcas").then(r => r.json()),
        fetch("/api/servicos").then(r => r.json()),
        fetch("/api/produtos").then(r => r.json())
      ]);

      setItens(it || []);
      setMarcas(ma || []);
      setAllServices(se || []);
      setAllProducts(pr || []);

      if (it && it.length > 0) setSelectedItem(it[0].name);
      if (ma && ma.length > 0) setSelectedBrand(ma[0].name);
    } catch (err) {
      console.error("Erro ao buscar dados auxiliares", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate dynamic total
  const totalServices = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalProducts = selectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
  const totalAmount = totalServices + totalProducts;

  // Handle Photo Upload / Capture simulation
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const filesArr = Array.from(files) as File[];
      if (photoUrls.length + filesArr.length > 6) {
        alert("Você pode carregar no máximo 6 fotos do equipamento.");
        return;
      }

      const promises = filesArr.map((file: File) => {
        return compressImage(file).catch(err => {
          console.error("Error compressing equipment image:", err);
          return "";
        });
      });

      Promise.all(promises).then(results => {
        const validResults = results.filter(r => r !== "");
        const updated = [...photoUrls, ...validResults].slice(0, 6);
        setPhotoUrls(updated);
        if (updated.length > 0) {
          setPhotoUrl(updated[0]); // fallback for single-photo legacy fields
        }
      });
    }
  };

  const handleToggleService = (s: Servico) => {
    const existsIndex = selectedServices.findIndex(item => item.serviceId === s.id);
    if (existsIndex > -1) {
      setSelectedServices(selectedServices.filter(item => item.serviceId !== s.id));
    } else {
      if (s.isPriceCustom) {
        // Require manual price input
        setCustomPriceInputId(s.id);
        setTempCustomPrice("");
      } else {
        setSelectedServices([...selectedServices, { serviceId: s.id, name: s.name, price: s.price }]);
      }
    }
  };

  const handleApplyCustomPrice = (s: Servico) => {
    const price = Number(tempCustomPrice);
    if (isNaN(price) || price <= 0) {
      alert("Por favor, digite um valor válido.");
      return;
    }
    setSelectedServices([...selectedServices, { serviceId: s.id, name: s.name, price }]);
    setCustomPriceInputId(null);
  };

  const handleToggleProduct = (p: Produto) => {
    const existsIndex = selectedProducts.findIndex(item => item.productId === p.id);
    if (existsIndex > -1) {
      setSelectedProducts(selectedProducts.filter(item => item.productId !== p.id));
    } else {
      setSelectedProducts([...selectedProducts, { productId: p.id, name: p.name, price: p.price, quantity: 1 }]);
    }
  };

  const handleScanSelectProduct = (p: Produto) => {
    const existsIndex = selectedProducts.findIndex(item => item.productId === p.id);
    if (existsIndex > -1) {
      setSelectedProducts(selectedProducts.map((item, idx) => 
        idx === existsIndex ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setSelectedProducts([...selectedProducts, { productId: p.id, name: p.name, price: p.price, quantity: 1 }]);
    }
  };

  const handleUpdateProductQty = (pId: string, q: number) => {
    setSelectedProducts(selectedProducts.map(p => {
      if (p.productId === pId) {
        return { ...p, quantity: Math.max(1, q) };
      }
      return p;
    }));
  };

  const handleSaveQuickBrand = async () => {
    const trimmed = quickBrandName.trim();
    if (!trimmed) return;
    try {
      const res = await fetch("/api/marcas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed })
      });
      if (res.ok) {
        const marcasRes = await fetch("/api/marcas");
        if (marcasRes.ok) {
          const updatedMarcas = await marcasRes.json();
          setMarcas(updatedMarcas);
        }
        setSelectedBrand(trimmed);
        setQuickBrandName("");
        setShowNewBrandInput(false);
      } else {
        alert("Erro ao salvar nova marca.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o servidor.");
    }
  };

  const handleSaveQuickItem = async () => {
    const trimmed = quickItemName.trim();
    if (!trimmed) return;
    try {
      const res = await fetch("/api/itens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed })
      });
      if (res.ok) {
        const itensRes = await fetch("/api/itens");
        if (itensRes.ok) {
          const updatedItens = await itensRes.json();
          setItens(updatedItens);
        }
        setSelectedItem(trimmed);
        setQuickItemName("");
        setShowNewItemInput(false);
      } else {
        alert("Erro ao salvar novo item.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o servidor.");
    }
  };

  const handleAddManualService = () => {
    const trimmed = manualItemName.trim();
    if (!trimmed) {
      alert("Por favor, digite o nome do serviço.");
      return;
    }
    const price = Number(manualItemPrice);
    if (isNaN(price) || price < 0) {
      alert("Por favor, insira um preço válido (0 ou maior).");
      return;
    }
    const newId = `custom-serv-${Date.now()}`;
    setSelectedServices([...selectedServices, { serviceId: newId, name: trimmed, price }]);
    setManualItemName("");
    setManualItemPrice("");
  };

  const handleAddManualProduct = () => {
    const trimmed = manualItemName.trim();
    if (!trimmed) {
      alert("Por favor, digite o nome da peça/acessório.");
      return;
    }
    const price = Number(manualItemPrice);
    if (isNaN(price) || price < 0) {
      alert("Por favor, insira um preço válido (0 ou maior).");
      return;
    }
    const newId = `custom-prod-${Date.now()}`;
    setSelectedProducts([...selectedProducts, { productId: newId, name: trimmed, price, quantity: 1 }]);
    setManualItemName("");
    setManualItemPrice("");
  };

  const handleUpdateSelectedServiceField = (serviceId: string, field: string, value: any) => {
    setSelectedServices(selectedServices.map(s => s.serviceId === serviceId ? { ...s, [field]: value } : s));
  };

  const handleUpdateSelectedProductField = (productId: string, field: string, value: any) => {
    setSelectedProducts(selectedProducts.map(p => p.productId === productId ? { ...p, [field]: value } : p));
  };

  const handleSave = async () => {
    if (!selectedCliente) {
      alert("Por favor, selecione ou cadastre um cliente!");
      return;
    }
    if (!model) {
      alert("Por favor, digite o modelo do equipamento!");
      return;
    }
    
    let servicesToSend = [...selectedServices];
    if (servicesToSend.length === 0) {
      servicesToSend = [{
        serviceId: "custom-serv-diagnostic",
        name: "Análise Técnica & Diagnóstico",
        price: 0
      }];
    }

    const finalTotalAmount = servicesToSend.reduce((acc, s) => acc + s.price, 0) + 
      selectedProducts.reduce((acc, p) => acc + p.price * p.quantity, 0);

    const payload = {
      clienteId: selectedCliente.id,
      item: selectedItem,
      brand: selectedBrand,
      model,
      imei,
      defeito,
      observations,
      garantia: garantia || "Garantia de 90 dias (3 meses)",
      photoUrl,
      photoUrls,
      services: servicesToSend,
      products: selectedProducts,
      totalAmount: finalTotalAmount
    };

    try {
      const res = await fetch("/api/atendimentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        
        // Build receipt content
        const entryStr = `CONTROLE: ${result.controlNumber}
DATA: ${new Date(result.entryDate).toLocaleString("pt-BR")}
CLIENTE: ${selectedCliente.name}
FONE: ${selectedCliente.phone}
CPF: ${selectedCliente.cpf || ""}
------------------------
EQUIPAMENTO:
${result.item} ${result.brand} ${result.model}
${result.imei ? `IMEI: ${result.imei}` : ""}
------------------------
DEFEITO: ${result.defeito || "Não informado"}
ESTADO / OBS: ${result.observations || "Nenhuma"}
GARANTIA: ${garantia || "Garantia de 90 dias (3 meses)"}
------------------------
SERVICOS ADICIONADOS:
${servicesToSend.map(s => `- ${s.name}: R$ ${s.price.toFixed(2)}`).join("\n")}
${selectedProducts.length > 0 ? `PRODUTOS/PECAS:\n${selectedProducts.map(p => `- ${p.name} (x${p.quantity}): R$ ${(p.price * p.quantity).toFixed(2)}`).join("\n")}` : ""}
------------------------
TOTAL ESTIMADO: R$ ${finalTotalAmount.toFixed(2)}
------------------------
ASSINATURA DO CLIENTE:

________________________
TERMO: Autorizo o diagnóstico.`;

        onSaveSuccess(
          printTicket ? entryStr : "",
          selectedCliente ? selectedCliente.phone : "",
          selectedCliente ? selectedCliente.name : ""
        );
      } else {
        let errMsg = "Falha ao salvar atendimento.";
        try {
          const errData = await res.json();
          errMsg = errData.message || errData.error || errMsg;
        } catch (_) {}
        alert(errMsg);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-800">Entrada de Equipamentos</h2>
            <p className="text-slate-500 text-xs">Abertura de nova Ordem de Serviço</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Step 1: Customer Card */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">1</span>
                <span>Dados do Cliente</span>
              </h3>
              {!selectedCliente && (
                <button
                  onClick={() => setShowClientModal(true)}
                  className="flex items-center gap-1 text-[#1E88E5] hover:text-blue-700 font-bold text-xs"
                >
                  <Search className="w-3.5 h-3.5" />
                  Buscar / Cadastrar
                </button>
              )}
            </div>

            {selectedCliente ? (
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-emerald-900 text-sm">{selectedCliente.name}</p>
                  <div className="flex flex-wrap gap-x-4 mt-1 text-slate-600 font-medium">
                    <span>Fone: {selectedCliente.phone}</span>
                    {selectedCliente.cpf && <span>CPF: {selectedCliente.cpf}</span>}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCliente(null)}
                  className="text-xs text-red-500 hover:underline font-semibold"
                >
                  Alterar Cliente
                </button>
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                <p className="text-xs text-slate-500 mb-3">Selecione ou cadastre o dono do aparelho para continuar</p>
                <button
                  type="button"
                  onClick={() => setShowClientModal(true)}
                  className="px-4 py-2 bg-[#1E88E5] hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition"
                >
                  Associar Cliente
                </button>
              </div>
            )}
          </div>

          {/* Step 2: Equipment Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">2</span>
              <span>Informações do Aparelho</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-500">Item / Categoria</label>
                  <button
                    type="button"
                    onClick={() => setShowNewItemInput(!showNewItemInput)}
                    className="text-[#1E88E5] hover:underline font-bold text-[10px]"
                  >
                    {showNewItemInput ? "Selecionar Existente" : "+ Novo Tipo"}
                  </button>
                </div>
                {showNewItemInput ? (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Ex: Smartwatch, Tablet"
                      value={quickItemName}
                      onChange={(e) => setQuickItemName(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700 font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleSaveQuickItem}
                      className="px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold"
                    >
                      Salvar
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedItem}
                    onChange={(e) => setSelectedItem(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none font-semibold text-slate-700"
                  >
                    {itens.map(it => <option key={it.id} value={it.name}>{it.name}</option>)}
                  </select>
                )}
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-500">Marca</label>
                  <button
                    type="button"
                    onClick={() => setShowNewBrandInput(!showNewBrandInput)}
                    className="text-[#1E88E5] hover:underline font-bold text-[10px]"
                  >
                    {showNewBrandInput ? "Selecionar Existente" : "+ Nova Marca"}
                  </button>
                </div>
                {showNewBrandInput ? (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Ex: Huawei, Realme"
                      value={quickBrandName}
                      onChange={(e) => setQuickBrandName(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700 font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleSaveQuickBrand}
                      className="px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold"
                    >
                      Salvar
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none font-semibold text-slate-700"
                  >
                    {marcas.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Modelo *</label>
                <input
                  type="text"
                  required
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Ex: iPhone 13 Pro Max"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Código IMEI (Opcional)</label>
                <input
                  type="text"
                  value={imei}
                  onChange={(e) => setImei(e.target.value)}
                  placeholder="Ex: 357912345678901"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Defeito Apresentado *</label>
              <textarea
                required
                value={defeito}
                onChange={(e) => setDefeito(e.target.value)}
                placeholder="Ex: Não liga, tela piscando, alto falante mudo..."
                rows={2}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Observações / Estado do Aparelho</label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Ex: Celular em bom estado, sem marcas de uso, deixou capa, deixou carregador..."
                rows={2}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Garantia do Serviço / Equipamento */}
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-2">
              <label className="block text-xs font-bold text-[#1E88E5] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Garantia do Serviço / Acessório</span>
              </label>
              <input
                type="text"
                value={garantia}
                onChange={(e) => setGarantia(e.target.value)}
                placeholder="Ex: Garantia de 90 dias (3 meses)..."
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {[
                  "Garantia de 90 dias (3 meses)",
                  "Garantia de 30 dias",
                  "Garantia de 6 meses",
                  "Garantia de 1 ano",
                  "Sem garantia"
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setGarantia(preset)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                      garantia === preset
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Photo Capture / Upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Fotos do Equipamento ({photoUrls.length} de 6)
              </label>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {/* Tirar Foto (Câmera) */}
                  <label className="flex flex-col items-center justify-center w-20 h-20 border border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 rounded-xl cursor-pointer transition text-center p-2 text-[10px] font-semibold text-slate-500">
                    <Camera className="w-5 h-5 text-blue-500 mb-1" />
                    <span>Câmera</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Escolher da Galeria */}
                  <label className="flex flex-col items-center justify-center w-20 h-20 border border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 rounded-xl cursor-pointer transition text-center p-2 text-[10px] font-semibold text-slate-500">
                    <Image className="w-5 h-5 text-slate-500 mb-1" />
                    <span>Galeria</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>

                  {photoUrls.map((url, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-xl border border-slate-200 overflow-hidden shrink-0 group">
                      <img src={url} className="w-full h-full object-cover" alt={`Equipamento ${idx + 1}`} />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = photoUrls.filter((_, i) => i !== idx);
                          setPhotoUrls(updated);
                          if (updated.length > 0) {
                            setPhotoUrl(updated[0]);
                          } else {
                            setPhotoUrl("");
                          }
                        }}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition text-[9px] font-bold"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
                {photoUrls.length === 0 && (
                  <p className="text-[10px] text-slate-400 font-medium">Recomendado registrar fotos para assegurar o estado de conservação e acessórios.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Selection Services & Products (Sidebar/Third Column) */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">3</span>
              <span>Serviços & Peças</span>
            </h3>

            {/* Upgraded Unified Manual Input Form */}
            <div className="space-y-4">
              {/* Form inputs */}
              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">Novo Item / Serviço</span>
                  <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    className="flex items-center gap-1 text-[#1E88E5] hover:text-blue-700 font-extrabold text-[10px]"
                  >
                    <QrCode className="w-3.5 h-3.5 text-[#1E88E5]" />
                    Escanear Peça
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2.5">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Nome do Serviço ou Peça..."
                        value={manualItemName}
                        onChange={(e) => setManualItemName(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-400 font-semibold text-slate-700"
                      />
                    </div>
                    <div className="w-24">
                      <div className="relative">
                        <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs font-bold">R$</span>
                        <input
                          type="number"
                          placeholder="0,00"
                          value={manualItemPrice}
                          onChange={(e) => setManualItemPrice(e.target.value)}
                          className="w-full pl-8 pr-2 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-400 font-mono text-center font-bold text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddManualService}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/10"
                    >
                      <Plus className="w-4 h-4" />
                      + Adicionar Serviço
                    </button>
                    <button
                      type="button"
                      onClick={handleAddManualProduct}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm shadow-red-500/10"
                    >
                      <Plus className="w-4 h-4" />
                      + Adicionar Peça
                    </button>
                  </div>
                </div>
              </div>

              {/* Suggestions chips section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sugestões Rápidas (Clique p/ preencher)</p>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {allServices.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setManualItemName(s.name);
                        setManualItemPrice(s.price > 0 ? s.price.toString() : "");
                      }}
                      className="px-2.5 py-1.5 bg-blue-50/50 hover:bg-blue-100/70 text-[#1E88E5] border border-blue-100/50 rounded-xl text-[10px] font-bold transition flex items-center gap-1"
                    >
                      <span>🛠️</span>
                      <span>{s.name}</span>
                      {s.price > 0 && <span className="text-slate-500 font-normal">({s.price} R$)</span>}
                    </button>
                  ))}
                  {allProducts.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setManualItemName(p.name);
                        setManualItemPrice(p.price > 0 ? p.price.toString() : "");
                      }}
                      className="px-2.5 py-1.5 bg-red-50/50 hover:bg-red-100/70 text-red-600 border border-red-100/50 rounded-xl text-[10px] font-bold transition flex items-center gap-1"
                    >
                      <span>📦</span>
                      <span>{p.name}</span>
                      {p.price > 0 && <span className="text-slate-500 font-normal">({p.price} R$)</span>}
                    </button>
                  ))}
                  {allServices.length === 0 && allProducts.length === 0 && (
                    <span className="text-[10px] text-slate-400">Nenhum serviço ou produto cadastrado no banco.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Included Items Review and Removal List */}
            {(selectedServices.length > 0 || selectedProducts.length > 0) && (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Itens Incluídos na OS (Edite diretamente)</p>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {selectedServices.map(s => (
                    <div key={s.serviceId} className="p-2 bg-blue-50/20 border border-blue-100/50 rounded-xl space-y-1.5 text-xs">
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={s.name}
                          onChange={(e) => handleUpdateSelectedServiceField(s.serviceId, "name", e.target.value)}
                          className="flex-1 p-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700 outline-none"
                          placeholder="Nome do Serviço"
                        />
                        <div className="relative w-20">
                          <span className="absolute left-1 top-1.5 text-slate-400 text-[10px] font-bold">R$</span>
                          <input
                            type="number"
                            value={s.price || ""}
                            onChange={(e) => handleUpdateSelectedServiceField(s.serviceId, "price", Number(e.target.value))}
                            className="w-full pl-5 pr-1 py-1 bg-white border border-slate-200 rounded text-xs font-bold font-mono text-center outline-none"
                            placeholder="0,00"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedServices(selectedServices.filter(item => item.serviceId !== s.serviceId))}
                          className="text-red-500 hover:text-red-700 p-1 shrink-0"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {selectedProducts.map(p => (
                    <div key={p.productId} className="p-2 bg-red-50/20 border border-red-100/50 rounded-xl space-y-1.5 text-xs">
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) => handleUpdateSelectedProductField(p.productId, "name", e.target.value)}
                          className="flex-1 p-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700 outline-none"
                          placeholder="Nome do Produto"
                        />
                        <div className="relative w-20">
                          <span className="absolute left-1 top-1.5 text-slate-400 text-[10px] font-bold">R$</span>
                          <input
                            type="number"
                            value={p.price || ""}
                            onChange={(e) => handleUpdateSelectedProductField(p.productId, "price", Number(e.target.value))}
                            className="w-full pl-5 pr-1 py-1 bg-white border border-slate-200 rounded text-xs font-bold font-mono text-center outline-none"
                            placeholder="0,00"
                          />
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] text-slate-400">Qtd:</span>
                          <input
                            type="number"
                            value={p.quantity}
                            onChange={(e) => handleUpdateSelectedProductField(p.productId, "quantity", Number(e.target.value))}
                            className="w-10 p-1 border border-slate-200 bg-white rounded text-center text-xs font-bold font-mono outline-none"
                            min={1}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedProducts(selectedProducts.filter(item => item.productId !== p.productId))}
                          className="text-red-500 hover:text-red-700 p-1 shrink-0"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary Zone */}
            <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Serviços:</span>
                <span className="font-mono font-bold">R$ {totalServices.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Produtos/Acessórios:</span>
                <span className="font-mono font-bold">R$ {totalProducts.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-200 my-1 pt-1 flex justify-between text-sm font-bold text-[#1E88E5]">
                <span>Total Estimado:</span>
                <span className="font-mono">R$ {totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Print Bluetooth toggle */}
            <div className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                id="print_ticket"
                checked={printTicket}
                onChange={(e) => setPrintTicket(e.target.checked)}
                className="w-4 h-4 text-[#1E88E5] focus:ring-[#1E88E5] border-slate-300 rounded"
              />
              <label htmlFor="print_ticket" className="text-xs font-semibold text-slate-700 flex items-center gap-1 cursor-pointer">
                <Printer className="w-3.5 h-3.5 text-blue-500" />
                Imprimir Recibo de Entrada (ESC/POS)
              </label>
            </div>

            <button
              onClick={handleSave}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 text-xs"
            >
              <Save className="w-4 h-4" />
              Finalizar Entrada & Registrar OS
            </button>
          </div>
        </div>
      </div>

      {/* Clientes Pick/Add Modal */}
      {showClientModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl relative border border-slate-100">
            <button
              type="button"
              onClick={() => setShowClientModal(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="mt-2">
              <Clientes
                isPicker={true}
                onSelect={(c) => {
                  setSelectedCliente(c);
                  setShowClientModal(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Embedded Product Scanner Modal */}
      {scannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-4xl">
            <ProductScanner
              onClose={() => setScannerOpen(false)}
              onProductScanned={handleScanSelectProduct}
              mode="select"
            />
          </div>
        </div>
      )}
    </div>
  );
}

import { X } from "lucide-react";
