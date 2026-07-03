import React, { useState } from "react";
import { LogIn, Key, Mail, ShieldAlert, UserPlus, LogIn as LogInIcon, Copy, Check, ExternalLink } from "lucide-react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup 
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { User } from "../types";

interface LoginProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDomainError, setIsDomainError] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);

  const handleCopy = (domain: string) => {
    navigator.clipboard.writeText(domain);
    setCopiedDomain(domain);
    setTimeout(() => setCopiedDomain(null), 2000);
  };

  const translateError = (code: string) => {
    switch (code) {
      case "auth/invalid-credential":
        return "E-mail ou senha incorretos.";
      case "auth/invalid-email":
        return "E-mail inválido.";
      case "auth/user-disabled":
        return "Este usuário foi desativado.";
      case "auth/user-not-found":
        return "Usuário não encontrado.";
      case "auth/wrong-password":
        return "Senha incorreta.";
      case "auth/email-already-in-use":
        return "Este e-mail já está em uso.";
      case "auth/weak-password":
        return "A senha deve ter pelo menos 6 caracteres.";
      case "auth/popup-blocked":
        return "O popup de login foi bloqueado pelo navegador.";
      case "auth/popup-closed-by-user":
        return "O popup de login foi fechado antes da conclusão.";
      case "auth/unauthorized-domain":
        return "Domínio Não Autorizado no Firebase!\n\nPara corrigir isso e permitir o login com o Google, você precisa autorizar os domínios desta aplicação no seu console do Firebase:\n\n1. Acesse o Console do Firebase.\n2. Vá em 'Autenticação' (Authentication) -> aba 'Configurações' (Settings) -> seção 'Domínios autorizados' (Authorized domains).\n3. Clique em 'Adicionar domínio' e adicione os seguintes endereços:\n   • assist-ncia-tech.vercel.app\n   • ais-dev-3juews5vwpb63yyq5fou6i-408064427062.us-east1.run.app\n   • ais-pre-3juews5vwpb63yyq5fou6i-408064427062.us-east1.run.app";
      default:
        return "Ocorreu um erro ao autenticar. Tente novamente.";
    }
  };

  const handleBackendSession = async (firebaseUser: any) => {
    const response = await fetch("/api/auth/firebase-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email?.split("@")[0],
        uid: firebaseUser.uid
      }),
    });

    let data: any = {};
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    }

    if (!response.ok) {
      throw new Error(data.message || data.error || `Erro de sincronização (status ${response.status})`);
    }

    onLoginSuccess(data.user, data.token);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsDomainError(false);
    setLoading(true);

    try {
      let userCredential;
      if (isRegistering) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }

      await handleBackendSession(userCredential.user);
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === "auth/unauthorized-domain") {
        setIsDomainError(true);
      }
      const friendlyMsg = translateError(err.code);
      const rawDetail = err.code ? `[${err.code}] ${err.message}` : err.message || String(err);
      setError(`${friendlyMsg}\n\nDetalhe Técnico: ${rawDetail}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setIsDomainError(false);
    setLoading(true);

    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      await handleBackendSession(userCredential.user);
    } catch (err: any) {
      console.error("Google Auth error:", err);
      if (err.code === "auth/unauthorized-domain") {
        setIsDomainError(true);
      }
      const friendlyMsg = translateError(err.code);
      const rawDetail = err.code ? `[${err.code}] ${err.message}` : err.message || String(err);
      setError(`${friendlyMsg}\n\nDetalhe Técnico: ${rawDetail}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-[#1E88E5] p-8 text-white text-center">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold font-sans tracking-tight">Minha Assistência</h1>
          <p className="text-blue-100 text-sm mt-1">Gestão de Assistências Técnicas & Eletrônicos</p>
        </div>

        {/* Form Body */}
        <div className="p-8">
          {error && (
            isDomainError ? (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-amber-800 text-sm font-bold">Domínio Não Autorizado no Firebase</p>
                    <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                      Como você está usando o login com o Google da sua própria conta do Firebase, é necessário autorizar os domínios desta aplicação no seu console.
                    </p>
                  </div>
                </div>

                <div className="border-t border-amber-100 my-1"></div>

                <div className="space-y-3">
                  <p className="text-amber-900 text-xs font-semibold">Passo a Passo para resolver:</p>
                  <ol className="text-amber-800 text-xs space-y-1.5 list-decimal pl-4 leading-normal">
                    <li>Acesse o <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline font-bold inline-flex items-center gap-0.5 hover:text-amber-950">Console do Firebase <ExternalLink className="w-3 h-3 inline" /></a></li>
                    <li>Vá em <strong>Autenticação (Authentication)</strong> → aba <strong>Configurações (Settings)</strong> → seção <strong>Domínios autorizados (Authorized domains)</strong>.</li>
                    <li>Clique em <strong>Adicionar domínio</strong> e adicione os seguintes endereços:</li>
                  </ol>

                  <div className="space-y-2 mt-2">
                    {[
                      "assist-ncia-tech.vercel.app",
                      "ais-dev-3juews5vwpb63yyq5fou6i-408064427062.us-east1.run.app",
                      "ais-pre-3juews5vwpb63yyq5fou6i-408064427062.us-east1.run.app",
                      window.location.hostname
                    ].filter((v, i, self) => self.indexOf(v) === i && v && v !== "localhost").map((domain) => (
                      <div key={domain} className="flex items-center justify-between bg-white border border-amber-100 rounded-lg p-2 pl-3 gap-2">
                        <code className="text-[10px] text-slate-700 select-all font-mono truncate">{domain}</code>
                        <button
                          type="button"
                          onClick={() => handleCopy(domain)}
                          className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded transition shrink-0 cursor-pointer flex items-center gap-1 text-[10px]"
                        >
                          {copiedDomain === domain ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-green-500" />
                              <span className="text-green-600 font-medium">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-red-800 text-sm font-medium">Erro de Acesso</p>
                  <p className="text-red-600 text-[11px] mt-1 whitespace-pre-wrap leading-relaxed">{error}</p>
                </div>
              </div>
            )
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                E-mail de Acesso
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E88E5] focus:bg-white transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Senha
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-5 h-5" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E88E5] focus:bg-white transition-all duration-200"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1E88E5] hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-md shadow-blue-100 disabled:opacity-70 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {isRegistering ? <UserPlus className="w-5 h-5" /> : <LogInIcon className="w-5 h-5" />}
                  <span>{isRegistering ? "Cadastrar e Entrar" : "Entrar no Sistema"}</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-semibold tracking-wider">ou</span>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium py-3 px-4 rounded-xl shadow-sm transition-all text-sm disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.85 2.99c.92-2.76 3.51-4.51 6.76-4.51z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.48-1.12 2.73-2.38 3.58l3.7 2.87c2.16-1.99 3.43-4.92 3.43-8.55z"
              />
              <path
                fill="#FBBC05"
                d="M5.24 14.81c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29L1.39 7.24C.51 9 0 10.94 0 13c0 2.06.51 4 1.39 5.76l3.85-2.95z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.7-2.87c-1.03.69-2.35 1.1-4.23 1.1-3.25 0-5.84-1.75-6.76-4.51L1.39 16.76C3.37 20.33 7.35 23 12 23z"
              />
            </svg>
            <span>Entrar com o Google</span>
          </button>

          {/* Iframe tip */}
          <p className="text-[10px] text-slate-400 mt-4 text-center leading-normal">
            💡 <strong>Dica:</strong> Se o login com o Google não abrir, clique em <strong>"Abrir em nova aba"</strong> no canto superior direito para permitir popups, ou use o formulário de <strong>E-mail/Senha</strong>.
          </p>

          {/* Toggle Register/Login */}
          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-xs font-semibold text-[#1E88E5] hover:text-blue-700 hover:underline transition cursor-pointer"
            >
              {isRegistering
                ? "Já tem uma conta? Entrar no sistema"
                : "Ainda não tem conta? Cadastre-se"}
            </button>
          </div>

          {/* Info box explaining Administrator vs Employee module */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">💡 Nível de Permissões Integrado</h4>
            <div className="text-[11px] text-slate-500 space-y-2 leading-relaxed text-left bg-slate-50 p-3.5 rounded-xl border border-slate-150/50">
              <p>
                <strong>💼 Administrador:</strong> Acesso total a gráficos de caixa, faturamento consolidado, controle de despesas e gerenciamento de funcionários.
              </p>
              <p>
                <strong>🔧 Funcionário comum:</strong> Acesso para registrar Ordens de Serviço (Entrada/Saída/Garantias), andamento na bancada e agendamentos. Valores consolidados confidenciais permanecem protegidos e ocultos do caixa.
              </p>
              <p className="text-[10px] text-slate-400 italic mt-1 border-t border-slate-150/30 pt-1">
                * Para testar, logue com sua conta e vá em <strong>ADMIN &rarr; Funcionários</strong> para criar contas de atendentes e técnicos, ou ajustar níveis de acesso de usuários já cadastrados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
