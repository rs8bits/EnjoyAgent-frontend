<template>
  <div class="min-h-full p-5 lg:p-8">
    <div class="mb-6 flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="text-xs font-semibold uppercase tracking-[0.22em] text-accent">阶段 5 · Agent 管理</div>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink">创建你的第一个 Agent</h1>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
          阶段五已经接通知识库绑定。现在你可以把聊天模型、上下文和知识库一起配置成真正可检索的 Agent。
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <div class="rounded-full border border-line bg-white px-4 py-2.5 text-sm text-muted shadow-sm">
          共 {{ agents.length }} 个 Agent
        </div>
        <UiButton variant="secondary" @click="startCreate">新建 Agent</UiButton>
      </div>
    </div>

    <div class="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,0.9fr)]">
      <SectionCard eyebrow="Agent 列表" title="当前租户的 Agent" description="点击某个 Agent 后，右侧会自动切换到编辑状态。知识库绑定也会一并展示。">
        <div v-if="loading" class="rounded-[20px] border border-line bg-canvas px-4 py-10 text-sm text-muted">
          正在加载 Agent 列表...
        </div>

        <div v-else-if="!agents.length" class="rounded-[20px] border border-dashed border-line bg-canvas px-4 py-10 text-center text-sm text-muted">
          还没有 Agent。先完成模型配置，然后创建第一个可以对话的 Agent。
        </div>

        <div v-else class="space-y-3">
          <button
            v-for="agent in agents"
            :key="agent.id"
            class="w-full rounded-[22px] border px-4 py-4 text-left transition"
            :class="selectedId === agent.id ? 'border-accent bg-accent-soft' : 'border-line bg-canvas hover:bg-white'"
            @click="selectAgent(agent)"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="text-base font-semibold text-ink">{{ agent.name }}</div>
                <div class="mt-1 text-sm text-muted">
                  {{ bindingLabel(agent.chatModelBindingType) }} · {{ modelBindingName(agent) }}
                </div>
              </div>
              <span
                class="rounded-full px-3 py-1 text-xs font-medium"
                :class="agent.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'"
              >
                {{ agent.enabled ? "启用" : "停用" }}
              </span>
            </div>
            <div v-if="agent.description" class="mt-3 text-sm leading-6 text-muted">
              {{ agent.description }}
            </div>
            <div class="mt-3 flex flex-wrap gap-2 text-xs text-muted">
              <span class="rounded-full border border-line bg-white px-3 py-1">上下文窗口 {{ agent.contextWindowSize }}</span>
              <span class="rounded-full border border-line bg-white px-3 py-1">
                {{ agent.knowledgeBaseName ? `知识库 ${agent.knowledgeBaseName}` : "未绑定知识库" }}
              </span>
              <span class="rounded-full border border-line bg-white px-3 py-1">
                {{ agent.memoryEnabled ? `记忆阈值 ${agent.memoryUpdateMessageThreshold}` : "未启用记忆" }}
              </span>
            </div>
          </button>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="编辑区"
        :title="selectedId ? '编辑 Agent' : '新建 Agent'"
        description="阶段五先把知识库绑定接通。工具绑定会在后续阶段继续扩展。"
      >
        <form class="space-y-5" @submit.prevent="submit">
          <UiTextField
            v-model="form.name"
            label="Agent 名称"
            placeholder="例如：产品助手"
            :error="errors.name"
          />

          <UiTextField
            v-model="form.description"
            label="描述"
            placeholder="例如：帮助回答产品相关问题"
          />

          <UiTextarea
            v-model="form.systemPrompt"
            label="系统提示词"
            placeholder="例如：你是一个专业的产品助手，请始终用简洁中文回答。"
            :rows="7"
            :error="errors.systemPrompt"
          />

          <div class="space-y-3">
            <div class="text-sm font-medium text-ink">聊天模型来源</div>
            <div class="grid gap-3 md:grid-cols-2">
              <button
                v-for="option in bindingOptions"
                :key="option.value"
                type="button"
                class="rounded-[20px] border px-4 py-4 text-left transition"
                :class="form.chatModelBindingType === option.value ? 'border-accent bg-accent-soft' : 'border-line bg-white hover:border-accent/45'"
                @click="form.chatModelBindingType = option.value"
              >
                <div class="text-sm font-semibold text-ink">{{ option.label }}</div>
                <div class="mt-1 text-sm text-muted">{{ option.description }}</div>
              </button>
            </div>
          </div>

          <UiSelect
            v-if="form.chatModelBindingType === 'USER_MODEL'"
            v-model="form.modelConfigId"
            label="绑定用户模型"
            :options="userChatModelOptions"
            placeholder="请选择一个聊天模型配置"
            :hint="userChatModels.length ? '这里只展示当前租户下启用中的聊天模型。' : '当前还没有可用的用户聊天模型，请先去“模型配置”页面创建。'"
            :error="errors.modelBinding"
          />

          <UiSelect
            v-else
            v-model="form.officialModelConfigId"
            label="绑定官方模型"
            :options="officialChatModelOptions"
            placeholder="请选择一个官方聊天模型"
            :hint="officialChatModels.length ? '这里展示平台已经上架的官方聊天模型。' : '当前还没有可用的官方聊天模型。'"
            :error="errors.modelBinding"
          />

          <div class="grid gap-4 md:grid-cols-2">
            <UiTextField
              v-model="form.contextWindowSize"
              label="上下文窗口大小"
              placeholder="例如：12"
              :error="errors.contextWindowSize"
            />
            <UiTextField
              v-model="form.memoryUpdateMessageThreshold"
              label="记忆刷新阈值"
              placeholder="例如：6"
              :error="errors.memoryUpdateMessageThreshold"
            />
          </div>

          <UiSelect
            v-model="form.knowledgeBaseId"
            label="绑定知识库"
            :options="knowledgeBaseOptions"
            placeholder="可选：给 Agent 绑定一个知识库"
            :hint="knowledgeBaseHint"
          />

          <div class="grid gap-3 md:grid-cols-2">
            <UiCheckbox
              v-model="form.memoryEnabled"
              label="启用会话记忆"
              hint="启用后会按阈值刷新会话摘要。"
            />
            <UiCheckbox
              v-model="form.enabled"
              label="启用 Agent"
              hint="停用后 Agent 仍会保留在列表中。"
            />
          </div>

          <div class="rounded-[18px] border border-line bg-canvas px-4 py-4 text-sm leading-6 text-muted">
            当前阶段默认使用：
            <br>
            1. `上下文策略 = SLIDING_WINDOW`
            <br>
            2. `Rerank = 关闭`
            <br>
            3. `知识库已接入，MCP = 后续阶段接入`
          </div>

          <div v-if="submitError" class="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {{ submitError }}
          </div>

          <div class="flex flex-wrap items-center gap-3 pt-2">
            <UiButton type="submit" :disabled="saving">
              {{ saving ? "保存中..." : selectedId ? "保存修改" : "创建 Agent" }}
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
              {{ deleting ? "删除中..." : "删除 Agent" }}
            </UiButton>
          </div>
        </form>
      </SectionCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import SectionCard from "@/app/components/SectionCard.vue";
