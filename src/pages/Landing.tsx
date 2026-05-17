import Navbar from "../components/f64/Navbar";
import HeroSection from "../components/f64/HeroSection";
import MockTestSection from "../components/f64/MockTestSection";
import TrustSection from "../components/f64/TrustSection";
import AboutSection from "../components/f64/AboutSection";
import FeaturesSection from "../components/f64/FeaturesSection";
import ResultsSection from "../components/f64/ResultsSection";
import TestimonialsSection from "../components/f64/TestimonialsSection";
import FAQSection from "../components/f64/FAQSection";
import UrgencySection from "../components/f64/UrgencySection";
import Footer from "../components/f64/Footer";
import WhatsAppButton from "../components/f64/WhatsAppButton";
import { useScrollReveal } from "../hooks/useScrollReveal";

export default function Landing() {
  useScrollReveal();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <HeroSection />
      <MockTestSection />
      <TrustSection />
      <AboutSection />
      <FeaturesSection />
      <ResultsSection />
      <TestimonialsSection />
      <FAQSection />
      <UrgencySection />
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
