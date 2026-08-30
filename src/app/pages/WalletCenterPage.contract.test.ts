import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatDecimalString } from "@/app/utils/decimal";

const walletCenterSource = readFileSync(
  new URL("./WalletCenterPage.vue", import.meta.url),
  "utf8"
);

describe("WalletCenterPage money precision contract", () => {
  it("routes wallet balances and transaction amounts through adaptive decimal formatting", () => {
    expect(walletCenterSource).toContain("{{ formatMoney(wallet.balance) }}");
    expect(walletCenterSource).toContain("{{ signedMoney(transaction.amountDelta) }}");
    expect(walletCenterSource).toContain("formatMoney(transaction.balanceAfter)");
    expect(walletCenterSource).toContain("return formatDecimalString(value);");
    expect(walletCenterSource).toContain("formatDecimalString(amount)");
  });

  it("keeps the observed micro-balance and debit visible without harming recharge display", () => {
    expect(formatDecimalString("0.009511")).toBe("0.009511");
    expect(formatDecimalString("-0.000489")).toBe("-0.000489");
    expect(formatDecimalString("50.000000")).toBe("50.00");
  });
});
