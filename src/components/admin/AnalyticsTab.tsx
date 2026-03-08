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

const PIE_COLORS = ["#5B9A8B", "#3D7A6E", "#8BC4B5", "#2C5F54", "#A8D8C8", "#1E4A3F"];

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
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
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
    { label: "Total Enquiries", value: enquiries.length.toString(), icon: Users, change: "+12% this week", color: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400" },
    { label: "Conversion Rate", value: `${conversionRate}%`, icon: Target, change: "of all enquiries", color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" },
    { label: "Revenue (Paid)", value: `£${totalRevenue.toFixed(0)}`, icon: PoundSterling, change: "total collected", color: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400" },
    { label: "Avg. Quote", value: `£${avgPrice}`, icon: TrendingUp, change: "per enquiry", color: "bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400" },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="bg-white dark:bg-card border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-3xl font-bold tracking-tight text-foreground">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.change}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${kpi.color}`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enquiries Over Time - Area Chart */}
      <Card className="bg-white dark:bg-card border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground">Enquiries Over Time</CardTitle>
          <p className="text-xs text-muted-foreground">Daily enquiry volume</p>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <AreaChart data={enquiriesOverTime}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(168, 32%, 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(168, 32%, 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 12%, 90%)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "hsl(210, 10%, 50%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(210, 10%, 50%)", fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="count" stroke="hsl(168, 32%, 45%)" strokeWidth={2} fill="url(#colorCount)" />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Journey Type - Pie */}
        <Card className="bg-white dark:bg-card border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground">Journey Types</CardTitle>
            <p className="text-xs text-muted-foreground">Breakdown by category</p>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={journeyTypeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: "hsl(210, 10%, 70%)" }}
                  >
                    {journeyTypeData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Breakdown - Horizontal Bar */}
        <Card className="bg-white dark:bg-card border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground">Status Breakdown</CardTitle>
            <p className="text-xs text-muted-foreground">Current enquiry statuses</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <BarChart data={statusData} layout="vertical" barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 12%, 90%)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "hsl(210, 10%, 50%)", fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: "hsl(210, 10%, 50%)", fontSize: 11 }} width={80} axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="hsl(168, 32%, 45%)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsTab;
