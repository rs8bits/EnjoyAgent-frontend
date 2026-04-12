<template>
  <div class="ea-scroll h-full overflow-y-auto p-5 lg:p-8">
    <div class="mb-6 flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="text-xs font-semibold uppercase tracking-[0.22em] text-accent">阶段 8 · 官方模型管理</div>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink">管理官方模型凭证与价格</h1>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
          这里直接接管理端官方模型接口。你可以先维护托管凭证，再创建聊天、Embedding 或 Rerank 的官方模型配置，并设置百万 token 单价。
        </p>
      </div>

      <UiButton variant="secondary" :disabled="loading" @click="loadAdminModels">
        {{ loading ? "刷新中..." : "刷新模型中心" }}
      </UiButton>
    </div>

    <div class="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <SectionCard
        eyebrow="官方凭证"
        :title="selectedCredentialId ? '编辑托管凭证' : '创建托管凭证'"
        description="托管凭证会被官方模型配置复用，通常一把 key 对应一条兼容协议入口地址。"
      >
        <div class="mb-4 space-y-3">
          <div
            v-if="!credentials.length"
            class="rounded-[18px] border border-dashed border-line bg-canvas px-4 py-8 text-sm leading-6 text-muted"
          >
            当前还没有官方凭证。先创建一条百炼或 OpenAI 兼容托管凭证。
          </div>

          <div v-else class="ea-scroll max-h-[320px] space-y-3 overflow-y-auto pr-1">
            <button
              v-for="credential in credentials"
              :key="credential.id"
              class="w-full rounded-[20px] border px-4 py-4 text-left transition"
              :class="selectedCredentialId === credential.id ? 'border-accent bg-accent-soft' : 'border-line bg-canvas hover:bg-white'"
              @click="selectCredential(credential)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="truncate text-sm font-semibold text-ink">{{ credential.name }}</div>
                  <div class="mt-1 text-xs text-muted">{{ credential.provider }} · {{ credential.baseUrl }}</div>
                </div>
                <span class="rounded-full px-3 py-1 text-xs font-medium" :class="credential.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'">
                  {{ credential.enabled ? "启用" : "停用" }}
                </span>
              </div>
            </button>
          </div>
        </div>

        <form class="space-y-4" @submit.prevent="submitCredential">
          <UiTextField v-model="credentialForm.name" label="凭证名称" placeholder="例如：百炼托管 Key" :error="credentialErrors.name" />
          <UiSelect
            v-model="credentialForm.provider"
            label="提供方"
            :options="providerOptions"
            placeholder="请选择提供方"
          />
          <UiTextField
            v-model="credentialForm.baseUrl"
            label="基础地址"
            placeholder="https://dashscope.aliyuncs.com/compatible-mode"
            :error="credentialErrors.baseUrl"
          />
          <UiTextField
            v-model="credentialForm.secretPlaintext"
            type="password"
            label="API Key"
            placeholder="创建时必填；编辑时留空表示不修改"
            :error="credentialErrors.secretPlaintext"
          />
          <UiCheckbox v-model="credentialForm.enabled" label="启用该凭证" hint="停用后它不会再被官方模型配置使用。" />

          <div v-if="credentialError" class="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {{ credentialError }}
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <UiButton type="submit" :disabled="savingCredential">
              {{ savingCredential ? "保存中..." : selectedCredentialId ? "保存凭证" : "创建凭证" }}
            </UiButton>
            <UiButton variant="secondary" :disabled="savingCredential" @click="startCreateCredential">
              新建空白凭证
            </UiButton>
            <UiButton
              v-if="selectedCredentialId"
              variant="ghost"
              :disabled="savingCredential || deletingCredential"
              @click="removeCredential"
            >
              {{ deletingCredential ? "删除中..." : "删除凭证" }}
            </UiButton>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        eyebrow="官方模型配置"
        :title="selectedConfigId ? '编辑官方模型' : '创建官方模型'"
        description="模型配置会暴露给普通用户使用，也是 token 计费和平台托管调用的核心配置。"
      >
        <div class="mb-4 space-y-3">
          <div
            v-if="!configs.length"
            class="rounded-[18px] border border-dashed border-line bg-canvas px-4 py-8 text-sm leading-6 text-muted"
          >
            当前还没有官方模型配置。请先确保左侧至少有一条可用托管凭证。
          </div>

          <div v-else class="ea-scroll max-h-[320px] space-y-3 overflow-y-auto pr-1">
            <button
              v-for="config in configs"
              :key="config.id"
              class="w-full rounded-[20px] border px-4 py-4 text-left transition"
              :class="selectedConfigId === config.id ? 'border-accent bg-accent-soft' : 'border-line bg-canvas hover:bg-white'"
              @click="selectConfig(config)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="truncate text-sm font-semibold text-ink">{{ config.name }}</div>
                  <div class="mt-1 text-xs text-muted">{{ config.modelType }} · {{ config.modelName }}</div>
                </div>
                <span class="rounded-full px-3 py-1 text-xs font-medium" :class="config.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'">
                  {{ config.enabled ? "启用" : "停用" }}
                </span>
              </div>
              <div class="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                <span class="rounded-full border border-line bg-white px-3 py-1">
                  输入 {{ formatMoney(config.inputPricePerMillion) }}/百万
                </span>
                <span class="rounded-full border border-line bg-white px-3 py-1">
                  输出 {{ formatMoney(config.outputPricePerMillion) }}/百万
                </span>
              </div>
            </button>
          </div>
        </div>

        <form class="space-y-4" @submit.prevent="submitConfig">
          <div class="grid gap-4 md:grid-cols-2">
            <UiTextField v-model="configForm.name" label="模型名称" placeholder="例如：官方百炼对话" :error="configErrors.name" />
            <UiTextField v-model="configForm.modelName" label="运行时模型名" placeholder="例如：qwen-plus" :error="configErrors.modelName" />
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <UiSelect v-model="configForm.provider" label="提供方" :options="providerOptions" placeholder="请选择提供方" />
            <UiSelect v-model="configForm.modelType" label="模型类型" :options="modelTypeOptionsLocal" placeholder="请选择模型类型" />
          </div>

          <UiSelect
            v-model="configForm.officialCredentialId"
            label="托管凭证"
            :options="credentialOptions"
            placeholder="请选择一条托管凭证"
            :error="configErrors.officialCredentialId"
          />

          <div class="grid gap-4 md:grid-cols-2">
            <UiTextField v-model="configForm.temperature" label="默认温度" placeholder="例如：0.2" />
            <UiTextField v-model="configForm.maxTokens" label="默认最大 Token" placeholder="例如：2048" />
          </div>

          <div class="grid gap-4 md:grid-cols-3">
            <UiTextField v-model="configForm.inputPricePerMillion" label="输入单价" placeholder="例如：2.0" :error="configErrors.inputPricePerMillion" />
            <UiTextField v-model="configForm.outputPricePerMillion" label="输出单价" placeholder="例如：6.0" :error="configErrors.outputPricePerMillion" />
            <UiTextField v-model="configForm.currency" label="币种" placeholder="CNY" :error="configErrors.currency" />
          </div>

          <UiTextarea
            v-model="configForm.description"
            label="模型说明"
            placeholder="说明适合什么场景，以及大概的价格策略。"
            :rows="4"
          />

          <UiCheckbox v-model="configForm.enabled" label="启用该官方模型" hint="停用后普通用户将无法继续选择这条官方模型配置。" />

          <div v-if="configError" class="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {{ configError }}
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <UiButton type="submit" :disabled="savingConfig">
              {{ savingConfig ? "保存中..." : selectedConfigId ? "保存配置" : "创建配置" }}
            </UiButton>
            <UiButton variant="secondary" :disabled="savingConfig" @click="startCreateConfig">
              新建空白模型
            </UiButton>
            <UiButton
              v-if="selectedConfigId"
              variant="ghost"
              :disabled="savingConfig || deletingConfig"
              @click="removeConfig"
            >
              {{ deletingConfig ? "删除中..." : "删除模型" }}
            </UiButton>
          </div>
        </form>
      </SectionCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, computed } from "vue";
