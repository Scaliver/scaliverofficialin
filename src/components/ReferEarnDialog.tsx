import { useMemo, useState } from "react";
import { ArrowLeft, Copy, Check, Share2 } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import referImg from "@/assets/refer-earn.png";

interface ReferEarnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const generateCode = (id?: string) => {
  if (!id) return "GUEST0";
  // Deterministic 6-char alphanumeric code derived from user id
  const clean = id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return (clean.slice(0, 3) + clean.slice(-3)).slice(0, 6) || "USER01";
};

const ReferEarnDialog = ({ open, onOpenChange }: ReferEarnDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const code = useMemo(() => generateCode(user?.id), [user?.id]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast({ title: "Copied!", description: `Refer code ${code} copied to clipboard.` });
    setTimeout(() => setCopied(false), 1800);
  };

  const handleInvite = async () => {
    const shareText = `Join Scaliver Official and get instant game top-ups! Use my refer code: ${code} — https://scaliverofficial.in`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Scaliver Official — Refer & Earn", text: shareText });
        return;
      } catch { /* user cancelled */ }
    }
    await navigator.clipboard.writeText(shareText);
    toast({ title: "Invite copied", description: "Share text copied to clipboard." });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-sm p-0 rounded-2xl overflow-hidden bg-card border-border">
        <div className="relative">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-3 left-3 z-10 w-9 h-9 rounded-lg bg-background/90 border border-border flex items-center justify-center hover:bg-background"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <DialogTitle className="pt-4 pb-2 text-center font-display text-lg font-bold text-foreground">
            Refer &amp; Earn
          </DialogTitle>
          <DialogDescription className="sr-only">
            Invite friends to Scaliver Official and earn cashback when they top up.
          </DialogDescription>
        </div>

        <div className="px-5 pb-5 space-y-4">
          <div className="rounded-xl bg-secondary/40 p-3 flex items-center justify-center">
            <img
              src={referImg}
              alt="Refer a friend illustration"
              loading="lazy"
              width={400}
              height={400}
              className="w-full max-w-[220px] h-auto object-contain"
            />
          </div>

          <h3 className="text-center font-display text-2xl font-bold text-foreground">
            Earn ₹10
          </h3>

          <div className="relative rounded-lg bg-secondary border-l-4 border-primary px-4 py-3 flex items-center justify-between">
            <span className="font-display text-sm font-semibold text-foreground">
              Refer code — <span className="text-primary">{code}</span>
            </span>
            <button
              onClick={handleCopy}
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="Copy code"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground leading-relaxed">
            Invite your friends to join Scaliver Official and earn <span className="text-foreground font-semibold">₹10 cashback</span> when they add their first ₹200 worth of coins to their account.
          </p>

          <Button
            onClick={handleInvite}
            className="w-full h-11 rounded-xl font-display font-bold text-base bg-gradient-to-r from-primary via-accent to-primary text-primary-foreground hover:opacity-95"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Invite Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReferEarnDialog;
