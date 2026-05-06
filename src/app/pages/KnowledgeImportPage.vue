<template>
  <div class="ea-scroll flex h-full min-h-0 flex-col overflow-y-auto p-5 lg:p-6">
    <div class="mb-5 flex flex-col gap-5 border-b border-line pb-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div class="text-xs font-semibold uppercase tracking-[0.22em] text-accent">阶段 5 · 知识库模块</div>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink">把知识真正接入你的 Agent</h1>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
          这里已经接上真实的知识库、文档上传和文档状态接口。你可以先创建知识库，再上传文件，最后把它绑定到 Agent 上走通完整 RAG 主链。
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3 rounded-full border border-line bg-white px-4 py-3 shadow-card">
        <div
          v-for="(step, index) in steps"
          :key="step.label"
          class="flex items-center gap-3"
        >
          <div
            class="flex h-9 items-center gap-2 rounded-full px-3 text-sm font-semibold"
            :class="step.active ? 'bg-accent text-white' : 'bg-canvas text-muted'"
          >
            <span class="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">
              {{ index + 1 }}
            </span>
            {{ step.label }}
          </div>
          <div v-if="index < steps.length - 1" class="hidden h-px w-8 bg-line lg:block" />
        </div>
      </div>
    </div>

    <div class="grid min-h-0 flex-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <SectionCard
        class="min-h-0 overflow-hidden"
        eyebrow="知识库列表"
        title="当前租户的知识库"
        description="左侧选择知识库，右侧继续编辑、上传文档和绑定 Agent。"
      >
        <div class="flex h-full min-h-0 flex-col">
          <div class="mb-4 flex flex-wrap items-center gap-3">
            <div class="rounded-full border border-line bg-canvas px-4 py-2 text-sm text-muted">
              共 {{ kbTotal }} 个知识库
            </div>
            <UiButton variant="secondary" @click="startCreate">新建知识库</UiButton>
          </div>

          <div v-if="loading" class="rounded-[20px] border border-line bg-canvas px-4 py-10 text-sm text-muted">
            正在加载知识库列表...
          </div>

          <div
            v-else-if="!knowledgeBases.length"
            class="rounded-[20px] border border-dashed border-line bg-canvas px-4 py-10 text-center text-sm leading-6 text-muted"
          >
            当前还没有知识库。先在右侧创建一个知识库，再上传文档让 Agent 可以检索。
          </div>

          <div v-else class="ea-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            <button
              v-for="knowledgeBase in knowledgeBases"
              :key="knowledgeBase.id"
              class="w-full rounded-[22px] border px-4 py-4 text-left transition"
              :class="selectedKnowledgeBaseId === knowledgeBase.id ? 'border-accent bg-accent-soft' : 'border-line bg-canvas hover:bg-white'"
              @click="selectKnowledgeBase(knowledgeBase)"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <div class="text-base font-semibold text-ink">{{ knowledgeBase.name }}</div>
                  <div class="mt-1 text-sm text-muted">
                    {{ knowledgeBase.embeddingModelConfigName ?? "未绑定向量模型" }}
                  </div>
                </div>
                <span
                  class="rounded-full px-3 py-1 text-xs font-medium"
                  :class="knowledgeBase.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'"
                >
                  {{ knowledgeBase.enabled ? "启用" : "停用" }}
                </span>
              </div>
              <div v-if="knowledgeBase.description" class="mt-3 text-sm leading-6 text-muted">
                {{ knowledgeBase.description }}
              </div>
              <div class="mt-3 text-xs text-muted">
                更新于 {{ formatDateTime(knowledgeBase.updatedAt) }}
              </div>
            </button>
          </div>

          <UiPagination
            :page="kbPage"
            :size="kbPageSize"
            :total="kbTotal"
            :total-pages="kbTotalPages"
            @change="loadKnowledgeBasesList"
          />
        </div>
      </SectionCard>

      <div class="grid min-h-0 gap-5 xl:grid-rows-[auto_minmax(0,1fr)]">
        <SectionCard
          eyebrow="步骤 1"
          :title="selectedKnowledgeBaseId ? '编辑知识库' : '创建知识库'"
          description="先确定知识库名称、描述和 Embedding 模型。创建成功后，就可以继续上传文档。"
        >
          <form class="space-y-5" @submit.prevent="submitKnowledgeBase">
            <div class="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
              <UiTextField
                v-model="form.name"
                label="知识库名称"
                placeholder="例如：产品手册知识库"
                :error="errors.name"
              />
              <UiSelect
                v-model="form.embeddingModelConfigId"
                label="Embedding 模型"
                :options="embeddingModelOptions"
                placeholder="请选择一个向量模型"
                :hint="embeddingModelOptions.length ? '这里只显示启用中的 Embedding 模型。' : '当前没有可用 Embedding 模型，请先去模型配置页创建。'"
                :error="errors.embeddingModelConfigId"
              />
            </div>

            <UiTextarea
              v-model="form.description"
              label="知识库描述"
              placeholder="例如：存放产品说明书、常见问题和入门手册"
              :rows="4"
            />

            <div class="grid gap-3 md:grid-cols-2">
              <UiCheckbox
                v-model="form.enabled"
                label="启用知识库"
                hint="停用后不会参与 Agent 运行时检索。"
              />
              <div class="rounded-[18px] border border-line bg-canvas px-4 py-4 text-sm leading-6 text-muted">
                当前知识库创建后会直接接入真实上传链路，文档上传成功后会同步完成文本提取、切片和向量化。
              </div>
            </div>

            <div v-if="submitError" class="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {{ submitError }}
            </div>

            <div class="flex flex-wrap items-center gap-3 pt-1">
              <UiButton type="submit" :disabled="saving || !embeddingModelOptions.length">
                {{ saving ? "保存中..." : selectedKnowledgeBaseId ? "保存知识库" : "创建知识库" }}
              </UiButton>
              <UiButton variant="secondary" :disabled="saving" @click="startCreate">
                新建空白表单
              </UiButton>
              <UiButton
                v-if="selectedKnowledgeBaseId"
                type="button"
                variant="ghost"
                :disabled="saving || deletingKnowledgeBase"
                @click="removeKnowledgeBase"
              >
                {{ deletingKnowledgeBase ? "删除中..." : "删除知识库" }}
              </UiButton>
              <RouterLink
                v-if="!embeddingModelOptions.length"
                class="text-sm font-medium text-accent transition hover:opacity-80"
                to="/app/model-configs"
              >
                去创建 Embedding 模型
              </RouterLink>
            </div>
          </form>
        </SectionCard>

        <div class="grid min-h-0 gap-5 xl:grid-cols-[minmax(0,1.15fr)_320px]">
          <SectionCard
            class="min-h-0 overflow-hidden"
            eyebrow="步骤 2"
            title="上传文档并查看状态"
            description="支持批量上传。每个文档上传后会同步完成抽取、切片、向量化和检索索引。"
          >
            <div class="flex h-full min-h-0 flex-col">
              <div
                class="rounded-[24px] border border-dashed px-5 py-5 transition"
                :class="dragging ? 'border-accent bg-accent-soft' : 'border-accent/35 bg-[linear-gradient(180deg,rgba(47,109,246,0.08),rgba(47,109,246,0.04))]'"
                @dragenter.prevent="dragging = true"
                @dragover.prevent="dragging = true"
                @dragleave.prevent="dragging = false"
                @drop.prevent="handleDrop"
              >
                <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div class="min-w-0">
                    <div class="flex items-center gap-3">
                      <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-accent shadow-sm">
                        <FileUp class="h-5 w-5" />
                      </div>
                      <div>
                        <div class="text-lg font-semibold text-ink">拖拽文件到这里，或点击选择文件</div>
                        <div class="mt-1 text-sm text-muted">
                          {{
                            selectedKnowledgeBaseId
                              ? "当前版本支持 TXT、Markdown、PDF。文档会直接导入当前知识库，并同步生成可检索切片。"
                              : "请先在上方创建或选择知识库，然后再上传文档。"
                          }}
                        </div>
                      </div>
                    </div>
                    <div class="mt-4 flex flex-wrap gap-2">
                      <span
                        v-for="tag in fileTypes"
                        :key="tag"
                        class="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-xs font-medium text-muted"
                      >
                        {{ tag }}
                      </span>
                    </div>
                  </div>

                  <div class="flex flex-col items-start gap-3 lg:items-end">
                    <UiButton :disabled="uploading || !selectedKnowledgeBaseId" @click="openFilePicker">
                      {{ uploading ? "上传中..." : "选择文件" }}
                    </UiButton>
                    <div v-if="uploadingFileNames.length" class="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-sm text-ink shadow-sm">
                      {{ uploadingFileNames.join("、") }}
                    </div>
                  </div>
                </div>
              </div>

              <input
                ref="fileInput"
                type="file"
                class="hidden"
                accept=".txt,.md,.markdown,.pdf,text/plain,text/markdown,application/pdf"
                multiple
                @change="handleFileChange"
              >

              <div class="mt-5 mb-3 flex items-center justify-between gap-3">
                <div class="text-sm font-semibold text-ink">文档列表</div>
                <div class="rounded-full border border-line bg-canvas px-3 py-1 text-xs text-muted">
                  {{ docTotal }} 份文档
                </div>
              </div>

              <div v-if="documentsLoading" class="rounded-[20px] border border-line bg-canvas px-4 py-10 text-sm text-muted">
                正在加载文档列表...
              </div>

              <div
                v-else-if="!selectedKnowledgeBaseId"
                class="rounded-[20px] border border-dashed border-line bg-canvas px-4 py-10 text-center text-sm leading-6 text-muted"
              >
                先创建或选择一个知识库，这里就会显示文档列表和处理状态。
              </div>

              <div
                v-else-if="!documents.length"
                class="rounded-[20px] border border-dashed border-line bg-canvas px-4 py-10 text-center text-sm leading-6 text-muted"
              >
                当前知识库还没有文档。上传第一份文档后，这里会显示状态、切片数量和操作入口。
              </div>

              <div v-else class="ea-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                <div
                  v-for="document in documents"
                  :key="document.id"
                  class="rounded-[22px] border border-line bg-canvas px-4 py-4"
                >
                  <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-3">
                        <div class="truncate text-base font-semibold text-ink">{{ document.fileName }}</div>
                        <span
                          class="rounded-full px-3 py-1 text-xs font-medium"
                          :class="documentStatusClass(document.status)"
                        >
                          {{ documentStatusLabel(document.status) }}
                        </span>
                      </div>
                      <div class="mt-2 flex flex-wrap gap-2 text-xs text-muted">
                        <span class="rounded-full border border-line bg-white px-3 py-1">
                          {{ formatFileSize(document.fileSize) }}
                        </span>
                        <span class="rounded-full border border-line bg-white px-3 py-1">
                          切片 {{ document.chunkCount ?? 0 }}
                        </span>
                        <span class="rounded-full border border-line bg-white px-3 py-1">
                          更新时间 {{ formatDateTime(document.updatedAt) }}
                        </span>
                      </div>
                    </div>

                    <div class="flex flex-wrap gap-2">
                      <UiButton
                        type="button"
                        variant="secondary"
                        :disabled="processingDocumentId === document.id || document.status !== 'READY' || !selectedKnowledgeBaseId"
                        @click="reindexDocument(document.id)"
                      >
                        {{ processingDocumentId === document.id ? "处理中..." : "重建索引" }}
                      </UiButton>
                      <UiButton
                        type="button"
                        variant="ghost"
                        :disabled="processingDocumentId === document.id || !selectedKnowledgeBaseId"
                        @click="removeDocument(document.id, document.fileName)"
                      >
                        删除文档
                      </UiButton>
                    </div>
                  </div>
                </div>
              </div>

              <UiPagination
                :page="docPage"
                :size="docPageSize"
                :total="docTotal"
                :total-pages="docTotalPages"
                @change="loadDocuments"
              />
            </div>
          </SectionCard>

          <div class="space-y-5">
            <SectionCard eyebrow="步骤 3" title="绑定到 Agent">
              <div class="space-y-4 text-sm leading-6 text-muted">
                <p>知识库创建完成后，你可以直接跳转到 Agent 管理页，把当前知识库绑定到某个 Agent 上。</p>
                <RouterLink
                  v-if="selectedKnowledgeBaseId"
                  class="inline-flex rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-card transition hover:brightness-105"
                  :to="`/app/agents?knowledgeBaseId=${selectedKnowledgeBaseId}`"
                >
                  去绑定当前知识库
                </RouterLink>
                <div v-else class="rounded-[18px] border border-dashed border-line bg-canvas px-4 py-4">
                  先选择或创建一个知识库，然后这里会出现一键跳转绑定入口。
                </div>
              </div>
            </SectionCard>

            <SectionCard eyebrow="知识库摘要" title="当前选择">
              <div v-if="selectedKnowledgeBase" class="space-y-3 text-sm">
                <div class="flex items-center justify-between rounded-2xl border border-line bg-canvas px-4 py-3">
                  <span class="text-muted">知识库名称</span>
                  <span class="font-semibold text-ink">{{ selectedKnowledgeBase.name }}</span>
                </div>
                <div class="flex items-center justify-between rounded-2xl border border-line bg-canvas px-4 py-3">
                  <span class="text-muted">向量模型</span>
                  <span class="font-semibold text-ink">{{ selectedKnowledgeBase.embeddingModelConfigName ?? "未设置" }}</span>
                </div>
                <div class="flex items-center justify-between rounded-2xl border border-line bg-canvas px-4 py-3">
                  <span class="text-muted">文档数量</span>
                  <span class="font-semibold text-ink">{{ docTotal }}</span>
                </div>
                <div class="flex items-center justify-between rounded-2xl border border-line bg-canvas px-4 py-3">
                  <span class="text-muted">状态</span>
                  <span class="font-semibold text-ink">{{ selectedKnowledgeBase.enabled ? "启用中" : "已停用" }}</span>
                </div>
              </div>
              <div v-else class="rounded-[18px] border border-dashed border-line bg-canvas px-4 py-8 text-sm leading-6 text-muted">
                当前还没有选中的知识库。先创建一个知识库，这里会展示它的摘要和后续动作。
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { FileUp } from "lucide-vue-next";
import SectionCard from "@/app/components/SectionCard.vue";
import UiButton from "@/app/components/ui/UiButton.vue";
import UiCheckbox from "@/app/components/ui/UiCheckbox.vue";
import UiPagination from "@/app/components/ui/UiPagination.vue";
import UiSelect from "@/app/components/ui/UiSelect.vue";
import UiTextarea from "@/app/components/ui/UiTextarea.vue";
import UiTextField from "@/app/components/ui/UiTextField.vue";
import { extractApiErrorMessage } from "@/app/services/http";
import {
  createKnowledgeBase,
  deleteKnowledgeBase,
  deleteKnowledgeDocument,
  listKnowledgeBases,
  listKnowledgeDocuments,
  reindexKnowledgeDocument,
  updateKnowledgeBase,
  uploadKnowledgeDocument
} from "@/app/services/knowledge";
import { listModelConfigs } from "@/app/services/models";
import type { ModelConfig } from "@/app/types/model";
import type { KnowledgeBase, KnowledgeDocument } from "@/app/types/knowledge";

