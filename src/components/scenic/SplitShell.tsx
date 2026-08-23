import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";

interface Props {
  map: ReactNode;
  panel: ReactNode;
  header?: ReactNode | undefined;
  showNav?: boolean | undefined;
  panelClassName?: string | undefined;
}

export function SplitShell({ map, panel, header, showNav = true, panelClassName }: Props) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const panelScrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const reset = () => {
      if (panelScrollRef.current) panelScrollRef.current.scrollTop = 0;
    };
    reset();
    const frame = window.requestAnimationFrame(reset);
    const timeout = window.setTimeout(reset, 0);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [pathname]);

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background md:flex-row">
      <div className="relative order-1 min-h-[36vh] flex-1 md:order-2">
        {map}
        {header && <div className="pointer-events-none absolute inset-x-0 top-0 p-3">{header}</div>}
      </div>
      <div
        className={cn(
          "relative order-2 z-10 flex max-h-[64vh] flex-col overflow-hidden rounded-t-[var(--radius-sheet)] border-t border-border bg-card shadow-sheet md:order-1 md:h-full md:max-h-none md:w-[26rem] md:rounded-none md:border-t-0 md:border-r md:shadow-none",
          panelClassName,
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border md:hidden" />
        <div
          key={pathname}
          ref={panelScrollRef}
          className="no-scrollbar flex-1 overflow-y-auto overscroll-contain [overflow-anchor:none]"
        >
          {panel}
        </div>
        {showNav && <BottomNav />}
      </div>
    </div>
  );
}
