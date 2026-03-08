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

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER || !BUSINESS_WHATSAPP_NUMBER) {
      throw new Error("Missing Twilio or business phone configuration");
    }

    const {
      enquiryId,
      fullName,
      email,
      phone,
      journeyType,
      passengers,
      pickupAddress,
      dropoffAddress,
      date,
      pickupTime,
      returnJourney,
      returnTime,
      distanceMiles,
      durationMinutes,
      estimatedPrice,
    } = await req.json();

    // Format duration
    const formatDuration = (mins: number) => {
      if (!mins) return "N/A";
      if (mins < 60) return `${mins} min`;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h ${m}min` : `${h}h`;
    };

    // Format date
    const formatDate = (dateStr: string) => {
      if (!dateStr) return "Not specified";
      const [y, m, d] = dateStr.split("-");
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
    };

    // Helper to send an SMS via Twilio
    const sendSMS = async (to: string, body: string) => {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

      const params = new URLSearchParams();
      params.append("From", TWILIO_WHATSAPP_NUMBER);
      params.append("To", to);
      params.append("Body", body);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        },
        body: params.toString(),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("Twilio error:", data);
        throw new Error(`Twilio send failed: ${JSON.stringify(data)}`);
      }
      return data;
    };

    // ── Message to Business Owner ───────────────────────────────────────
    const ownerMessage = `NEW MINIBUS ENQUIRY

${fullName}
Email: ${email}
Phone: ${phone}

Journey Details:
- Occasion: ${journeyType || "Not specified"}
- Passengers: ${passengers || "N/A"}
- Date: ${formatDate(date)}
- Time: ${pickupTime || "Not specified"}
- Return: ${returnJourney ? `Yes - ${returnTime || "TBC"}` : "No"}

Route:
- From: ${pickupAddress || "Not provided"}
- To: ${dropoffAddress || "Not provided"}
- Distance: ${distanceMiles ? `${distanceMiles} miles` : "N/A"}
- Duration: ${formatDuration(durationMinutes)}

Estimated Price: £${estimatedPrice || "N/A"}

Reply ACCEPT ${enquiryId?.slice(0, 8)} to confirm at this price.
Reply PRICE ${enquiryId?.slice(0, 8)} <amount> to set a different price (e.g. PRICE ${enquiryId?.slice(0, 8)} 150).`;

    // ── Thank-you message to Client ─────────────────────────────────────
    const clientMessage = `Hi ${fullName}!

Thanks for your enquiry with Yorkshire Minibus! Here's a summary:

${journeyType || "Minibus"} journey
${formatDate(date)} at ${pickupTime || "TBC"}
${pickupAddress || "TBC"} to ${dropoffAddress || "TBC"}
${passengers || "N/A"} passengers

We've received your request and will get back to you shortly with a confirmed price. Sit tight!`;

    // Format client phone for SMS (assume UK if no country code)
    let clientPhone = phone.replace(/\s+/g, "");
    if (clientPhone.startsWith("0")) {
      clientPhone = "+44" + clientPhone.slice(1);
    } else if (!clientPhone.startsWith("+")) {
      clientPhone = "+44" + clientPhone;
    }

    // Send both messages
    const [ownerResult, clientResult] = await Promise.allSettled([
      sendSMS(BUSINESS_WHATSAPP_NUMBER, ownerMessage),
      sendSMS(clientPhone, clientMessage),
    ]);

    console.log("Owner SMS:", ownerResult);
    console.log("Client SMS:", clientResult);

    return new Response(
      JSON.stringify({
        success: true,
        ownerSent: ownerResult.status === "fulfilled",
        clientSent: clientResult.status === "fulfilled",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-sms:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
