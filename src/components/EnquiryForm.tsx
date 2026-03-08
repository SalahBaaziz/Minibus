import { useState, useRef, useCallback } from "react";
import { Loader2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import LocationAutocomplete, { type LocationResult } from "./LocationAutocomplete";
import RouteMap, { type RouteInfo } from "./RouteMap";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import RouteInfoDisplay from "./RouteInfo";

const journeyTypes = [
"Wedding",
"Airport Transfer",
"Corporate",
"School Trip",
"Night Out",
"Other"];


const passengerRanges = Array.from({ length: 16 }, (_, i) => i + 1);

const pickupTimeRanges = [
"Early Morning (05:00 – 08:00)",
"Morning (08:00 – 12:00)",
"Afternoon (12:00 – 17:00)",
"Evening (17:00 – 21:00)",
"Late Night (21:00 – 00:00)",
"Overnight (00:00 – 05:00)"];


const EnquiryForm = () => {
  const formRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(1);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const goToStep = useCallback((newStep: number) => {
    setStep(newStep);
    // Prevent browser from scrolling away from the form
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "instant", block: "nearest" });
    });
  }, []);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [returnJourney, setReturnJourney] = useState(false);

  const [pickupLocation, setPickupLocation] = useState<LocationResult | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<LocationResult | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    journeyType: "",
    date: "",
    time: "",
    pickupTime: "",
    passengers: "",
    returnTime: "",
    notes: ""
  });

  const update = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setValidationErrors((prev) => prev.filter((f) => f !== field));
  };

  const validateStep = (s: number): string[] => {
    const missing: string[] = [];
    if (s === 1) {
      if (!formData.journeyType) missing.push("journeyType");
      if (!formData.passengers) missing.push("passengers");
    } else if (s === 2) {
      if (!pickupLocation) missing.push("pickup");
      if (!dropoffLocation) missing.push("dropoff");
    } else if (s === 3) {
      if (!formData.date) missing.push("date");
      if (!formData.pickupTime) missing.push("pickupTime");
      if (returnJourney && !formData.returnTime) missing.push("returnTime");
    } else if (s === 5) {
      if (!formData.fullName) missing.push("fullName");
      if (!formData.email) missing.push("email");
      if (!formData.phone) missing.push("phone");
    }
    return missing;
  };

  const handleNext = () => {
    if (step === 4) {
      goToStep(step + 1);
      return;
    }
    const missing = validateStep(step);
    if (missing.length > 0) {
      setValidationErrors(missing);
      return;
    }
    setValidationErrors([]);
    goToStep(step + 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        ...formData,
        returnJourney,
        returnTime: returnJourney ? formData.returnTime : null,
        pickupAddress: pickupLocation?.displayName || null,
        pickupCoords: pickupLocation ?
        { lat: pickupLocation.lat, lon: pickupLocation.lon } :
        null,
        dropoffAddress: dropoffLocation?.displayName || null,
        dropoffCoords: dropoffLocation ?
        { lat: dropoffLocation.lat, lon: dropoffLocation.lon } :
        null,
        distanceMiles: routeInfo?.distanceMiles || null,
        durationMinutes: routeInfo?.durationMinutes || null
      };

      const { data, error } = await supabase.functions.invoke("send-enquiry", {
        body: payload
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error || "Failed to send");

      // Trigger WhatsApp notifications (non-blocking)
      if (data?.enquiryId) {
        supabase.functions.invoke("send-whatsapp", {
          body: {
            enquiryId: data.enquiryId,
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            journeyType: formData.journeyType,
            passengers: formData.passengers,
            pickupAddress: pickupLocation?.displayName || null,
            dropoffAddress: dropoffLocation?.displayName || null,
            date: formData.date,
            pickupTime: formData.pickupTime,
            returnJourney,
            returnTime: returnJourney ? formData.returnTime : null,
            distanceMiles: routeInfo?.distanceMiles || null,
            durationMinutes: routeInfo?.durationMinutes || null,
            estimatedPrice: data.estimatedPrice
          }
        }).catch((err) => console.warn("WhatsApp send failed (non-blocking):", err));
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error("Submit error:", err);
      setSubmitError("Something went wrong. Please try again or call us directly.");
    } finally {
      setSubmitting(false);
    }
  };

  const stepLabels = ["Journey", "Locations", "Date & Time", "Extras", "About You"];

  if (submitted) {
    return (
      <section id="enquiry" className="py-20 lg:py-28 bg-stone-300">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <div className="rounded-xl border border-navy-light/30 p-12 bg-gold-light">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gold/20">
              <span className="text-3xl">✓</span>
            </div>
            <h3 className="font-serif text-2xl font-bold text-primary-foreground">
              Thanks! We'll be in touch within the hour.
            </h3>
            <p className="mt-3 text-primary-foreground/70">
              We've received your enquiry and will get back to you shortly.
            </p>
          </div>
        </div>
      </section>);

  }

  const errorBorderClass = "!border-destructive !ring-destructive/50";

  const inputClass =
  "w-full rounded-lg border border-navy-light/30 bg-navy-light/20 px-4 py-3 text-sm text-primary-foreground placeholder:text-primary-foreground/40 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/50";

  const labelClass = "block text-sm font-medium text-primary-foreground mb-1.5";

  return (
    <section id="enquiry" aria-labelledby="enquiry-heading" className="py-20 lg:py-28 bg-stone-300">
      <div className="mx-auto max-w-2xl px-6">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold">
            Get a Price - within the hour
          </p>
          <h2 id="enquiry-heading" className="mt-3 font-serif text-3xl sm:text-4xl font-medium text-navy-dark">
            Tell Us About Your Journey
          </h2>
          <p className="mt-3 text-navy-light">
            Don't worry if you don't have all the details yet — just give us what you can.
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {stepLabels.map((label, i) =>
          <div key={i} className="flex items-center gap-2">
              <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
              step === i + 1 ?
              "bg-gold text-navy" :
              step > i + 1 ?
              "bg-gold/30 text-gold" :
              "bg-navy-light/30 text-primary-foreground/40"}`
              }>
              
                {i + 1}
              </div>
              <span className="hidden sm:inline text-xs text-navy-dark">{label}</span>
              {i < stepLabels.length - 1 && <div className="w-6 h-px bg-navy-light/30" />}
            </div>
          )}
        </div>

        <div ref={formRef} className="rounded-xl border border-navy-light/30 p-8 bg-gold-light">
          {/* STEP 1 – Journey */}
          {step === 1 &&
          <div className="space-y-5">
              <div>
                <h3 className="font-serif text-lg font-bold text-primary-foreground">
                  Journey Details
                </h3>
                <p className="text-sm text-primary-foreground/80 mt-1">
                  What kind of trip are you planning?
                </p>
              </div>

              <div>
                <label htmlFor="journeyType" className={labelClass}>What's the occasion?</label>
                <select
                id="journeyType"
                className={cn(inputClass, validationErrors.includes("journeyType") && errorBorderClass)}
                value={formData.journeyType}
                onChange={(e) => update("journeyType", e.target.value)}>
                
                  <option value="">Select a journey type</option>
                  {journeyTypes.map((t) =>
                <option key={t} value={t}>{t}</option>
                )}
                </select>
              </div>

              <div>
                <label htmlFor="passengers" className={labelClass}>How many passengers?</label>
                <select
                id="passengers"
                className={cn(inputClass, validationErrors.includes("passengers") && errorBorderClass)}
                value={formData.passengers}
                onChange={(e) => update("passengers", e.target.value)}>
                
                  <option value="">Select a value</option>
                  {passengerRanges.map((r) =>
                <option key={r} value={r}>{r}</option>
                )}
                </select>
              </div>
            </div>
          }

          {/* STEP 2 – Locations with autocomplete + map */}
          {step === 2 &&
          <div className="space-y-5">
              <div>
                <h3 className="font-serif text-lg font-bold text-primary-foreground">
                  Pick-up & Drop-off
                </h3>
                <p className="text-sm text-primary-foreground/80 mt-1">
                  Search for a location — we'll pinpoint it on the map.
                </p>
              </div>

              <LocationAutocomplete
              label="Pick-up location"
              placeholder="e.g. Leeds City Centre"
              value={pickupLocation}
              onChange={(loc) => {setPickupLocation(loc);setValidationErrors((prev) => prev.filter((f) => f !== "pickup"));}}
              hasError={validationErrors.includes("pickup")} />
            

              <LocationAutocomplete
              label="Drop-off location"
              placeholder="e.g. Harrogate town centre"
              value={dropoffLocation}
              onChange={(loc) => {setDropoffLocation(loc);setValidationErrors((prev) => prev.filter((f) => f !== "dropoff"));}}
              hasError={validationErrors.includes("dropoff")} />
            

              <RouteInfoDisplay routeInfo={routeInfo} />

              <RouteMap
              pickup={pickupLocation}
              dropoff={dropoffLocation}
              onRouteCalculated={setRouteInfo}
              onLoadingChange={setRouteLoading} />
            
            </div>
          }

          {step === 3 &&
          <div className="space-y-5">
          
            <div>
              <h3 className="font-serif text-lg font-bold text-primary-foreground">
                When Do You Need Us?
              </h3>
              <p className="text-sm text-primary-foreground/80 mt-1">
                A rough estimate is fine if you're not sure yet.
              </p>
            </div>
          
            <div>
              <label className={labelClass}>Date of travel</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(inputClass, "flex items-center justify-between text-left", validationErrors.includes("date") && errorBorderClass)}>
                    
                    {formData.date ? format(new Date(formData.date + "T00:00:00"), "d MMM yyyy") : <span className="text-primary-foreground/40">Select a date</span>}
                    <CalendarIcon className="h-4 w-4 text-primary-foreground/40" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background border-border" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date ? new Date(formData.date + "T00:00:00") : undefined}
                    onSelect={(date) => update("date", date ? format(date, "yyyy-MM-dd") : "")}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")} />
                  
                </PopoverContent>
              </Popover>
            </div>
          
            <div>
              <label htmlFor="pickupTime" className={labelClass}>Pick-up time</label>
              <select
                id="pickupTime"
                className={cn(inputClass, validationErrors.includes("pickupTime") && errorBorderClass)}
                value={formData.pickupTime}
                onChange={(e) => update("pickupTime", e.target.value)}>
                
                <option value="">Select a time range</option>
                {pickupTimeRanges.map((t) =>
                <option key={t} value={t}>{t}</option>
                )}
              </select>
            </div>
          
            <div>
              <label className={labelClass}>Do you need a return journey?</label>
              <div className="flex gap-4 mt-2">
          
                <button
                  type="button"
                  onClick={() => setReturnJourney(true)}
                  className={`rounded-3xl text-primary-foreground ${returnJourney ? "bg-gold-dark border-2 border-gold" : "bg-navy-light/30 border-2 border-transparent"}`}>
                  Yes
                </button>

                <button
                  type="button"
                  onClick={() => setReturnJourney(false)}
                  className={`rounded-3xl text-primary-foreground ${!returnJourney ? "bg-gold-dark border-2 border-gold" : "bg-navy-light/30 border-2 border-transparent"}`}>
                  No
                </button>
          
              </div>
            </div>
          
            {returnJourney &&
            <div>
              <label htmlFor="returnTime" className={labelClass}>Return pick-up time</label>
              <select
                id="returnTime"
                className={cn(inputClass, validationErrors.includes("returnTime") && errorBorderClass)}
                value={formData.returnTime}
                onChange={(e) => update("returnTime", e.target.value)}>
                
                <option value="">Select a time range</option>
                {pickupTimeRanges.map((t) =>
                <option key={t} value={t}>{t}</option>
                )}
              </select>
            </div>
            }
          
          </div>
          }

          {/* STEP 4 – Extras */}
          {step === 4 &&
          <div className="space-y-5">
              <div>
                <h3 className="font-serif text-lg font-bold text-primary-foreground">
                  Anything Else?
                </h3>
                <p className="text-sm text-primary-foreground/80 mt-1">
                  Any special requirements we should know about.
                </p>
              </div>

              <div>
                <label className={labelClass}>Additional notes / special requirements</label>
                <textarea
                className={`${inputClass} min-h-[120px] resize-none`}
                placeholder="e.g. wheelchair access, child seats, extra luggage, specific route..."
                value={formData.notes}
                onChange={(e) => update("notes", e.target.value)} />
              
              </div>
            </div>
          }

          {/* STEP 5 – About You */}
          {step === 5 &&
          <div className="space-y-5 text-navy-light">
              <div className="text-base">
                <h3 className="font-serif text-lg font-bold text-primary-foreground">
                  Almost Done!
                </h3>
                <p className="text-sm mt-1 text-primary-foreground">
                  Where should we send your quote?
                </p>
              </div>

              {/* Review summary */}
              {(pickupLocation || dropoffLocation || routeInfo) &&
            <div className="rounded-lg bg-navy-light/10 border border-navy-light/20 p-4 space-y-2">
                  <p className="text-xs font-semibold text-primary-foreground/60 uppercase tracking-wider">
                    Journey Summary
                  </p>
                  {pickupLocation &&
              <p className="text-sm text-primary-foreground">
                      <strong>From:</strong> {pickupLocation.displayName}
                    </p>
              }
                  {dropoffLocation &&
              <p className="text-sm text-primary-foreground">
                      <strong>To:</strong> {dropoffLocation.displayName}
                    </p>
              }
                  {routeInfo &&
              <p className="text-sm font-semibold text-navy-dark">
                      {routeInfo.distanceMiles} miles •{" "}
                      {routeInfo.durationMinutes < 60 ?
                `${routeInfo.durationMinutes} min` :
                `${Math.floor(routeInfo.durationMinutes / 60)}h ${routeInfo.durationMinutes % 60}min`}
                    </p>
              }
                </div>
            }

              <div>
                <label className="text-primary-foreground">Full Name</label>
                <input
                className={cn(inputClass, validationErrors.includes("fullName") && errorBorderClass)}
                placeholder="e.g. John Smith"
                value={formData.fullName}
                onChange={(e) => update("fullName", e.target.value)} />
              
              </div>

              <div>
                <label className="text-primary-foreground">Email Address</label>
                <input
                className={cn(inputClass, validationErrors.includes("email") && errorBorderClass)}
                type="email"
                placeholder="e.g. john@example.com"
                value={formData.email}
                onChange={(e) => update("email", e.target.value)} />
              
              </div>

              <div>
                <label className="text-primary-foreground">Phone Number</label>
                <input
                className={cn(inputClass, validationErrors.includes("phone") && errorBorderClass)}
                type="tel"
                placeholder="e.g. 07700 900000"
                value={formData.phone}
                onChange={(e) => update("phone", e.target.value)} />
              
              </div>

              {submitError &&
            <p className="text-sm text-red-400 bg-red-400/10 rounded-lg p-3">{submitError}</p>
            }
            </div>
          }

          {/* Validation message */}
          {validationErrors.length > 0 &&
          <p className="mt-4 text-sm text-primary-foreground font-semibold bg-destructive/15 border border-destructive/30 rounded-lg px-3 py-2">
              ⚠ Please fill in the highlighted fields before continuing.
            </p>
          }

          {/* NAVIGATION */}
          <div className="mt-4 flex justify-between">
            {step > 1 ?
            <button
              onClick={() => {setValidationErrors([]);goToStep(step - 1);}}
              className="px-6 py-2.5 text-sm transition-colors bg-muted text-navy rounded-xl font-semibold border-0">
              
                Back
              </button> :

            <div />
            }

            {step < 5 ?
            <button
              onClick={handleNext}
              disabled={step === 2 && pickupLocation && dropoffLocation && (routeLoading || !routeInfo) ? true : false}
              className="px-6 py-2.5 text-sm font-semibold text-navy transition-colors rounded-xl bg-muted disabled:opacity-50 disabled:cursor-not-allowed">
              
                {step === 2 && routeLoading ?
              <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Calculating…
                  </span> :
              "Next"}
              </button> :

            <button
              onClick={() => {
                const missing = validateStep(5);
                if (missing.length > 0) {setValidationErrors(missing);return;}
                handleSubmit();
              }}
              disabled={submitting}
              className="px-8 py-2.5 text-sm font-semibold text-navy transition-colors bg-muted rounded-xl disabled:opacity-50 flex items-center gap-2">
              
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Sending…" : "Send Enquiry"}
              </button>
            }
          </div>
        </div>
      </div>
    </section>);

};

export default EnquiryForm;