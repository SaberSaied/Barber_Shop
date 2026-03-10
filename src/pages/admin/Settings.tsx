import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DateRange } from "react-day-picker";
import { format, parseISO } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const Settings = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [eidFee, setEidFee] = useState("");
  const [eidInterval, setEidInterval] = useState<DateRange | undefined>();

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("settings").select("key, value");

    if (error) {
      toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
    } else if (data) {
      const settingsMap = new Map(data.map(s => [s.key, s.value]));
      setEidFee(settingsMap.get("eid_fee") || "");
      const interval = settingsMap.get("eid_interval");
      if (interval && interval?.['start'] && interval?.['end']) {
        setEidInterval({
          from: parseISO(interval?.['start']),
          to: parseISO(interval?.['end']),
        });
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    const updates = [
      supabase.from("settings").upsert({ key: "eid_fee", value: eidFee }),
      supabase.from("settings").upsert({ 
        key: "eid_interval", 
        value: {
          start: eidInterval?.['from'] ? format(eidInterval['from'], "yyyy-MM-dd") : null,
          end: eidInterval?.['to'] ? format(eidInterval['to'], "yyyy-MM-dd") : null,
        }
      }),
    ];

    const results = await Promise.all(updates);
    const hasError = results.some(res => res.error);

    if (hasError) {
      toast({ title: t("auth.error"), description: t("admin.settingsUpdateError"), variant: "destructive" });
    } else {
      toast({ title: t("admin.settingsUpdated"), description: t("admin.settingsUpdatedSuccess") });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("admin.settings")}</h1>
          <p className="text-muted-foreground mt-1">{t("admin.manageAppSettings")}</p>
        </div>

        <div className="space-y-4 max-w-lg">
          <div>
            <label className="text-sm font-medium mb-1 block">{t("admin.eidFee")}</label>
            <Input 
              type="number"
              value={eidFee}
              onChange={(e) => setEidFee(e.target.value)}
              placeholder="e.g., 20"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">{t("admin.eidDateRange")}</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {eidInterval?.from ? (
                    eidInterval.to ? (
                      <>
                        {format(eidInterval.from, "LLL dd, y")} -{" "}
                        {format(eidInterval.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(eidInterval.from, "LLL dd, y")
                    )
                  ) : (
                    <span>{t("admin.pickADateRange")}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={eidInterval?.from}
                  selected={eidInterval}
                  onSelect={setEidInterval}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button onClick={handleSave} disabled={loading}>
            {loading ? t("admin.saving") : t("admin.saveChanges")}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Settings;
