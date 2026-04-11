<template>
  <div class="min-h-full p-5 lg:p-8">
    <div class="mb-6 flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="text-xs font-semibold uppercase tracking-[0.22em] text-accent">阶段 3 · 凭证管理</div>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink">管理你的模型凭证</h1>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
          这里管理你自己的 API Key。系统只会返回脱敏后的密钥展示，真实密钥只会在创建或更新时提交到后端。
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <div class="rounded-full border border-line bg-white px-4 py-2.5 text-sm text-muted shadow-sm">
          共 {{ credentials.length }} 个凭证
        </div>
        <UiButton variant="secondary" @click="startCreate">新建凭证</UiButton>
      </div>
    </div>

    <div class="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(380px,0.85fr)]">
      <SectionCard eyebrow="凭证列表" title="已创建的凭证" description="点击左侧条目即可快速进入编辑状态。">
        <div v-if="loading" class="rounded-[20px] border border-line bg-canvas px-4 py-10 text-sm text-muted">
          正在加载凭证列表...
        </div>

        <div v-else-if="!credentials.length" class="rounded-[20px] border border-dashed border-line bg-canvas px-4 py-10 text-center text-sm text-muted">
          还没有凭证。先创建一把自己的模型 Key，后面模型配置和 Agent 都会用到它。
        </div>

        <div v-else class="space-y-3">
          <button
            v-for="credential in credentials"
            :key="credential.id"
            class="w-full rounded-[22px] border px-4 py-4 text-left transition"
            :class="selectedId === credential.id ? 'border-accent bg-accent-soft' : 'border-line bg-canvas hover:bg-white'"
            @click="selectCredential(credential)"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="text-base font-semibold text-ink">{{ credential.name }}</div>
                <div class="mt-1 text-sm text-muted">{{ providerLabel(credential.provider) }} · {{ credential.secretMasked }}</div>
              </div>
              <span
                class="rounded-full px-3 py-1 text-xs font-medium"
                :class="credential.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'"
              >
                {{ credential.status === "ACTIVE" ? "启用" : "停用" }}
              </span>
            </div>
            <div v-if="credential.description" class="mt-3 text-sm leading-6 text-muted">
              {{ credential.description }}
            </div>
            <div v-if="credential.baseUrl" class="mt-2 text-xs text-muted">
              接口地址：{{ credential.baseUrl }}
            </div>
          </button>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="编辑区"
        :title="selectedId ? '编辑凭证' : '新建凭证'"
        :description="selectedId ? '更新凭证名称、说明、状态，必要时可以替换密钥。' : '先保存一把自己的模型 API Key，后面模型配置会直接复用。'"
      >
        <form class="space-y-5" @submit.prevent="submit">
          <UiTextField
            v-model="form.name"
            label="凭证名称"
            placeholder="例如：我的百炼 Key"
            :error="errors.name"
          />

          <UiSelect
            v-model="form.provider"
            label="提供方"
            :options="credentialProviderSelectOptions"
            :disabled="Boolean(selectedId)"
            :hint="selectedId ? '编辑时不支持切换提供方；如果要改成别的平台，建议新建一条凭证。' : '当前聊天和 RAG 推荐优先使用阿里百炼或 OpenAI。'"
          />

          <UiTextField
            v-model="form.secret"
            :label="selectedId ? '新密钥（可选）' : 'API Key'"
            type="password"
            :placeholder="selectedId ? '不填写则保留原密钥' : '请输入 API Key'"
            :hint="selectedId ? '编辑时如果不填写，将继续使用原来的密钥。' : '创建成功后前端不会再显示真实密钥。'"
            :error="errors.secret"
          />

          <UiTextField
            v-model="form.baseUrl"
            label="接口基础地址"
            placeholder="例如：https://dashscope.aliyuncs.com/compatible-mode"
            hint="聊天和 Embedding 会优先使用这里的地址。百炼推荐使用兼容模式地址。"
            :error="errors.baseUrl"
          />

          <UiTextarea
            v-model="form.description"
            label="说明"
            placeholder="例如：用于主力聊天模型"
            :rows="3"
          />

          <UiSelect
            v-if="selectedId"
            v-model="form.status"
            label="状态"
            :options="credentialStatusSelectOptions"
          />

          <div v-if="submitError" class="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {{ submitError }}
          </div>

          <div class="flex flex-wrap items-center gap-3 pt-2">
            <UiButton type="submit" :disabled="saving">
              {{ saving ? "保存中..." : selectedId ? "保存修改" : "创建凭证" }}
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
              {{ deleting ? "删除中..." : "删除凭证" }}
            </UiButton>
          </div>
        </form>
      </SectionCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import SectionCard from "@/app/components/SectionCard.vue";
