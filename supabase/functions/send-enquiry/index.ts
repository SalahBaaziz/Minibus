import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Pricing helpers ────────────────────────────────────────────────────────────

function passengersToNumber(passengerRange: string): number {
  if (!passengerRange || passengerRange === "Not sure yet") return 8;
  const match = passengerRange.match(/^(\d+)–(\d+)/);
  return match ? parseInt(match[2]) : 8;
}

function extractTimePeriod(timeString: string): string {
  if (!timeString) return "Afternoon";
  const match = timeString.match(/^([A-Za-z\s]+?)\s*\(/);
  return match ? match[1].trim() : "Afternoon";
}

function getTimePremium(timePeriod: string): number {
  const premiums: { [key: string]: number } = {
    "Morning": 1.0,
    "Afternoon": 1.0,
    "Early Morning": 1.1,
    "Evening": 1.2,
    "Late Night": 1.3,
    "Overnight": 1.5,
  };
  return premiums[timePeriod] || 1.0;
}

function getJourneyTypePremium(journeyType: string): number {
  const premiums: { [key: string]: number } = {
    "Corporate": 1.0,
    "School Trip": 1.0,
    "Other": 1.0,
    "Airport Transfer": 1.1,
    "Wedding": 1.2,
    "Night Out": 1.3,
  };
  return premiums[journeyType] || 1.0;
}

function calculatePrice(
  distanceMiles: number,
  passengers: string,
  timeString: string,
  journeyType: string
): { finalPrice: number } | null {
  if (!distanceMiles || distanceMiles <= 0) return null;
  const people = passengersToNumber(passengers);
  const timePremium = getTimePremium(extractTimePeriod(timeString));
  const journeyPremium = getJourneyTypePremium(journeyType);
  const fairPrice = (people / 16) * distanceMiles * 5 * timePremium * journeyPremium;
  const minimumCharge = distanceMiles * (10 / 3);
  const finalPrice = Math.max(fairPrice, minimumCharge);
  return { finalPrice: Math.round(finalPrice * 100) / 100 };
}

// ── Utilities ──────────────────────────────────────────────────────────────────

const formatDuration = (mins: number) => {
  if (!mins) return "Not calculated";
  if (mins < 60) return `${mins} minutes`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "Not specified";
  const [y, m, d] = dateStr.split("-");
  const months = ["January","February","March","April","May","June","July",
                  "August","September","October","November","December"];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
};

// ── Edge function ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const BUSINESS_EMAIL = Deno.env.get("BUSINESS_EMAIL");
    if (!BUSINESS_EMAIL) throw new Error("BUSINESS_EMAIL is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase config");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const {
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
      notes,
    } = await req.json();

    if (!fullName || !email || !phone) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: fullName, email, phone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const priceEstimate = calculatePrice(distanceMiles, passengers, pickupTime, journeyType);

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
  .container { max-width: 600px; margin: auto; background: white; border-radius: 12px; overflow: hidden; }
  .header { background: #1e293b; color: white; padding: 24px; text-align: center; }
  .header h1 { margin: 0; font-size: 22px; }
  .body { padding: 24px; }
  .section { margin-bottom: 20px; }
  .section h2 { font-size: 16px; color: #1e293b; border-bottom: 2px solid #4a9a8e; padding-bottom: 6px; margin-bottom: 12px; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
  .row .label { font-weight: bold; color: #555; }
  .row .value { color: #1e293b; }
  .highlight { background: #f0fdf4; border: 1px solid #4a9a8e; border-radius: 8px; padding: 16px; margin-top: 12px; }
  .highlight .big { font-size: 24px; font-weight: bold; color: #1e293b; }
  .highlight .price { font-size: 28px; font-weight: bold; color: #4a9a8e; }
</style></head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Minibus Enquiry</h1>
    </div>
    <div class="body">

      <div class="section">
        <h2>Customer Details</h2>
        <div class="row"><span class="label">Name</span><span class="value">${fullName}</span></div>
        <div class="row"><span class="label">Email</span><span class="value">${email}</span></div>
        <div class="row"><span class="label">Phone</span><span class="value">${phone}</span></div>
      </div>

      <div class="section">
        <h2>Journey Details</h2>
        <div class="row"><span class="label">Occasion</span><span class="value">${journeyType || "Not specified"}</span></div>
        <div class="row"><span class="label">Passengers</span><span class="value">${passengers || "Not specified"}</span></div>
        <div class="row"><span class="label">Date</span><span class="value">${formatDate(date)}</span></div>
        <div class="row"><span class="label">Time</span><span class="value">${pickupTime || "Not specified"}</span></div>
        <div class="row"><span class="label">Return Journey</span><span class="value">${returnJourney ? `Yes – ${returnTime || "time TBC"}` : "No"}</span></div>
      </div>

      <div class="section">
        <h2>Route</h2>
        <div class="row"><span class="label">Pick-up</span><span class="value">${pickupAddress || "Not provided"}</span></div>
        <div class="row"><span class="label">Drop-off</span><span class="value">${dropoffAddress || "Not provided"}</span></div>
      </div>

      <div class="highlight">
        <div class="row"><span class="label">Distance</span><span class="big">${distanceMiles ? `${distanceMiles} miles` : "Not calculated"}</span></div>
        <div class="row"><span class="label">Est. Duration</span><span class="big">${formatDuration(durationMinutes)}</span></div>
        ${priceEstimate ? `<div class="row"><span class="label">Est. Price</span><span class="price">£${priceEstimate.finalPrice}</span></div>` : ""}
      </div>

      ${notes ? `
      <div class="section" style="margin-top:20px">
        <h2>Additional Notes</h2>
        <p style="color:#555">${notes}</p>
      </div>` : ""}

    </div>
  </div>
</body>
</html>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Yorkshire Minibus <onboarding@resend.dev>",
        to: [BUSINESS_EMAIL],
      subject: (() => {
        const isUrgent = date && (() => {
          const bookingDate = new Date(date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          bookingDate.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((bookingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 5;
        })();
        const prefix = isUrgent ? "🚨 URGENT - " : "";
        return `${prefix}New Enquiry: ${journeyType || "General"} – ${fullName}`;
      })(),
        html: emailHtml,
        reply_to: email,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend error:", resendData);
      throw new Error(`Email send failed: ${JSON.stringify(resendData)}`);
    }

    // Store enquiry in database
    const priceValue = priceEstimate?.finalPrice || null;
    const { data: enquiryRow, error: dbError } = await supabase
      .from("enquiries")
      .insert({
        full_name: fullName,
        email,
        phone,
        journey_type: journeyType || null,
        passengers: passengers || null,
        pickup_address: pickupAddress || null,
        dropoff_address: dropoffAddress || null,
        date: date || null,
        pickup_time: pickupTime || null,
        return_journey: returnJourney || false,
        return_time: returnTime || null,
        distance_miles: distanceMiles || null,
        duration_minutes: durationMinutes || null,
        notes: notes || null,
        estimated_price: priceValue,
        status: "pending",
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("DB insert error:", dbError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: resendData.id,
        enquiryId: enquiryRow?.id || null,
        estimatedPrice: priceValue,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-enquiry:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
