import { Clock, Route } from "lucide-react";
import type { RouteInfo as RouteInfoType } from "./RouteMap";

interface RouteInfoProps {
  routeInfo: RouteInfoType | null;
}

const RouteInfoDisplay = ({ routeInfo }: RouteInfoProps) => {
  if (!routeInfo) return null;

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <div className="rounded-lg bg-navy-light/20 border border-navy-light/30 p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/20">
          <Route className="h-5 w-5 text-gold" />
        </div>
        <div>
          <p className="text-xs text-primary-foreground/50">Distance</p>
          <p className="text-lg font-bold text-primary-foreground">
            {routeInfo.distanceMiles} miles
          </p>
        </div>
      </div>
      <div className="rounded-lg bg-navy-light/20 border border-navy-light/30 p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/20">
          <Clock className="h-5 w-5 text-gold" />
        </div>
        <div>
          <p className="text-xs text-primary-foreground/50">Est. Duration</p>
          <p className="text-lg font-bold text-primary-foreground">
            {formatDuration(routeInfo.durationMinutes)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RouteInfoDisplay;
