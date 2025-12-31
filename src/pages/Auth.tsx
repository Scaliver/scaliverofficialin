import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Eye, EyeOff, LogIn, UserPlus, ArrowLeft, Mail, CheckCircle, RefreshCw, Phone, Smartphone, Shield, Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Separator } from "@/components/ui/separator";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must be less than 50 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").max(15, "Phone number is too long").regex(/^[0-9+\-\s]+$/, "Please enter a valid phone number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const phoneSignupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be less than 20 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").max(15, "Phone number is too long").regex(/^[0-9+\-\s]+$/, "Please enter a valid phone number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AuthMode = "login" | "signup" | "phone-signup";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, signUp, signIn, signOut, isLoading: authLoading } = useAuth();
  
  const [authMode, setAuthMode] = useState<AuthMode>(searchParams.get("signup") ? "signup" : "login");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [showPhoneSignupOTP, setShowPhoneSignupOTP] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpCode, setOtpCode] = useState("");
  const [twoFACode, setTwoFACode] = useState("");
  const [phoneSignupOTP, setPhoneSignupOTP] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState("");
  const [pending2FAUserId, setPending2FAUserId] = useState<string | null>(null);
  const [userPhone, setUserPhone] = useState("");
  
  const [formData, setFormData] = useState({
    displayName: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle signup query param
  useEffect(() => {
    if (searchParams.get("signup") === "true") {
      setAuthMode("signup");
    }
  }, [searchParams]);

  // Redirect if already logged in and not in 2FA flow
  useEffect(() => {
    if (user && !authLoading && !show2FA) {
      navigate("/");
    }
  }, [user, authLoading, navigate, show2FA]);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;
    
    setResendingEmail(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email,
      });

      if (error) throw error;

      toast({
        title: "Email Sent!",
        description: "A new verification email has been sent to your inbox.",
      });
      setResendCooldown(60);
    } catch (error: any) {
      toast({
        title: "Failed to Resend",
        description: error.message || "Could not resend verification email.",
        variant: "destructive",
      });
    } finally {
      setResendingEmail(false);
    }
  };

  const handleSendOtp = async () => {
    if (!user) {
      toast({
        title: "Not Logged In",
        description: "Please login first to verify your phone number.",
        variant: "destructive",
      });
      return;
    }

    setSendingOtp(true);
    try {
      const response = await supabase.functions.invoke("sms-otp/send", {
        body: {
          phone: formData.phone,
          userId: user.id,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to send OTP");
      }

      setOtpSent(true);
      setResendCooldown(60);
      toast({
        title: "OTP Sent!",
        description: `Verification code sent to ${formData.phone}`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to Send OTP",
        description: error.message || "Could not send verification code.",
        variant: "destructive",
      });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!user || otpCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    setVerifyingOtp(true);
    try {
      const response = await supabase.functions.invoke("sms-otp/verify", {
        body: {
          phone: formData.phone,
          otp: otpCode,
          userId: user.id,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Invalid or expired code");
      }

      setPhoneVerified(true);
      toast({
        title: "Phone Verified!",
        description: "Your phone number has been verified. 2FA is now enabled.",
      });
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid or expired verification code.",
        variant: "destructive",
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSend2FA = async (userId: string) => {
    setSendingOtp(true);
    try {
      const response = await supabase.functions.invoke("sms-otp/send-2fa", {
        body: { userId },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to send 2FA code");
      }

      const data = response.data;
      setMaskedPhone(data.maskedPhone);
      setUserPhone(data.phone);
      setResendCooldown(60);
      toast({
        title: "2FA Code Sent!",
        description: `Verification code sent to ${data.maskedPhone}`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to Send 2FA Code",
        description: error.message || "Could not send verification code.",
        variant: "destructive",
      });
      // Sign out if we can't send 2FA
      await signOut();
      setShow2FA(false);
      setPending2FAUserId(null);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!pending2FAUserId || twoFACode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    setVerifyingOtp(true);
    try {
      const response = await supabase.functions.invoke("sms-otp/verify-2fa", {
        body: {
          otp: twoFACode,
          userId: pending2FAUserId,
        },
      });

      if (response.error || !response.data?.success) {
        throw new Error(response.error?.message || response.data?.error || "Invalid code");
      }

      toast({
        title: "Welcome back!",
        description: "2FA verification successful.",
      });
      setShow2FA(false);
      setPending2FAUserId(null);
      navigate("/");
    } catch (error: any) {
      toast({
        title: "2FA Failed",
        description: error.message || "Invalid or expired verification code.",
        variant: "destructive",
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleCancel2FA = async () => {
    await signOut();
    setShow2FA(false);
    setPending2FAUserId(null);
    setTwoFACode("");
    toast({
      title: "Login Cancelled",
      description: "You've been signed out.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      if (authMode === "login") {
        const result = loginSchema.safeParse({
          email: formData.email,
          password: formData.password,
        });

        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        const { error } = await signIn(formData.email, formData.password);
        
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Login Failed",
              description: "Invalid email or password. Please try again.",
              variant: "destructive",
            });
          } else if (error.message.includes("Email not confirmed")) {
            toast({
              title: "Email Not Verified",
              description: "Please check your email and click the verification link.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Login Failed",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          // Check if user has 2FA enabled
          const { data: { user: loggedInUser } } = await supabase.auth.getUser();
          
          if (loggedInUser) {
            const check2FAResponse = await supabase.functions.invoke("sms-otp/check-2fa", {
              body: { userId: loggedInUser.id },
            });

            if (check2FAResponse.data?.has2FA) {
              // User has 2FA enabled, show 2FA screen
              setPending2FAUserId(loggedInUser.id);
              setShow2FA(true);
              await handleSend2FA(loggedInUser.id);
            } else {
              // No 2FA, proceed to home
              toast({
                title: "Welcome back!",
                description: "You have successfully logged in.",
              });
              navigate("/");
            }
          }
        }
      } else if (authMode === "signup") {
        const result = signupSchema.safeParse(formData);

        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(formData.email, formData.password, formData.displayName, formData.phone);
        
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Account Exists",
              description: "This email is already registered. Please login instead.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Signup Failed",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          setShowVerificationMessage(true);
          toast({
            title: "Verification Email Sent!",
            description: "Please check your email to verify your account.",
          });
        }
      } else if (authMode === "phone-signup") {
        // Phone signup - validate and send OTP
        const result = phoneSignupSchema.safeParse({
          username: formData.username,
          phone: formData.phone,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        });

        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        // Send OTP to phone for verification
        const response = await supabase.functions.invoke("sms-otp/phone-signup-send", {
          body: {
            phone: formData.phone,
            username: formData.username,
          },
        });

        if (response.error) {
          throw new Error(response.error.message || "Failed to send OTP");
        }

        if (response.data?.error) {
          toast({
            title: "Signup Failed",
            description: response.data.error,
            variant: "destructive",
          });
        } else {
          setShowPhoneSignupOTP(true);
          setResendCooldown(60);
          toast({
            title: "OTP Sent!",
            description: `Verification code sent to ${formData.phone}`,
          });
        }
      }
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneSignupVerify = async () => {
    if (phoneSignupOTP.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    setVerifyingOtp(true);
    try {
      const response = await supabase.functions.invoke("sms-otp/phone-signup-verify", {
        body: {
          phone: formData.phone,
          otp: phoneSignupOTP,
          username: formData.username,
          password: formData.password,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Verification failed");
      }

      if (response.data?.error) {
        toast({
          title: "Verification Failed",
          description: response.data.error,
          variant: "destructive",
        });
        return;
      }

      // Sign in the user after successful registration
      const { error: signInError } = await signIn(response.data.email, formData.password);
      
      if (signInError) {
        toast({
          title: "Account Created!",
          description: "Your account was created. Please login with your credentials.",
        });
        setShowPhoneSignupOTP(false);
        setAuthMode("login");
      } else {
        toast({
          title: "Welcome to Scaliver!",
          description: "Your account has been created successfully.",
        });
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid or expired verification code.",
        variant: "destructive",
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendPhoneSignupOTP = async () => {
    if (resendCooldown > 0) return;
    
    setSendingOtp(true);
    try {
      const response = await supabase.functions.invoke("sms-otp/phone-signup-send", {
        body: {
          phone: formData.phone,
          username: formData.username,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to send OTP");
      }

      setResendCooldown(60);
      toast({
        title: "OTP Sent!",
        description: `Verification code sent to ${formData.phone}`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to Send OTP",
        description: error.message || "Could not send verification code.",
        variant: "destructive",
      });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      
      if (error) {
        toast({
          title: "Google Sign-in Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Google Sign-in Failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse font-display text-xl text-primary">Loading...</div>
      </div>
    );
  }

  // 2FA verification screen
  if (show2FA) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border/50 bg-background/95 backdrop-blur">
          <div className="container flex h-16 items-center">
            <Button 
              variant="ghost" 
              onClick={handleCancel2FA}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancel Login
            </Button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md text-center">
            <div className="bg-card border border-border rounded-2xl p-8">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-4">
                Two-Factor Authentication
              </h1>
              <p className="font-body text-muted-foreground mb-6">
                Enter the 6-digit code sent to {maskedPhone}
              </p>

              <div className="space-y-4">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={twoFACode}
                    onChange={(value) => setTwoFACode(value)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button 
                  variant="gaming" 
                  className="w-full"
                  onClick={handleVerify2FA}
                  disabled={verifyingOtp || twoFACode.length !== 6}
                >
                  {verifyingOtp ? (
                    <span className="animate-pulse">Verifying...</span>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Verify & Login
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => pending2FAUserId && handleSend2FA(pending2FAUserId)}
                  disabled={sendingOtp || resendCooldown > 0}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${sendingOtp ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 
                    ? `Resend in ${resendCooldown}s` 
                    : "Resend Code"
                  }
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Phone verification screen (after email verified and logged in)
  if (showPhoneVerification && user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border/50 bg-background/95 backdrop-blur">
          <div className="container flex h-16 items-center">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Skip for Now
            </Button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md text-center">
            <div className="bg-card border border-border rounded-2xl p-8">
              {phoneVerified ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h1 className="font-display text-2xl font-bold text-foreground mb-4">
                    Phone Verified & 2FA Enabled!
                  </h1>
                  <p className="font-body text-muted-foreground mb-6">
                    Your phone number has been verified. Two-factor authentication is now active for your account.
                  </p>
                  <Button variant="gaming" className="w-full" onClick={() => navigate("/")}>
                    Continue to App
                  </Button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                    <Smartphone className="w-8 h-8 text-primary" />
                  </div>
                  <h1 className="font-display text-2xl font-bold text-foreground mb-4">
                    Enable 2FA - Verify Phone
                  </h1>
                  <p className="font-body text-muted-foreground mb-6">
                    {otpSent 
                      ? `Enter the 6-digit code sent to ${formData.phone}`
                      : `We'll send a verification code to ${formData.phone}`
                    }
                  </p>

                  {!otpSent ? (
                    <Button 
                      variant="gaming" 
                      className="w-full"
                      onClick={handleSendOtp}
                      disabled={sendingOtp}
                    >
                      {sendingOtp ? (
                        <span className="animate-pulse">Sending...</span>
                      ) : (
                        <>
                          <Phone className="w-4 h-4 mr-2" />
                          Send Verification Code
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <InputOTP
                          maxLength={6}
                          value={otpCode}
                          onChange={(value) => setOtpCode(value)}
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>

                      <Button 
                        variant="gaming" 
                        className="w-full"
                        onClick={handleVerifyOtp}
                        disabled={verifyingOtp || otpCode.length !== 6}
                      >
                        {verifyingOtp ? (
                          <span className="animate-pulse">Verifying...</span>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Verify & Enable 2FA
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleSendOtp}
                        disabled={sendingOtp || resendCooldown > 0}
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${sendingOtp ? 'animate-spin' : ''}`} />
                        {resendCooldown > 0 
                          ? `Resend in ${resendCooldown}s` 
                          : "Resend Code"
                        }
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Email verification success message
  if (showVerificationMessage) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border/50 bg-background/95 backdrop-blur">
          <div className="container flex h-16 items-center">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md text-center">
            <div className="bg-card border border-border rounded-2xl p-8">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-green-400" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-4">
                Check Your Email
              </h1>
              <p className="font-body text-muted-foreground mb-6">
                We've sent a verification link to <span className="text-primary font-semibold">{formData.email}</span>. 
                Click the link in the email to verify your account.
              </p>
              
              {/* Phone info notice */}
              {formData.phone && (
                <div className="bg-secondary/50 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Shield className="w-4 h-4" />
                    <span className="font-body text-sm font-medium">2FA Setup Required</span>
                  </div>
                  <p className="font-body text-xs text-muted-foreground">
                    After email verification, verify your phone ({formData.phone}) to enable two-factor authentication.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  variant="gaming"
                  className="w-full"
                  onClick={() => {
                    setShowVerificationMessage(false);
                    setAuthMode("login");
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  I've Verified - Go to Login
                </Button>
                
                {/* Resend email button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleResendEmail}
                  disabled={resendingEmail || resendCooldown > 0}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${resendingEmail ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 
                    ? `Resend in ${resendCooldown}s` 
                    : resendingEmail 
                      ? "Sending..." 
                      : "Resend Verification Email"
                  }
                </Button>
                
                <p className="font-body text-sm text-muted-foreground">
                  Didn't receive the email? Check your spam folder.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Phone signup OTP verification screen
  if (showPhoneSignupOTP) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border/50 bg-background/95 backdrop-blur">
          <div className="container flex h-16 items-center">
            <Button 
              variant="ghost" 
              onClick={() => {
                setShowPhoneSignupOTP(false);
                setPhoneSignupOTP("");
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md text-center">
            <div className="bg-card border border-border rounded-2xl p-8">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                <Phone className="w-8 h-8 text-primary" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-4">
                Verify Your Phone
              </h1>
              <p className="font-body text-muted-foreground mb-6">
                Enter the 6-digit code sent to {formData.phone}
              </p>

              <div className="space-y-4">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={phoneSignupOTP}
                    onChange={(value) => setPhoneSignupOTP(value)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button 
                  variant="gaming" 
                  className="w-full"
                  onClick={handlePhoneSignupVerify}
                  disabled={verifyingOtp || phoneSignupOTP.length !== 6}
                >
                  {verifyingOtp ? (
                    <span className="animate-pulse">Creating Account...</span>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create Account
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleResendPhoneSignupOTP}
                  disabled={sendingOtp || resendCooldown > 0}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${sendingOtp ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 
                    ? `Resend in ${resendCooldown}s` 
                    : "Resend Code"
                  }
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50 bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-blue">
                <span className="font-display font-bold text-2xl text-primary-foreground">S</span>
              </div>
            </div>
            <h1 className="font-display text-3xl font-bold text-gradient">
              Scaliver Official
            </h1>
            <p className="font-body text-muted-foreground mt-2">
              {authMode === "login" 
                ? "Welcome back! Sign in to continue." 
                : authMode === "phone-signup"
                  ? "Sign up with your phone number."
                  : "Create an account to get started."
              }
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8">
            {/* Auth mode tabs */}
            <div className="flex gap-1 mb-6 bg-secondary/50 p-1 rounded-xl">
              <button
                onClick={() => setAuthMode("login")}
                className={`flex-1 py-2.5 rounded-lg font-display font-bold text-sm transition-all ${
                  authMode === "login"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LogIn className="w-4 h-4 inline mr-1" />
                Login
              </button>
              <button
                onClick={() => setAuthMode("signup")}
                className={`flex-1 py-2.5 rounded-lg font-display font-bold text-sm transition-all ${
                  authMode === "signup"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Mail className="w-4 h-4 inline mr-1" />
                Email
              </button>
              <button
                onClick={() => setAuthMode("phone-signup")}
                className={`flex-1 py-2.5 rounded-lg font-display font-bold text-sm transition-all ${
                  authMode === "phone-signup"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Phone className="w-4 h-4 inline mr-1" />
                Phone
              </button>
            </div>

            {/* Google Sign-in Button */}
            <div className="space-y-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <Chrome className="w-4 h-4 mr-2" />
                {authMode === "login" ? "Sign in with Google" : "Sign up with Google"}
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with {authMode === "login" ? "email" : authMode === "phone-signup" ? "phone" : "email"}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email signup fields */}
              {authMode === "signup" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="displayName" className="font-body text-foreground">
                      Display Name *
                    </Label>
                    <Input
                      id="displayName"
                      name="displayName"
                      type="text"
                      placeholder="Enter your name"
                      value={formData.displayName}
                      onChange={handleInputChange}
                      className={`bg-secondary border-border ${errors.displayName ? "border-destructive" : ""}`}
                    />
                    {errors.displayName && (
                      <p className="text-sm text-destructive">{errors.displayName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="font-body text-foreground flex items-center gap-2">
                      Phone Number * 
                      <span className="text-xs text-muted-foreground">(for 2FA)</span>
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+91 1234567890"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`bg-secondary border-border ${errors.phone ? "border-destructive" : ""}`}
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone}</p>
                    )}
                  </div>
                </>
              )}

              {/* Phone signup fields */}
              {authMode === "phone-signup" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="username" className="font-body text-foreground">
                      Username *
                    </Label>
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="Choose a username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className={`bg-secondary border-border ${errors.username ? "border-destructive" : ""}`}
                    />
                    {errors.username && (
                      <p className="text-sm text-destructive">{errors.username}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="font-body text-foreground flex items-center gap-2">
                      Phone Number * 
                      <span className="text-xs text-muted-foreground">(with country code)</span>
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+91 1234567890"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`bg-secondary border-border ${errors.phone ? "border-destructive" : ""}`}
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone}</p>
                    )}
                  </div>
                </>
              )}

              {/* Login email field */}
              {authMode === "login" && (
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-body text-foreground">
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`bg-secondary border-border ${errors.email ? "border-destructive" : ""}`}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
              )}

              {/* Email signup email field */}
              {authMode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-body text-foreground">
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`bg-secondary border-border ${errors.email ? "border-destructive" : ""}`}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="font-body text-foreground">
                  Password *
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`bg-secondary border-border pr-10 ${errors.password ? "border-destructive" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              {(authMode === "signup" || authMode === "phone-signup") && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="font-body text-foreground">
                    Confirm Password *
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`bg-secondary border-border ${errors.confirmPassword ? "border-destructive" : ""}`}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>
              )}

              <Button
                type="submit"
                variant="gaming"
                className="w-full py-6 text-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="animate-pulse">Processing...</span>
                ) : authMode === "login" ? (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    Sign In
                  </>
                ) : authMode === "phone-signup" ? (
                  <>
                    <Phone className="w-5 h-5 mr-2" />
                    Send OTP & Sign Up
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" />
                    Create Account
                  </>
                )}
              </Button>

              {/* Phone verification prompt for logged in users */}
              {user && authMode === "signup" && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowPhoneVerification(true)}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Enable 2FA - Verify Phone
                </Button>
              )}
            </form>

            {/* 2FA info for login */}
            {authMode === "login" && (
              <p className="font-body text-xs text-muted-foreground text-center mt-4">
                <Shield className="w-3 h-3 inline mr-1" />
                Protected with two-factor authentication
              </p>
            )}

            {/* Phone signup info */}
            {authMode === "phone-signup" && (
              <p className="font-body text-xs text-muted-foreground text-center mt-4">
                <Phone className="w-3 h-3 inline mr-1" />
                Phone verification required • 2FA enabled by default
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Auth;
