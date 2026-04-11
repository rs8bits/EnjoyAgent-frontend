export type WalletStatus = "ACTIVE" | "DISABLED" | string;
export type WalletTransactionType = "RECHARGE_APPROVED" | "MODEL_USAGE_DEBIT" | "MANUAL_ADJUST" | string;
export type RechargeOrderStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | string;

export interface UserWallet {
  userId: number;
  balance: string | number;
  currency: string;
  status: WalletStatus;
  updatedAt: string;
}

export interface UserWalletTransaction {
  id: number;
  transactionType: WalletTransactionType;
  amountDelta: string | number;
  balanceAfter: string | number;
  currency: string;
  referenceType: string | null;
  referenceId: number | null;
  description: string | null;
  createdAt: string;
}

export interface RechargeOrder {
  id: number;
  userId: number;
  userEmail: string;
  userDisplayName: string | null;
  amount: string | number;
  currency: string;
  status: RechargeOrderStatus;
  remark: string | null;
  reviewedBy: number | null;
  reviewedAt: string | null;
  reviewRemark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRechargeOrderPayload {
  amount: number;
  remark?: string;
}
