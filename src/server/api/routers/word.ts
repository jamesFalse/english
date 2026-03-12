import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { GoogleGenAI } from '@google/genai';
import { env } from "~/env";
import { fsrs, Rating } from "ts-fsrs";

export const wordRouter = createTRPCRouter({
  generateSelection: publicProcedure
    .input(
      z.object({
        basic: z.number().min(0).max(100),
        independent: z.number().min(0).max(100),
        proficient: z.number().min(0).max(100),
      })
    )
    .query(async ({ ctx, input }) => {
      const { basic, independent, proficient } = input;
      const now = new Date();

      // 1. Query Due Words (due <= now, state > 0)
      const dueWords = await ctx.db.word.findMany({
        where: {
          due: { lte: now },
          state: { gt: 0 },
        },
      });

      const limit = 30;
      let selection = [...dueWords];

      if (selection.length < limit) {
        const gap = limit - selection.length;

        // 2. Query New Words (state = 0) based on CEFR quotas
        const basicQuota = Math.round(gap * (basic / 100));
        const independentQuota = Math.round(gap * (independent / 100));
        const proficientQuota = Math.max(0, gap - basicQuota - independentQuota);

        const getNewWords = async (cefrs: string[], take: number) => {
          if (take <= 0) return [];

          // 1. Count total available words in these categories
          const count = await ctx.db.word.count({
            where: {
              state: 0,
              cefr: { in: cefrs },
            },
          });

          if (count === 0) return [];

          // 2. Pick a random offset
          const skip = Math.max(0, Math.floor(Math.random() * (count - take)));

          return ctx.db.word.findMany({
            where: {
              state: 0,
              cefr: { in: cefrs },
            },
            take: take,
            skip: skip,
          });
        };

        const [newBasic, newIndependent, newProficient] = await Promise.all([
          getNewWords(["A1", "A2"], basicQuota),
          getNewWords(["B1", "B2"], independentQuota),
          getNewWords(["C1", "C2"], proficientQuota),
        ]);

        selection = [...selection, ...newBasic, ...newIndependent, ...newProficient];
      }

      // 3. Shuffle and limit to 30
      const shuffled = selection
        .sort(() => Math.random() - 0.5)
        .slice(0, limit);

      return shuffled;
    }),

  generateStory: publicProcedure
    .input(
      z.object({
        words: z.array(z.string()),
        difficulty: z.string(), // A1, A2, B1, B2, C1, C2
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { words, difficulty } = input;
        const GEMINI_API_KEY = env.GEMINI_API_KEY;

        // Current SDK (GoogleGenAI) setup with proxy
        const ai = new GoogleGenAI({ 
          apiKey: GEMINI_API_KEY,
        });

        const prompt = `Write a short story at English level ${difficulty} using ALL of the following 30 words: ${words.join(", ")}. 
        Crucially, every time you use one of these 30 words in the story, wrap it in <mark> tags (e.g., <mark>word</mark>). 
        The story should be coherent and engaging.`;

        // The current SDK usually allows custom configuration via model options
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash', // Correcting to a valid model
          contents: prompt,
        });
        
        return response.text;
      } catch (error: any) {
        console.error("Gemini Story Generation Error:", error);
        throw new Error(`Failed to generate story with Gemini: ${error.message || "Unknown error"}`);
      }
    }),

  submitReview: publicProcedure
    .input(
      z.object({
        wordId: z.number(),
        rating: z.nativeEnum(Rating), // 1:Again, 2:Hard, 3:Good, 4:Easy
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { wordId, rating } = input;
      const word = await ctx.db.word.findUnique({ where: { id: wordId } });
      if (!word) throw new Error("Word not found");

      const f = fsrs();
      const card = {
        due: word.due ?? new Date(),
        stability: word.stability,
        difficulty: word.difficulty,
        elapsed_days: word.elapsed_days,
        scheduled_days: word.scheduled_days,
        reps: word.reps,
        lapses: word.lapses,
        state: word.state,
        last_review: word.last_review ?? undefined,
      };

      const schedulingCards = f.repeat(card, new Date());
      const { card: updatedCard } = schedulingCards[rating]!;

      return ctx.db.word.update({
        where: { id: wordId },
        data: {
          due: updatedCard.due,
          stability: updatedCard.stability,
          difficulty: updatedCard.difficulty,
          elapsed_days: updatedCard.elapsed_days,
          scheduled_days: updatedCard.scheduled_days,
          reps: updatedCard.reps,
          lapses: updatedCard.lapses,
          state: updatedCard.state,
          last_review: updatedCard.last_review,
        },
      });
    }),
});
