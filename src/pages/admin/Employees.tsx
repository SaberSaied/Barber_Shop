import React, { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Check, ArrowUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {bogy, gedo, adham} from "@/assets";

interface Employee {
  id: string;
  name: string;
  name_ar: string | null;
  role: string;
  phone: string | null;
  salary: number;
  schedule: string | null;
  absent_day?: string | null;
}

const emptyForm = { name: "", name_ar: "", role: "barber", phone: "", salary: 0, schedule: "", absent_day: "" };

type SortDirection = 'asc' | 'desc';

const Employees = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [nameFilter, setNameFilter] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Employee; direction: SortDirection }>({ key: 'name', direction: 'asc' });
  const [groupBy, setGroupBy] = useState<keyof Employee | ''>('');

  const fetchEmployees = async () => {
    setLoading(true);
    const { data } = await supabase.from("employees").select("*").order("created_at", { ascending: true });
    if (data) setEmployees(data as Employee[]);
    setLoading(false);
  };

  useEffect(() => { fetchEmployees(); }, []);

  const processedEmployees = useMemo(() => {
    let items = [...employees];

    if (nameFilter) {
      items = items.filter(employee =>
        employee.name.toLowerCase().includes(nameFilter.toLowerCase()) ||
        (employee.name_ar && employee.name_ar.toLowerCase().includes(nameFilter.toLowerCase()))
      );
    }

    if (sortConfig.key) {
      items.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

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
    }

    if (!groupBy) {
      return items;
    }

    const grouped = items.reduce((acc, employee) => {
      const key = String(employee[groupBy] || t('admin.notSet'));
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(employee);
      return acc;
    }, {} as Record<string, Employee[]>);

    return grouped;
  }, [employees, nameFilter, sortConfig, groupBy, t]);

  const requestSort = (key: keyof Employee) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortArrow = (key: keyof Employee) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-4 h-4 ml-2 opacity-20" />;
    return sortConfig.direction === 'asc' ? '▲' : '▼';
  };
  const openAdd = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (e: Employee) => {
    setEditingId(e.id);
    setForm({ name: e.name, name_ar: e.name_ar || "", role: e.role, phone: e.phone || "", salary: e.salary || 0, schedule: e.schedule || "", absent_day: e.absent_day || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const payload = { name: form.name, name_ar: form.name_ar || null, role: form.role, phone: form.phone || null, salary: form.salary, schedule: form.schedule || null, absent_day: form.absent_day || null };
    if (editingId) {
      const { error } = await supabase.from("employees").update(payload).eq("id", editingId);
      if (error) { toast({ title: t("auth.error"), description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("employees").insert(payload);
      if (error) { toast({ title: t("auth.error"), description: error.message, variant: "destructive" }); return; }
    }
    setDialogOpen(false);
    fetchEmployees();
  };

  const deleteEmployee = async (id: string) => {
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) { toast({ title: t("auth.error"), description: error.message, variant: "destructive" }); return; }
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  const validatePhone = (value: string) => {
    return value.replace(/\D/g, "").slice(0, 11);
  };

  const isPhoneValid = (value: string) => {
    if (!value) return true;
    return /^(010|011|012|015)\d{8}$/.test(value);
  };

  const getDisplayName = (e: Employee) => {
    if (i18n.language === "ar" && e.name_ar) return e.name_ar;
    return e.name;
  };


  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">{t("admin.employees")}</h1>
            <p className="text-muted-foreground mt-1">{t("admin.manageTeam")}</p>
          </div>
          <Button className="bg-gradient-gold text-primary-foreground" onClick={openAdd}>
            <Plus className="w-4 h-4 ltr:mr-2 rtl:ml-2" /> {t("admin.addEmployee")}
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Input
            placeholder={t("admin.filterByName")}
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="max-w-sm"
          />
          <Select value={groupBy} onValueChange={(value) => setGroupBy(value === 'none' ? '' : value as keyof Employee | '')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("admin.groupBy")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("admin.none")}</SelectItem>
              <SelectItem value="role">{t("admin.role")}</SelectItem>
              <SelectItem value="absent_day">{t("admin.absent_day")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="glass-card rounded-xl p-6">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">{t("auth.loading")}</p>
          ) : (Array.isArray(processedEmployees) ? processedEmployees.length === 0 : Object.keys(processedEmployees).length === 0) ? (
            <p className="text-muted-foreground text-center py-8">{t("admin.noData")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-start py-3 text-muted-foreground font-medium">{t("admin.image")}</th>
                    <th className="text-start py-3 text-muted-foreground font-medium cursor-pointer" onClick={() => requestSort('name')}>
                      <div className="flex items-center">{t("admin.employeeName")} {renderSortArrow('name')}</div>
                    </th>
                    <th className="text-start py-3 text-muted-foreground font-medium cursor-pointer" onClick={() => requestSort('name_ar')}>
                      <div className="flex items-center">{t("admin.nameAr")} {renderSortArrow('name_ar')}</div>
                    </th>
                    <th className="text-start py-3 text-muted-foreground font-medium cursor-pointer" onClick={() => requestSort('role')}>
                      <div className="flex items-center">{t("admin.role")} {renderSortArrow('role')}</div>
                    </th>
                    <th className="text-start py-3 text-muted-foreground font-medium cursor-pointer" onClick={() => requestSort('phone')}>
                      <div className="flex items-center">{t("booking.phone")} {renderSortArrow('phone')}</div>
                    </th>
                    <th className="text-start py-3 text-muted-foreground font-medium cursor-pointer" onClick={() => requestSort('salary')}>
                      <div className="flex items-center">{t("admin.salary")} {renderSortArrow('salary')}</div>
                    </th>
                    <th className="text-start py-3 text-muted-foreground font-medium cursor-pointer" onClick={() => requestSort('schedule')}>
                      <div className="flex items-center">{t("admin.schedule")} {renderSortArrow('schedule')}</div>
                    </th>
                    <th className="text-start py-3 text-muted-foreground font-medium cursor-pointer" onClick={() => requestSort('absent_day')}>
                      <div className="flex items-center">{t("admin.absent_day")} {renderSortArrow('absent_day')}</div>
                    </th>
                    <th className="text-start py-3 text-muted-foreground font-medium">{t("admin.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {groupBy ? (
                    Object.entries(processedEmployees as Record<string, Employee[]>).map(([group, items]) => (
                      <React.Fragment key={group}>
                        <tr className="bg-muted/50">
                          <td colSpan={9} className="py-2 px-4 font-bold text-primary">
                            {group} ({items.length})
                          </td>
                        </tr>
                        {items.map((e) => (
                          <tr key={e.id} className="border-b border-border/50">
                            <td className="py-3">
                              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground text-xs font-bold">
                                {e.name.charAt(0)}
                              </div>
                            </td>
                            <td className="py-3 font-medium">{e.name}</td>
                            <td className="py-3 text-muted-foreground">{e.name_ar || "—"}</td>
                            <td className="py-3">
                              <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">{t(`admin.${e.role}`)}</span>
                            </td>
                            <td className="py-3 text-muted-foreground">{e.phone || "—"}</td>
                            <td className="py-3 text-muted-foreground font-semibold">{e.salary || 0} {t("booking.price_mark")}</td>
                            <td className="py-3 text-muted-foreground">{e.schedule || "—"}</td>
                            <td className="py-3 text-muted-foreground">{e.absent_day || "—"}</td>
                            <td className="py-3 flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-green-700 hover:bg-green-700 hover:text-white" onClick={() => openEdit(e)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-white hover:bg-red-700" onClick={() => deleteEmployee(e.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))
                  ) : (
                    (processedEmployees as Employee[]).map((e) => (
                      <tr key={e.id} className="border-b border-border/50">
                        <td className="py-3">
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground text-xs font-bold">
                            {e.name.toLowerCase().includes("bogy") ? 
                              <img src={bogy} alt="B" className="w-8 h-8 rounded-full" /> :
                              e.name.toLowerCase().includes("gedo") ? <img src={gedo} alt="G" className="w-8 h-8 rounded-full" />
                              : e.name.toLowerCase().includes("adham") ? <img src={adham} alt="A" className="w-8 h-8 rounded-full" />
                              : e.name.charAt(0)}
                          </div>
                        </td>
                        <td className="py-3 font-medium">{e.name}</td>
                        <td className="py-3 text-muted-foreground">{e.name_ar || "—"}</td>
                        <td className="py-3">
                          <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">{t(`admin.${e.role}`)}</span>
                        </td>
                        <td className="py-3 text-muted-foreground">{e.phone || "—"}</td>
                        <td className="py-3 text-muted-foreground font-semibold">{e.salary || 0} {t("booking.price_mark")}</td>
                        <td className="py-3 text-muted-foreground">{e.schedule || "—"}</td>
                        <td className="py-3 text-muted-foreground">{e.absent_day || "—"}</td>
                        <td className="py-3 flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-700 hover:bg-green-700 hover:text-white" onClick={() => openEdit(e)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-white hover:bg-red-700" onClick={() => deleteEmployee(e.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? t("admin.editEmployee") : t("admin.addEmployee")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">{t("admin.employeeName")} (EN)</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t("admin.nameAr")}</label>
                <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} dir="rtl" />
              </div>
            </div>
            <div>
              {/* <label className="text-sm font-medium mb-1 block">{t("admin.role")}</label>
              <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /> */}
              
                <Select value={form.role || ''} onValueChange={(value) => setForm({ ...form, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.role")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="barber">{t("admin.barber")}</SelectItem>
                    <SelectItem value="employee">{t("admin.employee")}</SelectItem>
                    <SelectItem value="casher">{t("admin.casher")}</SelectItem>
                  </SelectContent>
                </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("booking.phone")}</label>
              <Input 
                value={form.phone} 
                onChange={(e) => setForm({ ...form, phone: validatePhone(e.target.value) })} 
                placeholder="01XXXXXXXXX"
                maxLength={11}
              />
              {form.phone && !isPhoneValid(form.phone) && (
                <p className="text-xs text-destructive mt-1">{t("admin.phoneValidation")}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">{t("admin.salary")}</label>
                <Input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t("admin.schedule")}</label>
                <Input value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} placeholder="Mon-Sat, 9AM-6PM" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t("admin.absent_day")}</label>
                <Input value={form.absent_day} onChange={(e) => setForm({ ...form, absent_day: e.target.value })} placeholder="Sun" />
              </div>
            </div>
            <Button onClick={handleSave} className="w-full bg-gradient-gold text-primary-foreground" disabled={!form.name.trim() || (!!form.phone && !isPhoneValid(form.phone))}>
              <Check className="w-4 h-4 ltr:mr-2 rtl:ml-2" /> {t("admin.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Employees;