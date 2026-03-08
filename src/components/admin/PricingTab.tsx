import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2, RefreshCw, Calculator, PoundSterling } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface ConfigRow {
  id: string;
  config_key: string;
  config_value: any;
  label: string | null;
  description: string | null;
}

const PricingTab = () => {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pricing_config")
      .select("*")
      .order("config_key");

    if (!error && data) {
      const rows = data as ConfigRow[];
      setConfigs(rows);
      const vals: Record<string, any> = {};
      rows.forEach((r) => { vals[r.config_key] = r.config_value; });
      setEditValues(vals);
    }
    setLoading(false);
  };

  const handleSave = async (configKey: string) => {
    setSaving(configKey);
    try {
      const value = editValues[configKey];
      const { error } = await supabase
        .from("pricing_config")
        .update({ config_value: value, updated_at: new Date().toISOString() })
        .eq("config_key", configKey);

      if (error) throw error;
      toast({ title: "Saved!", description: `${configKey} updated successfully.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const updateJsonField = (configKey: string, field: string, value: string) => {
    setEditValues((prev) => ({
      ...prev,
      [configKey]: { ...prev[configKey], [field]: parseFloat(value) || 0 },
    }));
  };

  const updateSimpleValue = (configKey: string, value: string) => {
    setEditValues((prev) => ({
      ...prev,
      [configKey]: parseFloat(value) || 0,
    }));
  };

  if (loading) {
    return <div className="text-muted-foreground text-center py-12">Loading pricing config…</div>;
  }

  const jsonConfigs = configs.filter((c) => typeof c.config_value === "object");
  const simpleConfigs = configs.filter((c) => typeof c.config_value !== "object");

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-serif font-bold text-foreground">Pricing Configuration</h2>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Adjust the premiums and rates used in price calculations.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchConfigs} className="text-muted-foreground hover:text-gold self-start sm:self-auto">
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Live Calculator */}
      <PriceCalculator editValues={editValues} />

      {/* Simple values */}
      <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
        {simpleConfigs.map((cfg) => (
          <Card key={cfg.config_key} className="bg-muted/30 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-foreground">{cfg.label || cfg.config_key}</CardTitle>
              {cfg.description && <CardDescription className="text-xs">{cfg.description}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="number"
                step="0.01"
                value={editValues[cfg.config_key] ?? ""}
                onChange={(e) => updateSimpleValue(cfg.config_key, e.target.value)}
                className="bg-muted/50 border-border"
              />
              <Button
                size="sm"
                onClick={() => handleSave(cfg.config_key)}
                disabled={saving === cfg.config_key}
                className="bg-gold text-navy hover:bg-gold-light"
              >
                {saving === cfg.config_key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                Save
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* JSON values (premiums) */}
      {jsonConfigs.map((cfg) => (
        <Card key={cfg.config_key} className="bg-muted/30 border-border">
          <CardHeader>
            <CardTitle className="text-sm text-foreground">{cfg.label || cfg.config_key}</CardTitle>
            {cfg.description && <CardDescription className="text-xs">{cfg.description}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {Object.entries(editValues[cfg.config_key] || {}).map(([field, val]) => (
                <div key={field}>
                  <Label className="text-xs text-muted-foreground">{field}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={val as number}
                    onChange={(e) => updateJsonField(cfg.config_key, field, e.target.value)}
                    className="bg-muted/50 border-border mt-1"
                  />
                </div>
              ))}
            </div>
            <Button
              size="sm"
              onClick={() => handleSave(cfg.config_key)}
              disabled={saving === cfg.config_key}
              className="bg-gold text-navy hover:bg-gold-light"
            >
              {saving === cfg.config_key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
              Save All
            </Button>
          </CardContent>
        </Card>
      ))}


      {/* Formula explanation */}
      <Card className="bg-muted/20 border-border">
        <CardContent className="p-5">
          <p className="text-xs text-muted-foreground font-mono">
            <strong className="text-foreground/60">Formula:</strong>{" "}
            price = max( (passengers / max_capacity) × distance × base_rate × time_premium × journey_premium , distance × minimum_charge_per_mile )
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

/* ── Calculator Component ─────────────────────────────────────────────── */

const TIME_OPTIONS = ["Morning", "Afternoon", "Early Morning", "Evening", "Late Night", "Overnight"];
const JOURNEY_OPTIONS = ["Corporate", "School Trip", "Other", "Airport Transfer", "Wedding", "Night Out"];
const PASSENGER_OPTIONS = ["1–4", "5–8", "9–12", "13–16"];

function PriceCalculator({ editValues }: { editValues: Record<string, any> }) {
  const [distance, setDistance] = useState(20);
  const [passengers, setPassengers] = useState("9–12");
  const [timePeriod, setTimePeriod] = useState("Afternoon");
  const [journeyType, setJourneyType] = useState("Other");

  const result = useMemo(() => {
    // Extract config values (fall back to defaults)
    const baseRate = typeof editValues["base_rate"] === "number" ? editValues["base_rate"] : 5;
    const maxCapacity = typeof editValues["max_capacity"] === "number" ? editValues["max_capacity"] : 16;
    const minChargePerMile = typeof editValues["minimum_charge_per_mile"] === "number" ? editValues["minimum_charge_per_mile"] : 10 / 3;

    const timePremiums = editValues["time_premiums"] || {};
    const journeyPremiums = editValues["journey_type_premiums"] || {};

    const timeVals = Object.values(timePremiums).filter((v): v is number => typeof v === "number");
    const journeyVals = Object.values(journeyPremiums).filter((v): v is number => typeof v === "number");

    const lowestTime = timeVals.length ? Math.min(...timeVals) : 1;
    const avgTime = timeVals.length ? timeVals.reduce((a, b) => a + b, 0) / timeVals.length : 1;
    const highestTime = timeVals.length ? Math.max(...timeVals) : 1;

    const lowestJourney = journeyVals.length ? Math.min(...journeyVals) : 1;
    const avgJourney = journeyVals.length ? journeyVals.reduce((a, b) => a + b, 0) / journeyVals.length : 1;
    const highestJourney = journeyVals.length ? Math.max(...journeyVals) : 1;

    const selectedTimePremium = timePremiums[timePeriod] ?? 1.0;
    const selectedJourneyPremium = journeyPremiums[journeyType] ?? 1.0;

    const match = passengers.match(/(\d+)$/);
    const pax = match ? parseInt(match[1]) : 8;

    const calc = (tp: number, jp: number) => {
      const fair = (pax / maxCapacity) * distance * baseRate * tp * jp;
      const min = distance * minChargePerMile;
      return Math.round(Math.max(fair, min) * 100) / 100;
    };

    return {
      selected: calc(selectedTimePremium, selectedJourneyPremium),
      min: calc(lowestTime, lowestJourney),
      avg: calc(avgTime, avgJourney),
      max: calc(highestTime, highestJourney),
      selectedTimePremium,
      selectedJourneyPremium,
    };
  }, [distance, passengers, timePeriod, journeyType, editValues]);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Calculator className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <CardTitle className="text-sm text-foreground">Price Calculator</CardTitle>
            <CardDescription className="text-xs">Test prices with current (unsaved) config values</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Distance (miles)</Label>
            <Input
              type="number"
              min={1}
              value={distance}
              onChange={(e) => setDistance(parseFloat(e.target.value) || 0)}
              className="bg-muted/50 border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Passengers</Label>
            <Select value={passengers} onValueChange={setPassengers}>
              <SelectTrigger className="bg-muted/50 border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PASSENGER_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Time of Day</Label>
            <Select value={timePeriod} onValueChange={setTimePeriod}>
              <SelectTrigger className="bg-muted/50 border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Journey Type</Label>
            <Select value={journeyType} onValueChange={setJourneyType}>
              <SelectTrigger className="bg-muted/50 border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {JOURNEY_OPTIONS.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator className="bg-border" />

        {/* Selected price */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <PoundSterling className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">£{result.selected.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              Selected: {timePeriod} ×{result.selectedTimePremium} · {journeyType} ×{result.selectedJourneyPremium}
            </p>
          </div>
        </div>

        {/* Min / Avg / Max */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Min</p>
            <p className="text-lg font-semibold text-blue-500">£{result.min.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">Lowest premiums</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Average</p>
            <p className="text-lg font-semibold text-amber-500">£{result.avg.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">Avg premiums</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Max</p>
            <p className="text-lg font-semibold text-rose-500">£{result.max.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">Highest premiums</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PricingTab;
