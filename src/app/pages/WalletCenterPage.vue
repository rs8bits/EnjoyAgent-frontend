<template>
  <div class="ea-scroll flex h-full min-h-0 flex-col gap-5 overflow-y-auto p-5 lg:p-8">
    <div class="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="text-xs font-semibold uppercase tracking-[0.22em] text-accent">钱包</div>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink">钱包中心</h1>
      </div>

      <UiButton variant="secondary" :disabled="loading" @click="loadWalletCenter">
        {{ loading ? "刷新中..." : "刷新钱包数据" }}
      </UiButton>
    </div>

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_380px]">
      <div class="space-y-5">
        <SectionCard eyebrow="余额总览" title="当前钱包">
          <div v-if="loading && !wallet" class="rounded-[20px] border border-line bg-canvas px-4 py-10 text-sm text-muted">
            正在加载钱包信息...
          </div>

          <div v-else-if="wallet" class="grid gap-4 md:grid-cols-3">
            <div class="rounded-[22px] border border-line bg-canvas px-5 py-5">
              <div class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">当前余额</div>
              <div class="mt-3 text-3xl font-semibold tracking-tight text-ink">
                {{ formatMoney(wallet.balance) }}
              </div>
              <div class="mt-2 text-sm text-muted">{{ wallet.currency }}</div>
            </div>
            <div class="rounded-[22px] border border-line bg-canvas px-5 py-5">
              <div class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">钱包状态</div>
              <div class="mt-3 text-2xl font-semibold text-ink">{{ walletStatusLabel(wallet.status) }}</div>
              <div class="mt-2 text-sm text-muted">更新时间 {{ formatDateTime(wallet.updatedAt) }}</div>
            </div>
            <div class="rounded-[22px] border border-line bg-canvas px-5 py-5">
              <div class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">充值单</div>
              <div class="mt-3 text-2xl font-semibold text-ink">{{ rechargeTotal }}</div>
              <div class="mt-2 text-sm text-muted">其中待审核 {{ pendingOrderCount }} 笔</div>
            </div>
          </div>

          <div
            v-else
            class="rounded-[20px] border border-dashed border-line bg-canvas px-4 py-10 text-center text-sm leading-6 text-muted"
          >
            当前还没有钱包信息，或者钱包数据加载失败。你可以先刷新一次。
          </div>

          <div v-if="pageError" class="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600" role="alert">
            {{ pageError }}
          </div>
        </SectionCard>

        <SectionCard eyebrow="流水明细" title="最近钱包流水">
          <div
            v-if="!transactions.length"
            class="rounded-[20px] border border-dashed border-line bg-canvas px-4 py-10 text-center text-sm leading-6 text-muted"
          >
            当前还没有钱包流水。等充值审核通过或发生模型扣费后，这里会出现真实记录。
          </div>

          <div v-else class="ea-scroll max-h-[520px] space-y-3 overflow-y-auto pr-1">
            <div
              v-for="transaction in transactions"
              :key="transaction.id"
              class="rounded-[20px] border border-line bg-canvas px-4 py-4"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="text-sm font-semibold text-ink">{{ transactionTypeLabel(transaction.transactionType) }}</div>
                  <div class="mt-1 text-sm text-muted">{{ transaction.description || "暂无说明" }}</div>
                </div>
                <div
                  class="rounded-full px-3 py-1 text-sm font-semibold"
                  :class="amountClass(transaction.amountDelta)"
                >
                  {{ signedMoney(transaction.amountDelta) }}
                </div>
              </div>
              <div class="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                <span class="rounded-full border border-line bg-white px-3 py-1">
                  余额 {{ formatMoney(transaction.balanceAfter) }} {{ transaction.currency }}
                </span>
                <span v-if="transaction.referenceType" class="rounded-full border border-line bg-white px-3 py-1">
                  {{ transaction.referenceType }} #{{ transaction.referenceId ?? "-" }}
                </span>
                <span class="rounded-full border border-line bg-white px-3 py-1">
                  {{ formatDateTime(transaction.createdAt) }}
                </span>
              </div>
            </div>
          </div>

          <UiPagination
            :page="txPage"
            :size="txPageSize"
            :total="txTotal"
            :total-pages="txTotalPages"
            @change="loadTransactions"
          />
        </SectionCard>
      </div>

      <div class="space-y-5">
        <SectionCard eyebrow="发起充值" title="创建充值单" description="提交后由管理员审核入账。">
          <form class="space-y-4" @submit.prevent="submitRechargeOrder">
            <UiTextField
              v-model="rechargeForm.amount"
              label="充值金额（CNY）"
              placeholder="例如：50"
              :error="rechargeErrors.amount"
            />

            <UiTextarea
              v-model="rechargeForm.remark"
              label="备注"
              placeholder="例如：线下转账已完成，请管理员核对。"
              :rows="4"
            />

            <div v-if="rechargeError" class="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600" role="alert">
              {{ rechargeError }}
            </div>

            <UiButton type="submit" :disabled="submittingRecharge">
              {{ submittingRecharge ? "提交中..." : "提交充值单" }}
            </UiButton>
          </form>
        </SectionCard>

        <SectionCard eyebrow="充值记录" title="最近充值单">
          <div
            v-if="!rechargeOrders.length"
            class="rounded-[20px] border border-dashed border-line bg-canvas px-4 py-10 text-center text-sm leading-6 text-muted"
          >
            你还没有提交过充值单。创建后，这里会显示状态、审核备注和更新时间。
          </div>

          <div v-else class="ea-scroll max-h-[520px] space-y-3 overflow-y-auto pr-1">
            <div
              v-for="order in rechargeOrders"
              :key="order.id"
              class="rounded-[20px] border border-line bg-canvas px-4 py-4"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <div class="text-sm font-semibold text-ink">充值单 #{{ order.id }}</div>
                  <div class="mt-1 text-sm text-muted">{{ formatMoney(order.amount) }} {{ order.currency }}</div>
                </div>
                <span class="rounded-full px-3 py-1 text-xs font-medium" :class="orderStatusClass(order.status)">
                  {{ rechargeStatusLabel(order.status) }}
                </span>
              </div>

              <div class="mt-3 space-y-2 text-sm text-muted">
                <div>创建时间：{{ formatDateTime(order.createdAt) }}</div>
                <div v-if="order.remark">用户备注：{{ order.remark }}</div>
                <div v-if="order.reviewRemark">审核备注：{{ order.reviewRemark }}</div>
                <div v-if="order.reviewedAt">审核时间：{{ formatDateTime(order.reviewedAt) }}</div>
              </div>
            </div>
          </div>

          <UiPagination
            :page="rechargePage"
            :size="rechargePageSize"
            :total="rechargeTotal"
            :total-pages="rechargeTotalPages"
            @change="loadRechargeOrders"
          />
        </SectionCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import SectionCard from "@/app/components/SectionCard.vue";
