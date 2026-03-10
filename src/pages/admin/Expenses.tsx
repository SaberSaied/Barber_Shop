import { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Plus, Pencil, Trash2, Check, ArrowUpDown } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, set, endOfDay, startOfDay } from "date-fns";
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";

// Interfaces
interface Employee {
  id: string;
  name:string;
}

interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'shop' | 'employee';
  employee_id: string | null;
}

// Sort direction
type SortDirection = 'asc' | 'desc';

const ExpensesPage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();

  // State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    amount: "",
    type: "shop" as "shop" | "employee",
    employee_id: "",
  });
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [filters, setFilters] = useState({
    name: "",
  });
  const [sortConfig, setSortConfig] = useState<{ key: keyof Expense; direction: SortDirection }>({ key: 'date', direction: 'desc' });
  const [groupBy, setGroupBy] = useState<'type' | 'employee_id' | ''>("");
  const [aggregationType, setAggregationType] = useState('sum');
  const [period, setPeriod] = useState('daily');

  // Data Fetching
  const fetchData = async () => {
    setLoading(true);
    const [expensesRes, employeesRes] = await Promise.all([
      supabase.from("expenses").select("*").order("date", { ascending: false }),
      supabase.from("employees").select("id, name").eq("is_active", true),
    ]);

    if (expensesRes.error) {
      toast({ title: t("auth.error"), description: expensesRes.error.message, variant: "destructive" });
    } else {
      setExpenses(expensesRes.data as Expense[]);
    }

    if (employeesRes.data) {
      setEmployees(employeesRes.data as Employee[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getEmployeeName = (id: string | null) => {
    if (!id) return "—";
    return employees.find((e) => e.id === id)?.name || "—";
  };

  // Filtering and Sorting
  const filteredAndSortedExpenses = useMemo(() => {
    let filtered = [...expenses];

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
        filtered = filtered.filter(expense => 
            isWithinInterval(new Date(expense.date), { start: startOfDay(start), end: endOfDay(end) })
        );
    }

    // Filter by name (description or employee name)
    if (filters.name) {
      filtered = filtered.filter(expense =>
        expense.description.toLowerCase().includes(filters.name.toLowerCase()) ||
        (expense.employee_id && getEmployeeName(expense.employee_id).toLowerCase().includes(filters.name.toLowerCase()))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const aValue = sortConfig.key === 'employee_id' ? getEmployeeName(a.employee_id) : a[sortConfig.key];
      const bValue = sortConfig.key === 'employee_id' ? getEmployeeName(b.employee_id) : b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    if (!groupBy) {
      return filtered;
    }

    const grouped = filtered.reduce((acc, expense) => {
      const key = expense[groupBy] || 'notSet';
      if (!acc[key]) {
        acc[key] = { items: [], total: 0 };
      }
      acc[key].items.push(expense);
      acc[key].total += expense.amount;
      return acc;
    }, {} as Record<string, { items: Expense[], total: number }>);

    return grouped;

  }, [expenses, filters, sortConfig, employees, groupBy, date, period]);

  const aggregatedValue = useMemo(() => {
    const items = groupBy ? Object.values(filteredAndSortedExpenses as Record<string, { items: Expense[] }>).flatMap(g => g.items) : filteredAndSortedExpenses as Expense[];
    const amounts = items.map(item => item.amount);
    if (amounts.length === 0) return 0;

    switch (aggregationType) {
      case 'sum':
        return amounts.reduce((sum, amount) => sum + amount, 0);
      case 'average':
        return amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
      case 'max':
        return Math.max(...amounts);
      case 'min':
        return Math.min(...amounts);
      case 'count':
        return amounts.length;
      default:
        return 0;
    }
  }, [filteredAndSortedExpenses, groupBy, aggregationType]);
  
  const requestSort = (key: keyof Expense) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };


  // CRUD Handlers
  const openAdd = () => {
    setEditingId(null);
    setForm({
      date: format(new Date(), "yyyy-MM-dd"),
      description: "",
      amount: "",
      type: "shop",
      employee_id: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setForm({
      date: expense.date,
      description: expense.description,
      amount: String(expense.amount),
      type: expense.type,
      employee_id: expense.employee_id || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.date || !form.description || !form.amount) {
      toast({ title: t("auth.error"), description: t("admin.fillAllFields"), variant: "destructive" });
      return;
    }

    const payload = {
      date: form.date,
      description: form.description,
      amount: parseFloat(form.amount),
      type: form.type,
      employee_id: form.type === 'employee' ? form.employee_id : null,
    };
    
    if (editingId) {
      const { error } = await supabase.from("expenses").update(payload).eq("id", editingId);
      if (error) toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
    } else {
      const { error } = await supabase.from("expenses").insert(payload);
      if (error) toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
    }
    setDialogOpen(false);
    fetchData();
  };

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) {
      toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("admin.success"), description: t("admin.expenseDeleted") });
      fetchData();
    }
  };

  const renderSortArrow = (key: keyof Expense) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-4 h-4 opacity-50" />;
    return sortConfig.direction === 'asc' ? '▲' : '▼';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">{t("admin.expenses")}</h1>
            <p className="text-muted-foreground mt-1">{t("admin.manageExpenses")}</p>
          </div>
          <Button className="bg-gradient-gold text-primary-foreground" onClick={openAdd}>
            <Plus className="w-4 h-4 ltr:mr-2 rtl:ml-2" /> {t("admin.addExpense")}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2 mb-4">
            <Button variant={period === 'daily' ? 'default' : 'outline'} onClick={() => setPeriod('daily')}>{t('admin.daily')}</Button>
            <Button variant={period === 'weekly' ? 'default' : 'outline'} onClick={() => setPeriod('weekly')}>{t('admin.weekly')}</Button>
            <Button variant={period === 'monthly' ? 'default' : 'outline'} onClick={() => setPeriod('monthly')}>{t('admin.monthly')}</Button>
            <Button variant={period === 'annual' ? 'default' : 'outline'} onClick={() => setPeriod('annual')}>{t('admin.annual')}</Button>
            <Button variant={period === 'custom' ? 'default' : 'outline'} onClick={() => setPeriod('custom')}>{t('admin.customRange')}</Button>
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
            <Select value={groupBy} onValueChange={(value) => setGroupBy(value === 'none' ? '' : value as 'type' | 'employee_id')}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder={t("admin.groupBy")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("admin.none")}</SelectItem>
                <SelectItem value="type">{t("admin.type")}</SelectItem>
                <SelectItem value="employee_id">{t("admin.employee")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={aggregationType} onValueChange={setAggregationType}>
              <SelectTrigger className="w-full md:w-[180px]">
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
          </div>
        </div>

        {/* Table */}
        <div className="glass-card rounded-xl p-6">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">{t("auth.loading")}</p>
          ) : Object.keys(filteredAndSortedExpenses).length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{t("admin.noData")}</p>
          ) : (
            <div className="overflow-x-auto h-[500px]">
              <table className="w-full text-sm text-center">
                <thead className="bg-[#111] sticky top-0 z-10">
                  <tr className="border-b border-border">
                    <th className="text-start p-3 text-muted-foreground font-medium cursor-pointer" onClick={() => requestSort('date')}>
                      <div className="flex justify-center flex-nowrap items-center gap-2">{t("booking.date")} <span>{renderSortArrow('date')}</span></div>
                    </th>
                    <th className="text-start p-3 text-muted-foreground font-medium cursor-pointer" onClick={() => requestSort('description')}>
                      <div className="flex justify-center flex-nowrap items-center gap-2">{t("admin.description")} <span>{renderSortArrow('description')}</span></div>
                    </th>
                    <th className="text-start p-3 text-muted-foreground font-medium cursor-pointer" onClick={() => requestSort('amount')}>
                      <div className="flex justify-center flex-nowrap items-center gap-2">{t("admin.amount")} <span>{renderSortArrow('amount')}</span></div>
                    </th>
                    <th className="text-start p-3 text-muted-foreground font-medium cursor-pointer" onClick={() => requestSort('type')}>
                      <div className="flex justify-center flex-nowrap items-center gap-2">{t("admin.type")} <span>{renderSortArrow('type')}</span></div>
                    </th>
                    <th className="text-start p-3 text-muted-foreground font-medium cursor-pointer" onClick={() => requestSort('employee_id')}>
                      <div className="flex justify-center flex-nowrap items-center gap-2">{t("admin.employee")} <span>{renderSortArrow('employee_id')}</span></div>
                    </th>
                    <th className="text-start p-3 text-muted-foreground font-medium">{t("admin.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {groupBy ? (
                    Object.entries(filteredAndSortedExpenses as Record<string, { items: Expense[], total: number }>).map(([group, { items, total }]) => (
                      <React.Fragment key={group}>
                        <tr className="bg-muted/50">
                          <td colSpan={2} className="py-2 px-4 font-bold text-primary">
                            {groupBy === 'employee_id' ? getEmployeeName(group) : t(`admin.${group}`)} ({items.length})
                          </td>
                          <td className="py-2 px-4 font-bold text-primary">{total.toFixed(2)} {t("booking.price_mark")}</td>
                          <td colSpan={3}></td>
                        </tr>
                        {items.map((expense) => (
                          <tr key={expense.id} className="border-b border-border/50">
                            <td className="py-3 font-medium">{expense.date}</td>
                            <td className="py-3 text-muted-foreground">{expense.description}</td>
                            <td className="py-3 text-muted-foreground">{expense.amount.toFixed(2)} {t("booking.price_mark")}</td>
                            <td className="py-3 text-muted-foreground">{t(`admin.${expense.type}`)}</td>
                            <td className="py-3 text-muted-foreground">{getEmployeeName(expense.employee_id)}</td>
                            <td className="py-3 flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-green-700 hover:bg-green-700 hover:text-white" onClick={() => openEdit(expense)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-white hover:bg-red-700" onClick={() => deleteExpense(expense.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))
                  ) : (
                    (filteredAndSortedExpenses as Expense[]).map((expense) => (
                      <tr key={expense.id} className="border-b border-border/50">
                        <td className="py-3 font-medium">{expense.date}</td>
                        <td className="py-3 text-muted-foreground">{expense.description}</td>
                        <td className="py-3 text-muted-foreground">{expense.amount.toFixed(2)} {t("booking.price_mark")}</td>
                        <td className="py-3 text-muted-foreground">{t(`admin.${expense.type}`)}</td>
                        <td className="py-3 text-muted-foreground">{getEmployeeName(expense.employee_id)}</td>
                        <td className="py-3 flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-700 hover:bg-green-700 hover:text-white" onClick={() => openEdit(expense)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-white hover:bg-destructive" onClick={() => deleteExpense(expense.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border font-bold">
                    <td className="py-3" colSpan={2}>{t(`admin.${aggregationType}`)}</td>
                    <td className="py-3 text-primary">{aggregationType !== "count" ? aggregatedValue.toFixed(2) + " " + t("booking.price_mark") : aggregatedValue}</td>
                    <td className="py-3" colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Dialog for Add/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? t("admin.editExpense") : t("admin.addExpense")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">{t("booking.date")}</label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("admin.description")}</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("admin.amount")}</label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("admin.type")}</label>
              <Select value={form.type} onValueChange={(v: "shop" | "employee") => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="shop">{t("admin.shop")}</SelectItem>
                  <SelectItem value="employee">{t("admin.employee")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.type === 'employee' && (
              <div>
                <label className="text-sm font-medium mb-1 block">{t("admin.employee")}</label>
                <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                  <SelectTrigger><SelectValue placeholder={t("admin.selectEmployee")} /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={handleSave} className="w-full bg-gradient-gold text-primary-foreground">
              <Check className="w-4 h-4 ltr:mr-2 rtl:ml-2" /> {t("admin.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default ExpensesPage;