import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, CheckCircle2, ChevronRight, ChevronLeft, User, Scissors, CalendarDays, UserCheck, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { format } from "date-fns";
import { adham, bogy, gedo } from "@/assets";

const MAX_CUSTOMERS_PER_BARBER = 30;

interface ServiceOption {
  id: string;
  name_en: string;
  name_ar: string;
  price: number;
  category: string;
}

interface BarberOption {
  id: string;
  name: string;
  name_ar: string | null;
  absent_day: string | null;
}

const TOTAL_STEPS = 5;

const BookingSection = () => {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [groupedServices, setGroupedServices] = useState<Record<string, ServiceOption[]>>({});
  const [barbers, setBarbers] = useState<BarberOption[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [date, setDate] = useState<Date | undefined>();
  const [barber, setBarber] = useState("");
  const [customerNumber, setCustomerNumber] = useState<number | null>(null);
  const [takenNumbers, setTakenNumbers] = useState<number[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [pendingPhoneError, setPendingPhoneError] = useState("");
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      const [srvRes, empRes] = await Promise.all([
        supabase.from("services").select("id, name_en, name_ar, price, category").eq("is_active", true),
        supabase.from("employees").select("*").eq("is_active", true).eq("role", "barber"),
      ]);
      if (srvRes.data) {
        const servicesData = srvRes.data as ServiceOption[];
        setServices(servicesData);
        const grouped = servicesData.reduce((acc, service) => {
          const category = service.category || 'Uncategorized';
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(service);
          return acc;
        }, {} as Record<string, ServiceOption[]>);
        setGroupedServices(grouped);
      }
      if (empRes.data) setBarbers(empRes.data as BarberOption[]);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!barber || !date) return;
    const fetchTaken = async () => {
      setLoadingSlots(true);
      const dateStr = format(date, "yyyy-MM-dd");
      const { data } = await supabase
        .from("bookings")
        .select("booking_time")
        .eq("barber_preference", barber)
        .eq("booking_date", dateStr);
      if (data) {
        setTakenNumbers(data.map((b) => parseInt(b.booking_time)).filter((n) => !isNaN(n)));
      }
      setLoadingSlots(false);
    };
    fetchTaken();
    setCustomerNumber(null);
  }, [barber, date]);

  const validatePhone = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    setPhone(cleaned);
    setPendingPhoneError("");
    if (cleaned && !/^(010|011|012|015)\d{8}$/.test(cleaned)) {
      setPhoneError(t("booking.phoneError"));
    } else {
      setPhoneError("");
    }
  };

  useEffect(() => setBarber(''), [date]);

  const checkPendingBooking = async (): Promise<boolean> => {
    if (!phone) return false;
    const { data } = await supabase
      .from("bookings")
      .select("id")
      .eq("customer_phone", phone)
      .eq("status", "pending")
      .limit(1);
    if (data && data.length > 0) {
      setPendingPhoneError(t("booking.alreadyPending"));
      return true;
    }
    return false;
  };

  const canProceed = () => {
    switch (step) {
      case 1: return name.trim().length > 0 && /^(010|011|012|015)\d{8}$/.test(phone) && !pendingPhoneError;
      case 2: return selectedServices.length > 0;
      case 3: return !!date;
      case 4: return barber !== "";
      case 5: return customerNumber !== null;
      default: return false;
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      const hasPending = await checkPendingBooking();
      if (hasPending) return;
    }
    setStep(step + 1);
  };

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;
    setLoading(true);
    try {
      const dateStr = format(date!, "yyyy-MM-dd");
      const { error } = await supabase.from("bookings").insert({
        customer_id: user?.id || null,
        customer_name: name,
        customer_phone: phone,
        service_id: selectedServices[0] || null,
        barber_preference: barber,
        booking_date: dateStr,
        booking_time: String(customerNumber),
        notes: selectedServices.length > 0 ? selectedServices.join(",") : null,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({ title: t("auth.error"), description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getServiceName = (s: ServiceOption) => i18n.language === "ar" ? s.name_ar : s.name_en;
  const isAvailable = (b: BarberOption) => date?.toLocaleDateString('en-US', {weekday: 'short'}).toLowerCase() !== b.absent_day.toLowerCase();
  const getBarberName = (b: BarberOption) => (i18n.language === "ar" && b.name_ar) ? b.name_ar : b.name;

  const stepIcons = [User, Scissors, CalendarDays, UserCheck, Hash];

  if (submitted) {
    return (
      <section id="booking" className="section-padding bg-gradient-dark">
        <div className="container mx-auto max-w-lg text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="font-display text-3xl font-bold mb-2">{t("booking.confirmed")}</h2>
            <p className="text-muted-foreground mb-6">{t("booking.confirmSub")}</p>
            <Button variant="outline" onClick={() => {
              setSubmitted(false);
              setStep(1);
              setName(""); setPhone(""); setSelectedServices([]); setDate(undefined); setBarber(""); setCustomerNumber(null); setPendingPhoneError("");
            }}>{t("booking.bookAnother")}</Button>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="booking" className="section-padding bg-gradient-dark">
      <div className="container mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-primary ltr:tracking-[0.3em] uppercase rtl:text-lg mb-3">{t("booking.tagline")}</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            {t("booking.title")} <span className="text-gradient-gold">{t("booking.titleHighlight")}</span>
          </h2>
        </motion.div>

        <div className="glass-card rounded-xl p-8">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              {stepIcons.map((Icon, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                    step > i + 1 ? "bg-primary text-primary-foreground" :
                    step === i + 1 ? "bg-primary/20 text-primary border-2 border-primary" :
                    "bg-secondary text-muted-foreground"
                  )}>
                    {step > i + 1 ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground hidden sm:block">
                    {t(`booking.step${i + 1}`)}
                  </span>
                </div>
              ))}
            </div>
            <Progress value={(step / TOTAL_STEPS) * 100} className="h-1.5 rtl:rotate-180" />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="min-h-[250px]"
            >
              {/* Step 1: Name & Phone */}
              {step === 1 && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-foreground">{t("booking.step1Title")}</h3>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">{t("booking.fullName")}</label>
                    <Input
                      placeholder={t("booking.namePlaceholder")}
                      className="bg-secondary border-border h-12"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">{t("booking.phone")}</label>
                    <Input
                      placeholder="01XXXXXXXXX"
                      className={cn("bg-secondary border-border h-12", (phoneError || pendingPhoneError) && "border-destructive")}
                      value={phone}
                      onChange={(e) => validatePhone(e.target.value)}
                      maxLength={11}
                    />
                    {phoneError && <p className="text-xs text-destructive mt-1">{phoneError}</p>}
                    {pendingPhoneError && <p className="text-xs text-destructive mt-1">{pendingPhoneError}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{t("booking.phoneHint")}</p>
                  </div>
                </div>
              )}

              {/* Step 2: Services (Multi-select) */}
              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-foreground">{t("booking.step2Title")}</h3>
                  <p className="text-sm text-muted-foreground">{t("booking.selectMultiple")}</p>
                  <div className="space-y-4">
                    {Object.entries(groupedServices).map(([category, servicesInCategory]) => (
                      <div key={category}>
                        <h4 className="text-lg font-semibold text-primary mb-2">{t(`admin.${category}`)}</h4>
                        <div className="grid gap-3">
                          {servicesInCategory.map((s) => {
                            const selected = selectedServices.includes(s.id);
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => toggleService(s.id)}
                                className={cn(
                                  "flex items-center justify-between p-4 rounded-lg border-2 transition-all text-start",
                                  selected
                                    ? "border-primary bg-primary/10"
                                    : "border-border bg-secondary hover:border-primary/50"
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                                    selected ? "bg-primary border-primary" : "border-muted-foreground"
                                  )}>
                                    {selected && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />}
                                  </div>
                                  <span className="font-medium text-foreground">{getServiceName(s)}</span>
                                </div>
                                <span className="text-primary font-semibold">{s.price} {t("booking.price_mark")}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedServices.length > 0 && (
                    <div className="flex justify-between text-sm font-medium pt-2 border-t border-border">
                      <span className="text-muted-foreground">{t("booking.total")}</span>
                      <span className="text-primary">
                        ${services.filter((s) => selectedServices.includes(s.id)).reduce((sum, s) => sum + s.price, 0)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Date */}
              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-foreground">{t("booking.step3Title")}</h3>
                  <div className="flex justify-center">
                    <CalendarPicker
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                      className="p-3 pointer-events-auto bg-secondary rounded-lg"
                    />
                  </div>
                  {date && (
                    <p className="text-center text-sm text-primary font-medium">
                      {t("booking.selected")}: {format(date, "PPP")}
                    </p>
                  )}
                </div>
              )}

              {/* Step 4: Barber */}
              {step === 4 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-foreground">{t("booking.step4Title")}</h3>
                  <div className="grid gap-3">
                    {barbers.map((b) => {
                      if (!isAvailable(b)) {
                        return null;
                      } else {

                      const selected = barber === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setBarber(b.id)}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-lg border-2 transition-all",
                            selected
                              ? "border-primary bg-primary/10"
                              : "border-border bg-secondary hover:border-primary/50"
                          )}
                        >
                          <div className={cn(
                            "w-12 h-12 rounded-full bg-muted flex items-center justify-center",
                            selected && "bg-primary/20"
                          )}>
                            {getBarberName(b).toLowerCase().includes("bogy") ? 
                              <img src={bogy} alt="B" className="w-full h-full object-cover rounded-full" /> :
                              getBarberName(b).toLowerCase().includes("gedo") ? <img src={gedo} alt="G" className="w-full h-full object-cover rounded-full" />
                              : getBarberName(b).toLowerCase().includes("adham") ? <img src={adham} alt="A" className="w-full h-full object-cover rounded-full" />
                              :<UserCheck className={cn("w-6 h-6", selected ? "text-primary" : "text-muted-foreground")} />}
                          </div>
                          <span className="font-medium text-foreground">{getBarberName(b)}</span>
                        </button>
                      );}
                    })}
                  </div>
                </div>
              )}

              {/* Step 5: Customer Number */}
              {step === 5 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-foreground">{t("booking.step5Title")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("booking.queueHint", { barber: getBarberName(barbers.find((b) => b.id === barber) || { id: "", name: "", name_ar: null } as BarberOption) })}
                  </p>
                  {loadingSlots ? (
                    <div className="text-center py-8 text-muted-foreground">{t("auth.loading")}</div>
                  ) : (
                    <div className="grid grid-cols-5 gap-3">
                      {Array.from({ length: MAX_CUSTOMERS_PER_BARBER }, (_, i) => i + 1).map((num) => {
                        const taken = takenNumbers.includes(num);
                        const selected = customerNumber === num;
                        return (
                          <button
                            key={num}
                            type="button"
                            disabled={taken}
                            onClick={() => setCustomerNumber(num)}
                            className={cn(
                              "h-12 rounded-lg font-semibold text-sm transition-all",
                              taken
                                ? "bg-muted text-muted-foreground cursor-not-allowed opacity-40 line-through"
                                : selected
                                ? "bg-primary text-primary-foreground shadow-lg scale-105"
                                : "bg-secondary border border-border text-foreground hover:border-primary"
                            )}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex gap-4 text-xs text-muted-foreground pt-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-secondary border border-border" />
                      {t("booking.available")}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-muted opacity-40" />
                      {t("booking.taken")}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-8 gap-4">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-2">
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                {t("booking.back")}
              </Button>
            ) : <div />}

            {step < TOTAL_STEPS ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="bg-gradient-gold text-primary-foreground font-semibold gap-2"
              >
                {t("booking.next")}
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || loading}
                size="lg"
                className="bg-gradient-gold text-primary-foreground font-semibold tracking-wide uppercase glow-gold gap-2"
              >
                <Calendar className="w-5 h-5" />
                {loading ? t("auth.loading") : t("booking.confirmBooking")}
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">{t("booking.cancellation")}</p>
        </div>
      </div>
    </section>
  );
};

export default BookingSection;