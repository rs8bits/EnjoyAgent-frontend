<template>
  <div class="flex h-full min-h-0 flex-col p-5 lg:p-6">
    <div class="mb-5 flex flex-col gap-5 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="text-xs font-semibold uppercase tracking-[0.22em] text-accent">阶段 6 · MCP 模块</div>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink">把工具能力真正接到 Agent</h1>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
          这里已经接上真实的 MCP Server、工具目录、Agent 工具绑定、OAuth 状态和调用日志。你可以先配置 Server，再把工具绑定到某个 Agent。
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3 rounded-full border border-line bg-white px-4 py-3 shadow-card">
        <div class="rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent">
          {{ servers.length }} 个 Server
        </div>
        <div class="rounded-full bg-canvas px-3 py-1 text-sm text-muted">
          {{ tools.length }} 个工具
        </div>
        <div class="rounded-full bg-canvas px-3 py-1 text-sm text-muted">
          {{ bindings.length }} 个 Agent 绑定
        </div>
      </div>
    </div>

    <div class="grid min-h-0 flex-1 gap-5 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
      <SectionCard
        class="flex h-full min-h-0 flex-col overflow-hidden"
        eyebrow="Server 列表"
        title="当前租户的 MCP Server"
        description="左侧选择 Server，中间管理工具目录，右侧处理 Agent 绑定和 OAuth。"
      >
        <div class="mb-4 flex items-center justify-between gap-3">
          <div class="rounded-full border border-line bg-canvas px-4 py-2 text-sm text-muted">
            已配置 {{ servers.length }} 个
          </div>
          <UiButton variant="secondary" @click="startCreateServer">新建 Server</UiButton>
        </div>

        <div v-if="baseLoading" class="rounded-[20px] border border-line bg-canvas px-4 py-10 text-sm text-muted">
          正在加载 MCP 配置...
        </div>

        <div
          v-else-if="!servers.length"
          class="rounded-[20px] border border-dashed border-line bg-canvas px-4 py-10 text-center text-sm leading-6 text-muted"
        >
          当前还没有 MCP Server。先在右侧创建一个 Server，再同步工具目录。
        </div>

        <div v-else class="ea-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <button
            v-for="server in servers"
            :key="server.id"
            class="w-full rounded-[22px] border px-4 py-4 text-left transition"
            :class="selectedServerId === server.id ? 'border-accent bg-accent-soft' : 'border-line bg-canvas hover:bg-white'"
            @click="selectServer(server)"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <div class="truncate text-base font-semibold text-ink">{{ server.name }}</div>
                <div class="mt-1 text-sm text-muted">
                  {{ authTypeLabel(server.authType) }} · {{ transportTypeLabel(server.transportType) }}
                </div>
              </div>
              <span
                class="rounded-full px-3 py-1 text-xs font-medium"
                :class="server.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'"
              >
                {{ server.enabled ? "启用" : "停用" }}
              </span>
            </div>
            <div class="mt-3 flex flex-wrap gap-2 text-xs text-muted">
              <span class="rounded-full border border-line bg-white px-3 py-1">
                {{ server.toolCount }} 个工具
              </span>
              <span class="rounded-full border border-line bg-white px-3 py-1">
                {{ server.credentialName ?? "无凭证" }}
              </span>
            </div>
            <div class="mt-3 text-xs text-muted">
              {{ server.lastSyncedAt ? `最近同步 ${formatDateTime(server.lastSyncedAt)}` : "还未同步工具目录" }}
            </div>
          </button>
        </div>
      </SectionCard>

      <div class="grid min-h-0 gap-5 xl:grid-rows-[auto_minmax(0,1fr)]">
        <SectionCard
          eyebrow="Server 配置"
          :title="selectedServerId ? '编辑 MCP Server' : '创建 MCP Server'"
          description="支持 HTTP / SSE 传输、静态 Bearer 和两种 OAuth 认证方式。"
        >
          <form class="space-y-5" @submit.prevent="submitServer">
            <div class="grid gap-4 md:grid-cols-2">
              <UiTextField
                v-model="serverForm.name"
                label="Server 名称"
                placeholder="例如：Slack MCP"
                :error="serverErrors.name"
              />
              <UiTextField
                v-model="serverForm.baseUrl"
                label="基础地址"
                placeholder="https://mcp.example.com"
                :error="serverErrors.baseUrl"
              />
            </div>

            <UiTextarea
              v-model="serverForm.description"
              label="Server 描述"
              placeholder="例如：团队内部 Slack 自动化工具"
              :rows="3"
            />

            <div class="grid gap-4 md:grid-cols-2">
              <UiSelect
                v-model="serverForm.transportType"
                label="传输类型"
                :options="transportOptions"
                placeholder="请选择传输类型"
              />
              <UiSelect
                v-model="serverForm.authType"
                label="认证方式"
                :options="authOptions"
                placeholder="请选择认证方式"
                :hint="serverForm.authType === 'STATIC_BEARER' ? '静态 Bearer 需要绑定一把当前租户的凭证。' : undefined"
              />
            </div>

            <UiSelect
              v-model="serverForm.credentialId"
              label="访问凭证"
              :options="credentialOptions"
              placeholder="可选：选择一把可用凭证"
              :hint="serverForm.authType === 'STATIC_BEARER' ? '请选择 Bearer 所需凭证。' : '无需认证或 OAuth 场景下可以留空。'"
              :error="serverErrors.credentialId"
            />

            <UiCheckbox
              v-model="serverForm.enabled"
              label="启用 MCP Server"
              hint="停用后当前 Server 不会参与 Agent 工具调用。"
            />

            <div v-if="serverError" class="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {{ serverError }}
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <UiButton type="submit" :disabled="savingServer">
                {{ savingServer ? "保存中..." : selectedServerId ? "保存 Server" : "创建 Server" }}
              </UiButton>
              <UiButton variant="secondary" :disabled="savingServer" @click="startCreateServer">
                新建空白表单
              </UiButton>
              <UiButton
                v-if="selectedServerId"
                type="button"
                variant="ghost"
                :disabled="savingServer || deletingServer"
                @click="removeSelectedServer"
              >
                {{ deletingServer ? "删除中..." : "删除 Server" }}
              </UiButton>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          class="min-h-0 overflow-hidden"
          eyebrow="工具目录"
          title="同步或手动维护工具定义"
          description="优先推荐用“从远端同步”拉取 tools/list；如果需要手动调整，也可以直接保存当前工具 JSON 快照。"
        >
          <div v-if="!selectedServer" class="rounded-[20px] border border-dashed border-line bg-canvas px-4 py-10 text-center text-sm leading-6 text-muted">
            先选择或创建一个 MCP Server，这里才会出现工具目录和同步入口。
          </div>

          <div v-else class="grid h-full min-h-0 gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.9fr)]">
            <div class="flex min-h-0 flex-col">
              <div class="mb-4 flex flex-wrap items-center gap-3">
                <div class="rounded-full border border-line bg-canvas px-4 py-2 text-sm text-muted">
                  当前 {{ tools.length }} 个工具
                </div>
                <UiButton :disabled="syncingTools" @click="syncSelectedServerTools">
                  {{ syncingTools ? "同步中..." : "从远端同步" }}
                </UiButton>
              </div>

              <div v-if="toolError" class="mb-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                {{ toolError }}
              </div>

              <div
                v-if="!tools.length"
                class="rounded-[20px] border border-dashed border-line bg-canvas px-4 py-10 text-center text-sm leading-6 text-muted"
              >
                当前工具目录还是空的。你可以先尝试同步远端工具，或者在右侧手动输入工具快照。
              </div>

              <div v-else class="ea-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                <div
                  v-for="tool in tools"
                  :key="tool.id"
                  class="rounded-[20px] border border-line bg-canvas px-4 py-4"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="truncate text-sm font-semibold text-ink">{{ tool.name }}</div>
                      <div class="mt-1 text-sm leading-6 text-muted">{{ tool.description || "暂无工具描述" }}</div>
                    </div>
                    <span
                      class="rounded-full px-3 py-1 text-xs font-medium"
                      :class="tool.enabled ? riskLevelClass(tool.riskLevel) : 'bg-slate-100 text-slate-500'"
                    >
                      {{ tool.enabled ? riskLevelLabel(tool.riskLevel) : "已停用" }}
                    </span>
                  </div>
                  <div class="mt-3 text-xs text-muted">
                    {{ tool.inputSchemaJson ? "已包含输入参数 Schema" : "未配置输入参数 Schema" }}
                  </div>
                </div>
              </div>
            </div>

            <div class="flex min-h-0 flex-col">
              <UiTextarea
                v-model="toolsEditorJson"
                label="工具快照 JSON"
                placeholder='[{"name":"search_messages","description":"...","inputSchemaJson":"{}","riskLevel":"LOW","enabled":true}]'
                :rows="16"
                hint="支持字段：name、description、inputSchemaJson、riskLevel、enabled。"
              />
              <div class="mt-4 flex flex-wrap items-center gap-3">
                <UiButton :disabled="savingTools || !selectedServer" @click="saveToolsSnapshot">
                  {{ savingTools ? "保存中..." : "保存工具快照" }}
                </UiButton>
                <UiButton variant="secondary" :disabled="savingTools" @click="resetToolsEditor">
                  重置编辑器
                </UiButton>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div class="ea-scroll min-h-0 space-y-5 overflow-y-auto pr-1">
        <SectionCard eyebrow="Agent 绑定" title="把工具绑定到 Agent">
          <div v-if="!agents.length" class="rounded-[18px] border border-dashed border-line bg-canvas px-4 py-8 text-sm leading-6 text-muted">
            当前还没有 Agent，请先去 Agent 管理页面创建一个 Agent。
          </div>

          <div v-else class="space-y-4">
            <UiSelect
              v-model="selectedAgentId"
              label="当前 Agent"
              :options="agentOptions"
              placeholder="请选择一个 Agent"
            />

            <div v-if="!selectedServer" class="rounded-[18px] border border-dashed border-line bg-canvas px-4 py-6 text-sm text-muted">
              先在左侧选择一个 MCP Server，这里会出现它的工具绑定清单。
            </div>

            <div v-else-if="!tools.length" class="rounded-[18px] border border-dashed border-line bg-canvas px-4 py-6 text-sm text-muted">
              当前 Server 还没有工具目录，先同步或手动保存工具快照，再绑定到 Agent。
            </div>

            <div v-else class="space-y-3">
              <label
                v-for="tool in tools"
                :key="tool.id"
                class="flex items-start gap-3 rounded-[18px] border border-line bg-canvas px-4 py-3"
              >
                <input
                  :checked="boundToolIds.includes(tool.id)"
                  type="checkbox"
                  class="mt-1 h-4 w-4 rounded border-line text-accent focus:ring-accent/20"
                  @change="toggleToolBinding(tool.id)"
                />
                <span class="min-w-0">
                  <span class="block text-sm font-medium text-ink">{{ tool.name }}</span>
                  <span class="mt-1 block text-xs leading-5 text-muted">
                    {{ tool.description || "暂无工具描述" }} · {{ riskLevelLabel(tool.riskLevel) }}
                  </span>
                </span>
              </label>
            </div>

            <div v-if="bindingError" class="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {{ bindingError }}
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <UiButton :disabled="savingBindings || !selectedAgentId" @click="saveAgentBindings">
                {{ savingBindings ? "保存中..." : "保存 Agent 工具绑定" }}
              </UiButton>
              <div class="rounded-full border border-line bg-canvas px-3 py-1 text-xs text-muted">
                当前 Agent 已绑定 {{ bindings.length }} 个工具
              </div>
            </div>

            <div v-if="bindings.length" class="space-y-2 pt-2">
              <div class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">当前绑定结果</div>
              <div
                v-for="binding in bindings"
                :key="binding.id"
                class="flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-3 text-sm"
              >
                <span class="font-medium text-ink">{{ binding.toolName }}</span>
                <span class="text-muted">{{ binding.serverName }}</span>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard eyebrow="OAuth 状态" title="认证与连接">
          <div v-if="!selectedServer" class="rounded-[18px] border border-dashed border-line bg-canvas px-4 py-8 text-sm leading-6 text-muted">
            先选择一个 MCP Server，这里会根据认证类型展示连接状态和授权入口。
          </div>

          <div v-else-if="selectedServer.authType === 'NONE'" class="rounded-[18px] border border-line bg-canvas px-4 py-6 text-sm leading-6 text-muted">
            当前 Server 不需要认证，可以直接同步工具并绑定到 Agent。
          </div>

          <div v-else-if="selectedServer.authType === 'STATIC_BEARER'" class="space-y-3 text-sm">
            <div class="flex items-center justify-between rounded-2xl border border-line bg-canvas px-4 py-3">
              <span class="text-muted">认证方式</span>
              <span class="font-semibold text-ink">静态 Bearer</span>
            </div>
            <div class="flex items-center justify-between rounded-2xl border border-line bg-canvas px-4 py-3">
              <span class="text-muted">当前凭证</span>
              <span class="font-semibold text-ink">{{ selectedServer.credentialName ?? "尚未绑定" }}</span>
            </div>
            <div class="rounded-[18px] border border-dashed border-line bg-canvas px-4 py-4 text-sm leading-6 text-muted">
              如需修改 Bearer 凭证，请直接在左侧的 Server 配置表单中更换访问凭证。
            </div>
          </div>

          <div v-else class="space-y-4">
            <div class="space-y-3 text-sm">
              <div class="flex items-center justify-between rounded-2xl border border-line bg-canvas px-4 py-3">
                <span class="text-muted">连接状态</span>
                <span class="font-semibold text-ink">{{ oauthStatusLabel(oauthConnection?.status) }}</span>
              </div>
              <div class="flex items-center justify-between rounded-2xl border border-line bg-canvas px-4 py-3">
                <span class="text-muted">是否已连接</span>
                <span class="font-semibold text-ink">{{ oauthConnection?.connected ? "已连接" : "未连接" }}</span>
              </div>
              <div class="flex items-center justify-between rounded-2xl border border-line bg-canvas px-4 py-3">
                <span class="text-muted">最近授权</span>
                <span class="font-semibold text-ink">{{ oauthConnection?.lastAuthorizedAt ? formatDateTime(oauthConnection.lastAuthorizedAt) : "暂无" }}</span>
              </div>
            </div>

            <div v-if="selectedServer.authType === 'OAUTH_AUTH_CODE'" class="space-y-4">
              <UiTextField v-model="oauthForm.clientId" label="OAuth Client ID" placeholder="请输入 client_id" />
              <UiTextField v-model="oauthForm.clientSecret" label="OAuth Client Secret" placeholder="Public Client 可留空" />
              <UiTextField v-model="oauthForm.scope" label="请求 Scope" placeholder="openid profile mcp" />
              <UiButton :disabled="oauthSubmitting || !oauthForm.clientId.trim()" @click="startAuthorization">
                {{ oauthSubmitting ? "生成中..." : "发起授权并打开新窗口" }}
              </UiButton>
            </div>

            <div v-else class="space-y-4">
              <UiTextField v-model="oauthForm.clientId" label="OAuth Client ID" placeholder="请输入 client_id" />
              <UiTextField v-model="oauthForm.clientSecret" label="OAuth Client Secret" placeholder="请输入 client_secret" />
              <UiTextField v-model="oauthForm.scope" label="请求 Scope" placeholder="openid profile mcp" />
              <UiButton :disabled="oauthSubmitting || !oauthForm.clientId.trim() || !oauthForm.clientSecret.trim()" @click="connectClientCredentials">
                {{ oauthSubmitting ? "连接中..." : "建立 Client Credentials 连接" }}
              </UiButton>
            </div>

            <UiButton
              v-if="oauthConnection?.connected"
              variant="ghost"
              :disabled="oauthSubmitting"
              @click="disconnectOAuth"
            >
              断开当前连接
            </UiButton>

            <div v-if="oauthHint" class="rounded-[18px] border border-line bg-canvas px-4 py-3 text-sm text-muted">
              {{ oauthHint }}
            </div>

            <div v-if="oauthError" class="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {{ oauthError }}
            </div>
          </div>
        </SectionCard>

        <SectionCard eyebrow="调用轨迹" title="最近工具调用">
          <div v-if="logsLoading" class="rounded-[18px] border border-line bg-canvas px-4 py-8 text-sm text-muted">
            正在加载工具调用日志...
          </div>

          <div v-else-if="!toolCallLogs.length" class="rounded-[18px] border border-dashed border-line bg-canvas px-4 py-8 text-sm leading-6 text-muted">
            当前还没有工具调用记录。把工具绑定到 Agent 后，在聊天工作台发起一次工具调用，这里和聊天页右侧都会出现轨迹。
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="log in toolCallLogs"
              :key="log.id"
              class="rounded-[20px] border border-line bg-canvas px-4 py-4"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="truncate text-sm font-semibold text-ink">{{ log.toolName }}</div>
                  <div class="mt-1 text-xs text-muted">
                    {{ formatDateTime(log.createdAt) }} · {{ log.sessionId ? `会话 ${log.sessionId}` : "无会话" }}
                  </div>
                </div>
                <span
                  class="rounded-full px-3 py-1 text-xs font-medium"
                  :class="log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'"
                >
                  {{ log.status === "SUCCESS" ? "成功" : "失败" }}
                </span>
              </div>
              <div class="mt-3 text-xs leading-5 text-muted">
                {{ log.latencyMs ? `${log.latencyMs} ms` : "无耗时" }}
                <span v-if="log.errorMessage"> · {{ log.errorMessage }}</span>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import SectionCard from "@/app/components/SectionCard.vue";
