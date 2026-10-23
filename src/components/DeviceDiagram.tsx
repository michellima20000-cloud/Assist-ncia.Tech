import React from "react";
import { DamageMark } from "../types";
import { X, Trash2 } from "lucide-react";

interface DeviceDiagramProps {
  damageMarks: DamageMark[];
  onChange?: (marks: DamageMark[]) => void;
  readOnly?: boolean;
  isPrint?: boolean;
  className?: string;
}

type ViewKey = "lado1" | "lado2" | "frente" | "traseira" | "superior" | "inferior";

export default function DeviceDiagram({
  damageMarks = [],
  onChange,
  readOnly = false,
  isPrint = false,
  className = ""
}: DeviceDiagramProps) {
  const handleSvgClick = (view: ViewKey, e: React.MouseEvent<SVGSVGElement>) => {
    if (readOnly || !onChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    // Check if clicked close to an existing mark (within 8%) to remove it
    const existingIndex = damageMarks.findIndex(
      m => m.view === view && Math.hypot(m.x - x, m.y - y) < 12
    );

    if (existingIndex >= 0) {
      const updated = [...damageMarks];
      updated.splice(existingIndex, 1);
      onChange(updated);
      return;
    }

    const newMark: DamageMark = {
      id: "dmg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      view,
      x,
      y,
      type: "outro",
      label: "Avaria"
    };
    onChange([...damageMarks, newMark]);
  };

  const removeMark = (id: string) => {
    if (readOnly || !onChange) return;
    onChange(damageMarks.filter(m => m.id !== id));
  };

  const renderMarksForView = (view: ViewKey) => {
    const marks = damageMarks.filter(m => m.view === view);
    return marks.map(m => (
      <g
        key={m.id}
        transform={`translate(${m.x}, ${m.y})`}
        className={readOnly ? "" : "cursor-pointer group"}
        onClick={e => {
          e.stopPropagation();
          removeMark(m.id);
        }}
      >
        <title>{m.label || "Clique para remover avaria"}</title>
        {/* Highlight circle in web view */}
        {!isPrint && (
          <circle
            cx="0"
            cy="0"
            r="7"
            fill="#ef4444"
            fillOpacity="0.25"
            className="group-hover:fill-opacity-50 transition"
          />
        )}
        {/* Bold X mark */}
        <line
          x1="-4.5"
          y1="-4.5"
          x2="4.5"
          y2="4.5"
          stroke={isPrint ? "#000000" : "#dc2626"}
          strokeWidth={isPrint ? 2.5 : 2.5}
          strokeLinecap="round"
        />
        <line
          x1="4.5"
          y1="-4.5"
          x2="-4.5"
          y2="4.5"
          stroke={isPrint ? "#000000" : "#dc2626"}
          strokeWidth={isPrint ? 2.5 : 2.5}
          strokeLinecap="round"
        />
      </g>
    ));
  };

  return (
    <div className={`flex flex-col select-none ${className}`}>
      {/* Title / Instruction matching user's paper */}
      <div className="text-center font-bold text-xs uppercase tracking-tight text-slate-800 mb-2 print:text-black">
        assinale com &quot;X&quot; os locais com possíveis avarias
      </div>

      {/* Grid of Views */}
      <div className="flex flex-col items-center gap-2">
        {/* Top & Bottom Profiles Row */}
        <div className="flex items-center justify-center gap-6 w-full">
          {/* SUPERIOR */}
          <div className="flex flex-col items-center">
            <svg
              viewBox="0 0 100 24"
              className={`w-28 h-7 ${!readOnly ? "cursor-crosshair hover:opacity-90" : ""}`}
              onClick={e => handleSvgClick("superior", e)}
            >
              {/* Outer Edge */}
              <rect
                x="4"
                y="3"
                width="92"
                height="18"
                rx="9"
                fill={isPrint ? "#ffffff" : "#f8fafc"}
                stroke="#000000"
                strokeWidth={isPrint ? "1.6" : "1.5"}
              />
              {/* Top mic hole */}
              <circle cx="50" cy="12" r="2" fill="#000000" />
              {/* Antenna lines */}
              <line x1="22" y1="3" x2="22" y2="21" stroke="#000000" strokeWidth="1" />
              <line x1="78" y1="3" x2="78" y2="21" stroke="#000000" strokeWidth="1" />
              {renderMarksForView("superior")}
            </svg>
            <span className="text-[10px] font-bold text-slate-700 print:text-black uppercase mt-0.5">
              SUPERIOR
            </span>
          </div>

          {/* INFERIOR */}
          <div className="flex flex-col items-center">
            <svg
              viewBox="0 0 100 24"
              className={`w-28 h-7 ${!readOnly ? "cursor-crosshair hover:opacity-90" : ""}`}
              onClick={e => handleSvgClick("inferior", e)}
            >
              {/* Outer Edge */}
              <rect
                x="4"
                y="3"
                width="92"
                height="18"
                rx="9"
                fill={isPrint ? "#ffffff" : "#f8fafc"}
                stroke="#000000"
                strokeWidth={isPrint ? "1.6" : "1.5"}
              />
              {/* USB-C connector */}
              <rect x="42" y="8" width="16" height="8" rx="3.5" fill="none" stroke="#000000" strokeWidth="1.2" />
              {/* Speaker grill dots */}
              <circle cx="28" cy="12" r="1.5" fill="#000000" />
              <circle cx="33" cy="12" r="1.5" fill="#000000" />
              <circle cx="67" cy="12" r="1.5" fill="#000000" />
              <circle cx="72" cy="12" r="1.5" fill="#000000" />
              {renderMarksForView("inferior")}
            </svg>
            <span className="text-[10px] font-bold text-slate-700 print:text-black uppercase mt-0.5">
              INFERIOR
            </span>
          </div>
        </div>

        {/* Middle Row: LADO 1, LADO 2, FRENTE, TRASEIRA */}
        <div className="flex items-end justify-center gap-3 sm:gap-4 w-full">
          {/* LADO 1 (Volume buttons) */}
          <div className="flex flex-col items-center">
            <svg
              viewBox="0 0 20 100"
              className={`w-6 h-36 ${!readOnly ? "cursor-crosshair hover:opacity-90" : ""}`}
              onClick={e => handleSvgClick("lado1", e)}
            >
              {/* Outer body side */}
              <rect
                x="5"
                y="4"
                width="10"
                height="92"
                rx="4"
                fill={isPrint ? "#ffffff" : "#f8fafc"}
                stroke="#000000"
                strokeWidth={isPrint ? "1.6" : "1.5"}
              />
              {/* Volume Buttons on left */}
              <rect x="1" y="24" width="4" height="14" rx="1" fill="#000000" />
              <rect x="1" y="42" width="4" height="14" rx="1" fill="#000000" />
              {renderMarksForView("lado1")}
            </svg>
            <span className="text-[9px] font-bold text-slate-700 print:text-black uppercase mt-1">
              LADO 1
            </span>
          </div>

          {/* LADO 2 (Power button) */}
          <div className="flex flex-col items-center">
            <svg
              viewBox="0 0 20 100"
              className={`w-6 h-36 ${!readOnly ? "cursor-crosshair hover:opacity-90" : ""}`}
              onClick={e => handleSvgClick("lado2", e)}
            >
              {/* Outer body side */}
              <rect
                x="5"
                y="4"
                width="10"
                height="92"
                rx="4"
                fill={isPrint ? "#ffffff" : "#f8fafc"}
                stroke="#000000"
                strokeWidth={isPrint ? "1.6" : "1.5"}
              />
              {/* Power Button on right */}
              <rect x="15" y="32" width="4" height="18" rx="1" fill="#000000" />
              {renderMarksForView("lado2")}
            </svg>
            <span className="text-[9px] font-bold text-slate-700 print:text-black uppercase mt-1">
              LADO 2
            </span>
          </div>

          {/* FRENTE (Screen / Display) */}
          <div className="flex flex-col items-center">
            <svg
              viewBox="0 0 100 150"
              className={`w-28 h-40 ${!readOnly ? "cursor-crosshair hover:opacity-90" : ""}`}
              onClick={e => handleSvgClick("frente", e)}
            >
              {/* Phone Outer Shell */}
              <rect
                x="6"
                y="4"
                width="88"
                height="142"
                rx="14"
                fill={isPrint ? "#ffffff" : "#f8fafc"}
                stroke="#000000"
                strokeWidth={isPrint ? "1.8" : "1.6"}
              />
              {/* Inner Screen Bezel */}
              <rect
                x="12"
                y="14"
                width="76"
                height="122"
                rx="6"
                fill="none"
                stroke="#000000"
                strokeWidth="1.2"
              />
              {/* Top Speaker / Ear Piece */}
              <rect x="40" y="8" width="20" height="2.5" rx="1.2" fill="#000000" />
              {/* Front Camera notch */}
              <circle cx="50" cy="19" r="2.2" fill="#000000" />
              {/* Bottom Home / Touch Indicator */}
              <circle cx="50" cy="141" r="2.5" fill="none" stroke="#000000" strokeWidth="1" />
              {renderMarksForView("frente")}
            </svg>
            <span className="text-[10px] font-bold text-slate-700 print:text-black uppercase mt-1">
              FRENTE
            </span>
          </div>

          {/* TRASEIRA (Back Cover / Camera) */}
          <div className="flex flex-col items-center">
            <svg
              viewBox="0 0 100 150"
              className={`w-28 h-40 ${!readOnly ? "cursor-crosshair hover:opacity-90" : ""}`}
              onClick={e => handleSvgClick("traseira", e)}
            >
              {/* Phone Outer Shell */}
              <rect
                x="6"
                y="4"
                width="88"
                height="142"
                rx="14"
                fill={isPrint ? "#ffffff" : "#f8fafc"}
                stroke="#000000"
                strokeWidth={isPrint ? "1.8" : "1.6"}
              />
              {/* Camera Island Box */}
              <rect
                x="14"
                y="12"
                width="30"
                height="34"
                rx="7"
                fill="none"
                stroke="#000000"
                strokeWidth="1.4"
              />
              {/* Lens 1 */}
              <circle cx="24" cy="22" r="5" fill="none" stroke="#000000" strokeWidth="1.2" />
              <circle cx="24" cy="22" r="2" fill="#000000" />
              {/* Lens 2 */}
              <circle cx="24" cy="36" r="5" fill="none" stroke="#000000" strokeWidth="1.2" />
              <circle cx="24" cy="36" r="2" fill="#000000" />
              {/* Flash */}
              <circle cx="36" cy="29" r="2.5" fill="none" stroke="#000000" strokeWidth="1" />
              {/* Logo / Brand center mark */}
              <circle cx="50" cy="80" r="4" fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {renderMarksForView("traseira")}
            </svg>
            <span className="text-[10px] font-bold text-slate-700 print:text-black uppercase mt-1">
              TRASEIRA
            </span>
          </div>
        </div>
      </div>

      {/* Summary of marked damages (hidden in print) */}
      {!isPrint && !readOnly && damageMarks.length > 0 && (
        <div className="mt-3 bg-red-50/70 border border-red-200 rounded-xl p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-red-800">
              {damageMarks.length} avaria(s) assinalada(s):
            </span>
            <button
              type="button"
              onClick={() => onChange && onChange([])}
              className="text-[11px] font-semibold text-red-600 hover:text-red-800 transition"
            >
              Limpar todas
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {damageMarks.map(m => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-red-200 text-red-700 rounded-lg text-[11px] font-medium"
              >
                <span className="font-bold uppercase text-[10px]">{m.view}</span>: (X)
                <button
                  type="button"
                  onClick={() => removeMark(m.id)}
                  className="hover:text-red-900 transition ml-0.5"
                  title="Remover"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
