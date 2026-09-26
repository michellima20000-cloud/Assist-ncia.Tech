import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  runTransaction,
  query,
  where,
  limit,
  Timestamp,
  Firestore
} from "firebase/firestore";

// Define path resolution using process.cwd() as needed

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "database.json");

// Define interface for local database types
import {
  User,
  Cliente,
  Atendimento,
  Servico,
  Produto,
  Despesa,
  Convenio,
  Agendamento,
  Pagamento,
  Marca,
  Item,
  Venda,
  VendaItem
} from "./src/types.ts";

// Initialize Firebase Client SDK with configuration from firebase-applet-config.json
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let db: Firestore;

async function initFirebase() {
  try {
    const configContent = fs.readFileSync(configPath, "utf8");
    const fbConfig = JSON.parse(configContent);
    
    const app = initializeApp(fbConfig);
    const dbId = fbConfig.firestoreDatabaseId;
    db = (dbId && dbId !== "(default)") 
      ? initializeFirestore(app, { localCache: memoryLocalCache() }, dbId) 
      : initializeFirestore(app, { localCache: memoryLocalCache() });
    console.log(`Firebase Client SDK initialized successfully with database ID: ${dbId || "(default)"}`);
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
    process.exit(1);
  }
}

// Convert native types to Firestore compatible format
function convertToFirestore(obj: any): any {
  if (obj === null) return null;
  if (obj === undefined) return null;
  if (obj instanceof Date) return Timestamp.fromDate(obj);
  
  if (typeof obj === "string") {
    // Matches full ISO timestamp dates (not simple date string "YYYY-MM-DD")
    const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    if (isoPattern.test(obj)) {
      const parsedDate = new Date(obj);
      if (!isNaN(parsedDate.getTime())) {
        return Timestamp.fromDate(parsedDate);
      }
    }
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertToFirestore(item)).filter(item => item !== undefined);
  }
  
  if (typeof obj === "object") {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      if (obj[key] === undefined) {
        continue;
      }
      if (key === "time") {
        result[key] = obj[key];
      } else {
        const val = convertToFirestore(obj[key]);
        if (val !== undefined) {
          result[key] = val;
        }
      }
    }
    return result;
  }
  
  return obj;
}

// Convert Firestore types back to clean API format
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
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = convertFromFirestore(obj[key]);
    }
    return result;
  }
  
  return obj;
}

// Helper methods to operate Firestore collections
async function getCollection<T>(collectionName: string): Promise<T[]> {
  const colRef = collection(db, collectionName);
  const snapshot = await getDocs(colRef);
  const list: any[] = [];
  snapshot.forEach(docSnap => {
    list.push(convertFromFirestore({ id: docSnap.id, ...docSnap.data() }));
  });
  return list;
}

async function getDocument<T>(collectionName: string, docId: string): Promise<T | null> {
  const docRef = doc(db, collectionName, docId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return convertFromFirestore({ id: docSnap.id, ...docSnap.data() }) as T;
}

async function setDocument(collectionName: string, docId: string, data: any): Promise<void> {
  const docRef = doc(db, collectionName, docId);
  const docSnap = await getDoc(docRef);
  
  const now = Timestamp.now();
  const rawData = { ...data };
  
  // Clean id to prevent storing redundant field
  delete rawData.id;
  
  const payload = convertToFirestore(rawData);
  if (!docSnap.exists()) {
    payload.createdAt = now;
  }
  payload.updatedAt = now;
  if (!payload.createdBy) {
    payload.createdBy = "u-1"; // Default to u-1 admin
  }
  
  await setDoc(docRef, payload, { merge: true });
}

async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
}

