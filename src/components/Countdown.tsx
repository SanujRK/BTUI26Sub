import { useEffect, useState } from "react";

interface Props {
  target: string;
  label?: string;
}

type Remaining = {
  done: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function compute(target: number): Remaining {
  const diff = target - Date.now();
  if (diff <= 0) {
    return { done: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  return {
    done: false,
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default function Countdown({ target, label }: Props) {
  const [rem, setRem] = useState<Remaining>(() =>
    compute(new Date(target).getTime())
  );

  useEffect(() => {
    const id = setInterval(() => setRem(compute(new Date(target).getTime())), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (rem.done) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-300">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        {label ?? "Happening now"}
      </span>
    );
  }

  const cells: Array<[string, number]> = [
    ["days", rem.days],
    ["hrs", rem.hours],
    ["min", rem.minutes],
    ["sec", rem.seconds],
  ];

  return (
    <div className="flex items-end gap-2">
      {cells.map(([name, value]) => (
        <div key={name} className="flex min-w-14 flex-col items-center">
          <span className="rounded-xl bg-white/5 px-3 py-2 text-2xl font-bold tabular-nums ring-1 ring-white/10">
            {String(value).padStart(2, "0")}
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
            {name}
          </span>
        </div>
      ))}
    </div>
  );
}