const route = useRoute();
const router = useRouter();

const steps = computed(() => [
  { label: "创建知识库", active: true },
  { label: "上传文档", active: Boolean(selectedKnowledgeBaseId.value) },
  { label: "绑定 Agent", active: Boolean(selectedKnowledgeBaseId.value && documents.value.length) }
]);

const knowledgeBases = ref<KnowledgeBase[]>([]);
const kbPage = ref(0);
const kbPageSize = 20;
const kbTotal = ref(0);
const kbTotalPages = ref(0);
const documents = ref<KnowledgeDocument[]>([]);
const docPage = ref(0);
const docPageSize = 20;
const docTotal = ref(0);
const docTotalPages = ref(0);
const modelConfigs = ref<ModelConfig[]>([]);
const selectedKnowledgeBaseId = ref<number | null>(null);
const loading = ref(false);
const documentsLoading = ref(false);
const saving = ref(false);
const deletingKnowledgeBase = ref(false);
const uploading = ref(false);
const processingDocumentId = ref<number | null>(null);
const submitError = ref("");
const dragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const uploadingFileNames = ref<string[]>([]);

const form = reactive({
  name: "",
  description: "",
  embeddingModelConfigId: "",
  enabled: true
});

const errors = reactive({
  name: "",
  embeddingModelConfigId: ""
});

