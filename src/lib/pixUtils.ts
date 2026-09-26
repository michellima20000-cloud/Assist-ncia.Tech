/**
 * Utilitários para geração de Payload PIX Padrão Banco Central (BR Code EMVCo)
 * Permite leitura nativa em qualquer aplicativo de banco (Nubank, Itaú, Bradesco, Inter, Santander, Mercado Pago, etc.)
 */

function crc16(str: string): string {
  let crc = 0xFFFF;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function emv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

export interface PixPayloadParams {
  key: string;
  name?: string;
  city?: string;
  amount?: number;
  txId?: string;
}

export function generatePixPayload({
  key,
  name = "MINHA ASSISTENCIA",
  city = "RECIFE",
  amount,
  txId = "***"
}: PixPayloadParams): string {
  const cleanKey = (key || "").trim();
  const cleanName = (name || "MINHA ASSISTENCIA")
    .substring(0, 25)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  const cleanCity = (city || "RECIFE")
    .substring(0, 15)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  const cleanTxId = (txId || "***")
    .replace(/[^A-Za-z0-9]/g, "")
    .substring(0, 25) || "***";

  const formattedAmount = typeof amount === "number" && amount > 0 ? amount.toFixed(2) : "";

  const merchantAccountInfo = emv("00", "br.gov.bcb.pix") + emv("01", cleanKey);
  const additionalData = emv("05", cleanTxId);

  const payloadWithoutCRC =
    emv("00", "01") +
    emv("01", "12") +
    emv("26", merchantAccountInfo) +
    emv("52", "0000") +
    emv("53", "986") +
    (formattedAmount ? emv("54", formattedAmount) : "") +
    emv("58", "BR") +
    emv("59", cleanName) +
    emv("60", cleanCity) +
    emv("62", additionalData) +
    "6304";

  const checksum = crc16(payloadWithoutCRC);
  return payloadWithoutCRC + checksum;
}
