"use client";
import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState(null);
  const [sheet, setSheet] = useState("");
  const [status, setStatus] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    if (!file) { setStatus("Selecione um arquivo Excel."); return; }

    try {
      setStatus("Processando...");
      const form = new FormData();
      form.append("file", file);
      if (sheet.trim()) form.append("sheet", sheet.trim());

      const res = await fetch("/api/in1888", { method: "POST", body: form });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Erro HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "IN1888.zip"; document.body.appendChild(a);
      a.click(); a.remove(); URL.revokeObjectURL(url);
      setStatus("Concluído. Arquivo baixado: IN1888.zip");
    } catch (err) {
      setStatus(`Erro: ${err.message || String(err)}`);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <h1>Gerador IN1888 (0110 / 0120)</h1>
      <p>Envie seu Excel (.xlsx/.xls)</p>
      <form onSubmit={onSubmit}>
        <div style={{ margin: "12px 0" }}>
          <input
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div style={{ margin: "12px 0" }}>
          <label>
            Aba (opcional):{" "}
            <input value={sheet} onChange={(e) => setSheet(e.target.value)} placeholder="Ex.: Movimentos" />
          </label>
        </div>
        <button type="submit">Gerar IN1888 (ZIP)</button>
      </form>
      <p style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>{status}</p>
      <details>
        <summary>Requisitos de colunas</summary>
        <ul>
          <li>DATA</li>
          <li>TIPO (COMPRA/VENDA)</li>
          <li>QUANTIDADE</li>
          <li>VALOR TOTAL</li>
          <li>TAXA FIXA ou Valor das taxas em reais (opcional; se faltar, usa 0)</li>
        </ul>
      </details>
    </main>
  );
}