import UiButton from "@/app/components/ui/UiButton.vue";
import UiPagination from "@/app/components/ui/UiPagination.vue";
import UiTextField from "@/app/components/ui/UiTextField.vue";
import UiTextarea from "@/app/components/ui/UiTextarea.vue";
import { createRechargeOrder, listRechargeOrders, listWalletTransactions, getCurrentWallet } from "@/app/services/billing";
import { extractApiErrorMessage, isRequestCanceled } from "@/app/services/http";
import type { RechargeOrder, UserWallet, UserWalletTransaction } from "@/app/types/billing";
import { compareDecimalStrings, formatDecimalString, isValidDecimalString, normalizeDecimalString } from "@/app/utils/decimal";

const wallet = ref<UserWallet | null>(null);
const transactions = ref<UserWalletTransaction[]>([]);
const txPage = ref(0);
const txPageSize = 20;
const txTotal = ref(0);
const txTotalPages = ref(0);
const rechargeOrders = ref<RechargeOrder[]>([]);
const rechargePage = ref(0);
const rechargePageSize = 20;
const rechargeTotal = ref(0);
const rechargeTotalPages = ref(0);
const loading = ref(false);
const submittingRecharge = ref(false);
const pageError = ref("");
const rechargeError = ref("");
let walletController: AbortController | null = null;
let transactionController: AbortController | null = null;
let rechargeController: AbortController | null = null;
let pageErrorSequence = 0;

