import React from "react";
import { 
  Crown, 
  Wrench, 
  Briefcase, 
  Shield, 
  Laptop, 
  Smartphone, 
  Zap, 
  Star, 
  Award, 
  User as UserIcon,
  CheckCircle2,
  Clock,
  Ban
} from "lucide-react";
import { User, UserRole } from "../types";

export interface RoleDef {
  key: UserRole;
  label: string;
  defaultIcon: string;
  defaultColor: string;
  description: string;
}

export const ROLE_OPTIONS: RoleDef[] = [
  {
    key: "admin",
    label: "Administrador Geral",
    defaultIcon: "crown",
    defaultColor: "purple",
    description: "Acesso total ao caixa, relatórios confidenciais, estoque e gestão de usuários."
  },
  {
    key: "gerente",
    label: "Gerente / Supervisor",
    defaultIcon: "shield",
    defaultColor: "indigo",
    description: "Gestão operacional, aprovação de orçamentos, estoque e relatórios de vendas."
  },
  {
    key: "tecnico",
    label: "Técnico Especialista",
    defaultIcon: "wrench",
    defaultColor: "blue",
    description: "Bancada técnica, laudos, execução de serviços, peças e status de reparos."
  },
  {
    key: "atendente",
    label: "Atendente / Recepção",
    defaultIcon: "briefcase",
    defaultColor: "emerald",
    description: "Atendimento no balcão, abertura de OS, agendamentos e entrega de aparelhos."
  },
  {
    key: "employee",
    label: "Funcionário Comum",
    defaultIcon: "user",
    defaultColor: "cyan",
    description: "Acesso básico para registrar ordens de serviço e visualizar andamentos."
  }
];

export const ICON_OPTIONS = [
  { id: "crown", label: "Coroa (Admin)", icon: Crown },
  { id: "shield", label: "Escudo (Gerente)", icon: Shield },
  { id: "wrench", label: "Chave (Técnico)", icon: Wrench },
  { id: "briefcase", label: "Maleta (Atendente)", icon: Briefcase },
  { id: "laptop", label: "Notebook / TI", icon: Laptop },
  { id: "smartphone", label: "Smartphone", icon: Smartphone },
  { id: "zap", label: "Raio (Rápido)", icon: Zap },
  { id: "star", label: "Estrela (Destaque)", icon: Star },
  { id: "award", label: "Medalha (Líder)", icon: Award },
  { id: "user", label: "Perfil Padrão", icon: UserIcon },
];

export const COLOR_OPTIONS = [
  { id: "purple", label: "Roxo Real", bgLight: "bg-purple-100 text-purple-700 border-purple-300", bgDark: "bg-purple-950/60 text-purple-300 border-purple-700/60", ring: "ring-purple-500" },
  { id: "blue", label: "Azul Técnico", bgLight: "bg-blue-100 text-blue-700 border-blue-300", bgDark: "bg-blue-950/60 text-blue-300 border-blue-700/60", ring: "ring-blue-500" },
  { id: "emerald", label: "Verde Esmeralda", bgLight: "bg-emerald-100 text-emerald-700 border-emerald-300", bgDark: "bg-emerald-950/60 text-emerald-300 border-emerald-700/60", ring: "ring-emerald-500" },
  { id: "indigo", label: "Índigo", bgLight: "bg-indigo-100 text-indigo-700 border-indigo-300", bgDark: "bg-indigo-950/60 text-indigo-300 border-indigo-700/60", ring: "ring-indigo-500" },
  { id: "amber", label: "Âmbar / Dourado", bgLight: "bg-amber-100 text-amber-800 border-amber-300", bgDark: "bg-amber-950/60 text-amber-300 border-amber-700/60", ring: "ring-amber-500" },
  { id: "rose", label: "Rosa / Carmim", bgLight: "bg-rose-100 text-rose-700 border-rose-300", bgDark: "bg-rose-950/60 text-rose-300 border-rose-700/60", ring: "ring-rose-500" },
  { id: "cyan", label: "Ciano Moderno", bgLight: "bg-cyan-100 text-cyan-800 border-cyan-300", bgDark: "bg-cyan-950/60 text-cyan-300 border-cyan-700/60", ring: "ring-cyan-500" },
];