import UiButton from "@/app/components/ui/UiButton.vue";
import UiCheckbox from "@/app/components/ui/UiCheckbox.vue";
import UiSelect from "@/app/components/ui/UiSelect.vue";
import UiTextField from "@/app/components/ui/UiTextField.vue";
import UiTextarea from "@/app/components/ui/UiTextarea.vue";
import { mcpAuthOptions, mcpToolRiskOptions, mcpTransportOptions } from "@/app/constants/options";
import { listAgents } from "@/app/services/agents";
import { listCredentials } from "@/app/services/credentials";
import { extractApiErrorMessage } from "@/app/services/http";
import {
  connectMcpOAuthClientCredentials,
  createMcpServer,
  deleteMcpServer,
  disconnectMcpOAuthConnection,
  getMcpOAuthConnection,
  listAgentToolBindings,
  listMcpServers,
  listMcpToolCallLogs,
  listMcpTools,
  replaceAgentToolBindings,
  replaceMcpServerTools,
  startMcpOAuthAuthorization,
  syncMcpServerTools,
  updateMcpServer
} from "@/app/services/mcp";
import type { Agent } from "@/app/types/agent";
import type { Credential } from "@/app/types/credential";
import type {
  McpOAuthConnection,
  McpServer,
  McpTool,
  McpToolCallLog,
  McpToolRiskLevel,
  UpsertMcpToolPayload
} from "@/app/types/mcp";

