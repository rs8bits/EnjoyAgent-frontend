/**
 * 当前登录用户在当前租户中的唯一客服会话。
 *
 * 会话由后端按 `tenantId + userId` 原子创建或复用，前端不能传入这两个字段来
 * 选择别人的会话；这里保留它们仅用于展示和校验服务端响应是否属于当前上下文。
 */
export interface SupportConversation {
  id: number;
  tenantId: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
  lastMessageSequence: number;
}

/** 客服消息使用单调递增 sequence，避免无限历史依赖易漂移的页码。 */
export interface SupportMessage {
  id: number;
  conversationId: number;
  turnId: string | null;
  sequence: number;
  role: "USER" | "ASSISTANT" | "SYSTEM" | string;
  content: string;
  createdAt: string;
}

/**
 * 历史消息采用向前游标：下一次请求把 nextBeforeSequence 原样传回后端。
 * items 可以由后端按任意方向返回，页面合并时仍会按 sequence 重新排序。
 */
export interface SupportMessageSlice {
  items: SupportMessage[];
  hasMore: boolean;
  nextBeforeSequence: number | null;
}

export interface SendSupportMessagePayload {
  content: string;
}

/** 服务端已经持久化用户消息，后续事件都以 turnId 关联本轮执行。 */
export interface SupportAcceptedEvent {
  conversationId: number;
  turnId: string;
  userMessage: SupportMessage;
}

/** 规则、skill 或 LLM 路由的可观测结果；不包含模型内部推理文本。 */
export interface SupportIntentRoutedEvent {
  turnId: string;
  intent: string;
  route: "RULE" | "SKILL" | "LLM" | string;
  displayName?: string | null;
}

/** 一次 skill 调用的开始事件，callId 在同一个 turn 内必须唯一。 */
export interface SupportSkillStartedEvent {
  turnId: string;
  callId: string;
  skillName: string;
  displayName?: string | null;
  startedAt?: string | null;
}

/**
 * skill 完成事件只向浏览器返回安全摘要，不返回完整工具请求或原始响应。
 * 完整审计信息应由后端在受控存储中归档。
 */
export interface SupportSkillCompletedEvent {
  turnId: string;
  callId: string;
  skillName: string;
  displayName?: string | null;
  status: "SUCCESS" | "FAILED" | string;
  summary?: string | null;
  durationMs?: number | null;
}

export interface SupportDeltaEvent {
  turnId: string;
  delta: string;
}

export interface SupportCompletedEvent {
  turnId: string;
  assistantMessage: SupportMessage;
}

/**
 * 写操作在真正执行前由后端生成的确认信息。
 *
 * 这里有意不包含 Skill 的原始参数：浏览器只需要展示经过后端安全处理的标题、
 * 摘要和过期时间。真正执行时只提交 confirmationId，防止前端篡改资源 ID、
 * 充值金额或租户身份等敏感参数。
 */
export interface SupportConfirmationRequiredEvent {
  turnId: string;
  confirmationId: string;
  skillName: string;
  title: string;
  summary: string;
  expiresAt: string;
}

/**
 * 确认或取消操作后的安全响应。
 *
 * 写操作可能同时产生一条“用户确认”消息和一条客服结果消息；它们都已经由
 * 服务端持久化，页面只负责按 sequence 合并，不能在浏览器中伪造正式消息。
 */
export interface SupportConfirmationActionResult {
  confirmationId: string;
  status: string;
  userMessage?: SupportMessage | null;
  assistantMessage?: SupportMessage | null;
  message?: string | null;
}

/** message 必须是服务端已经安全处理、可以直接展示给终端用户的文案。 */
export interface SupportErrorEvent {
  turnId?: string | null;
  code: string;
  message: string;
  retryable?: boolean;
}
