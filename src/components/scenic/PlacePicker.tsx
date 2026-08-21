import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { services } from "@/lib/scenic/services";
import type { Place } from "@/lib/scenic/types";
import { LocateFixed, Search } from "lucide-react";
import { currentLocationErrorMessage, requestCurrentLocation } from "@/lib/scenic/current-location";

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
  const [locationPending, setLocationPending] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let currentRequest = true;
    setSearchFailed(false);
    services.geocoding.search(q).then(
      (places) => currentRequest && setResults(places),
      () => currentRequest && setSearchFailed(true),
    );
    return () => {
      currentRequest = false;
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
          {searchFailed ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Search is unavailable right now. Please try again.
            </p>
          ) : (
            results.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                Nothing here yet. Scenic Route covers central Paris for now.
              </p>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
