import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { callGemini } from "~/server/lib/gemini";
import { env } from "~/env";
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

export const wordRouter = createTRPCRouter({
  generateSelection: publicProcedure
    .input(
      z.object({
        reviewCount: z.number().min(0).max(100),
        basicCount: z.number().min(0).max(100),
        independentCount: z.number().min(0).max(100),
        proficientCount: z.number().min(0).max(100),
      })
    )
    .query(async ({ ctx, input }) => {
      const { reviewCount, basicCount, independentCount, proficientCount } = input;
      const now = new Date();

      // 1. Fetch Due Review Words (Any CEFR)
      const fetchReviewWords = async () => {
        if (reviewCount <= 0) return [];
        const dueWords = await ctx.db.word.findMany({
          where: {
            due: { lte: now },
            state: { gt: 0 },
          },
          orderBy: { due: "asc" },
          take: reviewCount * 3, // Oversample for shuffle
        });
        return dueWords.sort(() => Math.random() - 0.5).slice(0, reviewCount);
      };

      // 2. Helper to fetch new words with diversity logic
      const getDiverseNewWords = async (cefrs: string[], count: number) => {
        if (count <= 0) return [];
        
        // Fetch a generous pool of candidates to ensure diversity and quantity
        const candidates = await ctx.db.word.findMany({
          where: { state: 0, cefr: { in: cefrs } },
          take: Math.max(count * 10, 100), 
        });

        if (candidates.length === 0) return [];

        // Shuffle candidates
        const shuffled = candidates.sort(() => Math.random() - 0.5);

        const result: typeof candidates = [];
        const letterMap = new Map<string, number>();
        const remaining: typeof candidates = [];

        // First Pass: Try to satisfy diversity (max 2 per letter)
        for (const word of shuffled) {
          const firstLetter = word.text.charAt(0).toLowerCase();
          const letterCount = letterMap.get(firstLetter) || 0;
          
          if (result.length < count && letterCount < 2) {
            result.push(word);
            letterMap.set(firstLetter, letterCount + 1);
          } else {
            remaining.push(word);
          }
        }

        // Second Pass: If we fall short due to diversity filtering, 
        // fill up with remaining words to reach the requested count.
        // We only return fewer if the DB literally has no more words.
        while (result.length < count && remaining.length > 0) {
          const nextWord = remaining.shift();
          if (nextWord) result.push(nextWord);
        }

        return result;
      };

      // 3. Parallel fetching
      const [reviewWords, newBasic, newIndependent, newProficient] = await Promise.all([
        fetchReviewWords(),
        getDiverseNewWords(["A1", "A2"], basicCount),
        getDiverseNewWords(["B1", "B2"], independentCount),
        getDiverseNewWords(["C1", "C2"], proficientCount),
      ]);

      // 4. Combine and final shuffle
      const selection = [...reviewWords, ...newBasic, ...newIndependent, ...newProficient];
      return selection.sort(() => Math.random() - 0.5);
    }),

  generateStory: publicProcedure
    .input(
      z.object({
        words: z.array(z.string()),
        difficulty: z.string(), 
        theme: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { words, difficulty, theme } = input;
      const wordCount = words.length;
      const targetLength = Math.max(80, wordCount * 15);

      const themeContext = theme && theme !== "General" 
        ? `The story should be set in or related to: **${theme}**. 
           If a word doesn't naturally fit this theme, use a creative metaphor or a brief sub-plot to integrate it smoothly. 
           Priority 1 is natural narrative flow.` 
        : "The story can be about any engaging topic.";

      const prompt = `
        Create a level ${difficulty} story (approx. ${targetLength} words).
        THEME/SETTING: ${themeContext}
        TARGET WORDS: ${words.join(", ")}.
        
        TASK:
        - Weave these words into a natural story using strong COLLOCATIONS.
        - Wrap the FULL LEXICAL CHUNK in <u> tags.
        - Wrap the TARGET WORD in <mark data-word="original_word"> tags (inside the <u> tags).
        - IMPORTANT: 'data-word' MUST match the exact spelling from the TARGET WORDS list.
        - No Markdown formatting.
      `;

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

  getNewWords: publicProcedure
    .input(
      z.object({
        cefr: z.array(z.string()).optional(),
        search: z.string().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(100),
      })
    )
    .query(async ({ ctx, input }) => {
      const { cefr, search, page, pageSize } = input;
      const skip = (page - 1) * pageSize;
      
      const where = {
        state: 0,
        ...(cefr && cefr.length > 0 ? { cefr: { in: cefr } } : {}),
        ...(search ? { text: { contains: search, mode: 'insensitive' } } : {}),
      };

      const [items, totalCount] = await Promise.all([
        ctx.db.word.findMany({
          where,
          orderBy: { text: 'asc' },
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
      const { card: updatedCard } = schedulingCards[Rating.Good as Grade]!;

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
});