// Seed local database.json data to Firestore if it's empty
async function seedDatabase() {
  try {
    const configRef = doc(db, "config", "main");
    const configSnap = await getDoc(configRef);
    
    if (configSnap.exists() && configSnap.data()?.hasBeenCleared) {
      console.log("Database has been cleared/reset for real usage. Skipping seeding.");
      return;
    }

    if (!configSnap.exists()) {
      console.log("Firestore main config not found. Creating default config...");
      await setDoc(configRef, convertToFirestore({
        nextControlNumber: 3,
        printerConfigured: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "system"
      }));
    }

    // Comprehensive default data for automatic seeding if collections are empty
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
        { id: "srv-1", name: "Troca de Tela / Display", price: 280.00 },
        { id: "srv-2", name: "Troca de Bateria", price: 140.00 },
        { id: "srv-3", name: "Desoxidação / Limpeza Química", price: 180.00 },
        { id: "srv-4", name: "Reparo de Conector de Carga", price: 120.00 },
        { id: "srv-5", name: "Formatação e Reinstalação de OS", price: 90.00 },
        { id: "srv-6", name: "Reparo de Placa-Mãe / Solda BGA", price: 450.00 },
        { id: "srv-7", name: "Limpeza Física + Pasta Térmica", price: 150.00 },
        { id: "srv-8", name: "Recuperação de Carcaça/Dobradiça", price: 200.00 }
      ],
      produtos: [
        { id: "prod-1", name: "Película de Vidro 3D", price: 30.00, cost: 8.00, stock: 85, category: "Películas", code: "PEL-3D" },
        { id: "prod-2", name: "Carregador Turbo 20W USB-C", price: 75.00, cost: 22.00, stock: 40, category: "Carregadores", code: "CAR-20W" },
        { id: "prod-3", name: "Cabo Reforçado USB-C 1.5m", price: 45.00, cost: 12.00, stock: 60, category: "Cabos", code: "CAB-USBC" },
        { id: "prod-4", name: "Bateria Compatível iPhone 11", price: 190.00, cost: 70.00, stock: 15, category: "Baterias", code: "BAT-IPH11" },
        { id: "prod-5", name: "SSD SATA III 480GB", price: 260.00, cost: 130.00, stock: 20, category: "Armazenamento", code: "SSD-480GB" },
        { id: "prod-6", name: "Fone de Ouvido com Fio Stereo", price: 35.00, cost: 10.00, stock: 35, category: "Acessórios", code: "FON-STEREO" }
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

    // Check if we also have seed data in database.json to merge or prioritize
    let localDb: any = {};
    if (fs.existsSync(DB_FILE)) {
      try {
        const fileData = fs.readFileSync(DB_FILE, "utf8");
        localDb = JSON.parse(fileData);
        console.log("Loaded custom database.json for additional seed data");
      } catch (e) {
        console.warn("Could not parse database.json:", e);
      }
    }

    const collectionsToSeed = [
      "clientes",
      "marcas",
      "itens",
      "servicos",
      "produtos",
      "convenios"
    ];

    for (const col of collectionsToSeed) {
      const colRef = collection(db, col);
      const snap = await getDocs(query(colRef, limit(1)));
      
      // If collection is completely empty, seed it
      if (snap.empty) {
        // Use custom localDb data if available, otherwise fallback to our beautiful defaults
        const itemsToSeed = (localDb[col] && localDb[col].length > 0) 
          ? localDb[col] 
          : (defaultData[col] || []);
        
        console.log(`Collection '${col}' is empty. Seeding with ${itemsToSeed.length} default items...`);
        
        for (const item of itemsToSeed) {
          const docId = item.id;
          if (docId) {
            const itemRef = doc(db, col, docId);
            await setDoc(itemRef, convertToFirestore({
              ...item,
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: item.updatedAt || new Date().toISOString(),
              createdBy: item.createdBy || "system"
            }));
          }
        }
      } else {
        console.log(`Collection '${col}' already has data. Skipping seed.`);
      }
    }
    
    console.log("Database seeding verification completed successfully.");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

async function startServer() {
  // Initialize Firebase dynamically first
  await initFirebase();

  const app = express();

  // Custom CORS middleware to allow Vercel and external domains to communicate with this backend
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    // Handle OPTIONS preflight requests
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Increase payload limit for base64 uploads
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ limit: "20mb", extended: true }));

  // Seed DB on start
  await seedDatabase();

  // --- API ROUTES ---

  // Get public firebase configuration
  app.get("/api/config/firebase", (req, res) => {
    try {
      const configContent = fs.readFileSync(configPath, "utf8");
      res.json(JSON.parse(configContent));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Handle Firebase authenticated session (Google Sign-In or Email Password sign-in)
  app.post("/api/auth/firebase-login", async (req, res) => {
    try {
      const { email, name, uid } = req.body;
      if (!email) {
        return res.status(400).json({ message: "E-mail é obrigatório." });
      }

      const emailLower = String(email).toLowerCase();
      const colRef = collection(db, "users");
      const q = query(colRef, where("email", "==", emailLower), limit(1));
      const snapshot = await getDocs(q);

      let userToReturn: any = null;

      if (snapshot.empty) {
        // Create user document if it doesn't exist
        // Automatically make first user, michel.lima20000@gmail.com, or admin@minhaassistencia.com as admin
        const allUsers = await getCollection<any>("users");
        const isFirstUser = allUsers.length === 0;
        const isAdminEmail = emailLower === "michel.lima20000@gmail.com" || emailLower === "admin@minhaassistencia.com";
        const role = (isFirstUser || isAdminEmail) ? "admin" : "employee";

        userToReturn = {
          id: uid,
          name: name || emailLower.split("@")[0],
          email: emailLower,
          role: role
        };

        // Write the document directly to the users collection with uid as document id
        await setDoc(doc(db, "users", uid), convertToFirestore(userToReturn));
        console.log(`New Firebase user registered: ${emailLower} with role ${role}`);
      } else {
        const docSnap = snapshot.docs[0];
        const existingData = convertFromFirestore(docSnap.data());
        userToReturn = {
          id: docSnap.id,
          name: existingData.name || name || emailLower.split("@")[0],
          email: emailLower,
          role: existingData.role || "employee"
        };
      }

      res.json({
        user: userToReturn,
        token: "fb-session-token-" + uid
      });
    } catch (error: any) {
      console.error("Firebase login error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Auth
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const colRef = collection(db, "users");
      const q = query(
        colRef,
        where("email", "==", String(email).toLowerCase()),
        where("password", "==", password),
        limit(1)
      );
      const snapshot = await getDocs(q);
        
      if (snapshot.empty) {
        return res.status(401).json({ message: "E-mail ou senha incorretos." });
      }
      
      const doc = snapshot.docs[0];
      const userData = convertFromFirestore(doc.data());
      const { password: _, ...userWithoutPassword } = userData;
      
      res.json({
        user: { id: doc.id, ...userWithoutPassword },
        token: "mock-session-token-" + doc.id
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Dashboard Stats
  app.get("/api/stats", async (req, res) => {
    try {
      const atendimentos = await getCollection<Atendimento>("atendimentos");
      const pagamentos = await getCollection<Pagamento>("pagamentos");
      const despesas = await getCollection<Despesa>("despesas");
      
      const naAssistenciaCount = atendimentos.filter(a => a.status === "na_assistencia").length;
      const entregaCount = atendimentos.filter(a => a.status === "entrega").length;

      // Get target date (default to server's local YYYY-MM-DD)
      const todayQuery = req.query.today as string;
      const todayStr = todayQuery || new Date().toISOString().substring(0, 10);
      const offsetQuery = req.query.offset ? Number(req.query.offset) : null;

      const getLocalDateStr = (isoString: string) => {
        if (!isoString) return "";
        const str = String(isoString).trim();
        // If already pure YYYY-MM-DD string, return as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
          return str;
        }
        if (offsetQuery === null) return str.substring(0, 10);
        const date = new Date(str);
        if (isNaN(date.getTime())) return str.substring(0, 10);
        const localTime = new Date(date.getTime() - (offsetQuery * 60000));
        return localTime.toISOString().substring(0, 10);
      };

      const isDateMatchToday = (dateVal: any) => {
        if (!dateVal) return false;
        const str = String(dateVal).trim();
        if (str === todayStr || str.substring(0, 10) === todayStr) return true;
        if (getLocalDateStr(str) === todayStr) return true;
        return false;
      };

      // Financial calculations
      let cash = 0;
      let card = 0;
      let totalCollected = 0;

      const todayPagamentos = pagamentos.filter(p => p.date && isDateMatchToday(p.date));

      // Deduplicate today payments by atendimentoId to prevent double-counting accidental duplicates
      const seenOrderIds = new Set<string>();
      const uniqueTodayPayments: Pagamento[] = [];
      todayPagamentos.forEach(p => {
        if (p.atendimentoId) {
          if (seenOrderIds.has(p.atendimentoId)) {
            return;
          }
          seenOrderIds.add(p.atendimentoId);
        }
        uniqueTodayPayments.push(p);
      });

      let directSalesTotal = 0;
      let serviceOrdersTotal = 0;

      uniqueTodayPayments.forEach(p => {
        const amt = Number(p.totalAmount) || 0;
        if (p.splitPayments) {
          cash += Number(p.splitPayments.cash) || 0;
          card += (Number(p.splitPayments.pix) || 0) + (Number(p.splitPayments.debit) || 0) + (Number(p.splitPayments.credit) || 0);
        } else if (p.method === "cash") {
          cash += amt;
        } else {
          card += amt; // Debit/Credit/Pix grouped into Card/Digital
        }
        totalCollected += amt;

        if (p.atendimentoId) {
          serviceOrdersTotal += amt;
        } else {
          directSalesTotal += amt;
        }
      });

      const pending = atendimentos
        .filter(a => a.status !== "finalizado")
        .reduce((acc, a) => acc + (Number(a.totalAmount) || 0), 0);

      const todayDespesas = despesas.filter(d => d.date && isDateMatchToday(d.date));
      const expenses = todayDespesas.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);

      res.json({
        naAssistenciaCount,
        entregaCount,
        financials: {
          cash,
          card,
          pending,
          expenses,
          totalCollected,
          directSalesTotal,
          serviceOrdersTotal
        }
      });
    } catch (error: any) {
      console.error("Stats error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Clientes REST
  app.get("/api/clientes", async (req, res) => {
    try {
      const list = await getCollection<Cliente>("clientes");
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/clientes", async (req, res) => {
    try {
      const id = "c-" + Date.now();
      const newCliente = {
        id,
        name: req.body.name || "",
        email: req.body.email || "",
        phone: req.body.phone || "",
        cpf: req.body.cpf || "",
        cnpj: req.body.cnpj || "",
        documentType: req.body.documentType || (req.body.cnpj ? "cnpj" : "cpf"),
        address: req.body.address || ""
      };
      await setDocument("clientes", id, newCliente);
      res.status(201).json(newCliente);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/clientes/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const existing = await getDocument<Cliente>("clientes", id);
      if (!existing) return res.status(404).json({ message: "Cliente não encontrado" });
      
      const updated = {
        ...existing,
        name: req.body.name ?? existing.name,
        email: req.body.email ?? existing.email,
        phone: req.body.phone ?? existing.phone,
        cpf: req.body.cpf ?? existing.cpf,
        cnpj: req.body.cnpj ?? (existing as any).cnpj ?? "",
        documentType: req.body.documentType ?? (existing as any).documentType ?? "cpf",
        address: req.body.address ?? existing.address
      };
      await setDocument("clientes", id, updated);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/clientes/:id", async (req, res) => {
    try {
      await deleteDocument("clientes", req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Atendimentos REST
  app.get("/api/atendimentos", async (req, res) => {
    try {
      const list = await getCollection<Atendimento>("atendimentos");
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/atendimentos", async (req, res) => {
    try {
      const configRef = doc(db, "config", "main");
      let nextNum = 1;

      await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(configRef);
        if (!sfDoc.exists()) {
          transaction.set(configRef, convertToFirestore({
            nextControlNumber: 2,
            printerConfigured: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: "system"
          }));
          nextNum = 1;
        } else {
          nextNum = sfDoc.data()?.nextControlNumber || 1;
          transaction.update(configRef, {
            nextControlNumber: nextNum + 1,
            updatedAt: Timestamp.now()
          });
        }
      });

      const controlNumber = `OS-${String(nextNum).padStart(4, "0")}`;
      const id = "a-" + Date.now();
      
      const newAtendimento: Atendimento = {
        id,
        controlNumber,
        status: "na_assistencia",
        clienteId: req.body.clienteId,
        item: req.body.item || "Celular",
        brand: req.body.brand || "",
        model: req.body.model || "",
        imei: req.body.imei || "",
        defeito: req.body.defeito || "",
        observations: req.body.observations || "",
        photoUrl: req.body.photoUrl || "",
        photoUrls: req.body.photoUrls || [],
        services: req.body.services || [],
        products: req.body.products || [],
        entryDate: new Date().toISOString(),
        totalAmount: req.body.totalAmount || 0
      };

      await setDocument("atendimentos", id, newAtendimento);
      res.status(201).json(newAtendimento);
    } catch (error: any) {
      console.error("Error creating order:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/atendimentos/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const existing = await getDocument<Atendimento>("atendimentos", id);
      if (!existing) return res.status(404).json({ message: "Atendimento não encontrado" });

      const updated: Atendimento = {
        ...existing,
        ...req.body
      };
      await setDocument("atendimentos", id, updated);

      // If status changed to finalizado or delivered, schedule post-sale feedback
      if (updated.status === "finalizado" || updated.detailedStatus === "Pronto para entrega" || updated.detailedStatus === "Entregue / Finalizado") {
        await scheduleFeedbackForAtendimento(updated);
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/atendimentos/:id", async (req, res) => {
    try {
      await deleteDocument("atendimentos", req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Servicos REST
  app.get("/api/servicos", async (req, res) => {
    try {
      const list = await getCollection<Servico>("servicos");
      res.json(list.sort((a, b) => a.position - b.position));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/servicos", async (req, res) => {
    try {
      const id = "s-" + Date.now();
      const colRef = collection(db, "servicos");
      const snapshot = await getDocs(colRef);
      const servicesCount = snapshot.size;
      
      const newService: Servico = {
        id,
        name: req.body.name,
        description: req.body.description || "",
        price: Number(req.body.price) || 0,
        position: Number(req.body.position) || servicesCount + 1,
        isPriceCustom: !!req.body.isPriceCustom
      };
      await setDocument("servicos", id, newService);
      res.status(201).json(newService);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/servicos/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const existing = await getDocument<Servico>("servicos", id);
      if (!existing) return res.status(404).json({ error: "Not found" });
      
      const updated = {
        ...existing,
        name: req.body.name ?? existing.name,
        description: req.body.description ?? existing.description,
        price: req.body.price !== undefined ? Number(req.body.price) : existing.price,
        position: req.body.position !== undefined ? Number(req.body.position) : existing.position,
        isPriceCustom: req.body.isPriceCustom !== undefined ? !!req.body.isPriceCustom : existing.isPriceCustom
      };
      await setDocument("servicos", id, updated);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/servicos/:id", async (req, res) => {
    try {
      await deleteDocument("servicos", req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Produtos REST
  app.get("/api/produtos", async (req, res) => {
    try {
      const list = await getCollection<Produto>("produtos");
      res.json(list.sort((a, b) => a.position - b.position));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/produtos", async (req, res) => {
    try {
      const id = "p-" + Date.now();
      const colRef = collection(db, "produtos");
      const snapshot = await getDocs(colRef);
      const count = snapshot.size;
      
      const newProduct: Produto = {
        id,
        name: req.body.name,
        description: req.body.description || "",
        price: Number(req.body.price) || 0,
        cost: Number(req.body.cost) || 0,
        stock: Number(req.body.stock) || 0,
        minStockAlert: Number(req.body.minStockAlert) || 0,
        barcode: req.body.barcode || "",
        position: Number(req.body.position) || count + 1,
        imageUrl: req.body.imageUrl || ""
      };
      await setDocument("produtos", id, newProduct);
      res.status(201).json(newProduct);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/produtos/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const existing = await getDocument<Produto>("produtos", id);
      if (!existing) return res.status(404).json({ error: "Not found" });
      
      const updated = {
        ...existing,
        name: req.body.name ?? existing.name,
        description: req.body.description ?? existing.description,
        price: req.body.price !== undefined ? Number(req.body.price) : existing.price,
        cost: req.body.cost !== undefined ? Number(req.body.cost) : (existing.cost || 0),
        stock: req.body.stock !== undefined ? Number(req.body.stock) : existing.stock,
        minStockAlert: req.body.minStockAlert !== undefined ? Number(req.body.minStockAlert) : existing.minStockAlert,
        barcode: req.body.barcode ?? existing.barcode,
        position: req.body.position !== undefined ? Number(req.body.position) : existing.position,
        imageUrl: req.body.imageUrl !== undefined ? req.body.imageUrl : existing.imageUrl
      };
      await setDocument("produtos", id, updated);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/produtos/:id", async (req, res) => {
    try {
      await deleteDocument("produtos", req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Despesas REST
  app.get("/api/despesas", async (req, res) => {
    try {
      const list = await getCollection<Despesa>("despesas");
      list.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/despesas", async (req, res) => {
    try {
      const id = "des-" + Date.now();
      const newDespesa: Despesa = {
        id,
        description: String(req.body.description || "Despesa").trim(),
        amount: Number(req.body.amount) || 0,
        date: req.body.date || new Date().toISOString().substring(0, 10)
      };
      await setDocument("despesas", id, newDespesa);
      res.status(201).json(newDespesa);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/despesas/:id", async (req, res) => {
    try {
      await deleteDocument("despesas", req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Convenios REST
  app.get("/api/convenios", async (req, res) => {
    try {
      const list = await getCollection<Convenio>("convenios");
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/convenios", async (req, res) => {
    try {
      const id = "cov-" + Date.now();
      const newConvenio: Convenio = {
        id,
        name: req.body.name,
        discountPercent: Number(req.body.discountPercent) || 0
      };
      await setDocument("convenios", id, newConvenio);
      res.status(201).json(newConvenio);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/convenios/:id", async (req, res) => {
    try {
      await deleteDocument("convenios", req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Agendamentos REST
  app.get("/api/agendamentos", async (req, res) => {
    try {
      const list = await getCollection<Agendamento>("agendamentos");
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/agendamentos", async (req, res) => {
    try {
      const id = "ag-" + Date.now();
      const newAg: Agendamento = {
        id,
        clienteId: req.body.clienteId,
        date: req.body.date,
        time: req.body.time,
        service: req.body.service,
        notes: req.body.notes || ""
      };
      await setDocument("agendamentos", id, newAg);
      res.status(201).json(newAg);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/agendamentos/:id", async (req, res) => {
    try {
      await deleteDocument("agendamentos", req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Marcas REST
  app.get("/api/marcas", async (req, res) => {
    try {
      const list = await getCollection<Marca>("marcas");
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/marcas", async (req, res) => {
    try {
      const id = "m-" + Date.now();
      const newMarca: Marca = {
        id,
        name: req.body.name
      };
      await setDocument("marcas", id, newMarca);
      res.status(201).json(newMarca);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/marcas/:id", async (req, res) => {
    try {
      await deleteDocument("marcas", req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Itens REST
  app.get("/api/itens", async (req, res) => {
    try {
      const list = await getCollection<Item>("itens");
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/itens", async (req, res) => {
    try {
      const id = "i-" + Date.now();
      const newItem: Item = {
        id,
        name: req.body.name
      };
      await setDocument("itens", id, newItem);
      res.status(201).json(newItem);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/itens/:id", async (req, res) => {
    try {
      await deleteDocument("itens", req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Funcionários (Users REST for admin management)
  app.get("/api/users", async (req, res) => {
    try {
      const list = await getCollection<User>("users");
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const id = "u-" + Date.now();
      const newUser: User = {
        id,
        name: req.body.name,
        email: req.body.email,
        password: req.body.password || "123456",
        role: req.body.role || "employee"
      };
      await setDocument("users", id, newUser);
      res.status(201).json(newUser);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const existing = await getDocument<User>("users", id);
      if (!existing) return res.status(404).json({ error: "Not found" });
      
      const updated = {
        ...existing,
        name: req.body.name ?? existing.name,
        email: req.body.email ?? existing.email,
        role: req.body.role ?? existing.role
      };
      if (req.body.password) {
        updated.password = req.body.password;
      }
      await setDocument("users", id, updated);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const id = req.params.id;
      if (id === "u-1") {
        return res.status(400).json({ error: "O Administrador padrão não pode ser excluído!" });
      }
      const existing = await getDocument<User>("users", id);
      if (existing && existing.email?.toLowerCase() === "michel.lima20000@gmail.com") {
        return res.status(400).json({ error: "A conta do Administrador principal não pode ser excluída!" });
      }
      await deleteDocument("users", id);
      res.json({ success: true, id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Helper to schedule feedback for an atendimento
  async function scheduleFeedbackForAtendimento(at: Atendimento): Promise<any | null> {
    try {
      let config = await getDocument<any>("config", "feedback");
      if (!config) {
        config = {
          enabled: true,
          delayHours: 3,
          messageTemplate: "Olá, {cliente}! Tudo bem? Passando para saber se deu tudo certo com o seu {aparelho} ({marca} {modelo}). O que você achou do nosso atendimento e da manutenção? Seu feedback é muito importante para nós! 👇",
          readyMessageTemplate: "Olá, {cliente}! O seu aparelho ({aparelho} {marca} {modelo}) sob OS número {numero_os} já está PRONTO para retirada em nossa assistência!\n\nValor total do serviço: R$ {valor}.\n\nEstamos te aguardando!",
          entryMessageTemplate: "Olá, {cliente}! Recebemos o seu aparelho ({aparelho} {marca} {modelo}) em nossa assistência técnica sob a OS número {numero_os}.\n\nVocê pode acompanhar o andamento do serviço diretamente conosco. Obrigado pela preferência!"
        };
      }

      // Check if feedback already exists for this atendimento
      const allFeedbacks = await getCollection<any>("feedbacks");
      const existing = allFeedbacks.find(fb => fb.atendimentoId === at.id);
      if (existing) {
        return existing;
      }

      // Find client info cleanly
      let clientName = "Cliente";
      let clientPhone = "";
      if (at.clienteId) {
        const client = await getDocument<Cliente>("clientes", at.clienteId);
        if (client) {
          clientName = client.name || clientName;
          clientPhone = client.phone || clientPhone;
        }
      }
      if (!clientPhone) {
        const allClients = await getCollection<Cliente>("clientes");
        const cleanTarget = String(at.clienteId || "").trim().toLowerCase();
        const found = allClients.find(c => 
          (c.id && String(c.id).trim().toLowerCase() === cleanTarget) ||
          (c.name && cleanTarget && String(c.name).trim().toLowerCase() === cleanTarget)
        );
        if (found) {
          clientName = found.name || clientName;
          clientPhone = found.phone || clientPhone;
        }
      }

      const delayHours = Number(config.delayHours) >= 0 ? Number(config.delayHours) : 3;
      const delayMs = delayHours * 60 * 60 * 1000;
      const scheduledTime = new Date(Date.now() + delayMs).toISOString();

      let messageText = config.messageTemplate || "Olá, {cliente}! Tudo bem? Passando para saber se deu tudo certo com o seu {aparelho} ({marca} {modelo}). O que você achou do nosso atendimento e da manutenção? Seu feedback é muito importante para nós! 👇";
      const valorFormatted = Number(at.totalAmount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      messageText = messageText
        .replace(/{cliente}/g, clientName)
        .replace(/{aparelho}/g, at.item || "aparelho")
        .replace(/{marca}/g, at.brand || "")
        .replace(/{modelo}/g, at.model || "")
        .replace(/{numero_os}/g, at.controlNumber || "")
        .replace(/{valor}/g, valorFormatted);

      const fbId = "fb-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
      const newFeedback = {
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
        messageText,
        createdAt: new Date().toISOString()
      };

      await setDocument("feedbacks", fbId, newFeedback);
      return newFeedback;
    } catch (fbErr) {
      console.error("Error scheduling feedback for atendimento:", fbErr);
      return null;
    }
  }

  // Helper to schedule feedback for a direct sale
  async function scheduleFeedbackForVenda(v: Venda): Promise<any | null> {
    try {
      if (!v.clienteName || v.clienteName === "Consumidor Final") return null;
      let config = await getDocument<any>("config", "feedback");
      if (!config || config.enabled === false) return null;

      const allFeedbacks = await getCollection<any>("feedbacks");
      const existing = allFeedbacks.find(fb => fb.vendaId === v.id);
      if (existing) return existing;

      let clientPhone = "";
      if (v.clienteId) {
        const client = await getDocument<Cliente>("clientes", v.clienteId);
        if (client) clientPhone = client.phone || "";
      }
      if (!clientPhone && v.clienteName) {
        const allClients = await getCollection<Cliente>("clientes");
        const found = allClients.find(c => c.name?.toLowerCase() === v.clienteName?.toLowerCase());
        if (found) clientPhone = found.phone || "";
      }

      const delayHours = Number(config.delayHours) >= 0 ? Number(config.delayHours) : 3;
      const delayMs = delayHours * 60 * 60 * 1000;
      const scheduledTime = new Date(Date.now() + delayMs).toISOString();

      const itemsSummary = (v.items || []).map(i => `${i.name} (x${i.quantity})`).join(", ");
      const messageText = `Olá, ${v.clienteName}! Tudo bem? Passando para agradecer sua compra (${itemsSummary}) em nossa loja! O que você achou dos produtos e do nosso atendimento? Seu feedback é muito importante para nós! 👇`;

      const fbId = "fb-venda-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
      const newFeedback = {
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
        messageText,
        createdAt: new Date().toISOString()
      };

      await setDocument("feedbacks", fbId, newFeedback);
      return newFeedback;
    } catch (err) {
      console.error("Error in scheduleFeedbackForVenda:", err);
      return null;
    }
  }

  // Payments & Exit finalization
  app.post("/api/pagamentos", async (req, res) => {
    try {
      const { atendimentoId, totalAmount, receivedAmount, change, method, splitPayments, notesFin } = req.body;

      const at = await getDocument<Atendimento>("atendimentos", atendimentoId);
      if (!at) {
        return res.status(404).json({ message: "Atendimento não encontrado." });
      }

      // Check if a payment for this atendimento already exists
      const allPagamentos = await getCollection<Pagamento>("pagamentos");
      const existingPay = allPagamentos.find(p => p.atendimentoId === atendimentoId);
      if (existingPay) {
        console.warn(`Payment already exists for atendimento ${atendimentoId}: ${existingPay.id}`);
        // Ensure atendimento is finalized
        if (at.status !== "finalizado" || !at.paymentId) {
          at.status = "finalizado";
          at.exitDate = at.exitDate || existingPay.date || new Date().toISOString();
          at.paymentId = existingPay.id;
          if (notesFin) at.notesFin = notesFin;
          await setDocument("atendimentos", at.id, at);
        }
        return res.status(200).json({ payment: existingPay, atendimento: at });
      }

      const payId = "pay-" + Date.now();
      const newPayment: Pagamento = {
        id: payId,
        atendimentoId,
        totalAmount,
        receivedAmount,
        change,
        method,
        splitPayments: splitPayments || null,
        date: new Date().toISOString()
      };

      // Store payment
      await setDocument("pagamentos", payId, newPayment);

      // Update Atendimento status
      at.status = "finalizado";
      at.exitDate = new Date().toISOString();
      at.paymentId = payId;
      at.notesFin = notesFin || "";
      await setDocument("atendimentos", at.id, at);

      // Deduct inventory stock for products used
      const products = at.products || [];
      for (const atProd of products) {
        const p = await getDocument<Produto>("produtos", atProd.productId);
        if (p) {
          p.stock = Math.max(0, p.stock - atProd.quantity);
          await setDocument("produtos", p.id, p);
        }
      }

      // Schedule Feedback Automation
      await scheduleFeedbackForAtendimento(at);

      res.status(201).json({ payment: newPayment, atendimento: at });
    } catch (error: any) {
      console.error("Error finalizing payment:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/pagamentos/:id", async (req, res) => {
    try {
      await deleteDocument("pagamentos", req.params.id);
      res.json({ success: true, id: req.params.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get Feedback config
  app.get("/api/config/feedback", async (req, res) => {
    try {
      let config = await getDocument<any>("config", "feedback");
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
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Save Feedback config
  app.post("/api/config/feedback", async (req, res) => {
    try {
      const config = {
        enabled: req.body.enabled !== undefined ? !!req.body.enabled : true,
        delayHours: Number(req.body.delayHours) >= 0 ? Number(req.body.delayHours) : 3,
        messageTemplate: req.body.messageTemplate || "",
        readyMessageTemplate: req.body.readyMessageTemplate || "Olá, {cliente}! O seu aparelho ({aparelho} {marca} {modelo}) sob OS número {numero_os} já está PRONTO para retirada em nossa assistência!\n\nValor total do serviço: R$ {valor}.\n\nEstamos te aguardando!",
        entryMessageTemplate: req.body.entryMessageTemplate || "Olá, {cliente}! Recebemos o seu aparelho ({aparelho} {marca} {modelo}) em nossa assistência técnica sob a OS número {numero_os}.\n\nVocê pode acompanhar o andamento do serviço diretamente conosco. Obrigado pela preferência!",
        googleReviewUrl: req.body.googleReviewUrl || ""
      };
      await setDocument("config", "feedback", config);
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get Theme config
  app.get("/api/config/theme", async (req, res) => {
    try {
      let config = await getDocument<any>("config", "theme");
      if (!config) {
        config = {
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
      }
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Save Theme config
  app.post("/api/config/theme", async (req, res) => {
    try {
      const config = {
        mode: req.body.mode || "light",
        primaryColor: req.body.primaryColor || "#1E88E5",
        headerColor: req.body.headerColor || req.body.primaryColor || "#1E88E5",
        headerStyle: req.body.headerStyle || "primary",
        cardContrast: req.body.cardContrast || "normal",
        companyName: req.body.companyName || "Minha Assistência.Tech",
        logoUrl: req.body.logoUrl || "",
        showLogoInHeader: req.body.showLogoInHeader !== undefined ? req.body.showLogoInHeader : true,
        showLogoAsBackground: req.body.showLogoAsBackground !== undefined ? req.body.showLogoAsBackground : true,
        backgroundLogoOpacity: typeof req.body.backgroundLogoOpacity === "number" ? req.body.backgroundLogoOpacity : 0.07,
        updatedAt: new Date().toISOString()
      };
      await setDocument("config", "theme", config);
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });


  // Get Custom Statuses
  app.get("/api/config/status", async (req, res) => {
    try {
      let docData = await getDocument<any>("config", "status");
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
      if (!docData || !docData.list) {
        docData = { list: defaultStatuses };
        await setDocument("config", "status", docData);
      }
      res.json(docData.list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add Custom Status
  app.post("/api/config/status", async (req, res) => {
    try {
      const newStatus = req.body.status;
      if (!newStatus || typeof newStatus !== "string" || !newStatus.trim()) {
        return res.status(400).json({ error: "Status inválido" });
      }
      
      let docData = await getDocument<any>("config", "status");
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
      let list = docData && docData.list ? docData.list : [...defaultStatuses];
      
      const trimmed = newStatus.trim();
      if (!list.includes(trimmed)) {
        list.push(trimmed);
        await setDocument("config", "status", { list });
      }
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete Custom Status
  app.delete("/api/config/status", async (req, res) => {
    try {
      const statusToDelete = req.body.status;
      if (!statusToDelete || typeof statusToDelete !== "string") {
        return res.status(400).json({ error: "Status inválido" });
      }
      let docData = await getDocument<any>("config", "status");
      if (!docData || !docData.list) {
        return res.status(404).json({ error: "Configuração não encontrada" });
      }
      const updatedList = docData.list.filter((s: string) => s !== statusToDelete);
      await setDocument("config", "status", { list: updatedList });
      res.json(updatedList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get Scheduled feedbacks
  app.get("/api/feedbacks", async (req, res) => {
    try {
      const list = await getCollection<any>("feedbacks");
      res.json(list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create manual or custom feedback
  app.post("/api/feedbacks", async (req, res) => {
    try {
      const { clienteName, clientePhone, clienteId, atendimentoId, vendaId, item, brand, model, controlNumber, messageText, scheduledTime } = req.body;
      const fbId = "fb-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
      const newFeedback = {
        id: fbId,
        clienteId: clienteId || "",
        clienteName: clienteName || "Cliente",
        clientePhone: clientePhone || "",
        atendimentoId: atendimentoId || "",
        vendaId: vendaId || "",
        controlNumber: controlNumber || "",
        item: item || "",
        brand: brand || "",
        model: model || "",
        scheduledTime: scheduledTime || new Date().toISOString(),
        status: "pending",
        messageText: messageText || "",
        createdAt: new Date().toISOString()
      };
      await setDocument("feedbacks", fbId, newFeedback);
      res.status(201).json(newFeedback);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Sync / Backfill post-sale feedback for all finalized atendimentos and sales
  app.post("/api/feedbacks/sync", async (req, res) => {
    try {
      const [atendimentos, existingFeedbacks, vendas] = await Promise.all([
        getCollection<Atendimento>("atendimentos"),
        getCollection<any>("feedbacks"),
        getCollection<Venda>("vendas")
      ]);

      const existingAtendimentoIds = new Set(existingFeedbacks.map(f => f.atendimentoId).filter(Boolean));
      const existingVendaIds = new Set(existingFeedbacks.map(f => f.vendaId).filter(Boolean));

      let createdCount = 0;
      // 1. Process finalized atendimentos
      const finalizedList = atendimentos.filter(a => 
        a.status === "finalizado" || 
        a.detailedStatus === "Pronto para entrega" || 
        a.detailedStatus === "Entregue / Finalizado"
      );

      for (const at of finalizedList) {
        if (!existingAtendimentoIds.has(at.id)) {
          const created = await scheduleFeedbackForAtendimento(at);
          if (created) {
            createdCount++;
            existingAtendimentoIds.add(at.id);
          }
        }
      }

      // 2. Process vendas with client name
      const eligibleVendas = vendas.filter(v => 
        v.status !== "estornada" && 
        v.clienteName && 
        v.clienteName !== "Consumidor Final"
      );

      for (const v of eligibleVendas) {
        if (!existingVendaIds.has(v.id)) {
          const created = await scheduleFeedbackForVenda(v);
          if (created) {
            createdCount++;
            existingVendaIds.add(v.id);
          }
        }
      }

      const updatedFeedbacks = await getCollection<any>("feedbacks");
      res.json({
        success: true,
        syncedCount: createdCount,
        totalFeedbacks: updatedFeedbacks.length,
        feedbacks: updatedFeedbacks.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      });
    } catch (err: any) {
      console.error("Error syncing feedbacks:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Update feedback status or text
  app.put("/api/feedbacks/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const existing = await getDocument<any>("feedbacks", id);
      if (!existing) return res.status(404).json({ error: "Feedback não encontrado." });

      const updated = {
        ...existing,
        ...req.body,
        sentAt: req.body.status === "sent" ? (existing.sentAt || new Date().toISOString()) : existing.sentAt
      };
      await setDocument("feedbacks", id, updated);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete feedback
  app.delete("/api/feedbacks/:id", async (req, res) => {
    try {
      await deleteDocument("feedbacks", req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // History / Reports
  app.get("/api/reports", async (req, res) => {
    try {
      const { type, date, startDate, endDate, offset } = req.query;
      const offsetQuery = offset ? Number(offset) : null;

      const [pagamentos, despesas, atendimentos, vendas, produtos] = await Promise.all([
        getCollection<Pagamento>("pagamentos"),
        getCollection<Despesa>("despesas"),
        getCollection<Atendimento>("atendimentos"),
        getCollection<Venda>("vendas"),
        getCollection<Produto>("produtos")
      ]);

      const productCostMap = new Map<string, number>();
      produtos.forEach(p => {
        productCostMap.set(p.id, p.cost || 0);
      });

      const getLocalDateStr = (isoString: string) => {
        if (!isoString) return "";
        const str = String(isoString).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
          return str;
        }
        if (offsetQuery === null) return str.substring(0, 10);
        const date = new Date(str);
        if (isNaN(date.getTime())) return str.substring(0, 10);
        const localTime = new Date(date.getTime() - (offsetQuery * 60000));
        return localTime.toISOString().substring(0, 10);
      };

      let filteredPayments: Pagamento[] = [];
      let startLimitStr: string;
      let endLimitStr: string;

      if (type === "daily") {
        const targetDateStr = (date as string) || new Date().toISOString().substring(0, 10);
        startLimitStr = targetDateStr;
        endLimitStr = targetDateStr;
      } else {
        startLimitStr = (startDate as string) || new Date().toISOString().substring(0, 10);
        endLimitStr = (endDate as string) || new Date().toISOString().substring(0, 10);
      }

      const matchDateRange = (isoString: string) => {
        if (!isoString) return false;
        if (type === "all") return true;
        const localDate = getLocalDateStr(isoString);
        const rawDate = typeof isoString === "string" ? isoString.substring(0, 10) : "";
        return (localDate >= startLimitStr && localDate <= endLimitStr) ||
               (rawDate >= startLimitStr && rawDate <= endLimitStr);
      };

      // Filter payments in the range and deduplicate by atendimentoId
      const rawFilteredPayments = pagamentos.filter(p => matchDateRange(p.date));
      const seenOrderPayIds = new Set<string>();
      filteredPayments = [];
      rawFilteredPayments.forEach(p => {
        if (p.atendimentoId) {
          if (seenOrderPayIds.has(p.atendimentoId)) {
            return;
          }
          seenOrderPayIds.add(p.atendimentoId);
        }
        filteredPayments.push(p);
      });

      // Filter expenses in the range
      const filteredExpenses = despesas.filter(d => matchDateRange(d.date));

      // Detailed service orders closed in this range
      const closedOrders = atendimentos.filter(a => {
        if (a.status !== "finalizado" || !a.exitDate) return false;
        return matchDateRange(a.exitDate);
      });

      // Filter direct sales in the range
      const filteredVendas = vendas.filter(v => matchDateRange(v.date));

      // Direct sales product financials
      let directSalesRevenue = 0;
      let directSalesCost = 0;
      filteredVendas.forEach(v => {
        const items = v.items || [];
        items.forEach(item => {
          const qty = item.quantity || 1;
          const price = item.price || 0;
          const cost = item.cost !== undefined ? item.cost : (productCostMap.get(item.productId) || 0);
          
          directSalesRevenue += price * qty;
          directSalesCost += cost * qty;
        });
      });

      // Service orders product financials
      let serviceProductsRevenue = 0;
      let serviceProductsCost = 0;
      closedOrders.forEach(a => {
        const productsUsed = a.products || [];
        productsUsed.forEach(p => {
          const qty = p.quantity || 1;
          const price = p.price || 0;
          const cost = p.cost !== undefined && p.cost !== null ? p.cost : (productCostMap.get(p.productId) || 0);

          serviceProductsRevenue += price * qty;
          serviceProductsCost += cost * qty;
        });
      });

      const productRevenue = directSalesRevenue + serviceProductsRevenue;
      const productCost = directSalesCost + serviceProductsCost;
      const productGrossProfit = productRevenue - productCost;

      // Totals
      let totalCash = 0;
      let totalCard = 0;
      filteredPayments.forEach(p => {
        if (p.method === "cash") totalCash += p.totalAmount;
        else totalCard += p.totalAmount;
      });

      const totalRevenue = totalCash + totalCard;
      const totalExpense = filteredExpenses.reduce((acc, d) => acc + d.amount, 0);
      const grossProfit = totalRevenue - productCost;
      const netProfit = totalRevenue - productCost - totalExpense;
      const balance = netProfit;

      // Calculate Top Sold Products
      const productSalesMap = new Map<string, {
        productId: string;
        name: string;
        quantitySold: number;
        totalRevenue: number;
        totalCost: number;
        profit: number;
      }>();

      filteredVendas.forEach(v => {
        (v.items || []).forEach(item => {
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

      closedOrders.forEach(a => {
        (a.products || []).forEach(p => {
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

      // Calculate Inventory Summary
      let totalStockUnits = 0;
      let totalStockValueCost = 0;
      let totalStockValuePrice = 0;
      let lowStockCount = 0;

      produtos.forEach(p => {
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

      res.json({
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
      });
    } catch (error: any) {
      console.error("Reports error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vendas Directas REST
  app.get("/api/vendas", async (req, res) => {
    try {
      const list = await getCollection<Venda>("vendas");
      // Sort sales by date descending
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      res.json(list);
    } catch (error: any) {
      console.error("Error fetching sales:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/vendas", async (req, res) => {
    try {
      const { clienteId, clienteName, items, totalAmount, receivedAmount, change, method, splitPayments, sellerId, sellerName, observations, garantia } = req.body;

      if (!items || items.length === 0) {
        return res.status(400).json({ message: "A venda deve conter pelo menos um item." });
      }

      // Check stock
      for (const item of items) {
        const p = await getDocument<Produto>("produtos", item.productId);
        if (!p) {
          return res.status(400).json({ message: `Produto ${item.name} não encontrado.` });
        }
        if (p.stock < item.quantity) {
          return res.status(400).json({ message: `Estoque insuficiente para o produto ${item.name}. Disponível: ${p.stock}` });
        }
      }

      // Decrement stock for each item sold
      for (const item of items) {
        const p = await getDocument<Produto>("produtos", item.productId);
        if (p) {
          p.stock = Math.max(0, p.stock - item.quantity);
          await setDocument("produtos", p.id, p);
        }
      }

      const vendaId = "vend-" + Date.now();
      const newVenda: Venda = {
        id: vendaId,
        clienteId: clienteId || null,
        clienteName: clienteName || "Consumidor Final",
        items,
        totalAmount,
        receivedAmount,
        change,
        method,
        splitPayments: splitPayments || null,
        date: new Date().toISOString(),
        sellerId: sellerId || null,
        sellerName: sellerName || "Balcão",
        observations: observations || "",
        garantia: garantia || "Garantia de 90 dias (3 meses)",
        status: "finalizada"
      };

      // Save venda document
      await setDocument("vendas", vendaId, newVenda);

      // Create matching payment entry so it registers in dashboard statistics, caixa flow, and financial summaries
      const payId = "pay-venda-" + Date.now();
      const newPayment: Pagamento = {
        id: payId,
        vendaId,
        isVendaDirecta: true,
        totalAmount,
        receivedAmount,
        change,
        method,
        splitPayments: splitPayments || null,
        date: new Date().toISOString()
      };
      await setDocument("pagamentos", payId, newPayment);

      // Schedule feedback for direct sale if customer info is present
      await scheduleFeedbackForVenda(newVenda);

      res.status(201).json({ success: true, venda: newVenda, payment: newPayment });
    } catch (error: any) {
      console.error("Error creating direct sale:", error);
      res.status(500).json({ error: error.message, message: error.message });
    }
  });

  app.put("/api/vendas/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const existing = await getDocument<Venda>("vendas", id);
      if (!existing) return res.status(404).json({ message: "Venda não encontrada" });

      const updated = {
        ...existing,
        ...req.body
      };
      await setDocument("vendas", id, updated);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Estorno / Devolução de Venda
  app.post("/api/vendas/:id/estorno", async (req, res) => {
    try {
      const id = req.params.id;
      const { reason = "Devolução de Mercadoria", returnStock = true, createSangria = true } = req.body;
      const venda = await getDocument<Venda>("vendas", id);
      if (!venda) return res.status(404).json({ error: "Venda não encontrada" });

      if (venda.status === "estornada") {
        return res.status(400).json({ error: "Esta venda já foi estornada anteriormente." });
      }

      // 1. Return stock if requested
      if (returnStock && venda.items && venda.items.length > 0) {
        for (const item of venda.items) {
          if (item.productId) {
            const p = await getDocument<Produto>("produtos", item.productId);
            if (p) {
              p.stock = (Number(p.stock) || 0) + (Number(item.quantity) || 1);
              await setDocument("produtos", p.id, p);
            }
          }
        }
      }

      // 2. Mark venda as estornada
      venda.status = "estornada";
      venda.estornoReason = reason;
      venda.estornoDate = new Date().toISOString();
      await setDocument("vendas", id, venda);

      // 3. Create cash outflow / sangria / despesa if requested so cash balance matches
      let createdDespesa: Despesa | null = null;
      if (createSangria) {
        const despId = "d-estorno-" + Date.now();
        createdDespesa = {
          id: despId,
          description: `Estorno/Devolução: ${reason} (Venda #${id})`,
          amount: Number(venda.totalAmount) || 0,
          date: new Date().toISOString()
        };
        await setDocument("despesas", despId, createdDespesa);
      }

      res.json({
        success: true,
        message: "Venda estornada com sucesso!",
        venda,
        despesa: createdDespesa
      });
    } catch (error: any) {
      console.error("Error refunding sale:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete Venda (Hard delete with stock restoration if needed)
  app.delete("/api/vendas/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const { returnStock = true } = req.body || {};
      const venda = await getDocument<Venda>("vendas", id);
      
      if (venda && returnStock && venda.status !== "estornada" && venda.items) {
        for (const item of venda.items) {
          if (item.productId) {
            const p = await getDocument<Produto>("produtos", item.productId);
            if (p) {
              p.stock = (Number(p.stock) || 0) + (Number(item.quantity) || 1);
              await setDocument("produtos", p.id, p);
            }
          }
        }
      }

      await deleteDocument("vendas", id);
      res.json({ success: true, message: "Venda removida com sucesso!" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin clear test data endpoint
  app.post("/api/admin/clear-test-data", async (req, res) => {
    try {
      const collections = [
        "clientes",
        "atendimentos",
        "servicos",
        "produtos",
        "despesas",
        "convenios",
        "marcas",
        "itens",
        "pagamentos",
        "vendas"
      ];
      
      for (const col of collections) {
        const colRef = collection(db, col);
        const snapshot = await getDocs(colRef);
        for (const docSnap of snapshot.docs) {
          await deleteDoc(doc(db, col, docSnap.id));
        }
      }
      
      // Reset config
      const configRef = doc(db, "config", "main");
      await setDoc(configRef, convertToFirestore({
        nextControlNumber: 1,
        printerConfigured: false,
        hasBeenCleared: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "system"
      }));
      
      res.json({ success: true, message: "Todos os dados de teste foram removidos! O sistema agora está limpo e o contador de OS foi resetado para 0001." });
    } catch (error: any) {
      console.error("Error clearing database:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Serve static uploads
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // --- Vite Dev Middleware / Static Assets ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Minha Assistência running on http://localhost:${PORT}`);
  });
}

startServer();
