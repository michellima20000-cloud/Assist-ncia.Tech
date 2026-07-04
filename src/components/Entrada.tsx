import React, { useState, useEffect } from "react";
import { ArrowLeft, Save, Search, UserPlus, FileText, Camera, CheckSquare, Square, Trash2, ShieldCheck, Printer, Eye, QrCode } from "lucide-react";
import { Cliente, Servico, Produto, AtendimentoServico, AtendimentoProduto, Marca, Item } from "../types";
import Clientes from "./Clientes";
import ProductScanner from "./ProductScanner";

interface EntradaProps {
  onBack: () => void;
  onSaveSuccess: (receiptContent: string) => void;
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
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(promises).then(results => {
        const updated = [...photoUrls, ...results].slice(0, 6);
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

  const handleSave = async () => {
    if (!selectedCliente) {
      alert("Por favor, selecione ou cadastre um cliente!");
      return;
    }
    if (!model) {
      alert("Por favor, digite o modelo do equipamento!");
      return;
    }
    if (selectedServices.length === 0) {
      alert("Adicione pelo menos um serviço para esta ordem!");
      return;
    }

    const payload = {
      clienteId: selectedCliente.id,
      item: selectedItem,
      brand: selectedBrand,
      model,
      imei,
      defeito,
      observations,
      photoUrl,
      photoUrls,
      services: selectedServices,
      products: selectedProducts,
      totalAmount
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
------------------------
SERVICOS ADICIONADOS:
${selectedServices.map(s => `- ${s.name}: R$ ${s.price.toFixed(2)}`).join("\n")}
${selectedProducts.length > 0 ? `PRODUTOS/PECAS:\n${selectedProducts.map(p => `- ${p.name} (x${p.quantity}): R$ ${(p.price * p.quantity).toFixed(2)}`).join("\n")}` : ""}
------------------------
TOTAL ESTIMADO: R$ ${totalAmount.toFixed(2)}
------------------------
ASSINATURA DO CLIENTE:

________________________
TERMO: Autorizo o diagnóstico.`;

        onSaveSuccess(printTicket ? entryStr : "");
      } else {
        alert("Falha ao salvar atendimento.");
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
                <label className="block text-xs font-semibold text-slate-500 mb-1">Item / Categoria</label>
                <select
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                >
                  {itens.map(it => <option key={it.id} value={it.name}>{it.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Marca</label>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                >
                  {marcas.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                </select>
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

            {/* Simulated Photo Capture / Upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Fotos do Equipamento ({photoUrls.length} de 6)
              </label>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <label className="flex flex-col items-center justify-center w-20 h-20 border border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 rounded-xl cursor-pointer transition text-center p-2 text-[10px] font-semibold text-slate-500">
                    <Camera className="w-5 h-5 text-blue-500 mb-1" />
                    <span>Adicionar</span>
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

            {/* Services checklist */}
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Selecionar Serviços</p>
              {allServices.map(s => {
                const isSelected = selectedServices.some(item => item.serviceId === s.id);
                return (
                  <div key={s.id}>
                    <button
                      type="button"
                      onClick={() => handleToggleService(s)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left border transition text-xs ${
                        isSelected
                          ? "bg-blue-50/50 border-blue-200 text-[#1E88E5]"
                          : "bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isSelected ? <CheckSquare className="w-4 h-4 text-[#1E88E5]" /> : <Square className="w-4 h-4 text-slate-400" />}
                        <span className="font-semibold">{s.name}</span>
                      </div>
                      <span className="font-mono text-slate-600">
                        {s.isPriceCustom ? "Var" : `R$ ${s.price}`}
                      </span>
                    </button>

                    {/* Show Custom price inputs */}
                    {customPriceInputId === s.id && (
                      <div className="p-2 border border-blue-100 bg-blue-50/20 rounded-xl mt-1.5 flex gap-2 items-center animate-fade-in">
                        <input
                          type="number"
                          placeholder="Valor do serviço"
                          value={tempCustomPrice}
                          onChange={(e) => setTempCustomPrice(e.target.value)}
                          className="p-1.5 border border-slate-200 bg-white rounded-lg text-xs w-full outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleApplyCustomPrice(s)}
                          className="px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                        >
                          OK
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Products checklist */}
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              <div className="flex justify-between items-center mb-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Acessórios / Peças</p>
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="flex items-center gap-1 text-[#1E88E5] hover:text-blue-700 font-extrabold text-[10px]"
                >
                  <QrCode className="w-3.5 h-3.5 text-[#1E88E5]" />
                  Escanear Peça
                </button>
              </div>
              {allProducts.map(p => {
                const isSelected = selectedProducts.some(item => item.productId === p.id);
                const selectedItem = selectedProducts.find(item => item.productId === p.id);

                return (
                  <div key={p.id} className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleProduct(p)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left border transition text-xs ${
                        isSelected
                          ? "bg-red-50/50 border-red-200 text-red-600"
                          : "bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isSelected ? <CheckSquare className="w-4 h-4 text-red-500" /> : <Square className="w-4 h-4 text-slate-400" />}
                        <span className="font-semibold">{p.name}</span>
                      </div>
                      <span className="font-mono text-slate-600">R$ {p.price}</span>
                    </button>

                    {isSelected && selectedItem && (
                      <div className="flex items-center gap-2 p-1.5 bg-red-50/30 rounded-lg justify-end">
                        <span className="text-[10px] text-slate-500 font-semibold">Qtd:</span>
                        <input
                          type="number"
                          value={selectedItem.quantity}
                          onChange={(e) => handleUpdateProductQty(p.id, Number(e.target.value))}
                          className="w-12 p-1 border border-slate-200 bg-white rounded text-center text-xs outline-none"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

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
