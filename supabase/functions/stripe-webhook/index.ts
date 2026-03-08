import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER");
    const BUSINESS_WHATSAPP_NUMBER = Deno.env.get("BUSINESS_WHATSAPP_NUMBER");

    if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    // Verify webhook signature if secret is set
    if (STRIPE_WEBHOOK_SECRET && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return new Response("Webhook signature verification failed", { status: 400 });
      }
    } else {
      event = JSON.parse(body);
    }

    console.log("Received Stripe event:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const enquiryId = session.metadata?.enquiry_id;

      if (enquiryId) {
        // Update enquiry payment status
        const { data: enquiry } = await supabase
          .from("enquiries")
          .update({ 
            payment_status: "paid", 
            paid_at: new Date().toISOString(),
            status: "paid"
          })
          .eq("id", enquiryId)
          .select()
          .single();

        if (enquiry && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_NUMBER) {
          // Send confirmation to client
          const clientPhone = formatClientPhone(enquiry.phone);
          await sendWhatsApp(
            TWILIO_ACCOUNT_SID,
            TWILIO_AUTH_TOKEN,
            TWILIO_WHATSAPP_NUMBER,
            clientPhone,
            `*Payment Received!*

Thank you ${enquiry.full_name}, your payment of £${enquiry.estimated_price} has been received.

📋 *Booking Confirmed*
${enquiry.journey_type || "Minibus"} journey
Date: ${formatDate(enquiry.date)}
Time: ${enquiry.pickup_time || "TBC"}

📍 *Route*
From: ${enquiry.pickup_address || "TBC"}
To: ${enquiry.dropoff_address || "TBC"}

We look forward to seeing you! If you have any questions, feel free to reply to this message.

Yorkshire Minibus`
          );

          // Send notification to owner
          if (BUSINESS_WHATSAPP_NUMBER) {
            await sendWhatsApp(
              TWILIO_ACCOUNT_SID,
              TWILIO_AUTH_TOKEN,
              TWILIO_WHATSAPP_NUMBER,
              BUSINESS_WHATSAPP_NUMBER,
              `*PAYMENT RECEIVED*

${enquiry.full_name} has paid £${enquiry.estimated_price}

📅 *Calendar Entry*
Date: ${formatDate(enquiry.date)}
Time: ${enquiry.pickup_time || "TBC"}

📍 *Route*
From: ${enquiry.pickup_address || "TBC"}
To: ${enquiry.dropoff_address || "TBC"}

👤 *Contact*
${enquiry.full_name}
${enquiry.phone}
${enquiry.email}`
            );
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Stripe webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper functions
function formatClientPhone(phone: string): string {
  let p = phone.replace(/\s+/g, "");
  if (p.startsWith("0")) p = "+44" + p.slice(1);
  else if (!p.startsWith("+")) p = "+44" + p;
  return p;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "your requested date";
  const [y, m, d] = dateStr.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

async function sendWhatsApp(
  accountSid: string, authToken: string, fromNumber: string,
  to: string, body: string
) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const params = new URLSearchParams();
  params.append("From", `whatsapp:${fromNumber}`);
  params.append("To", `whatsapp:${to}`);
  params.append("Body", body);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const data = await res.json();
    console.error("Twilio send error:", data);
  }
}
