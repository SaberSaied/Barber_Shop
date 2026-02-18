import { Scissors } from "lucide-react";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border py-8 px-4">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Scissors className="w-5 h-5 text-primary" />
          <span className="font-display text-lg font-bold text-foreground">{t("nav.brandName")}</span>
        </div>
        <p className="text-sm text-muted-foreground">{t("footer.rights")}</p>
      </div>
    </footer>
  );
};

export default Footer;