const route = useRoute();
const router = useRouter();

const servers = ref<McpServer[]>([]);
const tools = ref<McpTool[]>([]);
const agents = ref<Agent[]>([]);
const credentials = ref<Credential[]>([]);
const bindings = ref<Array<{
  id: number;
  toolId: number;
  toolName: string;
  serverName: string;
}>>([]);
const boundToolIds = ref<number[]>([]);
const oauthConnection = ref<McpOAuthConnection | null>(null);
const toolCallLogs = ref<McpToolCallLog[]>([]);

const baseLoading = ref(false);
const savingServer = ref(false);
const deletingServer = ref(false);
const syncingTools = ref(false);
const savingTools = ref(false);
const savingBindings = ref(false);
const oauthSubmitting = ref(false);
const logsLoading = ref(false);

const selectedServerId = ref<number | null>(null);
const selectedAgentId = ref<string>("");

const serverError = ref("");
const toolError = ref("");
const bindingError = ref("");
const oauthError = ref("");
const oauthHint = ref("");
const toolsEditorJson = ref("[]");

const serverForm = reactive({
  name: "",
  description: "",
  baseUrl: "",
  transportType: "STREAMABLE_HTTP",
  authType: "NONE",
  credentialId: "",
  enabled: true
});

const serverErrors = reactive({
  name: "",
  baseUrl: "",
  credentialId: ""
});

