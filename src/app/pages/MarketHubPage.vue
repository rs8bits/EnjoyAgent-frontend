<template>
  <div class="ea-scroll flex h-full min-h-0 flex-col overflow-y-auto p-5 lg:p-6">
    <div class="mb-5 flex flex-col gap-5 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="text-xs font-semibold uppercase tracking-[0.22em] text-accent">市场</div>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink">共享市场</h1>
      </div>

      <div class="flex flex-wrap items-center gap-3 rounded-full border border-line bg-white px-4 py-3 shadow-card">
        <div class="rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent">
          {{ publishedTotal }} 个已上架资产
        </div>
        <div class="rounded-full bg-canvas px-3 py-1 text-sm text-muted">
          {{ submissionTotal }} 个我的提交
        </div>
      </div>
    </div>

    <div v-if="marketLoadError" class="mb-5 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600" role="alert">
      {{ marketLoadError }}
    </div>

    <div class="grid min-h-0 flex-1 gap-5 xl:grid-cols-[minmax(280px,0.72fr)_minmax(420px,1.28fr)] 2xl:grid-cols-[300px_minmax(420px,1fr)_360px]">
      <SectionCard
        class="flex h-full min-h-0 flex-col overflow-hidden"
        eyebrow="市场列表"
        title="浏览已上架资产"
        description="左侧先按类型筛选，再选中某个资产查看详情和安装参数。"
      >
        <div class="mb-4 space-y-4">
          <UiSelect
            v-model="assetTypeFilter"
            label="资产类型"
            :options="assetTypeFilterOptions"
            placeholder="全部资产类型"
          />
          <UiButton variant="secondary" :disabled="loadingPublished" @click="loadPublishedAssets">
            {{ loadingPublished ? "刷新中..." : "刷新市场列表" }}
          </UiButton>
        </div>

        <div v-if="loadingPublished" class="rounded-[20px] border border-line bg-canvas px-4 py-10 text-sm text-muted">
          正在加载市场资产...
        </div>

        <div
          v-else-if="!publishedAssets.length"
          class="rounded-[20px] border border-dashed border-line bg-canvas px-4 py-10 text-center text-sm leading-6 text-muted"
        >
          当前还没有符合条件的已上架资产。你可以先在右侧提交一个资产，等管理员审核通过后再来安装。
        </div>

        <div v-else class="ea-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <button
            v-for="asset in publishedAssets"
            :key="asset.id"
            class="w-full rounded-[22px] border px-4 py-4 text-left transition"
            :class="selectedAssetId === asset.id ? 'border-accent bg-accent-soft' : 'border-line bg-canvas hover:bg-white'"
            @click="selectAsset(asset.id)"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <div class="truncate text-base font-semibold text-ink">{{ asset.name }}</div>
                <div class="mt-1 text-sm text-muted">{{ assetTypeLabel(asset.assetType) }}</div>
              </div>
              <span class="rounded-full bg-white px-3 py-1 text-xs font-medium text-muted">
                {{ asset.installCount }} 次安装
              </span>
            </div>
            <div class="mt-3 text-sm leading-6 text-muted">
              {{ asset.summary || "暂无摘要说明" }}
            </div>
            <div class="mt-3 text-xs text-muted">
              发布者 {{ asset.submitterDisplayName || "匿名" }} ·
              {{ asset.publishedAt ? formatDateTime(asset.publishedAt) : "尚未发布时间" }}
            </div>
          </button>
        </div>

        <UiPagination
          :page="publishedPage"
          :size="publishedPageSize"
          :total="publishedTotal"
          :total-pages="publishedTotalPages"
          @change="loadPublishedAssets"
        />
      </SectionCard>

      <div class="ea-scroll min-h-0 space-y-5 overflow-y-auto pr-1">
        <SectionCard
          eyebrow="资产详情"
          :title="selectedAsset?.name || '请选择一个市场资产'"
          description="中间展示当前资产的信息，并根据类型给出安装参数。"
        >
          <div v-if="detailLoading" class="rounded-[20px] border border-line bg-canvas px-4 py-10 text-sm text-muted">
            正在加载资产详情...
          </div>

          <div
            v-else-if="!selectedAsset"
            class="rounded-[20px] border border-dashed border-line bg-canvas px-4 py-10 text-center text-sm leading-6 text-muted"
          >
            左侧选中一个市场资产后，这里会展示它的详情、安装说明和安装入口。
          </div>

          <div v-else class="space-y-4">
            <div class="grid gap-3 md:grid-cols-2">
              <div class="rounded-[18px] border border-line bg-canvas px-4 py-3 text-sm">
                <div class="text-muted">资产类型</div>
                <div class="mt-2 font-semibold text-ink">{{ assetTypeLabel(selectedAsset.assetType) }}</div>
              </div>
              <div class="rounded-[18px] border border-line bg-canvas px-4 py-3 text-sm">
                <div class="text-muted">状态</div>
                <div class="mt-2">
                  <span class="rounded-full px-3 py-1 text-xs font-medium" :class="assetStatusClass(selectedAsset.status)">
                    {{ assetStatusLabel(selectedAsset.status) }}
                  </span>
                </div>
              </div>
            </div>

            <div class="rounded-[18px] border border-line bg-canvas px-4 py-4 text-sm leading-6 text-muted">
              {{ selectedAsset.description || selectedAsset.summary || "当前资产还没有填写详细介绍。" }}
            </div>

            <div class="flex flex-wrap gap-2 text-xs text-muted">
              <span class="rounded-full border border-line bg-white px-3 py-1">
                提交者 {{ selectedAsset.submitterDisplayName || "匿名" }}
              </span>
              <span class="rounded-full border border-line bg-white px-3 py-1">
                安装 {{ selectedAsset.installCount }} 次
              </span>
              <span class="rounded-full border border-line bg-white px-3 py-1">
                更新时间 {{ formatDateTime(selectedAsset.updatedAt) }}
              </span>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="安装资产"
          title="把市场资产安装到当前租户"
          description="安装时只需要填写当前资产真正依赖的那些参数；不确定时可以先留空，按后端错误提示再补。"
        >
          <div v-if="!authStore.isOwner" class="rounded-[20px] border border-line bg-canvas px-4 py-10 text-center text-sm leading-6 text-muted">
            当前账号是工作区成员，可以浏览市场资产；安装操作仅限工作区拥有者。
          </div>

          <div v-else-if="!selectedAsset" class="rounded-[20px] border border-dashed border-line bg-canvas px-4 py-10 text-center text-sm leading-6 text-muted">
            先在左侧选择一个市场资产，这里才会显示安装表单和结果区域。
          </div>

          <div v-else class="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.85fr)]">
            <form
              class="space-y-4"
              @submit.prevent="installSelectedAsset"
            >
              <UiTextField
                v-model="installForm.name"
                label="安装后名称"
                placeholder="不填则默认使用市场资产名称"
              />

              <div class="grid gap-4 md:grid-cols-2">
                <UiSelect
                  v-if="selectedAsset.assetType === 'AGENT' || selectedAsset.assetType === 'WORKFLOW'"
                  v-model="installForm.targetModelConfigId"
                  label="用户聊天模型"
                  :options="userChatModelOptions"
                  placeholder="可选：选择用户聊天模型"
                  :hint="'如果这个模板依赖用户模型，可以在这里补上当前租户的模型。'"
                />

                <UiSelect
                  v-if="selectedAsset.assetType === 'AGENT' || selectedAsset.assetType === 'WORKFLOW'"
                  v-model="installForm.targetOfficialModelConfigId"
                  label="官方聊天模型"
                  :options="officialChatModelOptions"
                  placeholder="可选：选择官方聊天模型"
                  :hint="'如果模板支持官方模型，安装时可以直接指定。'"
                />

                <UiSelect
                  v-if="selectedAsset.assetType === 'AGENT'"
                  v-model="installForm.targetKnowledgeBaseId"
                  label="现有知识库"
                  :options="knowledgeBaseOptions"
                  placeholder="可选：绑定已有知识库"
                  :hint="selectedAsset.assetType === 'WORKFLOW' ? '安装工作流时会把知识检索节点重定向到这里选择的知识库。' : undefined"
                />

                <UiSelect
                  v-if="selectedAsset.assetType === 'AGENT'"
                  v-model="installForm.targetRerankModelConfigId"
                  label="Rerank 模型"
                  :options="rerankModelOptions"
                  placeholder="可选：绑定重排模型"
                />

                <UiSelect
                  v-if="selectedAsset.assetType === 'KNOWLEDGE_BASE' || selectedAsset.assetType === 'AGENT'"
                  v-model="installForm.targetEmbeddingModelConfigId"
                  label="Embedding 模型"
                  :options="embeddingModelOptions"
                  :placeholder="selectedAsset.assetType === 'KNOWLEDGE_BASE' ? '请选择一个 Embedding 模型' : '可选：为随 Agent 安装的知识库选择模型'"
                  :hint="selectedAsset.assetType === 'AGENT'
                    ? '如果 Agent 模板打包了知识库，此字段为必填；没有打包知识库时可以留空。'
                    : '知识库安装时，这个字段是必填项。'"
                />

                <UiSelect
                  v-if="selectedAsset.assetType === 'MCP_SERVER' || selectedAsset.assetType === 'AGENT'"
                  v-model="installForm.targetCredentialId"
                  label="访问凭证"
                  :options="credentialOptions"
                  placeholder="可选：安装时补一把凭证"
                  :hint="'如果这个资产包含需要认证的 MCP 配置，可以在这里绑定一把可用凭证。'"
                />
              </div>

              <UiCheckbox
                v-model="installForm.enabled"
                label="安装后立即启用"
                hint="关闭时会先生成副本，但不会立即对外生效。"
              />

              <div v-if="installError" class="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600" role="alert">
                {{ installError }}
              </div>

              <div
                v-if="installSuccessMessage"
                class="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                role="status"
                aria-live="polite"
              >
                {{ installSuccessMessage }}
              </div>

              <button
                type="button"
                class="inline-flex items-center justify-center rounded-full border border-accent bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-card transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="installingAsset"
                @click="installSelectedAsset"
              >
                {{ installingAsset ? "安装中..." : "安装到当前租户" }}
              </button>
            </form>

            <div class="flex min-h-0 flex-col">
              <div class="mb-4 rounded-full border border-line bg-canvas px-4 py-2 text-sm text-muted">
                当前安装结果会显示在这里
              </div>

              <div
                v-if="!installResult"
                class="rounded-[20px] border border-dashed border-line bg-canvas px-4 py-10 text-center text-sm leading-6 text-muted"
              >
                安装成功后，这里会展示新对象名称、额外创建的资源，以及后续还需要补的配置事项。
              </div>

              <div v-else class="space-y-4">
                <div class="rounded-[20px] border border-line bg-canvas px-4 py-4">
                  <div class="text-sm font-semibold text-ink">{{ installResult.installedName }}</div>
                  <div class="mt-2 text-sm text-muted">
                    {{ assetTypeLabel(installResult.assetType) }} · 新对象 ID {{ installResult.installedEntityId }}
                  </div>
                </div>

                <div v-if="installResult.relatedResources.length" class="space-y-3">
                  <div class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">额外创建的资源</div>
                  <div
                    v-for="resource in installResult.relatedResources"
                    :key="`${resource.resourceType}-${resource.id}`"
                    class="rounded-[18px] border border-line bg-canvas px-4 py-3 text-sm"
                  >
                    <div class="font-semibold text-ink">{{ resource.name }}</div>
                    <div class="mt-1 text-muted">{{ resourceTypeLabel(resource.resourceType) }} · #{{ resource.id }}</div>
                  </div>
                </div>

                <div
                  v-if="installResult.setupRequired"
                  class="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-700"
                >
                  <div class="font-semibold">安装已完成，但还需要补充配置：</div>
                  <ul class="mt-2 list-disc space-y-1 pl-5">
                    <li v-for="item in installResult.setupItems" :key="item">{{ item }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div class="ea-scroll min-h-0 space-y-5 overflow-y-auto pr-1 xl:col-span-2 2xl:col-span-1">
        <SectionCard eyebrow="提交市场" title="发布你的资产">
          <div v-if="!authStore.isOwner" class="rounded-[20px] border border-line bg-canvas px-4 py-8 text-sm leading-6 text-muted">
            提交市场资产仅限工作区拥有者；你仍可浏览已上架资产和历史提交记录。
          </div>
          <form v-else class="space-y-4" @submit.prevent="submitAsset">
            <UiSelect
              v-model="submitForm.assetType"
              label="资产类型"
              :options="submitAssetTypeOptions"
              placeholder="请选择一个资产类型"
            />

            <div v-if="submitForm.assetType === 'AGENT'" class="space-y-3 rounded-[18px] border border-line bg-canvas p-3">
              <UiTextField
                v-model="agentSourceSearchDraft"
                label="按名称搜索 Agent"
                placeholder="输入完整或部分 Agent 名称"
                :disabled="loadingAgentSources"
                @keydown.enter.prevent.stop="applyAgentSourceSearch"
              />
              <div class="flex flex-wrap gap-2">
                <UiButton type="button" variant="secondary" :disabled="loadingAgentSources" @click="applyAgentSourceSearch">
                  {{ loadingAgentSources ? "搜索中..." : "搜索" }}
                </UiButton>
                <UiButton
                  v-if="agentSourceSearch"
                  type="button"
                  variant="ghost"
                  :disabled="loadingAgentSources"
                  @click="clearAgentSourceSearch"
                >
                  清除搜索
                </UiButton>
              </div>
              <div v-if="agentSourceSearch" class="text-xs text-muted">
                当前搜索：{{ agentSourceSearch }}
              </div>
            </div>

            <UiSelect
              v-model="submitForm.sourceEntityId"
              label="源对象"
              :options="submitResourceOptions"
              placeholder="请选择你要提交的对象"
              :hint="submitForm.assetType === 'AGENT'
                ? agentSourceHint
                : '这里会加载当前租户的全部可提交对象；提交后进入待审核状态。'"
              :disabled="submitForm.assetType === 'AGENT' && loadingAgentSources"
            />

            <UiPagination
              v-if="submitForm.assetType === 'AGENT'"
              :page="agentSourcePage"
              :size="agentSourcePageSize"
              :total="agentSourceTotal"
              :total-pages="agentSourceTotalPages"
              @change="loadAgentSources"
            />

            <UiTextField
              v-model="submitForm.summary"
              label="摘要"
              placeholder="例如：适合做企业知识问答的 Agent 模板"
            />

            <UiTextarea
              v-model="submitForm.description"
              label="详细介绍"
              placeholder="介绍它适合什么场景、安装后还需要补什么配置。"
              :rows="6"
            />

            <div v-if="submitAssetError" class="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600" role="alert">
              {{ submitAssetError }}
            </div>

            <UiButton type="submit" :disabled="submittingAsset">
              {{ submittingAsset ? "提交中..." : "提交到共享市场" }}
            </UiButton>
          </form>
        </SectionCard>

        <SectionCard eyebrow="我的提交" title="最近提交记录">
          <div
            v-if="!submissions.length"
            class="rounded-[20px] border border-dashed border-line bg-canvas px-4 py-10 text-center text-sm leading-6 text-muted"
          >
            你还没有提交过市场资产。先从 Agent、知识库、MCP Server 或工作流里选一个对象试试。
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="submission in submissions"
              :key="submission.id"
              class="rounded-[20px] border border-line bg-canvas px-4 py-4"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="truncate text-sm font-semibold text-ink">{{ submission.name }}</div>
                  <div class="mt-1 text-xs text-muted">{{ assetTypeLabel(submission.assetType) }}</div>
                </div>
                <span class="rounded-full px-3 py-1 text-xs font-medium" :class="assetStatusClass(submission.status)">
                  {{ assetStatusLabel(submission.status) }}
                </span>
              </div>
              <div class="mt-3 text-sm leading-6 text-muted">
                {{ submission.summary || "暂无摘要说明" }}
              </div>
              <div class="mt-3 text-xs text-muted">
                {{ formatDateTime(submission.updatedAt) }}
              </div>
            </div>
          </div>

          <UiPagination
            :page="submissionPage"
            :size="submissionPageSize"
            :total="submissionTotal"
            :total-pages="submissionTotalPages"
            @change="loadSubmissions"
          />
        </SectionCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, toRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import SectionCard from "@/app/components/SectionCard.vue";
import UiButton from "@/app/components/ui/UiButton.vue";
import UiCheckbox from "@/app/components/ui/UiCheckbox.vue";
import UiPagination from "@/app/components/ui/UiPagination.vue";
import UiSelect from "@/app/components/ui/UiSelect.vue";
import UiTextField from "@/app/components/ui/UiTextField.vue";
import UiTextarea from "@/app/components/ui/UiTextarea.vue";
import { listCredentials } from "@/app/services/credentials";
import { extractApiErrorMessage, isRequestCanceled } from "@/app/services/http";
import { listKnowledgeBases } from "@/app/services/knowledge";
import { listMcpServers } from "@/app/services/mcp";
import {
  getMarketAsset,
  installMarketAsset,
  listMyMarketSubmissions,
  listPublishedMarketAssets,
  submitAgentToMarket,
  submitKnowledgeBaseToMarket,
  submitMcpServerToMarket,
  submitWorkflowToMarket
} from "@/app/services/market";
import { listModelConfigs, listOfficialModelConfigs } from "@/app/services/models";
import { listWorkflows } from "@/app/services/workflow";
import { fetchAllPages } from "@/app/services/pagination";
import { useAuthStore } from "@/app/stores/auth";
import { usePaginatedAgentSelector } from "@/app/composables/usePaginatedAgentSelector";
import {
  buildMarketInstallPayload,
  runMarketInstallOnce,
  validateMarketInstallForm,
} from "@/app/utils/marketInstall";
import type { Credential } from "@/app/types/credential";
import type { KnowledgeBase } from "@/app/types/knowledge";
import type { MarketAsset, MarketAssetInstallResult, MarketAssetType } from "@/app/types/market";
import type { McpServer } from "@/app/types/mcp";
import type { ModelConfig, OfficialModelConfig } from "@/app/types/model";
import type { Workflow } from "@/app/types/workflow";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
let publishedLoadController: AbortController | null = null;
let detailLoadController: AbortController | null = null;
let baseLoadController: AbortController | null = null;
let submissionLoadController: AbortController | null = null;
let componentActive = false;
let initializingMarket = true;

const publishedAssets = ref<MarketAsset[]>([]);
const publishedPage = ref(0);
const publishedPageSize = 20;
const publishedTotal = ref(0);
const publishedTotalPages = ref(0);
const submissions = ref<MarketAsset[]>([]);
const submissionPage = ref(0);
const submissionPageSize = 20;
const submissionTotal = ref(0);
const submissionTotalPages = ref(0);
const selectedAsset = ref<MarketAsset | null>(null);
const selectedAssetId = ref<number | null>(null);
const assetTypeFilter = ref("");
const loadingPublished = ref(false);
const detailLoading = ref(false);
const submittingAsset = ref(false);
const installingAsset = ref(false);
const submitAssetError = ref("");
const installError = ref("");
const installSuccessMessage = ref("");
const marketLoadError = ref("");
const installResult = ref<MarketAssetInstallResult | null>(null);

const knowledgeBases = ref<KnowledgeBase[]>([]);
const mcpServers = ref<McpServer[]>([]);
const workflows = ref<Workflow[]>([]);
const credentials = ref<Credential[]>([]);
const userModels = ref<ModelConfig[]>([]);
const officialModels = ref<OfficialModelConfig[]>([]);

const submitForm = reactive({
  assetType: "AGENT",
  sourceEntityId: "",
  summary: "",
  description: ""
});
const selectedSubmitAgentId = toRef(submitForm, "sourceEntityId");
const {
  agentOptions: agentSourceOptions,
  agentPage: agentSourcePage,
  pageSize: agentSourcePageSize,
  agentTotal: agentSourceTotal,
  agentTotalPages: agentSourceTotalPages,
  agentSearchInput: agentSourceSearchDraft,
  appliedAgentSearch: agentSourceSearch,
  agentsLoading: loadingAgentSources,
  loadAgentPage,
  searchAgents,
  disposeAgentSelector,
} = usePaginatedAgentSelector(selectedSubmitAgentId, { pageSize: 200 });

const installForm = reactive({
  name: "",
  targetModelConfigId: "",
  targetOfficialModelConfigId: "",
  targetKnowledgeBaseId: "",
  targetRerankModelConfigId: "",
  targetEmbeddingModelConfigId: "",
  targetCredentialId: "",
  enabled: true
});

const assetTypeFilterOptions = [
  { label: "全部资产", value: "" },
  { label: "Agent", value: "AGENT" },
  { label: "知识库", value: "KNOWLEDGE_BASE" },
  { label: "MCP Server", value: "MCP_SERVER" },
  { label: "工作流", value: "WORKFLOW" }
];

const submitAssetTypeOptions = assetTypeFilterOptions.filter((item) => item.value);

const submitResourceOptions = computed(() => {
  if (submitForm.assetType === "KNOWLEDGE_BASE") {
    return knowledgeBases.value.map((item) => ({ label: item.name, value: String(item.id) }));
  }
  if (submitForm.assetType === "MCP_SERVER") {
    return mcpServers.value.map((item) => ({ label: item.name, value: String(item.id) }));
  }
  if (submitForm.assetType === "WORKFLOW") {
    return workflows.value.map((item) => ({ label: item.name, value: String(item.id) }));
  }
  return agentSourceOptions.value;
});

const agentSourceHint = computed(() => agentSourceSearch.value
  ? `搜索“${agentSourceSearch.value}”共 ${agentSourceTotal.value} 条；已选 Agent 会在切页后保留。`
  : `共 ${agentSourceTotal.value} 个 Agent，每页 ${agentSourcePageSize} 个；可搜索或翻页选择。`
);

const userChatModelOptions = computed(() =>
  userModels.value
    .filter((item) => item.modelType === "CHAT" && item.enabled)
    .map((item) => ({ label: `${item.name} · ${item.modelName}`, value: String(item.id) }))
);

const officialChatModelOptions = computed(() =>
  officialModels.value
    .filter((item) => item.modelType === "CHAT" && item.enabled)
    .map((item) => ({ label: `${item.name} · ${item.modelName}`, value: String(item.id) }))
);

const embeddingModelOptions = computed(() =>
  userModels.value
    .filter((item) => item.modelType === "EMBEDDING" && item.enabled)
    .map((item) => ({ label: `${item.name} · ${item.modelName}`, value: String(item.id) }))
);

const rerankModelOptions = computed(() =>
  userModels.value
    .filter((item) => item.modelType === "RERANK" && item.enabled)
    .map((item) => ({ label: `${item.name} · ${item.modelName}`, value: String(item.id) }))
);

const knowledgeBaseOptions = computed(() =>
  knowledgeBases.value.map((item) => ({ label: item.name, value: String(item.id) }))
);

const credentialOptions = computed(() =>
  credentials.value
    .filter((item) => item.status === "ACTIVE")
    .map((item) => ({ label: `${item.name} · ${item.provider}`, value: String(item.id) }))
);

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "未知时间";
  }
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function assetTypeLabel(type: string | null | undefined) {
  if (type === "AGENT") {
    return "Agent";
  }
  if (type === "KNOWLEDGE_BASE") {
    return "知识库";
  }
  if (type === "MCP_SERVER") {
    return "MCP Server";
  }
  if (type === "WORKFLOW") {
    return "工作流";
  }
  return type ?? "未知类型";
}

