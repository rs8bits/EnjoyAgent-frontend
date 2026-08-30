<template>
  <div class="ea-scroll flex h-full min-h-0 flex-col overflow-y-auto p-5 lg:p-6">
    <div class="mb-5 flex flex-col gap-5 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="text-xs font-semibold uppercase tracking-[0.22em] text-accent">审核中心</div>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink">处理充值单和市场资产审核</h1>
      </div>

      <UiButton variant="secondary" :disabled="loading" @click="loadReviewCenter">
        {{ loading ? "刷新中..." : "刷新审核中心" }}
      </UiButton>
    </div>

    <div class="grid min-h-0 flex-1 gap-5 xl:grid-cols-[320px_320px_minmax(0,1fr)]">
      <SectionCard
        class="flex h-full min-h-0 flex-col overflow-hidden"
        eyebrow="充值单"
        title="待处理充值申请"
        description="左侧筛选状态，中间直接挑一笔待审订单。"
      >
        <div class="mb-4 space-y-4">
          <UiSelect
            v-model="rechargeFilter"
            label="充值单状态"
            :options="rechargeStatusOptions"
            placeholder="全部状态"
          />
        </div>

        <div v-if="!rechargeOrders.length" class="rounded-[20px] border border-dashed border-line bg-canvas px-4 py-10 text-center text-sm leading-6 text-muted">
          当前没有符合条件的充值单。
        </div>

        <div v-else class="ea-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <button
            v-for="order in rechargeOrders"
            :key="order.id"
            class="w-full rounded-[20px] border px-4 py-4 text-left transition"
            :class="selectedRechargeOrderId === order.id ? 'border-accent bg-accent-soft' : 'border-line bg-canvas hover:bg-white'"
            @click="selectRechargeOrder(order)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="truncate text-sm font-semibold text-ink">充值单 #{{ order.id }}</div>
                <div class="mt-1 text-xs text-muted">{{ order.userDisplayName || order.userEmail }}</div>
              </div>
              <span class="rounded-full px-3 py-1 text-xs font-medium" :class="rechargeStatusClass(order.status)">
                {{ rechargeStatusLabel(order.status) }}
              </span>
            </div>
            <div class="mt-3 text-sm text-muted">{{ formatMoney(order.amount) }} {{ order.currency }}</div>
            <div class="mt-3 text-xs text-muted">{{ formatDateTime(order.createdAt) }}</div>
          </button>
        </div>

        <UiPagination
          :page="rechargePage"
          :size="rechargePageSize"
          :total="rechargeTotal"
          :total-pages="rechargeTotalPages"
          @change="loadRechargeOrders"
        />
      </SectionCard>

      <SectionCard
        class="flex h-full min-h-0 flex-col overflow-hidden"
        eyebrow="市场资产"
        title="待处理市场审核"
        description="这里展示共享市场资产审核队列，支持通过、驳回和下架。"
      >
        <div class="mb-4 grid gap-4">
          <UiSelect
            v-model="marketStatusFilter"
            label="资产状态"
            :options="marketStatusOptions"
            placeholder="全部状态"
          />
          <UiSelect
            v-model="marketTypeFilter"
            label="资产类型"
            :options="marketTypeOptions"
            placeholder="全部资产类型"
          />
        </div>

        <div v-if="!marketAssets.length" class="rounded-[20px] border border-dashed border-line bg-canvas px-4 py-10 text-center text-sm leading-6 text-muted">
          当前没有符合条件的市场资产。
        </div>

        <div v-else class="ea-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <button
            v-for="asset in marketAssets"
            :key="asset.id"
            class="w-full rounded-[20px] border px-4 py-4 text-left transition"
            :class="selectedMarketAssetId === asset.id ? 'border-accent bg-accent-soft' : 'border-line bg-canvas hover:bg-white'"
            @click="selectMarketAsset(asset)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="truncate text-sm font-semibold text-ink">{{ asset.name }}</div>
                <div class="mt-1 text-xs text-muted">{{ assetTypeLabel(asset.assetType) }}</div>
              </div>
              <span class="rounded-full px-3 py-1 text-xs font-medium" :class="marketAssetStatusClass(asset.status)">
                {{ marketAssetStatusLabel(asset.status) }}
              </span>
            </div>
            <div class="mt-3 text-sm text-muted">{{ asset.summary || "暂无摘要" }}</div>
            <div class="mt-3 text-xs text-muted">{{ formatDateTime(asset.updatedAt) }}</div>
          </button>
        </div>

        <UiPagination
          :page="marketPage"
          :size="marketPageSize"
          :total="marketTotal"
          :total-pages="marketTotalPages"
          @change="loadMarketAssets"
        />
      </SectionCard>

      <div class="ea-scroll min-h-0 space-y-5 overflow-y-auto pr-1">
        <SectionCard eyebrow="充值单详情" title="审核充值单">
          <div v-if="!selectedRechargeOrder" class="rounded-[20px] border border-dashed border-line bg-canvas px-4 py-10 text-center text-sm leading-6 text-muted">
            左侧选择一笔充值单后，这里会展示用户钱包和审核操作。
          </div>

          <div v-else class="space-y-4">
            <div class="grid gap-3 md:grid-cols-2">
              <div class="rounded-[18px] border border-line bg-canvas px-4 py-3 text-sm">
                <div class="text-muted">用户</div>
                <div class="mt-2 font-semibold text-ink">{{ selectedRechargeOrder.userDisplayName || selectedRechargeOrder.userEmail }}</div>
              </div>
              <div class="rounded-[18px] border border-line bg-canvas px-4 py-3 text-sm">
                <div class="text-muted">金额</div>
                <div class="mt-2 font-semibold text-ink">{{ formatMoney(selectedRechargeOrder.amount) }} {{ selectedRechargeOrder.currency }}</div>
              </div>
            </div>

            <div class="rounded-[18px] border border-line bg-canvas px-4 py-4 text-sm leading-6 text-muted">
              用户备注：{{ selectedRechargeOrder.remark || "暂无备注" }}
            </div>

            <div v-if="selectedRechargeWallet" class="rounded-[18px] border border-line bg-white px-4 py-4 text-sm">
              <div class="font-semibold text-ink">当前用户钱包</div>
              <div class="mt-2 text-muted">
                余额 {{ formatMoney(selectedRechargeWallet.balance) }} {{ selectedRechargeWallet.currency }} ·
                状态 {{ walletStatusLabel(selectedRechargeWallet.status) }}
              </div>
            </div>

            <UiTextarea v-model="reviewRemark" label="审核备注" placeholder="例如：已核对到账，允许入账。" :rows="4" />

            <div v-if="reviewError" class="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600" role="alert">
              {{ reviewError }}
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <UiButton :disabled="reviewSubmitting" @click="approveRecharge">
                {{ reviewSubmitting ? "处理中..." : "审核通过" }}
              </UiButton>
              <UiButton variant="secondary" :disabled="reviewSubmitting" @click="rejectRecharge">
                驳回充值单
              </UiButton>
            </div>

            <div class="rounded-[18px] border border-line bg-canvas px-4 py-4">
              <div class="mb-3 text-sm font-semibold text-ink">人工调账</div>
              <div class="grid gap-4 md:grid-cols-2">
                <UiTextField v-model="walletAdjustForm.amountDelta" label="调整金额" placeholder="例如：10 或 -5" />
                <UiTextField v-model="walletAdjustForm.description" label="说明" placeholder="例如：客服补偿" />
              </div>
              <div class="mt-4">
                <UiButton variant="ghost" :disabled="adjustingWallet" @click="adjustWallet">
                  {{ adjustingWallet ? "调账中..." : "对当前用户钱包调账" }}
                </UiButton>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard eyebrow="市场资产详情" title="审核市场资产">
          <div v-if="!selectedMarketAsset" class="rounded-[20px] border border-dashed border-line bg-canvas px-4 py-10 text-center text-sm leading-6 text-muted">
            左侧选择一个市场资产后，这里会展示详情和审核操作。
          </div>

          <div v-else class="space-y-4">
            <div class="grid gap-3 md:grid-cols-2">
              <div class="rounded-[18px] border border-line bg-canvas px-4 py-3 text-sm">
                <div class="text-muted">资产类型</div>
                <div class="mt-2 font-semibold text-ink">{{ assetTypeLabel(selectedMarketAsset.assetType) }}</div>
              </div>
              <div class="rounded-[18px] border border-line bg-canvas px-4 py-3 text-sm">
                <div class="text-muted">当前状态</div>
                <div class="mt-2">
                  <span class="rounded-full px-3 py-1 text-xs font-medium" :class="marketAssetStatusClass(selectedMarketAsset.status)">
                    {{ marketAssetStatusLabel(selectedMarketAsset.status) }}
                  </span>
                </div>
              </div>
            </div>

            <div class="rounded-[18px] border border-line bg-canvas px-4 py-4 text-sm leading-6 text-muted">
              {{ selectedMarketAsset.description || selectedMarketAsset.summary || "当前资产暂无详细说明。" }}
            </div>

            <UiTextarea v-model="reviewRemark" label="审核备注" placeholder="例如：结构完整，允许上架。" :rows="4" />

            <div v-if="marketReviewError" class="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600" role="alert">
              {{ marketReviewError }}
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <UiButton :disabled="marketReviewSubmitting" @click="approveMarketAsset">
                {{ marketReviewSubmitting ? "处理中..." : "审核通过" }}
              </UiButton>
              <UiButton variant="secondary" :disabled="marketReviewSubmitting" @click="rejectMarketAsset">
                驳回资产
              </UiButton>
              <UiButton variant="ghost" :disabled="marketReviewSubmitting" @click="offlineMarketAsset">
                下架资产
              </UiButton>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import SectionCard from "@/app/components/SectionCard.vue";
