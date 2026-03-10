import { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { DollarSign, CalendarCheck, TrendingUp, Trash2, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { format, subDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface Employee {
  id: string;
  name: string;
  name_ar: string | null;
}

interface Booking {
  id: string;
  customer_name: string;
  customer_phone: string;
  service_id: string | null;
  barber_preference: string | null;
  booking_date: string;
  booking_time: string;
  status: string;
  notes: string | null;
  created_at: string;
}

interface Service {
  id: string;
  name_en: string;
  name_ar: string;
  price: number;
  category: string;
}

interface Bill {
  id: string;
  total: number;
  created_at: string;
  items: any;
}

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#10b981", "#6366f1", "#ec4899"];

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [bookingsRes, servicesRes, billsRes, empRes] = await Promise.all([
      supabase.from("bookings").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("services").select("id, name_en, name_ar, price, category"),
      supabase.from("bills").select("*").eq("status", "completed").order("created_at", { ascending: false }).limit(500),
      supabase.from("employees" as any).select("id, name, name_ar").eq("role", "barber"),
    ]);
    if (bookingsRes.data) setBookings(bookingsRes.data);
    if (servicesRes.data) setServices(servicesRes.data);
    if (billsRes.data) setBills(billsRes.data as any);
    if (empRes.data) setEmployees(empRes.data as any);
    setLoading(false);
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setEditDialogOpen(true);
  };

  const handleUpdateBooking = async () => {
    if (!editingBooking) return;

    // The service_id is now derived from the notes field for multi-select
    const serviceIds = editingBooking.notes ? editingBooking.notes.split(",").map(s => s.trim()) : [];

    const { data, error } = await supabase
      .from("bookings")
      .update({
        customer_name: editingBooking.customer_name,
        customer_phone: editingBooking.customer_phone,
        service_id: serviceIds.length > 0 ? serviceIds[0] : null, // Set primary service_id or null
        barber_preference: editingBooking.barber_preference,
        booking_date: editingBooking.booking_date,
        booking_time: editingBooking.booking_time,
        notes: editingBooking.notes,
      })
      .eq("id", editingBooking.id)
      .select()
      .single();

    if (error) {
      toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
    } else {
      setBookings(bookings.map(b => (b.id === editingBooking.id ? data as Booking : b)));
      setEditDialogOpen(false);
      setEditingBooking(null);
      toast({ title: t("admin.bookingUpdated") });
    }
  };

  useEffect(() => { fetchData(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) {
      toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
    } else {
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status } : b));
    }
  };

  const deleteBooking = async (id: string) => {
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) {
      toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
    } else {
      setBookings((prev) => prev.filter((b) => b.id !== id));
    }
  };

  const getServiceName = (serviceId: string | null) => {
    if (!serviceId) return "—";
    const s = services.find((srv) => srv.id === serviceId);
    if (!s) return "—";
    return i18n.language === "ar" ? s.name_ar : s.name_en;
  };

  const getMultiServiceNames = (b: Booking) => {
    const serviceIds = b.notes ? b.notes.split(",").map(s => s.trim()) : [];
    if (serviceIds.length > 0) {
      const names = serviceIds.map(sid => {
        const srv = services.find(s => s.id === sid);
        if (!srv) return null;
        return i18n.language === "ar" ? srv.name_ar : srv.name_en;
      }).filter(Boolean);
      if (names.length > 0) return names.join(", ");
    }
    return getServiceName(b.service_id);
  };

  const getBarberName = (barberId: string | null) => {
    if (!barberId) return "—";
    const emp = employees.find(e => e.id === barberId);
    if (!emp) return "—";
    return i18n.language === "ar" && emp.name_ar ? emp.name_ar : emp.name;
  };

  const groupedServices = useMemo(() => {
    return services.reduce((acc, service) => {
      const category = service.category || t('admin.uncategorized');
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(service);
      return acc;
    }, {} as Record<string, Service[]>);
  }, [services, t]);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayBookings = bookings.filter((b) => b.booking_date === todayStr);
  const todayRevenue = bills
    .filter((b) => b.created_at.startsWith(todayStr))
    .reduce((sum, b) => sum + Number(b.total), 0);

  const stats = [
    { label: t("admin.todayRevenue"), value: `$${todayRevenue}`, icon: DollarSign },
    { label: t("admin.bookingsToday"), value: String(todayBookings.length), icon: CalendarCheck },
    { label: t("admin.totalBookings"), value: String(bookings.length), icon: TrendingUp },
  ];

  // Revenue chart data (last 7 days)
  const revenueChartData = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dateStr = format(d, "yyyy-MM-dd");
    const dayTotal = bills
      .filter((b) => b.created_at.startsWith(dateStr))
      .reduce((sum, b) => sum + Number(b.total), 0);
    return { day: format(d, "EEE"), revenue: dayTotal };
  });

  // Service popularity pie chart
  const serviceCount: Record<string, number> = {};
  bills.forEach((b) => {
    if (Array.isArray(b.items)) {
      b.items.forEach((item: any) => {
        serviceCount[item.name] = (serviceCount[item.name] || 0) + 1;
      });
    }
  });
  const pieData = Object.entries(serviceCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("admin.dashboard")}</h1>
          <p className="text-muted-foreground mt-1">{t("admin.welcomeBack")}</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-card rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-2xl font-bold font-display">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-card rounded-xl p-6">
            <h2 className="font-display text-lg font-semibold mb-4">{t("admin.revenueChart")}</h2>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChartData}>
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card rounded-xl p-6">
            <h2 className="font-display text-lg font-semibold mb-4">{t("admin.topServices")}</h2>
            {pieData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{t("admin.noData")}</p>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <h2 className="font-display text-lg font-semibold mb-4">{t("admin.recentBookings")}</h2>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">{t("auth.loading")}</p>
          ) : bookings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{t("admin.noBookings")}</p>
          ) : (
            <div className="overflow-x-auto h-40">
              <table className="w-full text-sm text-center">
                <thead className="bg-[#111] sticky top-0 z-10">
                  <tr className="border-b border-border">
                    <th className="p-3 text-muted-foreground font-medium">{t("admin.customer")}</th>
                    <th className="p-3 text-muted-foreground font-medium">{t("booking.phone")}</th>
                    <th className="p-3 text-muted-foreground font-medium">{t("admin.service")}</th>
                    <th className="p-3 text-muted-foreground font-medium">{t("admin.barber")}</th>
                    <th className="p-3 text-muted-foreground font-medium">{t("booking.date")}</th>
                    <th className="p-3 text-muted-foreground font-medium">#</th>
                    <th className="p-3 text-muted-foreground font-medium">{t("admin.status")}</th>
                    <th className="p-3 text-muted-foreground font-medium">{t("admin.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-b border-border/50">
                      <td className="py-3 font-medium">{b.customer_name}</td>
                      <td className="py-3 text-muted-foreground">
                        <a href={`https://wa.me/+2${b.customer_phone}?text=أهلا%20${b.customer_name}%20فاضل%20ساعة%20من%20دلوقتي%20على%20حجز%20حلاقتك%20تفضل%20بزيارتنا`} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-green-700">
                          {b.customer_phone}
                        </a>
                      </td>
                      <td className="py-3 text-muted-foreground text-xs max-w-[200px]">{getMultiServiceNames(b)}</td>
                      <td className="py-3 text-muted-foreground">{getBarberName(b.barber_preference)}</td>
                      <td className="py-3 text-muted-foreground">{b.booking_date}</td>
                      <td className="py-3 text-muted-foreground">{b.booking_time}</td>
                      <td className="py-3">
                        <Select value={b.status} onValueChange={(val) => updateStatus(b.id, val)}>
                          <SelectTrigger className="h-8 w-[130px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">{t("admin.pending")}</SelectItem>
                            <SelectItem value="in-progress">{t("admin.inProgress")}</SelectItem>
                            <SelectItem value="completed">{t("admin.completed")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500 hover:text-white hover:bg-green-500" onClick={() => handleEditBooking(b)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-white hover:bg-destructive" onClick={() => deleteBooking(b.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{t("admin.editBooking")}</DialogTitle>
            </DialogHeader>
            {editingBooking && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">{t("admin.customer")}</Label>
                  <Input id="name" value={editingBooking.customer_name} onChange={(e) => setEditingBooking({...editingBooking, customer_name: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">{t("booking.phone")}</Label>
                  <Input id="phone" value={editingBooking.customer_phone} onChange={(e) => setEditingBooking({...editingBooking, customer_phone: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="service" className="text-right pt-2">{t("admin.service")}</Label>
                  <ScrollArea className="h-48 w-full rounded-md border col-span-3">
                    <div className="p-4">
                      {Object.entries(groupedServices).map(([category, servicesInCategory]) => (
                        <div key={category} className="mb-4">
                          <h4 className="font-medium text-sm mb-2 text-primary">{t(`admin.${category}`)}</h4>
                          {servicesInCategory.map(s => {
                            const serviceIds = editingBooking.notes ? editingBooking.notes.split(",").map(id => id.trim()) : [];
                            const isChecked = serviceIds.includes(s.id);
                            return (
                              <div key={s.id} className="flex items-center space-x-2 mb-2">
                                <Checkbox 
                                  id={s.id}
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    const currentIds = editingBooking.notes ? editingBooking.notes.split(",").map(id => id.trim()) : [];
                                    let newIds;
                                    if (checked) {
                                      newIds = [...currentIds, s.id];
                                    } else {
                                      newIds = currentIds.filter(id => id !== s.id);
                                    }
                                    setEditingBooking({...editingBooking, notes: newIds.join(", ")});
                                  }}
                                />
                                <label htmlFor={s.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                  {i18n.language === 'ar' ? s.name_ar : s.name_en}
                                </label>
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="barber" className="text-right">{t("admin.barber")}</Label>
                  <Select value={editingBooking.barber_preference || ''} onValueChange={(value) => setEditingBooking({...editingBooking, barber_preference: value})}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder={t("booking.selectBarber")} />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(e => <SelectItem key={e.id} value={e.id}>{i18n.language === 'ar' ? e.name_ar : e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="date" className="text-right">{t("booking.date")}</Label>
                  <Input id="date" type="date" value={editingBooking.booking_date} onChange={(e) => setEditingBooking({...editingBooking, booking_date: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="number" className="text-right">{t("booking.number")}</Label>
                  <Input id="number" type="number" value={editingBooking.booking_time} onChange={(e) => setEditingBooking({...editingBooking, booking_time: e.target.value})} className="col-span-3" />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={handleUpdateBooking}>{t("admin.save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AdminLayout>
  );
};

export default Dashboard;