function assetStatusLabel(status: string | null | undefined) {
  if (status === "APPROVED") {
    return "已上架";
  }
  if (status === "PENDING") {
    return "待审核";
  }
  if (status === "REJECTED") {
    return "已拒绝";
  }
  if (status === "OFFLINE") {
    return "已下架";
  }
  return status ?? "未知状态";
}

function assetStatusClass(status: string | null | undefined) {
  if (status === "APPROVED") {
    return "bg-emerald-50 text-emerald-600";
  }
  if (status === "REJECTED") {
    return "bg-rose-50 text-rose-600";
  }
  if (status === "OFFLINE") {
    return "bg-slate-100 text-slate-500";
  }
  return "bg-amber-50 text-amber-600";
}

function resourceTypeLabel(type: string | null | undefined) {
  if (type === "AGENT") {
    return "Agent";
  }
  if (type === "KNOWLEDGE_BASE") {
    return "知识库";
  }
  if (type === "MCP_SERVER") {
    return "MCP Server";
  }
  if (type === "WORKFLOW") {
    return "工作流";
  }
  if (type === "MCP_TOOL") {
    return "MCP 工具";
  }
  return type ?? "资源";
}

function parseRouteAssetId() {
  const raw = typeof route.query.assetId === "string" ? Number(route.query.assetId) : null;
  return raw && Number.isFinite(raw) ? raw : null;
}

