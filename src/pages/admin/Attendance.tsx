import { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Check, ArrowUpDown, Calendar as CalendarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { endOfDay, format, isWithinInterval, startOfDay } from "date-fns";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";


interface Employee {
  id: string;
  name: string;
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: string;
  notes: string | null;
}

type SortDirection = 'asc' | 'desc';


const Attendance = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<DateRange | undefined>();
  const [nameFilter, setNameFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ employee_id: "", date: format(new Date(), "yyyy-MM-dd"), clock_in: "", clock_out: "", status: "present", notes: "" });
  const [sortConfig, setSortConfig] = useState<{ key: keyof AttendanceRecord; direction: SortDirection }>({ key: 'date', direction: 'desc' });

  const fetchData = async () => {
    setLoading(true);
    
    const attQuery = supabase
      .from("attendance" as any)
      .select("*")
      .order("date", { ascending: false });

    const [attRes, empRes] = await Promise.all([
      attQuery,
      supabase.from("employees" as any).select("id, name").eq("is_active", true),
    ]);
    
    if (attRes.error) {
      toast({ title: t("auth.error"), description: attRes.error.message, variant: "destructive" });
    } else if (attRes.data) {
      setRecords(attRes.data as any);
    }
    
    if (empRes.data) setEmployees(empRes.data as any);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getEmployeeName = (id: string) => employees.find((e) => e.id === id)?.name || "—";

  const filteredRecords = useMemo(() => {
    let filtered = [...records];

    if (date?.from && date?.to) {
      filtered = filtered.filter(record => 
        isWithinInterval(new Date(record.date), { start: startOfDay(date.from as Date), end: endOfDay(date.to as Date) })
      );
    }

    if (nameFilter) {
      filtered = filtered.filter(record =>
        getEmployeeName(record.employee_id).toLowerCase().includes(nameFilter.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      const aValue = sortConfig.key === 'employee_id' ? getEmployeeName(a.employee_id) : a[sortConfig.key];
      const bValue = sortConfig.key === 'employee_id' ? getEmployeeName(b.employee_id) : b[sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [records, nameFilter, employees, sortConfig, date]);

  const requestSort = (key: keyof AttendanceRecord) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortArrow = (key: keyof AttendanceRecord) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-4 h-4 opacity-50" />;
    return sortConfig.direction === 'asc' ? '▲' : '▼';
  };


  const openAdd = () => {
    setEditingId(null);
    setForm({ employee_id: employees[0]?.id || "", date: format(new Date(), "yyyy-MM-dd"), clock_in: "", clock_out: "", status: "present", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (r: AttendanceRecord) => {
    setEditingId(r.id);
    setForm({ employee_id: r.employee_id, date: r.date, clock_in: r.clock_in || "", clock_out: r.clock_out || "", status: r.status, notes: r.notes || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.employee_id || !form.date) return;
    const payload = {
      employee_id: form.employee_id,
      date: form.date,
      clock_in: form.clock_in || null,
      clock_out: form.clock_out || null,
      status: form.status,
      notes: form.notes || null,
    };
    if (editingId) {
      const { error } = await (supabase.from("attendance" as any) as any).update(payload).eq("id", editingId);
      if (error) { toast({ title: t("auth.error"), description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await (supabase.from("attendance" as any) as any).insert(payload);
      if (error) { toast({ title: t("auth.error"), description: error.message, variant: "destructive" }); return; }
    }
    setDialogOpen(false);
    fetchData();
  };

  const deleteRecord = async (id: string) => {
    const { error } = await (supabase.from("attendance" as any) as any).delete().eq("id", id);
    if (error) { toast({ title: t("auth.error"), description: error.message, variant: "destructive" }); return; }
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const statusColor = (s: string) => {
    if (s === "present") return "bg-primary/10 text-primary";
    if (s === "late") return "bg-destructive/10 text-destructive";
    if (s === "absent") return "bg-muted text-muted-foreground";
    return "bg-secondary text-secondary-foreground";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">{t("admin.attendance")}</h1>
            <p className="text-muted-foreground mt-1">{t("admin.trackAttendance")}</p>
          </div>
          <Button className="bg-gradient-gold text-primary-foreground" onClick={openAdd} disabled={employees.length === 0}>
            <Plus className="w-4 h-4 ltr:mr-2 rtl:ml-2" /> {t("admin.addRecord")}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
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
                      {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
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
          <Input
            placeholder={t("admin.filterByName", "Filter by name...")}
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="max-w-sm"
          />
        </div>


        <div className="glass-card rounded-xl p-6">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">{t("auth.loading")}</p>
          ) : filteredRecords.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{t("admin.noData")}</p>
          ) : (
            <div className="overflow-x-auto h-[500px]">
              <table className="w-full text-sm text-center">
                <thead className="bg-[#111] sticky top-0 z-10">
                  <tr className="border-b border-border">
                    <th className="text-start p-3 text-muted-foreground font-medium cursor-pointer" onClick={() => requestSort('employee_id')}>
                      <div className="flex justify-center flex-nowrap items-center gap-2">{t("admin.employee")} <span>{renderSortArrow('employee_id')}</span></div>
                    </th>
                    <th className="text-start p-3 text-muted-foreground font-medium cursor-pointer" onClick={() => requestSort('date')}>
                      <div className="flex justify-center flex-nowrap items-center gap-2">{t("booking.date")} <span>{renderSortArrow('date')}</span></div>
                    </th>
                    <th className="text-start p-3 text-muted-foreground font-medium cursor-pointer" onClick={() => requestSort('clock_in')}>
                      <div className="flex justify-center flex-nowrap items-center gap-2">{t("admin.clockIn")} <span>{renderSortArrow('clock_in')}</span></div>
                    </th>
                    <th className="text-start p-3 text-muted-foreground font-medium cursor-pointer" onClick={() => requestSort('clock_out')}>
                      <div className="flex justify-center flex-nowrap items-center gap-2">{t("admin.clockOut")} <span>{renderSortArrow('clock_out')}</span></div>
                    </th>
                    <th className="text-start p-3 text-muted-foreground font-medium cursor-pointer" onClick={() => requestSort('status')}>
                      <div className="flex justify-center flex-nowrap items-center gap-2">{t("admin.status")} <span>{renderSortArrow('status')}</span></div>
                    </th>
                    <th className="text-start p-3 text-muted-foreground font-medium">{t("admin.notes")}</th>
                    <th className="text-start p-3 text-muted-foreground font-medium">{t("admin.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((r) => (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="py-3 font-medium">{getEmployeeName(r.employee_id)}</td>
                      <td className="py-3 text-muted-foreground">{r.date}</td>
                      <td className="py-3 text-muted-foreground">{r.clock_in || "—"}</td>
                      <td className="py-3 text-muted-foreground">{r.clock_out || "—"}</td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(r.status)}`}>
                          {t(`admin.${r.status}`)}
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground text-xs max-w-[150px] truncate">{r.notes || "—"}</td>
                      <td className="py-3 flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-700 hover:bg-green-700 hover:text-white" onClick={() => openEdit(r)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-white hover:bg-red-700" onClick={() => deleteRecord(r.id)}>
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
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? t("admin.editRecord") : t("admin.addRecord")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">{t("admin.employee")}</label>
              <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("booking.date")}</label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">{t("admin.clockIn")}</label>
                <Input type="time" value={form.clock_in} onChange={(e) => setForm({ ...form, clock_in: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t("admin.clockOut")}</label>
                <Input type="time" value={form.clock_out} onChange={(e) => setForm({ ...form, clock_out: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("admin.status")}</label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">{t("admin.present")}</SelectItem>
                  <SelectItem value="late">{t("admin.late")}</SelectItem>
                  <SelectItem value="absent">{t("admin.absent")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("admin.notes")}</label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <Button onClick={handleSave} className="w-full bg-gradient-gold text-primary-foreground">
              <Check className="w-4 h-4 ltr:mr-2 rtl:ml-2" /> {t("admin.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Attendance;