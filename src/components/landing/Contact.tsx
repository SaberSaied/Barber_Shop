import { motion } from "framer-motion";
import { MapPin, Phone, MessageCircle, Instagram, Facebook } from "lucide-react";
import { SiTiktok } from "react-icons/si";
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
            { icon: MapPin, title: t("contact.location"), lines: [t("contact.address1"), t("contact.address2")], link: "https://maps.app.goo.gl/vzNigFct8z88uiyE9" },
            { icon: MessageCircle, title: t("contact.message"), lines: [t("contact.email")], link: `mailto:${t("contact.email")}` },
            { icon: Phone, title: t("contact.contactTitle"), lines: [t("contact.phone")], link: `tel:${t("contact.phone")}` },
          ].map((item, idx) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card rounded-xl p-6 text-center hover:-translate-y-5 transition-all hover:border hover:border-primary duration-300"
            >
              <a href={item.link} target="_blank" rel="noopener noreferrer">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-3">{item.title}</h3>
                {item.lines.map((line) => (
                  <p key={line} className="text-sm text-muted-foreground">{line}</p>
                ))}
              </a>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex justify-center gap-4 mt-12"
        >
          <a href="https://tiktok.com/@karzimabarbershop"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:bg-[#0b000a] w-8 h-8 rounded-md flex items-center justify-center text-white">
              <SiTiktok className="w-5 h-5" />
          </a>
          <a href="https://www.instagram.com/karizma.barber.shop1/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:bg-gradient-to-t hover:from-[#f5b829] hover:via-[#dd2a7b] hover:to-[#561d78] w-8 h-8 rounded-md flex items-center justify-center">
            <Instagram className="w-5 h-5" />
          </a>
          <a href="https://www.facebook.com/share/1HW3yQNWhX/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:bg-blue-900 w-8 h-8 rounded-md flex items-center justify-center">
            <Facebook className="w-5 h-5" />
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default Contact;
