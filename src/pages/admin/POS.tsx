import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, CreditCard, Banknote, Plus, ShoppingCart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

interface Employee {
  id: string;
  name: string;
  name_ar: string | null;
}

interface Booking {
  id: string;
  customer_name: string;
  customer_phone: string;
  booking_date: string;
  booking_time: string;
  barber_preference: string | null;
  status: string;
  notes: string | null;
  service: { id: string; name_en: string; name_ar: string; price: number } | null;
}

interface ServiceOption {
  id: string;
  name_en: string;
  name_ar: string;
  price: number;
}

interface CartItem {
  name: string;
  price: number;
  [key: string]: string | number;
}

interface Bill {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  status: string;
  created_at: string;
}

const POS = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loadingBills, setLoadingBills] = useState(true);
  const [allServices, setAllServices] = useState<ServiceOption[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  const fetchData = async () => {
    const [bookRes, billRes, srvRes, empRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("id, customer_name, customer_phone, booking_date, booking_time, barber_preference, status, notes, service:services(id, name_en, name_ar, price)")
        .eq("status", "pending")
        .order("booking_date", { ascending: true }),
      supabase
        .from("bills")
        .select("*")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("services").select("id, name_en, name_ar, price").eq("is_active", true).order("category"),
      supabase.from("employees").select("id, name, name_ar"),
    ]);
    if (bookRes.data) setBookings(bookRes.data as Booking[]);
    if (billRes.data) setBills(billRes.data as unknown as Bill[]);
    if (srvRes.data) setAllServices(srvRes.data as ServiceOption[]);
    if (empRes.data) setEmployees(empRes.data as Employee[]);
    setLoadingBills(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getBarberName = (barberId: string | null) => {
    if (!barberId) return "—";
    const emp = employees.find(e => e.id === barberId);
    if (!emp) return "—";
    return i18n.language === "ar" && emp.name_ar ? emp.name_ar : emp.name;
  };

  const getMultiServiceNames = (b: Booking) => {
    const serviceIds = b.notes ? b.notes.split(",").map(s => s.trim()) : [];
    if (serviceIds.length > 0) {
      const names = serviceIds.map(sid => {
        const srv = allServices.find(s => s.id === sid);
        if (!srv) return null;
        return i18n.language === "ar" ? srv.name_ar : srv.name_en;
      }).filter(Boolean);
      if (names.length > 0) return names.join(", ");
    }
    if (b.service) return i18n.language === "ar" ? b.service.name_ar : b.service.name_en;
    return "—";
  };

  const selectBooking = (b: Booking) => {
    const serviceIds = b.notes ? b.notes.split(",").map(s => s.trim()) : [];
    const items: CartItem[] = [];

    if (serviceIds.length > 0) {
      serviceIds.forEach(sid => {
        const srv = allServices.find(s => s.id === sid);
        if (srv) {
          items.push({ name: i18n.language === "ar" ? srv.name_ar : srv.name_en, price: Number(srv.price) });
        }
      });
    }

    if (items.length === 0 && b.service) {
      items.push({
        name: i18n.language === "ar" ? b.service.name_ar : b.service.name_en,
        price: Number(b.service.price),
      });
    }

    setCart(items);
    setSelectedBookingId(b.id);
    setDiscount(0);
  };

  const addManualService = (srv: ServiceOption) => {
    const name = i18n.language === "ar" ? srv.name_ar : srv.name_en;
    setCart(prev => [...prev, { name, price: Number(srv.price) }]);
    setSelectedBookingId(null);
  };

  const removeFromCart = (index: number) => {
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);
    if (newCart.length === 0) setSelectedBookingId(null);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const total = Math.max(0, subtotal - discount);

  const checkout = async (method: string) => {
    if (cart.length === 0) return;
    const bill = { items: cart, subtotal, discount, total, payment_method: method, status: "completed" };
    const { data, error } = await supabase.from("bills").insert(bill).select().single();
    if (error) {
      toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
      return;
    }

    if (selectedBookingId) {
      await supabase.from("bookings").update({ status: "completed" }).eq("id", selectedBookingId);
    }

    if (data) setBills((prev) => [data as unknown as Bill, ...prev]);
    setCart([]);
    setDiscount(0);
    setSelectedBookingId(null);

    const { data: updated } = await supabase
      .from("bookings")
      .select("id, customer_name, customer_phone, booking_date, booking_time, barber_preference, status, notes, service:services(id, name_en, name_ar, price)")
      .eq("status", "pending")
      .order("booking_date", { ascending: true });
    if (updated) setBookings(updated as Booking[]);
    toast({ title: t("admin.billSaved"), description: `$${total}` });
  };

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);

  const filterBills = (start: Date, end: Date) =>
    bills.filter((b) => { const d = new Date(b.created_at); return d >= start && d <= end; });

  const dailyBills = bills.filter((b) => b.created_at.startsWith(todayStr));
  const weeklyBills = filterBills(weekStart, weekEnd);
  const monthlyBills = filterBills(monthStart, monthEnd);
  const annualBills = filterBills(yearStart, yearEnd);
  const calcTotal = (bs: Bill[]) => bs.reduce((s, b) => s + Number(b.total), 0);

  const periodData = [
    { key: "daily", label: t("admin.daily"), bills: dailyBills, total: calcTotal(dailyBills) },
    { key: "weekly", label: t("admin.weekly"), bills: weeklyBills, total: calcTotal(weeklyBills) },
    { key: "monthly", label: t("admin.monthly"), bills: monthlyBills, total: calcTotal(monthlyBills) },
    { key: "annual", label: t("admin.annual"), bills: annualBills, total: calcTotal(annualBills) },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("admin.pointOfSale")}</h1>
          <p className="text-muted-foreground mt-1">{t("admin.posSubtitle")}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Pending Bookings */}
          <div className="lg:col-span-2">
            <h2 className="font-display text-lg font-semibold mb-4">{t("admin.pendingBookings")}</h2>
            {bookings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{t("admin.noBookings")}</p>
            ) : (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {bookings.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => selectBooking(b)}
                    className={`glass-card rounded-xl p-4 text-start transition-colors ${selectedBookingId === b.id ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/30"}`}
                  >
                    <p className="font-medium text-sm">{b.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{b.customer_phone}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {b.booking_date} · #{b.booking_time}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("admin.barber")}: {getBarberName(b.barber_preference)}
                    </p>
                    <p className="text-primary font-display font-bold text-sm mt-1">
                      {getMultiServiceNames(b)}
                    </p>
                    <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                      {t("admin.pending")}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Payment Form */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">{t("admin.cart")}</h2>
              <Button variant="outline" size="sm" onClick={() => setManualDialogOpen(true)}>
                <Plus className="w-4 h-4 ltr:mr-1 rtl:ml-1" /> {t("admin.addBill")}
              </Button>
            </div>
            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t("admin.selectBookingToPay")}</p>
            ) : (
              <div className="space-y-3 mb-6">
                {cart.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.price} {t("booking.price_mark")}</span>
                      <button onClick={() => removeFromCart(i)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("admin.subtotal")}</span>
                <span>{subtotal} {t("booking.price_mark")}</span>
              </div>
              <Input type="number" placeholder={t("admin.discount")} value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value))} className="bg-secondary border-border h-9 text-sm" />
              <div className="flex items-center justify-between font-bold text-lg font-display">
                <span>{t("admin.total")}</span>
                <span className="text-primary">{total} {t("booking.price_mark")}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button className="bg-gradient-gold text-primary-foreground" disabled={cart.length === 0} onClick={() => checkout("card")}>
                  <CreditCard className="w-4 h-4 ltr:mr-1 rtl:ml-1" /> {t("admin.card")}
                </Button>
                <Button variant="outline" disabled={cart.length === 0} onClick={() => checkout("cash")}>
                  <Banknote className="w-4 h-4 ltr:mr-1 rtl:ml-1" /> {t("admin.cash")}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Bills Report */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="font-display text-lg font-semibold mb-4">{t("admin.billsReport")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {periodData.map((p) => (
              <div key={p.key} className="bg-secondary rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">{p.label}</p>
                <p className="text-xl font-bold font-display text-primary">{p.total.toFixed(0)} {t("booking.price_mark")}</p>
                <p className="text-xs text-muted-foreground">{p.bills.length} {t("admin.bills")}</p>
              </div>
            ))}
          </div>

          <Tabs defaultValue="daily">
            <TabsList className="mb-4">
              {periodData.map((p) => (
                <TabsTrigger key={p.key} value={p.key}>{p.label}</TabsTrigger>
              ))}
            </TabsList>
            {periodData.map((p) => (
              <TabsContent key={p.key} value={p.key}>
                {loadingBills ? (
                  <p className="text-muted-foreground text-center py-4">{t("auth.loading")}</p>
                ) : p.bills.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">{t("admin.noBills")}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-start py-2 text-muted-foreground font-medium">#</th>
                          <th className="text-start py-2 text-muted-foreground font-medium">{t("admin.dateTime")}</th>
                          <th className="text-start py-2 text-muted-foreground font-medium">{t("admin.items")}</th>
                          <th className="text-start py-2 text-muted-foreground font-medium">{t("admin.subtotal")}</th>
                          <th className="text-start py-2 text-muted-foreground font-medium">{t("admin.discount")}</th>
                          <th className="text-start py-2 text-muted-foreground font-medium">{t("admin.total")}</th>
                          <th className="text-start py-2 text-muted-foreground font-medium">{t("admin.payment")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.bills.map((b, idx) => (
                          <tr key={b.id} className="border-b border-border/50">
                            <td className="py-2 text-muted-foreground">{idx + 1}</td>
                            <td className="py-2 text-muted-foreground text-xs">{format(new Date(b.created_at), "yyyy-MM-dd HH:mm")}</td>
                            <td className="py-2 text-xs max-w-[200px] truncate">
                              {Array.isArray(b.items) ? b.items.map((i: CartItem) => i.name).join(", ") : "—"}
                            </td>
                            <td className="py-2">{b.subtotal} {t("booking.price_mark")}</td>
                            <td className="py-2 text-muted-foreground">{b.discount} {t("booking.price_mark")}</td>
                            <td className="py-2 text-primary font-semibold">{b.total} {t("booking.price_mark")}</td>
                            <td className="py-2">
                              <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                                {b.payment_method === "card" ? t("admin.card") : t("admin.cash")}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border">
                          <td colSpan={5} className="py-3 font-bold text-end">{t("admin.total")}</td>
                          <td></td>
                          <td className="py-3 text-primary font-bold text-lg">{p.total.toFixed(0)} {t("booking.price_mark")}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>

      {/* Manual Bill Dialog */}
      <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.addBill")}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto flex flex-wrap gap-2">
            {allServices.map((srv) => (
              <button
                key={srv.id}
                onClick={() => addManualService(srv)}
                className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border bg-secondary hover:border-primary/50 transition-all text-start"
              >
                <span className="font-medium text-sm">{i18n.language === "ar" ? srv.name_ar : srv.name_en}</span>
                <span className="text-primary font-semibold">{srv.price} {t("booking.price_mark")}</span>
              </button>
            ))}
            <Button onClick={() => setManualDialogOpen(false)}
              className="bg-gradient-gold text-primary-foreground w-full">Select</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default POS;