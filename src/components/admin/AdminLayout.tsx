import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, ShoppingCart, Clock, Wrench, Users, UserCog, Scissors, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from "@/hooks/useAuth";

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { t } = useTranslation();
  const { user, loading, signOut } = useAuth();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (user) {
      supabase.rpc('has_role', { _user_id: user.id, _role: 'admin'}).then(({ data }) => {
        setIsAdmin(!!data);
      });
    }
  }, [user]);

  if (loading || (user && isAdmin === null)) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user || isAdmin === false) return <Navigate to="/auth" replace />;

  const sidebarLinks = [
    { label: t("admin.dashboard"), href: "/admin", icon: LayoutDashboard },
    { label: t("admin.pos"), href: "/admin/pos", icon: ShoppingCart },
    { label: t("admin.attendance"), href: "/admin/attendance", icon: Clock },
    { label: t("admin.services"), href: "/admin/services", icon: Wrench },
    
    { label: t("admin.employees"), href: "/admin/employees", icon: UserCog },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 bg-sidebar border-e border-sidebar-border flex flex-col fixed inset-y-0 start-0 z-40">
        <div className="p-6 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2">
            <Scissors className="w-6 h-6 text-sidebar-primary" />
            <span className="font-display text-lg font-bold text-sidebar-foreground">{t("nav.brandName")}</span>
          </Link>
          <p className="text-xs text-muted-foreground mt-1">{t("admin.panel")}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {sidebarLinks.map((link) => {
            const isActive = location.pathname === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-1">
          <LanguageSwitcher />
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            {t("auth.signOut")}
          </button>
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            {t("admin.backToSite")}
          </Link>
        </div>
      </aside>

      <main className="flex-1 ms-64 p-8">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
