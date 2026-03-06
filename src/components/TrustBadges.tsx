import { Shield, UserCheck, Star, MapPin } from "lucide-react";

const badges = [
  {
    icon: Shield,
    title: "Licensed & Insured",
    description: "Fully licensed and comprehensively insured for your peace of mind.",
  },
  {
    icon: UserCheck,
    title: "DBS Checked Drivers",
    description: "Every one of our drivers is DBS checked, vetted and fully trained.",
  },
  {
    icon: Star,
    title: "5-Star Rated",
    description: "Consistently rated 5 stars by our customers across Yorkshire.",
  },
  {
    icon: MapPin,
    title: "Yorkshire Based",
    description: "Proudly local. We know the roads, the routes and the region inside out.",
  },
];

const TrustBadges = () => {
  return (
    <section className="bg-background py-20 lg:py-28 border-t border-border">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {badges.map((badge) => (
            <div key={badge.title} className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold/10">
                <badge.icon className="h-7 w-7 text-gold" />
              </div>
              <h3 className="font-serif text-lg font-bold text-foreground">
                {badge.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {badge.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;
