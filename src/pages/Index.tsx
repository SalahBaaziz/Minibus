import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import HowItWorks from "@/components/HowItWorks";
import Fleet from "@/components/Fleet";
import Reviews from "@/components/Reviews";
import TrustBadges from "@/components/TrustBadges";
import EnquiryForm from "@/components/EnquiryForm";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Services />
      <HowItWorks />
      <Fleet />
      <Reviews />
      <TrustBadges />
      <EnquiryForm />
      <Footer />
    </div>
  );
};

export default Index;