const oauthForm = reactive({
  clientId: "",
  clientSecret: "",
  scope: "openid profile mcp"
});

const selectedServer = computed(() =>
  servers.value.find((item) => item.id === selectedServerId.value) ?? null
);

const agentOptions = computed(() =>
  agents.value.map((agent) => ({
    label: agent.name,
    value: String(agent.id)
  }))
);

const credentialOptions = computed(() =>
  credentials.value
    .filter((credential) => credential.status === "ACTIVE")
    .map((credential) => ({
      label: `${credential.name} · ${credential.provider}`,
      value: String(credential.id)
    }))
);

const transportOptions = [...mcpTransportOptions];
const authOptions = [...mcpAuthOptions];

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

function authTypeLabel(value: string | null | undefined) {
  return authOptions.find((item) => item.value === value)?.label ?? value ?? "未设置";
}

function transportTypeLabel(value: string | null | undefined) {
  return transportOptions.find((item) => item.value === value)?.label ?? value ?? "未设置";
}

function riskLevelLabel(value: string | null | undefined) {
  return mcpToolRiskOptions.find((item) => item.value === value)?.label ?? value ?? "未设置";
}

function riskLevelClass(value: string | null | undefined) {
  if (value === "HIGH") {
    return "bg-rose-50 text-rose-600";
  }
  if (value === "MEDIUM") {
    return "bg-amber-50 text-amber-600";
  }
  return "bg-emerald-50 text-emerald-600";
}