import UiButton from "@/app/components/ui/UiButton.vue";
import UiSelect from "@/app/components/ui/UiSelect.vue";
import UiTextarea from "@/app/components/ui/UiTextarea.vue";
import UiTextField from "@/app/components/ui/UiTextField.vue";
import { credentialProviderOptions, credentialStatusOptions } from "@/app/constants/options";
import { createCredential, deleteCredential, listCredentials, updateCredential } from "@/app/services/credentials";
import { extractApiErrorMessage } from "@/app/services/http";
import type { Credential, CredentialProvider } from "@/app/types/credential";

const credentials = ref<Credential[]>([]);
const loading = ref(false);
const saving = ref(false);
const deleting = ref(false);
const submitError = ref("");
const selectedId = ref<number | null>(null);

const credentialProviderSelectOptions = credentialProviderOptions.map((option) => ({ ...option }));
const credentialStatusSelectOptions = credentialStatusOptions.map((option) => ({ ...option }));

const form = reactive({
  name: "",
  provider: "DASHSCOPE",
  secret: "",
  baseUrl: "https://dashscope.aliyuncs.com/compatible-mode",
  description: "",
  status: "ACTIVE"
});

const errors = reactive({
  name: "",
  secret: "",
  baseUrl: ""
});

function resetForm() {
  form.name = "";
  form.provider = "DASHSCOPE";
  form.secret = "";
  form.baseUrl = defaultBaseUrlForProvider(form.provider);
  form.description = "";
  form.status = "ACTIVE";
  errors.name = "";
  errors.secret = "";
  errors.baseUrl = "";
  submitError.value = "";
}

function startCreate() {
  selectedId.value = null;
  resetForm();
}

function selectCredential(credential: Credential) {
  selectedId.value = credential.id;
  form.name = credential.name;
  form.provider = String(credential.provider);
  form.secret = "";
  form.baseUrl = credential.baseUrl ?? defaultBaseUrlForProvider(form.provider);
  form.description = credential.description ?? "";
  form.status = credential.status;
  errors.name = "";
  errors.secret = "";
  errors.baseUrl = "";
  submitError.value = "";
}

function providerLabel(provider: string) {
  return credentialProviderOptions.find((option) => option.value === provider)?.label ?? provider;
}

function validate() {
  errors.name = form.name.trim() ? "" : "请输入凭证名称";
  errors.secret = selectedId.value || form.secret.trim() ? "" : "请输入 API Key";
  errors.baseUrl = form.baseUrl.trim() ? "" : "请输入接口基础地址";
  return !errors.name && !errors.secret && !errors.baseUrl;
}

function defaultBaseUrlForProvider(provider: string) {
  if (provider === "DASHSCOPE") {
    return "https://dashscope.aliyuncs.com/compatible-mode";
  }
  if (provider === "OPENAI") {
    return "https://api.openai.com";
  }
  return "";
}

async function loadAll() {
  loading.value = true;
  try {
    credentials.value = await listCredentials();
  } catch (error) {
    submitError.value = extractApiErrorMessage(error, "加载凭证失败");
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
    if (selectedId.value) {
      const updated = await updateCredential(selectedId.value, {
        name: form.name.trim(),
        secret: form.secret.trim() || undefined,
        baseUrl: form.baseUrl.trim(),
        description: form.description.trim() || undefined,
        status: form.status
      });
      await loadAll();
      selectCredential(updated);
    } else {
      const created = await createCredential({
        name: form.name.trim(),
        provider: form.provider as CredentialProvider,
        secret: form.secret.trim(),
        baseUrl: form.baseUrl.trim(),
        description: form.description.trim() || undefined
      });
      await loadAll();
      selectCredential(created);
    }
  } catch (error) {
    submitError.value = extractApiErrorMessage(error, "保存凭证失败");
  } finally {
    saving.value = false;
  }
}

async function removeSelected() {
  if (!selectedId.value) {
    return;
  }

  if (!window.confirm("确定删除这个凭证吗？已绑定的模型配置可能会受到影响。")) {
    return;
  }

  deleting.value = true;
  submitError.value = "";
  try {
    await deleteCredential(selectedId.value);
    await loadAll();
    startCreate();
  } catch (error) {
    submitError.value = extractApiErrorMessage(error, "删除凭证失败");
  } finally {
    deleting.value = false;
  }
}

onMounted(async () => {
  await loadAll();
});

watch(
  () => form.provider,
  (provider) => {
    if (!selectedId.value) {
      form.baseUrl = defaultBaseUrlForProvider(provider);
    }
  }
);
</script>
