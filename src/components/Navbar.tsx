import { useState } from "react";
import { Phone, Menu, X } from "lucide-react";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { label: "Services", href: "#services" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Fleet", href: "#fleet" },
    { label: "Reviews", href: "#reviews" },
    { label: "Contact", href: "#enquiry" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-navy-dark/95 backdrop-blur-sm border-b border-navy-light/20">
      <div className="mx-auto max-w-7xl px-6 flex items-center justify-between h-16">
        <a href="#" className="font-serif text-xl font-bold text-gold">
          Yorkshire Minibus Hire
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-primary-foreground/80 hover:text-gold transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <a href="tel:01234567890" className="flex items-center gap-2 text-sm text-primary-foreground/80 hover:text-gold transition-colors">
            <Phone className="w-4 h-4" />
            01234 567 890
          </a>
          <a
            href="#enquiry"
            className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-gold-light"
          >
            Get a Quote
          </a>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-primary-foreground"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-navy-dark border-t border-navy-light/20 px-6 py-4 space-y-3">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block text-sm font-medium text-primary-foreground/80 hover:text-gold transition-colors"
            >
              {link.label}
            </a>
          ))}
          <a href="tel:01234567890" className="flex items-center gap-2 text-sm text-primary-foreground/80">
            <Phone className="w-4 h-4" />
            01234 567 890
          </a>
          <a
            href="#enquiry"
            onClick={() => setMobileOpen(false)}
            className="block rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-navy text-center"
          >
            Get a Quote
          </a>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
