#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gerador de TXT IN1888 (layout pipe) com interface gráfica (Tkinter).
- Janela 1024x768 para escolher o arquivo Excel e (opcional) a aba e a pasta de saída.
- Gera dois relatórios TXT: 0110 (COMPRA) e 0120 (VENDA).
- Datas DDMMAAAA; vírgula decimal; quantidade com 10 casas; valores com 2 casas.
- Layout da linha: CODIGO|DATA|I|VALOR|TAXA|CRIPTO|QTD|EXCHANGE|URL|PAIS

Requisitos:
    pip install pandas openpyxl
"""

import os
import json
import unicodedata
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

import pandas as pd

import tkinter as tk
from tkinter import ttk, filedialog, messagebox


# ----------------- Utilidades -----------------

def strip_accents(s: str) -> str:
    if s is None:
        return ""
    s = unicodedata.normalize("NFKD", str(s))
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    return s.lower()


def pick_sheet(xls: pd.ExcelFile, requested: str | None) -> str:
    """Tenta resolver a aba informada (case/acento-insensitive); senão usa a primeira."""
    if requested and requested in xls.sheet_names:
        return requested
    if requested:
        want = strip_accents(requested)
        norm_map = {name: strip_accents(name) for name in xls.sheet_names}
        for name, norm in norm_map.items():
            if norm == want or want in norm:
                return name
    return xls.sheet_names[0]


def to_ddmmyyyy(x):
    if pd.isna(x):
        return ""
    if isinstance(x, (pd.Timestamp, datetime)):
        dt = x.to_pydatetime() if isinstance(x, pd.Timestamp) else x
        return dt.strftime("%d%m%Y")
    for dayfirst in (True, False):
        try:
            dt = pd.to_datetime(x, dayfirst=dayfirst, errors="raise")
            return dt.strftime("%d%m%Y")
        except Exception:
            continue
    return str(x)


def fmt_decimal_brl(value: Decimal, ndigits: int) -> str:
    if value is None:
        value = Decimal("0")
    q = Decimal(10) ** -ndigits
    val = (Decimal(value).quantize(q, rounding=ROUND_HALF_UP))
    val = abs(val)
    s = f"{val:.{ndigits}f}"
    return s.replace(".", ",")


# ----------------- Núcleo de geração -----------------

def gerar_relatorios(excel_path: str,
                     sheet_hint: str | None,
                     out_dir: str | None,
                     tipo_map: dict[str, str] | None = None,
                     ex_info: dict[str, dict] | None = None,
                     fix_I: str = "I"):
    """
    Lê a planilha Excel e gera dois arquivos:
      - *_0110_COMPRA.txt
      - *_0120_VENDA.txt
    no diretório out_dir (ou no mesmo diretório do Excel se None).
    Retorna um dicionário com paths e contagens.
    """
    if not os.path.exists(excel_path):
        raise FileNotFoundError(f"Arquivo não encontrado: {excel_path}")

    xls = pd.ExcelFile(excel_path)
    sheet_name = pick_sheet(xls, sheet_hint)
    df = pd.read_excel(excel_path, sheet_name=sheet_name)

    colmap = {
        "DATA": "data",
        "TIPO": "tipo",
        "DEPOSITANTE": "titular",
        # "Identificação da exchange": "exchange",
        # "Criptoativo negociado": "cripto",
        "QUANTIDADE": "qtd",
        "VALOR TOTAL": "valor",
        "TAXA FIXA": "taxa",
    }
    for col in colmap.keys():
        if col not in df.columns and col != "Valor das taxas em reais":
            raise KeyError(f"Coluna obrigatória ausente: {col}")
    if "Valor das taxas em reais" not in df.columns:
        df["Valor das taxas em reais"] = 0

    df_norm = pd.DataFrame()
    for src, dst in colmap.items():
        if src in df.columns:
            df_norm[dst] = df[src]

    df_norm["data"] = df_norm["data"].apply(to_ddmmyyyy)
    df_norm["tipo"] = df_norm["tipo"].astype(str).str.strip().str.upper()
    # df_norm["exchange"] = df_norm["exchange"].astype(str).str.strip().str.upper()
    df_norm["exchange"] = "BINANCE"
    df_norm["cripto"] = "USDT"
    # df_norm["cripto"] = df_norm["cripto"].astype(str).str.strip().str.upper()

    # defaults
    if tipo_map is None:
        tipo_map = {"COMPRA": "0110", "VENDA": "0120"}
    if ex_info is None:
        ex_info = {"BINANCE": {"url": "https://www.binance.com/", "pais": "KY"}}

    rows_0110, rows_0120 = [], []
    ignored = 0

    for _, r in df_norm.iterrows():
        codigo = tipo_map.get(r["tipo"])
        if codigo not in {"0110", "0120"}:
            ignored += 1
            continue

        data = r["data"]

        try:
            valor_brl = Decimal(str(r["valor"]))
        except Exception:
            valor_brl = Decimal("0")
        try:
            taxa_brl = Decimal(str(r["taxa"])) if pd.notna(r["taxa"]) else Decimal("0")
        except Exception:
            taxa_brl = Decimal("0")
        try:
            qtd = Decimal(str(r["qtd"]))
        except Exception:
            qtd = Decimal("0")

        valor_fmt = fmt_decimal_brl(valor_brl, 2)
        taxa_fmt = fmt_decimal_brl(taxa_brl, 2)
        qtd_fmt = fmt_decimal_brl(qtd, 10)

        ex = r["exchange"]
        info = ex_info.get(ex, {})
        url = info.get("url", "")
        pais = info.get("pais", "")

        line = "|".join([
            codigo,
            data,
            fix_I,
            valor_fmt,
            taxa_fmt,
            r["cripto"],
            qtd_fmt,
            ex,
            url,
            pais,
        ])

        if codigo == "0110":
            rows_0110.append(line)
        else:  # 0120
            rows_0120.append(line)

    # Saídas
    base_dir = out_dir or os.path.dirname(os.path.abspath(excel_path)) or "."
    base_name = os.path.splitext(os.path.basename(excel_path))[0]

    path_0110 = os.path.join(base_dir, f"IN1888_0110_COMPRA.txt")
    path_0120 = os.path.join(base_dir, f"IN1888_0120_VENDA.txt")

    with open(path_0110, "w", newline="", encoding="ascii") as f:
        f.write("\r\n".join(rows_0110) + "\r\n")
    with open(path_0120, "w", newline="", encoding="ascii") as f:
        f.write("\r\n".join(rows_0120) + "\r\n")


    return {
        "sheet_name": sheet_name,
        "ignored": ignored,
        "count_0110": len(rows_0110),
        "count_0120": len(rows_0120),
        "out_0110": path_0110,
        "out_0120": path_0120,
    }

class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Gerador IN1888 - 0110/0120")
        self.geometry("1024x768")

        # Estado das últimas saídas geradas
        self.last_info = None  # dict com keys: out_0110, out_0120, sheet_name, etc.

        # Vars
        self.var_file = tk.StringVar()
        self.var_outdir = tk.StringVar(value=self._default_outdir())

        # Layout
        pad = dict(padx=10, pady=10)
        frm = ttk.Frame(self)
        frm.pack(fill="both", expand=True, **pad)

        row = 0
        # Arquivo de entrada
        ttk.Label(frm, text="Arquivo Excel (.xlsx):").grid(row=row, column=0, sticky="w")
        ttk.Entry(frm, textvariable=self.var_file, width=70).grid(row=row, column=1, sticky="we")
        ttk.Button(frm, text="Escolher arquivo...", command=self.choose_file).grid(row=row, column=2, sticky="we")
        row += 1

        # Pasta de saída (default ~/Documents/in1888 ou ~/Documentos/in1888)
        ttk.Label(frm, text="Pasta de saída:").grid(row=row, column=0, sticky="w")
        ttk.Entry(frm, textvariable=self.var_outdir, width=70).grid(row=row, column=1, sticky="we")
        ttk.Button(frm, text="Escolher pasta...", command=self.choose_outdir).grid(row=row, column=2, sticky="we")
        row += 1

        ttk.Separator(frm).grid(row=row, column=0, columnspan=3, sticky="we", pady=10)
        row += 1

        # Ações: gerar e abrir relatórios IN1888
        ttk.Button(frm, text="Gerar relatórios (0110 e 0120)", command=self.on_generate, width=40)\
            .grid(row=row, column=0, columnspan=3, pady=5)
        row += 1

        # Botões "Abrir" referentes aos RELATÓRIOS IN1888
        btns = ttk.Frame(frm)
        btns.grid(row=row, column=0, columnspan=3, sticky="w")
        self.btn_open_outdir = ttk.Button(btns, text="Abrir pasta de saída", command=self.open_outdir)
        self.btn_open_outdir.grid(row=0, column=0, padx=(0, 6))
        self.btn_open_0110 = ttk.Button(btns, text="Abrir relatório 0110 (COMPRA)", command=self.open_report_0110)
        self.btn_open_0110.grid(row=0, column=1, padx=(0, 6))
        self.btn_open_0120 = ttk.Button(btns, text="Abrir relatório 0120 (VENDA)", command=self.open_report_0120)
        self.btn_open_0120.grid(row=0, column=2, padx=(0, 6))
        row += 1

        # Inicialmente, desabilita os botões de abrir relatórios (até gerar)
        self._set_report_buttons_state(enabled=False)

        # Status
        self.txt_status = tk.Text(frm, height=20)
        self.txt_status.grid(row=row, column=0, columnspan=3, sticky="nsew")
        frm.grid_columnconfigure(1, weight=1)
        frm.grid_rowconfigure(row, weight=1)

    # ---------- utilidades de caminho ----------
    def _default_outdir(self):
        import os
        home = os.path.expanduser("~")
        candidates = [
            os.path.join(home, "Documents", "in1888"),
            os.path.join(home, "Documentos", "in1888"),
        ]
        for path in candidates:
            try:
                os.makedirs(path, exist_ok=True)
                return path
            except Exception:
                continue
        # fallback: ./in1888
        fallback = os.path.abspath("./in1888")
        os.makedirs(fallback, exist_ok=True)
        return fallback

    def _set_report_buttons_state(self, enabled: bool):
        state = ("!disabled" if enabled else "disabled")
        try:
            self.btn_open_0110.state([state])
            self.btn_open_0120.state([state])
        except Exception:
            # Compatibilidade com versões antigas do ttk
            self.btn_open_0110.config(state=("normal" if enabled else "disabled"))
            self.btn_open_0120.config(state=("normal" if enabled else "disabled"))

    # ---------- ações UI ----------
    def choose_file(self):
        from tkinter import filedialog
        path = filedialog.askopenfilename(
            title="Selecione o arquivo Excel",
            filetypes=[("Excel", "*.xlsx;*.xls"), ("Todos os arquivos", "*.*")],
        )
        if path:
            self.var_file.set(path)
            # Ao trocar o arquivo, desabilita os botões de abrir relatórios até nova geração
            self.last_info = None
            self._set_report_buttons_state(False)

    def choose_outdir(self):
        from tkinter import filedialog
        import os
        path = filedialog.askdirectory(
            title="Selecione a pasta de saída",
            initialdir=self.var_outdir.get() or None
        )
        if path:
            os.makedirs(path, exist_ok=True)
            self.var_outdir.set(path)

    def open_outdir(self):
        import os, sys, subprocess
        out_dir = self.var_outdir.get().strip() or self._default_outdir()
        os.makedirs(out_dir, exist_ok=True)
        try:
            if sys.platform.startswith("win"):
                os.startfile(out_dir)  # type: ignore[attr-defined]
            elif sys.platform == "darwin":
                subprocess.call(["open", out_dir])
            else:
                subprocess.call(["xdg-open", out_dir])
        except Exception as e:
            from tkinter import messagebox
            messagebox.showerror("Erro", f"Não foi possível abrir a pasta de saída.\n{e}")

    def open_report_0110(self):
        self._open_report_key("out_0110", "0110 (COMPRA)")

    def open_report_0120(self):
        self._open_report_key("out_0120", "0120 (VENDA)")

    def _open_report_key(self, key: str, label: str):
        import os, sys, subprocess
        from tkinter import messagebox
        if not self.last_info or key not in self.last_info:
            messagebox.showwarning("Atenção", f"Gere os relatórios antes de abrir o {label}.")
            return
        path = self.last_info[key]
        if not path or not os.path.exists(path):
            messagebox.showwarning("Atenção", f"O arquivo do relatório {label} não foi encontrado.")
            return
        try:
            if sys.platform.startswith("win"):
                os.startfile(path)  # type: ignore[attr-defined]
            elif sys.platform == "darwin":
                subprocess.call(["open", path])
            else:
                subprocess.call(["xdg-open", path])
        except Exception as e:
            messagebox.showerror("Erro", f"Não foi possível abrir o relatório {label}.\n{e}")

    def log(self, msg: str):
        self.txt_status.insert("end", msg + "\n")
        self.txt_status.see("end")

    def on_generate(self):
        from tkinter import messagebox
        import os
        excel_path = self.var_file.get().strip()
        if not excel_path:
            messagebox.showwarning("Atenção", "Escolha um arquivo Excel primeiro.")
            return
        out_dir = self.var_outdir.get().strip() or self._default_outdir()
        os.makedirs(out_dir, exist_ok=True)
        try:
            # gerar_relatorios deve existir no módulo
            info = gerar_relatorios(
                excel_path=excel_path,
                sheet_hint=None,          # sem campo de aba; núcleo resolve
                out_dir=out_dir,
                tipo_map={"COMPRA": "0110", "VENDA": "0120"},
                ex_info={"BINANCE": {"url": "https://www.binance.com/", "pais": "KY"}},
                fix_I="I",
            )
            self.last_info = info
            self.log(f"Arquivo origem: {excel_path}")
            self.log(f"Aba utilizada: {info['sheet_name']}")
            self.log(f"0110 (COMPRA): {info['out_0110']}  | linhas: {info['count_0110']}")
            self.log(f"0120 (VENDA):  {info['out_0120']}   | linhas: {info['count_0120']}")
            if info.get("ignored"):
                self.log(f"Atenção: {info['ignored']} linha(s) ignorada(s) (não eram COMPRA/VENDA).")
            # Habilita botões de abrir relatórios
            self._set_report_buttons_state(True)
            messagebox.showinfo("Concluído", "Relatórios IN1888 gerados com sucesso!")
        except Exception as e:
            self._set_report_buttons_state(False)
            messagebox.showerror("Erro", str(e))
            self.log(f"ERRO: {e}")


if __name__ == "__main__":
    app = App()
    app.mainloop()