function oauthStatusLabel(value: string | null | undefined) {
  if (value === "CONNECTED") {
    return "已连接";
  }
  if (value === "PENDING") {
    return "等待授权";
  }
  if (value === "ERROR") {
    return "连接异常";
  }
  if (value === "NOT_CONNECTED") {
    return "未连接";
  }
  return "未连接";
}

function parseRouteId(name: "serverId" | "agentId") {
  const raw = typeof route.query[name] === "string" ? Number(route.query[name]) : null;
  return raw && Number.isFinite(raw) ? raw : null;
}

function resetServerErrors() {
  serverErrors.name = "";
  serverErrors.baseUrl = "";
  serverErrors.credentialId = "";
  serverError.value = "";
}

function resetServerForm() {
  serverForm.name = "";
  serverForm.description = "";
  serverForm.baseUrl = "";
  serverForm.transportType = "STREAMABLE_HTTP";
  serverForm.authType = "NONE";
  serverForm.credentialId = "";
  serverForm.enabled = true;
}

function startCreateServer() {
  selectedServerId.value = null;
  resetServerForm();
  resetServerErrors();
  toolError.value = "";
  oauthError.value = "";
  oauthHint.value = "";
  tools.value = [];
  toolsEditorJson.value = "[]";
  oauthConnection.value = null;
}

