import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2 } from "lucide-react";
import type { LocationResult } from "./LocationAutocomplete";

// Fix leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const pickupIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const dropoffIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export interface RouteInfo {
  distanceMiles: number;
  durationMinutes: number;
  routeCoords: [number, number][];
}

interface RouteMapProps {
  pickup: LocationResult | null;
  dropoff: LocationResult | null;
  onRouteCalculated: (info: RouteInfo | null) => void;
}

function FitBounds({ pickup, dropoff }: { pickup: LocationResult; dropoff: LocationResult }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds(
      [pickup.lat, pickup.lon],
      [dropoff.lat, dropoff.lon]
    );
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, pickup.lat, pickup.lon, dropoff.lat, dropoff.lon]);
  return null;
}

const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";

const RouteMap = ({ pickup, dropoff, onRouteCalculated }: RouteMapProps) => {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const center = useMemo(() => {
    if (pickup && dropoff) {
      return [(pickup.lat + dropoff.lat) / 2, (pickup.lon + dropoff.lon) / 2] as [number, number];
    }
    if (pickup) return [pickup.lat, pickup.lon] as [number, number];
    if (dropoff) return [dropoff.lat, dropoff.lon] as [number, number];
    return [53.8, -1.55] as [number, number]; // Yorkshire default
  }, [pickup, dropoff]);

  useEffect(() => {
    if (!pickup || !dropoff) {
      setRouteCoords([]);
      onRouteCalculated(null);
      return;
    }

    const fetchRoute = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = `${OSRM_URL}/${pickup.lon},${pickup.lat};${dropoff.lon},${dropoff.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Route calculation failed");

        const data = await res.json();
        if (data.code !== "Ok" || !data.routes?.length) {
          throw new Error("No route found");
        }

        const route = data.routes[0];
        const coords: [number, number][] = route.geometry.coordinates.map(
          ([lon, lat]: [number, number]) => [lat, lon]
        );

        const distanceMiles = parseFloat((route.distance / 1609.344).toFixed(2));
        const durationMinutes = Math.round(route.duration / 60);

        setRouteCoords(coords);
        onRouteCalculated({ distanceMiles, durationMinutes, routeCoords: coords });
      } catch {
        setError("Could not calculate route. Please check your locations.");
        onRouteCalculated(null);
        setRouteCoords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [pickup?.lat, pickup?.lon, dropoff?.lat, dropoff?.lon]);

  const showMap = pickup || dropoff;

  if (!showMap) return null;

  return (
    <div className="mt-6 space-y-3">
      <h4 className="text-sm font-semibold text-primary-foreground/80">Route Preview</h4>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gold">
          <Loader2 className="h-4 w-4 animate-spin" />
          Calculating route…
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="rounded-lg overflow-hidden border border-navy-light/30" style={{ height: 300 }}>
        <MapContainer
          center={center}
          zoom={10}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {pickup && (
            <Marker position={[pickup.lat, pickup.lon]} icon={pickupIcon}>
              <Popup>Pick-up: {pickup.displayName}</Popup>
            </Marker>
          )}

          {dropoff && (
            <Marker position={[dropoff.lat, dropoff.lon]} icon={dropoffIcon}>
              <Popup>Drop-off: {dropoff.displayName}</Popup>
            </Marker>
          )}

          {routeCoords.length > 0 && (
            <Polyline positions={routeCoords} color="hsl(168, 32%, 45%)" weight={4} opacity={0.8} />
          )}

          {pickup && dropoff && <FitBounds pickup={pickup} dropoff={dropoff} />}
        </MapContainer>
      </div>
    </div>
  );
};

export default RouteMap;
