import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const { enquiryId } = await req.json();

    if (!enquiryId) {
      throw new Error("enquiryId is required");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch the enquiry
    const { data: enquiry, error: fetchError } = await supabase
      .from("enquiries")
      .select("*")
      .eq("id", enquiryId)
      .single();

    if (fetchError || !enquiry) {
      throw new Error("Enquiry not found");
    }

    if (!enquiry.estimated_price) {
      throw new Error("No price set for this enquiry");
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });

    // Create Stripe checkout session
    const origin = req.headers.get("origin") || "https://minibus.lovable.app";
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: enquiry.email,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `${enquiry.journey_type || "Minibus"} Journey`,
              description: `${enquiry.pickup_address} → ${enquiry.dropoff_address} on ${enquiry.date}`,
            },
            unit_amount: Math.round(enquiry.estimated_price * 100), // Convert to pence
          },
          quantity: 1,
        },
      ],
      metadata: {
        enquiry_id: enquiryId,
      },
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment-cancelled?enquiry_id=${enquiryId}`,
    });

    // Update enquiry with session ID
    await supabase
      .from("enquiries")
      .update({ stripe_session_id: session.id, payment_status: "pending" })
      .eq("id", enquiryId);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error creating payment:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
