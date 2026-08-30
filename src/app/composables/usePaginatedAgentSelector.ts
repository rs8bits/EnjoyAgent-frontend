import { computed, ref, watch, type Ref } from "vue";
import { getAgent, listAgents } from "@/app/services/agents";
import type { PagedResponse } from "@/app/types/api";
import type { Agent } from "@/app/types/agent";

type AgentPageLoader = (
  page: number,
  size: number,
  signal?: AbortSignal,
  search?: string
) => Promise<PagedResponse<Agent>>;

type AgentDetailLoader = (id: number, signal?: AbortSignal) => Promise<Agent>;

interface PaginatedAgentSelectorOptions {
  pageSize?: number;
  formatLabel?: (agent: Agent) => string;
  loadPage?: AgentPageLoader;
  loadOne?: AgentDetailLoader;
}

/**
 * Agent 远程选择状态：每次只取一页，支持名称搜索，并始终保留已选 Agent。
 */
export function usePaginatedAgentSelector(
  selectedAgentId: Ref<string>,
  options: PaginatedAgentSelectorOptions = {}
) {
  const pageSize = options.pageSize ?? 20;
  const loadPage = options.loadPage ?? listAgents;
  const loadOne = options.loadOne ?? getAgent;
  const formatLabel = options.formatLabel ?? ((agent: Agent) => agent.name);

  const agents = ref<Agent[]>([]);
  const selectedAgent = ref<Agent | null>(null);
  const agentPage = ref(0);
  const agentTotal = ref(0);
  const agentTotalPages = ref(0);
  const knownUnfilteredTotal = ref(0);
  const agentSearchInput = ref("");
  const appliedAgentSearch = ref("");
  const agentsLoading = ref(false);
  let requestVersion = 0;

  const activeAgent = computed(() => {
    const selectedId = selectedAgentId.value;
    if (!selectedId) return null;
    if (selectedAgent.value && String(selectedAgent.value.id) === selectedId) {
      return selectedAgent.value;
    }
    return agents.value.find((agent) => String(agent.id) === selectedId) ?? null;
  });

  const agentOptions = computed(() => {
    const pinned = activeAgent.value ? [activeAgent.value] : [];
    return [...pinned, ...agents.value.filter((agent) => agent.id !== activeAgent.value?.id)]
      .map((agent) => ({ label: formatLabel(agent), value: String(agent.id) }));
  });

  const hasAnyAgent = computed(() => knownUnfilteredTotal.value > 0 || activeAgent.value !== null);

  watch(selectedAgentId, (value) => {
    if (!value) {
      selectedAgent.value = null;
      return;
    }
    const pageAgent = agents.value.find((agent) => String(agent.id) === value);
    if (pageAgent) {
      selectedAgent.value = pageAgent;
    } else if (String(selectedAgent.value?.id ?? "") !== value) {
      selectedAgent.value = null;
    }
  });

  async function loadAgentPage(
    page = 0,
    signal?: AbortSignal,
    search = appliedAgentSearch.value
  ) {
    const version = ++requestVersion;
    agentsLoading.value = true;
    try {
      const result = await loadPage(page, pageSize, signal, search || undefined);
      if (signal?.aborted || version !== requestVersion) return false;
      agents.value = result.items;
      agentPage.value = result.page;
      agentTotal.value = result.total;
      agentTotalPages.value = result.totalPages;
      appliedAgentSearch.value = search;
      if (!search) knownUnfilteredTotal.value = result.total;

      const pageAgent = result.items.find((agent) => String(agent.id) === selectedAgentId.value);
      if (pageAgent) selectedAgent.value = pageAgent;
      return true;
    } finally {
      if (version === requestVersion) agentsLoading.value = false;
    }
  }

  async function initializeAgents(preferredAgentId?: number, signal?: AbortSignal) {
    const loaded = await loadAgentPage(0, signal, "");
    if (!loaded || signal?.aborted) return;

    const preferredId = preferredAgentId
      ?? (selectedAgentId.value ? Number(selectedAgentId.value) : undefined);
    let preferredAgent = preferredId
      ? agents.value.find((agent) => agent.id === preferredId) ?? null
      : null;

    if (preferredId && !preferredAgent) {
      try {
        preferredAgent = await loadOne(preferredId, signal);
      } catch (error) {
        if (signal?.aborted) throw error;
        preferredAgent = null;
      }
    }
    if (signal?.aborted) return;

    const initialAgent = preferredAgent ?? agents.value[0] ?? null;
    selectedAgent.value = initialAgent;
    selectedAgentId.value = initialAgent ? String(initialAgent.id) : "";
  }

  async function searchAgents(signal?: AbortSignal) {
    return loadAgentPage(0, signal, agentSearchInput.value.trim());
  }

  function disposeAgentSelector() {
    requestVersion += 1;
  }

  return {
    activeAgent,
    agentOptions,
    agents,
    agentPage,
    pageSize,
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
  };
}
