import { useEffect, useState } from "react";

const MESSAGES = [
  "Looking through curated discoveries…",
  "Checking gardens and passages…",
  "Matching places to your interests…",
  "Balancing discovery with your arrival time…",
];

export function ScenicLoader({ title = "Finding the interesting way there…" }: { title?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % MESSAGES.length), 1100);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="relative size-12">
        <span className="absolute inset-0 rounded-full bg-primary/25 [animation:soft-pulse_2s_ease-in-out_infinite]" />
        <span className="absolute inset-[38%] rounded-full bg-primary" />
      </div>
      <h2 className="text-display mt-5 text-lg">{title}</h2>
      <p key={i} className="animate-sheet-up mt-1.5 text-sm text-muted-foreground">
        {MESSAGES[i]}
      </p>
    </div>
  );
}
