import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, RefreshCw, Loader2, AlertTriangle, X } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCryptoWallet } from "@/hooks/useCryptoWallet";

interface OrderData {
  order_id: string;
  amount: string | number;
  address: string;
  currency: string;
  network: string;
  expires_at?: string;
  fee_on_success?: string;
  instruction?: string;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const CryptoTopUp = () => {
  const { toast } = useToast();
  const { balance, refresh } = useCryptoWallet();
  const [walletAmount, setWalletAmount] = useState("");
  const [creating, setCreating] = useState(false);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [txHash, setTxHash] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState<"pending" | "confirming" | "success" | "failed">("pending");
  const [secondsLeft, setSecondsLeft] = useState(0);

  // countdown
  useEffect(() => {
    if (!order?.expires_at) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(order.expires_at!).getTime() - Date.now()) / 1000));
      setSecondsLeft(diff);
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [order?.expires_at]);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: label });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const handleCreate = async () => {
    const amount = Number(walletAmount);
    if (!Number.isFinite(amount) || amount < 1) {
      toast({ title: "Minimum is 1 USDT", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("crypto-gateway", {
        body: { action: "create_order", amount },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to create order");
      setOrder(data.data);
      setStatus("pending");
      setTxHash("");
    } catch (e) {
      toast({
        title: "Order failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleVerify = async () => {
    if (!order || !txHash.trim()) {
      toast({ title: "Enter transaction hash", variant: "destructive" });
      return;
    }
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("crypto-gateway", {
        body: { action: "verify_tx", order_id: order.order_id, tx_hash: txHash.trim() },
      });
      if (error) throw error;
      if (data?.success) {
        setStatus("success");
        toast({ title: "Wallet credited successfully.", description: `+${Number(data.credited ?? 0).toFixed(4)} USDT added.` });
        await refresh();
      } else if (data?.confirming) {
        setStatus("confirming");
        toast({ title: "Waiting for confirmations", description: data?.message ?? "Network confirming…" });
      } else {
        setStatus("failed");
        toast({ title: "Verification failed", description: data?.error ?? "Try again later", variant: "destructive" });
      }
    } catch (e) {
      toast({
        title: "Verification error",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!order) return;
    const { data } = await supabase.functions.invoke("crypto-gateway", {
      body: { action: "get_order", order_id: order.order_id },
    });
    const s = data?.data?.status;
    if (s === "success") { setStatus("success"); refresh(); }
    else if (s === "failed") setStatus("failed");
    else if (s === "confirming") setStatus("confirming");
    toast({ title: "Refreshed", description: `Status: ${s ?? "pending"}` });
  };

  const statusBadge = {
    pending: <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">PENDING</Badge>,
    confirming: <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">CONFIRMING</Badge>,
    success: <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">SUCCESS</Badge>,
    failed: <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">FAILED</Badge>,
  }[status];

  return (
    <div className="space-y-4">
      {/* Card 1: Top Up */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Crypto Wallet Top Up</CardTitle>
          <p className="text-xs text-muted-foreground">Deposit using USDT on BEP20 (BSC) only.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between bg-secondary/40 border border-border rounded-lg p-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Current Wallet Balance</p>
              <p className="font-display text-2xl font-bold">{balance.toFixed(4)}</p>
            </div>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
            </Button>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex gap-2 text-xs text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Send <b>only USDT via BEP20 (BSC)</b>. Do not use TRC20, ERC20, or any other network.
              Sending wrong network or address — we are not responsible.
            </p>
          </div>

          <div>
            <Label htmlFor="cryptoAmount" className="text-sm">Enter amount to add to wallet</Label>
            <div className="mt-2 flex gap-2">
              <Input
                id="cryptoAmount"
                type="number"
                step="0.0001"
                placeholder="Enter amount"
                value={walletAmount}
                onChange={(e) => setWalletAmount(e.target.value)}
                disabled={creating}
              />
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Order"}
              </Button>
            </div>
          </div>

          {!order && (
            <div className="text-center text-xs text-muted-foreground bg-secondary/30 border border-dashed border-border rounded-lg p-3">
              Create an order to get the exact payable amount, deposit address, and QR code.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 2: Payment Details */}
      {order && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Payment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Order ID" value={order.order_id} onCopy={() => copy(order.order_id, "Order ID")} mono />
                <Field label="Wallet Amount" value={walletAmount} />
                <Field
                  label="Pay Exact Amount"
                  value={`${order.amount} USDT`}
                  highlight
                  onCopy={() => copy(String(order.amount), "Amount")}
                />
                <Field label="Network" value={order.network} />
                <div className="sm:col-span-2">
                  <Field
                    label="Deposit Address"
                    value={order.address}
                    onCopy={() => copy(order.address, "Address")}
                    mono
                  />
                </div>
              </div>
              <div className="bg-secondary/30 border border-border rounded-lg p-3 flex flex-col items-center justify-center">
                <p className="text-xs text-muted-foreground uppercase mb-2">Scan QR</p>
                <div className="bg-white p-2 rounded-md">
                  <QRCodeCanvas value={order.address} size={130} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                  Scan to get deposit address quickly
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs bg-secondary/30 border border-border rounded-lg p-3">
              Send exactly <b className="text-green-500">{order.amount} USDT</b> to the above address using{" "}
              <b>{order.network}</b>. After payment, paste your transaction hash below and verify.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Card 3: TX Hash + Status */}
      {order && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label htmlFor="txhash">Transaction Hash</Label>
              <div className="mt-2 flex gap-2">
                <Input
                  id="txhash"
                  placeholder="Enter transaction hash (0x...)"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  disabled={verifying || status === "success"}
                />
                <Button onClick={handleVerify} disabled={verifying || status === "success"}>
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Hash"}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-secondary/40 border border-border rounded-lg p-4">
              <div>
                <p className="font-display font-bold mb-2">Payment Status</p>
                {statusBadge}
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleRefreshStatus}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh Status
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => { setOrder(null); setStatus("pending"); }}>
                    <X className="w-3.5 h-3.5 mr-1.5" /> Cancel View
                  </Button>
                </div>
              </div>
              {order.expires_at && (
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase">Expires In</p>
                  <p className="font-display text-2xl font-bold">{fmt(secondsLeft)}</p>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground bg-secondary/30 border border-border rounded-lg p-3">
              After payment, submit your transaction hash. The server will verify it and update the payment status.
            </p>
            <p className="text-xs text-yellow-500/90 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              If you send the wrong amount or wrong network, wallet credit may fail — we are not responsible for asset losses.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const Field = ({
  label, value, onCopy, mono, highlight,
}: { label: string; value: string; onCopy?: () => void; mono?: boolean; highlight?: boolean }) => (
  <div className="bg-secondary/30 border border-border rounded-lg p-3 flex items-center justify-between gap-2 min-w-0">
    <div className="min-w-0">
      <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
      <p className={`truncate ${mono ? "font-mono text-xs" : "text-sm"} ${highlight ? "text-green-500 font-bold" : ""}`}>
        {value}
      </p>
    </div>
    {onCopy && (
      <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={onCopy}>
        <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
      </Button>
    )}
  </div>
);

export default CryptoTopUp;
