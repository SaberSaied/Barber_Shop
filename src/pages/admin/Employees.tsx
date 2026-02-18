import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

const Employees = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchEmployees = async () => {
    setLoading(true);
    const { data } = await supabase.from("employees").select("*").order("created_at", { ascending: true });
    if (data) setEmployees(data as Employee[]);
    setLoading(false);
  };

  useEffect(() => { fetchEmployees(); }, []);
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
      console.log(error.message)
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

        <div className="glass-card rounded-xl p-6">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">{t("auth.loading")}</p>
          ) : employees.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{t("admin.noData")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-start py-3 text-muted-foreground font-medium">{t("admin.image")}</th>
                    <th className="text-start py-3 text-muted-foreground font-medium">{t("admin.employeeName")}</th>
                    <th className="text-start py-3 text-muted-foreground font-medium">{t("admin.nameAr")}</th>
                    <th className="text-start py-3 text-muted-foreground font-medium">{t("admin.role")}</th>
                    <th className="text-start py-3 text-muted-foreground font-medium">{t("booking.phone")}</th>
                    <th className="text-start py-3 text-muted-foreground font-medium">{t("admin.salary")}</th>
                    <th className="text-start py-3 text-muted-foreground font-medium">{t("admin.schedule")}</th>
                    <th className="text-start py-3 text-muted-foreground font-medium">{t("admin.absent_day")}</th>
                    <th className="text-start py-3 text-muted-foreground font-medium">{t("admin.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e) => (
                    <tr key={e.id} className="border-b border-border/50">
                      <td className="py-3">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground text-xs font-bold">
                          {e.name.charAt(0)}
                        </div>
                      </td>
                      <td className="py-3 font-medium">{e.name}</td>
                      <td className="py-3 text-muted-foreground">{e.name_ar || "—"}</td>
                      <td className="py-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">{e.role}</span>
                      </td>
                      <td className="py-3 text-muted-foreground">{e.phone || "—"}</td>
                      <td className="py-3 text-primary font-semibold">${e.salary || 0}</td>
                      <td className="py-3 text-muted-foreground">{e.schedule || "—"}</td>
                      <td className="py-3 text-muted-foreground">{e.absent_day || "—"}</td>
                      <td className="py-3 flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteEmployee(e.id)}>
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
              <label className="text-sm font-medium mb-1 block">{t("admin.role")}</label>
              <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
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