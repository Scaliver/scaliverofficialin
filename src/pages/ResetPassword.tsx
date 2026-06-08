import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, KeyRound, Mail, CheckCircle, Eye, EyeOff } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { validatePasswordStrength, getStrengthBarColor, getStrengthBarWidth } from "@/lib/passwordValidation";

type Mode = "request" | "update";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);

  // Detect password-recovery session from URL hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      setMode("update");
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("update");
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
      return;
    }
    setSent(true);
    toast({ title: "Email sent", description: "Check your inbox for the password reset link." });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const pw = validatePasswordStrength(password);
    if (!pw.isValid) {
      toast({ title: "Weak password", description: pw.errors[0], variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords match.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    setDone(true);
    toast({ title: "Password updated", description: "You can now sign in with your new password." });
    setTimeout(() => navigate("/auth"), 1500);
  };

  const pwValidation = password ? validatePasswordStrength(password) : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Reset Password | Scaliver Official</title>
        <meta name="description" content="Reset your Scaliver Official account password securely." />
        <link rel="canonical" href="https://scaliverofficial.in/reset-password" />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <header className="border-b border-border/50 bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center">
          <Button variant="ghost" onClick={() => navigate("/auth")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl p-8">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
              {mode === "update" ? <KeyRound className="w-8 h-8 text-primary" /> : <Mail className="w-8 h-8 text-primary" />}
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground text-center mb-2">
              {mode === "update" ? "Set New Password" : "Forgot Password?"}
            </h1>
            <p className="font-body text-muted-foreground text-center mb-6">
              {mode === "update"
                ? "Enter your new password below."
                : "Enter your email and we'll send you a reset link."}
            </p>

            {mode === "request" && !sent && (
              <form onSubmit={handleRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-secondary border-border"
                    autoComplete="email"
                    required
                  />
                </div>
                <Button type="submit" variant="gaming" className="w-full py-6" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            )}

            {mode === "request" && sent && (
              <div className="text-center space-y-4">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
                <p className="text-muted-foreground">
                  If an account exists for <span className="text-primary font-semibold">{email}</span>, a reset link has been sent. Check your inbox and spam folder.
                </p>
                <Button variant="outline" className="w-full" onClick={() => navigate("/auth")}>
                  Back to Login
                </Button>
              </div>
            )}

            {mode === "update" && !done && (
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-secondary border-border pr-10"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {pwValidation && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full transition-all ${getStrengthBarColor(pwValidation.strength)} ${getStrengthBarWidth(pwValidation.strength)}`} />
                      </div>
                      <span className="text-xs capitalize text-muted-foreground">{pwValidation.strength}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-secondary border-border"
                    autoComplete="new-password"
                    required
                  />
                </div>
                <Button type="submit" variant="gaming" className="w-full py-6" disabled={loading}>
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            )}

            {mode === "update" && done && (
              <div className="text-center space-y-4">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
                <p className="text-muted-foreground">Password updated successfully. Redirecting to login…</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;
