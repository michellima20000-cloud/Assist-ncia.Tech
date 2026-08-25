import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  limit 
} from "firebase/firestore";
import { db } from "./firebase";
import firebaseConfig from "../../firebase-applet-config.json";

function convertFromFirestore(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (obj && typeof obj.toDate === "function") {
    return obj.toDate().toISOString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertFromFirestore(item));
  }
  
  if (typeof obj === "object") {
    if (obj._seconds !== undefined && obj._nanoseconds !== undefined) {
      return new Date(obj._seconds * 1000).toISOString();
    }
    if (obj.seconds !== undefined && obj.nanoseconds !== undefined) {
      return new Date(obj.seconds * 1000).toISOString();
    }
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = convertFromFirestore(obj[key]);
    }
    return result;
  }
  
  return obj;
}

function getDocData(docSnap: any): any {
  if (!docSnap || !docSnap.exists()) return null;
  return {
    id: docSnap.id,
    ...convertFromFirestore(docSnap.data())
  };
}

function getDocsData(snap: any): any[] {
  if (!snap || !snap.docs) return [];
  return snap.docs.map((d: any) => ({
    id: d.id,
    ...convertFromFirestore(d.data())
  }));
}

function getTargetUserId(init?: RequestInit, urlObj?: URL): string {
  let uid = "";
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      uid = init.headers.get("x-user-id") || init.headers.get("X-User-Id") || "";
      if (!uid) {
        const auth = init.headers.get("Authorization") || init.headers.get("authorization") || "";
        if (auth.startsWith("Bearer fb-session-token-")) uid = auth.replace("Bearer fb-session-token-", "").trim();
        else if (auth.startsWith("Bearer mock-session-token-")) uid = auth.replace("Bearer mock-session-token-", "").trim();
        else if (auth.startsWith("Bearer ")) uid = auth.replace("Bearer ", "").trim();
      }
    } else if (typeof init.headers === "object") {
      const h = init.headers as any;
      uid = h["x-user-id"] || h["X-User-Id"] || "";
      if (!uid && h["Authorization"]) {
        const auth = h["Authorization"];
        if (auth.startsWith("Bearer fb-session-token-")) uid = auth.replace("Bearer fb-session-token-", "").trim();
        else if (auth.startsWith("Bearer mock-session-token-")) uid = auth.replace("Bearer mock-session-token-", "").trim();
        else if (auth.startsWith("Bearer ")) uid = auth.replace("Bearer ", "").trim();
      }
    }
  }

  if (!uid && urlObj) {
    uid = urlObj.searchParams.get("userId") || urlObj.searchParams.get("uid") || "";
  }

  if (!uid) {
    try {
      const savedUser = localStorage.getItem("user_session");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        uid = parsed?.id || parsed?.uid || "";
      }
    } catch (e) {}
  }

  return uid || "default";
}

const clientSeededUsers = new Set<string>();

