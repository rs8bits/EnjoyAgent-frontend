<template>
  <div class="flex min-h-full flex-col gap-5 p-5 lg:p-8">
    <div class="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="text-xs font-semibold uppercase tracking-[0.22em] text-accent">阶段 7 · 钱包中心</div>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink">管理余额、流水和充值单</h1>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
          这里已经接入真实的钱包、流水和充值单接口。你可以先查看当前余额，再创建一笔待审核的充值单。
        </p>
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
              <div class="mt-3 text-2xl font-semibold text-ink">{{ rechargeOrders.length }}</div>
              <div class="mt-2 text-sm text-muted">其中待审核 {{ pendingOrderCount }} 笔</div>
            </div>
          </div>

          <div
            v-else
            class="rounded-[20px] border border-dashed border-line bg-canvas px-4 py-10 text-center text-sm leading-6 text-muted"
          >
            当前还没有钱包信息，或者钱包数据加载失败。你可以先刷新一次。
          </div>

          <div v-if="pageError" class="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
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
        </SectionCard>
      </div>

      <div class="space-y-5">
        <SectionCard eyebrow="发起充值" title="创建充值单" description="当前版本是人工审核模式。提交后管理员审核通过，余额才会真正入账。">
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

            <div v-if="rechargeError" class="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
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
        </SectionCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import SectionCard from "@/app/components/SectionCard.vue";
import UiButton from "@/app/components/ui/UiButton.vue";
import UiTextField from "@/app/components/ui/UiTextField.vue";
import UiTextarea from "@/app/components/ui/UiTextarea.vue";
import { createRechargeOrder, listRechargeOrders, listWalletTransactions, getCurrentWallet } from "@/app/services/billing";
import { extractApiErrorMessage } from "@/app/services/http";
import type { RechargeOrder, UserWallet, UserWalletTransaction } from "@/app/types/billing";

const wallet = ref<UserWallet | null>(null);
const transactions = ref<UserWalletTransaction[]>([]);
const rechargeOrders = ref<RechargeOrder[]>([]);
const loading = ref(false);
const submittingRecharge = ref(false);
const pageError = ref("");
const rechargeError = ref("");

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

function formatMoney(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toFixed(2);
}

function signedMoney(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return `${amount >= 0 ? "+" : ""}${amount.toFixed(2)}`;
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

function amountClass(value: string | number | null | undefined) {
  return Number(value ?? 0) >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600";
}

function validateRechargeForm() {
  const amount = Number(rechargeForm.amount.trim());
  rechargeErrors.amount = !rechargeForm.amount.trim()
    ? "请输入充值金额"
    : Number.isNaN(amount) || amount < 0.01
      ? "充值金额必须大于等于 0.01"
      : "";
  return !rechargeErrors.amount;
}

async function loadWalletCenter() {
  loading.value = true;
  pageError.value = "";
  try {
    const [walletData, transactionList, orderList] = await Promise.all([
      getCurrentWallet(),
      listWalletTransactions(),
      listRechargeOrders()
    ]);
    wallet.value = walletData;
    transactions.value = transactionList;
    rechargeOrders.value = orderList;
  } catch (error) {
    pageError.value = extractApiErrorMessage(error, "加载钱包中心失败");
  } finally {
    loading.value = false;
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
      amount: Number(rechargeForm.amount.trim()),
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
</script>
