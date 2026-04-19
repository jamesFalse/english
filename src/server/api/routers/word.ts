import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { callGemini } from "~/server/lib/gemini";
import { env } from "~/env";
import { fsrs, Rating, createEmptyCard, type Grade } from "ts-fsrs";

const STORY_SYSTEM_PROMPT = `
You are a creative English teacher. Write short, engaging stories for learners.
CRITICAL CONSTRAINTS:
1. Every time you use one of the provided target words, wrap it in <mark> tags (e.g., <mark>word</mark>). 
2. Match the requested CEFR level (A1-C2) in vocabulary and complexity.
3. Ensure the story is coherent and contextually relevant.
`;

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
      const limit = 30;

      const dueWords = await ctx.db.word.findMany({
        where: {
          due: { lte: now },
          state: { gt: 0 },
        },
        orderBy: {
          due: 'asc',
        },
        take: limit,
      });

      let selection = [...dueWords];

      if (selection.length < limit) {
        const gap = limit - selection.length;
        const basicQuota = Math.round(gap * (basic / 100));
        const independentQuota = Math.round(gap * (independent / 100));
        const proficientQuota = Math.max(0, gap - basicQuota - independentQuota);

        const getDiverseNewWords = async (cefrs: string[], targetCount: number) => {
          if (targetCount <= 0) return [];
          const oversampleCount = targetCount * 3;
          const allMatchingIds = await ctx.db.word.findMany({
            where: { state: 0, cefr: { in: cefrs } },
            select: { id: true },
          });
          const sampledIds = allMatchingIds
            .map((w) => w.id)
            .sort(() => Math.random() - 0.5)
            .slice(0, oversampleCount);

          const candidates = await ctx.db.word.findMany({
            where: { id: { in: sampledIds } },
          });
          candidates.sort(() => Math.random() - 0.5);

          const result: typeof candidates = [];
          const letterMap = new Map<string, number>();

          for (const word of candidates) {
            if (result.length >= targetCount) break;
            if (!word.text) continue;
            const firstLetter = word.text.charAt(0).toLowerCase();
            const count = letterMap.get(firstLetter) || 0;
            if (count < 2) {
              result.push(word);
              letterMap.set(firstLetter, count + 1);
            }
          }
          return result;
        };

        const [newBasic, newIndependent, newProficient] = await Promise.all([
          getDiverseNewWords(["A1", "A2"], basicQuota),
          getDiverseNewWords(["B1", "B2"], independentQuota),
          getDiverseNewWords(["C1", "C2"], proficientQuota),
        ]);
        selection = [...selection, ...newBasic, ...newIndependent, ...newProficient];
      }

      return selection.sort(() => Math.random() - 0.5).slice(0, limit);
    }),

  generateStory: publicProcedure
    .input(
      z.object({
        words: z.array(z.string()),
        difficulty: z.string(), 
      })
    )
    .mutation(async ({ input }) => {
      const { words, difficulty } = input;
      const wordCount = words.length;
      const targetLength = Math.max(50, wordCount * 12);

      const prompt = `Write a story at level ${difficulty} (approx. ${targetLength} words) using ALL these words: ${words.join(", ")}. Wrap EACH of these words in <mark> tags.`;

      return callGemini(prompt, { 
        systemInstruction: STORY_SYSTEM_PROMPT 
      });
    }),

  submitReview: publicProcedure
    .input(
      z.object({
        wordId: z.number(),
        rating: z.nativeEnum(Rating),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { wordId, rating } = input;
      const word = await ctx.db.word.findUnique({ where: { id: wordId } });
      if (!word) throw new Error("Word not found");

      const f = fsrs();
      const card = createEmptyCard();
      card.due = word.due ?? new Date();
      card.stability = word.stability;
      card.difficulty = word.difficulty;
      card.scheduled_days = word.scheduled_days;
      card.reps = word.reps;
      card.lapses = word.lapses;
      card.state = word.state;
      card.last_review = word.last_review ?? undefined;

      const schedulingCards = f.repeat(card, new Date());
      const { card: updatedCard } = schedulingCards[rating as Grade]!;

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

  submitBatchReview: publicProcedure
    .input(
      z.array(
        z.object({
          wordId: z.number(),
          rating: z.nativeEnum(Rating),
        })
      )
    )
    .mutation(async ({ ctx, input }) => {
      const f = fsrs();
      const now = new Date();
      const wordIds = input.map((i) => i.wordId);

      return ctx.db.$transaction(async (tx) => {
        // 1. 一次性获取所有相关的单词数据，减少数据库往返
        const words = await tx.word.findMany({
          where: { id: { in: wordIds } },
        });

        const wordMap = new Map(words.map((w) => [w.id, w]));
        const updatePromises = [];

        // 2. 循环处理评分并准备更新
        for (const { wordId, rating } of input) {
          const word = wordMap.get(wordId);
          if (!word) continue;

          const card = createEmptyCard();
          card.due = word.due ?? now;
          card.stability = word.stability;
          card.difficulty = word.difficulty;
          card.scheduled_days = word.scheduled_days;
          card.reps = word.reps;
          card.lapses = word.lapses;
          card.state = word.state;
          card.last_review = word.last_review ?? undefined;

          const schedulingCards = f.repeat(card, now);
          const { card: updatedCard } = schedulingCards[rating as Grade]!;

          // 将更新操作加入队列
          updatePromises.push(
            tx.word.update({
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
            })
          );
        }

        // 3. 并行执行所有更新
        return Promise.all(updatePromises);
      }, {
        timeout: 30000, // 将事务超时时间增加到 30 秒，防止默认的 5 秒限制
      });
    }),
});