async function checkAndSeedUserClient(userId: string) {
  if (!userId || clientSeededUsers.has(userId)) return;

  try {
    const configRef = doc(db, "users", userId, "config", "main");
    const configSnap = await getDoc(configRef);
    if (configSnap.exists()) {
      clientSeededUsers.add(userId);
      return;
    }

    await setDoc(configRef, {
      nextControlNumber: 1,
      printerConfigured: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userId
    });

    const defaultData: { [key: string]: any[] } = {
      itens: [
        { id: "item-1", name: "Celular" },
        { id: "item-2", name: "Notebook" },
        { id: "item-3", name: "Tablet" },
        { id: "item-4", name: "Televisor" },
        { id: "item-5", name: "Console de Videogame" },
        { id: "item-6", name: "Smartwatch" },
        { id: "item-7", name: "Monitor" },
        { id: "item-8", name: "Caixa de Som Bluetooth" }
      ],
      marcas: [
        { id: "marca-1", name: "Samsung" },
        { id: "marca-2", name: "Apple" },
        { id: "marca-3", name: "Motorola" },
        { id: "marca-4", name: "Xiaomi" },
        { id: "marca-5", name: "LG" },
        { id: "marca-6", name: "Dell" },
        { id: "marca-7", name: "Lenovo" },
        { id: "marca-8", name: "Asus" },
        { id: "marca-9", name: "Acer" },
        { id: "marca-10", name: "JBL" }
      ],
      servicos: [
        { id: "srv-1", name: "Troca de Tela / Display", price: 280.00, position: 1 },
        { id: "srv-2", name: "Troca de Bateria", price: 140.00, position: 2 },
        { id: "srv-3", name: "Desoxidação / Limpeza Química", price: 180.00, position: 3 },
        { id: "srv-4", name: "Reparo de Conector de Carga", price: 120.00, position: 4 },
        { id: "srv-5", name: "Formatação e Reinstalação de OS", price: 90.00, position: 5 },
        { id: "srv-6", name: "Reparo de Placa-Mãe / Solda BGA", price: 450.00, position: 6 },
        { id: "srv-7", name: "Limpeza Física + Pasta Térmica", price: 150.00, position: 7 },
        { id: "srv-8", name: "Recuperação de Carcaça/Dobradiça", price: 200.00, position: 8 }
      ],
      produtos: [
        { id: "prod-1", name: "Película de Vidro 3D", price: 30.00, cost: 8.00, stock: 85, category: "Películas", code: "PEL-3D", position: 1 },
        { id: "prod-2", name: "Carregador Turbo 20W USB-C", price: 75.00, cost: 22.00, stock: 40, category: "Carregadores", code: "CAR-20W", position: 2 },
        { id: "prod-3", name: "Cabo Reforçado USB-C 1.5m", price: 45.00, cost: 12.00, stock: 60, category: "Cabos", code: "CAB-USBC", position: 3 },
        { id: "prod-4", name: "Bateria Compatível iPhone 11", price: 190.00, cost: 70.00, stock: 15, category: "Baterias", code: "BAT-IPH11", position: 4 },
        { id: "prod-5", name: "SSD SATA III 480GB", price: 260.00, cost: 130.00, stock: 20, category: "Armazenamento", code: "SSD-480GB", position: 5 },
        { id: "prod-6", name: "Fone de Ouvido com Fio Stereo", price: 35.00, cost: 10.00, stock: 35, category: "Acessórios", code: "FON-STEREO", position: 6 }
      ],
      convenios: [
        { id: "conv-1", name: "Sem Convênio (Padrão)", discountPercent: 0 },
        { id: "conv-2", name: "Parceria Empresa (10% de Desconto)", discountPercent: 10 },
        { id: "conv-3", name: "Cliente VIP / Frequente (15% de Desconto)", discountPercent: 15 },
        { id: "conv-4", name: "Desconto Amigo (20% de Desconto)", discountPercent: 20 }
      ],
      clientes: [
        { id: "cli-1", name: "José de Souza", phone: "(11) 99999-8888", cpf: "111.222.333-44", email: "jose.souza@gmail.com", address: "Av. Paulista, 1000", city: "São Paulo", notes: "Cliente antigo." },
        { id: "cli-2", name: "Maria Helena Silva", phone: "(21) 98888-7777", cpf: "222.333.444-55", email: "maria.silva@hotmail.com", address: "Rua Copacabana, 500", city: "Rio de Janeiro", notes: "Contato por WhatsApp." },
        { id: "cli-3", name: "Carlos Eduardo Santos", phone: "(31) 97777-6666", cpf: "333.444.555-66", email: "cadu.santos@yahoo.com.br", address: "Av. Afonso Pena, 1200", city: "Belo Horizonte", notes: "Sempre pede desconto." }
      ]
    };

    for (const [colName, items] of Object.entries(defaultData)) {
      for (const item of items) {
        await setDoc(doc(db, "users", userId, colName, item.id), {
          ...item,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: userId
        });
      }
    }

    await setDoc(doc(db, "users", userId, "config", "feedback"), {
      enabled: true,
      delayHours: 3,
      messageTemplate: "Olá, {cliente}! Tudo bem? Passando para saber se deu tudo certo com o seu {aparelho} ({marca} {modelo}). O que você achou do nosso atendimento e da manutenção? Seu feedback é muito importante para nós! 👇",
      readyMessageTemplate: "Olá, {cliente}! O seu aparelho ({aparelho} {marca} {modelo}) sob OS número {numero_os} já está PRONTO para retirada em nossa assistência!\n\nValor total do serviço: R$ {valor}.\n\nEstamos te aguardando!",
      entryMessageTemplate: "Olá, {cliente}! Recebemos o seu aparelho ({aparelho} {marca} {modelo}) em nossa assistência técnica sob a OS número {numero_os}.\n\nVocê pode acompanhar o andamento do serviço diretamente conosco. Obrigado pela preferência!",
      googleReviewUrl: ""
    });

    await setDoc(doc(db, "users", userId, "config", "status"), {
      list: [
        "Aguardando técnico",
        "Em avaliação",
        "Aguardando aprovação do cliente",
        "Aprovado pelo cliente",
        "Reprovado pelo cliente",
        "Em manutenção",
        "Pronto para entrega",
        "Aguardando peça(s)",
        "Peça(s) na assistência",
        "Aguardando pagamento",
        "Sem conserto",
        "Não reclamado/Abandonado"
      ]
    });

    clientSeededUsers.add(userId);
  } catch (err) {
    console.error("Client seeding error:", err);
  }
}

