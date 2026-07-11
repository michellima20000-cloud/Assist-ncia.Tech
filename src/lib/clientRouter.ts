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

      // Get target date (default to server's/client's local YYYY-MM-DD)
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

      const pagamentosSnap = await getDocs(collection(db, "pagamentos"));
      const pagamentos = pagamentosSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

      const despesasSnap = await getDocs(collection(db, "despesas"));
      const despesas = despesasSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

      const atendimentosSnap = await getDocs(collection(db, "atendimentos"));
      const atendimentos = atendimentosSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

      const getLocalDateStr = (isoString: string) => {
        if (!isoString) return "";
        if (offsetQuery === null) return isoString.substring(0, 10);
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return isoString.substring(0, 10);
        const localTime = new Date(date.getTime() - (offsetQuery * 60000));
        return localTime.toISOString().substring(0, 10);
      };

      let filteredPayments: any[] = [];
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

      filteredPayments = pagamentos.filter(p => {
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

    // 4.5 Atendimentos custom POST route
    if (path === "/api/atendimentos" && method === "POST") {
      const configRef = doc(db, "config", "main");
      let nextNum = 1;

      try {
        const configSnap = await getDoc(configRef);
        if (!configSnap.exists()) {
          await setDoc(configRef, {
            nextControlNumber: 2,
            printerConfigured: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: "system"
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
        totalAmount: body.totalAmount || 0
      };

      await setDoc(doc(db, "atendimentos", id), newAtendimento);

      return new Response(JSON.stringify(newAtendimento), {
        status: 201,
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

    // 5.5 Vendas Directas REST
    if (path === "/api/vendas" && method === "GET") {
      const snap = await getDocs(collection(db, "vendas"));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      // Sort sales by date descending
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return new Response(JSON.stringify(list), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (path === "/api/vendas" && method === "POST") {
      const { clienteId, clienteName, items, totalAmount, receivedAmount, change, method: payMethod, sellerId, sellerName } = body;

      if (!items || items.length === 0) {
        return new Response(JSON.stringify({ message: "A venda deve conter pelo menos um item." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Check stock
      for (const item of items) {
        const prodRef = doc(db, "produtos", item.productId);
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

      // Decrement stock for each item sold
      for (const item of items) {
        const prodRef = doc(db, "produtos", item.productId);
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
        sellerName: sellerName || "Balcão"
      };

      // Save venda document
      await setDoc(doc(db, "vendas", vendaId), newVenda);

      // Create matching payment entry so it registers in dashboard statistics, caixa flow, and financial summaries
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
      await setDoc(doc(db, "pagamentos", payId), newPayment);

      return new Response(JSON.stringify({ success: true, venda: newVenda, payment: newPayment }), {
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
