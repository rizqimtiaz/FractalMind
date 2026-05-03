"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  SelectionMode,
  type Node,
  type ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Brain,
  Network,
  Sparkles,
  X,
  Zap,
} from "lucide-react";

import CustomNode from "./CustomNode";
import CommandBar from "./CommandBar";
import { useGraphStore, type FractalNodeData } from "@/store/useGraphStore";

const nodeTypes = { fractal: CustomNode };

const defaultEdgeOptions = {
  type: "smoothstep" as const,
  animated: true,
};

function CanvasInner() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const onNodesChange = useGraphStore((s) => s.onNodesChange);
  const onEdgesChange = useGraphStore((s) => s.onEdgesChange);
  const onConnect = useGraphStore((s) => s.onConnect);
  const expand = useGraphStore((s) => s.expand);
  const synthesize = useGraphStore((s) => s.synthesize);
  const isSynthesizing = useGraphStore((s) => s.isSynthesizing);
  const selectedIds = useGraphStore((s) => s.selectedNodeIds);
  const lastError = useGraphStore((s) => s.lastError);
  const clearError = useGraphStore((s) => s.clearError);
  const hasSeed = useGraphStore((s) => s.hasSeed);

  const rfRef = useRef<ReactFlowInstance | null>(null);
  const lastFitTargetRef = useRef<string | null>(null);

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node<FractalNodeData>) => {
      void expand(node.id);
    },
    [expand],
  );

  // Smoothly fit when the seed is first planted, and when synthesis appears.
  useEffect(() => {
    if (!rfRef.current || nodes.length === 0) return;
    const lastNode = nodes[nodes.length - 1];
    if (lastFitTargetRef.current === lastNode.id) return;
    lastFitTargetRef.current = lastNode.id;
    requestAnimationFrame(() => {
      rfRef.current?.fitView({
        padding: 0.32,
        duration: 650,
        maxZoom: 1.1,
        minZoom: 0.35,
      });
    });
  }, [nodes]);

  const selectedCount = selectedIds.length;

  const onSynthesize = useCallback(() => {
    if (selectedCount >= 2) void synthesize(selectedIds);
  }, [selectedCount, selectedIds, synthesize]);

  // Keyboard: Cmd/Ctrl+Enter triggers synthesis on the current selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (selectedIds.length >= 2) void synthesize(selectedIds);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIds, synthesize]);

  const stats = useMemo(() => {
    const depths = nodes.map((n) => n.data.depth);
    const max = depths.length ? Math.max(...depths) : 0;
    const synth = nodes.filter((n) => n.data.kind === "synthesis").length;
    return { count: nodes.length, depth: max, synth };
  }, [nodes]);

  return (
    <div className="absolute inset-0">
      {/* Inline SVG defs for the animated edge gradients */}
      <svg
        width="0"
        height="0"
        style={{ position: "absolute" }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="fractalEdgeGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#22d3ee" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#f0abfc" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient
            id="synthesisEdgeGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#fb7185" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.95" />
          </linearGradient>
          <radialGradient id="canvasHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      <div className="fractal-grid absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-grid-fade" />

      <ReactFlow
        onInit={(instance) => (rfRef.current = instance)}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={onNodeDoubleClick}
        proOptions={{ hideAttribution: true }}
        minZoom={0.15}
        maxZoom={2.4}
        fitView
        fitViewOptions={{ padding: 0.4, maxZoom: 1.2 }}
        selectionMode={SelectionMode.Partial}
        selectionOnDrag
        panOnDrag={[1, 2]}
        panOnScroll
        selectNodesOnDrag
        nodesDraggable
        elevateEdgesOnSelect
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode={["Shift", "Meta", "Control"]}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1.1}
          color="rgba(255,255,255,0.08)"
        />
        <Controls
          showInteractive={false}
          position="bottom-right"
          className="!bottom-28 !right-6"
        />
        <MiniMap
          position="top-right"
          pannable
          zoomable
          maskColor="rgba(8,8,11,0.85)"
          nodeColor={(n) => {
            const d = n.data as FractalNodeData | undefined;
            if (!d) return "#8b5cf6";
            if (d.kind === "synthesis") return "#fb7185";
            if (d.kind === "root") return "#a78bfa";
            return `hsl(${d.hue}, 80%, 65%)`;
          }}
          nodeStrokeColor="rgba(255,255,255,0.25)"
          nodeBorderRadius={6}
          style={{ width: 180, height: 120 }}
        />
      </ReactFlow>

      {/* Header brand */}
      <Header stats={stats} />

      {/* Welcome overlay */}
      <AnimatePresence>{!hasSeed && <Welcome />}</AnimatePresence>

      {/* Floating multi-select toolbar */}
      <AnimatePresence>
        {selectedCount >= 2 && (
          <SelectionToolbar
            count={selectedCount}
            onSynthesize={onSynthesize}
            isLoading={isSynthesizing}
          />
        )}
      </AnimatePresence>

      {/* Error toast */}
      <AnimatePresence>
        {lastError && <ErrorToast message={lastError} onClose={clearError} />}
      </AnimatePresence>

      <CommandBar />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Header({
  stats,
}: {
  stats: { count: number; depth: number; synth: number };
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05, duration: 0.4 }}
      className="pointer-events-none absolute left-6 top-6 z-30 flex items-center gap-3"
    >
      <div className="glass pointer-events-auto flex items-center gap-2.5 rounded-2xl px-3.5 py-2">
        <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 shadow-glow">
          <Network className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-display text-[14px] tracking-tight text-white">
            Fractal<span className="gradient-text">Mind</span>
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">
            Spatial AI Knowledge Synthesizer
          </span>
        </div>
      </div>

      {stats.count > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass pointer-events-auto hidden items-center gap-3 rounded-2xl px-3.5 py-2 text-[11px] text-white/65 sm:flex"
        >
          <Stat label="Nodes" value={stats.count} />
          <span className="h-3 w-px bg-white/10" />
          <Stat label="Max depth" value={stats.depth} />
          {stats.synth > 0 && (
            <>
              <span className="h-3 w-px bg-white/10" />
              <Stat label="Syntheses" value={stats.synth} accent />
            </>
          )}
        </motion.div>
      )}
    </motion.header>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col leading-none">
      <span
        className={`font-display text-[15px] ${
          accent ? "gradient-text" : "text-white"
        }`}
      >
        {value}
      </span>
      <span className="text-[9px] uppercase tracking-[0.2em] text-white/40">
        {label}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Welcome() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4"
    >
      <div className="pointer-events-none flex max-w-xl flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 18,
            delay: 0.1,
          }}
          className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 shadow-glow-lg"
        >
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 opacity-60 blur-2xl" />
          <Brain className="relative h-9 w-9 text-white" />
        </motion.div>

        <motion.h1
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="font-display text-4xl font-medium tracking-tight text-white sm:text-5xl"
        >
          Grow a <span className="gradient-text">living mind</span>.
        </motion.h1>
        <motion.p
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-3 max-w-md text-[14.5px] leading-relaxed text-white/55"
        >
          Plant a seed concept and watch it bloom into an infinite, AI-cultivated
          web of ideas — then drag a box around any few nodes to discover their
          hidden intersection.
        </motion.p>

        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 grid grid-cols-3 gap-2 text-left"
        >
          <Hint icon={<Sparkles className="h-3.5 w-3.5" />}>
            Type to plant a seed
          </Hint>
          <Hint icon={<Network className="h-3.5 w-3.5" />}>
            Double-click to expand
          </Hint>
          <Hint icon={<Zap className="h-3.5 w-3.5" />}>
            Multi-select to synthesize
          </Hint>
        </motion.div>
      </div>
    </motion.div>
  );
}