function syncServerForm(server: McpServer | null) {
  if (!server) {
    resetServerForm();
    return;
  }
  serverForm.name = server.name;
  serverForm.description = server.description ?? "";
  serverForm.baseUrl = server.baseUrl;
  serverForm.transportType = server.transportType;
  serverForm.authType = server.authType;
  serverForm.credentialId = server.credentialId ? String(server.credentialId) : "";
  serverForm.enabled = server.enabled;
}

function selectServer(server: McpServer) {
  selectedServerId.value = server.id;
  syncServerForm(server);
  resetServerErrors();
}

function validateServerForm() {
  serverErrors.name = serverForm.name.trim() ? "" : "请输入 Server 名称";
  serverErrors.baseUrl = serverForm.baseUrl.trim() ? "" : "请输入基础地址";
  serverErrors.credentialId = serverForm.authType === "STATIC_BEARER" && !serverForm.credentialId
    ? "静态 Bearer 模式必须选择一把访问凭证"
    : "";
  return !serverErrors.name && !serverErrors.baseUrl && !serverErrors.credentialId;
}

function serializeToolsToEditor(list: McpTool[]) {
  const payload = list.map((tool) => ({
    name: tool.name,
    description: tool.description ?? "",
    inputSchemaJson: tool.inputSchemaJson ?? "",
    riskLevel: tool.riskLevel,
    enabled: tool.enabled
  }));
  toolsEditorJson.value = JSON.stringify(payload, null, 2);
}

function parseToolsEditor() {
  const raw = JSON.parse(toolsEditorJson.value) as unknown;
  if (!Array.isArray(raw)) {
    throw new Error("工具快照必须是一个 JSON 数组。");
  }
  return raw.map((item, index) => {
    const candidate = item as Record<string, unknown>;
    const name = String(candidate.name ?? "").trim();
    if (!name) {
      throw new Error(`第 ${index + 1} 个工具缺少 name。`);
    }
    return {
      name,
      description: String(candidate.description ?? "").trim() || undefined,
      inputSchemaJson: String(candidate.inputSchemaJson ?? "").trim() || undefined,
      riskLevel: (String(candidate.riskLevel ?? "LOW").trim() || "LOW") as McpToolRiskLevel,
      enabled: candidate.enabled === undefined ? true : Boolean(candidate.enabled)
    } satisfies UpsertMcpToolPayload;
  });
}

async function loadBaseResources() {
  baseLoading.value = true;
  serverError.value = "";
  try {
    const [serverList, credentialList, agentList] = await Promise.all([
      listMcpServers(),
      listCredentials(),
      listAgents()
    ]);
    servers.value = serverList;
    credentials.value = credentialList;
    agents.value = agentList;

    const routeServerId = parseRouteId("serverId");
    const routeAgentId = parseRouteId("agentId");

    if (routeAgentId && agentList.some((agent) => agent.id === routeAgentId)) {
      selectedAgentId.value = String(routeAgentId);
    } else if (!selectedAgentId.value && agentList.length) {
      selectedAgentId.value = String(agentList[0].id);
    }

    if (routeServerId && serverList.some((server) => server.id === routeServerId)) {
      selectedServerId.value = routeServerId;
    } else if (!selectedServerId.value && serverList.length) {
      selectedServerId.value = serverList[0].id;
    }

    syncServerForm(selectedServer.value);
  } catch (error) {
    serverError.value = extractApiErrorMessage(error, "加载 MCP 资源失败");
  } finally {
    baseLoading.value = false;
  }
}