import SectionCard from "@/app/components/SectionCard.vue";
import UiButton from "@/app/components/ui/UiButton.vue";
import UiCheckbox from "@/app/components/ui/UiCheckbox.vue";
import UiSelect from "@/app/components/ui/UiSelect.vue";
import UiTextField from "@/app/components/ui/UiTextField.vue";
import UiTextarea from "@/app/components/ui/UiTextarea.vue";
import { credentialProviderOptions, modelTypeOptions } from "@/app/constants/options";
import {
  createAdminOfficialModelConfig,
  createAdminOfficialModelCredential,
  deleteAdminOfficialModelConfig,
  deleteAdminOfficialModelCredential,
  listAdminOfficialModelConfigs,
  listAdminOfficialModelCredentials,
  updateAdminOfficialModelConfig,
  updateAdminOfficialModelCredential
} from "@/app/services/admin";
import { extractApiErrorMessage } from "@/app/services/http";
import type {
  OfficialModelConfig,
  OfficialModelCredential
} from "@/app/types/admin";

const credentials = ref<OfficialModelCredential[]>([]);
const configs = ref<OfficialModelConfig[]>([]);
const loading = ref(false);
const savingCredential = ref(false);
const deletingCredential = ref(false);
const savingConfig = ref(false);
const deletingConfig = ref(false);
const selectedCredentialId = ref<number | null>(null);
const selectedConfigId = ref<number | null>(null);
const credentialError = ref("");
const configError = ref("");

