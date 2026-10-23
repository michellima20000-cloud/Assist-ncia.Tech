import { jsPDF } from "jspdf";
import { Checklist } from "../types";

export function generateChecklistPDF(
  checklist: Checklist | null,
  isBlank = false,
  companyName = "ASSISTÊNCIA TÉCNICA ESPECIALIZADA",
  companyPhone = "",
  companyCnpj = ""
): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = 210;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 190mm

  // Colors
  const black = 0;
  doc.setTextColor(black);
  doc.setDrawColor(black);

  let currentY = 12;

  // 1. STORE HEADER (if provided)
  if (companyName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(companyName.toUpperCase(), pageWidth / 2, currentY, { align: "center" });
    currentY += 4.5;

    if (companyPhone || companyCnpj) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const subHeader = [
        companyCnpj ? `CNPJ: ${companyCnpj}` : "",
        companyPhone ? `WhatsApp / Fone: ${companyPhone}` : ""
      ]
        .filter(Boolean)
        .join(" • ");
      doc.text(subHeader, pageWidth / 2, currentY, { align: "center" });
      currentY += 4;
    }

    doc.setLineWidth(0.4);
    doc.line(margin, currentY, margin + contentWidth, currentY);
    currentY += 5;
  }

  // 2. HEADER: TYPE CHECKBOXES & DOCUMENT NUMBER
  const isOrcamento = !isBlank && checklist?.docType === "orcamento";
  const isOS = !isBlank && checklist?.docType !== "orcamento";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);

  // Box ORÇAMENTO
  doc.setLineWidth(0.5);
  doc.rect(margin, currentY, 4, 4);
  if (isOrcamento) {
    doc.text("X", margin + 0.8, currentY + 3.2);
  }
  doc.text("ORÇAMENTO", margin + 6, currentY + 3.5);

  // Box ORDEM DE SERVIÇO
  const osX = margin + 45;
  doc.rect(osX, currentY, 4, 4);
  if (isOS) {
    doc.text("X", osX + 0.8, currentY + 3.2);
  }
  doc.text("ORDEM DE SERVIÇO", osX + 6, currentY + 3.5);

  // Number / Date
  if (!isBlank && checklist?.numeroDoc) {
    doc.setFont("helvetica", "bold");
    doc.text(`Nº ${checklist.numeroDoc}`, margin + contentWidth, currentY + 3.5, { align: "right" });
  }

  currentY += 7;

  // 3. TOP SECTION: CLIENT & DEVICE INFO (Left) + DESBLOQUEIO DE TELA (Right)
  const patternBoxWidth = 44;
  const patternBoxHeight = 44;
  const patternBoxX = margin + contentWidth - patternBoxWidth;
  const leftInfoWidth = contentWidth - patternBoxWidth - 4;

  // Draw DESBLOQUEIO DE TELA Box
  doc.setLineWidth(0.5);
  doc.roundedRect(patternBoxX, currentY, patternBoxWidth, patternBoxHeight, 3, 3);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("DESBLOQUEIO DE TELA", patternBoxX + patternBoxWidth / 2, currentY + 5, { align: "center" });

  // 3x3 pattern dots
  const dotStartX = patternBoxX + 9;
  const dotStartY = currentY + 12;
  const dotStep = 13;

  const dotCoords: Array<{ x: number; y: number }> = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const dx = dotStartX + c * dotStep;
      const dy = dotStartY + r * dotStep;
      dotCoords.push({ x: dx, y: dy });

      // Outer ring
      doc.setLineWidth(0.3);
      doc.circle(dx, dy, 3.8, "S");
      // Center dot
      doc.circle(dx, dy, 0.9, "FD");
    }
  }

  // Draw pattern lines if present and not blank
  if (!isBlank && Array.isArray(checklist?.senhaPadrao) && checklist.senhaPadrao.length > 1) {
    doc.setLineWidth(0.8);
    for (let i = 0; i < checklist.senhaPadrao.length - 1; i++) {
      const fromIdx = checklist.senhaPadrao[i];
      const toIdx = checklist.senhaPadrao[i + 1];
      if (dotCoords[fromIdx] && dotCoords[toIdx]) {
        doc.line(dotCoords[fromIdx].x, dotCoords[fromIdx].y, dotCoords[toIdx].x, dotCoords[toIdx].y);
      }
    }
  }

  // Left Info Lines
  let lineY = currentY + 4;
  const lineGap = 6.8;

  // Line 1: Nome
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Nome:", margin, lineY);
  doc.setFont("helvetica", "normal");
  doc.text(!isBlank ? checklist?.clienteNome || "" : "", margin + 12, lineY);
  doc.setLineWidth(0.2);
  doc.line(margin + 12, lineY + 1, margin + leftInfoWidth, lineY + 1);

  // Line 2: RG/CPF & Telefone
  lineY += lineGap;
  const col2Split = margin + leftInfoWidth / 2;
  doc.setFont("helvetica", "bold");
  doc.text("RG/CPF:", margin, lineY);
  doc.setFont("helvetica", "normal");
  doc.text(!isBlank ? checklist?.rgCpf || "" : "", margin + 15, lineY);
  doc.line(margin + 15, lineY + 1, col2Split - 3, lineY + 1);

  doc.setFont("helvetica", "bold");
  doc.text("Telefone:", col2Split, lineY);
  doc.setFont("helvetica", "normal");
  doc.text(!isBlank ? checklist?.telefone || "" : "", col2Split + 16, lineY);
  doc.line(col2Split + 16, lineY + 1, margin + leftInfoWidth, lineY + 1);

  // Line 3: Data Entrada & Marca/Modelo
  lineY += lineGap;
  doc.setFont("helvetica", "bold");
  doc.text("Data Entrada:", margin, lineY);
  doc.setFont("helvetica", "normal");
  doc.text(
    !isBlank && checklist?.dataEntrada
      ? new Date(checklist.dataEntrada + "T12:00:00").toLocaleDateString("pt-BR")
      : "___/___/______",
    margin + 21,
    lineY
  );
  doc.line(margin + 21, lineY + 1, col2Split - 3, lineY + 1);

  doc.setFont("helvetica", "bold");
  doc.text("Marca/Mod:", col2Split, lineY);
  doc.setFont("helvetica", "normal");
  doc.text(!isBlank ? checklist?.marcaModelo || "" : "", col2Split + 19, lineY);
  doc.line(col2Split + 19, lineY + 1, margin + leftInfoWidth, lineY + 1);

  // Line 4: Senha, IMEI, GB
  lineY += lineGap;
  const col3_1 = margin + leftInfoWidth * 0.35;
  const col3_2 = margin + leftInfoWidth * 0.72;

  doc.setFont("helvetica", "bold");
  doc.text("Senha:", margin, lineY);
  doc.setFont("helvetica", "normal");
  doc.text(!isBlank ? checklist?.senhaTexto || "" : "", margin + 12, lineY);
  doc.line(margin + 12, lineY + 1, col3_1 - 3, lineY + 1);

  doc.setFont("helvetica", "bold");
  doc.text("IMEI:", col3_1, lineY);
  doc.setFont("helvetica", "normal");
  doc.text(!isBlank ? checklist?.imei || "" : "", col3_1 + 10, lineY);
  doc.line(col3_1 + 10, lineY + 1, col3_2 - 3, lineY + 1);

  doc.setFont("helvetica", "bold");
  doc.text("GB:", col3_2, lineY);
  doc.setFont("helvetica", "normal");
  doc.text(!isBlank ? checklist?.gbMemoria || "" : "", col3_2 + 8, lineY);
  doc.line(col3_2 + 8, lineY + 1, margin + leftInfoWidth, lineY + 1);

  currentY += patternBoxHeight + 3;

  // 4. MAIN BOX: LISTA DE CHECAGEM (CHECKLIST)
  const checklistBoxHeight = 84;
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, currentY, contentWidth, checklistBoxHeight, 3, 3);

  // Checklist Title bar
  doc.setFillColor(240, 240, 240);
  doc.rect(margin + 0.5, currentY + 0.5, contentWidth - 1, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("LISTA DE CHECAGEM (CHECKLIST)", pageWidth / 2, currentY + 4.8, { align: "center" });
  doc.line(margin, currentY + 6.5, margin + contentWidth, currentY + 6.5);

  // Split line down the middle
  const splitX = margin + contentWidth * 0.52;
  doc.line(splitX, currentY + 6.5, splitX, currentY + checklistBoxHeight);

  // Subtitle Left: "Os itens abaixo estão em condições de utilização?"
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Os itens abaixo estão em condições de utilização?", margin + (splitX - margin) / 2, currentY + 10.5, {
    align: "center"
  });
  doc.setLineWidth(0.2);
  doc.line(margin + 4, currentY + 12, splitX - 4, currentY + 12);

  // Checklist Items (Left Side)
  const defaultItems = [
    "Tela de Display",
    "Touch Screen",
    "Teclas",
    "Sensores de proximidade",
    "Bluetooth",
    "Wi-fi",
    "Ligações",
    "Microfone / Áudio",
    "Câmera Frontal",
    "Câmera Traseira",
    "Conector de Carga",
    "Bateria / Carcaça"
  ];

  let itemY = currentY + 16.5;
  const itemStep = 5.4;

  defaultItems.forEach(name => {
    let status = "";
    if (!isBlank && checklist?.items) {
      const found = checklist.items.find(i => i.name.toLowerCase() === name.toLowerCase());
      if (found) status = found.status;
    }

    const isSim = status === "sim";
    const isNao = status === "nao";

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(`${name} ............................`, margin + 3, itemY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(`( ${isSim ? "X" : " "} ) Sim`, splitX - 25, itemY);
    doc.text(`( ${isNao ? "X" : " "} ) Não`, splitX - 12, itemY);

    itemY += itemStep;
  });

  // Right Side: Device Silhouettes & Damage Map
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text('assinale com "X" os locais com possíveis avarias', splitX + (margin + contentWidth - splitX) / 2, currentY + 10.5, {
    align: "center"
  });

  // Draw 4 phone outlines (Lado 1, Lado 2, Frente, Traseira, Superior, Inferior)
  const diagCenterX = splitX + (margin + contentWidth - splitX) / 2;

  // Superior & Inferior
  const supY = currentY + 14;
  doc.setLineWidth(0.3);
  doc.roundedRect(diagCenterX - 28, supY, 24, 5, 2.5, 2.5);
  doc.circle(diagCenterX - 16, supY + 2.5, 0.6, "FD");
  doc.setFontSize(5.5);
  doc.text("SUPERIOR", diagCenterX - 16, supY + 8, { align: "center" });

  doc.roundedRect(diagCenterX + 4, supY, 24, 5, 2.5, 2.5);
  doc.roundedRect(diagCenterX + 13, supY + 1.2, 6, 2.6, 1, 1);
  doc.text("INFERIOR", diagCenterX + 16, supY + 8, { align: "center" });

  // Middle 4 views: Lado 1, Lado 2, Frente, Traseira
  const midY = currentY + 26;
  const phoneH = 46;

  // Lado 1
  doc.roundedRect(diagCenterX - 38, midY, 4.5, phoneH, 1.5, 1.5);
  doc.rect(diagCenterX - 39.5, midY + 10, 1.5, 6, "F");
  doc.rect(diagCenterX - 39.5, midY + 18, 1.5, 6, "F");
  doc.text("LADO 1", diagCenterX - 36, midY + phoneH + 4, { align: "center" });

  // Lado 2
  doc.roundedRect(diagCenterX - 28, midY, 4.5, phoneH, 1.5, 1.5);
  doc.rect(diagCenterX - 23.5, midY + 12, 1.5, 8, "F");
  doc.text("LADO 2", diagCenterX - 26, midY + phoneH + 4, { align: "center" });

  // Frente
  const frenteX = diagCenterX - 18;
  const frenteW = 26;
  doc.roundedRect(frenteX, midY, frenteW, phoneH, 4, 4);
  doc.roundedRect(frenteX + 2, midY + 3.5, frenteW - 4, phoneH - 7, 2, 2);
  doc.rect(frenteX + 9, midY + 1.8, 8, 1, "F"); // Ear speaker
  doc.circle(frenteX + frenteW / 2, midY + 5, 0.7, "FD"); // Camera
  doc.text("FRENTE", frenteX + frenteW / 2, midY + phoneH + 4, { align: "center" });

  // Traseira
  const trasX = diagCenterX + 12;
  const trasW = 26;
  doc.roundedRect(trasX, midY, trasW, phoneH, 4, 4);
  doc.roundedRect(trasX + 2, midY + 3, 9, 11, 2, 2);
  doc.circle(trasX + 6.5, midY + 6, 1.4, "S");
  doc.circle(trasX + 6.5, midY + 10.5, 1.4, "S");
  doc.text("TRASEIRA", trasX + trasW / 2, midY + phoneH + 4, { align: "center" });

  // Draw X on damaged views if present
  if (!isBlank && Array.isArray(checklist?.damageMarks)) {
    checklist.damageMarks.forEach(m => {
      let targetX = diagCenterX;
      let targetY = midY + 20;

      if (m.view === "lado1") {
        targetX = diagCenterX - 36;
        targetY = midY + (m.y / 100) * phoneH;
      } else if (m.view === "lado2") {
        targetX = diagCenterX - 26;
        targetY = midY + (m.y / 100) * phoneH;
      } else if (m.view === "frente") {
        targetX = frenteX + (m.x / 100) * frenteW;
        targetY = midY + (m.y / 100) * phoneH;
      } else if (m.view === "traseira") {
        targetX = trasX + (m.x / 100) * trasW;
        targetY = midY + (m.y / 100) * phoneH;
      } else if (m.view === "superior") {
        targetX = diagCenterX - 16;
        targetY = supY + 2.5;
      } else if (m.view === "inferior") {
        targetX = diagCenterX + 16;
        targetY = supY + 2.5;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("X", targetX - 1.2, targetY + 1.2);
    });
  }

  currentY += checklistBoxHeight + 5;

  // 5. PROBLEMA RELATADO & SERVIÇO EXECUTADO & VALOR
  // Problema Relatado
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Problema Relatado:", margin, currentY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(!isBlank ? checklist?.problemaRelatado || "" : "", margin + 32, currentY);
  doc.setLineWidth(0.2);
  doc.line(margin + 32, currentY + 1, margin + contentWidth, currentY + 1);

  currentY += 6.5;

  // Serviço Executado / Previsto & VALOR R$
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Serviço Executado:", margin, currentY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(!isBlank ? checklist?.servicoExecutado || "" : "", margin + 32, currentY);

  const valorStr = !isBlank && checklist?.valor ? `R$ ${checklist.valor.toFixed(2).replace(".", ",")}` : "____________";
  doc.setFont("helvetica", "bold");
  doc.text(`VALOR R$: ${valorStr}`, margin + contentWidth - 42, currentY);
  doc.line(margin + 32, currentY + 1, margin + contentWidth - 45, currentY + 1);

  currentY += 8;

  // 6. TERMOS E CONDIÇÕES DE GARANTIA (Exact text from image)
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, margin + contentWidth, currentY);
  currentY += 4;

  const garantiaDias = !isBlank ? checklist?.diasGarantia || 90 : "_____";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(`1) REPARO REALIZADOS SÃO GARANTIDOS POR: ${garantiaDias} DIAS`, margin, currentY);
  currentY += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.text(
    "2) Os telefones reparados que não forem retirados em 90 dias, após a aprovação do orçamento passarão a ser propriedade da loja,",
    margin,
    currentY
  );
  currentY += 3.2;
  doc.text("que poderá vendê-los para ressarcir-se dos custos incorridos.", margin + 3, currentY);
  currentY += 4;

  doc.text(
    "3) Ao deixar seu celular para reparo, retirar seu chip e cartão de memória. Não nos responsabilizamos por chip e cartão de memória.",
    margin,
    currentY
  );
  currentY += 4.5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(
    "A GARANTIA DA PEÇA TROCADA NÃO GARANTE MAU USO, QUEDAS, TRINCOS, MOLHADOS, UMIDADE, OU ABERTO POR TERCEIROS.",
    margin,
    currentY
  );
  currentY += 6;

  // 7. SIGNATURE & RETIRADA
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, margin + contentWidth, currentY);
  currentY += 3.5;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.text("cliente de acordo com as condições acima", pageWidth / 2, currentY, { align: "center" });
  currentY += 6;

  const retiradaY = currentY + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(
    `Retirado em: ${!isBlank && checklist?.retiradoEm ? checklist.retiradoEm : "____/____/________"}`,
    margin,
    retiradaY
  );

  doc.text(
    "Assinatura do Cliente: __________________________________________________",
    margin + 65,
    retiradaY
  );

  return doc;
}
