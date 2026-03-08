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

    console.log(`Received WhatsApp from ${from}: ${body}`);

    const emptyTwiml = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
    const xmlHeaders = { ...corsHeaders, "Content-Type": "text/xml" };

    const normBusiness = BUSINESS_WHATSAPP_NUMBER.replace(/[^0-9+]/g, "");
    const normFrom = from.replace(/[^0-9+]/g, "");
    const isOwner = normFrom === normBusiness;

    // ── OWNER: YES (accept quote) ──────────────────────────────────────
    if (/^YES$/i.test(body) && isOwner) {
      const enquiry = await findLatestEnquiry(supabase, "pending");

      if (!enquiry) {
        await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, from,
          `No pending enquiries found.`);
        return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
      }

      await supabase.from("enquiries").update({ status: "offered" }).eq("id", enquiry.id);

      const clientPhone = formatClientPhone(enquiry.phone);
      await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER,
        clientPhone, buildClientOffer(enquiry, enquiry.estimated_price));

      await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, from,
        `Quote of £${enquiry.estimated_price} sent to ${enquiry.full_name} for confirmation.`);

      return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
    }

    // ── OWNER: NO (decline enquiry) ─────────────────────────────────────
    if (/^NO$/i.test(body) && isOwner) {
      const enquiry = await findLatestEnquiry(supabase, "pending");

      if (!enquiry) {
        await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, from,
          `No pending enquiries found.`);
        return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
      }

      await supabase.from("enquiries").update({ status: "declined" }).eq("id", enquiry.id);

      const clientPhone = formatClientPhone(enquiry.phone);
      await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER,
        clientPhone, `Hi ${enquiry.full_name}, unfortunately we're unable to accommodate your booking request at this time. Thank you for considering Yorkshire Minibus.`);

      await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, from,
        `Enquiry from ${enquiry.full_name} has been declined.`);

      return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
    }

    // ── OWNER: PRICE <amount> ───────────────────────────────────────────
    const priceMatch = body.match(/^PRICE\s+(\d+(?:\.\d{1,2})?)$/i);
    if (priceMatch && isOwner) {
      const newPrice = parseFloat(priceMatch[1]);
      const enquiry = await findLatestEnquiry(supabase, "pending");

      if (!enquiry) {
        await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, from,
          `No pending enquiries found.`);
        return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
      }

      await supabase.from("enquiries")
        .update({ estimated_price: newPrice, status: "offered" })
        .eq("id", enquiry.id);

      const clientPhone = formatClientPhone(enquiry.phone);
      await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER,
        clientPhone, buildClientOffer(enquiry, newPrice));

      await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, from,
        `Custom quote of £${newPrice} sent to ${enquiry.full_name} for confirmation.`);

      return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
    }

    // ── CLIENT: YES (confirm booking) ───────────────────────────────────
    if (/^YES$/i.test(body) && !isOwner) {
      const enquiry = await findEnquiryByClientPhone(supabase, from, "offered");

      if (!enquiry) {
        await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, from,
          `No active quote found. It may have already been confirmed or expired.`);
        return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
      }

      await supabase.from("enquiries").update({ status: "confirmed" }).eq("id", enquiry.id);

      // Create Stripe payment link
      let paymentUrl = "";
      try {
        const paymentResponse = await fetch(`${SUPABASE_URL}/functions/v1/create-payment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ enquiryId: enquiry.id }),
        });
        const paymentData = await paymentResponse.json();
        paymentUrl = paymentData.url || "";
      } catch (e) {
        console.error("Failed to create payment link:", e);
      }

      // Send payment link to client
      await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, from,
        `*Booking Confirmed!*

Your ${enquiry.journey_type || "minibus"} trip on ${formatDate(enquiry.date)} is locked in at £${enquiry.estimated_price}.

💳 *Payment*
Please complete your payment using the link below:
${paymentUrl || "Payment link will be sent shortly."}

Thank you for choosing Yorkshire Minibus!`);

      // Notify owner
      await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER,
        BUSINESS_WHATSAPP_NUMBER,
        `*BOOKING CONFIRMED*

${enquiry.full_name} has confirmed their booking. Payment link sent.

📋 *Journey Details*
Type: ${enquiry.journey_type || "Minibus"}
Passengers: ${enquiry.passengers || "N/A"}

📅 *Calendar Entry*
Date: ${formatDate(enquiry.date)}
Time: ${enquiry.pickup_time || "TBC"}

📍 *Route*
From: ${enquiry.pickup_address || "TBC"}
To: ${enquiry.dropoff_address || "TBC"}

💰 *Price*
£${enquiry.estimated_price}

👤 *Contact*
${enquiry.full_name}
${enquiry.phone}
${enquiry.email}`);

      return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
    }

    // ── CLIENT: NO (reject quote) ───────────────────────────────────────
    if (/^NO$/i.test(body) && !isOwner) {
      const enquiry = await findEnquiryByClientPhone(supabase, from, "offered");

      if (!enquiry) {
        await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, from,
          `No active quote found.`);
        return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
      }

      await supabase.from("enquiries").update({ status: "rejected" }).eq("id", enquiry.id);

      await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, from,
        `We're sorry to hear that. If you'd like to discuss the price, feel free to give us a call. Thanks for considering Yorkshire Minibus!`);

      await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER,
        BUSINESS_WHATSAPP_NUMBER,
        `*QUOTE REJECTED*

${enquiry.full_name} has declined the quote.

📋 *Journey Details*
${formatDate(enquiry.date)} at ${enquiry.pickup_time || "TBC"}
${enquiry.pickup_address || "TBC"} → ${enquiry.dropoff_address || "TBC"}

💰 *Quoted Price*
£${enquiry.estimated_price}

👤 *Contact*
${enquiry.phone}`);

      return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
    }

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

async function findLatestEnquiry(supabase: any, status: string) {
  const { data, error } = await supabase
    .from("enquiries")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

async function findEnquiryByClientPhone(supabase: any, whatsappFrom: string, status: string) {
  // Extract raw number from "whatsapp:+44..."
  const rawNumber = whatsappFrom.replace("whatsapp:", "").trim();

  // Build possible phone formats to match against stored phone
  const possibleFormats: string[] = [rawNumber];
  if (rawNumber.startsWith("+44")) {
    possibleFormats.push("0" + rawNumber.slice(3)); // +447xxx -> 07xxx
    possibleFormats.push(rawNumber.slice(1));         // +447xxx -> 447xxx
  }

  const { data, error } = await supabase
    .from("enquiries")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!data) return null;

  // Match by normalised phone
  for (const enquiry of data) {
    const stored = enquiry.phone.replace(/\s+/g, "");
    if (possibleFormats.some(f => f === stored || stored === f)) {
      return enquiry;
    }
  }
  return null;
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
  return `Hi ${enquiry.full_name}!

Great news — Yorkshire Minibus has come back with a quote for your trip:

📋 *Journey Details*
Occasion: ${enquiry.journey_type || "Minibus"}
Passengers: ${enquiry.passengers || "N/A"}
Date: ${formatDate(enquiry.date)}
Time: ${enquiry.pickup_time || "TBC"}

📍 *Route*
From: ${enquiry.pickup_address || "TBC"}
To: ${enquiry.dropoff_address || "TBC"}

💰 *Price*
£${price || "TBC"}

Would you like to confirm this booking? Reply YES or NO.`;
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
