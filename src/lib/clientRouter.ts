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

export async function handleClientRoute(url: string, init?: RequestInit): Promise<Response> {
  try {
    const urlObj = new URL(url, window.location.origin);
    const path = urlObj.pathname;
    const method = init?.method?.toUpperCase() || "GET";
    
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
        const usersSnap = await getDocs(query(collection(db, "users"), limit(1)));
        const isFirstUser = usersSnap.empty;
        const isAdminEmail = emailLower === "michel.lima20000@gmail.com" || emailLower === "admin@minhaassistencia.com";
        const role = (isFirstUser || isAdminEmail) ? "admin" : "employee";

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
          role: existingData.role || "employee"
        };
      }

      return new Response(JSON.stringify({ user: userToReturn, token: "client-side-session-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 3. Stats Dashboard route
    if (path === "/api/stats" && method === "GET") {
      const atendimentosSnap = await getDocs(collection(db, "atendimentos"));
      const atendimentos = atendimentosSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

      const pagamentosSnap = await getDocs(collection(db, "pagamentos"));
      const pagamentos = pagamentosSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

      const despesasSnap = await getDocs(collection(db, "despesas"));
      const despesas = despesasSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

      const naAssistenciaCount = atendimentos.filter(a => a.status === "na_assistencia").length;
      const entregaCount = atendimentos.filter(a => a.status === "entrega").length;

      let cash = 0;
      let card = 0;
      let totalCollected = 0;

      pagamentos.forEach(p => {
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

      const expenses = despesas.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);

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

      const pagamentosSnap = await getDocs(collection(db, "pagamentos"));
      const pagamentos = pagamentosSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

      const despesasSnap = await getDocs(collection(db, "despesas"));
      const despesas = despesasSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

      const atendimentosSnap = await getDocs(collection(db, "atendimentos"));
      const atendimentos = atendimentosSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

      let filteredPayments: any[] = [];
      let startLimit: number;
      let endLimit: number;

      if (type === "daily") {
        const targetDateStr = dateParam || new Date().toISOString().split("T")[0];
        startLimit = new Date(`${targetDateStr}T00:00:00`).getTime();
        endLimit = new Date(`${targetDateStr}T23:59:59.999`).getTime();
      } else {
        const sDate = startDateParam || new Date().toISOString().split("T")[0];
        const eDate = endDateParam || new Date().toISOString().split("T")[0];
        startLimit = new Date(`${sDate}T00:00:00`).getTime();
        endLimit = new Date(`${eDate}T23:59:59.999`).getTime();
      }

      filteredPayments = pagamentos.filter(p => {
        if (!p.date) return false;
        const pTime = new Date(p.date).getTime();
        return pTime >= startLimit && pTime <= endLimit;
      });

      const filteredExpenses = despesas.filter(d => {
        if (!d.date) return false;
        const dTime = new Date(d.date).getTime();
        return dTime >= startLimit && dTime <= endLimit;
      });

      const closedOrders = atendimentos.filter(a => {
        if (a.status !== "finalizado" || !a.exitDate) return false;
        const exitTime = new Date(a.exitDate).getTime();
        return exitTime >= startLimit && exitTime <= endLimit;
      });

      let totalCash = 0;
      let totalCard = 0;
      filteredPayments.forEach(p => {
        const amount = Number(p.totalAmount || 0);
        if (p.method === "cash") totalCash += amount;
        else totalCard += amount;
      });

      const totalRevenue = totalCash + totalCard;
      const totalExpense = filteredExpenses.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
      const balance = totalRevenue - totalExpense;

      return new Response(JSON.stringify({
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
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 5. Payments finalization route
    if (path === "/api/pagamentos" && method === "POST") {
      const { atendimentoId, totalAmount, receivedAmount, change, method: payMethod, notesFin } = body;

      const atRef = doc(db, "atendimentos", atendimentoId);
      const atSnap = await getDoc(atRef);
      if (!atSnap.exists()) {
        return new Response(JSON.stringify({ message: "Atendimento não encontrado." }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      const at = { id: atSnap.id, ...atSnap.data() } as any;
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

      await setDoc(doc(db, "pagamentos", payId), newPayment);

      // Update Atendimento
      at.status = "finalizado";
      at.exitDate = new Date().toISOString();
      at.paymentId = payId;
      at.notesFin = notesFin || "";
      await setDoc(atRef, at);

      // Deduct inventory
      const products = at.products || [];
      for (const atProd of products) {
        const prodRef = doc(db, "produtos", atProd.productId);
        const prodSnap = await getDoc(prodRef);
        if (prodSnap.exists()) {
          const p = { id: prodSnap.id, ...prodSnap.data() } as any;
          p.stock = Math.max(0, (Number(p.stock) || 0) - (Number(atProd.quantity) || 0));
          await setDoc(prodRef, p);
        }
      }

      return new Response(JSON.stringify({ payment: newPayment, atendimento: at }), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 6. Generic Collections Handler
    const match = path.match(/^\/api\/([a-zA-Z0-9_-]+)(?:\/([a-zA-Z0-9_.-]+))?$/);
    if (match) {
      const collectionName = match[1];
      const docId = match[2];

      // GET Collection or Doc
      if (method === "GET") {
        if (docId) {
          const docSnap = await getDoc(doc(db, collectionName, docId));
          if (!docSnap.exists()) {
            return new Response(JSON.stringify({ message: "Documento não encontrado" }), {
              status: 404,
              headers: { "Content-Type": "application/json" }
            });
          }
          return new Response(JSON.stringify({ id: docSnap.id, ...docSnap.data() }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        } else {
          const snap = await getDocs(collection(db, collectionName));
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
        await setDoc(doc(db, collectionName, newId), finalData);
        return new Response(JSON.stringify(finalData), {
          status: 201,
          headers: { "Content-Type": "application/json" }
        });
      }

      // PUT Update document
      if (method === "PUT" && docId) {
        const docRef = doc(db, collectionName, docId);
        await setDoc(docRef, body, { merge: true });
        return new Response(JSON.stringify({ id: docId, ...body }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // DELETE document
      if (method === "DELETE" && docId) {
        const docRef = doc(db, collectionName, docId);
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
