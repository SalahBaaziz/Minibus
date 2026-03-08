import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, CartesianGrid } from "recharts";
import { TrendingUp, Users, PoundSterling, Target } from "lucide-react";

interface Enquiry {
  id: string;
  created_at: string;
  journey_type: string | null;
  status: string;
  estimated_price: number | null;
  payment_status: string | null;
}

const PIE_COLORS = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899"];

const STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  offered: "#3B82F6",
  confirmed: "#10B981",
  rejected: "#EF4444",
  cancelled: "#6B7280",
  paid: "#8B5CF6",
};

const KPI_STYLES = [
  { icon: Users, bg: "bg-blue-500/10", text: "text-blue-500" },
  { icon: Target, bg: "bg-amber-500/10", text: "text-amber-500" },
  { icon: PoundSterling, bg: "bg-emerald-500/10", text: "text-emerald-500" },
  { icon: TrendingUp, bg: "bg-violet-500/10", text: "text-violet-500" },
];

const AnalyticsTab = () => {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("enquiries")
      .select("id, created_at, journey_type, status, estimated_price, payment_status")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setEnquiries(data as Enquiry[]);
        setLoading(false);
      });
  }, []);

  const enquiriesOverTime = useMemo(() => {
    const byDay: Record<string, number> = {};
    enquiries.forEach((e) => {
      const day = new Date(e.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      byDay[day] = (byDay[day] || 0) + 1;
    });
    return Object.entries(byDay).map(([date, count]) => ({ date, count }));
  }, [enquiries]);

  const journeyTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    enquiries.forEach((e) => {
      const type = e.journey_type || "Other";
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [enquiries]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    enquiries.forEach((e) => {
      counts[e.status] = (counts[e.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value, ]) => ({ name, value, fill: STATUS_COLORS[name] || "#6B7280" }));
  }, [enquiries]);

  const totalRevenue = useMemo(() => {
    return enquiries
      .filter((e) => e.payment_status === "paid" && e.estimated_price)
      .reduce((sum, e) => sum + (e.estimated_price || 0), 0);
  }, [enquiries]);

  const conversionRate = useMemo(() => {
    if (!enquiries.length) return 0;
    const confirmed = enquiries.filter((e) => e.status === "confirmed" || e.payment_status === "paid").length;
    return Math.round((confirmed / enquiries.length) * 100);
  }, [enquiries]);

  const avgPrice = useMemo(() => {
    const withPrice = enquiries.filter((e) => e.estimated_price);
    if (!withPrice.length) return 0;
    return Math.round(withPrice.reduce((s, e) => s + (e.estimated_price || 0), 0) / withPrice.length);
  }, [enquiries]);

  if (loading) {
    return <div className="text-muted-foreground text-center py-12">Loading analytics…</div>;
  }

  const chartConfig = {
    count: { label: "Enquiries", color: "hsl(168, 32%, 45%)" },
    value: { label: "Count", color: "hsl(168, 32%, 45%)" },
  };

  const kpis = [
    { label: "Total Enquiries", value: enquiries.length.toString(), sub: "all time" },
    { label: "Conversion Rate", value: `${conversionRate}%`, sub: "confirmed / total" },
    { label: "Revenue", value: `£${totalRevenue.toFixed(0)}`, sub: "paid bookings" },
    { label: "Avg. Quote", value: `£${avgPrice}`, sub: "per enquiry" },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => {
          const style = KPI_STYLES[i];
          return (
            <Card key={kpi.label} className="border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${style.bg}`}>
                    <style.icon className={`h-5 w-5 ${style.text}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                    <p className="text-[11px] text-muted-foreground">{kpi.sub}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Enquiries Over Time */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Enquiries Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <AreaChart data={enquiriesOverTime}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" allowDecimals={false} axisLine={false} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} fill="url(#colorCount)" />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Journey Type Pie */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Journey Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={journeyTypeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={3}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {journeyTypeData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 justify-center mt-1">
              {journeyTypeData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {item.name}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={statusData} layout="vertical" barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 justify-center mt-1">
              {statusData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ backgroundColor: item.fill }} />
                  {item.name}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsTab;
