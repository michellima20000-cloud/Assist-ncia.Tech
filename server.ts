import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
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
  Item
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
    db = (dbId && dbId !== "(default)") ? getFirestore(app, dbId) : getFirestore(app);
    console.log(`Firebase Client SDK initialized successfully with database ID: ${dbId || "(default)"}`);
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
    process.exit(1);
  }
}

// Convert native types to Firestore compatible format
function convertToFirestore(obj: any): any {
  if (obj === null || obj === undefined) return obj;
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
    return obj.map(item => convertToFirestore(item));
  }
  
  if (typeof obj === "object") {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      if (key === "time") {
        result[key] = obj[key];
      } else {
        result[key] = convertToFirestore(obj[key]);
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

      // Financial calculations
      let cash = 0;
      let card = 0;
      let totalCollected = 0;

      pagamentos.forEach(p => {
        if (p.method === "cash") {
          cash += p.totalAmount;
        } else {
          card += p.totalAmount; // Debit/Credit grouped into Card
        }
        totalCollected += p.totalAmount;
      });

      const pending = atendimentos
        .filter(a => a.status !== "finalizado")
        .reduce((acc, a) => acc + (a.totalAmount || 0), 0);

      const expenses = despesas.reduce((acc, d) => acc + (d.amount || 0), 0);

      res.json({
        naAssistenciaCount,
        entregaCount,
        financials: {
          cash,
          card,
          pending,
          expenses,
          totalCollected
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
        observations: req.body.observations || "",
        photoUrl: req.body.photoUrl || "",
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

      const updated = {
        ...existing,
        ...req.body
      };
      await setDocument("atendimentos", id, updated);
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
        stock: Number(req.body.stock) || 0,
        minStockAlert: Number(req.body.minStockAlert) || 0,
        barcode: req.body.barcode || "",
        position: Number(req.body.position) || count + 1
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
        stock: req.body.stock !== undefined ? Number(req.body.stock) : existing.stock,
        minStockAlert: req.body.minStockAlert !== undefined ? Number(req.body.minStockAlert) : existing.minStockAlert,
        barcode: req.body.barcode ?? existing.barcode,
        position: req.body.position !== undefined ? Number(req.body.position) : existing.position
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
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/despesas", async (req, res) => {
    try {
      const id = "d-" + Date.now();
      const newDespesa: Despesa = {
        id,
        description: req.body.description,
        amount: Number(req.body.amount) || 0,
        date: req.body.date || new Date().toISOString()
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
      if (req.params.id === "u-1") {
        return res.status(400).json({ error: "O Administrador padrão não pode ser excluído!" });
      }
      await deleteDocument("users", req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Payments & Exit finalization
  app.post("/api/pagamentos", async (req, res) => {
    try {
      const { atendimentoId, totalAmount, receivedAmount, change, method, notesFin } = req.body;

      const at = await getDocument<Atendimento>("atendimentos", atendimentoId);
      if (!at) {
        return res.status(404).json({ message: "Atendimento não encontrado." });
      }

      const payId = "pay-" + Date.now();
      const newPayment: Pagamento = {
        id: payId,
        atendimentoId,
        totalAmount,
        receivedAmount,
        change,
        method,
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

      res.status(201).json({ payment: newPayment, atendimento: at });
    } catch (error: any) {
      console.error("Error finalizing payment:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // History / Reports
  app.get("/api/reports", async (req, res) => {
    try {
      const { type, date, startDate, endDate } = req.query;

      const pagamentos = await getCollection<Pagamento>("pagamentos");
      const despesas = await getCollection<Despesa>("despesas");
      const atendimentos = await getCollection<Atendimento>("atendimentos");

      let filteredPayments: Pagamento[] = [];
      let startLimit: number;
      let endLimit: number;

      if (type === "daily") {
        const targetDateStr = (date as string) || new Date().toISOString().split("T")[0];
        startLimit = new Date(`${targetDateStr}T00:00:00`).getTime();
        endLimit = new Date(`${targetDateStr}T23:59:59.999`).getTime();
      } else {
        const sDate = (startDate as string) || new Date().toISOString().split("T")[0];
        const eDate = (endDate as string) || new Date().toISOString().split("T")[0];
        startLimit = new Date(`${sDate}T00:00:00`).getTime();
        endLimit = new Date(`${eDate}T23:59:59.999`).getTime();
      }

      // Filter payments in the range
      filteredPayments = pagamentos.filter(p => {
        const pTime = new Date(p.date).getTime();
        return pTime >= startLimit && pTime <= endLimit;
      });

      // Filter expenses in the range
      const filteredExpenses = despesas.filter(d => {
        const dTime = new Date(d.date).getTime();
        return dTime >= startLimit && dTime <= endLimit;
      });

      // Detailed service orders closed in this range
      const closedOrders = atendimentos.filter(a => {
        if (a.status !== "finalizado" || !a.exitDate) return false;
        const exitTime = new Date(a.exitDate).getTime();
        return exitTime >= startLimit && exitTime <= endLimit;
      });

      // Totals
      let totalCash = 0;
      let totalCard = 0;
      filteredPayments.forEach(p => {
        if (p.method === "cash") totalCash += p.totalAmount;
        else totalCard += p.totalAmount;
      });

      const totalRevenue = totalCash + totalCard;
      const totalExpense = filteredExpenses.reduce((acc, d) => acc + d.amount, 0);
      const balance = totalRevenue - totalExpense;

      res.json({
        payments: filteredPayments,
        expenses: filteredExpenses,
        closedOrders,
        summary: {
          cash: totalCash,
          card: totalCard,
          revenue: totalRevenue,
          expense: totalExpense,
          balance
        }
      });
    } catch (error: any) {
      console.error("Reports error:", error);
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
      server: { middlewareMode: true },
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
