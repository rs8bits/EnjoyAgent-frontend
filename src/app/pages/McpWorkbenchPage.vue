<template>
  <div class="ea-scroll flex h-full min-h-0 flex-col overflow-y-auto p-5 lg:p-6">
    <div class="mb-5 flex flex-col gap-5 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="text-xs font-semibold uppercase tracking-[0.22em] text-accent">MCP</div>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink">MCP 工具管理</h1>
      </div>

      <div class="flex flex-wrap items-center gap-3 rounded-full border border-line bg-white px-4 py-3 shadow-card">
        <div class="rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent">
          {{ servers.length }} 个 Server
        </div>
        <div class="rounded-full bg-canvas px-3 py-1 text-sm text-muted">
          {{ tools.length }} 个工具
        </div>
        <div class="rounded-full bg-canvas px-3 py-1 text-sm text-muted">
          {{ bindingTotal }} 个 Agent 绑定
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

        <UiPagination
          :page="serverPage"
          :size="serverPageSize"
          :total="serverTotal"
          :total-pages="serverTotalPages"
          @change="loadServers"
        />
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

            <div v-if="serverError" class="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600" role="alert">
              {{ serverError }}
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <UiButton type="submit" :disabled="savingServer">
                {{ savingServer ? "保存中..." : selectedServerId ? "保存 Server" : canAutoSyncServerForm ? "创建并同步 Server" : "创建 Server" }}
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
                  当前 {{ toolTotal }} 个工具
                </div>
                <UiButton :disabled="syncingTools" @click="syncSelectedServerTools">
                  {{ syncingTools ? "同步中..." : "从远端同步" }}
                </UiButton>
              </div>

              <div v-if="toolError" class="mb-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600" role="alert">
                {{ toolError }}
              </div>

              <div v-if="toolHint" class="mb-4 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">
                {{ toolHint }}
              </div>

              <div
                v-if="!tools.length"
                class="rounded-[20px] border border-dashed border-line bg-canvas px-4 py-10 text-center text-sm leading-6 text-muted"
              >
                当前工具目录还是空的。创建 Server 只是保存连接配置，只有成功执行 tools/list 后才会产生可绑定的工具。
                你可以点击“从远端同步”重试，或者在右侧手动输入工具快照。
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

              <UiPagination
                :page="toolPage"
                :size="toolPageSize"
                :total="toolTotal"
                :total-pages="toolTotalPages"
                @change="changeToolPage"
              />
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

            <div v-if="hasBoundHighRiskTools" class="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
              HIGH 风险工具不会被静默调用。用户需要在聊天工作台为下一条消息签发短期、Agent/工具绑定的授权。
              <RouterLink
                class="ml-1 font-semibold underline"
                :to="{ path: '/app/chat/workspace', query: { agentId: selectedAgentId } }"
              >
                前往逐次授权
              </RouterLink>
            </div>
          </div>
        </SectionCard>
      </div>

      <div class="ea-scroll min-h-0 space-y-5 overflow-y-auto pr-1">
        <SectionCard eyebrow="Agent 绑定" title="把工具绑定到 Agent">
          <div v-if="!hasAnyAgent" class="rounded-[18px] border border-dashed border-line bg-canvas px-4 py-8 text-sm leading-6 text-muted">
            当前还没有 Agent，请先去 Agent 管理页面创建一个 Agent。
          </div>

          <div v-else class="space-y-4">
            <form class="space-y-2" @submit.prevent="submitAgentSearch">
              <UiTextField
                v-model="agentSearchInput"
                label="搜索 Agent"
                placeholder="输入 Agent 名称"
                hint="按名称服务端搜索，每次只加载一页。"
              />
              <UiButton class="w-full" type="submit" variant="secondary" :disabled="agentsLoading">
                {{ agentsLoading ? "搜索中..." : "搜索" }}
              </UiButton>
            </form>

            <UiSelect
              v-model="selectedAgentId"
              label="当前 Agent"
              :options="agentOptions"
              placeholder="请选择一个 Agent"
              :disabled="agentsLoading"
              :hint="agentSelectorHint"
            />

            <UiPagination
              :page="agentPage"
              :size="agentPageSize"
              :total="agentTotal"
              :total-pages="agentTotalPages"
              @change="changeAgentPage"
            />

            <div v-if="!selectedServer" class="rounded-[18px] border border-dashed border-line bg-canvas px-4 py-6 text-sm text-muted">
              先在左侧选择一个 MCP Server，这里会出现它的工具绑定清单。
            </div>

            <div v-else-if="!tools.length" class="space-y-3 rounded-[18px] border border-dashed border-line bg-canvas px-4 py-6 text-sm text-muted">
              <p>当前 Server 还没有工具目录。先从远端发现工具，再绑定到 Agent。</p>
              <UiButton :disabled="syncingTools" @click="syncSelectedServerTools">
                {{ syncingTools ? "同步中..." : "同步工具并继续绑定" }}
              </UiButton>
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

            <div v-if="bindingError" class="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600" role="alert">
              {{ bindingError }}
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <UiButton :disabled="savingBindings || !selectedAgentId" @click="saveAgentBindings">
                {{ savingBindings ? "保存中..." : "保存 Agent 工具绑定" }}
              </UiButton>
              <div class="rounded-full border border-line bg-canvas px-3 py-1 text-xs text-muted">
                当前 Agent 已绑定 {{ bindingTotal }} 个工具
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

            <UiPagination
              :page="bindingPage"
              :size="bindingPageSize"
              :total="bindingTotal"
              :total-pages="bindingTotalPages"
              @change="changeBindingPage"
            />
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
              <UiTextField v-model="oauthForm.clientSecret" type="password" autocomplete="new-password" label="OAuth Client Secret" placeholder="Public Client 可留空" />
              <UiTextField v-model="oauthForm.scope" label="请求 Scope" placeholder="openid profile mcp" />
              <UiButton :disabled="oauthSubmitting || !oauthForm.clientId.trim()" @click="startAuthorization">
                {{ oauthSubmitting ? "生成中..." : "发起授权并打开新窗口" }}
              </UiButton>
            </div>

            <div v-else class="space-y-4">
              <UiTextField v-model="oauthForm.clientId" label="OAuth Client ID" placeholder="请输入 client_id" />
              <UiTextField v-model="oauthForm.clientSecret" type="password" autocomplete="new-password" label="OAuth Client Secret" placeholder="请输入 client_secret" />
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

            <div v-if="oauthError" class="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600" role="alert">
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
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import SectionCard from "@/app/components/SectionCard.vue";
import UiButton from "@/app/components/ui/UiButton.vue";
import UiCheckbox from "@/app/components/ui/UiCheckbox.vue";
import UiPagination from "@/app/components/ui/UiPagination.vue";
import UiSelect from "@/app/components/ui/UiSelect.vue";
import UiTextField from "@/app/components/ui/UiTextField.vue";
import UiTextarea from "@/app/components/ui/UiTextarea.vue";
import { usePaginatedAgentSelector } from "@/app/composables/usePaginatedAgentSelector";
import { mcpAuthOptions, mcpToolRiskOptions, mcpTransportOptions } from "@/app/constants/options";
import { listCredentials } from "@/app/services/credentials";
import { extractApiErrorMessage, isRequestCanceled } from "@/app/services/http";
import { fetchAllPages } from "@/app/services/pagination";
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
import type { Credential } from "@/app/types/credential";
import type {
  AgentToolBinding,
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
const allServers = ref<McpServer[]>([]);
const serverPage = ref(0);
const serverPageSize = 20;
const serverTotal = ref(0);
const serverTotalPages = ref(0);
const tools = ref<McpTool[]>([]);
const allServerTools = ref<McpTool[]>([]);
const toolPage = ref(0);
const toolPageSize = 20;
const toolTotal = ref(0);
const toolTotalPages = ref(0);
const credentials = ref<Credential[]>([]);
const bindings = ref<Array<{
  id: number;
  toolId: number;
  toolName: string;
  serverName: string;
}>>([]);
const allAgentBindings = ref<AgentToolBinding[]>([]);
const bindingPage = ref(0);
const bindingPageSize = 20;
const bindingTotal = ref(0);
const bindingTotalPages = ref(0);
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
const {
  agentOptions,
  agentPage,
  pageSize: agentPageSize,
  agentTotal,
  agentTotalPages,
  agentSearchInput,
  appliedAgentSearch,
  agentsLoading,
  hasAnyAgent,
  initializeAgents,
  loadAgentPage,
  searchAgents,
  disposeAgentSelector
} = usePaginatedAgentSelector(selectedAgentId);

const serverError = ref("");
const toolError = ref("");
const toolHint = ref("");
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
let toolsLoadController: AbortController | null = null;
let bindingsLoadController: AbortController | null = null;
let oauthLoadController: AbortController | null = null;
let logsLoadController: AbortController | null = null;
let baseLoadController: AbortController | null = null;
let componentActive = false;
let initializingWorkbench = true;

const selectedServer = computed(() =>
  servers.value.find((item) => item.id === selectedServerId.value) ?? null
);

const agentSelectorHint = computed(() => appliedAgentSearch.value
  ? `搜索“${appliedAgentSearch.value}”共 ${agentTotal.value} 条；已选 Agent 会在切页后保留。`
  : `共 ${agentTotal.value} 个 Agent，每页 ${agentPageSize} 个。`
);

const credentialOptions = computed(() =>
  credentials.value
    .filter((credential) => credential.status === "ACTIVE")
    .map((credential) => ({
      label: `${credential.name} · ${credential.provider}`,
      value: String(credential.id)
    }))
);

const canAutoSyncServerForm = computed(() =>
  serverForm.enabled
  && serverForm.transportType === "STREAMABLE_HTTP"
  && (serverForm.authType === "NONE"
    || (serverForm.authType === "STATIC_BEARER" && Boolean(serverForm.credentialId)))
);

const hasBoundHighRiskTools = computed(() =>
  allAgentBindings.value.some((binding) =>
    binding.enabled && binding.riskLevel === "HIGH" && boundToolIds.value.includes(binding.toolId)
  )
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
  toolHint.value = "";
  oauthError.value = "";
  oauthHint.value = "";
  tools.value = [];
  allServerTools.value = [];
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
  toolError.value = "";
  toolHint.value = "";
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

function showServerPage(page: number) {
  const lastPage = Math.max(0, serverTotalPages.value - 1);
  serverPage.value = Math.min(Math.max(0, page), lastPage);
  servers.value = allServers.value.slice(
    serverPage.value * serverPageSize,
    (serverPage.value + 1) * serverPageSize
  );
}

function revealServer(serverId: number) {
  const index = allServers.value.findIndex((server) => server.id === serverId);
  if (index >= 0) {
    showServerPage(Math.floor(index / serverPageSize));
  }
}

function loadServers(page: number) {
  showServerPage(page);
  if (selectedServerId.value && servers.value.some((server) => server.id === selectedServerId.value)) {
    return;
  }
  selectedServerId.value = servers.value[0]?.id ?? null;
}

async function loadBaseResources() {
  baseLoadController?.abort();
  const controller = new AbortController();
  baseLoadController = controller;
  baseLoading.value = true;
  serverError.value = "";
  try {
    const routeAgentId = parseRouteId("agentId");
    const [loadedServers, allCredentials] = await Promise.all([
      fetchAllPages((page, size) => listMcpServers(page, size, controller.signal)),
      fetchAllPages((page, size) => listCredentials(page, size, controller.signal)),
      initializeAgents(routeAgentId ?? undefined, controller.signal)
    ]);
    if (controller.signal.aborted) return;
    allServers.value = loadedServers;
    serverTotal.value = loadedServers.length;
    serverTotalPages.value = loadedServers.length ? Math.ceil(loadedServers.length / serverPageSize) : 0;
    credentials.value = allCredentials;

    const routeServerId = parseRouteId("serverId");

    const activeServerId = routeServerId && loadedServers.some((server) => server.id === routeServerId)
      ? routeServerId
      : selectedServerId.value && loadedServers.some((server) => server.id === selectedServerId.value)
        ? selectedServerId.value
        : loadedServers[0]?.id ?? null;
    if (activeServerId) revealServer(activeServerId);
    else showServerPage(0);
    selectedServerId.value = activeServerId;

    syncServerForm(selectedServer.value);
  } catch (error) {
    if (!isRequestCanceled(error)) {
      serverError.value = extractApiErrorMessage(error, "加载 MCP 资源失败");
    }
  } finally {
    if (baseLoadController === controller) {
      baseLoading.value = false;
      baseLoadController = null;
    }
  }
}

async function submitAgentSearch() {
  bindingError.value = "";
  try {
    await searchAgents();
  } catch (error) {
    if (!isRequestCanceled(error)) {
      bindingError.value = extractApiErrorMessage(error, "搜索 Agent 失败");
    }
  }
}

async function changeAgentPage(page: number) {
  bindingError.value = "";
  try {
    await loadAgentPage(page);
  } catch (error) {
    if (!isRequestCanceled(error)) {
      bindingError.value = extractApiErrorMessage(error, "加载 Agent 分页失败");
    }
  }
}

async function loadToolsForSelectedServer(newPage?: number) {
  if (newPage !== undefined) toolPage.value = newPage;
  if (!selectedServerId.value) {
    tools.value = [];
    allServerTools.value = [];
    toolTotal.value = 0;
    toolTotalPages.value = 0;
    toolsEditorJson.value = "[]";
    return;
  }
  toolsLoadController?.abort();
  const controller = new AbortController();
  toolsLoadController = controller;
  const requestedServerId = selectedServerId.value;
  const requestedPage = toolPage.value;
  try {
    const allTools = await fetchAllPages((page, size) =>
      listMcpTools(requestedServerId, page, size, controller.signal)
    );
    if (controller.signal.aborted || requestedServerId !== selectedServerId.value || requestedPage !== toolPage.value) return;
    const totalPages = allTools.length ? Math.ceil(allTools.length / toolPageSize) : 0;
    const visiblePage = totalPages > 0 ? Math.min(requestedPage, totalPages - 1) : 0;
    toolPage.value = visiblePage;
    allServerTools.value = allTools;
    tools.value = allTools.slice(visiblePage * toolPageSize, (visiblePage + 1) * toolPageSize);
    toolTotal.value = allTools.length;
    toolTotalPages.value = totalPages;
    serializeToolsToEditor(allTools);
  } catch (error) {
    if (!isRequestCanceled(error)) {
      toolError.value = extractApiErrorMessage(error, "加载工具目录失败");
    }
  } finally {
    if (toolsLoadController === controller) toolsLoadController = null;
  }
}

function changeToolPage(page: number) {
  toolPage.value = page;
  tools.value = allServerTools.value.slice(page * toolPageSize, (page + 1) * toolPageSize);
}

async function loadBindingsForSelectedAgent(newPage?: number) {
  if (newPage !== undefined) bindingPage.value = newPage;
  if (!selectedAgentId.value) {
    bindings.value = [];
    allAgentBindings.value = [];
    boundToolIds.value = [];
    return;
  }
  bindingsLoadController?.abort();
  const controller = new AbortController();
  bindingsLoadController = controller;
  const requestedAgentId = selectedAgentId.value;
  const requestedPage = bindingPage.value;
  try {
    const allBindings = await fetchAllPages((page, size) =>
      listAgentToolBindings(Number(requestedAgentId), page, size, controller.signal)
    );
    if (controller.signal.aborted || requestedAgentId !== selectedAgentId.value || requestedPage !== bindingPage.value) return;
    const totalPages = allBindings.length ? Math.ceil(allBindings.length / bindingPageSize) : 0;
    const visiblePage = totalPages > 0 ? Math.min(requestedPage, totalPages - 1) : 0;
    bindingPage.value = visiblePage;
    allAgentBindings.value = allBindings;
    changeBindingPage(visiblePage);
    bindingTotal.value = allBindings.length;
    bindingTotalPages.value = totalPages;
    boundToolIds.value = allBindings.map((item) => item.toolId);
  } catch (error) {
    if (!isRequestCanceled(error)) {
      bindingError.value = extractApiErrorMessage(error, "加载 Agent 工具绑定失败");
    }
  } finally {
    if (bindingsLoadController === controller) bindingsLoadController = null;
  }
}

function changeBindingPage(page: number) {
  bindingPage.value = page;
  bindings.value = allAgentBindings.value
    .slice(page * bindingPageSize, (page + 1) * bindingPageSize)
    .map((item) => ({
      id: item.id,
      toolId: item.toolId,
      toolName: item.toolName,
      serverName: item.serverName
    }));
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
  oauthLoadController?.abort();
  const controller = new AbortController();
  oauthLoadController = controller;
  const requestedServerId = selectedServer.value.id;
  try {
    const connection = await getMcpOAuthConnection(requestedServerId, controller.signal);
    if (controller.signal.aborted || requestedServerId !== selectedServerId.value) return;
    oauthConnection.value = connection;
  } catch (error) {
    if (!isRequestCanceled(error)) {
      oauthError.value = extractApiErrorMessage(error, "加载 OAuth 连接状态失败");
    }
  } finally {
    if (oauthLoadController === controller) oauthLoadController = null;
  }
}

async function loadToolCallLogsForSelectedAgent() {
  logsLoadController?.abort();
  const controller = new AbortController();
  logsLoadController = controller;
  const requestedAgentId = selectedAgentId.value;
  logsLoading.value = true;
  try {
    const logs = await listMcpToolCallLogs({
      agentId: requestedAgentId ? Number(requestedAgentId) : undefined,
      limit: 8
    }, controller.signal);
    if (controller.signal.aborted || requestedAgentId !== selectedAgentId.value) return;
    toolCallLogs.value = logs;
  } catch (error) {
    if (!isRequestCanceled(error)) {
      bindingError.value = extractApiErrorMessage(error, "加载工具调用日志失败");
    }
  } finally {
    if (logsLoadController === controller) {
      logsLoading.value = false;
      logsLoadController = null;
    }
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
      revealServer(updated.id);
      selectedServerId.value = updated.id;
    } else {
      const created = await createMcpServer(payload);
      toolError.value = "";
      toolHint.value = "";
      if (canAutoSyncServerForm.value) {
        syncingTools.value = true;
        try {
          const discoveredTools = await syncMcpServerTools(created.id);
          toolHint.value = `Server 已创建，并自动发现 ${discoveredTools.length} 个可绑定工具。`;
        } catch (syncError) {
          toolError.value = `Server 已创建，但自动同步工具失败：${extractApiErrorMessage(syncError, "请检查连接后重试")}`;
        } finally {
          syncingTools.value = false;
        }
      }
      await loadBaseResources();
      revealServer(created.id);
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
    await loadBindingsForSelectedAgent();
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
  toolHint.value = "";
  try {
    tools.value = await syncMcpServerTools(selectedServerId.value);
    toolHint.value = `已从远端发现 ${tools.value.length} 个工具，现在可以选择并绑定到 Agent。`;
    serializeToolsToEditor(tools.value);
    await loadBaseResources();
    await loadToolsForSelectedServer();
    await loadBindingsForSelectedAgent();
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
    await loadToolsForSelectedServer();
    await loadBindingsForSelectedAgent();
  } catch (error) {
    toolError.value = error instanceof Error ? error.message : extractApiErrorMessage(error, "保存工具快照失败");
  } finally {
    savingTools.value = false;
  }
}

function resetToolsEditor() {
  serializeToolsToEditor(allServerTools.value);
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
    bindingTotal.value = result.length;
    bindingTotalPages.value = result.length ? Math.ceil(result.length / bindingPageSize) : 0;
    await loadToolCallLogsForSelectedAgent();
    await loadBindingsForSelectedAgent();
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
    const authorizationUrl = new URL(result.authorizationUrl);
    if (authorizationUrl.protocol !== "https:" && authorizationUrl.protocol !== "http:") {
      throw new Error("OAuth 授权地址必须使用 HTTP 或 HTTPS。");
    }
    oauthHint.value = `授权链接已生成，有效期至 ${result.authorizationExpiresAt ? formatDateTime(result.authorizationExpiresAt) : "稍后过期"}。`;
    oauthForm.clientSecret = "";
    window.open(authorizationUrl.toString(), "_blank", "noopener,noreferrer");
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
    oauthForm.clientSecret = "";
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
  if (initializingWorkbench) return;
  toolsLoadController?.abort();
  oauthLoadController?.abort();
  tools.value = [];
  allServerTools.value = [];
  toolTotal.value = 0;
  toolTotalPages.value = 0;
  toolsEditorJson.value = "[]";
  oauthConnection.value = null;
  await router.replace({
    query: {
      ...route.query,
      serverId: value ? String(value) : undefined,
      agentId: selectedAgentId.value || undefined
    }
  });
  if (!componentActive || value !== selectedServerId.value) return;
  syncServerForm(selectedServer.value);
  toolPage.value = 0;
  await loadToolsForSelectedServer();
  if (!componentActive) return;
  await loadOAuthConnectionForSelectedServer();
});

watch(selectedAgentId, async (value) => {
  if (initializingWorkbench) return;
  bindingsLoadController?.abort();
  logsLoadController?.abort();
  bindings.value = [];
  allAgentBindings.value = [];
  boundToolIds.value = [];
  bindingTotal.value = 0;
  bindingTotalPages.value = 0;
  toolCallLogs.value = [];
  await router.replace({
    query: {
      ...route.query,
      serverId: selectedServerId.value ? String(selectedServerId.value) : undefined,
      agentId: value || undefined
    }
  });
  if (!componentActive || value !== selectedAgentId.value) return;
  bindingPage.value = 0;
  await loadBindingsForSelectedAgent();
  if (!componentActive) return;
  await loadToolCallLogsForSelectedAgent();
});

onMounted(async () => {
  componentActive = true;
  await loadBaseResources();
  if (!componentActive) return;
  initializingWorkbench = false;
  await loadToolsForSelectedServer();
  if (!componentActive) return;
  await loadBindingsForSelectedAgent();
  if (!componentActive) return;
  await loadOAuthConnectionForSelectedServer();
  if (!componentActive) return;
  await loadToolCallLogsForSelectedAgent();
});

onBeforeUnmount(() => {
  componentActive = false;
  disposeAgentSelector();
  baseLoadController?.abort();
  toolsLoadController?.abort();
  bindingsLoadController?.abort();
  oauthLoadController?.abort();
  logsLoadController?.abort();
});
</script>
