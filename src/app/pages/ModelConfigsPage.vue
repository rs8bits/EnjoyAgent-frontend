<template>
  <div class="ea-scroll h-full overflow-y-auto p-5 lg:p-8">
    <div class="mb-6 flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="text-xs font-semibold uppercase tracking-[0.22em] text-accent">阶段 3 · 模型配置</div>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink">配置可复用模型</h1>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
          模型配置会复用你已经保存的凭证，并成为后面 Agent、知识库和工具链的基础运行资源。
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <div class="rounded-full border border-line bg-white px-4 py-2.5 text-sm text-muted shadow-sm">
          共 {{ total }} 个模型配置
        </div>
        <UiButton variant="secondary" @click="startCreate">新建模型配置</UiButton>
      </div>
    </div>

    <div class="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(400px,0.85fr)]">
      <SectionCard eyebrow="模型列表" title="当前租户的模型配置" description="阶段三先把聊天、Embedding、Rerank 模型都纳入统一配置。">
        <div v-if="loading" class="rounded-[20px] border border-line bg-canvas px-4 py-10 text-sm text-muted">
          正在加载模型配置...
        </div>

        <div v-else-if="!modelConfigs.length" class="rounded-[20px] border border-dashed border-line bg-canvas px-4 py-10 text-center text-sm text-muted">
          还没有模型配置。建议先创建一条聊天模型配置，后面创建 Agent 时就可以直接绑定。
        </div>

        <div v-else class="space-y-3">
          <button
            v-for="item in modelConfigs"
            :key="item.id"
            class="w-full rounded-[22px] border px-4 py-4 text-left transition"
            :class="selectedId === item.id ? 'border-accent bg-accent-soft' : 'border-line bg-canvas hover:bg-white'"
            @click="selectModelConfig(item)"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="text-base font-semibold text-ink">{{ item.name }}</div>
                <div class="mt-1 text-sm text-muted">
                  {{ modelTypeLabel(item.modelType) }} · {{ providerLabel(item.provider) }} · {{ item.modelName }}
                </div>
              </div>
              <span
                class="rounded-full px-3 py-1 text-xs font-medium"
                :class="item.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'"
              >
                {{ item.enabled ? "启用" : "停用" }}
              </span>
            </div>
            <div class="mt-3 flex flex-wrap gap-2 text-xs text-muted">
              <span class="rounded-full border border-line bg-white px-3 py-1">
                {{ item.credentialName ?? "未绑定凭证" }}
              </span>
              <span v-if="item.temperature !== null" class="rounded-full border border-line bg-white px-3 py-1">
                温度 {{ item.temperature }}
              </span>
              <span v-if="item.maxTokens !== null" class="rounded-full border border-line bg-white px-3 py-1">
                最大输出 {{ item.maxTokens }}
              </span>
            </div>
          </button>
        </div>

        <UiPagination
          :page="page"
          :size="pageSize"
          :total="total"
          :total-pages="totalPages"
          @change="loadModelConfigs"
        />
      </SectionCard>

      <SectionCard
        eyebrow="编辑区"
        :title="selectedId ? '编辑模型配置' : '新建模型配置'"
        description="阶段三先默认使用用户自己的凭证。官方模型请到“官方模型”页面查看。"
      >
        <form class="space-y-5" @submit.prevent="submit">
          <UiTextField
            v-model="form.name"
            label="配置名称"
            placeholder="例如：默认对话模型"
            :error="errors.name"
          />

          <div class="grid gap-4 md:grid-cols-2">
            <UiSelect
              v-model="form.provider"
              label="模型提供方"
              :options="credentialProviderSelectOptions"
              hint="当前运行时已经支持阿里百炼和 OpenAI 兼容协议。"
            />
            <UiSelect
              v-model="form.modelType"
              label="模型类型"
              :options="modelTypeSelectOptions"
            />
          </div>

          <UiTextField
            v-model="form.modelName"
            label="模型名称"
            placeholder="例如：qwen-plus"
            :error="errors.modelName"
          />

          <UiSelect
            v-model="form.credentialId"
            label="绑定凭证"
            :options="credentialSelectOptions"
            placeholder="请选择一个用户凭证"
            :hint="filteredCredentials.length ? '这里只展示与当前提供方一致的启用凭证。' : '当前提供方下还没有可用凭证，请先去凭证页创建。'"
            :error="errors.credentialId"
          />

          <div class="grid gap-4 md:grid-cols-2">
            <UiTextField
              v-model="form.temperature"
              label="采样温度"
              placeholder="例如：0.2"
              hint="仅对对话模型更有意义，不填则交给后端默认值。"
            />
            <UiTextField
              v-model="form.maxTokens"
              label="最大输出 Token"
              placeholder="例如：2048"
            />
          </div>

          <UiCheckbox
            v-model="form.enabled"
            label="启用模型配置"
            hint="停用后不会从历史里消失，但新 Agent 不建议继续绑定。"
          />

          <div v-if="submitError" class="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {{ submitError }}
          </div>

          <div class="flex flex-wrap items-center gap-3 pt-2">
            <UiButton type="submit" :disabled="saving">
              {{ saving ? "保存中..." : selectedId ? "保存修改" : "创建模型配置" }}
            </UiButton>
            <UiButton variant="secondary" :disabled="saving" @click="startCreate">
              新建空白表单
            </UiButton>
            <UiButton
              v-if="selectedId"
              type="button"
              variant="ghost"
              :disabled="saving || deleting"
              @click="removeSelected"
            >
              {{ deleting ? "删除中..." : "删除模型配置" }}
            </UiButton>
          </div>
        </form>
      </SectionCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import SectionCard from "@/app/components/SectionCard.vue";
