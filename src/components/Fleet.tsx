import { Wind, Usb, ArmchairIcon, Luggage, Speaker, LucideIcon } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  label: string;
}

interface Vehicle {
  image: string;
  capacity: string;
  title: string;
  description: string;
  features: Feature[];
}

const vehicles: Vehicle[] = [
{
  image: "/images/minibus-8-seater.jpg",
  capacity: "Up to 8 passengers",
  title: "8 Seater Minibus",
  description: "Perfect for airport transfers, small group outings and intimate celebrations. Compact, comfortable and easy to park.",
  features: [
  { icon: Wind, label: "Air conditioning" },
  { icon: Usb, label: "USB charging" },
  { icon: ArmchairIcon, label: "Leather seats" },
  { icon: Luggage, label: "Luggage space" }]

},
{
  image: "/images/minibus-12-seater.jpg",
  capacity: "Up to 12 passengers",
  title: "12 Seater Minibus",
  description: "Our most popular choice. Ideal for family events, corporate outings and medium-sized groups heading anywhere in Yorkshire.",
  features: [
  { icon: Wind, label: "Air conditioning" },
  { icon: Usb, label: "USB charging" },
  { icon: ArmchairIcon, label: "Reclining seats" },
  { icon: Luggage, label: "Extra legroom" }]

},
{
  image: "/images/minibus-16-seater.jpg",
  capacity: "Up to 16 passengers",
  title: "16 Seater Minibus",
  description: "The big one. Great for weddings, school trips and large group travel. Plenty of space for everyone and their luggage.",
  features: [
  { icon: Wind, label: "Air conditioning" },
  { icon: Usb, label: "USB charging" },
  { icon: Speaker, label: "PA system" },
  { icon: Luggage, label: "Large luggage hold" }]

}];


const Fleet = () => {
  return (
    <section id="fleet" className="bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold">
            Our Fleet
          </p>
          <h2 className="mt-3 font-serif text-3xl text-foreground sm:text-4xl font-normal">
            Choose the Right Vehicle for Your Group
          </h2>
        </div>
        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {vehicles.map((v) =>
          <div
            key={v.title}
            className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-lg">
            
              <div className="relative h-48 overflow-hidden">
                <img
                src={v.image}
                alt={v.title}
                loading="lazy"
                decoding="async"
                width={400}
                height={300}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="h-full w-full object-cover" />
              
                <div className="absolute top-4 right-4 rounded-full bg-navy/80 px-3 py-1 text-xs font-semibold text-primary-foreground">
                  {v.capacity}
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-serif text-xl font-bold text-card-foreground">
                  {v.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {v.description}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {v.features.map((f) =>
                <div key={f.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <f.icon className="h-3.5 w-3.5 text-gold" />
                      {f.label}
                    </div>
                )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>);

};

export default Fleet;