export async function handleClientRoute(url: string, init?: RequestInit): Promise<Response> {
  try {
    const urlObj = new URL(url, window.location.origin);
    const path = urlObj.pathname;
    const method = init?.method?.toUpperCase() || "GET";
    const userId = getTargetUserId(init, urlObj);
    
    await checkAndSeedUserClient(userId);

    let body: any = {};
    if (init?.body && typeof init.body === "string") {
      try {
        body = JSON.parse(init.body);
      } catch (e) {
        console.warn("Could not parse request body in client router:", e);
      }
    }

    // 1. Firebase Config route
    if (path === "/api/config/firebase") {
      return new Response(JSON.stringify(firebaseConfig), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 1.1 Config Feedback route
    if (path === "/api/config/feedback") {
      if (method === "GET") {
        const docRef = doc(db, "users", userId, "config", "feedback");
        const docSnap = await getDoc(docRef);
        let config = docSnap.exists() ? docSnap.data() : null;
        if (!config) {
          config = {
            enabled: true,
            delayHours: 3,
            messageTemplate: "Olá, {cliente}! Tudo bem? Passando para saber se deu tudo certo com o seu {aparelho} ({marca} {modelo}). O que você achou do nosso atendimento e da manutenção? Seu feedback é muito importante para nós! 👇",
            readyMessageTemplate: "Olá, {cliente}! O seu aparelho ({aparelho} {marca} {modelo}) sob OS número {numero_os} já está PRONTO para retirada em nossa assistência!\n\nValor total do serviço: R$ {valor}.\n\nEstamos te aguardando!",
            entryMessageTemplate: "Olá, {cliente}! Recebemos o seu aparelho ({aparelho} {marca} {modelo}) em nossa assistência técnica sob a OS número {numero_os}.\n\nVocê pode acompanhar o andamento do serviço diretamente conosco. Obrigado pela preferência!",
            googleReviewUrl: ""
          };
        } else {
          if (!config.readyMessageTemplate) {
            config.readyMessageTemplate = "Olá, {cliente}! O seu aparelho ({aparelho} {marca} {modelo}) sob OS número {numero_os} já está PRONTO para retirada em nossa assistência!\n\nValor total do serviço: R$ {valor}.\n\nEstamos te aguardando!";
          }
          if (!config.entryMessageTemplate) {
            config.entryMessageTemplate = "Olá, {cliente}! Recebemos o seu aparelho ({aparelho} {marca} {modelo}) em nossa assistência técnica sob a OS número {numero_os}.\n\nVocê pode acompanhar o andamento do serviço diretamente conosco. Obrigado pela preferência!";
          }
        }
        return new Response(JSON.stringify(config), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (method === "POST") {
        const config = {
          enabled: body.enabled !== undefined ? !!body.enabled : true,
          delayHours: Number(body.delayHours) >= 0 ? Number(body.delayHours) : 3,
          messageTemplate: body.messageTemplate || "",
          readyMessageTemplate: body.readyMessageTemplate || "Olá, {cliente}! O seu aparelho ({aparelho} {marca} {modelo}) sob OS número {numero_os} já está PRONTO para retirada em nossa assistência!\n\nValor total do serviço: R$ {valor}.\n\nEstamos te aguardando!",
          entryMessageTemplate: body.entryMessageTemplate || "Olá, {cliente}! Recebemos o seu aparelho ({aparelho} {marca} {modelo}) em nossa assistência técnica sob a OS número {numero_os}.\n\nVocê pode acompanhar o andamento do serviço diretamente conosco. Obrigado pela preferência!",
          googleReviewUrl: body.googleReviewUrl || ""
        };
        await setDoc(doc(db, "users", userId, "config", "feedback"), config);
        return new Response(JSON.stringify(config), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 1.2 Dedicated Feedbacks REST & Sync
    if (path === "/api/feedbacks/sync" && method === "POST") {
      const [atSnap, fbSnap, vendSnap, cliSnap] = await Promise.all([
        getDocs(collection(db, "users", userId, "atendimentos")),
        getDocs(collection(db, "users", userId, "feedbacks")),
        getDocs(collection(db, "users", userId, "vendas")),
        getDocs(collection(db, "users", userId, "clientes"))
      ]);

      const atendimentos = getDocsData(atSnap);
      const feedbacks = getDocsData(fbSnap);
      const vendas = getDocsData(vendSnap);
      const clientes = getDocsData(cliSnap);

      const cfgSnap = await getDoc(doc(db, "users", userId, "config", "feedback"));
      const cfg = cfgSnap.exists() ? cfgSnap.data() : {
        enabled: true,
        delayHours: 3,
        messageTemplate: "Olá, {cliente}! Tudo bem? Passando para saber se deu tudo certo com o seu {aparelho} ({marca} {modelo}). O que você achou do nosso atendimento e da manutenção? Seu feedback é muito importante para nós! 👇",
        googleReviewUrl: ""
      };

      const existingAtIds = new Set(feedbacks.map(f => f.atendimentoId).filter(Boolean));
      const existingVendIds = new Set(feedbacks.map(f => f.vendaId).filter(Boolean));

      let syncedCount = 0;
      const finalizedAts = atendimentos.filter(a => 
        a.status === "finalizado" || 
        a.detailedStatus === "Pronto para entrega" || 
        a.detailedStatus === "Entregue / Finalizado"
      );

      for (const at of finalizedAts) {
        if (!existingAtIds.has(at.id)) {
          let clientName = "Cliente";
          let clientPhone = "";
          const foundCli = clientes.find(c => c.id === at.clienteId || (c.name && at.clienteId && c.name.toLowerCase() === String(at.clienteId).toLowerCase()));
          if (foundCli) {
            clientName = foundCli.name || clientName;
            clientPhone = foundCli.phone || clientPhone;
          }

          const delayHours = Number(cfg.delayHours) >= 0 ? Number(cfg.delayHours) : 3;
          const scheduledTime = new Date(Date.now() + delayHours * 3600000).toISOString();
          const valorFmt = Number(at.totalAmount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          
          let msg = cfg.messageTemplate || "Olá, {cliente}! Tudo bem? Passando para saber se deu tudo certo com o seu {aparelho} ({marca} {modelo}). O que você achou do nosso atendimento e da manutenção? Seu feedback é muito importante para nós! 👇";
          msg = msg
            .replace(/{cliente}/g, clientName)
            .replace(/{aparelho}/g, at.item || "aparelho")
            .replace(/{marca}/g, at.brand || "")
            .replace(/{modelo}/g, at.model || "")
            .replace(/{numero_os}/g, at.controlNumber || "")
            .replace(/{valor}/g, valorFmt);

          const fbId = "fb-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
          const newFb = {
            id: fbId,
            clienteId: at.clienteId || "",
            clienteName: clientName,
            clientePhone: clientPhone,
            atendimentoId: at.id,
            controlNumber: at.controlNumber || "",
            item: at.item || "",
            brand: at.brand || "",
            model: at.model || "",
            scheduledTime,
            status: "pending",
            messageText: msg,
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(db, "users", userId, "feedbacks", fbId), newFb);
          syncedCount++;
          existingAtIds.add(at.id);
        }
      }

      for (const v of vendas.filter(v => v.status !== "estornada" && v.clienteName && v.clienteName !== "Consumidor Final")) {
        if (!existingVendIds.has(v.id)) {
          let clientPhone = "";
          const foundCli = clientes.find(c => c.id === v.clienteId || (c.name && v.clienteName && c.name.toLowerCase() === v.clienteName.toLowerCase()));
          if (foundCli) clientPhone = foundCli.phone || "";

          const delayHours = Number(cfg.delayHours) >= 0 ? Number(cfg.delayHours) : 3;
          const scheduledTime = new Date(Date.now() + delayHours * 3600000).toISOString();
          const itemsSummary = (v.items || []).map((i: any) => `${i.name} (x${i.quantity})`).join(", ");

          const msg = `Olá, ${v.clienteName}! Tudo bem? Passando para agradecer sua compra (${itemsSummary}) em nossa loja! O que você achou dos produtos e do nosso atendimento? Seu feedback é muito importante para nós! 👇`;

          const fbId = "fb-venda-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
          const newFb = {
            id: fbId,
            clienteId: v.clienteId || "",
            clienteName: v.clienteName,
            clientePhone: clientPhone,
            vendaId: v.id,
            controlNumber: `Venda #${v.id.slice(-6)}`,
            item: itemsSummary || "Compra na Loja",
            brand: "",
            model: "",
            scheduledTime,
            status: "pending",
            messageText: msg,
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(db, "users", userId, "feedbacks", fbId), newFb);
          syncedCount++;
          existingVendIds.add(v.id);
        }
      }

      const updatedFbSnap = await getDocs(collection(db, "users", userId, "feedbacks"));
      const updatedList = getDocsData(updatedFbSnap).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      return new Response(JSON.stringify({
        success: true,
        syncedCount,
        totalFeedbacks: updatedList.length,
        feedbacks: updatedList
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (path === "/api/feedbacks" && method === "GET") {
      const snap = await getDocs(collection(db, "users", userId, "feedbacks"));
      const list = getDocsData(snap).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return new Response(JSON.stringify(list), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (path === "/api/feedbacks" && method === "POST") {
      const fbId = "fb-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
      const newFeedback = {
        id: fbId,
        clienteId: body.clienteId || "",
        clienteName: body.clienteName || "Cliente",
        clientePhone: body.clientePhone || "",
        atendimentoId: body.atendimentoId || "",
        vendaId: body.vendaId || "",
        controlNumber: body.controlNumber || "",
        item: body.item || "",
        brand: body.brand || "",
        model: body.model || "",
        scheduledTime: body.scheduledTime || new Date().toISOString(),
        status: "pending",
        messageText: body.messageText || "",
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, "users", userId, "feedbacks", fbId), newFeedback);
      return new Response(JSON.stringify(newFeedback), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (path.startsWith("/api/feedbacks/") && method === "PUT") {
      const fbId = path.replace("/api/feedbacks/", "");
      const fbRef = doc(db, "users", userId, "feedbacks", fbId);
      const fbSnap = await getDoc(fbRef);
      if (!fbSnap.exists()) {
        return new Response(JSON.stringify({ error: "Feedback não encontrado" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
      const existing = getDocData(fbSnap);
      const updated = {
        ...existing,
        ...body,
        sentAt: body.status === "sent" ? (existing.sentAt || new Date().toISOString()) : existing.sentAt
      };
      await setDoc(fbRef, updated);
      return new Response(JSON.stringify(updated), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (path.startsWith("/api/feedbacks/") && method === "DELETE") {
      const fbId = path.replace("/api/feedbacks/", "");
      const fbRef = doc(db, "users", userId, "feedbacks", fbId);
      await deleteDoc(fbRef);
      return new Response(JSON.stringify({ success: true, id: fbId }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 1.3 Config Status route
    if (path === "/api/config/status") {
      const defaultStatuses = [
        "Aguardando técnico",
        "Em avaliação",
        "Aguardando aprovação do cliente",
        "Aprovado pelo cliente",
        "Reprovado pelo cliente",
        "Em manutenção",
        "Pronto para entrega",
        "Aguardando peça(s)",
        "Peça(s) na assistência",
        "Aguardando pagamento",
        "Sem conserto",
        "Não reclamado/Abandonado"
      ];

      if (method === "GET") {
        const docSnap = await getDoc(doc(db, "users", userId, "config", "status"));
        let docData = docSnap.exists() ? docSnap.data() : null;
        if (!docData || !docData.list) {
          docData = { list: defaultStatuses };
          await setDoc(doc(db, "users", userId, "config", "status"), docData);
        }
        return new Response(JSON.stringify(docData.list), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (method === "POST") {
        const newStatus = body.status;
        if (!newStatus || typeof newStatus !== "string" || !newStatus.trim()) {
          return new Response(JSON.stringify({ error: "Status inválido" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        const docSnap = await getDoc(doc(db, "users", userId, "config", "status"));
        let docData = docSnap.exists() ? docSnap.data() : null;
        let list = docData && docData.list ? docData.list : [...defaultStatuses];
        const trimmed = newStatus.trim();
        if (!list.includes(trimmed)) {
          list.push(trimmed);
          await setDoc(doc(db, "users", userId, "config", "status"), { list });
        }
        return new Response(JSON.stringify(list), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (method === "DELETE") {
        const statusToDelete = body.status;
        if (!statusToDelete || typeof statusToDelete !== "string") {
          return new Response(JSON.stringify({ error: "Status inválido" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        const docSnap = await getDoc(doc(db, "users", userId, "config", "status"));
        let docData = docSnap.exists() ? docSnap.data() : null;
        if (!docData || !docData.list) {
          return new Response(JSON.stringify({ error: "Configuração não encontrada" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        const updatedList = docData.list.filter((s: string) => s !== statusToDelete);
        await setDoc(doc(db, "users", userId, "config", "status"), { list: updatedList });
        return new Response(JSON.stringify(updatedList), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 1.4 Clear test data route
    if (path === "/api/admin/clear-test-data" && method === "POST") {
      const collectionsToClear = ["atendimentos", "pagamentos", "despesas", "vendas", "agendamentos", "feedbacks", "clientes", "produtos", "servicos", "convenios", "marcas", "itens"];
      for (const colName of collectionsToClear) {
        const snap = await getDocs(collection(db, "users", userId, colName));
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      }
      await setDoc(doc(db, "users", userId, "config", "main"), {
        nextControlNumber: 1,
        hasBeenCleared: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      return new Response(JSON.stringify({ success: true, message: "Todos os dados de teste foram zerados com sucesso." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Firebase Auth Login & Sync route
    if (path === "/api/auth/firebase-login" && method === "POST") {
      const { email, name, uid } = body;
      if (!email) {
        return new Response(JSON.stringify({ message: "E-mail é obrigatório." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      const emailLower = String(email).toLowerCase();
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);

      let userToReturn: any = null;

      if (!docSnap.exists()) {
        const isAdminEmail = emailLower === "michel.lima20000@gmail.com" || emailLower === "admin@minhaassistencia.com";
        const role = isAdminEmail ? "admin" : "admin";

        userToReturn = {
          id: uid,
          name: name || emailLower.split("@")[0],
          email: emailLower,
          role: role
        };

        await setDoc(docRef, userToReturn);
      } else {
        const existingData = docSnap.data();
        userToReturn = {
          id: docSnap.id,
          name: existingData.name || name || emailLower.split("@")[0],
          email: emailLower,
          role: existingData.role || "admin"
        };
      }

      await checkAndSeedUserClient(uid);

      return new Response(JSON.stringify({ user: userToReturn, token: "fb-session-token-" + uid }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 3. Stats Dashboard route
    if (path === "/api/stats" && method === "GET") {
      const atendimentosSnap = await getDocs(collection(db, "users", userId, "atendimentos"));
      const atendimentos = getDocsData(atendimentosSnap);

      const pagamentosSnap = await getDocs(collection(db, "users", userId, "pagamentos"));
      const pagamentos = getDocsData(pagamentosSnap);

      const despesasSnap = await getDocs(collection(db, "users", userId, "despesas"));
      const despesas = getDocsData(despesasSnap);

      const naAssistenciaCount = atendimentos.filter(a => a.status === "na_assistencia").length;
      const entregaCount = atendimentos.filter(a => a.status === "entrega").length;

      const todayQuery = urlObj.searchParams.get("today");
      const todayStr = todayQuery || new Date().toISOString().substring(0, 10);
      const offsetParam = urlObj.searchParams.get("offset");
      const offsetQuery = offsetParam ? Number(offsetParam) : null;

      const getLocalDateStr = (isoString: string) => {
        if (!isoString) return "";
        if (offsetQuery === null) return isoString.substring(0, 10);
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return isoString.substring(0, 10);
        const localTime = new Date(date.getTime() - (offsetQuery * 60000));
        return localTime.toISOString().substring(0, 10);
      };

      let cash = 0;
      let card = 0;
      let totalCollected = 0;

      const todayPagamentos = pagamentos.filter(p => p.date && getLocalDateStr(p.date) === todayStr);

      todayPagamentos.forEach(p => {
        const amount = Number(p.totalAmount || 0);
        if (p.method === "cash") {
          cash += amount;
        } else {
          card += amount;
        }
        totalCollected += amount;
      });

      const pending = atendimentos
        .filter(a => a.status !== "finalizado")
        .reduce((acc, a) => acc + (Number(a.totalAmount) || 0), 0);

      const todayDespesas = despesas.filter(d => d.date && getLocalDateStr(d.date) === todayStr);
      const expenses = todayDespesas.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);

      return new Response(JSON.stringify({
        naAssistenciaCount,
        entregaCount,
        financials: {
          cash,
          card,
          pending,
          expenses,
          totalCollected
        }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 4. Reports & Closed OS route
    if (path === "/api/reports" && method === "GET") {
      const type = urlObj.searchParams.get("type");
      const dateParam = urlObj.searchParams.get("date");
      const startDateParam = urlObj.searchParams.get("startDate");
      const endDateParam = urlObj.searchParams.get("endDate");
      const offsetParam = urlObj.searchParams.get("offset");
      const offsetQuery = offsetParam ? Number(offsetParam) : null;

      const [pagamentosSnap, despesasSnap, atendimentosSnap, vendasSnap, produtosSnap] = await Promise.all([
        getDocs(collection(db, "users", userId, "pagamentos")),
        getDocs(collection(db, "users", userId, "despesas")),
        getDocs(collection(db, "users", userId, "atendimentos")),
        getDocs(collection(db, "users", userId, "vendas")),
        getDocs(collection(db, "users", userId, "produtos"))
      ]);

      const pagamentos = getDocsData(pagamentosSnap);
      const despesas = getDocsData(despesasSnap);
      const atendimentos = getDocsData(atendimentosSnap);
      const vendas = getDocsData(vendasSnap);
      const produtos = getDocsData(produtosSnap);

      const productCostMap = new Map<string, number>();
      produtos.forEach((p: any) => {
        productCostMap.set(p.id, Number(p.cost) || 0);
      });

      const getLocalDateStr = (isoString: string) => {
        if (!isoString) return "";
        if (offsetQuery === null) return isoString.substring(0, 10);
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return isoString.substring(0, 10);
        const localTime = new Date(date.getTime() - (offsetQuery * 60000));
        return localTime.toISOString().substring(0, 10);
      };

      let startLimitStr: string;
      let endLimitStr: string;

      if (type === "daily") {
        const targetDateStr = dateParam || new Date().toISOString().substring(0, 10);
        startLimitStr = targetDateStr;
        endLimitStr = targetDateStr;
      } else {
        startLimitStr = startDateParam || new Date().toISOString().substring(0, 10);
        endLimitStr = endDateParam || new Date().toISOString().substring(0, 10);
      }

      const filteredPayments = pagamentos.filter(p => {
        if (!p.date) return false;
        const localDate = getLocalDateStr(p.date);
        return localDate >= startLimitStr && localDate <= endLimitStr;
      });

      const filteredExpenses = despesas.filter(d => {
        if (!d.date) return false;
        const localDate = getLocalDateStr(d.date);
        return localDate >= startLimitStr && localDate <= endLimitStr;
      });

      const closedOrders = atendimentos.filter(a => {
        if (a.status !== "finalizado" || !a.exitDate) return false;
        const localDate = getLocalDateStr(a.exitDate);
        return localDate >= startLimitStr && localDate <= endLimitStr;
      });

      const filteredVendas = vendas.filter((v: any) => {
        if (!v.date) return false;
        const localDate = getLocalDateStr(v.date);
        return localDate >= startLimitStr && localDate <= endLimitStr;
      });

      let directSalesRevenue = 0;
      let directSalesCost = 0;
      filteredVendas.forEach((v: any) => {
        const items = v.items || [];
        items.forEach((item: any) => {
          const qty = Number(item.quantity) || 1;
          const price = Number(item.price) || 0;
          const cost = item.cost !== undefined && item.cost !== null ? Number(item.cost) : (productCostMap.get(item.productId) || 0);
          directSalesRevenue += price * qty;
          directSalesCost += cost * qty;
        });
      });

      let serviceProductsRevenue = 0;
      let serviceProductsCost = 0;
      closedOrders.forEach((a: any) => {
        const productsUsed = a.products || [];
        productsUsed.forEach((p: any) => {
          const qty = Number(p.quantity) || 1;
          const price = Number(p.price) || 0;
          const cost = p.cost !== undefined && p.cost !== null ? Number(p.cost) : (productCostMap.get(p.productId) || 0);
          serviceProductsRevenue += price * qty;
          serviceProductsCost += cost * qty;
        });
      });

      const productRevenue = directSalesRevenue + serviceProductsRevenue;
      const productCost = directSalesCost + serviceProductsCost;
      const productGrossProfit = productRevenue - productCost;

      let totalCash = 0;
      let totalCard = 0;
      filteredPayments.forEach(p => {
        const amount = Number(p.totalAmount || 0);
        if (p.method === "cash") totalCash += amount;
        else totalCard += amount;
      });

      const totalRevenue = totalCash + totalCard;
      const totalExpense = filteredExpenses.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
      const grossProfit = totalRevenue - productCost;
      const netProfit = totalRevenue - productCost - totalExpense;

      const productSalesMap = new Map<string, {
        productId: string;
        name: string;
        quantitySold: number;
        totalRevenue: number;
        totalCost: number;
        profit: number;
      }>();

      filteredVendas.forEach((v: any) => {
        (v.items || []).forEach((item: any) => {
          const key = item.productId || item.name;
          const qty = Number(item.quantity) || 1;
          const price = Number(item.price) || 0;
          const cost = item.cost !== undefined && item.cost !== null ? Number(item.cost) : (productCostMap.get(item.productId) || 0);
          const rev = price * qty;
          const cst = cost * qty;

          const existing = productSalesMap.get(key) || {
            productId: item.productId || "",
            name: item.name || "Produto",
            quantitySold: 0,
            totalRevenue: 0,
            totalCost: 0,
            profit: 0
          };

          existing.quantitySold += qty;
          existing.totalRevenue += rev;
          existing.totalCost += cst;
          existing.profit += (rev - cst);
          productSalesMap.set(key, existing);
        });
      });

      closedOrders.forEach((a: any) => {
        (a.products || []).forEach((p: any) => {
          const key = p.productId || p.name;
          const qty = Number(p.quantity) || 1;
          const price = Number(p.price) || 0;
          const cost = p.cost !== undefined && p.cost !== null ? Number(p.cost) : (productCostMap.get(p.productId) || 0);
          const rev = price * qty;
          const cst = cost * qty;

          const existing = productSalesMap.get(key) || {
            productId: p.productId || "",
            name: p.name || "Peça / Produto",
            quantitySold: 0,
            totalRevenue: 0,
            totalCost: 0,
            profit: 0
          };

          existing.quantitySold += qty;
          existing.totalRevenue += rev;
          existing.totalCost += cst;
          existing.profit += (rev - cst);
          productSalesMap.set(key, existing);
        });
      });

      const topSoldProducts = Array.from(productSalesMap.values()).sort((a, b) => b.quantitySold - a.quantitySold);

      let totalStockUnits = 0;
      let totalStockValueCost = 0;
      let totalStockValuePrice = 0;
      let lowStockCount = 0;

      produtos.forEach((p: any) => {
        const stock = Number(p.stock) || 0;
        const cost = Number(p.cost) || 0;
        const price = Number(p.price) || 0;
        const minStock = (p.minStockAlert !== undefined && p.minStockAlert !== null) ? Number(p.minStockAlert) : 5;

        totalStockUnits += stock;
        totalStockValueCost += stock * cost;
        totalStockValuePrice += stock * price;
        if (stock <= minStock) {
          lowStockCount++;
        }
      });

      const inventorySummary = {
        totalProductsCount: produtos.length,
        totalStockUnits,
        totalStockValueCost,
        totalStockValuePrice,
        potentialStockProfit: totalStockValuePrice - totalStockValueCost,
        lowStockCount
      };

      return new Response(JSON.stringify({
        payments: filteredPayments,
        expenses: filteredExpenses,
        closedOrders,
        vendas: filteredVendas,
        topSoldProducts,
        inventorySummary,
        summary: {
          cash: totalCash,
          card: totalCard,
          revenue: totalRevenue,
          expense: totalExpense,
          balance: netProfit,
          productRevenue,
          productCost,
          productGrossProfit,
          grossProfit,
          netProfit
        }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 4.5 Atendimentos custom POST route
    if (path === "/api/atendimentos" && method === "POST") {
      const configRef = doc(db, "users", userId, "config", "main");
      let nextNum = 1;

      try {
        const configSnap = await getDoc(configRef);
        if (!configSnap.exists()) {
          await setDoc(configRef, {
            nextControlNumber: 2,
            printerConfigured: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: userId
          });
          nextNum = 1;
        } else {
          const configData = configSnap.data() || {};
          nextNum = configData.nextControlNumber || 1;
          await setDoc(configRef, {
            ...configData,
            nextControlNumber: nextNum + 1,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch (err) {
        console.error("Error updating config control number in clientRouter:", err);
      }

      const controlNumber = `OS-${String(nextNum).padStart(4, "0")}`;
      const id = "ate-" + Date.now();
      
      const newAtendimento = {
        id,
        controlNumber,
        status: "na_assistencia",
        clienteId: body.clienteId || "",
        item: body.item || "Celular",
        brand: body.brand || "",
        model: body.model || "",
        imei: body.imei || "",
        defeito: body.defeito || "",
        observations: body.observations || "",
        photoUrl: body.photoUrl || "",
        photoUrls: body.photoUrls || [],
        services: body.services || [],
        products: body.products || [],
        entryDate: new Date().toISOString(),
        totalAmount: body.totalAmount || 0,
        detailedStatus: body.detailedStatus || "Aguardando técnico",
        assignedTo: body.assignedTo || ""
      };

      await setDoc(doc(db, "users", userId, "atendimentos", id), newAtendimento);

      return new Response(JSON.stringify(newAtendimento), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 5. Payments finalization route
    if (path === "/api/pagamentos" && method === "POST") {
      const { atendimentoId, totalAmount, receivedAmount, change, method: payMethod, notesFin } = body;

      const atRef = doc(db, "users", userId, "atendimentos", atendimentoId);
      const atSnap = await getDoc(atRef);
      if (!atSnap.exists()) {
        return new Response(JSON.stringify({ message: "Atendimento não encontrado." }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      const at = getDocData(atSnap);
      const payId = "pay-" + Date.now();
      const newPayment = {
        id: payId,
        atendimentoId,
        totalAmount,
        receivedAmount,
        change,
        method: payMethod,
        date: new Date().toISOString()
      };

      await setDoc(doc(db, "users", userId, "pagamentos", payId), newPayment);

      at.status = "finalizado";
      at.exitDate = new Date().toISOString();
      at.paymentId = payId;
      at.notesFin = notesFin || "";
      await setDoc(atRef, at);

      const products = at.products || [];
      for (const atProd of products) {
        const prodRef = doc(db, "users", userId, "produtos", atProd.productId);
        const prodSnap = await getDoc(prodRef);
        if (prodSnap.exists()) {
          const p = getDocData(prodSnap);
          p.stock = Math.max(0, (Number(p.stock) || 0) - (Number(atProd.quantity) || 0));
          await setDoc(prodRef, p);
        }
      }

      return new Response(JSON.stringify({ payment: newPayment, atendimento: at }), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 5.5 Vendas Directas REST
    if (path === "/api/vendas" && method === "GET") {
      const snap = await getDocs(collection(db, "users", userId, "vendas"));
      const list = getDocsData(snap);
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return new Response(JSON.stringify(list), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (path === "/api/vendas" && method === "POST") {
      const { clienteId, clienteName, items, totalAmount, receivedAmount, change, method: payMethod, sellerId, sellerName, observations, garantia } = body;

      if (!items || items.length === 0) {
        return new Response(JSON.stringify({ message: "A venda deve conter pelo menos um item." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      for (const item of items) {
        const prodRef = doc(db, "users", userId, "produtos", item.productId);
        const prodSnap = await getDoc(prodRef);
        if (!prodSnap.exists()) {
          return new Response(JSON.stringify({ message: `Produto ${item.name} não encontrado.` }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        const p = prodSnap.data() as any;
        if ((Number(p.stock) || 0) < Number(item.quantity)) {
          return new Response(JSON.stringify({ message: `Estoque insuficiente para o produto ${item.name}. Disponível: ${p.stock}` }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
      }

      for (const item of items) {
        const prodRef = doc(db, "users", userId, "produtos", item.productId);
        const prodSnap = await getDoc(prodRef);
        if (prodSnap.exists()) {
          const p = { id: prodSnap.id, ...prodSnap.data() } as any;
          p.stock = Math.max(0, (Number(p.stock) || 0) - (Number(item.quantity) || 0));
          await setDoc(prodRef, p);
        }
      }

      const vendaId = "vend-" + Date.now();
      const newVenda = {
        id: vendaId,
        clienteId: clienteId || null,
        clienteName: clienteName || "Consumidor Final",
        items,
        totalAmount,
        receivedAmount,
        change,
        method: payMethod,
        date: new Date().toISOString(),
        sellerId: sellerId || null,
        sellerName: sellerName || "Balcão",
        observations: observations || "",
        garantia: garantia || "Garantia de 90 dias (3 meses)",
        status: "finalizada"
      };

      await setDoc(doc(db, "users", userId, "vendas", vendaId), newVenda);

      const payId = "pay-venda-" + Date.now();
      const newPayment = {
        id: payId,
        vendaId,
        isVendaDirecta: true,
        totalAmount,
        receivedAmount,
        change,
        method: payMethod,
        date: new Date().toISOString()
      };
      await setDoc(doc(db, "users", userId, "pagamentos", payId), newPayment);

      return new Response(JSON.stringify({ success: true, venda: newVenda, payment: newPayment }), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (path.match(/^\/api\/vendas\/([a-zA-Z0-9_-]+)\/estorno$/) && method === "POST") {
      const vendaId = path.split("/")[3];
      const { reason = "Devolução de Mercadoria", returnStock = true, createSangria = true } = body;
      const vRef = doc(db, "users", userId, "vendas", vendaId);
      const vSnap = await getDoc(vRef);
      if (!vSnap.exists()) return new Response(JSON.stringify({ error: "Venda não encontrada" }), { status: 404 });

      const venda = getDocData(vSnap);
      if (venda.status === "estornada") {
        return new Response(JSON.stringify({ error: "Esta venda já foi estornada anteriormente." }), { status: 400 });
      }

      if (returnStock && venda.items && venda.items.length > 0) {
        for (const item of venda.items) {
          if (item.productId) {
            const pRef = doc(db, "users", userId, "produtos", item.productId);
            const pSnap = await getDoc(pRef);
            if (pSnap.exists()) {
              const p = getDocData(pSnap);
              p.stock = (Number(p.stock) || 0) + (Number(item.quantity) || 1);
              await setDoc(pRef, p);
            }
          }
        }
      }

      venda.status = "estornada";
      venda.estornoReason = reason;
      venda.estornoDate = new Date().toISOString();
      await setDoc(vRef, venda);

      let createdDespesa: any = null;
      if (createSangria) {
        const despId = "d-estorno-" + Date.now();
        createdDespesa = {
          id: despId,
          description: `Estorno/Devolução: ${reason} (Venda #${vendaId})`,
          amount: Number(venda.totalAmount) || 0,
          date: new Date().toISOString()
        };
        await setDoc(doc(db, "users", userId, "despesas", despId), createdDespesa);
      }

      return new Response(JSON.stringify({ success: true, message: "Venda estornada com sucesso!", venda, despesa: createdDespesa }), { status: 200 });
    }

    // 6. Users / Employees handler
    if (path === "/api/users") {
      if (method === "GET") {
        const snap = await getDocs(collection(db, "users", userId, "employees"));
        const employees = getDocsData(snap);

        const managerDoc = await getDoc(doc(db, "users", userId));
        const managerData = managerDoc.exists() ? { id: managerDoc.id, ...managerDoc.data() } : null;

        const combined = [...employees];
        if (managerData && !combined.some(u => u.id === managerData.id)) {
          combined.unshift(managerData);
        }

        return new Response(JSON.stringify(combined), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (method === "POST") {
        const newId = "u-" + Date.now();
        const newUser = {
          id: newId,
          name: body.name,
          email: body.email,
          password: body.password || "123456",
          role: body.role || "employee"
        };
        await setDoc(doc(db, "users", userId, "employees", newId), newUser);
        await setDoc(doc(db, "users", newId), { ...newUser, managerId: userId });
        return new Response(JSON.stringify(newUser), {
          status: 201,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    if (path.startsWith("/api/users/") && method === "DELETE") {
      const targetUserId = path.replace("/api/users/", "");
      if (targetUserId === userId) {
        return new Response(JSON.stringify({ error: "Você não pode excluir sua própria conta!" }), { status: 400 });
      }
      await deleteDoc(doc(db, "users", userId, "employees", targetUserId));
      await deleteDoc(doc(db, "users", targetUserId));
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    // 7. Generic Collections Handler
    const match = path.match(/^\/api\/([a-zA-Z0-9_-]+)(?:\/([a-zA-Z0-9_.-]+))?$/);
    if (match) {
      const collectionName = match[1];
      const docId = match[2];

      // GET Collection or Doc
      if (method === "GET") {
        if (docId) {
          const docSnap = await getDoc(doc(db, "users", userId, collectionName, docId));
          if (!docSnap.exists()) {
            return new Response(JSON.stringify({ message: "Documento não encontrado" }), {
              status: 404,
              headers: { "Content-Type": "application/json" }
            });
          }
          return new Response(JSON.stringify(getDocData(docSnap)), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        } else {
          const snap = await getDocs(collection(db, "users", userId, collectionName));
          const data = getDocsData(snap);
          return new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }
      }

      // POST Create document
      if (method === "POST") {
        const newId = body.id || `${collectionName.slice(0, 3)}-${Date.now()}`;
        const finalData = { ...body, id: newId };
        await setDoc(doc(db, "users", userId, collectionName, newId), finalData);
        return new Response(JSON.stringify(finalData), {
          status: 201,
          headers: { "Content-Type": "application/json" }
        });
      }

      // PUT Update document
      if (method === "PUT" && docId) {
        const docRef = doc(db, "users", userId, collectionName, docId);
        await setDoc(docRef, body, { merge: true });
        return new Response(JSON.stringify({ id: docId, ...body }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // DELETE document
      if (method === "DELETE" && docId) {
        const docRef = doc(db, "users", userId, collectionName, docId);
        await deleteDoc(docRef);
        return new Response(JSON.stringify({ success: true, id: docId }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // Path not handled
    return new Response(JSON.stringify({ error: `Not Found: ${path}` }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    console.error("Client router error:", err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
