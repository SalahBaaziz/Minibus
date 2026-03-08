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
      <Navbar />
      <Hero />
      <Suspense fallback={null}>
        <Services />
        <HowItWorks />
        <Fleet />
        <Reviews />
        <TrustBadges />
        <EnquiryForm />
        <Footer />
      </Suspense>
    </div>
  );
};

export default Index;
