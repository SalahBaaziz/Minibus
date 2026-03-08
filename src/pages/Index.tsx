import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";

const Services = lazy(() => import("@/components/Services"));
const HowItWorks = lazy(() => import("@/components/HowItWorks"));
const Fleet = lazy(() => import("@/components/Fleet"));
const Reviews = lazy(() => import("@/components/Reviews"));
const TrustBadges = lazy(() => import("@/components/TrustBadges"));
const EnquiryForm = lazy(() => import("@/components/EnquiryForm"));
const Footer = lazy(() => import("@/components/Footer"));

const Index = () => {
  return (
    <div className="min-h-screen">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:bg-gold focus:text-navy focus:px-4 focus:py-2 focus:rounded-lg focus:font-semibold">
        Skip to main content
      </a>
      <Navbar />
      <Hero />
      <main id="main-content">
        <Suspense fallback={null}>
          <Services />
          <HowItWorks />
          <Fleet />
          <Reviews />
          <TrustBadges />
          <EnquiryForm />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default Index;
