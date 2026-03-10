import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Scissors, Clock, Sparkles, ScanFace, Icon, Star, Crown } from "lucide-react";
import {mustache, razorBlade} from "@lucide/lab"
import { useState } from "react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

interface ServicesType {
  id: string;
  name_en: string;
  name_ar: string | null;
  category: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  note: string | null;
  note_ar: string | null;
}

const Services = () => {
  const { t, i18n } = useTranslation();
  const [item, setItem] = useState<ServicesType[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const getData = async () => {
      const {data} = await supabase.from("services").select("*").eq("is_active", true).order("category", { ascending: true }).order("name_en", { ascending: true }).order("name_ar", { ascending: true }).order("name_en", { ascending: true });
      if (data) {
        setItem(data as unknown as ServicesType[]);
        const uniqueItem = data.map((cat) => cat.category).filter((item, index, arr) => arr.indexOf(item) === index);
        setCategories(uniqueItem);
      }
    };
    getData();
  }, []);

  return (
    <section id="services" className="section-padding bg-gradient-dark">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-primary ltr:tracking-[0.3em] uppercase rtl:text-lg mb-3">{t("services.tagline")}</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            {t("services.title")} <span className="text-gradient-gold">{t("services.titleHighlight")}</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">{t("services.subtitle")}</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {categories.map((category: string, idx: number) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15 }}
              className="glass-card rounded-xl p-6 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  {category === 'hair' ? <Scissors className="w-5 h-5 text-primary" /> :
                  category === 'beard' ? <Icon iconNode={mustache} className="w-5 h-5 text-primary" /> :
                  category === 'face' ? <ScanFace className="w-5 h-5 text-primary" /> :
                  category === 'packages' ? <Sparkles className="w-5 h-5 text-primary" /> :
                  category === 'vip' ? <Crown className="w-5 h-5 text-primary" /> :
                  <Clock className="w-5 h-5 text-primary" />}
                </div>
                <h3 className="font-display text-xl font-semibold capitalize">{t(`admin.${category}`)}</h3>
              </div>

              <div className="space-y-4">
                {item.filter((cat) => cat.category === category).map((s) => (
                  <div key={s.id} className="flex items-center justify-between border-b border-border/30 pb-3 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{i18n.language === "ar" && s.name_ar ? s.name_ar : s.name_en}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        {s.note && `(${s.note})`} {(i18n.language === "ar" && s.note_ar) && `(${s.note_ar})`}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {s.duration_minutes} {t("services.min")}
                      </p>
                    </div>
                    <span className="text-primary font-display font-bold text-lg">{s.price} {t("booking.price_mark")}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