const fileTypes = ["TXT", "Markdown", "PDF"];
const supportedFileExtensions = new Set(["txt", "md", "markdown", "pdf"]);

const selectedKnowledgeBase = computed(() =>
  knowledgeBases.value.find((item) => item.id === selectedKnowledgeBaseId.value) ?? null
);

const embeddingModels = computed(() =>
  modelConfigs.value.filter((item) => item.modelType === "EMBEDDING" && item.enabled)
);

const embeddingModelOptions = computed(() =>
  embeddingModels.value.map((item) => ({
    label: `${item.name} · ${item.modelName}`,
    value: String(item.id)
  }))
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

function formatFileSize(bytes: number | null | undefined) {
  if (!bytes) {
    return "0 B";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function documentStatusLabel(status: string) {
  if (status === "READY") {
    return "已就绪";
  }
  if (status === "PROCESSING") {
    return "处理中";
  }
  if (status === "FAILED") {
    return "处理失败";
  }
  return status;
}

function documentStatusClass(status: string) {
  if (status === "READY") {
    return "bg-emerald-50 text-emerald-600";
  }
  if (status === "PROCESSING") {
    return "bg-amber-50 text-amber-600";
  }
  if (status === "FAILED") {
    return "bg-rose-50 text-rose-600";
  }
  return "bg-slate-100 text-slate-500";
}

function isSupportedKnowledgeFile(file: File) {
  const extension = file.name.includes(".")
    ? file.name.substring(file.name.lastIndexOf(".") + 1).toLowerCase()
    : "";
  return supportedFileExtensions.has(extension);
}

function syncForm(knowledgeBase: KnowledgeBase | null) {
  if (!knowledgeBase) {
    form.name = "";
    form.description = "";
    form.embeddingModelConfigId = embeddingModelOptions.value[0]?.value ?? "";
    form.enabled = true;
    return;
  }

  form.name = knowledgeBase.name;
  form.description = knowledgeBase.description ?? "";
  form.embeddingModelConfigId = knowledgeBase.embeddingModelConfigId ? String(knowledgeBase.embeddingModelConfigId) : "";
  form.enabled = knowledgeBase.enabled;
}

function resetErrors() {
  errors.name = "";
  errors.embeddingModelConfigId = "";
  submitError.value = "";
}

function startCreate() {
  selectedKnowledgeBaseId.value = null;
  documents.value = [];
  syncForm(null);
  resetErrors();
}

function selectKnowledgeBase(knowledgeBase: KnowledgeBase) {
  selectedKnowledgeBaseId.value = knowledgeBase.id;
  syncForm(knowledgeBase);
  resetErrors();
}

function parseRouteKnowledgeBaseId() {
  const raw = typeof route.query.knowledgeBaseId === "string" ? Number(route.query.knowledgeBaseId) : null;
  return raw && Number.isFinite(raw) ? raw : null;
}

function validateKnowledgeBaseForm() {
  errors.name = form.name.trim() ? "" : "请输入知识库名称";
  errors.embeddingModelConfigId = form.embeddingModelConfigId ? "" : "请选择一个 Embedding 模型";
  return !errors.name && !errors.embeddingModelConfigId;
}

async function loadKnowledgeBasesList(newPage?: number) {
  if (newPage !== undefined) kbPage.value = newPage;
  loading.value = true;
  try {
    const result = await listKnowledgeBases(kbPage.value, kbPageSize);
    knowledgeBases.value = result.items;
    kbTotal.value = result.total;
    kbTotalPages.value = result.totalPages;
  } catch (error) {
    submitError.value = extractApiErrorMessage(error, "加载知识库失败");
  } finally {
    loading.value = false;
  }
}

async function loadKnowledgeBaseResources() {
  loading.value = true;
  try {
    const [knowledgeBaseResult, modelConfigList] = await Promise.all([
      listKnowledgeBases(0, kbPageSize),
      listModelConfigs(0, 999)
    ]);
    knowledgeBases.value = knowledgeBaseResult.items;
    kbTotal.value = knowledgeBaseResult.total;
    kbTotalPages.value = knowledgeBaseResult.totalPages;
    modelConfigs.value = modelConfigList.items;

    const queryKnowledgeBaseId = parseRouteKnowledgeBaseId();
    const activeKnowledgeBaseId = selectedKnowledgeBaseId.value && knowledgeBases.value.some((item) => item.id === selectedKnowledgeBaseId.value)
      ? selectedKnowledgeBaseId.value
      : queryKnowledgeBaseId && knowledgeBases.value.some((item) => item.id === queryKnowledgeBaseId)
        ? queryKnowledgeBaseId
        : knowledgeBases.value[0]?.id ?? null;

    if (activeKnowledgeBaseId !== selectedKnowledgeBaseId.value) {
      selectedKnowledgeBaseId.value = activeKnowledgeBaseId;
    } else {
      syncForm(selectedKnowledgeBase.value);
      await loadDocuments();
    }

    if (!activeKnowledgeBaseId) {
      syncForm(null);
    }
  } catch (error) {
    submitError.value = extractApiErrorMessage(error, "加载知识库失败");
  } finally {
    loading.value = false;
  }
}

async function loadDocuments(newPage?: number) {
  if (newPage !== undefined) docPage.value = newPage;
  if (!selectedKnowledgeBaseId.value) {
    documents.value = [];
    return;
  }

  documentsLoading.value = true;
  try {
    const result = await listKnowledgeDocuments(selectedKnowledgeBaseId.value, docPage.value, docPageSize);
    documents.value = result.items;
    docTotal.value = result.total;
    docTotalPages.value = result.totalPages;
  } catch (error) {
    submitError.value = extractApiErrorMessage(error, "加载文档列表失败");
  } finally {
    documentsLoading.value = false;
  }
}

async function submitKnowledgeBase() {
  resetErrors();
  if (!validateKnowledgeBaseForm()) {
    return;
  }

  saving.value = true;
  try {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      embeddingModelConfigId: Number(form.embeddingModelConfigId),
      enabled: form.enabled
    };

    if (selectedKnowledgeBaseId.value) {
      const updated = await updateKnowledgeBase(selectedKnowledgeBaseId.value, payload);
      await loadKnowledgeBaseResources();
      selectedKnowledgeBaseId.value = updated.id;
    } else {
      const created = await createKnowledgeBase(payload);
      await loadKnowledgeBaseResources();
      selectedKnowledgeBaseId.value = created.id;
    }
  } catch (error) {
    submitError.value = extractApiErrorMessage(error, "保存知识库失败");
  } finally {
    saving.value = false;
  }
}

async function removeKnowledgeBase() {
  if (!selectedKnowledgeBaseId.value) {
    return;
  }
  if (!window.confirm("确定删除这个知识库吗？只有空知识库且未绑定 Agent 时才能删除。")) {
    return;
  }

  deletingKnowledgeBase.value = true;
  submitError.value = "";
  try {
    await deleteKnowledgeBase(selectedKnowledgeBaseId.value);
    selectedKnowledgeBaseId.value = null;
    await loadKnowledgeBaseResources();
  } catch (error) {
    submitError.value = extractApiErrorMessage(error, "删除知识库失败");
  } finally {
    deletingKnowledgeBase.value = false;
  }
}

function openFilePicker() {
  if (!selectedKnowledgeBaseId.value || uploading.value) {
    return;
  }
  fileInput.value?.click();
}

async function uploadFiles(files: File[]) {
  if (!selectedKnowledgeBaseId.value || !files.length) {
    submitError.value = "请先创建或选择一个知识库。";
    return;
  }

  const unsupportedFiles = files.filter((file) => !isSupportedKnowledgeFile(file));
  if (unsupportedFiles.length) {
    submitError.value = `当前版本只支持 TXT、Markdown、PDF。以下文件暂不支持：${unsupportedFiles.map((file) => file.name).join("、")}`;
    return;
  }

  uploading.value = true;
  submitError.value = "";
  uploadingFileNames.value = files.map((file) => file.name);

  try {
    for (const file of files) {
      await uploadKnowledgeDocument(selectedKnowledgeBaseId.value, file);
    }
    await loadDocuments();
    await loadKnowledgeBaseResources();
  } catch (error) {
    submitError.value = extractApiErrorMessage(error, "上传文档失败");
  } finally {
    uploading.value = false;
    uploadingFileNames.value = [];
  }
}

async function reindexDocument(documentId: number) {
  if (!selectedKnowledgeBaseId.value) {
    return;
  }

  processingDocumentId.value = documentId;
  submitError.value = "";
  try {
    await reindexKnowledgeDocument(selectedKnowledgeBaseId.value, documentId);
    await loadDocuments();
  } catch (error) {
    submitError.value = extractApiErrorMessage(error, "重建索引失败");
  } finally {
    processingDocumentId.value = null;
  }
}

async function removeDocument(documentId: number, fileName: string) {
  if (!selectedKnowledgeBaseId.value) {
    return;
  }
  if (!window.confirm(`确定删除文档“${fileName}”吗？对应切片和检索索引也会一起删除。`)) {
    return;
  }

  processingDocumentId.value = documentId;
  submitError.value = "";
  try {
    await deleteKnowledgeDocument(selectedKnowledgeBaseId.value, documentId);
    await loadDocuments();
  } catch (error) {
    submitError.value = extractApiErrorMessage(error, "删除文档失败");
  } finally {
    processingDocumentId.value = null;
  }
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = target.files ? Array.from(target.files) : [];
  target.value = "";
  if (!files.length) {
    return;
  }
  await uploadFiles(files);
}

async function handleDrop(event: DragEvent) {
  dragging.value = false;
  const files = event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : [];
  if (!files.length) {
    return;
  }
  await uploadFiles(files);
}

watch(selectedKnowledgeBaseId, async (value) => {
  await router.replace({
    query: {
      ...route.query,
      knowledgeBaseId: value ? String(value) : undefined
    }
  });
  syncForm(selectedKnowledgeBase.value);
  docPage.value = 0;
  await loadDocuments();
});

watch(embeddingModelOptions, (options) => {
  if (!form.embeddingModelConfigId && options.length) {
    form.embeddingModelConfigId = options[0].value;
  }
});

onMounted(async () => {
  await loadKnowledgeBaseResources();
});
</script>