const providerOptions = [...credentialProviderOptions];
const modelTypeOptionsLocal = [...modelTypeOptions];

const credentialForm = reactive({
  name: "",
  provider: "DASHSCOPE",
  baseUrl: "https://dashscope.aliyuncs.com/compatible-mode",
  secretPlaintext: "",
  enabled: true
});

const credentialErrors = reactive({
  name: "",
  baseUrl: "",
  secretPlaintext: ""
});

const configForm = reactive({
  name: "",
  provider: "DASHSCOPE",
  modelType: "CHAT",
  modelName: "",
  officialCredentialId: "",
  temperature: "0.2",
  maxTokens: "2048",
  inputPricePerMillion: "",
  outputPricePerMillion: "",
  currency: "CNY",
  description: "",
  enabled: true
});

const configErrors = reactive({
  name: "",
  modelName: "",
  officialCredentialId: "",
  inputPricePerMillion: "",
  outputPricePerMillion: "",
  currency: ""
});

const credentialOptions = computed(() =>
  credentials.value.map((credential) => ({
    label: `${credential.name} · ${credential.provider}`,
    value: String(credential.id)
  }))
);

function formatMoney(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toFixed(2);
}

function resetCredentialForm() {
  credentialForm.name = "";
  credentialForm.provider = "DASHSCOPE";
  credentialForm.baseUrl = "https://dashscope.aliyuncs.com/compatible-mode";
  credentialForm.secretPlaintext = "";
  credentialForm.enabled = true;
}

function resetConfigForm() {
  configForm.name = "";
  configForm.provider = "DASHSCOPE";
  configForm.modelType = "CHAT";
  configForm.modelName = "";
  configForm.officialCredentialId = "";
  configForm.temperature = "0.2";
  configForm.maxTokens = "2048";
  configForm.inputPricePerMillion = "";
  configForm.outputPricePerMillion = "";
  configForm.currency = "CNY";
  configForm.description = "";
  configForm.enabled = true;
}

function selectCredential(credential: OfficialModelCredential) {
  selectedCredentialId.value = credential.id;
  credentialForm.name = credential.name;
  credentialForm.provider = String(credential.provider);
  credentialForm.baseUrl = credential.baseUrl;
  credentialForm.secretPlaintext = "";
  credentialForm.enabled = credential.enabled;
  credentialError.value = "";
}

function selectConfig(config: OfficialModelConfig) {
  selectedConfigId.value = config.id;
  configForm.name = config.name;
  configForm.provider = String(config.provider);
  configForm.modelType = String(config.modelType);
  configForm.modelName = config.modelName;
  configForm.officialCredentialId = String(config.officialCredentialId);
  configForm.temperature = config.temperature === null || config.temperature === undefined ? "" : String(config.temperature);
  configForm.maxTokens = config.maxTokens === null || config.maxTokens === undefined ? "" : String(config.maxTokens);
  configForm.inputPricePerMillion = String(config.inputPricePerMillion ?? "");
  configForm.outputPricePerMillion = String(config.outputPricePerMillion ?? "");
  configForm.currency = config.currency ?? "CNY";
  configForm.description = config.description ?? "";
  configForm.enabled = config.enabled;
  configError.value = "";
}

function startCreateCredential() {
  selectedCredentialId.value = null;
  resetCredentialForm();
  credentialError.value = "";
  credentialErrors.name = "";
  credentialErrors.baseUrl = "";
  credentialErrors.secretPlaintext = "";
}

function startCreateConfig() {
  selectedConfigId.value = null;
  resetConfigForm();
  configError.value = "";
  configErrors.name = "";
  configErrors.modelName = "";
  configErrors.officialCredentialId = "";
  configErrors.inputPricePerMillion = "";
  configErrors.outputPricePerMillion = "";
  configErrors.currency = "";
}

function validateCredentialForm() {
  credentialErrors.name = credentialForm.name.trim() ? "" : "请输入凭证名称";
  credentialErrors.baseUrl = credentialForm.baseUrl.trim() ? "" : "请输入基础地址";
  credentialErrors.secretPlaintext = selectedCredentialId.value
    ? ""
    : credentialForm.secretPlaintext.trim()
      ? ""
      : "创建托管凭证时必须输入 API Key";
  return !credentialErrors.name && !credentialErrors.baseUrl && !credentialErrors.secretPlaintext;
}

