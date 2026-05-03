"use client";

import { create } from "zustand";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type XYPosition,
} from "reactflow";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type NodeKind = "root" | "child" | "synthesis";

export interface FractalNodeData {
  label: string;
  description: string;
  depth: number;
  kind: NodeKind;
  /** ids of nodes that contributed to a synthesis node */
  parents?: string[];
  /** true while the AI is generating its children */
  isLoading?: boolean;
  /** soft tint cycled per branch for visual diversity */
  hue: number;
  /** epoch ms when the node was created (used for stagger animation) */
  createdAt: number;
}

export type FractalNode = Node<FractalNodeData>;
export type FractalEdge = Edge;

/** Shape of a node returned by the AI API for expansion */
export interface AIGeneratedNode {
  label: string;
  description: string;
}

/* ------------------------------------------------------------------ */
/*  Layout helpers                                                     */
/* ------------------------------------------------------------------ */

/**
 * Computes radial positions around a parent point so child nodes spawn
 * neatly without overlapping existing nodes. Falls back to spiral
 * expansion when collisions can't be resolved within the angular slice.
 */
export function radialPositions(
  parent: XYPosition,
  count: number,
  existing: XYPosition[],
  options: {
    radius?: number;
    minSeparation?: number;
    startAngle?: number;
    arc?: number;
  } = {},
): XYPosition[] {
  const radius = options.radius ?? 340;
  const minSeparation = options.minSeparation ?? 230;
  const startAngle = options.startAngle ?? Math.random() * Math.PI * 2;
  const arc = options.arc ?? Math.PI * 2;

  const positions: XYPosition[] = [];

  for (let i = 0; i < count; i++) {
    let angle =
      count === 1 ? startAngle : startAngle + (i / Math.max(1, count - (arc < Math.PI * 2 ? 1 : 0))) * arc;
    let r = radius + (Math.random() - 0.5) * 40;

    let x = parent.x + Math.cos(angle) * r;
    let y = parent.y + Math.sin(angle) * r;

    let attempts = 0;
    const candidates = () => [...existing, ...positions];
    while (
      attempts < 32 &&
      candidates().some(
        (p) => Math.hypot(p.x - x, p.y - y) < minSeparation,
      )
    ) {
      angle += Math.PI / 18;
      r += 14;
      x = parent.x + Math.cos(angle) * r;
      y = parent.y + Math.sin(angle) * r;
      attempts++;
    }
    positions.push({ x, y });
  }

  return positions;
}

/** Pick a deterministic-ish hue from a string id (for branch tinting). */
export function hashHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

interface GraphState {
  nodes: FractalNode[];
  edges: FractalEdge[];
  selectedNodeIds: string[];
  isSeeding: boolean;
  loadingNodeIds: Set<string>;
  isSynthesizing: boolean;
  lastError: string | null;
  hasSeed: boolean;

  /* React Flow change handlers */
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  /* Selection management */
  setSelected: (ids: string[]) => void;

  /* AI orchestration */
  seed: (prompt: string) => Promise<void>;
  expand: (nodeId: string) => Promise<void>;
  synthesize: (nodeIds: string[]) => Promise<void>;

  /* Misc */
  clearError: () => void;
  reset: () => void;
  removeNode: (id: string) => void;
}

const ROOT_POSITION: XYPosition = { x: 0, y: 0 };