function resetInstallForm() {
  installForm.name = "";
  installForm.targetModelConfigId = "";
  installForm.targetOfficialModelConfigId = "";
  installForm.targetKnowledgeBaseId = "";
  installForm.targetRerankModelConfigId = "";
  installForm.targetEmbeddingModelConfigId = "";
  installForm.targetCredentialId = "";
  installForm.enabled = true;
  installError.value = "";
  installSuccessMessage.value = "";
  installResult.value = null;
}

async function loadBaseResources() {
  baseLoadController?.abort();
  const controller = new AbortController();
  baseLoadController = controller;
  if (!authStore.isOwner) {
    const submissionResult = await listMyMarketSubmissions(0, submissionPageSize, controller.signal);
    if (controller.signal.aborted) return;
    submissions.value = submissionResult.items;
    submissionTotal.value = submissionResult.total;
    submissionTotalPages.value = submissionResult.totalPages;
    if (baseLoadController === controller) baseLoadController = null;
    return;
  }
  const [
    allKnowledgeBases,
    allMcpServers,
    allWorkflows,
    allCredentials,
    allUserModels,
    allOfficialModels,
    submissionResult
  ] = await Promise.all([
    fetchAllPages((page, size) => listKnowledgeBases(page, size, controller.signal)),
    fetchAllPages((page, size) => listMcpServers(page, size, controller.signal)),
    fetchAllPages((page, size) => listWorkflows(page, size, controller.signal)),
    fetchAllPages((page, size) => listCredentials(page, size, controller.signal)),
    fetchAllPages((page, size) => listModelConfigs(page, size, controller.signal)),
    fetchAllPages((page, size) => listOfficialModelConfigs(page, size, controller.signal)),
    listMyMarketSubmissions(0, submissionPageSize, controller.signal)
  ]);

  if (controller.signal.aborted) return;
  knowledgeBases.value = allKnowledgeBases;
  mcpServers.value = allMcpServers;
  workflows.value = allWorkflows;
  credentials.value = allCredentials;
  userModels.value = allUserModels;
  officialModels.value = allOfficialModels;
  submissions.value = submissionResult.items;
  submissionTotal.value = submissionResult.total;
  submissionTotalPages.value = submissionResult.totalPages;
  if (baseLoadController === controller) baseLoadController = null;
}

