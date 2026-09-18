"use client";
import { Card } from "@/components/app/ui";
import { useToast } from "@/components/ui/Toast";

type FundWallet = {
  dvaAccountNumber?: string;
  dvaBankName?: string;
  dvaStatus?: "pending" | "active" | "failed";
};

export function WalletFundCard({ wallet }: { wallet: FundWallet | undefined }) {
  const toast = useToast();
  const status = wallet?.dvaStatus;

  async function copy(v: string) {
    await navigator.clipboard.writeText(v);
    toast.success("Account number copied");
  }

  return (
    <Card className="p-5">
      <h3 className="font-display text-lg text-foundation-700">Add money</h3>
      {!status && (
        <p className="mt-2 text-sm text-ink-muted">Wallet funding is coming soon.</p>
      )}
      {status === "pending" && (
        <p className="mt-2 text-sm text-ink-muted">
          We&apos;re setting up your funding account. This usually takes a moment.
        </p>
      )}
      {status === "failed" && (
        <p className="mt-2 text-sm text-red-600">
          We couldn&apos;t set up your funding account. Please contact support.
        </p>
      )}
      {status === "active" && wallet?.dvaAccountNumber && (
        <>
          <p className="mt-2 text-sm text-ink-muted">
            Transfer to this account from any bank. Your wallet is credited automatically.
          </p>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-foundation-700/10 p-4">
            <div>
              <div className="text-xs text-ink-muted">{wallet.dvaBankName ?? "Bank"}</div>
              <div className="font-amount text-2xl font-bold tracking-wide text-foundation-700">
                {wallet.dvaAccountNumber}
              </div>
            </div>
            <button
              type="button"
              onClick={() => copy(wallet.dvaAccountNumber!)}
              className="rounded-lg border border-foundation-700/15 px-3 py-2 text-sm font-semibold text-foundation-700 hover:bg-paper"
            >
              Copy
            </button>
          </div>
        </>
      )}
    </Card>
  );
}
