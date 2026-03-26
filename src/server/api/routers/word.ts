import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { GoogleGenAI } from '@google/genai';
import { env } from "~/env";
import { fsrs, Rating, createEmptyCard, type Grade } from "ts-fsrs";
import { Prisma } from "@prisma/client";

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

      // 1. 优化：查询 Due Words，按逾期严重程度排序，并在数据库层面截断
      const dueWords = await ctx.db.word.findMany({
        where: {
          due: { lte: now },
          state: { gt: 0 },
        },
        orderBy: {
          due: 'asc', // 越早到期的越优先排在前面
        },
        take: limit,  // 防止逾期词过多导致内存爆炸
      });

      let selection = [...dueWords];

      if (selection.length < limit) {
        const gap = limit - selection.length;

        const basicQuota = Math.round(gap * (basic / 100));
        const independentQuota = Math.round(gap * (independent / 100));
        const proficientQuota = Math.max(0, gap - basicQuota - independentQuota);

        // 2. 优化：引入“物理随机 + 超额采样 + 首字母过滤”的综合策略
        const getDiverseNewWords = async (cefrs: string[], targetCount: number) => {
          if (targetCount <= 0) return [];

          // 超额采样：去数据库里捞取目标数量的 3 倍作为“候选池”
          const oversampleCount = targetCount * 3;

          // 1. 仅捞取所有符合条件的 ID（非常轻量）
          const allMatchingIds = await ctx.db.word.findMany({
            where: {
              state: 0,
              cefr: { in: cefrs },
            },
            select: { id: true },
          });

          // 2. 在 JS 内存中打乱 ID 并截取所需数量（解决真随机和性能平衡）
          const sampledIds = allMatchingIds
            .map((w) => w.id)
            .sort(() => Math.random() - 0.5)
            .slice(0, oversampleCount);

          // 3. 用选出的 ID 查询完整数据（彻底解决 Date 解析和 any 类型问题）
          const candidates = await ctx.db.word.findMany({
            where: {
              id: { in: sampledIds },
            },
          });

          // 4. Prisma 的 IN 查询不保证顺序，重新打乱以确保下方的首字母过滤有更好的随机散列
          candidates.sort(() => Math.random() - 0.5);

          const result: typeof candidates = [];
          const letterMap = new Map<string, number>();

          // 首字母多样性过滤
          for (const word of candidates) {
            if (result.length >= targetCount) break;
            // Ensure word.text is not empty before accessing its first character
            if (!word.text) {
              continue;
            }

            const firstLetter = word.text[0].toLowerCase();
            const count = letterMap.get(firstLetter) || 0;

            // 规则：同一首字母的单词，在同一级别中最多允许出现 2 次
            if (count < 2) {
              result.push(word);
              letterMap.set(firstLetter, count + 1);
            }
          }

          // 兜底机制：如果过滤条件太严导致没凑够目标数量，直接把剩下的候选词塞进去
          if (result.length < targetCount) {
            for (const word of candidates) {
              if (result.length >= targetCount) break;
              if (!result.some(w => w.id === word.id)) {
                result.push(word);
              }
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

      // 3. 最终打乱：打乱复习词与新词的相对位置
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

        const ai = new GoogleGenAI({
          apiKey: GEMINI_API_KEY,
        });

        const wordCount = words.length;
        const targetLength = Math.max(50, wordCount * 12); // Minimum 50 words, or 12 words per target vocabulary

        const prompt = `Write a short story at English level ${difficulty} using ALL of the following ${wordCount} words: ${words.join(", ")}. 
        
        CRITICAL CONSTRAINTS:
        1. Every time you use one of the ${wordCount} words, wrap it in <mark> tags (e.g., <mark>word</mark>). 
        2. The story must be approximately ${targetLength} words long. (Adjusted for the number of target words).
        3. The story should be coherent, engaging, and suitable for a ${difficulty} learner.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
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
      const card = createEmptyCard(); // Initialize with default FSRS card properties

      // Assign existing word data to the card
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
});
