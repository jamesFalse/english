import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { callProvider } from "~/server/lib/provider";

const BRIDGE_SYSTEM_PROMPT = `
You are a precision-oriented English linguist. Your goal is to find the MOST CONCISE and ACCURATE English word or phrase that matches a concept within a specific context.

Input:
1. Context: The situation where the expression will be used.
2. Concept: A description, Chinese fragment, or rough English idea.

Output Rules:
1. Conciseness First: Prefer a single word if possible. If not, a short phrase. Never return a long sentence unless absolutely necessary.
2. Contextual Accuracy: The expression must fit the provided context perfectly.
3. If No Match Found: If no natural English expression matches the concept in that context, set "found" to false.

Return a JSON object:
{
  "found": boolean,
  "expression": "string (the word or phrase, or empty if not found)",
  "type": "word" | "phrase" | "none",
  "explanation": "string (max 20 words in English, explaining the nuance and why it fits)",
  "example": "string (a very short natural example sentence in English)"
}
`;

const bridgeResultSchema = z.object({
  found: z.boolean(),
  expression: z.string().max(80),
  type: z.enum(["word", "phrase", "none"]),
  explanation: z.string().max(160),
  example: z.string().max(200),
});

export const bridgeRouter = createTRPCRouter({
  bridge: publicProcedure
    .input(z.object({
      context: z.string().max(100),
      concept: z.string().min(1).max(500),
    }))
    .mutation(async ({ input }) => {
      const prompt = `Context: "${input.context}"\nConcept: "${input.concept}"`;

      const result = await callProvider(prompt, {
        systemInstruction: BRIDGE_SYSTEM_PROMPT,
        responseMimeType: "application/json",
      });

      return bridgeResultSchema.parse(result);
    }),
});