const rechargeForm = reactive({
  amount: "",
  remark: ""
});

const rechargeErrors = reactive({
  amount: ""
});

const pendingOrderCount = computed(() =>
  rechargeOrders.value.filter((order) => order.status === "PENDING").length
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

function formatMoney(value: string | null | undefined) {
  return formatDecimalString(value);
}

function signedMoney(value: string | null | undefined) {
  const amount = value ?? "0";
  return `${compareDecimalStrings(amount, "0") >= 0 ? "+" : ""}${formatDecimalString(amount)}`;
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
  if (status === "CANCELLED") {
    return "已取消";
  }
  return status ?? "未知";
}

function orderStatusClass(status: string | null | undefined) {
  if (status === "APPROVED") {
    return "bg-emerald-50 text-emerald-600";
  }
  if (status === "REJECTED") {
    return "bg-rose-50 text-rose-600";
  }
  if (status === "CANCELLED") {
    return "bg-slate-100 text-slate-500";
  }
  return "bg-amber-50 text-amber-600";
}

function transactionTypeLabel(type: string | null | undefined) {
  if (type === "RECHARGE_APPROVED") {
    return "充值入账";
  }
  if (type === "MODEL_USAGE_DEBIT") {
    return "模型调用扣费";
  }
  if (type === "MANUAL_ADJUST") {
    return "人工调账";
  }
  return type ?? "未知流水";
}

function amountClass(value: string | null | undefined) {
  return compareDecimalStrings(value ?? "0", "0") >= 0
    ? "bg-emerald-50 text-emerald-600"
    : "bg-rose-50 text-rose-600";
}

function validateRechargeForm() {
  const amount = rechargeForm.amount.trim();
  rechargeErrors.amount = !amount
    ? "请输入充值金额"
    : !isValidDecimalString(amount)
      ? "金额最多 12 位整数、6 位小数"
      : compareDecimalStrings(amount, "0.01") < 0
        ? "充值金额必须大于等于 0.01"
        : "";
  return !rechargeErrors.amount;
}

async function loadTransactions(newPage?: number) {
  if (newPage !== undefined) txPage.value = newPage;
  transactionController?.abort();
  const controller = new AbortController();
  transactionController = controller;
  const requestedPage = txPage.value;
  const errorSequence = ++pageErrorSequence;
  pageError.value = "";
  try {
    const result = await listWalletTransactions(requestedPage, txPageSize, controller.signal);
    if (controller.signal.aborted || requestedPage !== txPage.value) return;
    transactions.value = result.items;
    txTotal.value = result.total;
    txTotalPages.value = result.totalPages;
  } catch (error) {
    if (!isRequestCanceled(error) && errorSequence === pageErrorSequence) {
      pageError.value = extractApiErrorMessage(error, "加载钱包流水失败");
    }
  } finally {
    if (transactionController === controller) {
      transactionController = null;
    }
  }
}

async function loadRechargeOrders(newPage?: number) {
  if (newPage !== undefined) rechargePage.value = newPage;
  rechargeController?.abort();
  const controller = new AbortController();
  rechargeController = controller;
  const requestedPage = rechargePage.value;
  const errorSequence = ++pageErrorSequence;
  pageError.value = "";
  try {
    const result = await listRechargeOrders(requestedPage, rechargePageSize, controller.signal);
    if (controller.signal.aborted || requestedPage !== rechargePage.value) return;
    rechargeOrders.value = result.items;
    rechargeTotal.value = result.total;
    rechargeTotalPages.value = result.totalPages;
  } catch (error) {
    if (!isRequestCanceled(error) && errorSequence === pageErrorSequence) {
      pageError.value = extractApiErrorMessage(error, "加载充值单失败");
    }
  } finally {
    if (rechargeController === controller) {
      rechargeController = null;
    }
  }
}

async function loadWalletCenter() {
  walletController?.abort();
  transactionController?.abort();
  rechargeController?.abort();
  const walletRequest = new AbortController();
  const transactionRequest = new AbortController();
  const rechargeRequest = new AbortController();
  walletController = walletRequest;
  transactionController = transactionRequest;
  rechargeController = rechargeRequest;
  const requestedTxPage = txPage.value;
  const requestedRechargePage = rechargePage.value;
  const errorSequence = ++pageErrorSequence;
  loading.value = true;
  pageError.value = "";
  try {
    const [walletResult, transactionResult, orderResult] = await Promise.allSettled([
      getCurrentWallet(walletRequest.signal),
      listWalletTransactions(requestedTxPage, txPageSize, transactionRequest.signal),
      listRechargeOrders(requestedRechargePage, rechargePageSize, rechargeRequest.signal)
    ]);

    const errors: string[] = [];

    if (walletController === walletRequest && walletResult.status === "fulfilled") {
      wallet.value = walletResult.value;
    } else if (walletController === walletRequest && !isRequestCanceled(walletResult.status === "rejected" ? walletResult.reason : undefined)) {
      wallet.value = null;
      if (walletResult.status === "rejected") {
        errors.push(extractApiErrorMessage(walletResult.reason, "加载钱包信息失败"));
      }
    }

    if (transactionController === transactionRequest && requestedTxPage === txPage.value && transactionResult.status === "fulfilled") {
      transactions.value = transactionResult.value.items;
      txTotal.value = transactionResult.value.total;
      txTotalPages.value = transactionResult.value.totalPages;
    } else if (transactionController === transactionRequest && transactionResult.status === "rejected" && !isRequestCanceled(transactionResult.reason)) {
      transactions.value = [];
      errors.push(extractApiErrorMessage(transactionResult.reason, "加载钱包流水失败"));
    }

    if (rechargeController === rechargeRequest && requestedRechargePage === rechargePage.value && orderResult.status === "fulfilled") {
      rechargeOrders.value = orderResult.value.items;
      rechargeTotal.value = orderResult.value.total;
      rechargeTotalPages.value = orderResult.value.totalPages;
    } else if (rechargeController === rechargeRequest && orderResult.status === "rejected" && !isRequestCanceled(orderResult.reason)) {
      rechargeOrders.value = [];
      errors.push(extractApiErrorMessage(orderResult.reason, "加载充值单失败"));
    }

    if (errorSequence === pageErrorSequence) {
      pageError.value = errors[0] ?? "";
    }
  } finally {
    if (walletController === walletRequest) walletController = null;
    if (transactionController === transactionRequest) transactionController = null;
    if (rechargeController === rechargeRequest) rechargeController = null;
    if (!walletController) loading.value = false;
  }
}

async function submitRechargeOrder() {
  rechargeError.value = "";
  if (!validateRechargeForm()) {
    return;
  }

  submittingRecharge.value = true;
  try {
    await createRechargeOrder({
      amount: normalizeDecimalString(rechargeForm.amount),
      remark: rechargeForm.remark.trim() || undefined
    });
    rechargeForm.amount = "";
    rechargeForm.remark = "";
    await loadWalletCenter();
  } catch (error) {
    rechargeError.value = extractApiErrorMessage(error, "提交充值单失败");
  } finally {
    submittingRecharge.value = false;
  }
}

onMounted(loadWalletCenter);

onBeforeUnmount(() => {
  walletController?.abort();
  transactionController?.abort();
  rechargeController?.abort();
});
</script>
