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

  const emptyTwiml = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  const xmlHeaders = { ...corsHeaders, "Content-Type": "text/xml" };

  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER");
    const BUSINESS_WHATSAPP_NUMBER = Deno.env.get("BUSINESS_WHATSAPP_NUMBER");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER || !BUSINESS_WHATSAPP_NUMBER || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing required environment variables");
      return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse incoming Twilio webhook
    const formData = await req.formData();
    const body = (formData.get("Body") as string || "").trim();
    const fromRaw = formData.get("From") as string || "";
    
    // Strip whatsapp: prefix for use with sendWhatsApp (which adds it back)
    const fromNumber = fromRaw.replace("whatsapp:", "").trim();
    
    // Normalize business number for comparison
    const normBusiness = BUSINESS_WHATSAPP_NUMBER.replace(/[^0-9+]/g, "");
    const normFrom = fromNumber.replace(/[^0-9+]/g, "");
    const isOwner = normFrom === normBusiness;

    console.log(`Received WhatsApp from ${fromNumber} (isOwner: ${isOwner}): ${body}`);

    // ── OWNER: YES (accept quote) ──────────────────────────────────────
    if (/^YES$/i.test(body) && isOwner) {
      const enquiry = await findLatestEnquiry(supabase, "pending");

      if (!enquiry) {
        await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, fromNumber,
          `No pending enquiries found.`);
        return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
      }

      await supabase.from("enquiries").update({ status: "offered" }).eq("id", enquiry.id);

      // Send quote to client
      const clientPhone = formatClientPhone(enquiry.phone);
      console.log(`Sending quote to client: ${clientPhone}`);
      
      await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER,
        clientPhone, buildClientOffer(enquiry, enquiry.estimated_price));

      // Confirm to owner
      await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, fromNumber,
        `✅ Quote of £${enquiry.estimated_price} sent to ${enquiry.full_name} for confirmation.`);

      return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
    }

    // ── OWNER: NO (decline enquiry) ─────────────────────────────────────
    if (/^NO$/i.test(body) && isOwner) {
      const enquiry = await findLatestEnquiry(supabase, "pending");

      if (!enquiry) {
        await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, fromNumber,
          `No pending enquiries found.`);
        return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
      }

      await supabase.from("enquiries").update({ status: "declined" }).eq("id", enquiry.id);

      const clientPhone = formatClientPhone(enquiry.phone);
      await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER,
        clientPhone, `Hi ${enquiry.full_name}, unfortunately we're unable to accommodate your booking request at this time. Thank you for considering Academy Minibus.`);

      await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, fromNumber,
        `❌ Enquiry from ${enquiry.full_name} has been declined.`);

      return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
    }

    // ── OWNER: PRICE <amount> ───────────────────────────────────────────
    const priceMatch = body.match(/^PRICE\s+(\d+(?:\.\d{1,2})?)$/i);
    if (priceMatch && isOwner) {
      const newPrice = parseFloat(priceMatch[1]);
      const enquiry = await findLatestEnquiry(supabase, "pending");

      if (!enquiry) {
        await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, fromNumber,
          `No pending enquiries found.`);
        return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
      }

      await supabase.from("enquiries")
        .update({ estimated_price: newPrice, status: "offered" })
        .eq("id", enquiry.id);

      const clientPhone = formatClientPhone(enquiry.phone);
      await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER,
        clientPhone, buildClientOffer(enquiry, newPrice));

      await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, fromNumber,
        `✅ Custom quote of £${newPrice} sent to ${enquiry.full_name} for confirmation.`);

      return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
    }

    // ── CLIENT: YES (confirm booking) ───────────────────────────────────
    if (/^YES$/i.test(body) && !isOwner) {
      const enquiry = await findEnquiryByClientPhone(supabase, fromNumber, "offered");

      if (!enquiry) {
        await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, fromNumber,
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
        console.log("Payment link created:", paymentUrl);
      } catch (e) {
        console.error("Failed to create payment link:", e);
      }

      // Send payment link to client
      await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, fromNumber,
        `🎉 *Booking Confirmed!*

Your ${enquiry.journey_type || "minibus"} trip on ${formatDate(enquiry.date)} is locked in at £${enquiry.estimated_price}.

💳 *Payment*
Please complete your payment using the link below:
${paymentUrl || "Payment link will be sent shortly."}

Thank you for choosing Academy Minibus!`);

      // Notify owner (use normalized business number)
      await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER,
        normBusiness,
        `🎉 *BOOKING CONFIRMED*

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
      const enquiry = await findEnquiryByClientPhone(supabase, fromNumber, "offered");

      if (!enquiry) {
        await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, fromNumber,
          `No active quote found.`);
        return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
      }

      await supabase.from("enquiries").update({ status: "rejected" }).eq("id", enquiry.id);

      await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, fromNumber,
        `We're sorry to hear that. If you'd like to discuss the price, feel free to give us a call. Thanks for considering Yorkshire Minibus!`);

      await sendWhatsApp(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER,
        normBusiness,
        `❌ *QUOTE REJECTED*

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

    console.log(`Unrecognized message: "${body}" from ${fromNumber}`);
    return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    return new Response(emptyTwiml, { status: 200, headers: xmlHeaders });
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
  if (error) {
    console.error("findLatestEnquiry error:", error);
    throw error;
  }
  return data && data.length > 0 ? data[0] : null;
}

async function findEnquiryByClientPhone(supabase: any, phoneNumber: string, status: string) {
  // phoneNumber is already stripped of whatsapp: prefix, e.g. +447368832422
  const rawNumber = phoneNumber.trim();

  // Build possible phone formats to match against stored phone
  const possibleFormats: string[] = [rawNumber];
  if (rawNumber.startsWith("+44")) {
    possibleFormats.push("0" + rawNumber.slice(3)); // +447xxx -> 07xxx
    possibleFormats.push(rawNumber.slice(1));         // +447xxx -> 447xxx
  }
  if (rawNumber.startsWith("0")) {
    possibleFormats.push("+44" + rawNumber.slice(1)); // 07xxx -> +447xxx
  }

  console.log(`Looking for enquiry with phone matching: ${JSON.stringify(possibleFormats)}`);

  const { data, error } = await supabase
    .from("enquiries")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("findEnquiryByClientPhone error:", error);
    throw error;
  }
  if (!data) return null;

  // Match by normalised phone
  for (const enquiry of data) {
    const stored = enquiry.phone.replace(/\s+/g, "");
    if (possibleFormats.some(f => f === stored || stored === f)) {
      console.log(`Found matching enquiry: ${enquiry.id}`);
      return enquiry;
    }
  }
  
  console.log("No matching enquiry found");
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
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

function buildClientOffer(enquiry: any, price: number | null): string {
  return `Hi ${enquiry.full_name}! 👋

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

Would you like to confirm this booking? Reply *YES* or *NO*.`;
}

async function sendWhatsApp(
  accountSid: string, authToken: string, fromNumber: string,
  to: string, body: string
) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  // Ensure 'to' doesn't already have whatsapp: prefix
  const cleanTo = to.replace("whatsapp:", "").trim();

  const params = new URLSearchParams();
  params.append("From", `whatsapp:${fromNumber}`);
  params.append("To", `whatsapp:${cleanTo}`);
  params.append("Body", body);

  console.log(`Sending WhatsApp: From whatsapp:${fromNumber} To whatsapp:${cleanTo}`);

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
  
  console.log(`WhatsApp sent successfully: ${data.sid}`);
  return data;
}
