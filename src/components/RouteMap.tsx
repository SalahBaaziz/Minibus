import { useEffect, useRef, useState, useMemo, Component, type ReactNode } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2 } from "lucide-react";
import type { LocationResult } from "./LocationAutocomplete";

// ── Leaflet icon patch ────────────────────────────────────────────────────────
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
} catch { /* already patched */ }

const pickupIcon = new L.Icon({
  iconUrl:   "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const dropoffIcon = new L.Icon({
  iconUrl:   "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

export interface RouteInfo {
  distanceMiles: number;
  durationMinutes: number;
  routeCoords: [number, number][];
}

interface RouteMapProps {
  pickup:  LocationResult | null;
  dropoff: LocationResult | null;
  onRouteCalculated: (info: RouteInfo | null) => void;
  onLoadingChange?: (loading: boolean) => void;
}

// ── Error boundary ────────────────────────────────────────────────────────────
interface EBState { hasError: boolean; message: string }
class MapErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false, message: "" };
  static getDerivedStateFromError(err: Error): EBState {
    return { hasError: true, message: err.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center rounded-lg border border-red-400/30 bg-red-400/10 h-20 text-xs text-red-400 p-4">
          Map failed to load: {this.state.message}
        </div>
      );
    }
    return this.props.children;
  }
}

const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";

// ── Core map component — pure Leaflet JS, no react-leaflet ───────────────────
const LeafletMap = ({ pickup, dropoff, onRouteCalculated }: RouteMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const pickupMarker = useRef<L.Marker | null>(null);
  const dropoffMarker= useRef<L.Marker | null>(null);
  const polylineRef  = useRef<L.Polyline | null>(null);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Initialise map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      center: [53.8, -1.55],
      zoom: 10,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers + route whenever pickup/dropoff change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers / polyline
    pickupMarker.current?.remove();
    dropoffMarker.current?.remove();
    polylineRef.current?.remove();
    pickupMarker.current  = null;
    dropoffMarker.current = null;
    polylineRef.current   = null;

    if (pickup) {
      pickupMarker.current = L.marker([pickup.lat, pickup.lon], { icon: pickupIcon })
        .bindPopup(`Pick-up: ${pickup.displayName}`)
        .addTo(map);
    }

    if (dropoff) {
      dropoffMarker.current = L.marker([dropoff.lat, dropoff.lon], { icon: dropoffIcon })
        .bindPopup(`Drop-off: ${dropoff.displayName}`)
        .addTo(map);
    }

    if (!pickup || !dropoff) {
      onRouteCalculated(null);
      if (pickup)  map.setView([pickup.lat,  pickup.lon],  12);
      if (dropoff) map.setView([dropoff.lat, dropoff.lon], 12);
      return;
    }

    // Fit both markers in view immediately
    const bounds = L.latLngBounds([pickup.lat, pickup.lon], [dropoff.lat, dropoff.lon]);
    map.fitBounds(bounds, { padding: [50, 50] });

    // Fetch route
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const url = `${OSRM_URL}/${pickup.lon},${pickup.lat};${dropoff.lon},${dropoff.lat}?overview=full&geometries=geojson`;
        const res  = await fetch(url);
        if (!res.ok) throw new Error("Route request failed");

        const data = await res.json();
        if (data.code !== "Ok" || !data.routes?.length) throw new Error("No route found");

        if (cancelled) return;

        const route = data.routes[0];
        const coords: [number, number][] = route.geometry.coordinates.map(
          ([lon, lat]: [number, number]) => [lat, lon]
        );
        const distanceMiles  = parseFloat((route.distance / 1609.344).toFixed(2));
        const durationMinutes = Math.round(route.duration / 60);

        polylineRef.current = L.polyline(coords, {
          color: "hsl(168, 32%, 45%)",
          weight: 4,
          opacity: 0.8,
        }).addTo(map);

        onRouteCalculated({ distanceMiles, durationMinutes, routeCoords: coords });
      } catch {
        if (!cancelled) {
          setError("Could not calculate route. Please check your locations.");
          onRouteCalculated(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup?.lat, pickup?.lon, dropoff?.lat, dropoff?.lon]);

  return (
    <>
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gold">
          <Loader2 className="h-4 w-4 animate-spin" />
          Calculating route…
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div
        ref={containerRef}
        className="rounded-lg overflow-hidden border border-navy-light/30"
        style={{ height: 300 }}
      />
    </>
  );
};

// ── Public component ──────────────────────────────────────────────────────────
const RouteMap = (props: RouteMapProps) => {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  if (!props.pickup && !props.dropoff) return null;

  return (
    <div className="mt-6 space-y-3">
      <h4 className="text-sm font-semibold text-primary-foreground/80">Route Preview</h4>
      {isMounted ? (
        <MapErrorBoundary>
          <LeafletMap {...props} />
        </MapErrorBoundary>
      ) : (
        <div className="flex items-center gap-2 text-sm text-gold">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading map…
        </div>
      )}
    </div>
  );
};

export default RouteMap;
