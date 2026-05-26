import { useRef } from "react";
import { Download, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TransactionReceiptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: {
    orderId: string;
    productName: string;
    amount: string;
    price: number;
    userId: string;
    zoneId?: string;
    contactNumber: string;
    transactionDate: string;
    paymentMethod: string;
  } | null;
}

const TransactionReceipt = ({ open, onOpenChange, receipt }: TransactionReceiptProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!receipt) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      time: date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
    };
  };

  const { date, time } = formatDate(receipt.transactionDate);

  const handleDownload = () => {
    const printContent = `SCALIVER OFFICIAL - RECEIPT\nOrder: ${receipt.orderId.slice(0, 8).toUpperCase()}\nDate: ${date} ${time}\nProduct: ${receipt.productName}\nPack: ${receipt.amount}\nPlayer: ${receipt.userId}${receipt.zoneId ? ` / ${receipt.zoneId}` : ""}\nAmount: ₹${receipt.price.toFixed(2)}\nMethod: ${receipt.paymentMethod}\n\nThank you!`;
    const blob = new Blob([printContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${receipt.orderId.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-sm sm:max-w-md p-4 sm:p-6 rounded-xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="font-display text-base sm:text-xl flex items-center gap-2">
            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
            Payment Successful
          </DialogTitle>
        </DialogHeader>

        <div ref={receiptRef} className="space-y-3 py-2 sm:py-4 text-xs sm:text-sm">
          <div className="text-center border-b border-border pb-2 sm:pb-3">
            <h2 className="font-display text-sm sm:text-lg font-bold text-foreground">SCALIVER OFFICIAL</h2>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Transaction Receipt</p>
          </div>

          <div className="flex justify-between items-center bg-secondary/30 rounded-lg p-2 sm:p-3">
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Order ID</p>
              <p className="font-mono font-bold text-foreground text-xs sm:text-sm">{receipt.orderId.slice(0, 8).toUpperCase()}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] sm:text-xs text-muted-foreground">{date}</p>
              <p className="text-[10px] sm:text-xs text-foreground">{time}</p>
            </div>
          </div>

          <div className="bg-secondary/30 rounded-lg p-2 sm:p-3 space-y-1.5">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Product</span>
              <span className="text-foreground text-right truncate">{receipt.productName}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Pack</span>
              <span className="text-foreground text-right">{receipt.amount}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Player ID</span>
              <span className="text-foreground text-right truncate">{receipt.userId}</span>
            </div>
            {receipt.zoneId && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Zone</span>
                <span className="text-foreground text-right">{receipt.zoneId}</span>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Method</span>
              <span className="text-foreground text-right">{receipt.paymentMethod}</span>
            </div>
          </div>

          <div className="flex justify-between items-center bg-primary/10 rounded-lg p-2.5 sm:p-3">
            <span className="font-display font-bold text-foreground text-sm">Amount Paid</span>
            <span className="font-display text-lg sm:text-xl font-bold text-primary">₹{receipt.price.toFixed(2)}</span>
          </div>

          <Button onClick={handleDownload} className="w-full gap-2 h-9 text-xs sm:text-sm" variant="outline" size="sm">
            <Download className="w-3.5 h-3.5" />
            Download Receipt
          </Button>

          <p className="text-center text-[10px] sm:text-xs text-muted-foreground">
            Redirecting to your orders…
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionReceipt;
