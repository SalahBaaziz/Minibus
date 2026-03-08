import { ClipboardList, MessageSquareQuote, CheckCircle } from "lucide-react";

const steps = [
{
  icon: ClipboardList,
  number: "1",
  title: "Fill Out the Form",
  description: "Tell us where you're going, when, and how many passengers. Takes less than two minutes."
},
{
  icon: MessageSquareQuote,
  number: "2",
  title: "Get Your Quote",
  description: "We'll get back to you within the hour with a clear, no-obligation quote. No hidden fees."
},
{
  icon: CheckCircle,
  number: "3",
  title: "Confirm & Travel",
  description: "Happy with the price? Confirm your booking and leave the rest to us. Simple as that."
}];


const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-stone-300">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold">
            Easy as 1-2-3
          </p>
          <h2 className="mt-3 font-serif text-3xl sm:text-4xl text-navy-dark font-normal">
            How It Works
          </h2>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {steps.map((step) =>
          <div key={step.number} className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-gold bg-navy-dark">
                {step.number}
              </div>
              <h3 className="font-serif text-xl font-bold text-navy-dark">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-navy-light">
                {step.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>);

};

export default HowItWorks;