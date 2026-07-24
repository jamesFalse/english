import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { callProvider } from "~/server/lib/provider";
import { Prisma, type Word } from "@prisma/client";
import { fsrs, Rating, createEmptyCard, type Grade } from "ts-fsrs";

const STORY_SYSTEM_PROMPT = `
You are an expert English linguist and storyteller. Your goal is to facilitate "Chunk-Based Learning" through immersive narratives.

STRATEGIC INSTRUCTIONS:
1. LEXICAL CHUNKS: Embed each target word within a natural "lexical chunk" or collocation.
2. HTML TAGGING (CRITICAL): 
   - Wrap the ENTIRE lexical chunk in <u> tags.
   - Inside the <u> tags, wrap ONLY the target word in <mark> tags.
   - The <mark> tag MUST include a 'data-word' attribute containing the ORIGINAL BASE WORD as provided in the target list.
   - Example: If the target word is "decide" and you write "decided", the tag should be: "<u>make a tough <mark data-word="decide">decided</mark></u>."
3. NO MARKDOWN: Do not use any Markdown formatting like **bold** or *italics*. Use only the requested HTML tags.
4. CONTEXTUAL SCAFFOLDING: Surround each chunk with situational descriptions that reveal its meaning.
5. CEFR ALIGNMENT: Strictly adhere to the requested CEFR level.
6. COHERENCE: The story must be a single, flowing narrative.
`;

const normalizeTargetWord = (word: string) => word.trim().toLowerCase();

const findMissingMarkedWords = (story: string, words: string[]) => {
  const markedWords = new Set(
    Array.from(
      story.matchAll(/<mark\s+[^>]*data-word=["']([^"']+)["'][^>]*>/gi),
    ).map((match) => normalizeTargetWord(match[1] ?? "")),
  );

  return words.filter((word) => !markedWords.has(normalizeTargetWord(word)));
};

const reviewRatingSchema = z.union([
  z.literal(Rating.Again),
  z.literal(Rating.Hard),
  z.literal(Rating.Good),
  z.literal(Rating.Easy),
]);

const toGrade = (rating: Rating): Grade => {
  if (
    rating !== Rating.Again &&
    rating !== Rating.Hard &&
    rating !== Rating.Good &&
    rating !== Rating.Easy
  ) {
    throw new Error("Invalid review rating");
  }

  return rating;
};

const shuffleWords = <T>(words: T[]) =>
  [...words].sort(() => Math.random() - 0.5);

const pickAlphabeticallyDiverseWords = (candidates: Word[], count: number) => {
  if (count <= 0) return [];
  if (candidates.length <= count) return shuffleWords(candidates);

  const ranked = candidates
    .map((word, index) => ({ word, index }))
    .sort((a, b) => a.word.text.localeCompare(b.word.text));

  const selected: typeof ranked = [];
  const selectedIndexes: number[] = [];
  const available = new Set(ranked.map((_, index) => index));
  const firstIndex = Math.floor(Math.random() * ranked.length);

  selected.push(ranked[firstIndex]!);
  selectedIndexes.push(firstIndex);
  available.delete(firstIndex);

  while (selected.length < count && available.size > 0) {
    const scored = Array.from(available).map((index) => {
      const minDistance = Math.min(
        ...selectedIndexes.map((selectedIndex) =>
          Math.abs(index - selectedIndex),
        ),
      );
      return { index, minDistance };
    });

    scored.sort((a, b) => b.minDistance - a.minDistance);

    const bestDistance = scored[0]?.minDistance ?? 0;
    const bestIndexes = scored
      .filter((item) => item.minDistance === bestDistance)
      .map((item) => item.index);
    const nextIndex =
      bestIndexes[Math.floor(Math.random() * bestIndexes.length)];

    if (nextIndex === undefined) break;

    selected.push(ranked[nextIndex]!);
    selectedIndexes.push(nextIndex);
    available.delete(nextIndex);
  }

  return shuffleWords(selected.map((item) => item.word));
};