import UiButton from "@/app/components/ui/UiButton.vue";
import UiCheckbox from "@/app/components/ui/UiCheckbox.vue";
import UiSelect from "@/app/components/ui/UiSelect.vue";
import UiTextarea from "@/app/components/ui/UiTextarea.vue";
import UiTextField from "@/app/components/ui/UiTextField.vue";
import { createAgent, deleteAgent, listAgents, updateAgent } from "@/app/services/agents";
import { extractApiErrorMessage } from "@/app/services/http";
import { listKnowledgeBases } from "@/app/services/knowledge";
import { listModelConfigs, listOfficialModelConfigs } from "@/app/services/models";
import type { Agent, AgentChatModelBindingType } from "@/app/types/agent";
import type { KnowledgeBase } from "@/app/types/knowledge";
import type { ModelConfig, OfficialModelConfig } from "@/app/types/model";

const route = useRoute();

const agents = ref<Agent[]>([]);
const modelConfigs = ref<ModelConfig[]>([]);
const officialModels = ref<OfficialModelConfig[]>([]);
const knowledgeBases = ref<KnowledgeBase[]>([]);
const loading = ref(false);
const saving = ref(false);
const deleting = ref(false);
const submitError = ref("");
const selectedId = ref<number | null>(null);

const bindingOptions = [
  { label: "用户模型", value: "USER_MODEL", description: "使用当前租户下自己配置的聊天模型。" },
  { label: "官方模型", value: "OFFICIAL_MODEL", description: "直接复用平台已经托管好的官方模型。" }
];