function validateConfigForm() {
  const inputPrice = Number(configForm.inputPricePerMillion.trim());
  const outputPrice = Number(configForm.outputPricePerMillion.trim());
  configErrors.name = configForm.name.trim() ? "" : "请输入模型名称";
  configErrors.modelName = configForm.modelName.trim() ? "" : "请输入运行时模型名";
  configErrors.officialCredentialId = configForm.officialCredentialId ? "" : "请选择一条托管凭证";
  configErrors.inputPricePerMillion = !configForm.inputPricePerMillion.trim() || Number.isNaN(inputPrice) || inputPrice < 0
    ? "请输入合法的输入单价"
    : "";
  configErrors.outputPricePerMillion = !configForm.outputPricePerMillion.trim() || Number.isNaN(outputPrice) || outputPrice < 0
    ? "请输入合法的输出单价"
    : "";
  configErrors.currency = configForm.currency.trim() ? "" : "请输入币种";
  return !configErrors.name
    && !configErrors.modelName
    && !configErrors.officialCredentialId
    && !configErrors.inputPricePerMillion
    && !configErrors.outputPricePerMillion
    && !configErrors.currency;
}

async function loadAdminModels() {
  loading.value = true;
  try {
    const [credentialList, configList] = await Promise.all([
      listAdminOfficialModelCredentials(),
      listAdminOfficialModelConfigs()
    ]);
    credentials.value = credentialList;
    configs.value = configList;
  } catch (error) {
    credentialError.value = extractApiErrorMessage(error, "加载官方模型中心失败");
  } finally {
    loading.value = false;
  }
}

async function submitCredential() {
  credentialError.value = "";
  if (!validateCredentialForm()) {
    return;
  }

  savingCredential.value = true;
  try {
    const payload = {
      name: credentialForm.name.trim(),
      provider: credentialForm.provider as "DASHSCOPE" | "OPENAI",
      baseUrl: credentialForm.baseUrl.trim(),
      secretPlaintext: credentialForm.secretPlaintext.trim() || undefined,
      enabled: credentialForm.enabled
    };

    if (selectedCredentialId.value) {
      await updateAdminOfficialModelCredential(selectedCredentialId.value, {
        name: payload.name,
        baseUrl: payload.baseUrl,
        secretPlaintext: payload.secretPlaintext,
        enabled: payload.enabled
      });
    } else {
      await createAdminOfficialModelCredential({
        ...payload,
        secretPlaintext: credentialForm.secretPlaintext.trim()
      });
    }

    await loadAdminModels();
    startCreateCredential();
  } catch (error) {
    credentialError.value = extractApiErrorMessage(error, "保存托管凭证失败");
  } finally {
    savingCredential.value = false;
  }
}

async function removeCredential() {
  if (!selectedCredentialId.value || !window.confirm("确定删除这条托管凭证吗？依赖它的官方模型也会受到影响。")) {
    return;
  }

  deletingCredential.value = true;
  credentialError.value = "";
  try {
    await deleteAdminOfficialModelCredential(selectedCredentialId.value);
    await loadAdminModels();
    startCreateCredential();
  } catch (error) {
    credentialError.value = extractApiErrorMessage(error, "删除托管凭证失败");
  } finally {
    deletingCredential.value = false;
  }
}

async function submitConfig() {
  configError.value = "";
  if (!validateConfigForm()) {
    return;
  }

  savingConfig.value = true;
  try {
    const payload = {
      name: configForm.name.trim(),
      provider: configForm.provider as "DASHSCOPE" | "OPENAI",
      modelType: configForm.modelType as "CHAT" | "EMBEDDING" | "RERANK",
      modelName: configForm.modelName.trim(),
      officialCredentialId: Number(configForm.officialCredentialId),
      temperature: configForm.temperature.trim() ? Number(configForm.temperature) : undefined,
      maxTokens: configForm.maxTokens.trim() ? Number(configForm.maxTokens) : undefined,
      inputPricePerMillion: Number(configForm.inputPricePerMillion),
      outputPricePerMillion: Number(configForm.outputPricePerMillion),
      currency: configForm.currency.trim(),
      description: configForm.description.trim() || undefined,
      enabled: configForm.enabled
    };

    if (selectedConfigId.value) {
      await updateAdminOfficialModelConfig(selectedConfigId.value, payload);
    } else {
      await createAdminOfficialModelConfig(payload);
    }

    await loadAdminModels();
    startCreateConfig();
  } catch (error) {
    configError.value = extractApiErrorMessage(error, "保存官方模型配置失败");
  } finally {
    savingConfig.value = false;
  }
}

async function removeConfig() {
  if (!selectedConfigId.value || !window.confirm("确定删除这条官方模型配置吗？普通用户将无法再继续选择它。")) {
    return;
  }

  deletingConfig.value = true;
  configError.value = "";
  try {
    await deleteAdminOfficialModelConfig(selectedConfigId.value);
    await loadAdminModels();
    startCreateConfig();
  } catch (error) {
    configError.value = extractApiErrorMessage(error, "删除官方模型配置失败");
  } finally {
    deletingConfig.value = false;
  }
}

onMounted(async () => {
  await loadAdminModels();
});
</script>
