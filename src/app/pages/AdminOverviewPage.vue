<template>
  <div class="ea-scroll h-full overflow-y-auto p-5 lg:p-8">
    <div class="mb-6 flex flex-col gap-3 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="text-xs font-semibold uppercase tracking-[0.22em] text-accent">管理后台</div>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink">平台运营概览</h1>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
          这一页已经接入真实后台接口，会用当前的官方模型、充值审核和市场审核数据来展示平台状态，而不是静态占位信息。
        </p>
      </div>
      <UiButton variant="secondary" :disabled="loading" @click="loadOverview">
        {{ loading ? "刷新中..." : "刷新运营概览" }}
      </UiButton>
    </div>

    <div class="grid gap-5 lg:grid-cols-4">
      <SectionCard
        v-for="stat in stats"
        :key="stat.label"
        :eyebrow="stat.label"
        :title="stat.value"
        :description="stat.description"
      />
    </div>

    <div class="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
      <SectionCard eyebrow="队列" title="当前待处理事项">
        <div v-if="queueItems.length" class="space-y-3">
          <div
            v-for="item in queueItems"
            :key="`${item.tag}-${item.title}`"
            class="rounded-[20px] border border-line bg-canvas px-4 py-4"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="text-sm font-semibold text-ink">{{ item.title }}</div>
                <div class="mt-1 text-sm text-muted">{{ item.subtitle }}</div>
              </div>
              <span class="rounded-full bg-white px-3 py-1 text-xs font-medium text-accent">{{ item.tag }}</span>
            </div>
          </div>
        </div>
        <div v-else class="rounded-[20px] border border-dashed border-line bg-canvas px-4 py-10 text-center text-sm leading-6 text-muted">
          当前没有待处理事项。充值审核和市场审核队列都比较空。
        </div>
      </SectionCard>

      <SectionCard eyebrow="信号" title="平台健康度">
        <div class="space-y-4">
          <div
            v-for="signal in signals"
            :key="signal.label"
            class="rounded-[20px] border border-line bg-canvas px-4 py-4"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm text-muted">{{ signal.label }}</span>
              <span class="text-sm font-semibold text-ink">{{ signal.value }}</span>
            </div>
            <div class="mt-3 h-2 rounded-full bg-white">
              <div
                class="h-2 rounded-full bg-accent"
                :style="{ width: signal.progress }"
              />
            </div>
          </div>
        </div>
      </SectionCard>
    </div>

    <div v-if="pageError" class="mt-5 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
      {{ pageError }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import SectionCard from "@/app/components/SectionCard.vue";
import UiButton from "@/app/components/ui/UiButton.vue";
import {
  listAdminMarketAssets,
  listAdminOfficialModelConfigs,
  listAdminOfficialModelCredentials,
  listAdminRechargeOrders
} from "@/app/services/admin";
import { extractApiErrorMessage } from "@/app/services/http";
import type { MarketAsset, OfficialModelConfig, OfficialModelCredential, RechargeOrder } from "@/app/types/admin";

const loading = ref(false);
const pageError = ref("");
const officialCredentials = ref<OfficialModelCredential[]>([]);
const officialConfigs = ref<OfficialModelConfig[]>([]);
const pendingRechargeOrders = ref<RechargeOrder[]>([]);
const allRechargeOrders = ref<RechargeOrder[]>([]);
const pendingMarketAssets = ref<MarketAsset[]>([]);
const publishedMarketAssets = ref<MarketAsset[]>([]);

const stats = computed(() => [
  {
    label: "托管凭证",
    value: String(officialCredentials.value.length),
    description: "当前平台托管的官方模型凭证数量"
  },
  {
    label: "启用官方模型",
    value: String(officialConfigs.value.filter((item) => item.enabled).length),
    description: "当前可供普通用户选择的官方模型配置"
  },
  {
    label: "待审充值单",
    value: String(pendingRechargeOrders.value.length),
    description: "等待管理员核验并入账的钱包充值单"
  },
  {
    label: "待审市场资产",
    value: String(pendingMarketAssets.value.length),
    description: "等待管理员审核上架的共享市场资产"
  }
]);

const queueItems = computed(() => {
  const rechargeItems = pendingRechargeOrders.value.slice(0, 3).map((order) => ({
    title: `充值单 #${order.id}`,
    subtitle: `${order.userDisplayName || order.userEmail} · ${Number(order.amount).toFixed(2)} ${order.currency}`,
    tag: "充值"
  }));

  const assetItems = pendingMarketAssets.value.slice(0, 3).map((asset) => ({
    title: asset.name,
    subtitle: `${asset.assetType} · ${asset.submitterDisplayName || "匿名提交者"}`,
    tag: "市场"
  }));

  return [...rechargeItems, ...assetItems];
});

const signals = computed(() => {
  const credentialEnabledRatio = officialCredentials.value.length
    ? Math.round((officialCredentials.value.filter((item) => item.enabled).length / officialCredentials.value.length) * 100)
    : 0;
  const modelEnabledRatio = officialConfigs.value.length
    ? Math.round((officialConfigs.value.filter((item) => item.enabled).length / officialConfigs.value.length) * 100)
    : 0;
  const rechargeApprovedRatio = allRechargeOrders.value.length
    ? Math.round((allRechargeOrders.value.filter((item) => item.status === "APPROVED").length / allRechargeOrders.value.length) * 100)
    : 0;
  const publishedAssetCount = publishedMarketAssets.value.length;
  const totalVisibleAssets = publishedAssetCount + pendingMarketAssets.value.length;
  const marketPublishedRatio = totalVisibleAssets ? Math.round((publishedAssetCount / totalVisibleAssets) * 100) : 0;

  return [
    {
      label: "托管凭证启用率",
      value: `${credentialEnabledRatio}%`,
      progress: `${credentialEnabledRatio}%`
    },
    {
      label: "官方模型可用率",
      value: `${modelEnabledRatio}%`,
      progress: `${modelEnabledRatio}%`
    },
    {
      label: "充值审核通过率",
      value: `${rechargeApprovedRatio}%`,
      progress: `${rechargeApprovedRatio}%`
    },
    {
      label: "市场上架占比",
      value: `${marketPublishedRatio}%`,
      progress: `${marketPublishedRatio}%`
    }
  ];
});

async function loadOverview() {
  loading.value = true;
  pageError.value = "";
  try {
    const [
      credentialList,
      configList,
      pendingRechargeList,
      rechargeList,
      pendingAssetList,
      publishedAssetList
    ] = await Promise.all([
      listAdminOfficialModelCredentials(0, 200),
      listAdminOfficialModelConfigs(0, 200),
      listAdminRechargeOrders("PENDING", 0, 200),
      listAdminRechargeOrders(undefined, 0, 200),
      listAdminMarketAssets(undefined, "PENDING", 0, 200),
      listAdminMarketAssets(undefined, "APPROVED", 0, 200)
    ]);

    officialCredentials.value = credentialList.items;
    officialConfigs.value = configList.items;
    pendingRechargeOrders.value = pendingRechargeList.items;
    allRechargeOrders.value = rechargeList.items;
    pendingMarketAssets.value = pendingAssetList.items;
    publishedMarketAssets.value = publishedAssetList.items;
  } catch (error) {
    pageError.value = extractApiErrorMessage(error, "加载管理后台概览失败");
  } finally {
    loading.value = false;
  }
}

onMounted(loadOverview);
</script>