import UiButton from "@/app/components/ui/UiButton.vue";
import UiCheckbox from "@/app/components/ui/UiCheckbox.vue";
import UiPagination from "@/app/components/ui/UiPagination.vue";
import UiSelect from "@/app/components/ui/UiSelect.vue";
import UiTextField from "@/app/components/ui/UiTextField.vue";
import { credentialProviderOptions, modelTypeOptions } from "@/app/constants/options";
import { listCredentials } from "@/app/services/credentials";
import { extractApiErrorMessage } from "@/app/services/http";
import { createModelConfig, deleteModelConfig, listModelConfigs, updateModelConfig } from "@/app/services/models";
import type { Credential } from "@/app/types/credential";
import type { ModelConfig, ModelType } from "@/app/types/model";

const credentials = ref<Credential[]>([]);
const modelConfigs = ref<ModelConfig[]>([]);
const page = ref(0);
const pageSize = 20;
const total = ref(0);
const totalPages = ref(0);
const loading = ref(false);
const saving = ref(false);
const deleting = ref(false);
const submitError = ref("");
const selectedId = ref<number | null>(null);

const credentialProviderSelectOptions = credentialProviderOptions.map((option) => ({ ...option }));
const modelTypeSelectOptions = modelTypeOptions.map((option) => ({ ...option }));

const form = reactive({
  name: "",
  provider: "DASHSCOPE",
  modelType: "CHAT",
  modelName: "",
  credentialId: "",
  temperature: "0.2",
  maxTokens: "2048",
  enabled: true
});

const errors = reactive({
  name: "",
  modelName: "",
  credentialId: ""
});

const filteredCredentials = computed(() =>
  credentials.value.filter((credential) => credential.status === "ACTIVE" && credential.provider === form.provider)
);

const credentialSelectOptions = computed(() =>
  filteredCredentials.value.map((credential) => ({
    label: `${credential.name} · ${credential.secretMasked}`,
    value: String(credential.id)
  }))
);

function providerLabel(provider: string) {
  return credentialProviderOptions.find((option) => option.value === provider)?.label ?? provider;
}

function modelTypeLabel(modelType: string) {
  return modelTypeOptions.find((option) => option.value === modelType)?.label ?? modelType;
}

