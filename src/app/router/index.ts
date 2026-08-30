import { createRouter, createWebHistory } from "vue-router";
import AuthLayout from "@/app/layouts/AuthLayout.vue";
import AppWorkspaceLayout from "@/app/layouts/AppWorkspaceLayout.vue";
import pinia from "@/app/stores/pinia";
import { useAuthStore } from "@/app/stores/auth";

const AdminOverviewPage = () => import("@/app/pages/AdminOverviewPage.vue");
const AdminOfficialModelsPage = () => import("@/app/pages/AdminOfficialModelsPage.vue");
const AdminReviewCenterPage = () => import("@/app/pages/AdminReviewCenterPage.vue");
const AgentsPage = () => import("@/app/pages/AgentsPage.vue");
const ChatPreviewPage = () => import("@/app/pages/ChatPreviewPage.vue");
const CredentialsPage = () => import("@/app/pages/CredentialsPage.vue");
const KnowledgeImportPage = () => import("@/app/pages/KnowledgeImportPage.vue");
const LoginPage = () => import("@/app/pages/LoginPage.vue");
const McpWorkbenchPage = () => import("@/app/pages/McpWorkbenchPage.vue");
const ModelConfigsPage = () => import("@/app/pages/ModelConfigsPage.vue");
const MarketHubPage = () => import("@/app/pages/MarketHubPage.vue");
const NotFoundPage = () => import("@/app/pages/NotFoundPage.vue");
const OfficialModelsPage = () => import("@/app/pages/OfficialModelsPage.vue");
const RegisterPage = () => import("@/app/pages/RegisterPage.vue");
const WalletCenterPage = () => import("@/app/pages/WalletCenterPage.vue");
const WorkflowCanvasPage = () => import("@/app/pages/WorkflowCanvasPage.vue");
const WorkflowsPage = () => import("@/app/pages/WorkflowsPage.vue");
const WorkspaceHomePage = () => import("@/app/pages/WorkspaceHomePage.vue");

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: "/app/home"
    },
    {
      path: "/",
      component: AuthLayout,
      children: [
        {
          path: "login",
          name: "login",
          component: LoginPage,
          meta: { guestOnly: true, title: "登录" }
        },
        {
          path: "register",
          name: "register",
          component: RegisterPage,
          meta: { guestOnly: true, title: "注册" }
        }
      ]
    },
    {
      path: "/app",
      component: AppWorkspaceLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: "",
          redirect: "/app/home"
        },
        {
          path: "home",
          name: "workspace-home",
          component: WorkspaceHomePage,
          meta: { requiresAuth: true, title: "工作台" }
        },
        {
          path: "knowledge",
          name: "knowledge",
          component: KnowledgeImportPage,
          meta: { requiresAuth: true, requiresOwner: true, title: "知识库管理" }
        },
        {
          path: "mcp",
          name: "mcp-workbench",
          component: McpWorkbenchPage,
          meta: { requiresAuth: true, requiresOwner: true, title: "MCP 工具" }
        },
        {
          path: "wallet",
          name: "wallet-center",
          component: WalletCenterPage,
          meta: { requiresAuth: true, title: "钱包中心" }
        },
        {
          path: "market",
          name: "market-hub",
          component: MarketHubPage,
          meta: { requiresAuth: true, title: "共享市场" }
        },
        {
          path: "workflows",
          name: "workflows",
          component: WorkflowsPage,
          meta: { requiresAuth: true, requiresOwner: true, title: "工作流" }
        },
        {
          path: "workflows/:id/canvas",
          name: "workflow-canvas",
          component: WorkflowCanvasPage,
          meta: { requiresAuth: true, requiresOwner: true, title: "工作流编辑" }
        },
        {
          path: "knowledge/import",
          redirect: "/app/knowledge"
        },
        {
          path: "credentials",
          name: "credentials",
          component: CredentialsPage,
          meta: { requiresAuth: true, title: "凭证管理" }
        },
        {
          path: "model-configs",
          name: "model-configs",
          component: ModelConfigsPage,
          meta: { requiresAuth: true, requiresOwner: true, title: "模型配置" }
        },
        {
          path: "official-models",
          name: "official-models",
          component: OfficialModelsPage,
          meta: { requiresAuth: true, title: "官方模型" }
        },
        {
          path: "agents",
          name: "agents",
          component: AgentsPage,
          meta: { requiresAuth: true, requiresOwner: true, title: "Agent 管理" }
        },
        {
          path: "chat/workspace",
          name: "chat-workspace",
          component: ChatPreviewPage,
          meta: { requiresAuth: true, title: "Agent 工作台" }
        },
        {
          path: "admin/overview",
          name: "admin-overview",
          component: AdminOverviewPage,
          meta: { requiresAuth: true, requiresAdmin: true, title: "管理后台" }
        },
        {
          path: "admin/official-models",
          name: "admin-official-models",
          component: AdminOfficialModelsPage,
          meta: { requiresAuth: true, requiresAdmin: true, title: "官方模型管理" }
        },
        {
          path: "admin/reviews",
          name: "admin-reviews",
          component: AdminReviewCenterPage,
          meta: { requiresAuth: true, requiresAdmin: true, title: "审核中心" }
        }
      ]
    },
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: NotFoundPage,
      meta: { title: "页面不存在" }
    }
  ]
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore(pinia);
  await authStore.bootstrap();

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return { path: "/app/home" };
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return {
      name: "login",
      query: { redirect: to.fullPath }
    };
  }

  if (to.meta.requiresAdmin && (!authStore.currentUser || !authStore.isAdmin)) {
    return { path: "/app/home" };
  }

  if (to.meta.requiresOwner && (!authStore.currentUser || !authStore.isOwner)) {
    return { path: "/app/home" };
  }

  if (typeof to.meta.title === "string") {
    document.title = `${to.meta.title} · EnjoyAgent`;
  } else {
    document.title = "EnjoyAgent";
  }

  return true;
});

export default router;