async function loadAgentSources(newPage?: number) {
  if (!authStore.isOwner) {
    return false;
  }
  marketLoadError.value = "";
  try {
    return await loadAgentPage(newPage ?? 0);
  } catch (error) {
    if (!isRequestCanceled(error)) {
      marketLoadError.value = extractApiErrorMessage(error, "加载 Agent 提交源失败");
    }
    return false;
  }
}

async function applyAgentSourceSearch() {
  marketLoadError.value = "";
  try {
    await searchAgents();
  } catch (error) {
    if (!isRequestCanceled(error)) {
      marketLoadError.value = extractApiErrorMessage(error, "搜索 Agent 提交源失败");
    }
  }
}

async function clearAgentSourceSearch() {
  agentSourceSearchDraft.value = "";
  marketLoadError.value = "";
  try {
    await loadAgentPage(0, undefined, "");
  } catch (error) {
    if (!isRequestCanceled(error)) {
      marketLoadError.value = extractApiErrorMessage(error, "加载 Agent 提交源失败");
    }
  }
}

async function loadPublishedAssets(newPage?: number) {
  if (newPage !== undefined) publishedPage.value = newPage;
  publishedLoadController?.abort();
  const controller = new AbortController();
  publishedLoadController = controller;
  const requestedType = assetTypeFilter.value;
  const requestedPage = publishedPage.value;
  loadingPublished.value = true;
  marketLoadError.value = "";
  try {
    const result = await listPublishedMarketAssets(
      (requestedType || undefined) as MarketAssetType | undefined,
      requestedPage,
      publishedPageSize,
      controller.signal
    );
    if (controller.signal.aborted || requestedType !== assetTypeFilter.value || requestedPage !== publishedPage.value) return;
    publishedAssets.value = result.items;
    publishedTotal.value = result.total;
    publishedTotalPages.value = result.totalPages;
    if (selectedAssetId.value && !publishedAssets.value.some((item) => item.id === selectedAssetId.value)) {
      selectedAssetId.value = null;
      selectedAsset.value = null;
    }

    if (!selectedAssetId.value) {
      const routeAssetId = parseRouteAssetId();
      const candidate = publishedAssets.value.find((item) => item.id === routeAssetId) ?? publishedAssets.value[0] ?? null;
      selectedAssetId.value = candidate?.id ?? null;
    }
  } catch (error) {
    if (!isRequestCanceled(error)) {
      marketLoadError.value = extractApiErrorMessage(error, "加载市场资产失败");
    }
  } finally {
    if (publishedLoadController === controller) {
      loadingPublished.value = false;
      publishedLoadController = null;
    }
  }
}

