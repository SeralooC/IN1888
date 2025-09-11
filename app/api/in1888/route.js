// app/api/in1888/route.js
export const runtime = "nodejs";      // garante Node runtime na Vercel (não Edge)
export const dynamic = "force-dynamic";

import * as XLSX from "xlsx";
import Decimal from "decimal.js";
import JSZip from "jszip";

// ---------- utilidades ----------
function stripAccents(s) {
  if (s == null) return "";
  return s
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function pickSheet(workbook, requested) {
  const names = workbook.SheetNames || [];
  if (!names.length) throw new Error("Arquivo Excel sem abas.");
  if (requested && names.includes(requested)) return requested;

  if (requested) {
    const want = stripAccents(requested);
    for (const n of names) {
      const norm = stripAccents(n);
      if (norm === want || norm.includes(want)) return n;
    }
  }
  return names[0];
}

// Excel serial date -> JS Date (base 1899-12-30)
function excelSerialToDate(n) {
  const epoch = Date.UTC(1899, 11, 30);
  return new Date(epoch + n * 86400000);
}

function toDDMMYYYY(value) {
  if (value == null || value === "") return "";
  // Date objeto?
  if (value instanceof Date && !isNaN(value.getTime())) {
    const dd = String(value.getDate()).padStart(2, "0");
    const mm = String(value.getMonth() + 1).padStart(2, "0");
    const yyyy = value.getFullYear();
    return `${dd}${mm}${yyyy}`;
  }
  // Número (serial Excel)?
  if (typeof value === "number" && isFinite(value)) {
    const d = excelSerialToDate(value);
    if (!isNaN(d)) return toDDMMYYYY(d);
  }
  // String comum (tenta dd/mm/yyyy e yyyy-mm-dd)
  if (typeof value === "string") {
    const s = value.trim();
    let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
      let [_, d, mth, y] = m;
      if (y.length === 2) y = (parseInt(y, 10) + 2000).toString();
      return `${d.padStart(2, "0")}${mth.padStart(2, "0")}${y}`;
    }
    m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (m) {
      const [_, y, mth, d] = m;
      return `${String(d).padStart(2, "0")}${String(mth).padStart(2, "0")}${y}`;
    }
  }
  // fallback
  return String(value);
}

function fmtDecimalBR(value, ndigits) {
  const v = value == null || value === "" ? new Decimal(0) : new Decimal(String(value));
  // HALF_UP
  const fixed = v.abs().toDecimalPlaces(ndigits, Decimal.ROUND_HALF_UP).toFixed(ndigits);
  return fixed.replace(".", ",");
}

function normalizeHeaders(row) {
  const out = {};
  for (const k of Object.keys(row)) {
    out[stripAccents(k)] = row[k];
  }
  return out;
}

// ---------- núcleo ----------
function gerarRelatoriosFromRows(rows, { sheetName, tipoMap, exInfo, fixI }) {
  const rows0110 = [];
  const rows0120 = [];
  let ignored = 0;

  const get = (normRow, keyVariants) => {
    for (const k of keyVariants) {
      const v = normRow[stripAccents(k)];
      if (v !== undefined) return v;
    }
    return undefined;
  };

  for (const r of rows) {
    const R = normalizeHeaders(r);

    const dataRaw  = get(R, ["DATA"]);
    const tipoRaw  = get(R, ["TIPO"]);
    const qtdRaw   = get(R, ["QUANTIDADE"]);
    const valorRaw = get(R, ["VALOR TOTAL", " VALOR TOTAL"]);
    // taxa: pode vir em "TAXA FIXA" ou "Valor das taxas em reais"
    const taxaRaw  = get(R, ["TAXA FIXA", "Valor das taxas em reais"]);

    const tipo = (tipoRaw ?? "").toString().trim().toUpperCase();
    const codigo = tipoMap[tipo]; // "0110" ou "0120"

    if (!codigo || (codigo !== "0110" && codigo !== "0120")) {
      ignored += 1;
      continue;
    }

    const data = toDDMMYYYY(dataRaw);

    let valorFmt, taxaFmt, qtdFmt;
    try { valorFmt = fmtDecimalBR(valorRaw, 2); } catch { valorFmt = fmtDecimalBR(0, 2); }
    try { taxaFmt  = fmtDecimalBR(taxaRaw ?? 0, 2); } catch { taxaFmt  = fmtDecimalBR(0, 2); }
    try { qtdFmt   = fmtDecimalBR(qtdRaw, 10); } catch { qtdFmt   = fmtDecimalBR(0, 10); }

    const exchange = "BINANCE";
    const cripto   = "USDT";
    const info     = exInfo[exchange] || {};
    const url      = info.url  || "";
    const pais     = info.pais || "";

    const line = [
      codigo,
      data,
      fixI,
      valorFmt,
      taxaFmt,
      cripto,
      qtdFmt,
      exchange,
      url,
      pais,
    ].join("|");

    if (codigo === "0110") rows0110.push(line);
    else rows0120.push(line);
  }

  const txt0110 = rows0110.join("\r\n") + "\r\n";
  const txt0120 = rows0120.join("\r\n") + "\r\n";

  return {
    sheetName,
    ignored,
    count0110: rows0110.length,
    count0120: rows0120.length,
    txt0110,
    txt0120,
  };
}

// ---------- handler ----------
export async function POST(request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const sheetHint = form.get("sheet"); // opcional

    if (!(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: "Envie o arquivo Excel em 'file' (multipart/form-data)." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer", cellDates: true });

    const sheetName = pickSheet(wb, sheetHint ? String(sheetHint) : null);
    const ws = wb.Sheets[sheetName];
    if (!ws) throw new Error("Aba não encontrada.");

    // Lê linhas como objetos (cada header vira chave)
    const rows = XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });

    const tipoMap = { COMPRA: "0110", VENDA: "0120" };
    const exInfo  = { BINANCE: { url: "https://www.binance.com/", pais: "KY" } };
    const fixI    = "I";

    const result = gerarRelatoriosFromRows(rows, { sheetName, tipoMap, exInfo, fixI });

    // Empacota num ZIP com dois arquivos TXT + metadados JSON (opcional)
    const zip = new JSZip();
    zip.file("IN1888_0110_COMPRA.txt", result.txt0110, { binary: false });
    zip.file("IN1888_0120_VENDA.txt",  result.txt0120,  { binary: false });
    zip.file(
      "IN1888_meta.json",
      JSON.stringify(
        {
          sheet_name: result.sheetName,
          ignored: result.ignored,
          count_0110: result.count0110,
          count_0120: result.count0120,
        },
        null,
        2
      )
    );

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="IN1888.zip"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