const form = reactive({
  name: "",
  description: "",
  systemPrompt: "",
  chatModelBindingType: "USER_MODEL",
  modelConfigId: "",
  officialModelConfigId: "",
  knowledgeBaseId: "",
  contextWindowSize: "12",
  memoryEnabled: true,
  memoryUpdateMessageThreshold: "6",
  enabled: true
});

const errors = reactive({
  name: "",
  systemPrompt: "",
  modelBinding: "",
  contextWindowSize: "",
  memoryUpdateMessageThreshold: ""
});

const userChatModels = computed(() => modelConfigs.value.filter((item) => item.modelType === "CHAT" && item.enabled));
const officialChatModels = computed(() => officialModels.value.filter((item) => item.modelType === "CHAT" && item.enabled));

const userChatModelOptions = computed(() =>
  userChatModels.value.map((item) => ({
    label: `${item.name} · ${item.modelName}`,
    value: String(item.id)
  }))
);

const officialChatModelOptions = computed(() =>
  officialChatModels.value.map((item) => ({
    label: `${item.name} · ${item.modelName}`,
    value: String(item.id)
  }))
);

const knowledgeBaseOptions = computed(() => [
  { label: "暂不绑定知识库", value: "" },
  ...knowledgeBases.value
    .filter((item) => item.enabled)
    .map((item) => ({
      label: `${item.name} · ${item.embeddingModelConfigName ?? "未设置向量模型"}`,
      value: String(item.id)
    }))
]);

const knowledgeBaseHint = computed(() =>
  knowledgeBases.value.some((item) => item.enabled)
    ? "绑定后，聊天工作台会在提问前先执行知识检索。"
    : "当前没有可用知识库，可以先去“知识库管理”页面创建。"
);

function resetForm() {
  form.name = "";
  form.description = "";
  form.systemPrompt = "";
  form.chatModelBindingType = "USER_MODEL";
  form.modelConfigId = "";
  form.officialModelConfigId = "";
  form.knowledgeBaseId = "";
  form.contextWindowSize = "12";
  form.memoryEnabled = true;
  form.memoryUpdateMessageThreshold = "6";
  form.enabled = true;
  errors.name = "";
  errors.systemPrompt = "";
  errors.modelBinding = "";
  errors.contextWindowSize = "";
  errors.memoryUpdateMessageThreshold = "";
  submitError.value = "";
}

function startCreate() {
  selectedId.value = null;
  resetForm();
  const routeKnowledgeBaseId = typeof route.query.knowledgeBaseId === "string" ? route.query.knowledgeBaseId : "";
  if (routeKnowledgeBaseId && knowledgeBases.value.some((item) => String(item.id) === routeKnowledgeBaseId && item.enabled)) {
    form.knowledgeBaseId = routeKnowledgeBaseId;
  }
}

function bindingLabel(bindingType: string) {
  return bindingType === "OFFICIAL_MODEL" ? "官方模型" : "用户模型";
}

function modelBindingName(agent: Agent) {
  return agent.chatModelBindingType === "OFFICIAL_MODEL"
    ? agent.officialModelConfigName ?? "未绑定官方模型"
    : agent.modelConfigName ?? "未绑定用户模型";
}

function selectAgent(agent: Agent) {
  selectedId.value = agent.id;
  form.name = agent.name;
  form.description = agent.description ?? "";
  form.systemPrompt = agent.systemPrompt;
  form.chatModelBindingType = String(agent.chatModelBindingType);
  form.modelConfigId = agent.modelConfigId ? String(agent.modelConfigId) : "";
  form.officialModelConfigId = agent.officialModelConfigId ? String(agent.officialModelConfigId) : "";
  form.knowledgeBaseId = agent.knowledgeBaseId ? String(agent.knowledgeBaseId) : "";
  form.contextWindowSize = String(agent.contextWindowSize ?? 12);
  form.memoryEnabled = agent.memoryEnabled;
  form.memoryUpdateMessageThreshold = agent.memoryUpdateMessageThreshold ? String(agent.memoryUpdateMessageThreshold) : "6";
  form.enabled = agent.enabled;
  errors.name = "";
  errors.systemPrompt = "";
  errors.modelBinding = "";
  errors.contextWindowSize = "";
  errors.memoryUpdateMessageThreshold = "";
  submitError.value = "";
}

