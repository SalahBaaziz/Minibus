import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { calculatePrice } from "./pricing.js";

dotenv.config();

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

app.use(cors());
app.use(express.json());

const formatDuration = (mins: number) => {
  if (!mins) return "Not calculated";
  if (mins < 60) return `${mins} minutes`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

app.post("/api/send-enquiry", async (req, res) => {
  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return res.status(500).json({ success: false, error: "RESEND_API_KEY is not configured" });
    }

    const BUSINESS_EMAIL = process.env.BUSINESS_EMAIL;
    if (!BUSINESS_EMAIL) {
      return res.status(500).json({ success: false, error: "BUSINESS_EMAIL is not configured" });
    }

    const {
      fullName,
      email,
      phone,
      journeyType,
      passengers,
      pickupAddress,
      dropoffAddress,
      date,
      time,
      returnJourney,
      returnTime,
      distanceMiles,
      durationMinutes,
      notes,
    } = req.body;

    if (!fullName || !email || !phone) {
      return res.status(400).json({ error: "Missing required fields: fullName, email, phone" });
    }

    // Calculate price estimate
    const priceEstimate = calculatePrice(distanceMiles, passengers, time, journeyType);

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
        <div class="row"><span class="label">Date</span><span class="value">${date || "Not specified"}</span></div>
        <div class="row"><span class="label">Time</span><span class="value">${time || "Not specified"}</span></div>
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
        subject: `New Enquiry: ${journeyType || "General"} – ${fullName}`,
        html: emailHtml,
        reply_to: email,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend error:", resendData);
      throw new Error(`Email send failed: ${JSON.stringify(resendData)}`);
    }

    return res.json({ success: true, id: (resendData as any).id });
  } catch (error: unknown) {
    console.error("Error in send-enquiry:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ success: false, error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