import UiButton from "@/app/components/ui/UiButton.vue";
import UiPagination from "@/app/components/ui/UiPagination.vue";
import UiSelect from "@/app/components/ui/UiSelect.vue";
import UiTextField from "@/app/components/ui/UiTextField.vue";
import UiTextarea from "@/app/components/ui/UiTextarea.vue";
import {
  adjustAdminUserWallet,
  approveAdminMarketAsset,
  approveAdminRechargeOrder,
  getAdminUserWallet,
  listAdminMarketAssets,
  listAdminRechargeOrders,
  offlineAdminMarketAsset,
  rejectAdminMarketAsset,
  rejectAdminRechargeOrder
} from "@/app/services/admin";
import { extractApiErrorMessage, isRequestCanceled } from "@/app/services/http";
import type { MarketAsset, RechargeOrder } from "@/app/types/admin";
import type { UserWallet } from "@/app/types/billing";
import { formatDecimalString, isValidDecimalString, normalizeDecimalString } from "@/app/utils/decimal";

const rechargeOrders = ref<RechargeOrder[]>([]);
const rechargePage = ref(0);
const rechargePageSize = 20;
const rechargeTotal = ref(0);
const rechargeTotalPages = ref(0);
const marketAssets = ref<MarketAsset[]>([]);
const marketPage = ref(0);
const marketPageSize = 20;
const marketTotal = ref(0);
const marketTotalPages = ref(0);
const selectedRechargeOrder = ref<RechargeOrder | null>(null);
const selectedRechargeOrderId = ref<number | null>(null);
const selectedRechargeWallet = ref<UserWallet | null>(null);
const selectedMarketAsset = ref<MarketAsset | null>(null);
const selectedMarketAssetId = ref<number | null>(null);
const rechargeFilter = ref("PENDING");
const marketStatusFilter = ref("PENDING");
const marketTypeFilter = ref("");
const rechargeLoading = ref(false);
const marketLoading = ref(false);
const loading = computed(() => rechargeLoading.value || marketLoading.value);
const reviewSubmitting = ref(false);
const marketReviewSubmitting = ref(false);
const adjustingWallet = ref(false);
const reviewError = ref("");
const marketReviewError = ref("");
const reviewRemark = ref("");
let rechargeLoadController: AbortController | null = null;
let marketLoadController: AbortController | null = null;
let walletLoadController: AbortController | null = null;

