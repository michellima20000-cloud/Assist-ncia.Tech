import { ThemeConfig, ThemeMode } from "../types";

export const DEFAULT_THEME: ThemeConfig = {
  mode: "light",
  primaryColor: "#1E88E5",
  headerColor: "#1E88E5",
  headerStyle: "primary",
  cardContrast: "normal",
  companyName: "Minha Assistência.Tech",
  logoUrl: "",
  showLogoInHeader: true,
  showLogoAsBackground: true,
  backgroundLogoOpacity: 0.07
};

export const THEME_COLOR_PRESETS = [
  { name: "Azul Padrão", color: "#1E88E5", description: "Clássico Minha Assistência" },
  { name: "Black Ônix", color: "#111827", description: "Preto moderno e elegante" },
  { name: "Black Absoluto", color: "#000000", description: "Preto 100% puro para bancada" },
  { name: "Verde Esmeralda", color: "#059669", description: "Tecnologia e produtividade" },
  { name: "Roxo Cyber", color: "#7C3AED", description: "Vibrante e moderno" },
  { name: "Laranja Hardware", color: "#EA580C", description: "Energia para manutenção" },
  { name: "Vermelho Rubi", color: "#E11D48", description: "Foco e destaque" },
  { name: "Ciano Elétrico", color: "#0891B2", description: "Limpo e futurista" },
  { name: "Grafite Titânio", color: "#334155", description: "Sóbrio e profissional" },
];

export function getStoredTheme(): ThemeConfig {
  try {
    const raw = localStorage.getItem("tech_system_theme");
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        mode: parsed.mode || "light",
        primaryColor: parsed.primaryColor || "#1E88E5",
        headerColor: parsed.headerColor || parsed.primaryColor || "#1E88E5",
        headerStyle: parsed.headerStyle || "primary",
        cardContrast: parsed.cardContrast || "normal",
        companyName: parsed.companyName || "Minha Assistência.Tech",
        logoUrl: parsed.logoUrl || "",
        showLogoInHeader: parsed.showLogoInHeader !== undefined ? parsed.showLogoInHeader : true,
        showLogoAsBackground: parsed.showLogoAsBackground !== undefined ? parsed.showLogoAsBackground : true,
        backgroundLogoOpacity: typeof parsed.backgroundLogoOpacity === "number" ? parsed.backgroundLogoOpacity : 0.07
      };
    }
  } catch (e) {
    console.error("Erro ao carregar tema local:", e);
  }
  return DEFAULT_THEME;
}

export function applyThemeToDOM(theme: ThemeConfig) {
  const root = document.documentElement;
  const body = document.body;

  // Remove previous mode classes
  root.classList.remove("theme-black", "theme-pure-black");
  body.classList.remove("theme-black", "theme-pure-black");

  if (theme.mode === "black") {
    root.classList.add("theme-black");
    body.classList.add("theme-black");
  } else if (theme.mode === "pure_black") {
    root.classList.add("theme-pure-black");
    body.classList.add("theme-pure-black");
  }

  // Set CSS variables
  root.style.setProperty("--theme-primary", theme.primaryColor);
  root.style.setProperty("--theme-header", theme.headerColor);

  // Compute and set header background property
  let headerBg = theme.headerColor;
  if (theme.headerStyle === "black") {
    headerBg = theme.mode === "pure_black" ? "#000000" : "#111827";
  } else if (theme.headerStyle === "gradient") {
    headerBg = `linear-gradient(135deg, ${theme.headerColor} 0%, #0f172a 100%)`;
  }
  root.style.setProperty("--theme-header-bg", headerBg);

  // Set color-scheme meta tag if available
  root.style.colorScheme = theme.mode === "light" ? "light" : "dark";
}

export async function persistTheme(theme: ThemeConfig): Promise<ThemeConfig> {
  // Save locally first for instant UX
  try {
    localStorage.setItem("tech_system_theme", JSON.stringify(theme));
    applyThemeToDOM(theme);
  } catch (e) {
    console.error("Erro ao salvar tema localmente:", e);
  }

  // Persist to server config
  try {
    const res = await fetch("/api/config/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(theme)
    });
    if (res.ok) {
      const saved = await res.json();
      return saved;
    }
  } catch (err) {
    console.warn("Aviso: tema salvo localmente mas falhou ao sincronizar com servidor:", err);
  }

  return theme;
}

export function getHeaderBackground(theme: ThemeConfig): string {
  if (theme.headerStyle === "black") {
    return theme.mode === "pure_black" ? "#000000" : "#0d131f";
  }
  if (theme.headerStyle === "gradient") {
    return `linear-gradient(135deg, ${theme.headerColor} 0%, #090d16 100%)`;
  }
  return theme.headerColor || "#1E88E5";
}