async function loadSelectedAsset() {
  marketLoadError.value = "";
  installResult.value = null;
  if (!selectedAssetId.value) {
    selectedAsset.value = null;
    return;
  }

  detailLoadController?.abort();
  const controller = new AbortController();
  detailLoadController = controller;
  const requestedAssetId = selectedAssetId.value;
  detailLoading.value = true;
  try {
    const asset = await getMarketAsset(requestedAssetId, controller.signal);
    if (controller.signal.aborted || requestedAssetId !== selectedAssetId.value) return;
    selectedAsset.value = asset;
  } catch (error) {
    if (!isRequestCanceled(error)) {
      marketLoadError.value = extractApiErrorMessage(error, "加载市场资产详情失败");
    }
  } finally {
    if (detailLoadController === controller) {
      detailLoading.value = false;
      detailLoadController = null;
    }
  }
}

async function loadSubmissions(newPage?: number) {
  if (newPage !== undefined) submissionPage.value = newPage;
  submissionLoadController?.abort();
  const controller = new AbortController();
  submissionLoadController = controller;
  const requestedPage = submissionPage.value;
  try {
    const result = await listMyMarketSubmissions(requestedPage, submissionPageSize, controller.signal);
    if (controller.signal.aborted || requestedPage !== submissionPage.value) return;
    submissions.value = result.items;
    submissionTotal.value = result.total;
    submissionTotalPages.value = result.totalPages;
  } catch (error) {
    if (!isRequestCanceled(error)) {
      marketLoadError.value = extractApiErrorMessage(error, "加载提交记录失败");
    }
  } finally {
    if (submissionLoadController === controller) submissionLoadController = null;
  }
}

