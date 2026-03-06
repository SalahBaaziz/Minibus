import { Star } from "lucide-react";

const reviews = [
  {
    text: "Brilliant service from start to finish. Booked a 16-seater for my daughter's wedding and the driver was absolutely lovely. Everyone commented on how smooth the whole thing was. Would highly recommend!",
    name: "Sarah T.",
    location: "Harrogate",
    time: "2 weeks ago",
  },
  {
    text: "Used Yorkshire Minibus Hire for our company Christmas do. Driver was bang on time, really friendly, and got us all home safe. Already rebooked for next year's summer party!",
    name: "James M.",
    location: "Leeds",
    time: "1 month ago",
  },
  {
    text: "Absolutely fantastic for our school trip to York. The driver was DBS checked which gave us total peace of mind. The kids loved the comfy seats. Great value for money too.",
    name: "Karen B.",
    location: "Sheffield",
    time: "3 weeks ago",
  },
  {
    text: "We booked the 12-seater for an airport run to Manchester. On time, clean vehicle, friendly driver. Can't ask for more really. Will definitely be using again for our next holiday.",
    name: "Dave & Lisa P.",
    location: "Bradford",
    time: "1 month ago",
  },
  {
    text: "Best minibus company in Yorkshire, hands down. We've used them three times now for hen dos and they never let us down. The booking process is dead easy too. Five stars!",
    name: "Rachel H.",
    location: "York",
    time: "2 months ago",
  },
];

const Reviews = () => {
  return (
    <section id="reviews" className="bg-navy py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold">
            What Our Customers Say
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-primary-foreground sm:text-4xl">
            5-Star Rated Across Yorkshire
          </h2>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review, i) => (
            <div
              key={i}
              className="rounded-xl bg-navy-light/40 border border-navy-light/30 p-6"
            >
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-gold text-gold" />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-primary-foreground/80 italic">
                "{review.text}"
              </p>
              <div className="mt-4 pt-4 border-t border-navy-light/30">
                <p className="text-sm font-semibold text-primary-foreground">
                  {review.name}
                </p>
                <p className="text-xs text-primary-foreground/60">
                  {review.location} · {review.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Reviews;
