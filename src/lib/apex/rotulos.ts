import { TamanhoConta, TipoDrawdown, StatusConta } from "@prisma/client";

/** Textos de exibição pros enums da Apex — fica num lugar só. */

export const ROTULO_TAMANHO: Record<TamanhoConta, string> = {
  T25K: "$25K",
  T50K: "$50K",
  T100K: "$100K",
  T150K: "$150K",
};

export const SALDO_INICIAL_TAMANHO: Record<TamanhoConta, number> = {
  T25K: 25_000,
  T50K: 50_000,
  T100K: 100_000,
  T150K: 150_000,
};

export const ROTULO_TIPO: Record<TipoDrawdown, string> = {
  EOD: "EOD",
  INTRADAY: "Intraday",
};

export const ROTULO_STATUS: Record<StatusConta, string> = {
  ATIVA: "Ativa",
  LIBERADA_SAQUE: "Liberada pra saque",
  PAUSADA: "Pausada",
  VIOLADA: "Violada",
  ENCERRADA: "Encerrada",
};

export const CLASSE_STATUS: Record<StatusConta, string> = {
  ATIVA: "bg-superficie-alta text-texto-fraco",
  LIBERADA_SAQUE: "bg-positivo/15 text-positivo",
  PAUSADA: "bg-atencao/15 text-atencao",
  VIOLADA: "bg-negativo/15 text-negativo",
  ENCERRADA: "bg-superficie-alta text-texto-fraco",
};
