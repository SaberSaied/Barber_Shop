import { motion } from "framer-motion";
import { MapPin, Clock, Phone, MessageCircle, Instagram, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const Contact = () => {
  const { t } = useTranslation();

  return (
    <section id="contact" className="section-padding">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-primary ltr:tracking-[0.3em] uppercase rtl:text-lg mb-3">{t("contact.tagline")}</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            {t("contact.title")} <span className="text-gradient-gold">{t("contact.titleHighlight")}</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            { icon: MapPin, title: t("contact.location"), lines: [t("contact.address1"), t("contact.address2")] },
            { icon: Clock, title: t("contact.workingHours"), lines: [t("contact.weekdays"), t("contact.weekends")] },
            { icon: Phone, title: t("contact.contactTitle"), lines: [t("contact.phone"), t("contact.email")] },
          ].map((item, idx) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card rounded-xl p-6 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-3">{item.title}</h3>
              {item.lines.map((line) => (
                <p key={line} className="text-sm text-muted-foreground">{line}</p>
              ))}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex justify-center gap-4 mt-12"
        >
          <Button variant="outline" size="icon" className="rounded-full border-border hover:bg-transparent hover:border-green-700 hover:text-green-700">
            <MessageCircle className="w-5 h-5" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-full border-border hover:bg-transparent hover:border-pink-500 hover:text-pink-500">
            <Instagram className="w-5 h-5" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-full border-border hover:bg-transparent hover:border-blue-700 hover:text-blue-700">
            <Facebook className="w-5 h-5" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default Contact;
