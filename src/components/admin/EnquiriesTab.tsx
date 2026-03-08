import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Users, Calendar, MapPin, Phone, Mail } from "lucide-react";

interface Enquiry {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  journey_type: string | null;
  passengers: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  date: string | null;
  pickup_time: string | null;
  return_journey: boolean | null;
  return_time: string | null;
  distance_miles: number | null;
  duration_minutes: number | null;
  estimated_price: number | null;
  status: string;
  payment_status: string | null;
  notes: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-300 border-yellow-500/30",
  offered: "bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500/30",
  confirmed: "bg-green-500/20 text-green-600 dark:text-green-300 border-green-500/30",
  rejected: "bg-red-500/20 text-red-600 dark:text-red-300 border-red-500/30",
};

const paymentColors: Record<string, string> = {
  unpaid: "bg-red-500/20 text-red-600 dark:text-red-300 border-red-500/30",
  processing: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-300 border-yellow-500/30",
  paid: "bg-green-500/20 text-green-600 dark:text-green-300 border-green-500/30",
};

const EnquiriesTab = () => {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const fetchEnquiries = async () => {
    const { data, error } = await supabase
      .from("enquiries")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setEnquiries(data as Enquiry[]);
    setLoading(false);
  };

  const filtered = enquiries.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.full_name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.phone.includes(q) ||
      (e.journey_type?.toLowerCase().includes(q) ?? false)
    );
  });

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  if (loading) {
    return <div className="text-muted-foreground text-center py-12">Loading enquiries…</div>;
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: "Total", value: enquiries.length, color: "text-foreground" },
          { label: "Pending", value: enquiries.filter((e) => e.status === "pending").length, color: "text-yellow-600 dark:text-yellow-300" },
          { label: "Confirmed", value: enquiries.filter((e) => e.status === "confirmed").length, color: "text-green-600 dark:text-green-300" },
          { label: "Paid", value: enquiries.filter((e) => e.payment_status === "paid").length, color: "text-gold" },
        ].map((s) => (
          <Card key={s.label} className="bg-muted/50 border-border">
            <CardContent className="p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, phone, type…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-muted/50 border-border"
        />
      </div>

      {/* Enquiry cards */}
      <div className="space-y-2 sm:space-y-3">
        {filtered.map((e) => (
          <Card key={e.id} className="bg-card border-border hover:border-primary/30 transition-colors">
            <CardContent className="p-3 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{e.full_name}</h3>
                    <Badge variant="outline" className={`text-[10px] sm:text-xs ${statusColors[e.status] || ""}`}>{e.status}</Badge>
                    <Badge variant="outline" className={`text-[10px] sm:text-xs ${paymentColors[e.payment_status || "unpaid"] || ""}`}>
                      {e.payment_status || "unpaid"}
                    </Badge>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-1 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3 shrink-0" />{e.email}</span>
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3 shrink-0" />{e.phone}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3 shrink-0" />{formatDate(e.created_at)}</span>
                  </div>
                </div>
                {e.estimated_price && (
                  <div className="text-left sm:text-right shrink-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Est. Price</p>
                    <p className="text-lg sm:text-xl font-bold text-gold">£{e.estimated_price}</p>
                  </div>
                )}
              </div>

              <div className="mt-2 sm:mt-3 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
                {e.journey_type && (
                  <div className="flex items-center gap-1 sm:gap-1.5 bg-muted/50 rounded px-2 py-1 sm:px-2.5 sm:py-1.5">
                    <span className="text-muted-foreground/70">Type:</span> <span className="truncate">{e.journey_type}</span>
                  </div>
                )}
                {e.passengers && (
                  <div className="flex items-center gap-1 sm:gap-1.5 bg-muted/50 rounded px-2 py-1 sm:px-2.5 sm:py-1.5">
                    <Users className="h-3 w-3 shrink-0" /> {e.passengers} pax
                  </div>
                )}
                {e.date && (
                  <div className="flex items-center gap-1 sm:gap-1.5 bg-muted/50 rounded px-2 py-1 sm:px-2.5 sm:py-1.5">
                    <Calendar className="h-3 w-3 shrink-0" /> {e.date}
                  </div>
                )}
                {e.distance_miles && (
                  <div className="flex items-center gap-1 sm:gap-1.5 bg-muted/50 rounded px-2 py-1 sm:px-2.5 sm:py-1.5">
                    <MapPin className="h-3 w-3 shrink-0" /> {e.distance_miles} mi
                  </div>
                )}
              </div>

              {(e.pickup_address || e.dropoff_address) && (
                <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                  {e.pickup_address && <p><strong className="text-foreground/70">From:</strong> {e.pickup_address}</p>}
                  {e.dropoff_address && <p><strong className="text-foreground/70">To:</strong> {e.dropoff_address}</p>}
                </div>
              )}

              {e.notes && (
                <p className="mt-2 text-xs text-muted-foreground/70 italic">"{e.notes}"</p>
              )}
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No enquiries found.</p>
        )}
      </div>
    </div>
  );
};

export default EnquiriesTab;
