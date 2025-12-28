import { useRef } from "react";
import { Download, X, CheckCircle } from "lucide-react";
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
      date: date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  const { date, time } = formatDate(receipt.transactionDate);

  const handleDownload = () => {
    if (!receiptRef.current) return;

    // Create a printable version
    const printContent = `
      SCALIVER OFFICIAL - TRANSACTION RECEIPT
      ========================================
      
      Order ID: ${receipt.orderId.slice(0, 8).toUpperCase()}
      Date: ${date}
      Time: ${time}
      
      PRODUCT DETAILS
      ---------------
      Product: ${receipt.productName}
      Pack: ${receipt.amount}
      
      PLAYER DETAILS
      --------------
      Player ID: ${receipt.userId}
      ${receipt.zoneId ? `Zone/Server: ${receipt.zoneId}` : ""}
      Contact: ${receipt.contactNumber}
      
      PAYMENT
      -------
      Method: ${receipt.paymentMethod}
      Amount Paid: ₹${receipt.price.toFixed(2)}
      
      ========================================
      Thank you for your purchase!
      For support, contact us on WhatsApp.
    `;

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-500" />
            Payment Successful
          </DialogTitle>
        </DialogHeader>

        <div ref={receiptRef} className="space-y-4 py-4">
          {/* Receipt Header */}
          <div className="text-center border-b border-border pb-4">
            <h2 className="font-display text-lg font-bold text-foreground">SCALIVER OFFICIAL</h2>
            <p className="font-body text-sm text-muted-foreground">Transaction Receipt</p>
          </div>

          {/* Order ID & Date */}
          <div className="flex justify-between items-center bg-secondary/30 rounded-lg p-3">
            <div>
              <p className="text-xs text-muted-foreground">Order ID</p>
              <p className="font-mono font-bold text-foreground">{receipt.orderId.slice(0, 8).toUpperCase()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Date & Time</p>
              <p className="font-body text-sm text-foreground">{date}</p>
              <p className="font-body text-xs text-muted-foreground">{time}</p>
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-2">
            <h3 className="font-display text-sm font-bold text-foreground">Product Details</h3>
            <div className="bg-secondary/30 rounded-lg p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Product</span>
                <span className="font-body text-foreground text-sm">{receipt.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Pack</span>
                <span className="font-body text-foreground text-sm">{receipt.amount}</span>
              </div>
            </div>
          </div>

          {/* Player Details */}
          <div className="space-y-2">
            <h3 className="font-display text-sm font-bold text-foreground">Player Details</h3>
            <div className="bg-secondary/30 rounded-lg p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Player ID</span>
                <span className="font-body text-foreground text-sm">{receipt.userId}</span>
              </div>
              {receipt.zoneId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Zone/Server</span>
                  <span className="font-body text-foreground text-sm">{receipt.zoneId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Contact</span>
                <span className="font-body text-foreground text-sm">{receipt.contactNumber}</span>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="border-t border-border pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground">Payment Method</span>
              <span className="font-body text-foreground">{receipt.paymentMethod}</span>
            </div>
            <div className="flex justify-between items-center bg-primary/10 rounded-lg p-3">
              <span className="font-display font-bold text-foreground">Amount Paid</span>
              <span className="font-display text-xl font-bold text-primary">₹{receipt.price.toFixed(2)}</span>
            </div>
          </div>

          {/* Download Button */}
          <Button onClick={handleDownload} className="w-full gap-2" variant="outline">
            <Download className="w-4 h-4" />
            Download Receipt
          </Button>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground">
            Thank you for your purchase! Your order is being processed.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionReceipt;
