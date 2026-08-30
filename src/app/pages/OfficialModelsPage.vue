<template>
  <div class="ea-scroll h-full overflow-y-auto p-5 lg:p-8">
    <div class="mb-6 flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="text-xs font-semibold uppercase tracking-[0.22em] text-accent">模型</div>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink">官方模型</h1>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <button
          v-for="filter in filters"
          :key="filter.value"
          type="button"
          class="rounded-full border px-4 py-2 text-sm font-medium transition"
          :class="activeFilter === filter.value ? 'border-accent bg-accent text-white shadow-card' : 'border-line bg-white text-muted hover:border-accent hover:text-accent'"
          @click="activeFilter = filter.value"
        >
          {{ filter.label }}
        </button>
      </div>
    </div>

    <div v-if="submitError" class="mb-5 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600" role="alert">
      {{ submitError }}
    </div>

    <div v-if="loading" class="rounded-[24px] border border-line bg-white px-4 py-12 text-sm text-muted shadow-card">
      正在加载官方模型...
    </div>

    <div v-else-if="!filteredModels.length" class="rounded-[24px] border border-dashed border-line bg-white px-4 py-12 text-center text-sm text-muted shadow-card">
      暂无可用的官方模型。
    </div>

    <div v-else class="grid gap-5 xl:grid-cols-2">
      <SectionCard
        v-for="model in filteredModels"
        :key="model.id"
        eyebrow="官方模型"
        :title="model.name"
        :description="model.description || `${providerLabel(model.provider)} · ${model.modelName}`"
      >
        <div class="grid gap-3 md:grid-cols-2">
          <div class="rounded-2xl border border-line bg-canvas px-4 py-3 text-sm">
            <div class="text-xs text-muted">模型类型</div>
            <div class="mt-1 font-semibold text-ink">{{ modelTypeLabel(model.modelType) }}</div>
          </div>
          <div class="rounded-2xl border border-line bg-canvas px-4 py-3 text-sm">
            <div class="text-xs text-muted">模型名称</div>
            <div class="mt-1 font-semibold text-ink">{{ model.modelName }}</div>
          </div>
          <div class="rounded-2xl border border-line bg-canvas px-4 py-3 text-sm">
            <div class="text-xs text-muted">托管凭证</div>
            <div class="mt-1 font-semibold text-ink">{{ model.officialCredentialName }}</div>
          </div>
          <div class="rounded-2xl border border-line bg-canvas px-4 py-3 text-sm">
            <div class="text-xs text-muted">最大输出</div>
            <div class="mt-1 font-semibold text-ink">{{ model.maxTokens ?? "未设置" }}</div>
          </div>
          <div class="rounded-2xl border border-line bg-canvas px-4 py-3 text-sm">
            <div class="text-xs text-muted">输入价格</div>
            <div class="mt-1 font-semibold text-ink">{{ priceText(model.inputPricePerMillion, model.currency) }}</div>
          </div>
          <div class="rounded-2xl border border-line bg-canvas px-4 py-3 text-sm">
            <div class="text-xs text-muted">输出价格</div>
            <div class="mt-1 font-semibold text-ink">{{ priceText(model.outputPricePerMillion, model.currency) }}</div>
          </div>
        </div>
      </SectionCard>
    </div>

    <UiPagination
      :page="page"
      :size="pageSize"
      :total="total"
      :total-pages="totalPages"
      @change="loadOfficialModels"
    />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import SectionCard from "@/app/components/SectionCard.vue";
import UiPagination from "@/app/components/ui/UiPagination.vue";
import { credentialProviderOptions, modelTypeOptions } from "@/app/constants/options";
import { extractApiErrorMessage, isRequestCanceled } from "@/app/services/http";
import { listOfficialModelConfigs } from "@/app/services/models";
import type { OfficialModelConfig } from "@/app/types/model";

const officialModels = ref<OfficialModelConfig[]>([]);
const page = ref(0);
const pageSize = 20;
const total = ref(0);
const totalPages = ref(0);
const loading = ref(false);
const submitError = ref("");
const activeFilter = ref("ALL");
let loadController: AbortController | null = null;

const filters = [
  { label: "全部", value: "ALL" },
  { label: "对话模型", value: "CHAT" },
  { label: "Embedding", value: "EMBEDDING" },
  { label: "Rerank", value: "RERANK" }
];

const filteredModels = officialModels;

function providerLabel(provider: string) {
  return credentialProviderOptions.find((option) => option.value === provider)?.label ?? provider;
}

function modelTypeLabel(modelType: string) {
  return modelTypeOptions.find((option) => option.value === modelType)?.label ?? modelType;
}

function priceText(price: string | null, currency: string | null) {
  if (price === null || price === undefined) {
    return "未设置";
  }
  return `${price} ${currency ?? ""} / 百万 Token`.trim();
}

async function loadOfficialModels(newPage?: number) {
  if (newPage !== undefined) page.value = newPage;
  loadController?.abort();
  const controller = new AbortController();
  loadController = controller;
  const requestedPage = page.value;
  const requestedFilter = activeFilter.value;
  loading.value = true;
  submitError.value = "";
  try {
    const result = await listOfficialModelConfigs(
      requestedPage,
      pageSize,
      controller.signal,
      requestedFilter === "ALL" ? undefined : requestedFilter
    );
    if (controller.signal.aborted
      || requestedPage !== page.value
      || requestedFilter !== activeFilter.value) return;
    officialModels.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (error) {
    if (!isRequestCanceled(error)) {
      submitError.value = extractApiErrorMessage(error, "加载官方模型失败");
    }
  } finally {
    if (loadController === controller) {
      loading.value = false;
      loadController = null;
    }
  }
}

async function loadAll() {
  page.value = 0;
  await loadOfficialModels();
}

watch(activeFilter, async () => {
  page.value = 0;
  await loadOfficialModels();
});

onMounted(async () => {
  await loadAll();
});

onBeforeUnmount(() => loadController?.abort());
</script>
