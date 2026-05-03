"use client";

import { memo, useCallback, useMemo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { motion } from "framer-motion";
import { Sparkles, Trash2, Network, Layers, Zap } from "lucide-react";
import { useGraphStore, type FractalNodeData } from "@/store/useGraphStore";

const CustomNode = ({ id, data, selected }: NodeProps<FractalNodeData>) => {
  const expand = useGraphStore((s) => s.expand);
  const removeNode = useGraphStore((s) => s.removeNode);

  const onExpand = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      void expand(id);
    },
    [id, expand],
  );

  const onDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      removeNode(id);
    },
    [id, removeNode],
  );

  const isRoot = data.kind === "root";
  const isSynthesis = data.kind === "synthesis";

  const tint = useMemo(() => {
    if (isSynthesis) {
      return {
        primary: "rgba(244, 63, 94, 0.55)",
        secondary: "rgba(139, 92, 246, 0.55)",
        accent: "rgba(34, 211, 238, 0.55)",
      };
    }
    const hue = data.hue;
    return {
      primary: `hsla(${hue}, 90%, 70%, 0.55)`,
      secondary: `hsla(${(hue + 40) % 360}, 90%, 65%, 0.45)`,
      accent: `hsla(${(hue + 200) % 360}, 90%, 65%, 0.4)`,
    };
  }, [data.hue, isSynthesis]);

  const haloStyle = useMemo<React.CSSProperties>(
    () => ({
      background: `radial-gradient(120% 120% at 0% 0%, ${tint.primary}, transparent 55%),
                   radial-gradient(120% 120% at 100% 100%, ${tint.accent}, transparent 55%)`,
      boxShadow: selected
        ? `0 0 0 1.5px ${tint.primary}, 0 24px 60px -18px ${tint.primary}, 0 0 80px -10px ${tint.secondary}`
        : `0 12px 40px -18px ${tint.primary}, 0 0 1px rgba(255,255,255,0.04)`,
    }),
    [tint, selected],
  );

  const sizeClasses = isRoot
    ? "min-w-[260px] max-w-[320px] p-5"
    : isSynthesis
      ? "min-w-[230px] max-w-[290px] p-4"
      : "min-w-[210px] max-w-[270px] p-4";

  const Icon = isSynthesis ? Zap : isRoot ? Network : Layers;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.7 }}
      transition={{
        type: "spring",
        stiffness: 220,
        damping: 22,
        mass: 0.6,
      }}
      whileHover={{ y: -2, scale: 1.015 }}
      className={`group relative rounded-2xl ${sizeClasses}`}
      style={haloStyle}
    >
      {/* Glass + grain */}
      <div
        className={`absolute inset-0 rounded-2xl border ${
          selected
            ? "border-white/30"
            : "border-white/10 group-hover:border-white/20"
        } bg-white/5 backdrop-blur-xl transition-colors`}
      />
      {/* Inner gradient ring */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-70"
        style={{
          background: `linear-gradient(135deg, ${tint.primary} 0%, transparent 30%, transparent 70%, ${tint.accent} 100%)`,
          mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          padding: 1,
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
        }}
      />

      {/* Synthesis sparkle ring */}
      {isSynthesis && (
        <div className="pointer-events-none absolute -inset-1 rounded-3xl opacity-70 blur-2xl bg-synthesis-glow animate-breathe" />
      )}

      {/* Loading veil */}
      {data.isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-ink-950/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="spinner-conic h-7 w-7 rounded-full" />
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/55">
              {isSynthesis ? "Synthesizing" : "Expanding"}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10"
              style={{
                background: `linear-gradient(135deg, ${tint.primary}, ${tint.secondary})`,
              }}
            >
              <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2.2} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                {isRoot ? "Seed" : isSynthesis ? "Synthesis" : `Depth ${data.depth}`}
              </span>
              <h3
                className={`font-display leading-tight text-white ${
                  isRoot ? "text-[17px]" : "text-[15px]"
                }`}
              >
                {data.label}
              </h3>
            </div>
          </div>

          {/* Hover-revealed delete (root never deletable) */}
          {!isRoot && (
            <button
              type="button"
              onClick={onDelete}
              className="opacity-0 transition-opacity group-hover:opacity-100 focus-ring rounded-md p-1 text-white/40 hover:bg-white/10 hover:text-rose-300"
              aria-label="Remove node"
              title="Remove node"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <p className="text-[12.5px] leading-snug text-white/70">
          {data.description}
        </p>

        <div className="mt-1 flex items-center justify-between">
          <button
            type="button"
            onClick={onExpand}
            disabled={data.isLoading}
            className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-white/85 transition-all hover:border-white/25 hover:bg-white/[0.12] disabled:cursor-wait disabled:opacity-50"
          >
            <Sparkles className="h-3 w-3" />
            Expand
          </button>

          {isSynthesis && data.parents && (
            <span
              className="text-[10px] tracking-wide text-white/40"
              title={`Synthesis of ${data.parents.length} concepts`}
            >
              ⌬ {data.parents.length}
            </span>
          )}
        </div>
      </div>

      {/* Handles — one in/out keeps the smoothstep edges clean */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: isRoot ? 0 : 0.55 }}
        isConnectable={false}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0.55 }}
        isConnectable={false}
      />
    </motion.div>
  );
};

export default memo(CustomNode);
