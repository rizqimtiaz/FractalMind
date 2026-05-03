import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const RequestSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("seed"),
    concept: z.string().trim().min(1).max(280),
    depth: z.number().int().nonnegative().default(0),
  }),
  z.object({
    mode: z.literal("expand"),
    concept: z.string().trim().min(1).max(280),
    parentDescription: z.string().trim().max(600).optional(),
    context: z.array(z.string().trim().min(1).max(120)).max(48).optional(),
    depth: z.number().int().nonnegative().default(1),
  }),
]);

const NodeSchema = z.object({
  label: z
    .string()
    .min(2)
    .max(48)
    .describe("A short, vivid concept title — at most THREE words."),
  description: z
    .string()
    .min(8)
    .max(160)
    .describe(
      "A single dense sentence (max 15 words) capturing the concept's essence.",
    ),
});

const ResponseSchema = z.object({
  rootDescription: z
    .string()
    .min(8)
    .max(220)
    .describe(
      "A crisp 1-sentence framing (≤ 22 words) of the parent concept itself.",
    ),
  children: z
    .array(NodeSchema)
    .min(3)
    .max(6)
    .describe("3–6 distinct, non-overlapping child concepts."),
});

const SYSTEM_PROMPT = `You are an Ontological Cartographer — a rare hybrid of a polymathic
philosopher, a master systems thinker, and a knowledge-graph architect.

Your job is to chart the conceptual frontier around a seed idea so a human
can navigate it as a living mind-map. For every concept you receive you
must produce a tight, mutually-exclusive, collectively-exhaustive (MECE)
fan-out of subordinate concepts.

Strict output rules:
- Every "label" is at most THREE words. Prefer evocative, canonical names.
- Every "description" is ONE sentence, at most 15 words. No filler. No
  restating the parent. Each description must teach the user something
  they didn't already know from the label alone.
- Children must be diverse along orthogonal axes (e.g. mechanism, history,
  application, critique, adjacent field). Avoid synonyms or trivial
  rewordings of the parent.
- Never repeat a label that already appears in the provided context.
- No markdown. No emoji. No numbering. No prefacing.
- If the user input is nonsensical or empty, invent a graceful default
  rather than refusing.`;

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const parsed = RequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Missing OPENAI_API_KEY. Add it to .env.local before running FractalMind.",
      },
      { status: 500 },
    );
  }

  const body = parsed.data;

  const userPrompt =
    body.mode === "seed"
      ? buildSeedPrompt(body.concept)
      : buildExpandPrompt(
          body.concept,
          body.parentDescription,
          body.context ?? [],
          body.depth,
        );

  try {
    const { object } = await generateObject({
      model: openai(MODEL),
      schema: ResponseSchema,
      schemaName: "ConceptFanout",
      schemaDescription:
        "Structured fan-out of child concepts emanating from a seed idea.",
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.85,
      maxRetries: 2,
    });

    // Defensive: trim labels & dedupe just in case the model gets cute.
    const seen = new Set<string>();
    const children = object.children
      .map((c) => ({
        label: c.label.trim().replace(/\.$/, ""),
        description: c.description.trim(),
      }))
      .filter((c) => {
        const key = c.label.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    return NextResponse.json(
      {
        rootDescription: object.rootDescription.trim(),
        children,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[/api/generate-nodes] AI failure:", err);
    const message =
      err instanceof Error ? err.message : "Unknown AI generation error.";
    return NextResponse.json(
      { error: `AI generation failed: ${message}` },
      { status: 502 },
    );
  }
}

function buildSeedPrompt(concept: string): string {
  return [
    `Seed concept: "${concept}".`,
    "",
    "Generate the canonical first ring of subordinate concepts for an",
    "infinite mind-map. Aim for 4–5 children that, taken together, give a",
    "knowledgeable reader a panoramic but non-redundant entry into the",
    "topic. Also write a single-sentence framing of the seed itself.",
  ].join("\n");
}

function buildExpandPrompt(
  concept: string,
  parentDescription: string | undefined,
  context: string[],
  depth: number,
): string {
  const ancestry = context.length
    ? `Existing nodes in this branch (do NOT repeat these labels): ${context
        .map((c) => `"${c}"`)
        .join(", ")}.`
    : "No existing context.";

  const desc = parentDescription
    ? `Parent description: "${parentDescription}".`
    : "";

  return [
    `Concept to expand: "${concept}". (Depth in graph: ${depth}.)`,
    desc,
    ancestry,
    "",
    "Generate 3–5 deeper, more specific children of this concept.",
    "As depth increases, children should become more concrete, technical,",
    "or applied — not more abstract. Keep diversity high across the set.",
  ]
    .filter(Boolean)
    .join("\n");
}