function selectAsset(id: number) {
  selectedAssetId.value = id;
}

async function submitAsset() {
  submitAssetError.value = "";
  if (!authStore.isOwner) {
    submitAssetError.value = "只有工作区拥有者可以提交市场资产。";
    return;
  }
  if (!submitForm.sourceEntityId) {
    submitAssetError.value = "请先选择一个要提交的对象。";
    return;
  }

  submittingAsset.value = true;
  try {
    const payload = {
      summary: submitForm.summary.trim() || undefined,
      description: submitForm.description.trim() || undefined
    };

    const sourceId = Number(submitForm.sourceEntityId);
    if (submitForm.assetType === "KNOWLEDGE_BASE") {
      await submitKnowledgeBaseToMarket(sourceId, payload);
    } else if (submitForm.assetType === "MCP_SERVER") {
      await submitMcpServerToMarket(sourceId, payload);
    } else if (submitForm.assetType === "WORKFLOW") {
      await submitWorkflowToMarket(sourceId, payload);
    } else {
      await submitAgentToMarket(sourceId, payload);
    }

    submitForm.sourceEntityId = "";
    submitForm.summary = "";
    submitForm.description = "";
    submissionPage.value = 0;
    await loadSubmissions();
  } catch (error) {
    submitAssetError.value = extractApiErrorMessage(error, "提交市场资产失败");
  } finally {
    submittingAsset.value = false;
  }
}

