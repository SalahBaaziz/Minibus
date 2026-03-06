import { Heart, Plane, Briefcase, GraduationCap, PartyPopper, Car } from "lucide-react";

const services = [
{
  icon: Heart,
  title: "Weddings",
  description: "Make your big day seamless with elegant minibus transport for your guests. Punctual, stylish and stress-free."
},
{
  icon: Plane,
  title: "Airport Transfers",
  description: "Reliable pick-ups and drop-offs to all major airports including Leeds Bradford, Manchester and Doncaster."
},
{
  icon: Briefcase,
  title: "Corporate Travel",
  description: "Professional minibus hire for team events, conferences, meetings and company away days across Yorkshire."
},
{
  icon: GraduationCap,
  title: "School & College Trips",
  description: "Safe, DBS checked drivers for all school outings, sports fixtures and educational trips."
},
{
  icon: PartyPopper,
  title: "Events & Nights Out",
  description: "Enjoy your night worry-free. We handle the driving so your group can relax and have fun."
},
{
  icon: Car,
  title: "Private Hire",
  description: "Bespoke minibus hire for any occasion. Family gatherings, day trips, hen & stag dos — you name it."
}];


const Services = () => {
  return (
    <section id="services" className="bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold">
            What We Offer
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-foreground sm:text-4xl">
            Minibus Hire for Every Occasion
          </h2>
          <p className="mt-4 text-muted-foreground">
            Whatever the occasion, we've got the right vehicle and the right driver to get you there safely.
          </p>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) =>
          <div
            key={service.title}
            className="group rounded-xl border border-border p-8 transition-all hover:shadow-lg hover:border-gold/30 bg-primary-foreground text-navy-light">
            
              <div className="mb-5 h-12 w-12 text-navy-dark flex-row bg-navy-light border-navy flex items-center justify-center border-0 rounded-xl">
                <service.icon className="h-6 w-6 text-gold" />
              </div>
              <h3 className="font-serif text-xl font-bold text-card-foreground">
                {service.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {service.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>);

};

export default Services;