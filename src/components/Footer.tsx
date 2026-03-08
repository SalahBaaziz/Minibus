import { Phone, Mail, Facebook, Instagram, Twitter } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-navy-dark py-16 border-t border-navy-light/20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-gold">Yorkshire Minibus Hire</h3>
            <p className="mt-3 text-sm leading-relaxed text-primary-foreground/60">
              Yorkshire's trusted minibus hire service. Comfortable, reliable group travel for every occasion.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-primary-foreground/80">Services</h4>
            <ul className="mt-3 space-y-2 text-sm text-primary-foreground/60">
              <li>Weddings</li>
              <li>Airport Transfers</li>
              <li>Corporate Travel</li>
              <li>School Trips</li>
              <li>Events & Nights Out</li>
              <li>Private Hire</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-primary-foreground/80">Contact</h4>
            <ul className="mt-3 space-y-3 text-sm text-primary-foreground/60">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gold" />
                07883748155
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gold" />
                info@yorkshireminibus.co.uk
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-primary-foreground/80">Follow Us</h4>
            <div className="mt-3 flex gap-3">
              <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-light/30 text-primary-foreground/60 hover:bg-gold/20 hover:text-gold transition-colors">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-light/30 text-primary-foreground/60 hover:bg-gold/20 hover:text-gold transition-colors">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-light/30 text-primary-foreground/60 hover:bg-gold/20 hover:text-gold transition-colors">
                <Twitter className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-navy-light/20 text-center text-xs text-primary-foreground/40">
          © {new Date().getFullYear()} Yorkshire Minibus Hire. All rights reserved.
          <span className="mx-2">·</span>
          <a href="/admin-login" className="text-primary-foreground/10 hover:text-primary-foreground/30 transition-colors">⚙</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
