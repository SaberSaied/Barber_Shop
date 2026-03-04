import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { works1, works2, works3, works4, works5, works6 } from "@/assets";

const works = [
  { src: works1, alt: "Work 1" },
  { src: works2, alt: "Work 2" },
  { src: works3, alt: "Work 3" },
  { src: works4, alt: "Work 4" },
  { src: works5, alt: "Work 5" },
  { src: works6, alt: "Work 6" },
];

const Works = () => {
  const { t } = useTranslation();

  const duplicatedWorks = [...works, ...works];

  return (
    <section id="works" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-primary ltr:tracking-[0.3em] uppercase rtl:text-lg mb-3">{t("works.tagline")}</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            {t("works.title")} <span className="text-gradient-gold">{t("works.titleHighlight")}</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">{t("works.subtitle")}</p>
        </motion.div>
      </div>
      <div className="relative overflow-hidden">
        <motion.div
          className="flex gap-4"
          animate={{
            x: ["-100%", "0%"],
            transition: {
              ease: "linear",
              duration: 20,
              repeat: Infinity,
            },
          }}
        >
          {duplicatedWorks.map((work, index) => (
            <div key={index} className="flex-shrink-0 w-64 md:w-80 h-[400px]">
              <img
                src={work.src}
                alt={work.alt}
                className="w-full h-full object-cover rounded-lg shadow-lg"
              />
            </div>
          ))}
        </motion.div>
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-background via-transparent to-background"></div>
      </div>
    </section>
  );
};

export default Works;