const walletAdjustForm = reactive({
  amountDelta: "",
  description: ""
});

const rechargeStatusOptions = [
  { label: "全部状态", value: "" },
  { label: "待审核", value: "PENDING" },
  { label: "已通过", value: "APPROVED" },
  { label: "已拒绝", value: "REJECTED" }
];

const marketStatusOptions = [
  { label: "全部状态", value: "" },
  { label: "待审核", value: "PENDING" },
  { label: "已上架", value: "APPROVED" },
  { label: "已拒绝", value: "REJECTED" },
  { label: "已下架", value: "OFFLINE" }
];

const marketTypeOptions = [
  { label: "全部类型", value: "" },
  { label: "Agent", value: "AGENT" },
  { label: "知识库", value: "KNOWLEDGE_BASE" },
  { label: "MCP Server", value: "MCP_SERVER" },
  { label: "工作流", value: "WORKFLOW" }
];

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

function formatMoney(value: string | null | undefined) {
  return formatDecimalString(value);
}

function rechargeStatusLabel(status: string | null | undefined) {
  if (status === "PENDING") {
    return "待审核";
  }
  if (status === "APPROVED") {
    return "已通过";
  }
  if (status === "REJECTED") {
    return "已拒绝";
  }
  return status ?? "未知";
}

function rechargeStatusClass(status: string | null | undefined) {
  if (status === "APPROVED") {
    return "bg-emerald-50 text-emerald-600";
  }
  if (status === "REJECTED") {
    return "bg-rose-50 text-rose-600";
  }
  return "bg-amber-50 text-amber-600";
}

