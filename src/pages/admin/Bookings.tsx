import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { isWithinInterval } from 'date-fns';
import { DateRange } from 'react-day-picker';
import AdminLayout from '@/components/admin/AdminLayout';
import { Calendar as CalendarIcon, Plus, Pencil, Trash2, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { ExportButton } from '@/components/ExportButton';

// Interfaces

interface Booking {
  id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  service_id: string;
  barber_preference: string;
  booking_date: string;
  booking_time: string;
  notes: string;
  status: 'pending' | 'completed' | 'canceled';
}

interface Service {
  id: string;
  name_en: string;
  name_ar: string;
  price: number;
  category: string;
}

interface Employee {
  id: string;
  name: string;
  name_ar: string;
}

interface settingsOption {
  eid_fee: number;
  eid_interval: {
    start: string | undefined;
    end: string | undefined;
  };
  vacation?: {
    start: string | undefined;
    end: string | undefined;
  };
}

const BookingsPage = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  // State
  const [settings, setSettings] = useState<settingsOption | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    service_id: '',
    barber_preference: '',
    booking_date: format(new Date(), 'yyyy-MM-dd'),
    booking_time: '',
    notes: '',
    status: 'pending' as 'pending' | 'completed' | 'canceled',
  });
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [filters, setFilters] = useState({
    name: "",
  });
  const [sortConfig, setSortConfig] = useState<{ key: keyof Booking; direction: 'asc' | 'desc' }>({ key: 'booking_time', direction: 'asc' });
  const [groupBy, setGroupBy] = useState<'barber_preference' | 'status' | 'booking_date' | ''>("booking_date");
  const [period, setPeriod] = useState('monthly');

  const fetchData = async () => {
    setLoading(true);
    const [bookingsRes, servicesRes, empRes, settingsRes] = await Promise.all([
      supabase.from('bookings').select('id, created_at, customer_name, customer_phone, service_id, barber_preference, booking_date, booking_time, notes, status').order("booking_date"),
      supabase.from('services').select('id, name_en, name_ar, price, category'),
      supabase.from('employees').select('id, name, name_ar'),
      supabase.from('settings').select('key, value'),
    ]);

    if (bookingsRes.data) setBookings(bookingsRes.data as Booking[]);
    if (servicesRes.data) setServices(servicesRes.data as Service[]);
    if (empRes.data) setEmployees(empRes.data as Employee[]);
    if (settingsRes.data) {
      const settingsMap = new Map(settingsRes.data.map(s => [s.key, s.value]));
      setSettings({
        eid_fee: parseFloat(settingsMap.get("eid_fee")) || 0,
        eid_interval: settingsMap.get("eid_interval") || { start: undefined, end: undefined },
        vacation: settingsMap.get("vacation") || { start: undefined, end: undefined },
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getServiceName = (serviceIds: string) => {
    if (!serviceIds) return '';
    return serviceIds.split(',').map(id => {
      const service = services.find(s => s.id === id.trim());
      if (!service) return '';
      return i18n.language === 'ar' ? service.name_ar : service.name_en;
    }).join(', ');
  };

  const getBarberName = (barberId: string) => {
    if (barberId === 'any') return t('booking.anyBarber');
    const employee = employees.find(e => e.id === barberId);
    return employee ? (i18n.language === 'ar' ? employee.name_ar : employee.name) : '';
  };

  const requestSort = (key: keyof Booking) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({
      customer_name: '',
      customer_phone: '',
      service_id: '',
      barber_preference: '',
      booking_date: format(new Date(), 'yyyy-MM-dd'),
      booking_time: '',
      notes: '',
      status: 'pending',
    });
    setDialogOpen(true);
  };

  const openEdit = (booking: Booking) => {
    setEditingId(booking.id);
    setForm(booking);
    setDialogOpen(true);
  };

  const isEid = useMemo(() => {
    if (!date || !settings?.eid_interval?.start || !settings?.eid_interval?.end) return false;
    const eidStart = parseISO(settings.eid_interval.start);
    const eidEnd = parseISO(settings.eid_interval.end);
    const book_date = form.booking_date ? parseISO(form.booking_date) : new Date();
    return isWithinInterval(book_date, { start: startOfDay(eidStart), end: endOfDay(eidEnd) });
  }, [date, settings, form.booking_date]);


  const handleSave = async () => {
    const payload = { ...form };
    if (editingId) {
      const { error } = await supabase.from("bookings").update(payload).eq("id", editingId);
      if (error) toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
    } else {
      const { error } = await supabase.from("bookings").insert(payload);
      if (error) toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
    }
    setDialogOpen(false);
    fetchData();
  };

  const deleteBooking = async (id: string) => {
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) {
      toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("admin.success"), description: t("admin.bookingDeleted") });
      fetchData();
    }
  };

  const renderSortArrow = (key: keyof Booking) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-4 h-4 opacity-50" />;
    return sortConfig.direction === 'asc' ? '▲' : '▼';
  };

  const totalBookingPrice = useMemo(() => {
    if (!form.notes) return 0;
    const serviceIds = form.notes.split(',').map(id => id.trim());
    return serviceIds.reduce((total, id) => {
      const service = services.find(s => s.id === id);
      return total + (service ? service.price : 0);
    }, 0);
  }, [form.notes, services, settings, isEid]);
  const totalPrice = totalBookingPrice + (isEid ? settings.eid_fee : 0);

  const filteredAndSortedBookings = useMemo(() => {
    let filtered = bookings.filter(b => 
      b.customer_name.toLowerCase().includes(filters.name.toLowerCase()) ||
      b.customer_phone.includes(filters.name)
    );

    let effectiveDate = date;
    if (period !== 'custom') {
        const now = new Date();
        let from, to;
        switch (period) {
            case 'daily':
                from = startOfDay(now);
                to = endOfDay(now);
                break;
            case 'weekly':
                from = startOfWeek(now);
                to = endOfWeek(now);
                break;
            case 'monthly':
                from = startOfMonth(now);
                to = endOfMonth(now);
                break;
            case 'annual':
                from = startOfYear(now);
                to = endOfYear(now);
                break;
            default:
                from = startOfMonth(now);
                to = endOfMonth(now);
        }
        effectiveDate = { from, to };
    }

    if (effectiveDate?.from) {
        const start = startOfDay(effectiveDate.from);
        const end = effectiveDate.to ? endOfDay(effectiveDate.to) : endOfDay(effectiveDate.from);
        filtered = filtered.filter(booking => 
            isWithinInterval(new Date(booking.booking_date), { start: startOfDay(start), end: endOfDay(end) })
        );
    }

    const sorted = [...filtered].sort((a, b) => {
      const aValue = sortConfig.key === 'barber_preference' ? getBarberName(a.barber_preference) : a[sortConfig.key];
      const bValue = sortConfig.key === 'barber_preference' ? getBarberName(b.barber_preference) : b[sortConfig.key];
      const cValue = sortConfig.key === 'booking_time' ? Number(a.booking_time) : aValue;
      const dValue = sortConfig.key === 'booking_time' ? Number(b.booking_time) : bValue;

      if (cValue < dValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (cValue > dValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sorted;

  }, [bookings, filters, sortConfig, employees, date, period, i18n.language]);

  const groupedBookings = useMemo(() => {
    if (groupBy === '') return { 'all': filteredAndSortedBookings as Booking[] };

    return (filteredAndSortedBookings as Booking[]).reduce((acc, booking) => {
      let key = '';
      if (groupBy === 'barber_preference') {
        key = getBarberName(booking.barber_preference);
      } else if (groupBy === 'status') {
        key = t(`admin.${booking.status}`);
      } else if (groupBy === 'booking_date') {
        key = format(parseISO(booking.booking_date), 'yyyy-MM-dd');
      }

      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(booking);
      return acc;
    }, {} as Record<string, Booking[]>);
  }, [filteredAndSortedBookings, groupBy, getBarberName, t]);

  const exportColumns = [
    {header: t("admin.customers"), accessor: (items:Booking) => items.customer_name},
    {header: t("admin.phone"), accessor: (items:Booking) => items.customer_phone},
    { header: t("admin.services"), accessor: (items: Booking) => getServiceName(items.notes) || '' },
    { header: t("admin.barber"), accessor: (items: Booking) => getBarberName(items.barber_preference) },
    { header: t("admin.date"), accessor: (items: Booking) => format(new Date(items.booking_date), "yyyy-MM-dd") },
    { header: t("admin.number"), accessor: (items: Booking) => items.booking_time },
    { header: t("admin.status"), accessor: (items: Booking) => items.status },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">{t("admin.bookings")}</h1>
            <p className="text-muted-foreground mt-1">{t("admin.manageBookings")}</p>
          </div>
          <Button className="bg-gradient-gold text-primary-foreground" onClick={openAdd}>
            <Plus className="w-4 h-4 ltr:mr-2 rtl:ml-2" /> {t("admin.addBooking")}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <Button variant={period === 'daily' ? 'default' : 'outline'} onClick={() => setPeriod('daily')}>{t('admin.daily')}</Button>
              <Button variant={period === 'weekly' ? 'default' : 'outline'} onClick={() => setPeriod('weekly')}>{t('admin.weekly')}</Button>
              <Button variant={period === 'monthly' ? 'default' : 'outline'} onClick={() => setPeriod('monthly')}>{t('admin.monthly')}</Button>
              <Button variant={period === 'annual' ? 'default' : 'outline'} onClick={() => setPeriod('annual')}>{t('admin.annual')}</Button>
              <Button variant={period === 'custom' ? 'default' : 'outline'} onClick={() => setPeriod('custom')}>{t('admin.customRange')}</Button>
            </div>
            <ExportButton 
              data={filteredAndSortedBookings}
              columns={exportColumns}
              filename={`booking_${period}`}
              groupedData={groupedBookings}
              groupTitle={key => key}
            />
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            {period === 'custom' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "w-full md:w-[300px] justify-start text-left font-normal",
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
              placeholder={t("admin.filterByName")}
              value={filters.name}
              onChange={(e) => setFilters({ ...filters, name: e.target.value })}
              className="w-full md:w-[300px]"
            />
            <Select value={groupBy} onValueChange={(value) => setGroupBy(value === 'none' ? '' : value as 'barber_preference' | 'status' | 'booking_date')}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder={t("admin.groupBy")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("admin.none")}</SelectItem>
                <SelectItem value="barber_preference">{t("admin.barber")}</SelectItem>
                <SelectItem value="status">{t("admin.status")}</SelectItem>
                <SelectItem value="booking_date">{t("admin.date")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="glass-card rounded-xl p-6">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">{t("auth.loading")}</p>
          ) : Object.keys(groupedBookings).length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{t("admin.noData")}</p>
          ) : (
            <div className="overflow-x-auto h-[500px]">
              <table className="w-full text-sm text-center">
                <thead className="bg-[#111] sticky top-0 z-10">
                  <tr className="border-b border-border">
                    <th className="p-3 text-muted-foreground font-medium cursor-pointer" onClick={() => requestSort('customer_name')}>
                      <div className="flex justify-center flex-nowrap items-center gap-2">{t("admin.customer")} <span>{renderSortArrow('customer_name')}</span></div>
                    </th>
                    <th className="p-3 text-muted-foreground font-medium cursor-pointer" onClick={() => requestSort('customer_phone')}>
                      <div className="flex justify-center flex-nowrap items-center gap-2">{t("admin.phone")} <span>{renderSortArrow('customer_phone')}</span></div>
                    </th>
                    <th className="p-3 text-muted-foreground font-medium">{t("admin.service")}</th>
                    <th className="p-3 text-muted-foreground font-medium cursor-pointer" onClick={() => requestSort('barber_preference')}>
                      <div className="flex justify-center flex-nowrap items-center gap-2">{t("admin.barber")} <span>{renderSortArrow('barber_preference')}</span></div>
                    </th>
                    <th className="p-3 text-muted-foreground font-medium cursor-pointer" onClick={() => requestSort('booking_date')}>
                      <div className="flex justify-center flex-nowrap items-center gap-2">{t("admin.booking_date")} <span>{renderSortArrow('booking_date')}</span></div>
                    </th>
                    <th className="p-3 text-muted-foreground font-medium cursor-pointer" onClick={() => requestSort('booking_time')}>
                      <div className="flex justify-center flex-nowrap items-center gap-2">{t("admin.number")} <span>{renderSortArrow('booking_time')}</span></div>
                    </th>
                    <th className="p-3 text-muted-foreground font-medium cursor-pointer" onClick={() => requestSort('status')}>
                      <div className="flex justify-center flex-nowrap items-center gap-2">{t("admin.status")} <span>{renderSortArrow('status')}</span></div>
                    </th>
                    <th className="p-3 text-muted-foreground font-medium">{t("admin.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedBookings).map(([group, bookings]) => (
                    <React.Fragment key={group}>
                      {groupBy !== '' && (
                        <tr className="bg-muted/50">
                          <td colSpan={8} className="py-2 px-4 font-bold text-primary">
                            {group} ({bookings.length})
                          </td>
                        </tr>
                      )}
                      {bookings.map((booking) => (
                        <tr key={booking.id} className="border-b border-border/50">
                          <td className="py-3 font-medium">{booking.customer_name}</td>
                          <td className="py-3 text-muted-foreground">{booking.customer_phone}</td>
                          <td className="py-3 text-muted-foreground">{getServiceName(booking.notes)}</td>
                          <td className="py-3 text-muted-foreground">{getBarberName(booking.barber_preference)}</td>
                          <td className="py-3 text-muted-foreground">{booking.booking_date} {new Date(booking.booking_date).toLocaleString('en-US', { weekday: "short" })}</td>
                          <td className="py-3 text-muted-foreground">{booking.booking_time}</td>
                          <td className="py-3 text-muted-foreground">{t(`admin.${booking.status}`)}</td>
                          <td className="py-3 flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-700 hover:bg-green-700 hover:text-white" onClick={() => openEdit(booking)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-white hover:bg-destructive" onClick={() => deleteBooking(booking.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Dialog for Add/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? t("admin.editBooking") : t("admin.addBooking")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="customer_name" className="text-sm font-medium mb-1 block">{t("admin.customerName")}</label>
                <Input id="customer_name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
              </div>
              <div>
                <label htmlFor="customer_phone" className="text-sm font-medium mb-1 block">{t("admin.phone")}</label>
                <Input id="customer_phone" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
              </div>
              <div>
                <label htmlFor="booking_date" className="text-sm font-medium mb-1 block">{t("admin.booking_date")}</label>
                <Input id="booking_date" type="date" value={form.booking_date} onChange={(e) => setForm({ ...form, booking_date: e.target.value })} />
              </div>
              <div>
                <label htmlFor="number" className="text-sm font-medium mb-1 block">{t("admin.number")}</label>
                <Input id="number" type="number" value={form.booking_time} onChange={(e) => setForm({ ...form, booking_time: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t("admin.barber")}</label>
                <Select value={form.barber_preference === 'none' ? '' : form.barber_preference} onValueChange={(value) => setForm({ ...form, barber_preference: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.selectBarber")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("admin.none")}</SelectItem>
                    {employees.map(e => (
                      <SelectItem key={e.id} value={e.id}>{i18n.language === 'ar' ? e.name_ar : e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t("admin.status")}</label>
                <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as any })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{t("admin.pending")}</SelectItem>
                    <SelectItem value="completed">{t("admin.completed")}</SelectItem>
                    <SelectItem value="canceled">{t("admin.canceled")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1 block">{t("admin.service")}</label>
                <ScrollArea className="h-48 w-full rounded-md border col-span-2">
                  <div className="p-4">
                    {Object.entries(
                      services.reduce((acc, service) => {
                        const category = service.category || t('admin.uncategorized');
                        if (!acc[category]) acc[category] = [];
                        acc[category].push(service);
                        return acc;
                      }, {} as Record<string, Service[]>)
                    ).sort(([a], [b]) => a.localeCompare(b)).map(([category, servicesInCategory]) => (
                      <div key={category} className="mb-4">
                        <h4 className="font-medium text-sm mb-2 text-primary">{t(`admin.${category}`)}</h4>
                        {servicesInCategory.sort((a, b) => (i18n.language === 'ar' ? a.name_ar : a.name_en).localeCompare(i18n.language === 'ar' ? b.name_ar : b.name_en)).map(s => {
                          const serviceIds = form.notes ? form.notes.split(",").map(id => id.trim()) : [];
                          const isChecked = serviceIds.includes(s.id);
                          return (
                            <div key={s.id} className="flex items-center space-x-2 mb-2">
                              <Checkbox 
                                id={s.id}
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  const currentIds = form.notes ? form.notes.split(",").map(id => id.trim()).filter(id => id) : [];
                                  let newIds;
                                  if (checked) {
                                    newIds = [...currentIds, s.id];
                                  } else {
                                    newIds = currentIds.filter(id => id !== s.id);
                                  }
                                  setForm({...form, notes: newIds.join(", ")});
                                }}
                              />
                              <label htmlFor={s.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {i18n.language === 'ar' ? s.name_ar : s.name_en} ({s.price}{t("booking.price_mark")})
                              </label>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>            
            {isEid && <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center font-bold text-lg">
                <span>{t('admin.services')}</span>
                <span>{totalBookingPrice.toFixed(2)} {t("booking.price_mark")}</span>
              </div>
              <div className="flex justify-between items-center font-bold text-lg">
                <span>{t('admin.eidFee')}</span>
                <span>{settings.eid_fee.toFixed(2)} {t("booking.price_mark")}</span>
              </div>
            </div>}
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center font-bold text-lg">
                <span>{t('admin.total')}</span>
                <span>{totalPrice.toFixed(2)} {t("booking.price_mark")}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button onClick={handleSave}>{editingId ? t("admin.saveChanges") : t("admin.addBooking")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default BookingsPage;