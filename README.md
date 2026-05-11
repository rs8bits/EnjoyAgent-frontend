# EnjoyAgent Frontend

![Vue 3](https://img.shields.io/badge/Vue-3-42b883)
![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue)
![Vite](https://img.shields.io/badge/Vite-5-646cff)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-enabled-38bdf8)
![Vue Flow](https://img.shields.io/badge/Vue%20Flow-workflow-orange)

EnjoyAgent Frontend 是 EnjoyAgent 多租户 AI Agent 平台的用户工作台和管理后台。它不是一组静态后台页面，而是一套已经接入真实后端接口的 AI 产品界面：可以创建 Agent、管理知识库、接入 MCP 工具、搭建 Workflow、发起真实聊天、查看钱包扣费、提交共享市场资产，并由管理员完成审核。

如果你想看一个接近 Dify / Coze / 扣子工作流风格的开源 AI 工作台前端，这个仓库会很适合参考。

## 项目亮点

- **真实 Agent 工作台**：支持 Agent 管理、会话管理、SSE 流式聊天、知识检索命中、工具调用轨迹和本轮模型调用信息。
- **可视化 Workflow Builder**：基于 Vue Flow 实现节点拖拽、节点配置、连线保存、工作流测试运行和执行历史查看。
- **知识库闭环**：可以创建知识库、上传文档、查看文档状态，并把知识库绑定到 Agent。
- **MCP 工具管理**：支持 MCP Server 配置、工具同步、OAuth 授权状态、Agent Tool 绑定和工具调用日志。
- **钱包与计费体验**：展示余额、钱包流水、充值单和官方模型 token 扣费记录。
- **共享市场**：支持浏览市场资产、提交 Agent / 知识库 / MCP Server / Workflow、安装资产并查看安装结果。
- **管理员后台**：支持官方模型管理、充值审核、用户钱包调账和市场资产审核。
- **轻 SaaS 视觉风格**：整体偏 Dify 风格，明亮、圆润、干净，不走传统重后台模板。

## 产品截图

### 聊天工作台

![EnjoyAgent chat workspace](docs/images/chat-workspace.png)

### 可视化工作流

![EnjoyAgent workflow canvas](docs/images/workflow-canvas.png)

### 钱包中心

![EnjoyAgent wallet center](docs/images/wallet-center.png)

## 当前已完成页面

```text
/login
/register
/app/home
/app/credentials
/app/model-configs
/app/official-models
/app/agents
/app/knowledge
/app/chat/workspace
/app/mcp
/app/workflows
/app/workflows/:id
/app/wallet
/app/market
/app/admin/overview
/app/admin/official-models
/app/admin/reviews
```

## 核心功能

### 用户工作台

- 登录、注册、退出登录
- 当前用户与租户信息展示
- 凭证管理
- 用户模型配置
- 官方模型查看
- Agent 创建、编辑、删除
- Agent 绑定知识库和工作流
- 知识库创建、编辑、文档上传和重建索引
- MCP Server 创建、编辑、同步工具和 OAuth 授权
- 钱包余额、流水、充值单
- 共享市场浏览、提交和安装

### 聊天工作台

- 会话列表
- 新建会话和删除会话
- 历史消息加载
- SSE 流式输出
- 当前模型来源、模型名称、token、耗时展示
- RAG 命中文档展示
- MCP Tool 调用轨迹展示

### Workflow Builder

- 节点面板
- 节点拖拽
- 节点连线
- 连线持久化保存
- 节点属性配置
- LLM / Knowledge / Tool / Condition / Loop / End 节点
- 测试当前草稿工作流
- 执行事件和历史记录展示

### 管理后台

- 官方模型托管凭证管理
- 官方模型配置管理
- 充值单审核
- 市场资产审核
- 市场资产下架
- 用户钱包人工调账
- 管理概览数据

## 技术栈

- Vue 3
- TypeScript
- Vite
- Vue Router
- Pinia
- Axios
- Tailwind CSS
- Vue Flow
- Lucide Vue Next
- VueUse

## 快速启动

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

默认会通过 Vite 代理访问后端 API。请先确保 EnjoyAgent Backend 已经在本地启动。

### 3. 启动开发服务器

```bash
npm run dev
```

默认地址：

```text
http://localhost:5173
```

### 4. 类型检查与构建

```bash
npm run typecheck
npm run build
```

## 推荐体验路径

1. 注册用户并登录
2. 创建凭证和模型配置
3. 创建 Agent
4. 创建知识库并上传文档
5. 在聊天工作台发起 RAG 对话
6. 配置 MCP Server 并绑定工具
7. 创建 Workflow 并测试运行
8. 进入共享市场提交工作流或 Agent
9. 使用管理员账号审核市场资产和充值单

## 待开发路线图

- **更完整的 Workflow 体验**：节点运行状态高亮、变量面板、节点配置校验、失败节点定位和调试断点。
- **市场产品化**：资产预览、依赖检查、版本升级、安装后跳转、搜索、收藏和评分。
- **管理员用户管理**：用户列表、禁用用户、角色调整、审核日志和操作审计。
- **端到端测试**：覆盖创建 Agent、RAG 聊天、MCP 调用、工作流保存、市场审核和安装。
- **体验统一**：空状态、错误态、骨架屏、表单校验、分页筛选和移动端适配。
- **数据看板**：模型调用趋势、token 消耗、市场安装量、充值审核量和工具调用统计。

## 相关文档

- [UI-STYLE.md](./UI-STYLE.md)：视觉风格和设计系统说明
- [plan.md](./plan.md)：前端功能状态和路线图

## 为什么值得 Star

EnjoyAgent Frontend 把 AI 产品里最常见但也最难串起来的体验放到了一起：聊天、RAG、工具、Workflow、市场、钱包和管理员审核。它适合当作 AI SaaS 工作台、Agent Builder、企业知识库平台或 MCP 工具平台的前端参考。
