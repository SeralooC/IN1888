"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";

export default function Home() {
  const [file, setFile] = useState(null);
  const [sheet, setSheet] = useState("");
  const [status, setStatus] = useState({ kind: "idle", message: "" }); // idle | loading | success | error
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const fileLabel = useMemo(() => {
    if (!file) return "Arraste e solte o Excel aqui, ou clique para selecionar";
    const kb = Math.ceil(file.size / 1024);
    return `${file.name} (${kb} KB)`;
  }, [file]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) setFile(f);
  }, []);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);
  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  function clearFile() {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!file) {
      setStatus({ kind: "error", message: "Selecione um arquivo Excel primeiro." });
      return;
    }

    try {
      setStatus({ kind: "loading", message: "Processando..." });
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
      a.href = url;
      a.download = "IN1888.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setStatus({ kind: "success", message: "Concluído. Arquivo baixado: IN1888.zip" });
    } catch (err) {
      setStatus({ kind: "error", message: err?.message || String(err) });
    }
  }

  const isLoading = status.kind === "loading";

  return (
    <main className="container mx-auto max-w-4xl px-4 py-12">
      {/* Hero */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Gerador IN1888</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Crie os arquivos 0110 (COMPRA) e 0120 (VENDA) a partir do seu Excel
        </p>
      </div>

      {/* Upload Card */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload da planilha
          </CardTitle>
          <CardDescription>
            Envie seu Excel (.xlsx/.xls). Opcional: informe o nome da aba.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-6" aria-busy={isLoading}>
            {/* Dropzone */}
            <div
              className={`group rounded-lg border-2 border-dashed p-6 transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/60"
              }`}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
            >
              <input
                ref={inputRef}
                id="file"
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Label
                htmlFor="file"
                className="flex cursor-pointer flex-col items-center gap-3 text-center"
                title="Selecionar arquivo"
              >
                <Upload className="h-7 w-7 opacity-80" />
                <span className="text-sm text-muted-foreground">{fileLabel}</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => inputRef.current?.click()}
                  >
                    Escolher arquivo
                  </Button>
                  {file && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearFile}
                      className="gap-1"
                      title="Remover arquivo"
                    >
                      <X className="h-4 w-4" />
                      Limpar
                    </Button>
                  )}
                </div>
              </Label>
            </div>

            {/* Aba opcional */}
            {/* <div className="grid gap-2">
              <Label htmlFor="sheet">Aba (opcional)</Label>
              <Input
                id="sheet"
                placeholder="Ex.: Movimentos"
                value={sheet}
                onChange={(e) => setSheet(e.target.value)}
                maxLength={60}
              />
            </div> */}

            {/* Ações */}
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={!file || isLoading} className="gap-2">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isLoading ? "Gerando..." : "Gerar IN1888 (ZIP)"}
              </Button>

              {file ? (
                <Badge variant="secondary" className="truncate max-w-[60%]">
                  {file.name}
                </Badge>
              ) : null}
            </div>

            {/* Status */}
            {status.kind === "success" && (
              <Alert className="border-green-500/30">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Sucesso</AlertTitle>
                <AlertDescription>{status.message}</AlertDescription>
              </Alert>
            )}
            {status.kind === "error" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Falhou</AlertTitle>
                <AlertDescription>{status.message}</AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>

        <CardFooter className="text-xs text-muted-foreground">
          Seus dados não são salvos. O processamento ocorre na função serverless desta aplicação.
        </CardFooter>
      </Card>

      {/* Requisitos */}
      <Card className="mt-8 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle>Requisitos de colunas</CardTitle>
          <CardDescription>As colunas podem ter variações de acento/maiúsculas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="ml-5 list-disc space-y-1 text-sm">
            <li>
              <code>DATA</code>
            </li>
            <li>
              <code>TIPO</code> — valores:{" "}
              <Badge variant="outline">COMPRA</Badge> /{" "}
              <Badge variant="outline">VENDA</Badge>
            </li>
            <li>
              <code>QUANTIDADE</code>
            </li>
            <li>
              <code>VALOR TOTAL</code>
            </li>
            <li>
              <code>TAXA FIXA</code>{" "}
              <span className="text-muted-foreground">
                (ou <code>Valor das taxas em reais</code>)
              </span>
            </li>
          </ul>
          <Separator />
          <p className="text-xs text-muted-foreground">
            Saída: dois TXT com layout pipe{" "}
            <code>CODIGO|DATA|I|VALOR|TAXA|CRIPTO|QTD|EXCHANGE|URL|PAIS</code>.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