export function getUserEffectiveStatus(user: Partial<User>): "ativo" | "pendente" | "inativo" {
  if (user.status) {
    if (user.status === "bloqueado") return "inativo";
    return user.status as any;
  }
  if (user.active === false) return "inativo";
  if (user.active === true) return "ativo";
  return "ativo";
}

export function getUserIconComponent(iconName?: string, role?: string) {
  const match = ICON_OPTIONS.find(i => i.id === iconName);
  if (match) return match.icon;
  if (role === "admin" || role === "superadmin") return Crown;
  if (role === "gerente") return Shield;
  if (role === "tecnico") return Wrench;
  if (role === "atendente") return Briefcase;
  return UserIcon;
}

export function getUserColorStyle(colorName?: string, role?: string) {
  const match = COLOR_OPTIONS.find(c => c.id === colorName);
  if (match) return match;
  if (role === "admin" || role === "superadmin") return COLOR_OPTIONS[0]; // purple
  if (role === "gerente") return COLOR_OPTIONS[3]; // indigo
  if (role === "tecnico") return COLOR_OPTIONS[1]; // blue
  if (role === "atendente") return COLOR_OPTIONS[2]; // emerald
  return COLOR_OPTIONS[6]; // cyan
}

export function getRoleLabel(role?: string): string {
  if (role === "admin" || role === "superadmin") return "Administrador Geral";
  if (role === "gerente") return "Gerente";
  if (role === "tecnico") return "Técnico";
  if (role === "atendente") return "Atendente";
  return "Funcionário";
}

interface UserAvatarBadgeProps {
  user: Partial<User>;
  size?: "sm" | "md" | "lg" | "xl";
  showStatusDot?: boolean;
  className?: string;
}

export function UserAvatarBadge({
  user,
  size = "md",
  showStatusDot = true,
  className = ""
}: UserAvatarBadgeProps) {
  const IconComp = getUserIconComponent(user.avatarIcon, user.role);
  const colorStyle = getUserColorStyle(user.avatarColor, user.role);
  const status = getUserEffectiveStatus(user);

  let sizeBox = "w-9 h-9 text-base";
  let iconSize = "w-4 h-4";
  let dotSize = "w-2.5 h-2.5";

  if (size === "sm") {
    sizeBox = "w-7 h-7 text-xs";
    iconSize = "w-3.5 h-3.5";
    dotSize = "w-2 h-2";
  } else if (size === "lg") {
    sizeBox = "w-12 h-12 text-lg";
    iconSize = "w-6 h-6";
    dotSize = "w-3 h-3";
  } else if (size === "xl") {
    sizeBox = "w-16 h-16 text-xl";
    iconSize = "w-8 h-8";
    dotSize = "w-4 h-4";
  }

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <div
        className={`${sizeBox} rounded-2xl border flex items-center justify-center font-bold transition-all shadow-sm ${colorStyle.bgLight} dark:${colorStyle.bgDark}`}
      >
        <IconComp className={iconSize} />
      </div>

      {showStatusDot && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 ${dotSize} rounded-full border-2 border-white dark:border-slate-900 ${
            status === "ativo"
              ? "bg-emerald-500"
              : status === "pendente"
              ? "bg-amber-400 animate-pulse"
              : "bg-rose-500"
          }`}
          title={
            status === "ativo"
              ? "Conta Ativa"
              : status === "pendente"
              ? "Pendente de Ativação"
              : "Conta Desativada / Bloqueada"
          }
        />
      )}
    </div>
  );
}

export function UserStatusBadge({ status }: { status: "ativo" | "pendente" | "inativo" }) {
  if (status === "ativo") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Ativo
      </span>
    );
  }

  if (status === "pendente") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
        <Clock className="w-3.5 h-3.5" />
        Pendente
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
      <Ban className="w-3.5 h-3.5" />
      Desativado
    </span>
  );
}
