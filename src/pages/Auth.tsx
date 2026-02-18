import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Scissors, Mail, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/admin");
    } catch (error: any) {
      toast({
        title: t("auth.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <Scissors className="w-8 h-8 text-primary" />
            <span className="font-display text-2xl font-bold">{t("nav.brandName")}</span>
          </Link>
          <h1 className="font-display text-3xl font-bold mb-2">
            {t("auth.welcomeBack")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("auth.loginSub")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card rounded-xl p-8 space-y-5">
          <div>
            <label className="text-sm font-medium mb-1.5 block">{t("auth.email")}</label>
            <div className="relative">
              <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.emailPlaceholder")}
                className="ps-10 bg-secondary border-border"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">{t("auth.password")}</label>
            <div className="relative">
              <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="ps-10 bg-secondary border-border"
                required
                minLength={6}
              />
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full bg-gradient-gold text-primary-foreground font-semibold tracking-wide uppercase h-12"
            disabled={loading}
          >
            {loading ? t("auth.loading") : t("auth.login")}
          </Button>
        </form>

        <div className="flex flex-col justify-center items-center gap-2 mt-4">
          <Link to='/'>
            <Button
              type="button"
              className="hover:text-primary hover:bg-transparent font-semibold tracking-wide uppercase h-12"
              variant="outline"
            >
              {t("auth.return")} <ArrowRight className="w-4 h-4 font-bold inline-block rtl:rotate-180" />
            </Button>
          </Link>
          <LanguageSwitcher />
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