function Hint({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="glass flex items-center gap-2 rounded-xl px-3 py-2 text-[11.5px] text-white/70">
      <span className="text-violet-300">{icon}</span>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SelectionToolbar({
  count,
  onSynthesize,
  isLoading,
}: {
  count: number;
  onSynthesize: () => void;
  isLoading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 240, damping: 22 }}
      className="pointer-events-none fixed left-1/2 top-6 z-40 -translate-x-1/2"
    >
      <div className="glass-strong pointer-events-auto flex items-center gap-3 rounded-2xl px-3 py-2">
        <div className="flex items-center gap-2 px-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400/75 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400" />
          </span>
          <span className="text-[12px] tracking-tight text-white/80">
            <strong className="font-medium text-white">{count}</strong> nodes
            selected
          </span>
        </div>
        <span className="h-5 w-px bg-white/10" />
        <button
          type="button"
          onClick={onSynthesize}
          disabled={isLoading}
          className="focus-ring group relative inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 via-violet-500 to-cyan-500 px-3.5 py-1.5 text-[12.5px] font-medium text-white shadow-glow disabled:cursor-wait disabled:opacity-70"
        >
          <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-rose-500 via-violet-500 to-cyan-500 opacity-0 blur-md transition-opacity group-hover:opacity-70" />
          <Zap className="relative h-3.5 w-3.5" />
          <span className="relative">
            {isLoading ? "Synthesizing…" : "Synthesize"}
          </span>
          <kbd className="relative ml-1 hidden rounded bg-white/20 px-1 py-[1px] font-mono text-[9px] text-white/90 sm:inline">
            ⌘ ↵
          </kbd>
        </button>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */

function ErrorToast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.25 }}
      className="pointer-events-auto fixed bottom-32 left-1/2 z-50 -translate-x-1/2"
    >
      <div className="glass-strong flex max-w-md items-start gap-3 rounded-2xl border-rose-400/30 px-4 py-3 text-[13px] text-white/85 shadow-glow">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
        <p className="flex-1 leading-snug">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="focus-ring rounded-md p-1 text-white/55 hover:bg-white/10 hover:text-white"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */

export default function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