function marketAssetStatusLabel(status: string | null | undefined) {
  if (status === "APPROVED") {
    return "已上架";
  }
  if (status === "REJECTED") {
    return "已拒绝";
  }
  if (status === "OFFLINE") {
    return "已下架";
  }
  if (status === "PENDING") {
    return "待审核";
  }
  return status ?? "未知";
}

function marketAssetStatusClass(status: string | null | undefined) {
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

function walletStatusLabel(status: string | null | undefined) {
  if (status === "ACTIVE") {
    return "可用";
  }
  if (status === "DISABLED") {
    return "已停用";
  }
  return status ?? "未知";
}

async function loadRechargeOrders(newPage?: number) {
  if (newPage !== undefined) rechargePage.value = newPage;
  rechargeLoadController?.abort();
  const controller = new AbortController();
  rechargeLoadController = controller;
  const requestedFilter = rechargeFilter.value;
  const requestedPage = rechargePage.value;
  rechargeLoading.value = true;
  try {
    const result = await listAdminRechargeOrders(
      requestedFilter || undefined,
      requestedPage,
      rechargePageSize,
      controller.signal
    );
    if (controller.signal.aborted
      || requestedFilter !== rechargeFilter.value
      || requestedPage !== rechargePage.value) return;
    rechargeOrders.value = result.items;
    rechargeTotal.value = result.total;
    rechargeTotalPages.value = result.totalPages;
    if (selectedRechargeOrderId.value) {
      selectedRechargeOrder.value = result.items.find(
        (item) => item.id === selectedRechargeOrderId.value
      ) ?? null;
      if (!selectedRechargeOrder.value) {
        selectedRechargeOrderId.value = null;
        selectedRechargeWallet.value = null;
      }
    }
  } catch (error) {
    if (!isRequestCanceled(error)) {
      reviewError.value = extractApiErrorMessage(error, "加载充值单失败");
    }
  } finally {
    if (rechargeLoadController === controller) {
      rechargeLoading.value = false;
      rechargeLoadController = null;
    }
  }
}

async function loadMarketAssets(newPage?: number) {
  if (newPage !== undefined) marketPage.value = newPage;
  marketLoadController?.abort();
  const controller = new AbortController();
  marketLoadController = controller;
  const requestedType = marketTypeFilter.value;
  const requestedStatus = marketStatusFilter.value;
  const requestedPage = marketPage.value;
  marketLoading.value = true;
  try {
    const result = await listAdminMarketAssets(
      requestedType || undefined,
      requestedStatus || undefined,
      requestedPage,
      marketPageSize,
      controller.signal
    );
    if (controller.signal.aborted
      || requestedType !== marketTypeFilter.value
      || requestedStatus !== marketStatusFilter.value
      || requestedPage !== marketPage.value) return;
    marketAssets.value = result.items;
    marketTotal.value = result.total;
    marketTotalPages.value = result.totalPages;
    if (selectedMarketAssetId.value) {
      selectedMarketAsset.value = result.items.find(
        (item) => item.id === selectedMarketAssetId.value
      ) ?? null;
      if (!selectedMarketAsset.value) {
        selectedMarketAssetId.value = null;
      }
    }
  } catch (error) {
    if (!isRequestCanceled(error)) {
      marketReviewError.value = extractApiErrorMessage(error, "加载市场资产失败");
    }
  } finally {
    if (marketLoadController === controller) {
      marketLoading.value = false;
      marketLoadController = null;
    }
  }
}

async function loadReviewCenter() {
  await Promise.all([loadRechargeOrders(0), loadMarketAssets(0)]);
}

async function selectRechargeOrder(order: RechargeOrder) {
  walletLoadController?.abort();
  const controller = new AbortController();
  walletLoadController = controller;
  selectedRechargeOrderId.value = order.id;
  selectedRechargeOrder.value = order;
  reviewRemark.value = "";
  reviewError.value = "";
  try {
    const wallet = await getAdminUserWallet(order.userId, controller.signal);
    if (!controller.signal.aborted && selectedRechargeOrderId.value === order.id) {
      selectedRechargeWallet.value = wallet;
    }
  } catch (error) {
    if (!isRequestCanceled(error)) {
      reviewError.value = extractApiErrorMessage(error, "加载用户钱包失败");
    }
  } finally {
    if (walletLoadController === controller) walletLoadController = null;
  }
}

function selectMarketAsset(asset: MarketAsset) {
  selectedMarketAssetId.value = asset.id;
  selectedMarketAsset.value = asset;
  reviewRemark.value = "";
  marketReviewError.value = "";
}

async function approveRecharge() {
  if (!selectedRechargeOrderId.value) {
    return;
  }
  reviewSubmitting.value = true;
  reviewError.value = "";
  try {
    await approveAdminRechargeOrder(selectedRechargeOrderId.value, {
      reviewRemark: reviewRemark.value.trim() || undefined
    });
    await loadReviewCenter();
    if (selectedRechargeOrder.value) {
      selectedRechargeWallet.value = await getAdminUserWallet(selectedRechargeOrder.value.userId);
    }
  } catch (error) {
    reviewError.value = extractApiErrorMessage(error, "审核通过充值单失败");
  } finally {
    reviewSubmitting.value = false;
  }
}

async function rejectRecharge() {
  if (!selectedRechargeOrderId.value) {
    return;
  }
  reviewSubmitting.value = true;
  reviewError.value = "";
  try {
    await rejectAdminRechargeOrder(selectedRechargeOrderId.value, {
      reviewRemark: reviewRemark.value.trim() || undefined
    });
    await loadReviewCenter();
  } catch (error) {
    reviewError.value = extractApiErrorMessage(error, "驳回充值单失败");
  } finally {
    reviewSubmitting.value = false;
  }
}

async function adjustWallet() {
  if (!selectedRechargeOrder.value) {
    reviewError.value = "请先选择一笔充值单，再对该用户钱包做调账。";
    return;
  }
  const amountDelta = walletAdjustForm.amountDelta.trim();
  if (!amountDelta || !isValidDecimalString(amountDelta, { allowNegative: true })) {
    reviewError.value = "请输入最多 12 位整数、6 位小数的合法调账金额。";
    return;
  }

  adjustingWallet.value = true;
  reviewError.value = "";
  try {
    selectedRechargeWallet.value = await adjustAdminUserWallet(selectedRechargeOrder.value.userId, {
      amountDelta: normalizeDecimalString(amountDelta),
      description: walletAdjustForm.description.trim() || undefined
    });
    walletAdjustForm.amountDelta = "";
    walletAdjustForm.description = "";
  } catch (error) {
    reviewError.value = extractApiErrorMessage(error, "用户钱包调账失败");
  } finally {
    adjustingWallet.value = false;
  }
}

async function approveMarketAsset() {
  if (!selectedMarketAssetId.value) {
    return;
  }
  marketReviewSubmitting.value = true;
  marketReviewError.value = "";
  try {
    await approveAdminMarketAsset(selectedMarketAssetId.value, {
      reviewRemark: reviewRemark.value.trim() || undefined
    });
    await loadReviewCenter();
  } catch (error) {
    marketReviewError.value = extractApiErrorMessage(error, "审核通过市场资产失败");
  } finally {
    marketReviewSubmitting.value = false;
  }
}

async function rejectMarketAsset() {
  if (!selectedMarketAssetId.value) {
    return;
  }
  marketReviewSubmitting.value = true;
  marketReviewError.value = "";
  try {
    await rejectAdminMarketAsset(selectedMarketAssetId.value, {
      reviewRemark: reviewRemark.value.trim() || undefined
    });
    await loadReviewCenter();
  } catch (error) {
    marketReviewError.value = extractApiErrorMessage(error, "驳回市场资产失败");
  } finally {
    marketReviewSubmitting.value = false;
  }
}

async function offlineMarketAsset() {
  if (!selectedMarketAssetId.value) {
    return;
  }
  marketReviewSubmitting.value = true;
  marketReviewError.value = "";
  try {
    await offlineAdminMarketAsset(selectedMarketAssetId.value, {
      reviewRemark: reviewRemark.value.trim() || undefined
    });
    await loadReviewCenter();
  } catch (error) {
    marketReviewError.value = extractApiErrorMessage(error, "下架市场资产失败");
  } finally {
    marketReviewSubmitting.value = false;
  }
}

watch([rechargeFilter], async () => {
  rechargePage.value = 0;
  await loadRechargeOrders();
});

watch([marketStatusFilter, marketTypeFilter], async () => {
  marketPage.value = 0;
  await loadMarketAssets();
});

onMounted(async () => {
  await loadReviewCenter();
});

onBeforeUnmount(() => {
  rechargeLoadController?.abort();
  marketLoadController?.abort();
  walletLoadController?.abort();
});
</script>
