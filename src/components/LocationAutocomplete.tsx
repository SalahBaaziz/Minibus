import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Loader2 } from "lucide-react";

export interface LocationResult {
  displayName: string;
  lat: number;
  lon: number;
  placeId: string;
}

interface LocationAutocompleteProps {
  label: string;
  placeholder: string;
  value: LocationResult | null;
  onChange: (location: LocationResult | null) => void;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const LocationAutocomplete = ({ label, placeholder, value, onChange }: LocationAutocompleteProps) => {
  const [query, setQuery] = useState(value?.displayName || "");
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const searchLocations = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        format: "json",
        addressdetails: "1",
        limit: "5",
        countrycodes: "gb",
      });

      const response = await fetch(`${NOMINATIM_URL}?${params}`, {
        headers: { "Accept-Language": "en" },
      });

      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();
      const results: LocationResult[] = data.map((item: any) => ({
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        placeId: item.place_id?.toString() || "",
      }));

      setSuggestions(results);
      setShowDropdown(results.length > 0);
    } catch {
      setError("Could not search locations. Please try again.");
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(null); // clear selection when typing

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchLocations(val), 400);
  };

  const handleSelect = (location: LocationResult) => {
    setQuery(location.displayName);
    onChange(location);
    setShowDropdown(false);
    setSuggestions([]);
  };

  const inputClass =
    "w-full rounded-lg border border-navy-light/30 bg-navy-light/20 px-4 py-3 pl-10 text-sm text-primary-foreground placeholder:text-primary-foreground/40 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/50";

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-primary-foreground/80 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-foreground/40" />
        <input
          className={inputClass}
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gold animate-spin" />
        )}
      </div>

      {value && (
        <p className="mt-1 text-xs text-gold">
          📍 {value.lat.toFixed(5)}, {value.lon.toFixed(5)}
        </p>
      )}

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}

      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-navy-light/30 bg-navy shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((s) => (
            <li
              key={s.placeId}
              className="px-4 py-3 text-sm text-primary-foreground/80 hover:bg-navy-light/30 cursor-pointer transition-colors border-b border-navy-light/10 last:border-0"
              onClick={() => handleSelect(s)}
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-gold shrink-0" />
                <span className="line-clamp-2">{s.displayName}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LocationAutocomplete;
