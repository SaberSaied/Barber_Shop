import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UserCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

interface Employee {
  id: string;
  name: string;
  name_ar: string | null;
  role: string;
  schedule: string | null;
  image_url: string | null;
}

const Barbers = () => {
  const { t, i18n } = useTranslation();
  const [barbers, setBarbers] = useState<Employee[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("employees").select("id, name, name_ar, role, schedule").eq("is_active", true).eq("role", "barber");
      if (data) setBarbers(data as Employee[]);
    };
    fetch();
  }, []);

  if (barbers.length === 0) return null;

  const getDisplayName = (b: Employee) => {
    if (i18n.language === "ar" && b.name_ar) return b.name_ar;
    return b.name;
  };

  return (
    <section id="barbers" className="section-padding">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-primary ltr:tracking-[0.3em] uppercase rtl:text-lg mb-3">{t("barbers.tagline")}</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            {t("barbers.title")} <span className="text-gradient-gold">{t("barbers.titleHighlight")}</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">{t("barbers.subtitle")}</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {barbers.map((barber, idx) => (
            <motion.div
              key={barber.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15 }}
              className="group"
            >
              <div className="relative overflow-hidden rounded-xl mb-4 aspect-[4/5] bg-secondary flex items-center justify-center">
                {barber.image_url ? (
                  <img src={barber.image_url} alt={barber.name} className="w-full h-full object-cover" />
                ) : (
                  <UserCheck className="w-20 h-20 text-muted-foreground/30" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
              </div>

              <h3 className="font-display text-xl font-semibold mb-1">{getDisplayName(barber)}</h3>
              <p className="text-primary text-sm font-medium mb-2">{t(`admin.${barber.role}`)}</p>
              {barber.schedule && (
                <span className="text-xs px-3 py-1 rounded-full bg-secondary text-secondary-foreground">
                  {barber.schedule}
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Barbers;