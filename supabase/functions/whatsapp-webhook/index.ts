import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Twilio sends form-encoded data
    const formData = await req.formData();
    const body = (formData.get("Body") as string || "").trim();
    const from = formData.get("From") as string || "";

    console.log(`Received WhatsApp from ${from}: ${body}`);

    // Check if message matches "ACCEPT <id>"
    const acceptMatch = body.match(/^ACCEPT\s+([a-f0-9]{8})$/i);

    if (!acceptMatch) {
      // Not an accept command, return empty TwiML
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
        { status: 200, headers: { ...corsHeaders, "Content-Type": "text/xml" } }
      );
    }

    const shortId = acceptMatch[1].toLowerCase();

    // Find the enquiry by matching the first 8 chars of the UUID
    const { data: enquiries, error: fetchError } = await supabase
      .from("enquiries")
      .select("*")
      .eq("status", "pending")
      .ilike("id", `${shortId}%`);

    if (fetchError) throw fetchError;

    if (!enquiries || enquiries.length === 0) {
      // Reply that no matching enquiry was found
      await sendWhatsApp(
        TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER,
        from,
        `❌ No pending enquiry found with ID *${shortId}*. It may have already been accepted.`
      );
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
        { status: 200, headers: { ...corsHeaders, "Content-Type": "text/xml" } }
      );
    }

    const enquiry = enquiries[0];

    // Update status to accepted
    const { error: updateError } = await supabase
      .from("enquiries")
      .update({ status: "accepted" })
      .eq("id", enquiry.id);

    if (updateError) throw updateError;

    // Format client phone for WhatsApp
    let clientPhone = enquiry.phone.replace(/\s+/g, "");
    if (clientPhone.startsWith("0")) {
      clientPhone = "+44" + clientPhone.slice(1);
    } else if (!clientPhone.startsWith("+")) {
      clientPhone = "+44" + clientPhone;
    }

    // Format date
    const formatDate = (dateStr: string) => {
      if (!dateStr) return "your requested date";
      const [y, m, d] = dateStr.split("-");
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
    };

    // Send confirmation to client
    const clientConfirmation = `🎉 *Great news, ${enquiry.full_name}!*

Your minibus booking has been *confirmed*! Here are the details:

🚐 ${enquiry.journey_type || "Minibus"} journey
📅 ${formatDate(enquiry.date)} at ${enquiry.pickup_time || "TBC"}
📍 ${enquiry.pickup_address || "TBC"} → ${enquiry.dropoff_address || "TBC"}
👥 ${enquiry.passengers || "N/A"} passengers
💰 *Price: £${enquiry.estimated_price || "TBC"}*

We'll be in touch with payment details shortly. Thank you for choosing *Yorkshire Minibus*! 🙌`;

    await sendWhatsApp(
      TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER,
      `whatsapp:${clientPhone}`,
      clientConfirmation
    );

    // Confirm to owner
    await sendWhatsApp(
      TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER,
      from,
      `✅ Booking *${shortId}* for *${enquiry.full_name}* has been confirmed. Client has been notified on WhatsApp.`
    );

    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { status: 200, headers: { ...corsHeaders, "Content-Type": "text/xml" } }
    );
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { status: 200, headers: { ...corsHeaders, "Content-Type": "text/xml" } }
    );
  }
});

// Helper to send WhatsApp via Twilio
async function sendWhatsApp(
  accountSid: string, authToken: string, fromNumber: string,
  to: string, body: string
) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const from = fromNumber.startsWith("whatsapp:") ? fromNumber : `whatsapp:${fromNumber}`;
  const toNum = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  const params = new URLSearchParams();
  params.append("From", from);
  params.append("To", toNum);
  params.append("Body", body);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
    },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Twilio send error:", data);
    throw new Error(`Twilio error: ${JSON.stringify(data)}`);
  }
  return data;
}
