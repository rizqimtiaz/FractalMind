# FractalMind

> A spatial AI knowledge synthesizer. Plant a seed concept on an infinite canvas and watch a living mind-map of ideas grow, branch, and synthesize itself.

![FractalMind](https://img.shields.io/badge/Next.js-14-000?logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript) ![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss) ![ReactFlow](https://img.shields.io/badge/React%20Flow-11-ff0072) ![AI SDK](https://img.shields.io/badge/Vercel%20AI%20SDK-4-black)
## What it does

- **Seed → Bloom.** Type a single idea and the AI cartographs its conceptual frontier into a hand-curated ring of 3–5 sub-topics, neatly arranged on an infinite canvas using radial layout.
- **Expand any node** (double-click or the *Expand* button) and the AI generates deeper, more concrete children — informed by the node's full ancestry so it never repeats itself.
- **Synthesize** any 2+ selected nodes (`Shift + drag` to select, then `⌘ Enter`) and the AI invents a brand-new node naming the *latent intersection* between them.
- Strictly-typed structured AI output via the **Vercel AI SDK** + **Zod** schemas — no JSON parsing, no hallucinated shapes.

## Tech

| Layer            | Choice                                                  |
| ---------------- | ------------------------------------------------------- |
| Framework        | Next.js 14 (App Router) + TypeScript (strict)           |
| Canvas           | React Flow 11 (custom nodes, smoothstep edges, minimap) |
| AI               | Vercel AI SDK (`generateObject`) + OpenAI               |
| State            | Zustand                                                 |
| Styling          | Tailwind CSS + custom glassmorphism + Framer Motion     |
| Iconography      | lucide-react                                            |

## Getting started

```bash
# 1. install
npm install

# 2. add your OpenAI key
cp .env.example .env.local
# then edit .env.local and paste your sk-... key

# 3. run
npm run dev
```

Open <http://localhost:3000>.

### Environment

| Var              | Required | Description                                  |
| ---------------- | -------- | -------------------------------------------- |
| `OPENAI_API_KEY` | ✅       | Your OpenAI key (used server-side only).     |
| `OPENAI_MODEL`   | ❌       | Model override. Defaults to `gpt-4o-mini`.   |

## Architecture

```
app/
  api/
    generate-nodes/route.ts   ← AI: seed + expand fan-outs (Zod-typed)
    synthesize/route.ts       ← AI: lateral-thinking concept fusion
  layout.tsx                  ← Inter + Space Grotesk, dark theme
  page.tsx                    ← mounts the client-only Canvas
  globals.css                 ← grid, glass, edge animations
components/
  Canvas.tsx                  ← React Flow + minimap + welcome + toolbar
  CustomNode.tsx              ← glassmorphic node (root / child / synthesis)
  CommandBar.tsx              ← floating ⌘K seed input
store/
  useGraphStore.ts            ← nodes, edges, selection, AI orchestration,
                                radial layout & ancestry walk
```

## Keyboard

| Key                  | Action                          |
| -------------------- | ------------------------------- |
| `⌘ / Ctrl + K`       | Focus the seed bar              |
| `Shift + drag`       | Box-select multiple nodes       |
<!-- metadata: 1aswc3vdjt -->
<!-- metadata: ppfl0ysu1o -->
<!-- metadata: 9mjxm5c1s5 -->
<!-- metadata: 3kz0w7k6z1 -->
<!-- metadata: gom9eybyal -->
<!-- metadata: hgy1xlqfab -->
<!-- metadata: oq6xpo6gue -->
| `⌘ / Ctrl + Enter`   | Synthesize the current selection|
| `Backspace / Delete` | Remove the selected node(s)     |
| `Double-click` node  | Expand it                       |

## Notes

- All AI calls run **server-side**; the OpenAI key never touches the browser.
- The radial layout in `useGraphStore.radialPositions` does collision-aware spiral fallback so child nodes never overlap existing ones.
- Edges use a shared `<linearGradient id="fractalEdgeGradient">` defined once inside the canvas — referenced by every `react-flow__edge-path` via CSS.

Built to demonstrate what a state-of-the-art LLM can do when given a *spatial* interface instead of a chat box.
