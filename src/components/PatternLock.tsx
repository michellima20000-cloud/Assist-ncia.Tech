import React, { useState, useRef, useCallback } from "react";

interface PatternLockProps {
  value: number[]; // Array of dot indices 0 to 8
  onChange?: (pattern: number[]) => void;
  readOnly?: boolean;
  size?: number; // Size in px
  className?: string;
  isPrint?: boolean;
}

// 3x3 Grid:
// 0  1  2
// 3  4  5
// 6  7  8

const DOT_COORDS = [
  { x: 30, y: 30 },  // 0
  { x: 100, y: 30 }, // 1
  { x: 170, y: 30 }, // 2
  { x: 30, y: 100 }, // 3
  { x: 100, y: 100 },// 4
  { x: 170, y: 100 },// 5
  { x: 30, y: 170 }, // 6
  { x: 100, y: 170 },// 7
  { x: 170, y: 170 } // 8
];

export default function PatternLock({
  value = [],
  onChange,
  readOnly = false,
  size = 180,
  className = "",
  isPrint = false
}: PatternLockProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const getDotFromPoint = useCallback((clientX: number, clientY: number): number | null => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 200;
    const y = ((clientY - rect.top) / rect.height) * 200;

    for (let i = 0; i < DOT_COORDS.length; i++) {
      const dot = DOT_COORDS[i];
      const dist = Math.hypot(dot.x - x, dot.y - y);
      if (dist < 22) {
        return i;
      }
    }
    return null;
  }, []);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly || !onChange) return;
    setIsDrawing(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const dot = getDotFromPoint(clientX, clientY);
    if (dot !== null) {
      onChange([dot]);
    } else {
      onChange([]);
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || readOnly || !onChange || !svgRef.current) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const rect = svgRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 200;
    const y = ((clientY - rect.top) / rect.height) * 200;
    setCurrentLine({ x, y });

    const dot = getDotFromPoint(clientX, clientY);
    if (dot !== null && !value.includes(dot)) {
      onChange([...value, dot]);
    }
  };

  const handleEnd = () => {
    setIsDrawing(false);
    setCurrentLine(null);
  };

  const handleDotClick = (dotIdx: number) => {
    if (readOnly || !onChange) return;
    if (value.includes(dotIdx)) {
      onChange(value.filter(i => i !== dotIdx));
    } else {
      onChange([...value, dotIdx]);
    }
  };

  const pathPoints = value.map(idx => DOT_COORDS[idx]);

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <svg
        ref={svgRef}
        viewBox="0 0 200 200"
        style={{ width: size, height: size }}
        className={`touch-none rounded-xl ${
          isPrint
            ? "bg-transparent border border-black"
            : "bg-slate-50 border border-slate-200 cursor-crosshair shadow-inner"
        }`}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      >
        {/* Drawn path lines */}
        {pathPoints.length > 1 && (
          <path
            d={pathPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`, "")}
            fill="none"
            stroke={isPrint ? "#000000" : "#6366f1"}
            strokeWidth={isPrint ? 4 : 5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Live rubber-band line while drawing */}
        {isDrawing && currentLine && pathPoints.length > 0 && !isPrint && (
          <line
            x1={pathPoints[pathPoints.length - 1].x}
            y1={pathPoints[pathPoints.length - 1].y}
            x2={currentLine.x}
            y2={currentLine.y}
            stroke="#818cf8"
            strokeWidth={3}
            strokeDasharray="4 4"
            strokeLinecap="round"
          />
        )}

        {/* 9 Circles / Dots */}
        {DOT_COORDS.map((dot, idx) => {
          const isSelected = value.includes(idx);
          const order = value.indexOf(idx);

          return (
            <g
              key={idx}
              className={readOnly ? "" : "cursor-pointer"}
              onClick={() => handleDotClick(idx)}
            >
              {/* Outer circle (matching paper form with big clean rings) */}
              <circle
                cx={dot.x}
                cy={dot.y}
                r={isPrint ? 14 : 16}
                fill={isSelected ? (isPrint ? "none" : "#e0e7ff") : (isPrint ? "#ffffff" : "#ffffff")}
                stroke={isPrint ? "#000000" : (isSelected ? "#4f46e5" : "#94a3b8")}
                strokeWidth={isPrint ? (isSelected ? 2.5 : 1.5) : (isSelected ? 2 : 1.5)}
              />

              {/* Center point / dot */}
              <circle
                cx={dot.x}
                cy={dot.y}
                r={isSelected ? (isPrint ? 6 : 6) : (isPrint ? 3.5 : 4)}
                fill={isPrint ? "#000000" : (isSelected ? "#4f46e5" : "#cbd5e1")}
              />

              {/* Order number badge if selected and not printing in blank mode */}
              {isSelected && !isPrint && (
                <text
                  x={dot.x + 12}
                  y={dot.y - 10}
                  fontSize={10}
                  fontWeight="bold"
                  fill="#4338ca"
                >
                  {order + 1}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Pattern sequence indicator & Clear button (hidden on print) */}
      {!isPrint && !readOnly && onChange && (
        <div className="flex items-center justify-between w-full mt-2 text-xs">
          <span className="text-slate-500 font-mono font-medium">
            {value.length > 0 ? (
              <span>Sequência: {value.map(v => v + 1).join(" → ")}</span>
            ) : (
              <span className="italic">Toque ou arraste os pontos</span>
            )}
          </span>
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px] font-semibold transition cursor-pointer"
            >
              Limpar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