export const wordRouter = createTRPCRouter({
  generateSelection: publicProcedure
    .input(
      z
        .object({
          reviewACount: z.number().int().min(0).max(100),
          reviewBCount: z.number().int().min(0).max(100),
          reviewCCount: z.number().int().min(0).max(100),
        basicCount: z.number().int().min(0).max(100),
        independentCount: z.number().int().min(0).max(100),
        proficientCount: z.number().int().min(0).max(100),
        })
        .refine(
          ({
            reviewACount,
            reviewBCount,
            reviewCCount,
            basicCount,
            independentCount,
            proficientCount,
          }) =>
            reviewACount +
              reviewBCount +
              reviewCCount +
              basicCount +
              independentCount +
              proficientCount <=
            100,
          { message: "The total word count cannot exceed 100." },
        ),
    )
    .query(async ({ ctx, input }) => {
      const {
        reviewACount,
        reviewBCount,
        reviewCCount,
        basicCount,
        independentCount,
        proficientCount,
      } = input;
      const now = new Date();

      // 1. Fetch due review words independently for each CEFR band.
      const fetchReviewWords = async (cefrs: string[], count: number) => {
        if (count <= 0) return [];
        const dueWords = await ctx.db.word.findMany({
          where: {
            due: { lte: now },
            state: { gt: 0 },
            cefr: { in: cefrs },
          },
          orderBy: { due: "asc" },
          take: count * 3,
        });
        return shuffleWords(dueWords).slice(0, count);
      };

      // 2. Helper to fetch new words with diversity logic
      const getDiverseNewWords = async (cefrs: string[], count: number) => {
        if (count <= 0) return [];

        const candidates = await ctx.db.word.findMany({
          where: {
            state: 0,
            cefr: { in: cefrs },
          },
          orderBy: { text: "asc" },
        });

        return pickAlphabeticallyDiverseWords(candidates, count);
      };

      // 3. Parallel fetching
      const [
        reviewA,
        reviewB,
        reviewC,
        newBasic,
        newIndependent,
        newProficient,
      ] = await Promise.all([
        fetchReviewWords(["A1", "A2"], reviewACount),
        fetchReviewWords(["B1", "B2"], reviewBCount),
        fetchReviewWords(["C1", "C2"], reviewCCount),
        getDiverseNewWords(["A1", "A2"], basicCount),
        getDiverseNewWords(["B1", "B2"], independentCount),
        getDiverseNewWords(["C1", "C2"], proficientCount),
      ]);

      // 4. Combine and final shuffle
      const reviewWords = [...reviewA, ...reviewB, ...reviewC];
      const selection = [
        ...reviewWords,
        ...newBasic,
        ...newIndependent,
        ...newProficient,
      ];
      return {
        words: shuffleWords(selection),
        stats: {
          review: reviewWords.length,
          reviewA: reviewA.length,
          reviewB: reviewB.length,
          reviewC: reviewC.length,
          basic: newBasic.length,
          independent: newIndependent.length,
          proficient: newProficient.length,
          total: selection.length,
        },
      };
    }),

  generateStory: publicProcedure
    .input(
      z.object({
        words: z.array(z.string().min(1)).min(1).max(100),
        difficulty: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
        theme: z.string().max(80).optional(),
        mode: z.enum(["multiple", "single"]).default("multiple"),
      }),
    )
    .mutation(async ({ input }) => {
      const { words, difficulty, theme, mode } = input;
      const wordCount = words.length;
      const targetLength =
        mode === "single" ? 240 : Math.max(80, wordCount * 15);
      const start = Date.now();

      const themeContext =
        theme && theme !== "General"
          ? `The story should be set in or related to: **${theme}**.
           If a word doesn't naturally fit this theme, use a creative metaphor or a brief sub-plot to integrate it smoothly. 
           Priority 1 is natural narrative flow.`
          : "The story can be about any engaging topic.";

      const storyShape =
        mode === "single"
          ? `
        Create exactly THREE short, coherent stories for the single target word.
        Each story should be natural, practical, and focused on the most common usage of the word.
        The surrounding context must make the meaning and usage easy to infer.
        Use the target word at least twice in each story, and mark every target-word occurrence you intentionally use.
        Keep the total output around ${targetLength} words.
      `
          : `
        Create one level ${difficulty} story (approx. ${targetLength} words).
        The story must include every target word at least once.
      `;

      const buildPrompt = (missingWords: string[] = []) => `
        ${storyShape}
        THEME/SETTING: ${themeContext}
        TARGET WORDS: ${words.join(", ")}.
        ${missingWords.length > 0 ? `PREVIOUS ATTEMPT MISSED THESE REQUIRED data-word MARKS: ${missingWords.join(", ")}.` : ""}
        
        TASK:
        - Weave these words into a natural story using strong COLLOCATIONS.
        - Wrap the FULL LEXICAL CHUNK in <u> tags.
        - Wrap the TARGET WORD in <mark data-word="original_word"> tags (inside the <u> tags).
        - IMPORTANT: 'data-word' MUST match the exact spelling from the TARGET WORDS list.
        - Every target word must appear inside at least one valid <mark data-word="..."> tag.
        - No Markdown formatting.
      `;

      let story = await callProvider(buildPrompt(), {
        systemInstruction: STORY_SYSTEM_PROMPT,
      });
      let missingWords = findMissingMarkedWords(story, words);

      if (missingWords.length > 0) {
        story = await callProvider(buildPrompt(missingWords), {
          systemInstruction: STORY_SYSTEM_PROMPT,
          temperature: 0.5,
        });
        missingWords = findMissingMarkedWords(story, words);
      }

      if (missingWords.length > 0) {
        throw new Error(
          `AI story missed required target words: ${missingWords.join(", ")}`,
        );
      }

      if (process.env.NODE_ENV === "development") {
        console.info(
          `[word.generateStory] mode=${mode} words=${wordCount} targetLength=${targetLength} duration=${Date.now() - start}ms`,
        );
      }

      return story;
    }),

  submitReview: publicProcedure
    .input(
      z.object({
        wordId: z.number(),
        rating: reviewRatingSchema,
      }),
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
      const { card: updatedCard } = schedulingCards[toGrade(rating)];

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
          rating: reviewRatingSchema,
        }),
      ),
    )
    .mutation(async ({ ctx, input }) => {
      const f = fsrs();
      const now = new Date();
      const wordIds = input.map((i) => i.wordId);

      return ctx.db.$transaction(
        async (tx) => {
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
            const { card: updatedCard } = schedulingCards[toGrade(rating)];

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
              }),
            );
          }

          // 3. 并行执行所有更新
          return Promise.all(updatePromises);
        },
        {
          timeout: 30000, // 将事务超时时间增加到 30 秒，防止默认的 5 秒限制
        },
      );
    }),

  getNewWords: publicProcedure
    .input(
      z.object({
        cefr: z.array(z.string()).optional(),
        search: z.string().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(100),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { cefr, search, page, pageSize } = input;
      const skip = (page - 1) * pageSize;

      const where: Prisma.WordWhereInput = {
        state: 0,
        ...(cefr && cefr.length > 0 ? { cefr: { in: cefr } } : {}),
        ...(search
          ? { text: { contains: search, mode: Prisma.QueryMode.insensitive } }
          : {}),
      };

      const [items, totalCount] = await Promise.all([
        ctx.db.word.findMany({
          where,
          orderBy: { text: "asc" },
          skip,
          take: pageSize,
        }),
        ctx.db.word.count({ where }),
      ]);

      return { items, totalCount };
    }),

  bulkMarkAsKnown: publicProcedure
    .input(z.object({ wordIds: z.array(z.number()) }))
    .mutation(async ({ ctx, input }) => {
      const { wordIds } = input;
      const f = fsrs();
      const now = new Date();

      // For new words (state 0), the first "Good" rating results in the same card values.
      // We calculate these values once to perform a high-performance bulk update.
      const card = createEmptyCard();
      const schedulingCards = f.repeat(card, now);
      const { card: updatedCard } = schedulingCards[Rating.Good];

      const result = await ctx.db.word.updateMany({
        where: { id: { in: wordIds } },
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

      return { success: true, count: result.count };
    }),

  explainContext: publicProcedure
    .input(
      z.object({
        word: z.string().min(1),
        story: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const { word, story } = input;
      const prompt = `
        You are an expert English teacher. 
        A student is reading the following story and needs an explanation for the word or phrase: "${word}".
        
        STORY:
        """
        ${story}
        """
        
        TASK:
        1. First explain the general meaning and common usage of "${word}".
        2. Then explain what "${word}" means specifically in this story context.
        3. Provide your explanation in clear, simple English.
        4. If it's a phrase or has a specific connotation in this text, highlight that.
        5. Keep the explanation concise but thorough (approx 3-5 sentences).
        6. Output ONLY the explanation text. No conversational filler.
      `;

      return callProvider(prompt, {
        systemInstruction:
          "You are a helpful and professional English language tutor specializing in contextual definitions.",
      });
    }),
});
