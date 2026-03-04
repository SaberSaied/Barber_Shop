import { motion } from "framer-motion";
import { Calendar, Star, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import heroImage from "@/assets/hero-barbershop.jpg";

const Hero = () => {
  const { t } = useTranslation();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroImage} alt="Luxury barbershop interior" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-background/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      <div className="relative z-10 container mx-auto px-4 pt-20">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-primary font-medium ltr:tracking-[0.3em] rtl:text-lg uppercase mb-4">
              {t("hero.tagline")}
            </p>
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.9] mb-6">
              {t("hero.title1")}
              <br />
              {t("hero.title2")} <span className="text-gradient-gold">{t("hero.title3")}</span>
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-lg mb-10 leading-relaxed">
              {t("hero.description")}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 mb-16"
          >
            <a href="#booking">
              <Button size="lg" className="bg-gradient-gold text-primary-foreground font-semibold tracking-wide uppercase text-sm px-8 h-14 glow-gold">
                <Calendar className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                {t("hero.bookAppointment")}
              </Button>
            </a>
            <a href="#services">
              <Button variant="outline" size="lg" className="border-border text-foreground hover:bg-secondary h-14 px-8 uppercase text-sm tracking-wide">
                {t("hero.viewServices")}
              </Button>
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
