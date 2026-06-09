import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendOTPRequest {
  phone: string;
  userId: string;
}

interface VerifyOTPRequest {
  phone: string;
  otp: string;
  userId: string;
}

interface Check2FARequest {
  userId: string;
}

interface Send2FARequest {
  userId: string;
}

interface PhoneSignupSendRequest {
  phone: string;
  username: string;
}

interface PhoneSignupVerifyRequest {
  phone: string;
  otp: string;
  username: string;
  password: string;
}

const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendSMS = async (phone: string, message: string): Promise<boolean> => {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !twilioPhone) {
    console.error("Twilio credentials not configured");
    throw new Error("SMS service not configured");
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: phone,
      From: twilioPhone,
      Body: message,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Twilio API error:", errorData);
    throw new Error("Failed to send SMS");
  }

  console.log("SMS sent successfully to:", phone);
  return true;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    // Check if user has 2FA enabled (verified phone)
    if (action === "check-2fa") {
      const { userId }: Check2FARequest = await req.json();

      if (!userId) {
        return new Response(
          JSON.stringify({ error: "userId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: contact, error } = await supabase
        .from("user_contacts")
        .select("phone, phone_verified")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error checking 2FA status:", error);
        return new Response(
          JSON.stringify({ error: "Failed to check 2FA status" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const has2FA = contact?.phone_verified === true && !!contact?.phone;
      const maskedPhone = contact?.phone 
        ? contact.phone.slice(0, 4) + "****" + contact.phone.slice(-2) 
        : null;

      console.log("2FA check for user:", userId, "has2FA:", has2FA);
      return new Response(
        JSON.stringify({ has2FA, maskedPhone }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    // Send 2FA OTP to user's verified phone
    } else if (action === "send-2fa") {
      const { userId }: Send2FARequest = await req.json();

      if (!userId) {
        return new Response(
          JSON.stringify({ error: "userId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user's verified phone
      const { data: contact, error: contactError } = await supabase
        .from("user_contacts")
        .select("phone, phone_verified")
        .eq("user_id", userId)
        .eq("phone_verified", true)
        .maybeSingle();

      if (contactError || !contact?.phone) {
        console.error("No verified phone for user:", userId);
        return new Response(
          JSON.stringify({ error: "No verified phone number found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate OTP and expiry (5 minutes for 2FA)
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      // Delete any existing unverified OTPs for this phone
      await supabase
        .from("phone_verifications")
        .delete()
        .eq("phone", contact.phone)
        .eq("verified", false);

      // Store the OTP
      const { error: insertError } = await supabase
        .from("phone_verifications")
        .insert({
          user_id: userId,
          phone: contact.phone,
          otp_code: otp,
          expires_at: expiresAt,
          verified: false,
        });

      if (insertError) {
        console.error("Error storing OTP:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to generate OTP" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send SMS
      const message = `Your Scaliver 2FA code is: ${otp}. Valid for 5 minutes. Do not share this code.`;
      await sendSMS(contact.phone, message);

      const maskedPhone = contact.phone.slice(0, 4) + "****" + contact.phone.slice(-2);
      console.log("2FA OTP sent for user:", userId);
      return new Response(
        JSON.stringify({ success: true, message: "2FA code sent", maskedPhone }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    // Verify 2FA OTP
    } else if (action === "verify-2fa") {
      const { otp, userId }: { otp: string; userId: string } = await req.json();

      if (!otp || !userId) {
        return new Response(
          JSON.stringify({ error: "OTP and userId are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user's verified phone
      const { data: contact } = await supabase
        .from("user_contacts")
        .select("phone")
        .eq("user_id", userId)
        .eq("phone_verified", true)
        .maybeSingle();

      if (!contact?.phone) {
        return new Response(
          JSON.stringify({ error: "No verified phone found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find valid OTP
      const { data: verification, error: fetchError } = await supabase
        .from("phone_verifications")
        .select("*")
        .eq("phone", contact.phone)
        .eq("otp_code", otp)
        .eq("verified", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError || !verification) {
        console.log("Invalid or expired 2FA OTP for user:", userId);
        return new Response(
          JSON.stringify({ error: "Invalid or expired code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark OTP as verified
      await supabase
        .from("phone_verifications")
        .update({ verified: true })
        .eq("id", verification.id);

      console.log("2FA verified successfully for user:", userId);
      return new Response(
        JSON.stringify({ success: true, message: "2FA verification successful" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "send") {
      const { phone, userId }: SendOTPRequest = await req.json();

      if (!phone || !userId) {
        return new Response(
          JSON.stringify({ error: "Phone and userId are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate OTP and expiry (10 minutes from now)
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // Delete any existing unverified OTPs for this phone
      await supabase
        .from("phone_verifications")
        .delete()
        .eq("phone", phone)
        .eq("verified", false);

      // Store the OTP
      const { error: insertError } = await supabase
        .from("phone_verifications")
        .insert({
          user_id: userId,
          phone: phone,
          otp_code: otp,
          expires_at: expiresAt,
          verified: false,
        });

      if (insertError) {
        console.error("Error storing OTP:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to generate OTP" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send SMS
      const message = `Your Scaliver verification code is: ${otp}. Valid for 10 minutes.`;
      await sendSMS(phone, message);

      console.log("OTP sent successfully for user:", userId);
      return new Response(
        JSON.stringify({ success: true, message: "OTP sent successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "verify") {
      const { phone, otp, userId }: VerifyOTPRequest = await req.json();

      if (!phone || !otp || !userId) {
        return new Response(
          JSON.stringify({ error: "Phone, OTP, and userId are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find valid OTP
      const { data: verification, error: fetchError } = await supabase
        .from("phone_verifications")
        .select("*")
        .eq("phone", phone)
        .eq("otp_code", otp)
        .eq("verified", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError || !verification) {
        console.log("Invalid or expired OTP for phone:", phone);
        return new Response(
          JSON.stringify({ error: "Invalid or expired OTP" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark OTP as verified
      await supabase
        .from("phone_verifications")
        .update({ verified: true })
        .eq("id", verification.id);

      // Update user_contacts to mark phone as verified
      const { error: updateError } = await supabase
        .from("user_contacts")
        .update({ phone_verified: true })
        .eq("user_id", userId)
        .eq("phone", phone);

      if (updateError) {
        console.error("Error updating phone verification status:", updateError);
      }

      console.log("Phone verified successfully for user:", userId);
      return new Response(
        JSON.stringify({ success: true, message: "Phone verified successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    // Phone signup - send OTP
    } else if (action === "phone-signup-send") {
      const { phone, username }: PhoneSignupSendRequest = await req.json();

      if (!phone || !username) {
        return new Response(
          JSON.stringify({ error: "Phone and username are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if phone is already registered
      const { data: existingContact } = await supabase
        .from("user_contacts")
        .select("user_id")
        .eq("phone", phone)
        .maybeSingle();

      if (existingContact) {
        return new Response(
          JSON.stringify({ error: "This phone number is already registered" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if username is taken
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("display_name", username)
        .maybeSingle();

      if (existingProfile) {
        return new Response(
          JSON.stringify({ error: "This username is already taken" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate OTP and expiry (10 minutes from now)
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // Delete any existing unverified OTPs for this phone
      await supabase
        .from("phone_verifications")
        .delete()
        .eq("phone", phone)
        .eq("verified", false);

      // Store the OTP with a temporary user_id placeholder
      const { error: insertError } = await supabase
        .from("phone_verifications")
        .insert({
          user_id: "00000000-0000-0000-0000-000000000000", // Placeholder for phone signup
          phone: phone,
          otp_code: otp,
          expires_at: expiresAt,
          verified: false,
        });

      if (insertError) {
        console.error("Error storing OTP:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to generate OTP" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send SMS
      const message = `Your Scaliver signup code is: ${otp}. Valid for 10 minutes.`;
      await sendSMS(phone, message);

      console.log("Phone signup OTP sent to:", phone);
      return new Response(
        JSON.stringify({ success: true, message: "OTP sent successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    // Phone signup - verify OTP and create account
    } else if (action === "phone-signup-verify") {
      const { phone, otp, username, password }: PhoneSignupVerifyRequest = await req.json();

      if (!phone || !otp || !username || !password) {
        return new Response(
          JSON.stringify({ error: "All fields are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find valid OTP
      const { data: verification, error: fetchError } = await supabase
        .from("phone_verifications")
        .select("*")
        .eq("phone", phone)
        .eq("otp_code", otp)
        .eq("verified", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError || !verification) {
        console.log("Invalid or expired OTP for phone signup:", phone);
        return new Response(
          JSON.stringify({ error: "Invalid or expired OTP" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate email from phone (for Supabase auth requirement)
      const sanitizedPhone = phone.replace(/[^0-9]/g, "");
      const generatedEmail = `${sanitizedPhone}@phone.scaliver.com`;

      // Create user account
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: generatedEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          display_name: username,
          phone: phone,
        },
      });

      if (authError) {
        console.error("Error creating user:", authError);
        return new Response(
          JSON.stringify({ error: authError.message || "Failed to create account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark OTP as verified
      await supabase
        .from("phone_verifications")
        .update({ verified: true, user_id: authData.user.id })
        .eq("id", verification.id);

      // Update user_contacts to mark phone as verified (created by trigger)
      await supabase
        .from("user_contacts")
        .update({ phone_verified: true })
        .eq("user_id", authData.user.id);

      console.log("Phone signup successful for:", phone, "user:", authData.user.id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Account created successfully",
          email: generatedEmail,
          userId: authData.user.id,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error: any) {
    console.error("Error in sms-otp function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
