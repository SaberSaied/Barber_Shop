import { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, X, Check, ArrowUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import React from "react";

interface Service {
  id: string;
  name_en: string;
  name_ar: string;
  category: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
}

type SortDirection = 'asc' | 'desc';

const emptyForm = { name_en: "", name_ar: "", category: "hair", price: 0, duration_minutes: 30, is_active: true };

const ServicesManagement = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [nameFilter, setNameFilter] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Service; direction: SortDirection }>({ key: 'name_en', direction: 'asc' });
  const [groupBy, setGroupBy] = useState<'category' | ''>('');
  const { t } = useTranslation();
  const { toast } = useToast();


  const fetchServices = async () => {
    setLoading(true);
    const { data } = await supabase.from("services").select("*").order("created_at", { ascending: true });
    if (data) setServices(data);
    setLoading(false);
  };

  useEffect(() => { fetchServices(); }, []);

  const filteredServices = useMemo(() => {
    let processedServices = [...services];

    if (nameFilter) {
      const lowercasedFilter = nameFilter.toLowerCase();
      processedServices = processedServices.filter(service =>
        service.name_en.toLowerCase().includes(lowercasedFilter) ||
        service.name_ar.toLowerCase().includes(lowercasedFilter)
      );
    }

    processedServices.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    if (!groupBy) {
      return processedServices;
    }

    const grouped = processedServices.reduce((acc, service) => {
      const key = service[groupBy];
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(service);
      return acc;
    }, {} as Record<string, Service[]>);

    return grouped;

  }, [services, nameFilter, sortConfig, groupBy]);

  const requestSort = (key: keyof Service) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortArrow = (key: keyof Service) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-4 h-4 ml-2 opacity-20" />;
    return sortConfig.direction === 'asc' ? <span className="ml-1">▲</span> : <span className="ml-1">▼</span>;
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditingId(s.id);
    setForm({ name_en: s.name_en, name_ar: s.name_ar, category: s.category, price: s.price, duration_minutes: s.duration_minutes, is_active: s.is_active });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name_en || !form.name_ar || form.price <= 0) return;
    if (editingId) {
      const { error } = await supabase.from("services").update(form).eq("id", editingId);
      if (error) { toast({ title: t("auth.error"), description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("services").insert(form);
      if (error) { toast({ title: t("auth.error"), description: error.message, variant: "destructive" }); return; }
    }
    setDialogOpen(false);
    fetchServices();
  };

  const toggleActive = async (s: Service) => {
    const { error } = await supabase.from("services").update({ is_active: !s.is_active }).eq("id", s.id);
    if (!error) setServices((prev) => prev.map((sv) => sv.id === s.id ? { ...sv, is_active: !sv.is_active } : sv));
  };

  const deleteService = async (id: string) => {
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) { toast({ title: t("auth.error"), description: error.message, variant: "destructive" }); return; }
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const categoryLabel = (c: string) => {
    const map: Record<string, string> = { hair: t("admin.hair"), beard: t("admin.beard"), packages: t("admin.packages"), face: t("admin.face"), vip: t("admin.vip") };
    return map[c] || c;
  };


  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">{t("admin.services")}</h1>
            <p className="text-muted-foreground mt-1">{t("admin.manageServices")}</p>
          </div>
          <Button className="bg-gradient-gold text-primary-foreground" onClick={openAdd}>
            <Plus className="w-4 h-4 ltr:mr-2 rtl:ml-2" /> {t("admin.addService")}
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Input
            placeholder={t("admin.filterByName")}
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="max-w-sm"
          />
          <Select value={groupBy} onValueChange={(value) => setGroupBy(value === 'none' ? '' : value as 'category')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("admin.groupBy")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("admin.none")}</SelectItem>
              <SelectItem value="category">{t("admin.category")}</SelectItem>
              <SelectItem value="is_active">{t("admin.active")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="glass-card rounded-xl p-6">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">{t("auth.loading")}</p>
          ) : Object.keys(filteredServices).length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{t("admin.noServices")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm overflow-auto text-center">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-start p-3 text-muted-foreground font-medium cursor-pointer" onClick={() => requestSort('name_en')}>
                      <div className="flex items-center">{t("admin.serviceName")} {renderSortArrow('name_en')}</div>
                    </th>
                    <th className="text-start p-3 text-muted-foreground font-medium cursor-pointer" onClick={() => requestSort('name_ar')}>
                      <div className="flex items-center">{t("admin.serviceNameAr")} {renderSortArrow('name_ar')}</div>
                    </th>
                    <th className="text-start p-3 text-muted-foreground font-medium cursor-pointer" onClick={() => requestSort('category')}>
                      <div className="flex items-center">{t("admin.category")} {renderSortArrow('category')}</div>
                    </th>
                    <th className="text-start p-3 text-muted-foreground font-medium cursor-pointer" onClick={() => requestSort('price')}>
                      <div className="flex items-center">{t("admin.price")} {renderSortArrow('price')}</div>
                    </th>
                    <th className="text-start p-3 text-muted-foreground font-medium cursor-pointer" onClick={() => requestSort('duration_minutes')}>
                      <div className="flex items-center">{t("admin.duration")} {renderSortArrow('duration_minutes')}</div>
                    </th>
                    <th className="text-start p-3 text-muted-foreground font-medium">{t("admin.active")}</th>
                    <th className="text-start p-3 text-muted-foreground font-medium">{t("admin.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {groupBy ? (
                    Object.entries(filteredServices as Record<string, Service[]>).map(([group, items]) => (
                      <React.Fragment key={group}>
                        <tr className="bg-muted/50">
                          <td colSpan={6} className="py-2 px-4 font-bold text-primary">
                            {categoryLabel(group)} ({items.length})
                          </td>
                        </tr>
                        {items.map((s) => (
                          <tr key={s.id} className="border-b border-border/50">
                            <td className="py-3 font-medium">{s.name_en}</td>
                            <td className="py-3 font-medium">{s.name_ar}</td>
                            <td className="py-3">
                              <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">{categoryLabel(s.category)}</span>
                            </td>
                            <td className="py-3 text-primary font-semibold">{s.price} {t("booking.price_mark")}</td>
                            <td className="py-3 text-muted-foreground">{s.duration_minutes} {t("services.min")}</td>
                            <td className="py-3">
                              <Switch checked={s.is_active} onCheckedChange={() => toggleActive(s)} />
                            </td>
                            <td className="py-3 flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-green-700 hover:bg-green-700 hover:text-white" onClick={() => openEdit(s)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-white hover:bg-red-700" onClick={() => deleteService(s.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))
                  ) : (
                    (filteredServices as Service[]).map((s) => (
                      <tr key={s.id} className="border-b border-border/50">
                        <td className="py-3 font-medium">{s.name_en}</td>
                        <td className="py-3 font-medium">{s.name_ar}</td>
                        <td className="py-3">
                          <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">{categoryLabel(s.category)}</span>
                        </td>
                        <td className="py-3 text-primary font-semibold">{s.price} {t("booking.price_mark")}</td>
                        <td className="py-3 text-muted-foreground">{s.duration_minutes} {t("services.min")}</td>
                        <td className="py-3">
                          <Switch checked={s.is_active} onCheckedChange={() => toggleActive(s)} />
                        </td>
                        <td className="py-3 flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-700 hover:bg-green-700 hover:text-white" onClick={() => openEdit(s)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-white hover:bg-red-700" onClick={() => deleteService(s.id)}>
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
            <DialogTitle>{editingId ? t("admin.editService") : t("admin.addService")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">{t("admin.nameEn")}</label>
              <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("admin.nameAr")}</label>
              <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} dir="rtl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("admin.category")}</label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hair">{t("admin.hair")}</SelectItem>
                  <SelectItem value="beard">{t("admin.beard")}</SelectItem>
                  <SelectItem value="face">{t("admin.face")}</SelectItem>
                  <SelectItem value="packages">{t("admin.packages")}</SelectItem>
                  <SelectItem value="vip">{t("admin.vip")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">{t("admin.price")}</label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t("admin.duration")}</label>
                <Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
              </div>
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

export default ServicesManagement;