function resetForm() {
  form.name = "";
  form.provider = "DASHSCOPE";
  form.modelType = "CHAT";
  form.modelName = "";
  form.credentialId = "";
  form.temperature = "0.2";
  form.maxTokens = "2048";
  form.enabled = true;
  errors.name = "";
  errors.modelName = "";
  errors.credentialId = "";
  submitError.value = "";
}

function startCreate() {
  selectedId.value = null;
  resetForm();
}

function selectModelConfig(item: ModelConfig) {
  selectedId.value = item.id;
  form.name = item.name;
  form.provider = String(item.provider);
  form.modelType = String(item.modelType);
  form.modelName = item.modelName;
  form.credentialId = item.credentialId ? String(item.credentialId) : "";
  form.temperature = item.temperature === null ? "" : String(item.temperature);
  form.maxTokens = item.maxTokens === null ? "" : String(item.maxTokens);
  form.enabled = item.enabled;
  errors.name = "";
  errors.modelName = "";
  errors.credentialId = "";
  submitError.value = "";
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : undefined;
}

function parseOptionalInt(value: string) {
  const trimmed = value.trim();
  return trimmed ? Number.parseInt(trimmed, 10) : undefined;
}

function validate() {
  errors.name = form.name.trim() ? "" : "请输入配置名称";
  errors.modelName = form.modelName.trim() ? "" : "请输入模型名称";
  errors.credentialId = form.credentialId ? "" : "请选择绑定凭证";
  return !errors.name && !errors.modelName && !errors.credentialId;
}

async function loadModelConfigs(newPage?: number) {
  if (newPage !== undefined) page.value = newPage;
  loading.value = true;
  try {
    const result = await listModelConfigs(page.value, pageSize);
    modelConfigs.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (error) {
    submitError.value = extractApiErrorMessage(error, "加载模型配置失败");
  } finally {
    loading.value = false;
  }
}

async function loadAll() {
  page.value = 0;
  loading.value = true;
  try {
    const [credentialList, modelConfigResult] = await Promise.all([
      listCredentials(0, 999),
      listModelConfigs(0, pageSize)
    ]);
    credentials.value = credentialList.items;
    modelConfigs.value = modelConfigResult.items;
    total.value = modelConfigResult.total;
    totalPages.value = modelConfigResult.totalPages;
  } catch (error) {
    submitError.value = extractApiErrorMessage(error, "加载模型配置失败");
  } finally {
    loading.value = false;
  }
}

async function submit() {
  submitError.value = "";
  if (!validate()) {
    return;
  }

  saving.value = true;
  try {
    const payload = {
      name: form.name.trim(),
      provider: form.provider as Credential["provider"],
      modelType: form.modelType as ModelType,
      modelName: form.modelName.trim(),
      credentialSource: "USER" as const,
      credentialId: Number(form.credentialId),
      temperature: parseOptionalNumber(form.temperature),
      maxTokens: parseOptionalInt(form.maxTokens),
      enabled: form.enabled
    };

    if (selectedId.value) {
      const updated = await updateModelConfig(selectedId.value, payload);
      await loadAll();
      selectModelConfig(updated);
    } else {
      const created = await createModelConfig(payload);
      await loadAll();
      selectModelConfig(created);
    }
  } catch (error) {
    submitError.value = extractApiErrorMessage(error, "保存模型配置失败");
  } finally {
    saving.value = false;
  }
}

async function removeSelected() {
  if (!selectedId.value) {
    return;
  }

  if (!window.confirm("确定删除这个模型配置吗？已绑定的 Agent 可能会受到影响。")) {
    return;
  }

  deleting.value = true;
  submitError.value = "";
  try {
    await deleteModelConfig(selectedId.value);
    await loadAll();
    startCreate();
  } catch (error) {
    submitError.value = extractApiErrorMessage(error, "删除模型配置失败");
  } finally {
    deleting.value = false;
  }
}

onMounted(async () => {
  await loadAll();
});
</script>
