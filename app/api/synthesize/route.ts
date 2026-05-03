import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const RequestSchema = z.object({
  concepts: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(80),
        description: z.string().trim().max(400).optional().default(""),
      }),
    )
    .min(2)
    .max(8),
});

const ResponseSchema = z.object({
  label: z
    .string()
    .min(2)
    .max(48)
    .describe(
      "A surprising but resonant title for the synthesized concept (≤ 4 words).",
    ),
  description: z
    .string()
    .min(12)
    .max(220)
    .describe(
      "ONE sentence (≤ 28 words) naming the latent intersection. Must be insightful, not a list.",
    ),
});

const SYSTEM_PROMPT = `You are a Lateral Thinker — equal parts essayist, semiotician, and
research-grade philosopher. You specialize in finding the unexpected
through-line between concepts that seem unrelated.

When given several concepts, your task is to NAME the latent intersection
they secretly share. The result should feel inevitable in hindsight: a
single new idea that re-frames the originals as facets of a deeper
pattern.

Strict output rules:
- The "label" is at most FOUR words. It must be a noun phrase that
  could plausibly be a chapter title in a book.
- The "description" is exactly ONE sentence (≤ 28 words). It must do
  three things at once: (1) name the underlying mechanism or principle,
  (2) explain why the chosen concepts are instances of it, and
  (3) hint at a non-obvious implication.
- Never use the words "intersection", "synthesis", "blend", or "fusion".
- Never restate the input labels verbatim. Transcend them.
- No markdown, no emoji, no preamble.`;

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

  const { concepts } = parsed.data;

  const conceptBlock = concepts
    .map(
      (c, i) =>
        `(${i + 1}) "${c.label}"${c.description ? ` — ${c.description}` : ""}`,
    )
    .join("\n");

  const prompt = [
    "Find the latent intersection between the following concepts.",
    "",
    conceptBlock,
    "",
    "Produce a single new concept (label + one-sentence description) that",
    "re-frames all of them as instances of a deeper pattern.",
  ].join("\n");

  try {
    const { object } = await generateObject({
      model: openai(MODEL),
      schema: ResponseSchema,
      schemaName: "ConceptSynthesis",
      schemaDescription:
        "A single emergent concept produced by intersecting multiple inputs.",
      system: SYSTEM_PROMPT,
      prompt,
      temperature: 0.95,
      maxRetries: 2,
    });

    return NextResponse.json(
      {
        label: object.label.trim().replace(/\.$/, ""),
        description: object.description.trim(),
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[/api/synthesize] AI failure:", err);
    const message =
      err instanceof Error ? err.message : "Unknown AI generation error.";
    return NextResponse.json(
      { error: `AI synthesis failed: ${message}` },
      { status: 502 },
    );
  }
}
