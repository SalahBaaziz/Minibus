import { useState } from "react";

const journeyTypes = [
"Wedding",
"Airport Transfer",
"Corporate",
"School Trip",
"Night Out",
"Other"];


const passengerRanges = ["1–4", "5–8", "9–12", "13–16", "Not sure yet"];

const EnquiryForm = () => {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [returnJourney, setReturnJourney] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    journeyType: "",
    pickupPostcode: "",
    dropoffPostcode: "",
    date: "",
    time: "",
    passengers: "",
    returnTime: "",
    notes: ""
  });

  const update = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          returnJourney,
          returnTime: returnJourney ? formData.returnTime : null
        })
      });
    } catch {


























      // silently handle - show success anyway per spec
    }setSubmitted(true);};const stepLabels = ["Journey", "Locations", "Date & Time", "Extras", "About You"];if (submitted) {return <section id="enquiry" className="bg-navy py-20 lg:py-28">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <div className="rounded-xl bg-navy-light/40 border border-navy-light/30 p-12">
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
      </section>;}const inputClass = "w-full rounded-lg border border-navy-light/30 bg-navy-light/20 px-4 py-3 text-sm text-primary-foreground placeholder:text-primary-foreground/40 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/50";const labelClass = "block text-sm font-medium text-primary-foreground/80 mb-1.5";return <section id="enquiry" className="py-20 lg:py-28 bg-stone-300">
      <div className="mx-auto max-w-2xl px-6">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold">
            Get a Free Quote
          </p>
          <h2 className="mt-3 font-serif text-3xl sm:text-4xl font-medium text-navy-dark">
            Tell Us About Your Journey
          </h2>
          <p className="mt-3 text-navy-light">
            Don't worry if you don't have all the details yet — just give us what you can.
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {stepLabels.map((label, i) => <div key={i} className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${step === i + 1 ? "bg-gold text-navy" : step > i + 1 ? "bg-gold/30 text-gold" : "bg-navy-light/30 text-primary-foreground/40"}`}>
              
                {i + 1}
              </div>
              <span className="hidden sm:inline text-xs text-navy-dark">{label}</span>
              {i < stepLabels.length - 1 && <div className="w-6 h-px bg-navy-light/30" />}
            </div>)}
        </div>

        <div className="rounded-xl border border-navy-light/30 p-8 bg-gold-dark">

          {/* Step 1: Journey */}
          {step === 1 &&
        <div className="space-y-5">
              <div>
                <h3 className="font-serif text-lg font-bold text-primary-foreground">Journey Details</h3>
                <p className="text-sm text-primary-foreground/60 mt-1">What kind of trip are you planning?</p>
              </div>
              <div>
                <label className={labelClass}>What's the occasion?</label>
                <select
              className={inputClass}
              value={formData.journeyType}
              onChange={(e) => update("journeyType", e.target.value)}>
                
                  <option value="">Select a journey type</option>
                  {journeyTypes.map((t) =>
              <option key={t} value={t}>{t}</option>
              )}
                </select>
              </div>
              <div>
                <label className={labelClass}>How many passengers?</label>
                <select
              className={inputClass}
              value={formData.passengers}
              onChange={(e) => update("passengers", e.target.value)}>
                
                  <option value="">Select a range</option>
                  {passengerRanges.map((r) =>
              <option key={r} value={r}>{r}</option>
              )}
                </select>
              </div>
            </div>
        }

          {/* Step 2: Locations */}
          {step === 2 &&
        <div className="space-y-5">
              <div>
                <h3 className="font-serif text-lg font-bold text-primary-foreground">Pick-up & Drop-off</h3>
                <p className="text-sm text-primary-foreground/60 mt-1">
                  Don't have an exact postcode? A town or area name is fine.
                </p>
              </div>
              <div>
                <label className={labelClass}>Pick-up location</label>
                <input
              className={inputClass}
              placeholder="e.g. LS1 4AP or Leeds City Centre"
              value={formData.pickupPostcode}
              onChange={(e) => update("pickupPostcode", e.target.value)} />
              
              </div>
              <div>
                <label className={labelClass}>Drop-off location</label>
                <input
              className={inputClass}
              placeholder="e.g. HG1 1BB or Harrogate town centre"
              value={formData.dropoffPostcode}
              onChange={(e) => update("dropoffPostcode", e.target.value)} />
              
              </div>
            </div>
        }

          {/* Step 3: Date & Time */}
          {step === 3 &&
        <div className="space-y-5">
              <div>
                <h3 className="font-serif text-lg font-bold text-primary-foreground">When Do You Need Us?</h3>
                <p className="text-sm text-primary-foreground/60 mt-1">
                  A rough date is fine if you're not sure yet.
                </p>
              </div>
              <div>
                <label className={labelClass}>Date of travel</label>
                <input
              className={inputClass}
              type="date"
              value={formData.date}
              onChange={(e) => update("date", e.target.value)} />
              
              </div>
              <div>
                <label className={labelClass}>Pick-up time</label>
                <input
              className={inputClass}
              type="time"
              value={formData.time}
              onChange={(e) => update("time", e.target.value)} />
              
              </div>
              <div>
                <label className={labelClass}>Do you need a return journey?</label>
                <div className="flex gap-4 mt-2">
                  <button
                type="button"
                onClick={() => setReturnJourney(true)}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                returnJourney ?
                "bg-gold text-navy" :
                "bg-navy-light/30 text-primary-foreground/60 hover:bg-navy-light/50"}`
                }>
                  
                    Yes
                  </button>
                  <button
                type="button"
                onClick={() => setReturnJourney(false)}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                !returnJourney ?
                "bg-gold text-navy" :
                "bg-navy-light/30 text-primary-foreground/60 hover:bg-navy-light/50"}`
                }>
                  
                    No
                  </button>
                </div>
              </div>
              {returnJourney &&
          <div>
                  <label className={labelClass}>Return pick-up time</label>
                  <input
              className={inputClass}
              type="time"
              value={formData.returnTime}
              onChange={(e) => update("returnTime", e.target.value)} />
              
                </div>
          }
            </div>
        }

          {/* Step 4: Extras */}
          {step === 4 &&
        <div className="space-y-5">
              <div>
                <h3 className="font-serif text-lg font-bold text-primary-foreground">Anything Else?</h3>
                <p className="text-sm text-primary-foreground/60 mt-1">
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

          {/* Step 5: About You */}
          {step === 5 &&
        <div className="space-y-5 text-navy-light">
              <div className="text-base">
                <h3 className="font-serif text-lg font-bold text-primary-foreground">Almost Done!</h3>
                <p className="text-sm mt-1 text-navy-dark">Where should we send your quote?</p>
              </div>
              <div className="text-navy-light">
                <label className="text-primary-foreground">Full Name</label>
                <input
              className={inputClass}
              placeholder="e.g. John Smith"
              value={formData.fullName}
              onChange={(e) => update("fullName", e.target.value)} />
              
              </div>
              <div>
                <label className="text-primary-foreground">Email Address</label>
                <input
              className={inputClass}
              type="email"
              placeholder="e.g. john@example.com"
              value={formData.email}
              onChange={(e) => update("email", e.target.value)} />
              
              </div>
              <div className="text-primary-foreground">
                <label className="">Phone Number</label>
                <input
              className={inputClass}
              type="tel"
              placeholder="e.g. 07700 900000"
              value={formData.phone}
              onChange={(e) => update("phone", e.target.value)} />
              
              </div>
            </div>
        }

          {/* Navigation */}
          <div className="mt-8 flex justify-between">
            {step > 1 ?
          <button
            onClick={() => setStep(step - 1)}
            className="rounded-lg border border-navy-light/30 px-6 py-2.5 text-sm font-medium text-primary-foreground/70 hover:border-gold/30 transition-colors">
              
                Back
              </button> :

          <div />
          }
            {step < 5 ?
          <button
            onClick={() => setStep(step + 1)}
            className="px-6 py-2.5 text-sm font-semibold text-navy transition-colors rounded-xl bg-muted">
              
                Next
              </button> :

          <button
            onClick={handleSubmit}
            className="rounded-lg bg-gold px-8 py-2.5 text-sm font-semibold text-navy hover:bg-gold-light transition-colors">
              
                Send Enquiry
              </button>
          }
          </div>
        </div>
      </div>
    </section>;

};

export default EnquiryForm;