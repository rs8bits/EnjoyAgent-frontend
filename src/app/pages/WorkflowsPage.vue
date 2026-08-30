<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { Edit3, Trash2, Workflow } from "lucide-vue-next";
import SectionCard from "@/app/components/SectionCard.vue";
import UiButton from "@/app/components/ui/UiButton.vue";
import UiPagination from "@/app/components/ui/UiPagination.vue";
import UiTextField from "@/app/components/ui/UiTextField.vue";
import {
  createWorkflow,
  deleteWorkflow,
  listWorkflows,
  updateWorkflow,
} from "@/app/services/workflow";
import type { Workflow as WorkflowType } from "@/app/types/workflow";
import { extractApiErrorMessage, isRequestCanceled } from "@/app/services/http";

const router = useRouter();

const workflows = ref<WorkflowType[]>([]);
const loading = ref(false);
const saving = ref(false);
const page = ref(0);
const total = ref(0);
const totalPages = ref(0);
const selectedId = ref<number | null>(null);
const submitError = ref("");
let loadController: AbortController | null = null;

const form = reactive({
  name: "",
  description: "",
});

const editingWorkflow = computed(() =>
  workflows.value.find((w) => w.id === selectedId.value)
);

onMounted(async () => {
  await loadAll();
});

async function loadAll() {
  loadController?.abort();
  const controller = new AbortController();
  loadController = controller;
  const requestedPage = page.value;
  loading.value = true;
  try {
    const result = await listWorkflows(requestedPage, 20, controller.signal);
    if (controller.signal.aborted || requestedPage !== page.value) return;
    workflows.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (error) {
    if (!isRequestCanceled(error)) {
      submitError.value = extractApiErrorMessage(error, "加载工作流列表失败");
    }
  } finally {
    if (loadController === controller) {
      loading.value = false;
      loadController = null;
    }
  }
}

function startCreate() {
  selectedId.value = null;
  form.name = "";
  form.description = "";
  submitError.value = "";
}

function selectWorkflow(workflow: WorkflowType) {
  selectedId.value = workflow.id;
  form.name = workflow.name;
  form.description = workflow.description || "";
  submitError.value = "";
}

async function submit() {
  if (!form.name.trim()) {
    submitError.value = "请输入工作流名称";
    return;
  }
  saving.value = true;
  submitError.value = "";
  try {
    if (selectedId.value) {
      const existing = editingWorkflow.value;
      await updateWorkflow(selectedId.value, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        enabled: existing?.enabled ?? true,
      });
    } else {
      await createWorkflow({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      });
    }
    await loadAll();
    startCreate();
  } catch (error) {
    submitError.value = extractApiErrorMessage(error, "保存失败");
  } finally {
    saving.value = false;
  }
}

async function removeWorkflow(id: number) {
  if (!window.confirm("确定删除此工作流？相关节点和连线将一并删除。")) return;
  try {
    await deleteWorkflow(id);
    if (selectedId.value === id) startCreate();
    await loadAll();
    if (!workflows.value.length && page.value > 0) {
      page.value -= 1;
      await loadAll();
    }
  } catch (error) {
    submitError.value = extractApiErrorMessage(error, "删除失败");
  }
}

async function onPageChange(newPage: number) {
  page.value = newPage;
  await loadAll();
}

function openCanvas(workflowId: number) {
  router.push(`/app/workflows/${workflowId}/canvas`);
}

onBeforeUnmount(() => loadController?.abort());
</script>

<template>
  <div class="ea-scroll h-full overflow-y-auto p-5 lg:p-8">
    <div class="mb-6 flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="text-xs font-semibold uppercase tracking-[0.22em] text-accent">自动化</div>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink">工作流</h1>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-sm text-muted">
          {{ total }} 个工作流
        </span>
      </div>
    </div>

    <div class="grid gap-5 xl:grid-cols-[1fr_420px]">
      <SectionCard eyebrow="工作流列表" title="全部工作流">
        <div v-if="loading" class="py-12 text-center text-sm text-muted">加载中...</div>
        <div v-else-if="workflows.length === 0" class="py-12 text-center text-sm text-muted">
          暂无工作流，点击右侧创建第一个。
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="wf in workflows"
            :key="wf.id"
            class="flex items-center justify-between rounded-[14px] border px-4 py-3"
            :class="selectedId === wf.id ? 'border-accent bg-accent-soft/30' : 'border-line bg-white'"
          >
            <button type="button" class="min-w-0 flex-1 text-left" @click="selectWorkflow(wf)">
              <div class="flex items-center gap-2">
                <Workflow class="h-4 w-4 shrink-0 text-accent" />
                <span class="text-sm font-medium text-ink truncate">{{ wf.name }}</span>
                <span class="shrink-0 text-xs text-muted">{{ wf.nodeCount }} 节点</span>
              </div>
              <div v-if="wf.description" class="mt-1 text-xs text-muted truncate">{{ wf.description }}</div>
            </button>
            <div class="ml-3 flex shrink-0 items-center gap-1">
              <UiButton variant="ghost" @click="openCanvas(wf.id)">画布</UiButton>
              <UiButton variant="ghost" :aria-label="`删除工作流 ${wf.name}`" @click="removeWorkflow(wf.id)">
                <Trash2 class="h-4 w-4" />
              </UiButton>
            </div>
          </div>
          <UiPagination
            v-if="totalPages > 1"
            :page="page"
            :total="total"
            :total-pages="totalPages"
            :size="20"
            @change="onPageChange"
          />
        </div>
      </SectionCard>

      <SectionCard
        :eyebrow="selectedId ? '编辑工作流' : '新建工作流'"
        :title="selectedId ? '编辑元数据' : '创建新工作流'"
      >
        <form class="space-y-4" @submit.prevent="submit">
          <UiTextField
            v-model="form.name"
            label="名称"
            placeholder="输入工作流名称"
            :error="submitError && !form.name.trim() ? submitError : ''"
          />
          <UiTextField
            v-model="form.description"
            label="描述（可选）"
            placeholder="简要描述工作流的用途"
          />
          <div v-if="submitError && form.name.trim()" class="text-sm text-rose-500" role="alert">
            {{ submitError }}
          </div>
          <div class="flex gap-2">
            <UiButton type="submit" variant="primary" :disabled="saving">
              {{ saving ? "保存中..." : selectedId ? "更新" : "创建" }}
            </UiButton>
            <UiButton v-if="selectedId" variant="secondary" @click="openCanvas(selectedId!)">
              <Edit3 class="mr-1 h-4 w-4" />
              编辑画布
            </UiButton>
            <UiButton v-if="selectedId" variant="ghost" @click="startCreate">取消</UiButton>
          </div>
        </form>
      </SectionCard>
    </div>
  </div>
</template>
