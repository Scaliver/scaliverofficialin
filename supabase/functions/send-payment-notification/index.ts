import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PaymentNotificationRequest {
  email: string;
  type: "verified" | "credited";
  amount: number;
  coins?: number;
  utrNumber: string;
  productName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, type, amount, coins, utrNumber, productName }: PaymentNotificationRequest = await req.json();

    console.log(`Sending ${type} notification to ${email}`);

    let subject: string;
    let htmlContent: string;

    if (type === "verified") {
      subject = "✅ Payment Verified - Scaliver Official";
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f0f0f; color: #ffffff; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
            .header h1 { margin: 0; color: #000; font-size: 24px; }
            .content { background-color: #1a1a1a; padding: 30px; border-radius: 0 0 12px 12px; }
            .success-icon { font-size: 48px; text-align: center; margin-bottom: 20px; }
            .details { background-color: #262626; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #333; }
            .detail-row:last-child { border-bottom: none; }
            .label { color: #888; }
            .value { color: #f59e0b; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Payment Verified!</h1>
            </div>
            <div class="content">
              <div class="success-icon">✅</div>
              <p style="text-align: center; font-size: 18px;">Your UPI payment has been successfully verified!</p>
              <div class="details">
                <div class="detail-row">
                  <span class="label">UTR Number</span>
                  <span class="value">${utrNumber}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Amount</span>
                  <span class="value">₹${amount}</span>
                </div>
                ${productName ? `
                <div class="detail-row">
                  <span class="label">Product</span>
                  <span class="value">${productName}</span>
                </div>
                ` : ''}
              </div>
              <p style="text-align: center; color: #888;">Your order is being processed. You'll receive another email once completed.</p>
            </div>
            <div class="footer">
              <p>Thank you for choosing Scaliver Official!</p>
              <p>© 2026 Scaliver Official. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      subject = "🎮 Coins Credited - Scaliver Official";
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f0f0f; color: #ffffff; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
            .header h1 { margin: 0; color: #fff; font-size: 24px; }
            .content { background-color: #1a1a1a; padding: 30px; border-radius: 0 0 12px 12px; }
            .coins-badge { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #000; font-size: 36px; font-weight: bold; padding: 20px 40px; border-radius: 50px; display: inline-block; margin: 20px auto; }
            .details { background-color: #262626; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #333; }
            .detail-row:last-child { border-bottom: none; }
            .label { color: #888; }
            .value { color: #22c55e; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎮 Coins Credited!</h1>
            </div>
            <div class="content">
              <div style="text-align: center;">
                <div class="coins-badge">🪙 ${coins} Coins</div>
              </div>
              <p style="text-align: center; font-size: 18px; margin-top: 20px;">Your coins have been added to your wallet!</p>
              <div class="details">
                <div class="detail-row">
                  <span class="label">UTR Number</span>
                  <span class="value">${utrNumber}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Amount Paid</span>
                  <span class="value">₹${amount}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Coins Credited</span>
                  <span class="value">${coins} 🪙</span>
                </div>
              </div>
              <p style="text-align: center; color: #888;">Start using your coins to purchase your favorite game items!</p>
            </div>
            <div class="footer">
              <p>Thank you for choosing Scaliver Official!</p>
              <p>© 2026 Scaliver Official. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Scaliver Official <noreply@scaliverofficial.in>",
        to: [email],
        subject: subject,
        html: htmlContent,
      }),
    });

    const emailData = await emailResponse.json();

    console.log("Email sent successfully:", emailData);

    if (!emailResponse.ok) {
      throw new Error(emailData.message || "Failed to send email");
    }

    return new Response(JSON.stringify(emailData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending notification email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
