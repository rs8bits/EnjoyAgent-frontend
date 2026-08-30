// @vitest-environment happy-dom

import { flushPromises, mount } from "@vue/test-utils";
import { computed, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  installMarketAsset: vi.fn(),
  listPublishedMarketAssets: vi.fn(),
  getMarketAsset: vi.fn(),
}));

vi.mock("vue-router", () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/app/stores/auth", () => ({
  useAuthStore: () => ({ isOwner: true }),
}));

vi.mock("@/app/composables/usePaginatedAgentSelector", () => ({
  usePaginatedAgentSelector: () => ({
    agentOptions: computed(() => []),
    agentPage: ref(0),
    pageSize: 200,
    agentTotal: ref(0),
    agentTotalPages: ref(0),
    agentSearchInput: ref(""),
    appliedAgentSearch: ref(""),
    agentsLoading: ref(false),
    loadAgentPage: vi.fn(async () => true),
    searchAgents: vi.fn(async () => true),
    disposeAgentSelector: vi.fn(),
  }),
}));

vi.mock("@/app/services/pagination", () => ({
  fetchAllPages: vi.fn(async () => []),
}));

vi.mock("@/app/services/market", () => ({
  installMarketAsset: mocks.installMarketAsset,
  listPublishedMarketAssets: mocks.listPublishedMarketAssets,
  getMarketAsset: mocks.getMarketAsset,
  listMyMarketSubmissions: vi.fn(async () => emptyPage()),
  submitAgentToMarket: vi.fn(),
  submitKnowledgeBaseToMarket: vi.fn(),
  submitMcpServerToMarket: vi.fn(),
  submitWorkflowToMarket: vi.fn(),
}));

vi.mock("@/app/services/credentials", () => ({ listCredentials: vi.fn() }));
vi.mock("@/app/services/knowledge", () => ({ listKnowledgeBases: vi.fn() }));
vi.mock("@/app/services/mcp", () => ({ listMcpServers: vi.fn() }));
vi.mock("@/app/services/models", () => ({
  listModelConfigs: vi.fn(),
  listOfficialModelConfigs: vi.fn(),
}));
vi.mock("@/app/services/workflow", () => ({ listWorkflows: vi.fn() }));

import MarketHubPage from "@/app/pages/MarketHubPage.vue";

function emptyPage<T>(items: T[] = []) {
  return { items, page: 0, size: 20, total: items.length, totalPages: items.length ? 1 : 0 };
}

const workflowAsset = {
  id: 7,
  assetType: "WORKFLOW",
  sourceEntityId: 6,
  name: "workflow-template",
  summary: "test",
  description: "test",
  status: "APPROVED",
  submitterUserId: 1,
  submitterDisplayName: "owner",
  reviewedByUserId: 2,
  reviewedByDisplayName: "admin",
  reviewedAt: "2026-08-11T00:00:00Z",
  reviewRemark: null,
  publishedAt: "2026-08-11T00:00:00Z",
  installCount: 0,
  createdAt: "2026-08-11T00:00:00Z",
  updatedAt: "2026-08-11T00:00:00Z",
};

describe("MarketHub mounted install interaction", () => {
  beforeEach(() => {
    mocks.installMarketAsset.mockReset();
    mocks.listPublishedMarketAssets.mockResolvedValue(emptyPage([workflowAsset]));
    mocks.getMarketAsset.mockResolvedValue(workflowAsset);
  });

  it("clicks the rendered native button and suppresses a concurrent form submit", async () => {
    let finishInstall: ((value: unknown) => void) | undefined;
    mocks.installMarketAsset.mockImplementation(() => new Promise((resolve) => {
      finishInstall = resolve;
    }));

    const wrapper = mount(MarketHubPage, {
      global: {
        stubs: {
          SectionCard: { template: "<section><slot /></section>" },
          UiButton: { template: "<button type='button'><slot /></button>" },
          UiCheckbox: true,
          UiPagination: true,
          UiSelect: true,
          UiTextField: true,
          UiTextarea: true,
        },
      },
    });
    await flushPromises();

    const installForm = wrapper.find("form");
    const installButton = wrapper.findAll("button").find((button) => button.text().includes("安装到当前租户"));
    expect(installButton).toBeDefined();
    const scrollRegion = installButton!.element.closest(".ea-scroll");
    expect(scrollRegion).not.toBeNull();
    expect(scrollRegion?.classList.contains("overflow-y-auto")).toBe(true);
    expect(scrollRegion?.classList.contains("min-h-0")).toBe(true);
    await installButton!.trigger("click");
    await installForm.trigger("submit");

    expect(mocks.installMarketAsset).toHaveBeenCalledOnce();
    expect(installButton!.attributes("disabled")).toBeDefined();

    finishInstall?.({
      marketAssetId: 7,
      assetType: "WORKFLOW",
      installedEntityId: 66,
      installedName: "installed-workflow",
      relatedResources: [],
      setupRequired: false,
      setupItems: [],
    });
    await flushPromises();

    expect(wrapper.text()).toContain("installed-workflow");
    expect(wrapper.text()).toContain("安装成功");
    wrapper.unmount();
  });
});
