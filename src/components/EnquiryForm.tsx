"use client"

import { useState, type FormEvent } from "react"

const TOTAL_STEPS = 5

const journeyTypes = [
  "Wedding",
  "Airport Transfer",
  "Corporate",
  "School Trip",
  "Night Out",
  "Day Out / Event",
  "Other",
]

const passengerRanges = [
  "1 - 4",
  "5 - 8",
  "9 - 12",
  "13 - 16",
  "Not sure yet",
]

const timeSlots = [
  "Early Morning (6am - 9am)",
  "Morning (9am - 12pm)",
  "Afternoon (12pm - 3pm)",
  "Late Afternoon (3pm - 6pm)",
  "Evening (6pm - 9pm)",
  "Night (9pm - 12am)",
  "Not sure yet",
]

const stepLabels = [
  "Journey",
  "Locations",
  "Date & Time",
  "Extras",
  "About You",
]

/* ---------- Shared style classes ---------- */

const inputClasses =
  "mt-1.5 w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-2 focus:ring-gold/20 focus:outline-none"
const selectClasses =
  "mt-1.5 w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground focus:border-gold focus:ring-2 focus:ring-gold/20 focus:outline-none"
const labelClasses = "block text-sm font-medium text-card-foreground"
const hintClasses = "mt-1 text-xs text-muted-foreground"

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-gold bg-gold/10 text-gold"
          : "border-input text-muted-foreground hover:border-gold/50"
      }`}
    >
      {children}
    </button>
  )
}

/* ---------- Progress Bar ---------- */

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-8">
      {/* Step dots and labels */}
      <div className="flex items-center justify-between" role="list" aria-label="Form progress">
        {stepLabels.map((label, i) => {
          const stepNum = i + 1
          const isComplete = step > stepNum
          const isCurrent = step === stepNum
          return (
            <div key={label} className="flex flex-1 flex-col items-center" role="listitem">
              <div className="flex w-full items-center">
                {i > 0 && (
                  <div
                    className={`h-0.5 flex-1 transition-colors ${
                      step > i ? "bg-gold" : "bg-border"
                    }`}
                  />
                )}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    isComplete
                      ? "bg-gold text-navy"
                      : isCurrent
                        ? "border-2 border-gold bg-gold/10 text-gold"
                        : "border-2 border-border bg-background text-muted-foreground"
                  }`}
                >
                  {isComplete ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    stepNum
                  )}
                </div>
                {i < stepLabels.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 transition-colors ${
                      step > stepNum ? "bg-gold" : "bg-border"
                    }`}
                  />
                )}
              </div>
              <span
                className={`mt-2 hidden text-xs font-medium sm:block ${
                  isCurrent ? "text-gold" : isComplete ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Mobile: current step label */}
      <p className="mt-3 text-center text-sm font-medium text-gold sm:hidden">
        Step {step} of {TOTAL_STEPS}: {stepLabels[step - 1]}
      </p>
    </div>
  )
}

/* ========== Main Form ========== */

