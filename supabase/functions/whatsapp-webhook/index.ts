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
    const BUSINESS_WHATSAPP_NUMBER = Deno.env.get("BUSINESS_WHATSAPP_NUMBER");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const formData = await req.formData();
    const body = (formData.get("Body") as string || "").trim();
    const from = formData.get("From") as string || "";

    console.log(`Received SMS from ${from}: ${body}`);

    const emptyTwiml = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
    const xmlHeaders = { ...corsHeaders, "Content-Type": "text/xml" };

    // Normalise the business number for comparison
    const normBusiness = BUSINESS_WHATSAPP_NUMBER.replace(/[^0-9+]/g, "");
    const normFrom = from.replace(/[^0-9+]/g, "");
    const isOwner = normFrom === normBusiness;

    // ── OWNER: ACCEPT <id> ──────────────────────────────────────────────
    const acceptMatch = body.match(/^ACCEPT\s+([a-f0-9]{8})$/i);
    if (acceptMatch && isOwner) {
      const shortId = acceptMatch[1].toLowerCase();
      const enquiry = await findEnquiry(supabase, shortId, "pending");

      if (!enquiry) {
        await sendSMS(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, from,
          `No pending enquiry found with ID ${shortId}.`);
        return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
      }

      await supabase.from("enquiries").update({ status: "offered" }).eq("id", enquiry.id);

      const clientPhone = formatClientPhone(enquiry.phone);
      await sendSMS(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER,
        clientPhone, buildClientOffer(enquiry, enquiry.estimated_price));

      await sendSMS(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, from,
        `Price of £${enquiry.estimated_price} sent to ${enquiry.full_name} for confirmation.`);

      return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
    }

    // ── OWNER: PRICE <id> <amount> ──────────────────────────────────────
    const priceMatch = body.match(/^PRICE\s+([a-f0-9]{8})\s+(\d+(?:\.\d{1,2})?)$/i);
    if (priceMatch && isOwner) {
      const shortId = priceMatch[1].toLowerCase();
      const newPrice = parseFloat(priceMatch[2]);
      const enquiry = await findEnquiry(supabase, shortId, "pending");

      if (!enquiry) {
        await sendSMS(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, from,
          `No pending enquiry found with ID ${shortId}.`);
        return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
      }

      await supabase.from("enquiries")
        .update({ estimated_price: newPrice, status: "offered" })
        .eq("id", enquiry.id);

      const clientPhone = formatClientPhone(enquiry.phone);
      await sendSMS(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER,
        clientPhone, buildClientOffer(enquiry, newPrice));

      await sendSMS(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, from,
        `New price of £${newPrice} sent to ${enquiry.full_name} for confirmation.`);

      return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
    }

    // ── CLIENT: CONFIRM <id> ────────────────────────────────────────────
    const confirmMatch = body.match(/^CONFIRM\s+([a-f0-9]{8})$/i);
    if (confirmMatch && !isOwner) {
      const shortId = confirmMatch[1].toLowerCase();
      const enquiry = await findEnquiry(supabase, shortId, "offered");

      if (!enquiry) {
        await sendSMS(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, from,
          `No booking offer found with that ID. It may have already been confirmed or expired.`);
        return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
      }

      await supabase.from("enquiries").update({ status: "confirmed" }).eq("id", enquiry.id);

      await sendSMS(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, from,
        `Booking Confirmed! Your ${enquiry.journey_type || "minibus"} trip on ${formatDate(enquiry.date)} is locked in at £${enquiry.estimated_price}. We'll be in touch with payment details shortly. Thank you for choosing Yorkshire Minibus!`);

      await sendSMS(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER,
        BUSINESS_WHATSAPP_NUMBER,
        `${enquiry.full_name} has CONFIRMED booking ${shortId} at £${enquiry.estimated_price}!`);

      return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
    }

    // ── CLIENT: REJECT <id> ─────────────────────────────────────────────
    const rejectMatch = body.match(/^REJECT\s+([a-f0-9]{8})$/i);
    if (rejectMatch && !isOwner) {
      const shortId = rejectMatch[1].toLowerCase();
      const enquiry = await findEnquiry(supabase, shortId, "offered");

      if (!enquiry) {
        await sendSMS(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, from,
          `No booking offer found with that ID.`);
        return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
      }

      await supabase.from("enquiries").update({ status: "rejected" }).eq("id", enquiry.id);

      await sendSMS(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, from,
        `We're sorry to hear that. If you'd like to discuss the price, feel free to give us a call. Thanks for considering Yorkshire Minibus!`);

      await sendSMS(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER,
        BUSINESS_WHATSAPP_NUMBER,
        `${enquiry.full_name} has REJECTED the offer for booking ${shortId} (£${enquiry.estimated_price}).`);

      return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
    }

    // No matching command
    return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { status: 200, headers: { ...corsHeaders, "Content-Type": "text/xml" } }
    );
  }
});

// ── Helpers ─────────────────────────────────────────────────────────────

async function findEnquiry(supabase: any, shortId: string, status: string) {
  const { data, error } = await supabase
    .from("enquiries")
    .select("*")
    .eq("status", status)
    .ilike("id", `${shortId}%`);
  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

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

function buildClientOffer(enquiry: any, price: number | null): string {
  const shortId = enquiry.id.slice(0, 8);
  return `Hi ${enquiry.full_name}!

Yorkshire Minibus has a price for your trip:

${enquiry.journey_type || "Minibus"} journey
${formatDate(enquiry.date)} at ${enquiry.pickup_time || "TBC"}
${enquiry.pickup_address || "TBC"} to ${enquiry.dropoff_address || "TBC"}
${enquiry.passengers || "N/A"} passengers

Price: £${price || "TBC"}

Reply CONFIRM ${shortId} to accept and book.
Reply REJECT ${shortId} if you'd like to decline.`;
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

  const data = await res.json();
  if (!res.ok) {
    console.error("Twilio send error:", data);
    throw new Error(`Twilio error: ${JSON.stringify(data)}`);
  }
  return data;
}
