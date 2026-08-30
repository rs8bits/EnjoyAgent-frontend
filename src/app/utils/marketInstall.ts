import type { InstallMarketAssetPayload, MarketAssetType } from "@/app/types/market";

export interface MarketInstallFormValues {
  name: string;
  targetModelConfigId: string;
  targetOfficialModelConfigId: string;
  targetKnowledgeBaseId: string;
  targetRerankModelConfigId: string;
  targetEmbeddingModelConfigId: string;
  targetCredentialId: string;
  enabled: boolean;
}

export interface MarketInstallLock {
  value: boolean;
}

const idFields: Array<keyof Pick<
  MarketInstallFormValues,
  | "targetModelConfigId"
  | "targetOfficialModelConfigId"
  | "targetKnowledgeBaseId"
  | "targetRerankModelConfigId"
  | "targetEmbeddingModelConfigId"
  | "targetCredentialId"
>> = [
  "targetModelConfigId",
  "targetOfficialModelConfigId",
  "targetKnowledgeBaseId",
  "targetRerankModelConfigId",
  "targetEmbeddingModelConfigId",
  "targetCredentialId",
];

function toOptionalId(value: string) {
  if (!value) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

export function validateMarketInstallForm(
  assetType: MarketAssetType,
  form: MarketInstallFormValues,
) {
  if (form.name.trim().length > 128) {
    return "安装后名称不能超过 128 个字符。";
  }

  if (idFields.some((field) => form[field] && toOptionalId(form[field]) === undefined)) {
    return "安装参数中包含无效的资源 ID，请重新选择后再试。";
  }

  if (assetType === "AGENT" && !form.targetModelConfigId && !form.targetOfficialModelConfigId) {
    return "安装 Agent 前，请至少选择一个用户聊天模型或官方聊天模型。";
  }

  if (assetType === "KNOWLEDGE_BASE" && !form.targetEmbeddingModelConfigId) {
    return "安装知识库前，请选择一个 Embedding 模型。";
  }

  return null;
}

export function buildMarketInstallPayload(form: MarketInstallFormValues): InstallMarketAssetPayload {
  return {
    name: form.name.trim() || undefined,
    targetModelConfigId: toOptionalId(form.targetModelConfigId),
    targetOfficialModelConfigId: toOptionalId(form.targetOfficialModelConfigId),
    targetKnowledgeBaseId: toOptionalId(form.targetKnowledgeBaseId),
    targetRerankModelConfigId: toOptionalId(form.targetRerankModelConfigId),
    targetEmbeddingModelConfigId: toOptionalId(form.targetEmbeddingModelConfigId),
    targetCredentialId: toOptionalId(form.targetCredentialId),
    enabled: form.enabled,
  };
}

export async function runMarketInstallOnce<T>(
  lock: MarketInstallLock,
  install: () => Promise<T>,
) {
  if (lock.value) return undefined;
  lock.value = true;
  try {
    return await install();
  } finally {
    lock.value = false;
  }
}
