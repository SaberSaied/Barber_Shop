import { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { ExportButton } from "@/components/ExportButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, CreditCard, Banknote, Plus, ShoppingCart, ArrowUpDown, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type SortDirection = 'asc' | 'desc';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, endOfYesterday, startOfDay, endOfDay, parseISO } from "date-fns";
import { useAuth } from "@/hooks/useAuth";


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
  category: string | null;
}

interface CartItem {
  id: string;
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
  barber_id: string | null;
}

const POS = () => {
  const [settings, setSettings] = useState<{ eid_fee: number; eid_interval: { start: string | null; end: string | null } } | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loadingBills, setLoadingBills] = useState(true);
  const [allServices, setAllServices] = useState<ServiceOption[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualBillBarber, setManualBillBarber] = useState<string | null>(null);
  const [manualBillServices, setManualBillServices] = useState<string[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: 'created_at' | 'total' | 'barber_id'; direction: SortDirection }>({ key: 'created_at', direction: 'desc' });
  const [groupBy, setGroupBy] = useState<string>("");
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingFilterType, setBookingFilterType] = useState("daily"); // daily, weekly, custom, range
  const [customBookingDate, setCustomBookingDate] = useState<Date | undefined>(new Date());
  const [customBookingDateRange, setCustomBookingDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });
  const [period, setPeriod] = useState<string>("daily");
  const now = new Date();
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfWeek(now, { weekStartsOn: 1 }),
    to: endOfWeek(now, { weekStartsOn: 1 }),
  });
  const [aggregationType, setAggregationType] = useState<string>("sum");
  const [isAdmin, setIsAdmin] = useState(false);
  const {user} = useAuth();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

    useEffect(() => {
      if (!user) return;
      const getUserRoles = async () => {
        const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
        if (data) {
          if (data.some((item: { role: string }) => item.role === 'admin')) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false)
          }
        }
        if (error) {
          console.error('Error fetching user roles:', error);
        }
      };
      getUserRoles();
    }, [user]);
  
  // Fetch non-booking data once
  useEffect(() => {
    const fetchInitialData = async () => {
      const [srvRes, empRes, settRes] = await Promise.all([
        supabase.from("services").select("id, name_en, name_ar, price, category").eq("is_active", true).order("category"),
        supabase.from("employees").select("id, name, name_ar").eq("role", "barber"),
        supabase.from("settings").select("key, value")
      ]);
      if (srvRes.data) setAllServices(srvRes.data as ServiceOption[]);
      if (empRes.data) setEmployees(empRes.data as Employee[]);
      if (settRes.data) {
        const settingsMap = new Map(settRes.data.map(s => [s.key, s.value]));
        setSettings({
          eid_fee: parseFloat(settingsMap.get("eid_fee")) || 0,
          eid_interval: settingsMap.get("eid_interval") || { start: null, end: null },
        });
      }
      setLoadingBills(false); // Assuming this covers all initial loading
    };
    fetchInitialData();
  }, []);

  // Fetch bookings and bills based on filters
  useEffect(() => {
    const fetchFilteredData = async () => {
      let query = supabase
        .from("bookings")
        .select("id, customer_name, customer_phone, booking_date, booking_time, barber_preference, status, notes, service:services(id, name_en, name_ar, price)")
        .eq("status", "pending");

      // Date Filtering Logic
      const today = new Date();
      if (bookingFilterType === 'daily') {
        query = query.eq('booking_date', format(today, 'yyyy-MM-dd'));
      } else if (bookingFilterType === 'weekly') {
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
        query = query.gte('booking_date', format(weekStart, 'yyyy-MM-dd')).lte('booking_date', format(weekEnd, 'yyyy-MM-dd'));
      } else if (bookingFilterType === 'custom' && customBookingDate) {
        query = query.eq('booking_date', format(customBookingDate, 'yyyy-MM-dd'));
      } else if (bookingFilterType === 'range' && customBookingDateRange?.from && customBookingDateRange?.to) {
        query = query.gte('booking_date', format(customBookingDateRange.from, 'yyyy-MM-dd')).lte('booking_date', format(customBookingDateRange.to, 'yyyy-MM-dd'));
      }

      const { data: bookData, error: bookError } = await query.order("booking_date", { ascending: true });
      if (bookData) setBookings(bookData as Booking[]);
      if(bookError) console.error("Error fetching bookings:", bookError);

      // Fetch bills separately if they don't need date filtering from the booking controls
      const { data: billRes } = await supabase
        .from("bills")
        .select("*")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(500);
      if (billRes) setBills(billRes as Bill[]);
    };

    fetchFilteredData();
  }, [bookingFilterType, customBookingDate, customBookingDateRange]);

  const isEid = useMemo(() => {
    const today = new Date();
    if (!settings?.eid_interval?.start || !settings?.eid_interval?.end) return false;
    
    const eidStart = parseISO(settings.eid_interval.start);
    const eidEnd = parseISO(settings.eid_interval.end);
    const booking_date = selectedBookingId ? parseISO(bookings.find(b => b.id === selectedBookingId)?.booking_date || "") : today;
    
    return isWithinInterval(booking_date, { start: startOfDay(eidStart), end: endOfDay(eidEnd) });  
  }, [settings, selectedBookingId, bookings]);


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
          items.push({ id: srv.id, name: i18n.language === "ar" ? srv.name_ar : srv.name_en, price: Number(srv.price) });
        }
      });
    }

    if (items.length === 0 && b.service) {
      items.push({
        id: b.service.id,
        name: i18n.language === "ar" ? b.service.name_ar : b.service.name_en,
        price: Number(b.service.price),
      });
    }

    setCart(items);
    setSelectedBookingId(b.id);
    setDiscount(0);
  };
  

  const handleEditBill = (bill: Bill) => {
    setEditingBill(bill);
    setManualBillBarber(bill.barber_id);
    setManualBillServices(bill.items.map(item => item.id));
    setEditDialogOpen(true);
  };

  const handleUpdateBill = async () => {
    if (!editingBill) return;

    const items: CartItem[] = [];
    manualBillServices.forEach(serviceId => {
      const service = allServices.find(s => s.id === serviceId);
      if (service) {
        items.push({
          id: service.id,
          name: i18n.language === "ar" ? service.name_ar : service.name_en,
          price: Number(service.price)
        });
      }
    });

    const subtotal = items.reduce((sum, item) => sum + item.price, 0);
    const total = Math.max(0, subtotal - (editingBill.discount || 0));

    const { data, error } = await supabase
      .from("bills")
      .update({
        items,
        subtotal,
        total,
        barber_id: manualBillBarber,
      })
      .eq("id", editingBill.id)
      .select()
      .single();

    if (error) {
      toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
    } else {
      setBills(bills.map(b => (b.id === editingBill.id ? data as Bill : b)));
      setEditDialogOpen(false);
      setEditingBill(null);
      toast({ title: t("admin.billUpdated") });
    }
  };

  const handleAddManualBill = () => {
    const items: CartItem[] = [];
    manualBillServices.forEach(serviceId => {
      const service = allServices.find(s => s.id === serviceId);
      if (service) {
        items.push({
          id: service.id,
          name: i18n.language === "ar" ? service.name_ar : service.name_en,
          price: Number(service.price)
        });
      }
    });
    setCart(items);
    setManualDialogOpen(false);
    setSelectedBookingId(null);
    setDiscount(0);
  };

  const removeFromCart = (index: number) => {
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);
    if (newCart.length === 0) setSelectedBookingId(null);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const total = useMemo(() => {
    const eidFee = settings?.eid_fee || 0;
    const finalTotal = subtotal - discount; // Or however you calculate the base total
    return finalTotal + (isEid ? eidFee : 0);
  }, [subtotal, discount, isEid, settings]);


  const checkout = async (method: string) => {
    if (cart.length === 0) return;
    
    let billData: any = {
      items: cart,
      subtotal,
      discount,
      total,
      payment_method: method,
      status: "completed",
    };

    if (selectedBookingId) {
      const booking = bookings.find(b => b.id === selectedBookingId);
      if (booking) {
        billData.barber_id = booking.barber_preference;
      }
    } else {
      billData.barber_id = manualBillBarber;
    }

    const { data, error } = await supabase.from("bills").insert(billData).select().single();
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
    setManualBillBarber(null);
    setManualBillServices([]);

    const { data: updated } = await supabase
      .from("bookings")
      .select("id, customer_name, customer_phone, booking_date, booking_time, barber_preference, status, notes, service:services(id, name_en, name_ar, price)")
      .eq("status", "pending")
      .order("booking_date", { ascending: true });
    if (updated) setBookings(updated as Booking[]);
    toast({ title: t("admin.billSaved"), description: `${total}` });
  };


  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);

  const calculateAggregation = (bills: Bill[], type: string) => {
    const totals = bills.map(b => b.total);
    if (totals.length === 0) return 0;

    switch (type) {
      case 'sum':
        return totals.reduce((acc, val) => acc + val, 0);
      case 'average':
        return totals.reduce((acc, val) => acc + val, 0) / totals.length;
      case 'max':
        return Math.max(...totals);
      case 'min':
        return Math.min(...totals);
      case 'count':
        return totals.length;
      default:
        return 0;
    }
  };

  const requestSort = (key: 'created_at' | 'total' | 'barber_id') => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortArrow = (key: 'created_at' | 'total' | 'barber_id') => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-4 h-4 ml-2 inline-block opacity-40" />;
    return sortConfig.direction === 'asc' ? <span className="ml-2">▲</span> : <span className="ml-2">▼</span>;
  };

  const handleDeleteBill = async (billId: string) => {
    const { error } = await supabase.from("bills").delete().eq("id", billId);
    if (error) {
      toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
    } else {
      setBills(bills.filter(b => b.id !== billId));
      toast({ title: t("admin.billDeleted") });
    }
  };

  const periodData = useMemo(() => {
    let filteredBills = nameFilter
      ? bills.filter(bill =>
          Array.isArray(bill.items) && bill.items.some(item =>
            item.name.toLowerCase().includes(nameFilter.toLowerCase())
          )
        )
      : [...bills];

    filteredBills.sort((a, b) => {
      const aValue = sortConfig.key === 'barber_id' ? getBarberName(a.barber_id) : a[sortConfig.key];
      const bValue = sortConfig.key === 'barber_id' ? getBarberName(b.barber_id) : b[sortConfig.key];
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    const processBills = (billList: Bill[]) => {
      const aggregatedValue = calculateAggregation(billList, aggregationType);
      if (groupBy !== 'barber') {
        return { bills: billList, total: aggregatedValue };
      }

      const groupedByBarber = billList.reduce((acc, bill) => {
        const barberId = bill.barber_id || 'unknown';
        if (!acc[barberId]) {
          acc[barberId] = [];
        }
        acc[barberId].push(bill);
        return acc;
      }, {} as Record<string, Bill[]>);

      const grouped = Object.fromEntries(
        Object.entries(groupedByBarber).map(([barberId, bills]) => [
          barberId,
          {
            items: bills,
            total: calculateAggregation(bills, aggregationType),
          },
        ])
      );

      return { grouped, total: aggregatedValue };
    };

    const filterBillsByDate = (start: Date, end: Date) =>
      filteredBills.filter((b) => { const d = new Date(b.created_at); return isWithinInterval(d, { start: startOfDay(start), end: endOfDay(end) }); });

    const dailyBills = filterBillsByDate(now, now);
    const weeklyBills = filterBillsByDate(weekStart, weekEnd);
    const monthlyBills = filterBillsByDate(monthStart, monthEnd);
    const annualBills = filterBillsByDate(yearStart, yearEnd);
    const customRangeBills = (date?.from && date?.to) ? filterBillsByDate(date.from, date.to) : [];

    return [
      { key: "daily", label: t("admin.daily"), ...processBills(dailyBills) },
      { key: "weekly", label: t("admin.weekly"), ...processBills(weeklyBills) },
      { key: "monthly", label: t("admin.monthly"), ...processBills(monthlyBills) },
      { key: "annual", label: t("admin.annual"), ...processBills(annualBills) },
      { key: "custom", label: t("admin.customRange"), ...processBills(customRangeBills) },
    ];
  }, [bills, nameFilter, sortConfig, groupBy, aggregationType, t, now, weekStart, weekEnd, monthStart, monthEnd, yearStart, yearEnd, date]);

  const filteredBookings = useMemo(() => {
  if (!bookingSearch) {
    return bookings;
  }
  return bookings.filter(booking => {
    const searchTerm = bookingSearch.toLowerCase();
    const nameMatch = booking.customer_name?.toLowerCase().includes(searchTerm);
    const phoneMatch = booking.customer_phone?.includes(searchTerm);
    return nameMatch || phoneMatch;
  });
}, [bookings, bookingSearch]);

  const groupedServices = useMemo(() => {
      return allServices.reduce((acc: Record<string, ServiceOption[]>, service: ServiceOption) => {
        const category = service.category || t('admin.uncategorized');
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(service);
        return acc;
      }, {} as Record<string, ServiceOption []>);
    }, [allServices, t]);

  const deleteBooking = async (bookingId: string) => {
    const { error } = await supabase.from("bookings").delete().eq("id", bookingId);
    if (error) {
      toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
    } else {
      setBookings(bookings.filter(b => b.id !== bookingId));
      toast({ title: t("admin.bookingDeleted") });
    }
  };


  const exportColumns = [
    { header: t("admin.date"), accessor: (items: Bill) => format(new Date(items.created_at), "yyyy-MM-dd") },
    { header: t("admin.total"), accessor: "total" },
    { header: t("admin.barber"), accessor: (items: Bill) => getBarberName(items.barber_id) },
    { header: t("admin.paymentMethod"), accessor: "payment_method" },
    { header: t("admin.items"), accessor: (items: Bill) => items.items.map(i => i.name).join(', ') },
  ];

  const currentPeriodData = periodData.find(p => p.key === period);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("admin.pointOfSale")}</h1>
          <p className="text-muted-foreground mt-1">{t("admin.posSubtitle")}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Pending Bookings */}
          <div className="lg:col-span-2 h-[50vh] overflow-y-scroll px-4">
            <h2 className="font-display text-lg font-semibold mb-4">{t("admin.pendingBookings")}</h2>
              <div className="flex items-center gap-2 mb-4">
                <Input
                  placeholder={t("admin.searchByNameOrPhone")}
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                  className="max-w-sm"
                />
                <Select value={bookingFilterType} onValueChange={setBookingFilterType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t('admin.filterByDate')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t('admin.daily')}</SelectItem>
                    <SelectItem value="weekly">{t('admin.weekly')}</SelectItem>
                    <SelectItem value="custom">{t('admin.customDate')}</SelectItem>
                    <SelectItem value="range">{t('admin.customRange')}</SelectItem>
                  </SelectContent>
                </Select>
                {bookingFilterType === 'custom' && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[280px] justify-start text-left font-normal",
                          !customBookingDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customBookingDate ? format(customBookingDate, "PPP") : <span>{t('admin.pickDate')}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={customBookingDate}
                        onSelect={setCustomBookingDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
                {bookingFilterType === 'range' && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                          "w-[300px] justify-start text-left font-normal",
                          !customBookingDateRange && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customBookingDateRange?.from ? (
                          customBookingDateRange.to ? (
                            <>
                              {format(customBookingDateRange.from, "LLL dd, y")} -{" "}
                              {format(customBookingDateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(customBookingDateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>{t('admin.pickDateRange')}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={customBookingDateRange?.from}
                        selected={customBookingDateRange}
                        onSelect={setCustomBookingDateRange}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            {filteredBookings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{t("admin.noBookings")}</p>
            ) : (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                {filteredBookings.map((b) => (
                  <div
                    key={b.id}
                    className={`glass-card rounded-xl p-4 text-start transition-colors ${selectedBookingId === b.id ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/30"}`}
                  >
                    <p className="font-medium text-sm">{b.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      <a href={`https://wa.me/+2${b.customer_phone}?text=أهلا%20${b.customer_name}%20فاضل%20ساعة%20من%20دلوقتي%20على%20حجز%20حلاقتك%20تفضل%20بزيارتنا`} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-green-700">{b.customer_phone}</a>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {b.booking_date} · #{b.booking_time}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("admin.barber")}: {getBarberName(b.barber_preference)}
                    </p>
                    <p className="text-primary font-display font-bold text-sm mt-1">
                      {getMultiServiceNames(b)}
                    </p>
                    <div className="flex justify-between items-center gap-2">
                      <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                        {t("admin.pending")}
                      </span>
                      {isAdmin && <Button variant="ghost" onClick={() => deleteBooking(b.id)} className="text-destructive hover:text-white hover:bg-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>}
                    </div>
                    <Button variant={selectedBookingId === b.id ? `default` : 'outline'} className="w-full mt-3"
                    onClick={() => selectBooking(b)}>{selectedBookingId === b.id ? t("admin.selected") : t("admin.select")}</Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Form */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">{t("admin.cart")}</h2>
              <Button variant="outline" size="sm" onClick={() => { setManualDialogOpen(true); setManualBillBarber(null); setManualBillServices([]); setCart([]); }}>
                <Plus className="w-4 h-4 ltr:mr-1 rtl:ml-1" /> {t("admin.addBill")}
              </Button>
            </div>
            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t("admin.selectBookingToPay")}</p>
            ) : (
              <div className="space-y-3 mb-6">
                <div className="text-sm font-medium">
                  {t("admin.barber")}: {getBarberName(selectedBookingId ? bookings.find(b => b.id === selectedBookingId)?.barber_preference : manualBillBarber)}
                </div>
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
              {isEid && <div className="flex items-center justify-between font-bold text-lg font-display">
                <span>{t("admin.eidFee")}</span>
                <span className="text-primary">{settings.eid_fee} {t("booking.price_mark")}</span>
              </div>}
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
          {isAdmin && <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">{t("admin.billsReport")}</h2>
            {currentPeriodData && (
              <ExportButton
                data={currentPeriodData.bills || []}
                columns={exportColumns}
                filename={`pos_bills_${currentPeriodData.key}`}
                groupedData={currentPeriodData.grouped}
                groupTitle={(key) => getBarberName(key as string)}
                total={currentPeriodData.total}
              />
            )}
          </div>}
          {isAdmin && <div className="grid grid-cols-2 md:grid-cols-5 gap-4 my-6">
            {periodData.map((p) => (
              <div key={p.key} className="bg-secondary rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">{p.label}</p>
                <p className="text-xl font-bold font-display text-primary">{p.total.toFixed(0)} {t("booking.price_mark")}</p>
                <p className="text-xs text-muted-foreground">
                  {groupBy === 'barber' ? `${Object.keys(p.grouped || {}).length} ${t("admin.barbers")}` : `${(p.bills || []).length} ${t("admin.bills")}`}
                </p>
              </div>
            ))}
          </div>}

          <div className="flex justify-between items-center mb-4 gap-4">
            {isAdmin && <div className="flex items-center gap-4 flex-wrap flex-col md:flex-row">
              {(period === "custom") && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                        "w-[300px] justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date?.from ? (
                        date.to ? (
                          <>
                            {format(date.from, "LLL dd, y")} -{" "}
                            {format(date.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(date.from, "LLL dd, y")
                        )
                      ) : (
                        <span>{t("admin.pickDate")}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={date?.from}
                      selected={date}
                      onSelect={setDate}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              )}
              <Input
                placeholder={t("admin.filterByItemName")}
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="max-w-sm"
              />
                <Select value={groupBy} onValueChange={(value) => setGroupBy(value === 'none' ? '' : value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t("admin.groupBy")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("admin.none")}</SelectItem>
                    <SelectItem value="barber">{t("admin.barber")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={aggregationType} onValueChange={setAggregationType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t("admin.aggregation")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sum">{t("admin.sum")}</SelectItem>
                    <SelectItem value="average">{t("admin.average")}</SelectItem>
                    <SelectItem value="max">{t("admin.max")}</SelectItem>
                    <SelectItem value="min">{t("admin.min")}</SelectItem>
                    <SelectItem value="count">{t("admin.count")}</SelectItem>
                  </SelectContent>
                </Select>
            </div>}
          </div>
          <Tabs defaultValue="daily" className="w-full" onValueChange={(value) => setPeriod(value)}>
            {isAdmin && <TabsList className="mb-4 flex flex-wrap gap-2 size-full">
              {periodData.map((p) => (
                <TabsTrigger key={p.key} value={p.key} onClick={() => setPeriod(p.key)}>{p.label}</TabsTrigger>
              ))}
            </TabsList>}
            {periodData.map((p) => (
              <TabsContent key={p.key} value={p.key}>
                {loadingBills ? (
                  <p className="text-muted-foreground text-center py-4">{t("auth.loading")}</p>
                ) : (p.bills && p.bills.length === 0 && !p.grouped) ? (
                  <p className="text-muted-foreground text-center py-4">{t("admin.noBills")}</p>
                ) : (
                  <div className="overflow-x-auto max-h-80 overflow-y-scroll">
                    <table className="w-full text-sm text-center">
                      <thead className="sticky top-0 bg-[#111] text-center">
                        <tr className="border-b border-border">
                          <th className="p-2 text-muted-foreground font-medium">#</th>
                          <th className="p-2 text-muted-foreground font-medium cursor-pointer hover:text-foreground" onClick={() => requestSort('created_at')}>
                            <div className="flex items-center">{t("admin.dateTime")} {renderSortArrow('created_at')}</div>
                          </th>
                          <th className="p-2 text-muted-foreground font-medium">{t("admin.items")}</th>
                          <th className="p-2 text-muted-foreground font-medium cursor-pointer hover:text-foreground" onClick={() => requestSort('barber_id')}>
                            <div className="flex items-center">{t("admin.barber")} {renderSortArrow('barber_id')}</div>
                          </th>
                          <th className="p-2 text-muted-foreground font-medium">{t("admin.subtotal")}</th>
                          <th className="p-2 text-muted-foreground font-medium">{t("admin.discount")}</th>
                          <th className="p-2 text-muted-foreground font-medium cursor-pointer hover:text-foreground" onClick={() => requestSort('total')}>
                            <div className="flex items-center">{t("admin.total")} {renderSortArrow('total')}</div>
                          </th>
                          <th className="p-2 text-muted-foreground font-medium">{t("admin.payment")}</th>
                          {isAdmin && <th className="p-2 text-muted-foreground font-medium">{t("admin.actions")}</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {p.grouped ? (
                          Object.entries(p.grouped).map(([barberId, { items: barberBills, total: barberTotal }]) => (
                            <React.Fragment key={barberId}>
                              <tr className="bg-muted/50">
                                <td colSpan={3} className="py-2 px-4 font-bold text-primary">
                                  {getBarberName(barberId)}
                                </td>
                                <td colSpan={3} className="py-2 px-4 font-bold text-primary text-end">{t(`admin.${aggregationType}`)}</td>
                                <td className="py-2 px-4 font-bold text-primary">{aggregationType !== "count" ? barberTotal.toFixed(2) + " " + t("booking.price_mark") : barberTotal}</td>
                                <td></td>
                                <td></td>
                              </tr>
                              {barberBills && barberBills.map((b, idx) => (
                                <tr key={b.id} className="border-b border-border/50">
                                  <td className="py-2 text-muted-foreground">{idx + 1}</td>
                                  <td className="py-2 text-muted-foreground text-xs">{format(new Date(b.created_at), "yyyy-MM-dd HH:mm")}</td>
                                  <td className="py-2 text-xs max-w-[200px] truncate">
                                    {Array.isArray(b.items) ? b.items.map((i: CartItem) => i.name).join(", ") : "—"}
                                  </td>
                                  <td className="py-2 text-muted-foreground">{getBarberName(b.barber_id)}</td>
                                  <td className="py-2">{b.subtotal.toFixed(2)} {t("booking.price_mark")}</td>
                                  <td className="py-2 text-muted-foreground">{b.discount.toFixed(2)} {t("booking.price_mark")}</td>
                                  <td className="py-2 text-primary font-semibold">{b.total.toFixed(2)} {t("booking.price_mark")}</td>
                                  <td className="py-2">
                                    <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                                      {b.payment_method === "card" ? t("admin.card") : t("admin.cash")}
                                    </span>
                                  </td>
                                  {isAdmin && <td className="py-2">
                                    <div className="flex gap-2">
                                      <Button variant="ghost" size="icon" className="h-8 w-8  text-green-700 hover:bg-green-700 hover:text-white" onClick={() => handleEditBill(b)}>
                                        <Pencil className="w-4 h-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-white hover:bg-destructive" onClick={() => handleDeleteBill(b.id)}>
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </td>}
                                </tr>
                              ))}
                            </React.Fragment>
                          ))
                        ) : (
                          p.bills && p.bills.map((b, idx) => (
                            <tr key={b.id} className="border-b border-border/50">
                              <td className="py-2 text-muted-foreground">{idx + 1}</td>
                              <td className="py-2 text-muted-foreground text-xs">{format(new Date(b.created_at), "yyyy-MM-dd HH:mm")}</td>
                              <td className="py-2 text-xs max-w-[200px] truncate">
                                {Array.isArray(b.items) ? b.items.map((i: CartItem) => i.name).join(", ") : "—"}
                              </td>
                              <td className="py-2 text-muted-foreground">{getBarberName(b.barber_id)}</td>
                              <td className="py-2">{b.subtotal.toFixed(2)} {t("booking.price_mark")}</td>
                              <td className="py-2 text-muted-foreground">{b.discount.toFixed(2)} {t("booking.price_mark")}</td>
                              <td className="py-2 text-primary font-semibold">{b.total.toFixed(2)} {t("booking.price_mark")}</td>
                              <td className="py-2">
                                <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                                  {b.payment_method === "card" ? t("admin.card") : t("admin.cash")}
                                </span>
                              </td>
                              {isAdmin && <td className="py-2">
                                <div className="flex gap-2">
                                  <Button variant="ghost" size="icon" className="h-8 w-8  text-green-700 hover:bg-green-700 hover:text-white" onClick={() => handleEditBill(b)}>
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-white hover:bg-destructive" onClick={() => handleDeleteBill(b.id)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>}
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border">
                          <td className="py-3 font-bold text-end">{t(`admin.${aggregationType}`)}</td>
                          <td></td>
                          <td colSpan={7} className="py-3 text-primary font-bold text-lg">{aggregationType !== "count" ? p.total.toFixed(2) + " " + t("booking.price_mark") : p.total}</td>
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
            <DialogTitle>{t("admin.addManualBill")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t("admin.barber")}</label>
              <Select value={manualBillBarber || ''} onValueChange={setManualBillBarber}>
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.selectBarber")} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{getBarberName(emp.id)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{t("admin.services")}</label>
              <div className="flex flex-wrap gap-2 max-h-60 overflow-y-scroll mt-2">
                {Object.entries(groupedServices).map(([category, services]) => (
                  <div key={category} className="w-full">
                    <p className="text-xs font-medium text-muted-foreground mb-1">{t(`admin.${category}`)}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {services.map((service) => (
                        <Button
                          key={service.id}
                          variant={manualBillServices.includes(service.id) ? "default" : "outline"}
                          onClick={() => {
                            setManualBillServices(prev => 
                              prev.includes(service.id) 
                                ? prev.filter(id => id !== service.id)
                                : [...prev, service.id]
                            );
                          }}
                          className="h-auto text-start"
                        >
                          <div className="flex items-center gap-2">
                            <span>{i18n.language === "ar" ? service.name_ar : service.name_en}</span>
                            <span className="text-xs opacity-70">{service.price} {t("booking.price_mark")}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Button onClick={handleAddManualBill} className="w-full">{t("admin.addBill")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.editBill")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t("admin.barber")}</label>
              <Select value={manualBillBarber || ''} onValueChange={setManualBillBarber}>
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.selectBarber")} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{getBarberName(emp.id)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{t("admin.services")}</label>
              <div className="flex flex-wrap gap-2 max-h-60 overflow-y-scroll mt-2">
                {Object.entries(groupedServices).map(([category, services]) => (
                  <div key={category} className="w-full">
                    <p className="text-xs font-medium text-muted-foreground mb-1">{t(`admin.${category}`)}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {services.map((service) => (
                        <Button
                          key={service.id}
                          variant={manualBillServices.includes(service.id) ? "default" : "outline"}
                          onClick={() => {
                            setManualBillServices(prev => 
                              prev.includes(service.id) 
                                ? prev.filter(id => id !== service.id)
                                : [...prev, service.id]
                            );
                          }}
                          className="h-auto text-start"
                        >
                          <div className="flex items-center gap-2">
                            <span>{i18n.language === "ar" ? service.name_ar : service.name_en}</span>
                            <span className="text-xs opacity-70">{service.price} {t("booking.price_mark")}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Button onClick={handleUpdateBill} className="w-full">{t("admin.updateBill")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default POS;