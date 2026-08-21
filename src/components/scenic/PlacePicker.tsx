import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { services } from "@/lib/scenic/services";
import type { Place } from "@/lib/scenic/types";
import { LoaderCircle, LocateFixed, Search } from "lucide-react";
import {
  currentLocationErrorMessage,
  getCurrentLocationFix,
  requestCurrentLocation,
} from "@/lib/scenic/current-location";

const SEARCH_DEBOUNCE_MS = 300;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onPick: (place: Place) => void;
  showCurrentLocation?: boolean | undefined;
}

export function PlacePicker({ open, onOpenChange, title, onPick, showCurrentLocation }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [searchFailed, setSearchFailed] = useState(false);
  const [searching, setSearching] = useState(false);
  const [attribution, setAttribution] = useState<string | null>(null);
  const [locationPending, setLocationPending] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let currentRequest = true;
    setSearchFailed(false);
    const liveQuery = q.trim().length >= 2;
    if (liveQuery) setSearching(true);
    const timer = window.setTimeout(
      () => {
        services.geocoding.search(q, getCurrentLocationFix()?.place).then(
          (result) => {
            if (!currentRequest) return;
            setResults(result.places);
            setSearchFailed(result.fallback);
            setAttribution(result.attribution ?? null);
            setSearching(false);
          },
          () => {
            if (!currentRequest) return;
            setSearchFailed(true);
            setSearching(false);
          },
        );
      },
      liveQuery ? SEARCH_DEBOUNCE_MS : 0,
    );
    return () => {
      currentRequest = false;
      window.clearTimeout(timer);
    };
  }, [open, q]);

  const pick = (p: Place) => {
    onPick(p);
    setQ("");
    onOpenChange(false);
  };

  const useCurrentLocation = async () => {
    if (locationPending) return;
    setLocationPending(true);
    setLocationError(null);
    try {
      const fix = await requestCurrentLocation();
      pick(fix.place);
    } catch (error) {
      setLocationError(currentLocationErrorMessage(error));
    } finally {
      setLocationPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-3xl p-0">
        <DialogHeader className="border-b border-border px-5 pt-5 pb-4">
          <DialogTitle className="text-display text-lg">{title}</DialogTitle>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-secondary px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Address, landmark, café, museum…"
              className="min-h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {searching && (
              <LoaderCircle
                className="size-4 shrink-0 animate-spin text-muted-foreground"
                aria-label="Searching Paris"
              />
            )}
          </div>
        </DialogHeader>
        <div className="max-h-[52vh] overflow-y-auto p-2">
          {showCurrentLocation && (
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={locationPending}
              aria-busy={locationPending}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-secondary disabled:cursor-wait disabled:opacity-70"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <LocateFixed className="size-4" strokeWidth={1.75} />
              </span>
              <span>
                <span className="block text-sm font-medium">
                  {locationPending ? "Finding your location…" : "Current location"}
                </span>
                <span className="block text-xs text-muted-foreground">
                  Use your device location
                </span>
              </span>
            </button>
          )}
          {showCurrentLocation && locationError && (
            <p role="alert" className="px-3 pb-2 text-sm text-destructive">
              {locationError}
            </p>
          )}
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p)}
              className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left hover:bg-secondary"
            >
              <span>
                <span className="block text-sm font-medium">{p.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {p.kind} · {p.area}
                </span>
              </span>
            </button>
          ))}
          {searchFailed && (
            <p className="px-3 pt-2 text-center text-xs text-muted-foreground">
              Live search is unavailable. Showing Scenic suggestions.
            </p>
          )}
          {!searching && results.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {q.trim().length >= 2
                ? "No Paris matches found."
                : "Nothing here yet. Scenic Route covers central Paris for now."}
            </p>
          )}
          {attribution && results.length > 0 && (
            <p className="px-3 py-2 text-center text-[10px] text-muted-foreground">{attribution}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
