"use client";

import { motion, type Variants } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const staggerParent: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } };
const staggerChild: Variants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } };

export function Stagger({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerParent} initial="hidden" animate="show" className={className}>
      {children}
    </motion.div>
  );
}

export function Item({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerChild} className={className}>
      {children}
    </motion.div>
  );
}

// Smoothly counts up to `value` on mount / when value changes.
export function AnimatedNumber({
  value, duration = 1.1, decimals = 0, prefix = "", suffix = "",
}: { value: number; duration?: number; decimals?: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    const to = Number(value) || 0;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return (
    <span>
      {prefix}
      {display.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

// Pulsing status dot. tone: emerald | amber | sky | rose | slate
const TONE: Record<string, string> = {
  emerald: "bg-emerald-400", amber: "bg-amber-400", sky: "bg-sky-400", rose: "bg-rose-400", slate: "bg-slate-500",
};
export function StatusDot({ tone = "emerald", pulse = true }: { tone?: string; pulse?: boolean }) {
  return (
    <span className="relative inline-flex w-2 h-2">
      {pulse && <span className={`absolute inline-flex w-full h-full rounded-full opacity-60 animate-ping ${TONE[tone] || TONE.emerald}`} />}
      <span className={`relative inline-flex w-2 h-2 rounded-full ${TONE[tone] || TONE.emerald}`} />
    </span>
  );
}

export { motion };