let _nodeCounter = 0;
const nextNodeId = (prefix = "n") => {
  _nodeCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${_nodeCounter}`;
};

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeIds: [],
  isSeeding: false,
  loadingNodeIds: new Set(),
  isSynthesizing: false,
  lastError: null,
  hasSeed: false,

  /* -------------------------------- React Flow plumbing */

  onNodesChange: (changes) => {
    set((state) => {
      const nodes = applyNodeChanges(changes, state.nodes) as FractalNode[];
      const selectedNodeIds = nodes.filter((n) => n.selected).map((n) => n.id);
      return { nodes, selectedNodeIds };
    });
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges) as FractalEdge[],
    }));
  },

  onConnect: (connection) => {
    set((state) => ({
      edges: addEdge(
        {
          ...connection,
          type: "smoothstep",
          animated: true,
        },
        state.edges,
      ) as FractalEdge[],
    }));
  },

  setSelected: (ids) => {
    set((state) => ({
      selectedNodeIds: ids,
      nodes: state.nodes.map((n) => ({ ...n, selected: ids.includes(n.id) })),
    }));
  },

  /* -------------------------------- AI: seed */

  seed: async (prompt) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    set({
      isSeeding: true,
      lastError: null,
      // a fresh seed wipes the canvas so the user has a clean exploration surface
      nodes: [],
      edges: [],
      selectedNodeIds: [],
      loadingNodeIds: new Set(),
    });

    const rootId = nextNodeId("root");
    const now = Date.now();
    const rootNode: FractalNode = {
      id: rootId,
      type: "fractal",
      position: ROOT_POSITION,
      data: {
        label: trimmed,
        description: "Generating the conceptual frontier…",
        depth: 0,
        kind: "root",
        isLoading: true,
        hue: hashHue(rootId),
        createdAt: now,
      },
    };

    set({ nodes: [rootNode], hasSeed: true });

    try {
      const response = await fetch("/api/generate-nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "seed",
          concept: trimmed,
          depth: 0,
        }),
      });

      if (!response.ok) {
        const message = await response.text().catch(() => "");
        throw new Error(message || `Seed failed (${response.status})`);
      }

      const data = (await response.json()) as {
        rootDescription: string;
        children: AIGeneratedNode[];
      };

      const childPositions = radialPositions(
        ROOT_POSITION,
        data.children.length,
        [ROOT_POSITION],
        { radius: 380, minSeparation: 260 },
      );

      const childNodes: FractalNode[] = data.children.map((child, i) => {
        const id = nextNodeId("c");
        return {
          id,
          type: "fractal",
          position: childPositions[i],
          data: {
            label: child.label,
            description: child.description,
            depth: 1,
            kind: "child",
            isLoading: false,
            hue: (hashHue(rootId) + (i + 1) * 37) % 360,
            createdAt: Date.now(),
          },
        };
      });

      const childEdges: FractalEdge[] = childNodes.map((child) => ({
        id: `e_${rootId}_${child.id}`,
        source: rootId,
        target: child.id,
        type: "smoothstep",
        animated: true,
      }));

      set((state) => ({
        nodes: state.nodes
          .map((n) =>
            n.id === rootId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    description: data.rootDescription,
                    isLoading: false,
                  },
                }
              : n,
          )
          .concat(childNodes),
        edges: state.edges.concat(childEdges),
        isSeeding: false,
      }));
    } catch (err) {
      set((state) => ({
        isSeeding: false,
        lastError:
          err instanceof Error ? err.message : "Failed to seed the graph.",
        nodes: state.nodes.map((n) =>
          n.id === rootId
            ? { ...n, data: { ...n.data, isLoading: false } }
            : n,
        ),
      }));
    }
  },

  /* -------------------------------- AI: expand */

  expand: async (nodeId) => {
    const state = get();
    const parent = state.nodes.find((n) => n.id === nodeId);
    if (!parent) return;
    if (state.loadingNodeIds.has(nodeId)) return;

    const loadingNext = new Set(state.loadingNodeIds);
    loadingNext.add(nodeId);

    set({
      loadingNodeIds: loadingNext,
      lastError: null,
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, isLoading: true } }
          : n,
      ),
    });

    try {
      // include sibling/ancestor context so the AI can avoid duplicates
      const context = collectAncestry(state.nodes, state.edges, nodeId).map(
        (n) => n.data.label,
      );

      const response = await fetch("/api/generate-nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "expand",
          concept: parent.data.label,
          parentDescription: parent.data.description,
          context,
          depth: parent.data.depth,
        }),
      });

      if (!response.ok) {
        const message = await response.text().catch(() => "");
        throw new Error(message || `Expansion failed (${response.status})`);
      }

      const data = (await response.json()) as {
        rootDescription?: string;
        children: AIGeneratedNode[];
      };

      const allPositions = get().nodes.map((n) => n.position);
      const positions = radialPositions(
        parent.position,
        data.children.length,
        allPositions,
        {
          radius: 320 + parent.data.depth * 30,
          minSeparation: 230,
          arc: Math.PI * 1.4,
          startAngle:
            Math.atan2(
              parent.position.y - (averageNeighbor(state, nodeId)?.y ?? parent.position.y - 1),
              parent.position.x - (averageNeighbor(state, nodeId)?.x ?? parent.position.x - 1),
            ) -
            Math.PI * 0.7,
        },
      );

      const childNodes: FractalNode[] = data.children.map((child, i) => {
        const id = nextNodeId("c");
        return {
          id,
          type: "fractal",
          position: positions[i],
          data: {
            label: child.label,
            description: child.description,
            depth: parent.data.depth + 1,
            kind: "child",
            isLoading: false,
            hue: (parent.data.hue + (i + 1) * 47) % 360,
            createdAt: Date.now(),
          },
        };
      });

      const childEdges: FractalEdge[] = childNodes.map((child) => ({
        id: `e_${nodeId}_${child.id}`,
        source: nodeId,
        target: child.id,
        type: "smoothstep",
        animated: true,
      }));

      const cleared = new Set(get().loadingNodeIds);
      cleared.delete(nodeId);

      set((s) => ({
        nodes: s.nodes
          .map((n) =>
            n.id === nodeId
              ? { ...n, data: { ...n.data, isLoading: false } }
              : n,
          )
          .concat(childNodes),
        edges: s.edges.concat(childEdges),
        loadingNodeIds: cleared,
      }));
    } catch (err) {
      const cleared = new Set(get().loadingNodeIds);
      cleared.delete(nodeId);
      set((s) => ({
        loadingNodeIds: cleared,
        lastError:
          err instanceof Error ? err.message : "Failed to expand node.",
        nodes: s.nodes.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, isLoading: false } }
            : n,
        ),
      }));
    }
  },

  /* -------------------------------- AI: synthesize */

  synthesize: async (nodeIds) => {
    if (nodeIds.length < 2) {
      set({ lastError: "Select at least 2 nodes to synthesize." });
      return;
    }
    const state = get();
    const sources = nodeIds
      .map((id) => state.nodes.find((n) => n.id === id))
      .filter((n): n is FractalNode => Boolean(n));

    if (sources.length < 2) return;

    set({ isSynthesizing: true, lastError: null });

    // Place the synthesis node at the centroid, with a small offset so it
    // doesn't crash into any of the source nodes.
    const centroid: XYPosition = {
      x: sources.reduce((s, n) => s + n.position.x, 0) / sources.length,
      y: sources.reduce((s, n) => s + n.position.y, 0) / sources.length,
    };
    const allPositions = state.nodes.map((n) => n.position);
    const [position] = radialPositions(centroid, 1, allPositions, {
      radius: 60,
      minSeparation: 260,
    });

    const synthId = nextNodeId("syn");
    const placeholder: FractalNode = {
      id: synthId,
      type: "fractal",
      position,
      data: {
        label: "Synthesizing…",
        description: "Finding the latent intersection between selected concepts.",
        depth: Math.max(...sources.map((n) => n.data.depth)) + 1,
        kind: "synthesis",
        isLoading: true,
        parents: sources.map((n) => n.id),
        hue: 290,
        createdAt: Date.now(),
      },
    };
    const placeholderEdges: FractalEdge[] = sources.map((src) => ({
      id: `e_${src.id}_${synthId}`,
      source: src.id,
      target: synthId,
      type: "smoothstep",
      animated: true,
      style: { stroke: "url(#synthesisEdgeGradient)", strokeWidth: 2 },
      data: { synthesis: true },
    }));

    set((s) => ({
      nodes: s.nodes.concat(placeholder),
      edges: s.edges.concat(placeholderEdges),
    }));

    try {
      const response = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concepts: sources.map((n) => ({
            label: n.data.label,
            description: n.data.description,
          })),
        }),
      });

      if (!response.ok) {
        const message = await response.text().catch(() => "");
        throw new Error(message || `Synthesis failed (${response.status})`);
      }

      const data = (await response.json()) as {
        label: string;
        description: string;
      };

      set((s) => ({
        isSynthesizing: false,
        nodes: s.nodes.map((n) =>
          n.id === synthId
            ? {
                ...n,
                data: {
                  ...n.data,
                  label: data.label,
                  description: data.description,
                  isLoading: false,
                },
                selected: true,
              }
            : { ...n, selected: false },
        ),
        selectedNodeIds: [synthId],
      }));
    } catch (err) {
      set((s) => ({
        isSynthesizing: false,
        lastError:
          err instanceof Error ? err.message : "Failed to synthesize nodes.",
        nodes: s.nodes.filter((n) => n.id !== synthId),
        edges: s.edges.filter((e) => e.target !== synthId),
      }));
    }
  },

  /* -------------------------------- Misc */

  clearError: () => set({ lastError: null }),

  reset: () =>
    set({
      nodes: [],
      edges: [],
      selectedNodeIds: [],
      isSeeding: false,
      loadingNodeIds: new Set(),
      isSynthesizing: false,
      lastError: null,
      hasSeed: false,
    }),

  removeNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeIds: s.selectedNodeIds.filter((nid) => nid !== id),
    })),
}));

/* ------------------------------------------------------------------ */
/*  Internals                                                          */
/* ------------------------------------------------------------------ */

function collectAncestry(
  nodes: FractalNode[],
  edges: FractalEdge[],
  nodeId: string,
): FractalNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n] as const));
  const incoming = new Map<string, string[]>();
  for (const e of edges) {
    const arr = incoming.get(e.target) ?? [];
    arr.push(e.source);
    incoming.set(e.target, arr);
  }
  const visited = new Set<string>();
  const queue = [nodeId];
  const result: FractalNode[] = [];
  while (queue.length) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    const node = byId.get(current);
    if (node) result.push(node);
    for (const parent of incoming.get(current) ?? []) queue.push(parent);
  }
  return result;
}

function averageNeighbor(state: GraphState, nodeId: string): XYPosition | null {
  const neighborIds = new Set<string>();
  for (const e of state.edges) {
    if (e.source === nodeId) neighborIds.add(e.target);
    if (e.target === nodeId) neighborIds.add(e.source);
  }
  const neighbors = state.nodes.filter((n) => neighborIds.has(n.id));
  if (!neighbors.length) return null;
  return {
    x: neighbors.reduce((s, n) => s + n.position.x, 0) / neighbors.length,
    y: neighbors.reduce((s, n) => s + n.position.y, 0) / neighbors.length,
  };
}