async function loadToolsForSelectedServer() {
  if (!selectedServerId.value) {
    tools.value = [];
    toolsEditorJson.value = "[]";
    return;
  }
  try {
    tools.value = await listMcpTools(selectedServerId.value);
    serializeToolsToEditor(tools.value);
  } catch (error) {
    toolError.value = extractApiErrorMessage(error, "加载工具目录失败");
  }
}

async function loadBindingsForSelectedAgent() {
  if (!selectedAgentId.value) {
    bindings.value = [];
    boundToolIds.value = [];
    return;
  }
  try {
    const result = await listAgentToolBindings(Number(selectedAgentId.value));
    bindings.value = result.map((item) => ({
      id: item.id,
      toolId: item.toolId,
      toolName: item.toolName,
      serverName: item.serverName
    }));
    boundToolIds.value = result.map((item) => item.toolId);
  } catch (error) {
    bindingError.value = extractApiErrorMessage(error, "加载 Agent 工具绑定失败");
  }
}

async function loadOAuthConnectionForSelectedServer() {
  oauthError.value = "";
  oauthHint.value = "";
  oauthConnection.value = null;
  if (!selectedServer.value) {
    return;
  }
  if (selectedServer.value.authType !== "OAUTH_AUTH_CODE" && selectedServer.value.authType !== "OAUTH_CLIENT_CREDENTIALS") {
    return;
  }
  try {
    oauthConnection.value = await getMcpOAuthConnection(selectedServer.value.id);
  } catch (error) {
    oauthError.value = extractApiErrorMessage(error, "加载 OAuth 连接状态失败");
  }
}

async function loadToolCallLogsForSelectedAgent() {
  logsLoading.value = true;
  try {
    toolCallLogs.value = await listMcpToolCallLogs({
      agentId: selectedAgentId.value ? Number(selectedAgentId.value) : undefined,
      limit: 8
    });
  } catch (error) {
    bindingError.value = extractApiErrorMessage(error, "加载工具调用日志失败");
  } finally {
    logsLoading.value = false;
  }
}

async function submitServer() {
  resetServerErrors();
  if (!validateServerForm()) {
    return;
  }

  savingServer.value = true;
  serverError.value = "";
  try {
    const payload = {
      name: serverForm.name.trim(),
      description: serverForm.description.trim() || undefined,
      baseUrl: serverForm.baseUrl.trim(),
      transportType: serverForm.transportType,
      authType: serverForm.authType,
      credentialId: serverForm.credentialId ? Number(serverForm.credentialId) : undefined,
      enabled: serverForm.enabled
    };

    if (selectedServerId.value) {
      const updated = await updateMcpServer(selectedServerId.value, payload);
      await loadBaseResources();
      selectedServerId.value = updated.id;
    } else {
      const created = await createMcpServer(payload);
      await loadBaseResources();
      selectedServerId.value = created.id;
    }
  } catch (error) {
    serverError.value = extractApiErrorMessage(error, "保存 MCP Server 失败");
  } finally {
    savingServer.value = false;
  }
}

async function removeSelectedServer() {
  if (!selectedServerId.value || !selectedServer.value) {
    return;
  }
  if (!window.confirm(`确定删除 MCP Server“${selectedServer.value.name}”吗？它的工具目录和 Agent 绑定也会一起清理。`)) {
    return;
  }

  deletingServer.value = true;
  serverError.value = "";
  try {
    await deleteMcpServer(selectedServerId.value);
    selectedServerId.value = null;
    await loadBaseResources();
  } catch (error) {
    serverError.value = extractApiErrorMessage(error, "删除 MCP Server 失败");
  } finally {
    deletingServer.value = false;
  }
}

async function syncSelectedServerTools() {
  if (!selectedServerId.value) {
    return;
  }
  syncingTools.value = true;
  toolError.value = "";
  try {
    tools.value = await syncMcpServerTools(selectedServerId.value);
    serializeToolsToEditor(tools.value);
    await loadBaseResources();
  } catch (error) {
    toolError.value = extractApiErrorMessage(error, "同步远端工具目录失败");
  } finally {
    syncingTools.value = false;
  }
}

async function saveToolsSnapshot() {
  if (!selectedServerId.value) {
    return;
  }
  savingTools.value = true;
  toolError.value = "";
  try {
    const parsed = parseToolsEditor();
    tools.value = await replaceMcpServerTools(selectedServerId.value, { tools: parsed });
    serializeToolsToEditor(tools.value);
    await loadBaseResources();
  } catch (error) {
    toolError.value = error instanceof Error ? error.message : extractApiErrorMessage(error, "保存工具快照失败");
  } finally {
    savingTools.value = false;
  }
}