async function installSelectedAsset() {
  if (installingAsset.value) {
    return;
  }
  installError.value = "";
  installSuccessMessage.value = "";
  if (!authStore.isOwner) {
    installError.value = "只有工作区拥有者可以安装市场资产。";
    return;
  }
  if (!selectedAsset.value || !selectedAssetId.value) {
    installError.value = "请先选择一个要安装的市场资产。";
    return;
  }

  const validationError = validateMarketInstallForm(selectedAsset.value.assetType, installForm);
  if (validationError) {
    installError.value = validationError;
    return;
  }

  installResult.value = null;
  try {
    await runMarketInstallOnce(installingAsset, async () => {
      const result = await installMarketAsset(selectedAssetId.value!, buildMarketInstallPayload(installForm));
      installResult.value = result;
      installSuccessMessage.value = `“${result.installedName}”安装成功，新对象 ID 为 ${result.installedEntityId}。`;
      await loadPublishedAssets();
      return result;
    });
  } catch (error) {
    installError.value = extractApiErrorMessage(error, "安装市场资产失败");
  }
}

watch(assetTypeFilter, async () => {
  selectedAssetId.value = null;
  publishedPage.value = 0;
  await loadPublishedAssets();
  if (!componentActive) return;
  await loadSelectedAsset();
});

watch(() => submitForm.assetType, () => {
  submitForm.sourceEntityId = "";
});

watch(selectedAssetId, async (value) => {
  if (initializingMarket) return;
  await router.replace({
    query: {
      ...route.query,
      assetId: value ? String(value) : undefined
    }
  });
  if (!componentActive || value !== selectedAssetId.value) return;
  resetInstallForm();
  await loadSelectedAsset();
});

onMounted(async () => {
  componentActive = true;
  try {
    await Promise.all([loadBaseResources(), loadAgentSources()]);
    if (!componentActive) return;
    await loadPublishedAssets();
    if (!componentActive) return;
    initializingMarket = false;
    if (selectedAssetId.value) {
      await loadSelectedAsset();
    }
  } catch (error) {
    initializingMarket = false;
    if (!isRequestCanceled(error)) {
      marketLoadError.value = extractApiErrorMessage(error, "加载共享市场工作台失败");
    }
  }
});

onBeforeUnmount(() => {
  componentActive = false;
  publishedLoadController?.abort();
  detailLoadController?.abort();
  baseLoadController?.abort();
  submissionLoadController?.abort();
  disposeAgentSelector();
});
</script>
