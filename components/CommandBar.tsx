"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Brain,
  Loader2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useGraphStore } from "@/store/useGraphStore";

const SUGGESTIONS = [
  "Quantum Computing",
  "The Origins of Consciousness",
  "Brutalist Architecture",
  "Mycelial Networks",
  "Bayesian Reasoning",
  "Ancient Cartography",
  "Generative Adversarial Networks",
];

export default function CommandBar() {
  const seed = useGraphStore((s) => s.seed);
  const reset = useGraphStore((s) => s.reset);
  const isSeeding = useGraphStore((s) => s.isSeeding);
  const hasSeed = useGraphStore((s) => s.hasSeed);

  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [hint, setHint] = useState(SUGGESTIONS[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cycle the placeholder hint every few seconds while idle.
  useEffect(() => {
    if (focused || value || isSeeding) return;
    const t = setInterval(() => {
      setHint((h) => {
        const i = SUGGESTIONS.indexOf(h);
        return SUGGESTIONS[(i + 1) % SUGGESTIONS.length];
      });
    }, 2800);
    return () => clearInterval(t);
  }, [focused, value, isSeeding]);

  // Cmd/Ctrl+K focuses the bar; Esc blurs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === "Escape") {
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = async (override?: string) => {
    const v = (override ?? value).trim();
    if (!v || isSeeding) return;
    setValue("");
    inputRef.current?.blur();
    await seed(v);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, type: "spring", stiffness: 180, damping: 22 }}
      className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4"
    >
      <div className="pointer-events-auto w-full max-w-2xl">
        {/* Suggestion chips (only before first seed) */}
        <AnimatePresence>
          {!hasSeed && !isSeeding && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.25 }}
              className="mb-3 flex flex-wrap items-center justify-center gap-2"
            >
              <span className="mr-1 text-[11px] uppercase tracking-[0.18em] text-white/35">
                Try
              </span>
              {SUGGESTIONS.slice(0, 5).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  className="focus-ring group inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] text-white/75 backdrop-blur-md transition-all hover:border-white/25 hover:bg-white/[0.1] hover:text-white"
                >
                  <Sparkles className="h-3 w-3 text-violet-300/80 transition-transform group-hover:rotate-12" />
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* The bar */}
        <motion.form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          animate={{
            boxShadow: focused
              ? "0 24px 80px -20px rgba(139, 92, 246, 0.55), 0 0 0 1px rgba(196, 181, 253, 0.4) inset"
              : "0 16px 48px -16px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06) inset",
          }}
          transition={{ duration: 0.25 }}
          className="glass-strong relative flex items-center gap-2 rounded-2xl px-3 py-2.5"
        >
          {/* Subtle animated gradient outline when focused */}
          <AnimatePresence>
            {focused && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-r from-violet-500/30 via-cyan-400/30 to-rose-400/30 opacity-60 blur-md"
              />
            )}
          </AnimatePresence>

          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/35 to-cyan-400/25 ring-1 ring-white/10">
            {isSeeding ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <Brain className="h-4 w-4 text-white" />
            )}
          </div>

          <input
            ref={inputRef}
            value={value}
            disabled={isSeeding}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={isSeeding ? "Cultivating ideas…" : `Plant a seed — e.g. ${hint}`}
            className="relative flex-1 bg-transparent px-1 py-1 text-[15px] text-white placeholder:text-white/35 focus:outline-none disabled:opacity-60"
            aria-label="Seed concept"
          />

          {hasSeed && !isSeeding && (
            <button
              type="button"
              onClick={() => reset()}
              className="focus-ring relative flex h-9 items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[12px] text-white/70 transition-all hover:border-white/20 hover:bg-white/[0.1] hover:text-white"
              title="Reset canvas"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          )}

          <button
            type="submit"
            disabled={isSeeding || !value.trim()}
            className="focus-ring relative flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 px-3.5 text-[12.5px] font-medium text-white shadow-glow transition-all hover:from-violet-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSeeding ? "Growing…" : "Grow"}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </motion.form>

        <div className="mt-2 flex items-center justify-center gap-3 text-[10.5px] uppercase tracking-[0.2em] text-white/30">
          <Kbd>⌘ K</Kbd>
          <span>focus</span>
          <span className="text-white/15">·</span>
          <Kbd>⇧ + drag</Kbd>
          <span>multi-select</span>
          <span className="text-white/15">·</span>
          <Kbd>2× click</Kbd>
          <span>expand</span>
        </div>
      </div>
    </motion.div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-[1px] font-mono text-[10px] text-white/55">
      {children}
    </kbd>
  );
}
