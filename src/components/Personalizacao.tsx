import React, { useState, useRef } from "react";
import {
  Palette, Sun, Moon, Check, RotateCcw, Sparkles, Monitor,
  Sliders, ShieldCheck, CheckCircle, Clock, PlusCircle, Hammer,
  ArrowRight, ShoppingBag, Upload, Image as ImageIcon, Trash2,
  Building2, Eye, RefreshCw, AlertCircle
} from "lucide-react";
import { ThemeConfig, ThemeMode } from "../types";
import { THEME_COLOR_PRESETS, DEFAULT_THEME, persistTheme, getHeaderBackground } from "../lib/theme";

interface PersonalizacaoProps {
  currentTheme: ThemeConfig;
  onThemeChange: (newTheme: ThemeConfig) => void;
  onBack: () => void;
}

export default function Personalizacao({ currentTheme, onThemeChange, onBack }: PersonalizacaoProps) {
  const [theme, setTheme] = useState<ThemeConfig>(currentTheme);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [customHex, setCustomHex] = useState(theme.primaryColor || "#1E88E5");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateConfig = (partial: Partial<ThemeConfig>) => {
    const updated: ThemeConfig = { ...theme, ...partial };
    setTheme(updated);
    onThemeChange(updated);
  };

  const handleModeSelect = (mode: ThemeMode) => {
    updateConfig({ mode });
  };

  const handleColorPreset = (color: string) => {
    setCustomHex(color);
    updateConfig({
      primaryColor: color,
      headerColor: color
    });
  };

  const handleCustomColorInput = (hex: string) => {
    setCustomHex(hex);
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      updateConfig({
        primaryColor: hex,
        headerColor: hex
      });
    }
  };

  // Image optimization and conversion helper
  const processImageFile = (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith("image/")) {
      setUploadError("Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP ou SVG).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        // Limit max dimensions to 512px to keep it sharp but lightweight
        const maxDim = 512;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const isPng = file.type.includes("png") || file.type.includes("svg");
          const optimized = canvas.toDataURL(isPng ? "image/png" : "image/jpeg", 0.92);
          updateConfig({
            logoUrl: optimized,
            showLogoInHeader: true,
            showLogoAsBackground: true,
            backgroundLogoOpacity: theme.backgroundLogoOpacity || 0.07
          });
        } else {
          updateConfig({
            logoUrl: dataUrl,
            showLogoInHeader: true,
            showLogoAsBackground: true,
            backgroundLogoOpacity: theme.backgroundLogoOpacity || 0.07
          });
        }
      };
      img.onerror = () => {
        setUploadError("Não foi possível processar a imagem. Tente outro arquivo.");
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleRemoveLogo = () => {
    updateConfig({
      logoUrl: "",
      showLogoAsBackground: false
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    await persistTheme(theme);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  const handleReset = async () => {
    if (window.confirm("Deseja restaurar as cores, logo e layout para o padrão original do sistema?")) {
      setTheme(DEFAULT_THEME);
      setCustomHex(DEFAULT_THEME.primaryColor);
      onThemeChange(DEFAULT_THEME);
      await persistTheme(DEFAULT_THEME);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  const headerBgPreview = getHeaderBackground(theme);
  const currentOpacity = typeof theme.backgroundLogoOpacity === "number" ? theme.backgroundLogoOpacity : 0.07;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top bar with back and title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 font-bold transition flex items-center gap-1.5 text-xs"
          >
            &larr; Voltar
          </button>
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
                <Palette className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">Personalização, Logotipo & Cores</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Adicione a <strong>logo da sua assistência</strong> para cabeçalho e plano de fundo (marca d'água), e escolha o <strong>Modo Black</strong> para bancada.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition flex items-center gap-1.5"
            title="Restaurar padrão"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Padrão
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-[#1E88E5] hover:bg-blue-600 text-white font-extrabold text-xs rounded-xl shadow-sm hover:shadow transition flex items-center gap-2"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Salvo com Sucesso!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Salvar Tema & Logo</span>
              </>
            )}
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 rounded-2xl flex items-center gap-3 text-xs font-bold animate-fadeIn">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Tema, logotipo e preferências de exibição atualizados e sincronizados com sucesso no sistema!</span>
        </div>
      )}

      {/* Grid: Settings and Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* SEÇÃO PRINCIPAL: LOGOTIPO & MARCA DA ASSISTÊNCIA */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#1E88E5]" />
                  Logotipo da Assistência & Plano de Fundo
                </h3>
                <p className="text-[11px] text-slate-500">
                  Carregue a imagem da sua marca para exibir no cabeçalho e como marca d'água no fundo do sistema
                </p>
              </div>
              {theme.logoUrl && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" /> Logo Ativa
                </span>
              )}
            </div>

            {uploadError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Upload or Current Logo Display */}
            {!theme.logoUrl ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? "border-blue-500 bg-blue-50/50 scale-[0.99]"
                    : "border-slate-200 hover:border-blue-400 hover:bg-slate-50/70 bg-slate-50/30"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1E88E5] flex items-center justify-center shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Clique para selecionar ou arraste o logotipo aqui
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Formatos recomendados: PNG com fundo transparente, JPG ou SVG (até 5MB)
                  </p>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition"
                >
                  Procurar Imagem no Computador
                </button>
              </div>
            ) : (
              <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Logo Thumbnail with checkerboard for transparency */}
                  <div className="w-24 h-24 rounded-2xl border border-slate-200 bg-white p-2 flex items-center justify-center shrink-0 shadow-xs relative overflow-hidden group">
                    <img
                      src={theme.logoUrl}
                      alt="Logotipo da Loja"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>

                  <div className="flex-1 space-y-1.5 text-center sm:text-left">
                    <p className="text-xs font-extrabold text-slate-800">Logotipo Carregado</p>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Sua imagem está configurada e pronta para ser usada como marca visual do sistema.
                    </p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-[11px] rounded-lg transition flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Trocar Logo
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="px-3 py-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 font-bold text-[11px] rounded-lg transition flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remover
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Logo Display Options */}
                <div className="pt-3 border-t border-slate-200/80 space-y-3">
                  {/* Option 1: Header Toggle */}
                  <label className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 transition cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={theme.showLogoInHeader !== false}
                      onChange={(e) => updateConfig({ showLogoInHeader: e.target.checked })}
                      className="w-4 h-4 rounded text-[#1E88E5] focus:ring-blue-500 mt-0.5 cursor-pointer"
                    />
                    <div className="flex-1">
                      <span className="text-xs font-extrabold text-slate-800 block">
                        Exibir logotipo no cabeçalho superior
                      </span>
                      <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                        Substitui o ícone padrão "M" pela sua logo oficial no topo de todas as telas.
                      </span>
                    </div>
                  </label>

                  {/* Option 2: Background Watermark Toggle */}
                  <label className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 transition cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={theme.showLogoAsBackground !== false}
                      onChange={(e) => updateConfig({ showLogoAsBackground: e.target.checked })}
                      className="w-4 h-4 rounded text-[#1E88E5] focus:ring-blue-500 mt-0.5 cursor-pointer"
                    />
                    <div className="flex-1">
                      <span className="text-xs font-extrabold text-slate-800 block">
                        Colocar logotipo como Plano de Fundo (Marca d'água)
                      </span>
                      <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                        O sistema posiciona automaticamente a sua logo centralizada no fundo da tela, atrás dos cartões e tabelas, com acabamento refinado.
                      </span>
                    </div>
                  </label>

                  {/* Option 2.1: Watermark Opacity Slider */}
                  {theme.showLogoAsBackground !== false && (
                    <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-[#1E88E5]" />
                          Intensidade / Opacidade do Plano de Fundo
                        </label>
                        <span className="text-xs font-black font-mono text-[#1E88E5] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                          {Math.round(currentOpacity * 100)}%
                        </span>
                      </div>

                      <input
                        type="range"
                        min="0.03"
                        max="0.25"
                        step="0.01"
                        value={currentOpacity}
                        onChange={(e) => updateConfig({ backgroundLogoOpacity: parseFloat(e.target.value) })}
                        className="w-full accent-[#1E88E5] cursor-pointer"
                      />

                      {/* Opacity quick presets */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[
                          { label: "Muito Discreto", val: 0.04 },
                          { label: "Recomendado (7%)", val: 0.07 },
                          { label: "Médio (12%)", val: 0.12 },
                          { label: "Marcante (20%)", val: 0.20 },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => updateConfig({ backgroundLogoOpacity: preset.val })}
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg transition border ${
                              Math.abs(currentOpacity - preset.val) < 0.015
                                ? "bg-blue-500 text-white border-blue-500 shadow-2xs"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                        A marca d'água fica no fundo do sistema sem bloquear o clique e sem atrapalhar a visualização das ordens e dados.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Store / Business Name Input */}
            <div className="pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Nome da Assistência no Cabeçalho:
              </label>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={theme.companyName || ""}
                  onChange={(e) => updateConfig({ companyName: e.target.value })}
                  placeholder="Ex: Minha Assistência.Tech ou Conserta Celulares"
                  className="flex-1 px-3 py-2 text-xs font-bold text-slate-800 rounded-xl border border-slate-200 focus:outline-none focus:border-[#1E88E5] focus:ring-1 focus:ring-blue-500/20 transition bg-white"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 1: MODO DO SISTEMA (CLARO / BLACK) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-[#1E88E5]" />
                  Modo de Exibição
                </h3>
                <p className="text-[11px] text-slate-500">Alterne entre o visual claro clássico ou os modos black para bancada</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* CLARO */}
              <button
                type="button"
                onClick={() => handleModeSelect("light")}
                className={`p-4 rounded-xl border-2 text-left transition flex flex-col justify-between gap-3 relative ${
                  theme.mode === "light"
                    ? "border-[#1E88E5] bg-blue-50/20 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                {theme.mode === "light" && (
                  <span className="absolute top-2.5 right-2.5 w-5 h-5 bg-[#1E88E5] text-white rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </span>
                )}
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800">Modo Claro</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Visual clássico de fábrica original</p>
                </div>
              </button>

              {/* MODO BLACK TÉCNICO */}
              <button
                type="button"
                onClick={() => handleModeSelect("black")}
                className={`p-4 rounded-xl border-2 text-left transition flex flex-col justify-between gap-3 relative ${
                  theme.mode === "black"
                    ? "border-amber-400 bg-slate-900 text-white shadow-md ring-2 ring-amber-400/20"
                    : "border-slate-200 hover:border-slate-400 bg-slate-900 text-slate-200"
                }`}
              >
                {theme.mode === "black" && (
                  <span className="absolute top-2.5 right-2.5 w-5 h-5 bg-amber-400 text-slate-950 rounded-full flex items-center justify-center font-bold">
                    <Check className="w-3 h-3" />
                  </span>
                )}
                <div className="w-9 h-9 rounded-xl bg-slate-800 text-amber-300 flex items-center justify-center border border-slate-700">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-black text-white">Modo Black</p>
                    <span className="text-[8px] bg-amber-400/20 text-amber-300 px-1 py-0.2 rounded font-bold uppercase">Bancada</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">Fundo preto suave & cartões escuros</p>
                </div>
              </button>

              {/* MODO BLACK OLED */}
              <button
                type="button"
                onClick={() => handleModeSelect("pure_black")}
                className={`p-4 rounded-xl border-2 text-left transition flex flex-col justify-between gap-3 relative ${
                  theme.mode === "pure_black"
                    ? "border-emerald-400 bg-black text-white shadow-md ring-2 ring-emerald-400/20"
                    : "border-zinc-800 hover:border-zinc-600 bg-black text-zinc-300"
                }`}
              >
                {theme.mode === "pure_black" && (
                  <span className="absolute top-2.5 right-2.5 w-5 h-5 bg-emerald-400 text-slate-950 rounded-full flex items-center justify-center font-bold">
                    <Check className="w-3 h-3" />
                  </span>
                )}
                <div className="w-9 h-9 rounded-xl bg-zinc-900 text-emerald-400 flex items-center justify-center border border-zinc-800">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-black text-white">Pure Black</p>
                    <span className="text-[8px] bg-emerald-400/20 text-emerald-300 px-1 py-0.2 rounded font-bold uppercase">OLED</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">Preto absoluto para contraste máximo</p>
                </div>
              </button>
            </div>
          </div>

          {/* SEÇÃO 2: CORES DO LAYOUT E CABEÇALHO */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#1E88E5]" />
                Cor do Cabeçalho & Destaques
              </h3>
              <p className="text-[11px] text-slate-500">Selecione uma cor rápida ou defina o código hexadecimal da sua marca</p>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {THEME_COLOR_PRESETS.map((p) => {
                const isSelected = theme.primaryColor.toLowerCase() === p.color.toLowerCase();
                return (
                  <button
                    key={p.color}
                    type="button"
                    onClick={() => handleColorPreset(p.color)}
                    className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/20 ring-1 ring-blue-500/30"
                        : "border-slate-100 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-lg shrink-0 shadow-xs flex items-center justify-center text-white border border-black/10"
                      style={{ backgroundColor: p.color }}
                    >
                      {isSelected && <Check className="w-4 h-4" />}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                      <span className="text-[9px] font-mono text-slate-400 block">{p.color}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Color Picker & Manual Input */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700">Cor Personalizada:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customHex}
                    onChange={(e) => handleCustomColorInput(e.target.value)}
                    className="w-9 h-9 p-0.5 rounded-lg border border-slate-200 cursor-pointer bg-white"
                    title="Escolha qualquer cor"
                  />
                  <input
                    type="text"
                    value={customHex}
                    onChange={(e) => handleCustomColorInput(e.target.value)}
                    placeholder="#1E88E5"
                    className="w-28 px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500"
                    maxLength={7}
                  />
                </div>
              </div>

              <div className="text-[11px] text-slate-400 ml-auto font-medium">
                Dica: Escolha preto ônix ou sua cor preferida!
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: ESTILO DO CABEÇALHO */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <h3 className="text-sm font-extrabold text-slate-800">Estilo da Barra Superior (Cabeçalho)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => updateConfig({ headerStyle: "primary" })}
                className={`p-3 rounded-xl border text-center transition ${
                  theme.headerStyle === "primary"
                    ? "border-blue-500 bg-blue-50/20 font-bold text-blue-900"
                    : "border-slate-100 hover:border-slate-200 text-slate-600"
                }`}
              >
                <div
                  className="w-full h-3 rounded-md mb-2 shadow-xs"
                  style={{ backgroundColor: theme.primaryColor }}
                />
                <span className="text-xs">Sólido (Cor Escolhida)</span>
              </button>

              <button
                type="button"
                onClick={() => updateConfig({ headerStyle: "black" })}
                className={`p-3 rounded-xl border text-center transition ${
                  theme.headerStyle === "black"
                    ? "border-blue-500 bg-blue-50/20 font-bold text-blue-900"
                    : "border-slate-100 hover:border-slate-200 text-slate-600"
                }`}
              >
                <div className="w-full h-3 rounded-md mb-2 bg-[#0d131f] shadow-xs" />
                <span className="text-xs">Preto Noturno</span>
              </button>

              <button
                type="button"
                onClick={() => updateConfig({ headerStyle: "gradient" })}
                className={`p-3 rounded-xl border text-center transition ${
                  theme.headerStyle === "gradient"
                    ? "border-blue-500 bg-blue-50/20 font-bold text-blue-900"
                    : "border-slate-100 hover:border-slate-200 text-slate-600"
                }`}
              >
                <div
                  className="w-full h-3 rounded-md mb-2 shadow-xs"
                  style={{
                    background: `linear-gradient(135deg, ${theme.primaryColor} 0%, #090d16 100%)`
                  }}
                />
                <span className="text-xs">Gradiente Moderno</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Interactive Live Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3 sticky top-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Pré-visualização em Tempo Real</h3>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                {theme.mode === "light" ? "Modo Claro" : theme.mode === "black" ? "Modo Black" : "Modo Black OLED"}
              </span>
            </div>

            {/* Simulated Desktop Preview Frame */}
            <div
              className={`rounded-2xl border overflow-hidden shadow-inner transition-colors duration-200 relative ${
                theme.mode === "light"
                  ? "bg-slate-100 border-slate-200"
                  : theme.mode === "black"
                    ? "bg-[#0b0f17] border-slate-800"
                    : "bg-black border-zinc-800"
              }`}
            >
              {/* Simulated Header */}
              <div
                className="px-3.5 py-2.5 text-white flex items-center justify-between shadow-xs transition-colors relative z-10"
                style={{ background: headerBgPreview }}
              >
                <div className="flex items-center gap-2">
                  {theme.logoUrl && theme.showLogoInHeader !== false ? (
                    <img
                      src={theme.logoUrl}
                      alt="Logo da Loja"
                      className="w-6 h-6 rounded-md object-contain bg-white/10 p-0.5 border border-white/20 shadow-2xs"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center font-bold text-xs">
                      M
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-extrabold leading-none">
                      {theme.companyName || "Minha Assistência.Tech"}
                    </p>
                    <p className="text-[8px] text-blue-200 font-semibold uppercase tracking-wider">Módulos Conectados</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[8px] bg-white/25 px-1.5 py-0.5 rounded font-bold uppercase text-white">
                    Administrador
                  </span>
                </div>
              </div>

              {/* Simulated Background Watermark (Center) */}
              {theme.logoUrl && theme.showLogoAsBackground !== false && (
                <div
                  className="absolute inset-0 pointer-events-none flex items-center justify-center z-0 overflow-hidden"
                  style={{ opacity: currentOpacity }}
                  aria-hidden="true"
                >
                  <img
                    src={theme.logoUrl}
                    alt="Marca d'água simulada"
                    className="max-w-[140px] max-h-[140px] w-3/4 h-auto object-contain select-none filter contrast-125"
                  />
                </div>
              )}

              {/* Simulated Content Area (Above Watermark) */}
              <div className="p-3.5 space-y-3 relative z-10">
                {/* Simulated Stats Row */}
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className={`p-2.5 rounded-xl border transition-colors ${
                      theme.mode === "light"
                        ? "bg-white border-slate-200"
                        : theme.mode === "black"
                          ? "bg-[#131b2a] border-slate-800"
                          : "bg-[#09090b] border-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Na Assistência</p>
                        <p className="text-xs font-black">2 aparelhos</p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-2.5 rounded-xl border transition-colors ${
                      theme.mode === "light"
                        ? "bg-white border-slate-200"
                        : theme.mode === "black"
                          ? "bg-[#131b2a] border-slate-800"
                          : "bg-[#09090b] border-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                        <CheckCircle className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Prontos</p>
                        <p className="text-xs font-black">4 ordens</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simulated Shortcut Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-colors ${
                      theme.mode === "light"
                        ? "bg-white border-slate-200"
                        : theme.mode === "black"
                          ? "bg-[#131b2a] border-slate-800"
                          : "bg-[#09090b] border-zinc-800"
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                      <PlusCircle className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-extrabold text-emerald-600">ENTRADA</span>
                  </div>

                  <div
                    className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-colors ${
                      theme.mode === "light"
                        ? "bg-white border-slate-200"
                        : theme.mode === "black"
                          ? "bg-[#131b2a] border-slate-800"
                          : "bg-[#09090b] border-zinc-800"
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-500 flex items-center justify-center">
                      <Hammer className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-extrabold text-blue-600">ATENDIMENTO</span>
                  </div>

                  <div
                    className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-colors ${
                      theme.mode === "light"
                        ? "bg-white border-slate-200"
                        : theme.mode === "black"
                          ? "bg-[#131b2a] border-slate-800"
                          : "bg-[#09090b] border-zinc-800"
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-red-500/20 text-red-500 flex items-center justify-center">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-extrabold text-red-600">SAÍDA</span>
                  </div>

                  <div
                    className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-colors ${
                      theme.mode === "light"
                        ? "bg-white border-slate-200"
                        : theme.mode === "black"
                          ? "bg-[#131b2a] border-slate-800"
                          : "bg-[#09090b] border-zinc-800"
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-500 flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-extrabold text-indigo-600">VENDAS</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Status overview chip */}
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start gap-2.5 text-[11px] text-slate-600">
              <ShieldCheck className="w-4 h-4 text-[#1E88E5] shrink-0 mt-0.5" />
              <span>
                {theme.logoUrl
                  ? `Logotipo ativo no ${theme.showLogoInHeader !== false ? 'cabeçalho' : ''} ${theme.showLogoAsBackground !== false ? 'e plano de fundo' : ''}.`
                  : "Nenhum logotipo configurado. Carregue sua imagem ao lado para personalizar o sistema."}
              </span>
            </div>

            <button
              onClick={handleSave}
              className="w-full py-3 bg-[#1E88E5] hover:bg-blue-600 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Configurações Salvas!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Aplicar & Salvar Configurações</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