function resetToolsEditor() {
  serializeToolsToEditor(tools.value);
  toolError.value = "";
}

function toggleToolBinding(toolId: number) {
  if (boundToolIds.value.includes(toolId)) {
    boundToolIds.value = boundToolIds.value.filter((id) => id !== toolId);
    return;
  }
  boundToolIds.value = [...boundToolIds.value, toolId];
}

async function saveAgentBindings() {
  if (!selectedAgentId.value) {
    bindingError.value = "请先选择一个 Agent。";
    return;
  }
  savingBindings.value = true;
  bindingError.value = "";
  try {
    const result = await replaceAgentToolBindings(Number(selectedAgentId.value), {
      toolIds: boundToolIds.value
    });
    bindings.value = result.map((item) => ({
      id: item.id,
      toolId: item.toolId,
      toolName: item.toolName,
      serverName: item.serverName
    }));
    await loadToolCallLogsForSelectedAgent();
  } catch (error) {
    bindingError.value = extractApiErrorMessage(error, "保存 Agent 工具绑定失败");
  } finally {
    savingBindings.value = false;
  }
}

async function startAuthorization() {
  if (!selectedServerId.value || !oauthForm.clientId.trim()) {
    oauthError.value = "请先输入 OAuth Client ID。";
    return;
  }
  oauthSubmitting.value = true;
  oauthError.value = "";
  oauthHint.value = "";
  try {
    const result = await startMcpOAuthAuthorization(selectedServerId.value, {
      clientId: oauthForm.clientId.trim(),
      clientSecret: oauthForm.clientSecret.trim() || undefined,
      scope: oauthForm.scope.trim() || undefined
    });
    oauthHint.value = `授权链接已生成，有效期至 ${result.authorizationExpiresAt ? formatDateTime(result.authorizationExpiresAt) : "稍后过期"}。`;
    window.open(result.authorizationUrl, "_blank", "noopener,noreferrer");
    await loadOAuthConnectionForSelectedServer();
  } catch (error) {
    oauthError.value = extractApiErrorMessage(error, "发起 OAuth 授权失败");
  } finally {
    oauthSubmitting.value = false;
  }
}

async function connectClientCredentials() {
  if (!selectedServerId.value || !oauthForm.clientId.trim() || !oauthForm.clientSecret.trim()) {
    oauthError.value = "请先填写 client_id 和 client_secret。";
    return;
  }
  oauthSubmitting.value = true;
  oauthError.value = "";
  oauthHint.value = "";
  try {
    oauthConnection.value = await connectMcpOAuthClientCredentials(selectedServerId.value, {
      clientId: oauthForm.clientId.trim(),
      clientSecret: oauthForm.clientSecret.trim(),
      scope: oauthForm.scope.trim() || undefined
    });
    oauthHint.value = "Client Credentials 连接已建立。";
  } catch (error) {
    oauthError.value = extractApiErrorMessage(error, "建立 OAuth Client Credentials 连接失败");
  } finally {
    oauthSubmitting.value = false;
  }
}

async function disconnectOAuth() {
  if (!selectedServerId.value) {
    return;
  }
  oauthSubmitting.value = true;
  oauthError.value = "";
  oauthHint.value = "";
  try {
    await disconnectMcpOAuthConnection(selectedServerId.value);
    oauthHint.value = "当前 OAuth 连接已断开。";
    await loadOAuthConnectionForSelectedServer();
  } catch (error) {
    oauthError.value = extractApiErrorMessage(error, "断开 OAuth 连接失败");
  } finally {
    oauthSubmitting.value = false;
  }
}

watch(selectedServerId, async (value) => {
  await router.replace({
    query: {
      ...route.query,
      serverId: value ? String(value) : undefined,
      agentId: selectedAgentId.value || undefined
    }
  });
  syncServerForm(selectedServer.value);
  await loadToolsForSelectedServer();
  await loadOAuthConnectionForSelectedServer();
});

watch(selectedAgentId, async (value) => {
  await router.replace({
    query: {
      ...route.query,
      serverId: selectedServerId.value ? String(selectedServerId.value) : undefined,
      agentId: value || undefined
    }
  });
  await loadBindingsForSelectedAgent();
  await loadToolCallLogsForSelectedAgent();
});

onMounted(async () => {
  await loadBaseResources();
  await loadToolsForSelectedServer();
  await loadBindingsForSelectedAgent();
  await loadOAuthConnectionForSelectedServer();
  await loadToolCallLogsForSelectedAgent();
});
</script>