export function EnquiryForm() {
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  /* form data */
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")

  const [journeyType, setJourneyType] = useState("")
  const [passengers, setPassengers] = useState("")

  const [knowsPickup, setKnowsPickup] = useState<"exact" | "area" | null>(null)
  const [pickupPostcode, setPickupPostcode] = useState("")
  const [pickupArea, setPickupArea] = useState("")
  const [knowsDropoff, setKnowsDropoff] = useState<"exact" | "area" | null>(null)
  const [dropoffPostcode, setDropoffPostcode] = useState("")
  const [dropoffArea, setDropoffArea] = useState("")

  const [knowsDate, setKnowsDate] = useState<"exact" | "rough" | "no" | null>(null)
  const [travelDate, setTravelDate] = useState("")
  const [roughDate, setRoughDate] = useState("")
  const [pickupTimeSlot, setPickupTimeSlot] = useState("")
  const [pickupExactTime, setPickupExactTime] = useState("")

  const [returnNeeded, setReturnNeeded] = useState(false)
  const [returnTimeSlot, setReturnTimeSlot] = useState("")
  const [returnExactTime, setReturnExactTime] = useState("")

  const [notes, setNotes] = useState("")

  /* step errors */
  const [stepError, setStepError] = useState("")

  function validateStep(): boolean {
    setStepError("")
    if (step === 1) {
      if (!journeyType) { setStepError("Please select a journey type."); return false }
      if (!passengers) { setStepError("Please select a passenger range."); return false }
    }
    if (step === 5) {
      if (!fullName.trim()) { setStepError("Please enter your name."); return false }
      if (!email.trim()) { setStepError("Please enter your email."); return false }
      if (!phone.trim()) { setStepError("Please enter your phone number."); return false }
    }
    return true
  }

  function handleNext() {
    if (!validateStep()) return
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }

  function handleBack() {
    setStepError("")
    setStep((s) => Math.max(s - 1, 1))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!validateStep()) return
    setLoading(true)

    const data = {
      fullName,
      email,
      phone,
      journeyType,
      passengers,
      pickupPostcode: knowsPickup === "exact" ? pickupPostcode : "",
      pickupArea: knowsPickup === "area" ? pickupArea : "",
      dropoffPostcode: knowsDropoff === "exact" ? dropoffPostcode : "",
      dropoffArea: knowsDropoff === "area" ? dropoffArea : "",
      knowsDate,
      travelDate: knowsDate === "exact" ? travelDate : "",
      roughDate: knowsDate === "rough" ? roughDate : "",
      pickupTimeSlot,
      pickupExactTime,
      returnNeeded: returnNeeded ? "Yes" : "No",
      returnTimeSlot: returnNeeded ? returnTimeSlot : "",
      returnExactTime: returnNeeded ? returnExactTime : "",
      notes,
    }

    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (res.ok) setSubmitted(true)
    } catch {
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  /* ---- Success state ---- */
  if (submitted) {
    return (
      <section id="enquiry" className="bg-background py-20 lg:py-28">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <div className="rounded-xl border border-gold/30 bg-card p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
              <svg className="h-8 w-8 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="mt-6 font-serif text-2xl font-bold text-card-foreground">
              Thanks! We&apos;ll be in touch within the hour.
            </h3>
            <p className="mt-3 text-sm text-muted-foreground">
              We&apos;ve received your enquiry and one of our team will get back to you shortly with a quote.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="enquiry" className="bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-2xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold">
            Get a Free Quote
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-foreground sm:text-4xl text-balance">
            Tell Us About Your Journey
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Don&apos;t worry if you don&apos;t have all the details yet &mdash; just give us what you can.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-10 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8"
        >
          <ProgressBar step={step} />

          {/* ---------- Step 1: Journey Info ---------- */}
          {step === 1 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-card-foreground">Journey Info</h3>
              <p className={hintClasses}>What kind of trip and roughly how many people?</p>

              <div>
                <label htmlFor="journeyType" className={labelClasses}>
                  What&apos;s the occasion?
                </label>
                <select
                  id="journeyType"
                  value={journeyType}
                  onChange={(e) => setJourneyType(e.target.value)}
                  className={selectClasses}
                >
                  <option value="">Select a journey type</option>
                  {journeyTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="passengers" className={labelClasses}>
                  How many passengers?
                </label>
                <p className={hintClasses}>An estimate is fine &mdash; we can adjust later.</p>
                <select
                  id="passengers"
                  value={passengers}
                  onChange={(e) => setPassengers(e.target.value)}
                  className={selectClasses}
                >
                  <option value="">Select a range</option>
                  {passengerRanges.map((range) => (
                    <option key={range} value={range}>{range}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ---------- Step 2: Locations ---------- */}
          {step === 2 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-card-foreground">Pick-up &amp; Drop-off</h3>
              <p className={hintClasses}>
                If you don&apos;t have an exact postcode yet, just give us the town or area.
              </p>

              {/* Pick-up */}
              <div>
                <span className={labelClasses}>Pick-up location</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  <ToggleChip active={knowsPickup === "exact"} onClick={() => setKnowsPickup("exact")}>
                    I have a postcode
                  </ToggleChip>
                  <ToggleChip active={knowsPickup === "area"} onClick={() => setKnowsPickup("area")}>
                    I just know the area / town
                  </ToggleChip>
                </div>

                {knowsPickup === "exact" && (
                  <input
                    type="text"
                    value={pickupPostcode}
                    onChange={(e) => setPickupPostcode(e.target.value)}
                    placeholder="e.g. LS1 4AP"
                    className={`${inputClasses} mt-3 sm:max-w-xs`}
                  />
                )}
                {knowsPickup === "area" && (
                  <input
                    type="text"
                    value={pickupArea}
                    onChange={(e) => setPickupArea(e.target.value)}
                    placeholder="e.g. Leeds City Centre, Harrogate"
                    className={`${inputClasses} mt-3`}
                  />
                )}
              </div>

              {/* Drop-off */}
              <div>
                <span className={labelClasses}>Drop-off location</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  <ToggleChip active={knowsDropoff === "exact"} onClick={() => setKnowsDropoff("exact")}>
                    I have a postcode
                  </ToggleChip>
                  <ToggleChip active={knowsDropoff === "area"} onClick={() => setKnowsDropoff("area")}>
                    I just know the area / town
                  </ToggleChip>
                </div>

                {knowsDropoff === "exact" && (
                  <input
                    type="text"
                    value={dropoffPostcode}
                    onChange={(e) => setDropoffPostcode(e.target.value)}
                    placeholder="e.g. YO1 9SA"
                    className={`${inputClasses} mt-3 sm:max-w-xs`}
                  />
                )}
                {knowsDropoff === "area" && (
                  <input
                    type="text"
                    value={dropoffArea}
                    onChange={(e) => setDropoffArea(e.target.value)}
                    placeholder="e.g. Manchester Airport, York"
                    className={`${inputClasses} mt-3`}
                  />
                )}
              </div>
            </div>
          )}

          {/* ---------- Step 3: Date & Time ---------- */}
          {step === 3 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-card-foreground">Date &amp; Time</h3>
              <p className={hintClasses}>
                Don&apos;t have an exact date or time? No problem &mdash; a rough idea is fine.
              </p>

              {/* Date precision */}
              <div>
                <span className={labelClasses}>When is your journey?</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  <ToggleChip active={knowsDate === "exact"} onClick={() => setKnowsDate("exact")}>
                    I know the exact date
                  </ToggleChip>
                  <ToggleChip active={knowsDate === "rough"} onClick={() => setKnowsDate("rough")}>
                    I have a rough idea
                  </ToggleChip>
                  <ToggleChip active={knowsDate === "no"} onClick={() => setKnowsDate("no")}>
                    Not sure yet
                  </ToggleChip>
                </div>
              </div>

              {knowsDate === "exact" && (
                <div>
                  <label htmlFor="travelDate" className={labelClasses}>Date of Travel</label>
                  <input
                    type="date"
                    id="travelDate"
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className={inputClasses}
                  />
                </div>
              )}
              {knowsDate === "rough" && (
                <div>
                  <label htmlFor="roughDate" className={labelClasses}>Approximate date or month</label>
                  <input
                    type="text"
                    id="roughDate"
                    value={roughDate}
                    onChange={(e) => setRoughDate(e.target.value)}
                    placeholder="e.g. Late June 2026, First week of August"
                    className={inputClasses}
                  />
                </div>
              )}

              {/* Pick-up time */}
              <div>
                <label htmlFor="pickupTime" className={labelClasses}>Pick-up time</label>
                <select
                  id="pickupTime"
                  value={pickupTimeSlot}
                  onChange={(e) => setPickupTimeSlot(e.target.value)}
                  className={selectClasses}
                >
                  <option value="">Select a time of day</option>
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                  <option value="exact">I know the exact time</option>
                </select>
              </div>

              {pickupTimeSlot === "exact" && (
                <div>
                  <label htmlFor="pickupExactTime" className={labelClasses}>Exact pick-up time</label>
                  <input
                    type="time"
                    id="pickupExactTime"
                    value={pickupExactTime}
                    onChange={(e) => setPickupExactTime(e.target.value)}
                    className={inputClasses}
                  />
                </div>
              )}

              {/* Return journey */}
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-card-foreground">Need a return journey?</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={returnNeeded}
                    onClick={() => setReturnNeeded(!returnNeeded)}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                      returnNeeded ? "bg-gold" : "bg-input"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full shadow-sm transition-transform ${
                        returnNeeded ? "translate-x-5 bg-navy" : "translate-x-0.5 bg-card"
                      }`}
                    />
                    <span className="sr-only">Toggle return journey</span>
                  </button>
                </div>

                {returnNeeded && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="returnTime" className={labelClasses}>Return time</label>
                      <select
                        id="returnTime"
                        value={returnTimeSlot}
                        onChange={(e) => setReturnTimeSlot(e.target.value)}
                        className={selectClasses}
                      >
                        <option value="">Select a time of day</option>
                        {timeSlots.map((slot) => (
                          <option key={slot} value={slot}>{slot}</option>
                        ))}
                        <option value="exact">I know the exact time</option>
                      </select>
                    </div>

                    {returnTimeSlot === "exact" && (
                      <div>
                        <label htmlFor="returnExactTime" className={labelClasses}>Exact return time</label>
                        <input
                          type="time"
                          id="returnExactTime"
                          value={returnExactTime}
                          onChange={(e) => setReturnExactTime(e.target.value)}
                          className={inputClasses}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ---------- Step 4: Extras ---------- */}
          {step === 4 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-card-foreground">Anything Else?</h3>
              <p className={hintClasses}>
                Nearly done! Add any extra details or special requirements below.
              </p>

              <div>
                <label htmlFor="notes" className={labelClasses}>
                  Additional Notes / Special Requirements
                </label>
                <p className={hintClasses}>
                  Wheelchair access, child seats, extra stops, luggage &mdash; anything at all.
                </p>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                  placeholder="e.g. We'll have 3 large suitcases, need a child seat for a 2-year-old..."
                  className={`${inputClasses} mt-2 resize-none`}
                />
              </div>

              {/* Quick summary */}
              <div className="rounded-lg border border-border bg-background p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gold">Your Quote Summary</h4>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Journey</dt>
                    <dd className="font-medium text-card-foreground">{journeyType || "---"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Passengers</dt>
                    <dd className="font-medium text-card-foreground">{passengers || "---"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Pick-up</dt>
                    <dd className="font-medium text-card-foreground">
                      {pickupPostcode || pickupArea || "---"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Drop-off</dt>
                    <dd className="font-medium text-card-foreground">
                      {dropoffPostcode || dropoffArea || "---"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Date</dt>
                    <dd className="font-medium text-card-foreground">
                      {travelDate || roughDate || (knowsDate === "no" ? "TBC" : "---")}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Time</dt>
                    <dd className="font-medium text-card-foreground">
                      {pickupTimeSlot === "exact" ? pickupExactTime || "---" : pickupTimeSlot || "---"}
                    </dd>
                  </div>
                  {returnNeeded && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Return</dt>
                      <dd className="font-medium text-card-foreground">
                        {returnTimeSlot === "exact" ? returnExactTime || "---" : returnTimeSlot || "---"}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          )}

          {/* ---------- Step 5: About You ---------- */}
          {step === 5 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-card-foreground">Your Details</h3>
              <p className={hintClasses}>So we know who to send the quote to.</p>

              <div>
                <label htmlFor="fullName" className={labelClasses}>Full Name</label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className={inputClasses}
                />
              </div>

              <div>
                <label htmlFor="email" className={labelClasses}>Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className={inputClasses}
                />
              </div>

              <div>
                <label htmlFor="phone" className={labelClasses}>Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07000 000 000"
                  className={inputClasses}
                />
              </div>
            </div>
          )}

          {/* ---------- Error ---------- */}
          {stepError && (
            <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm font-medium text-destructive" role="alert">
              {stepError}
            </p>
          )}

          {/* ---------- Navigation ---------- */}
          <div className="mt-8 flex items-center gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="rounded-lg border border-border px-6 py-3 text-sm font-semibold text-card-foreground transition-colors hover:bg-secondary"
              >
                Back
              </button>
            )}

            <div className="flex-1" />

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={handleNext}
                className="rounded-lg bg-gold px-8 py-3 text-sm font-semibold text-navy transition-colors hover:bg-gold-light"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-gold px-8 py-3 text-sm font-semibold text-navy transition-colors hover:bg-gold-light disabled:opacity-50"
              >
                {loading ? "Sending..." : "Get My Free Quote"}
              </button>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {step < TOTAL_STEPS
              ? `Step ${step} of ${TOTAL_STEPS} \u2014 you can always go back and change things.`
              : "We\u2019ll get back to you within the hour. No spam, no hassle."}
          </p>
        </form>
      </div>
    </section>
  )
}
