import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Services from "@/components/landing/Services";
import Barbers from "@/components/landing/Barbers";
import BookingSection from "@/components/landing/BookingSection";
import Contact from "@/components/landing/Contact";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Services />
      <Barbers />
      <BookingSection />
      <Contact />
      <Footer />
    </div>
  );
};

export default Index;