function parseRequiredInt(value: string) {
  return Number.parseInt(value.trim(), 10);
}

function validate() {
  errors.name = form.name.trim() ? "" : "请输入 Agent 名称";
  errors.systemPrompt = form.systemPrompt.trim() ? "" : "请输入系统提示词";
  errors.modelBinding = "";
  errors.contextWindowSize = Number.isFinite(parseRequiredInt(form.contextWindowSize)) ? "" : "请输入上下文窗口大小";
  errors.memoryUpdateMessageThreshold = form.memoryEnabled && !Number.isFinite(parseRequiredInt(form.memoryUpdateMessageThreshold))
    ? "请输入记忆刷新阈值"
    : "";

  if (form.chatModelBindingType === "USER_MODEL" && !form.modelConfigId) {
    errors.modelBinding = "请选择一个用户聊天模型";
  }
  if (form.chatModelBindingType === "OFFICIAL_MODEL" && !form.officialModelConfigId) {
    errors.modelBinding = "请选择一个官方聊天模型";
  }

  return !errors.name && !errors.systemPrompt && !errors.modelBinding && !errors.contextWindowSize && !errors.memoryUpdateMessageThreshold;
}

async function loadAll() {
  loading.value = true;
  try {
    const [agentList, modelConfigList, officialModelList, knowledgeBaseList] = await Promise.all([
      listAgents(),
      listModelConfigs(),
      listOfficialModelConfigs(),
      listKnowledgeBases()
    ]);
    agents.value = agentList;
    modelConfigs.value = modelConfigList;
    officialModels.value = officialModelList;
    knowledgeBases.value = knowledgeBaseList;
  } catch (error) {
    submitError.value = extractApiErrorMessage(error, "加载 Agent 失败");
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
      description: form.description.trim() || undefined,
      systemPrompt: form.systemPrompt.trim(),
      chatModelBindingType: form.chatModelBindingType as AgentChatModelBindingType,
      modelConfigId: form.chatModelBindingType === "USER_MODEL" ? Number(form.modelConfigId) : undefined,
      officialModelConfigId: form.chatModelBindingType === "OFFICIAL_MODEL" ? Number(form.officialModelConfigId) : undefined,
      knowledgeBaseId: form.knowledgeBaseId ? Number(form.knowledgeBaseId) : undefined,
      rerankEnabled: false,
      rerankModelConfigId: undefined,
      contextStrategy: "SLIDING_WINDOW" as const,
      contextWindowSize: parseRequiredInt(form.contextWindowSize),
      memoryEnabled: form.memoryEnabled,
      memoryStrategy: form.memoryEnabled ? "SESSION_SUMMARY" as const : undefined,
      memoryUpdateMessageThreshold: form.memoryEnabled ? parseRequiredInt(form.memoryUpdateMessageThreshold) : undefined,
      enabled: form.enabled
    };

    if (selectedId.value) {
      const updated = await updateAgent(selectedId.value, payload);
      await loadAll();
      selectAgent(updated);
    } else {
      const created = await createAgent(payload);
      await loadAll();
      selectAgent(created);
    }
  } catch (error) {
    submitError.value = extractApiErrorMessage(error, "保存 Agent 失败");
  } finally {
    saving.value = false;
  }
}

async function removeSelected() {
  if (!selectedId.value) {
    return;
  }

  if (!window.confirm("确定删除这个 Agent 吗？相关会话和后续配置可能会受到影响。")) {
    return;
  }

  deleting.value = true;
  submitError.value = "";
  try {
    await deleteAgent(selectedId.value);
    await loadAll();
    startCreate();
  } catch (error) {
    submitError.value = extractApiErrorMessage(error, "删除 Agent 失败");
  } finally {
    deleting.value = false;
  }
}

onMounted(async () => {
  await loadAll();
  if (!selectedId.value) {
    startCreate();
  }
});
</script>
