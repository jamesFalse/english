import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { callProvider } from "~/server/lib/provider";

const SYSTEM_INSTRUCTION = `
你是一个认知语言学家。请分析用户提供的英语文本，专注于解析长难句的“母语者阅读逻辑”。
工具不再仅仅标注主宾谓，而是展示 Native Speaker 如何在阅读时建立“心理预期”并处理“逻辑钩子”。

对于每一个句子，请模拟母语者的线性阅读过程，将其拆解为多个语块（Chunks）。
解析规则：
1. 线性预期 (mental_note)：解释母语者看到这个语块时，潜意识在等待什么。例如看到 "Although..." 预期后面会有转折主句。
2. 逻辑定位 (logic_tag)：识别语块的功能（如：背景铺垫、核心谓语、补充说明、逻辑转折、结果预警等）。
3. 视觉编码 (color_class)：为不同功能的语块指定 Tailwind 颜色类：
   - 核心逻辑 (主句/谓语): text-slate-900 font-bold
   - 背景/让步 (背景铺垫): text-blue-600
   - 修饰/补充 (定语从句/插入语): text-green-600
   - 转折/逻辑钩子: text-orange-600
   - 结果/影响: text-purple-600
4. 难度判断：为解析的句子判断 CEFR 等级 (A1-C2)。

必须严格按照以下 JSON 格式输出：
{
  "sentences": [
    {
      "original": "Sentence text",
      "difficulty": "C1",
      "logic_summary": "核心逻辑总结",
      "chunks": [
        {
          "text": "Part of sentence",
          "mental_note": "心理预期反馈",
          "logic_tag": "预警/背景/核心/转折",
          "color_class": "text-blue-600"
        }
      ]
    }
  ]
}
`;

const chunkSchema = z.object({
  text: z.string(),
  mental_note: z.string(),
  logic_tag: z.string(),
  color_class: z.enum([
    "text-slate-900 font-bold",
    "text-blue-600",
    "text-green-600",
    "text-orange-600",
    "text-purple-600",
  ]).catch("text-slate-900 font-bold"),
});

const sentenceSchema = z.object({
  original: z.string(),
  difficulty: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).catch("B2"),
  logic_summary: z.string(),
  chunks: z.array(chunkSchema).default([]),
});

const analysisSchema = z.object({
  sentences: z.array(sentenceSchema).default([]),
});

export const analyzeRouter = createTRPCRouter({
  analyzeText: publicProcedure
    .input(z.object({ text: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const result = await callProvider(input.text, {
        model: "gemini-3-flash-preview",
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
      });

      // 防御性检查
      if (!result || typeof result !== 'object') return { sentences: [] };
      if (Array.isArray(result)) return analysisSchema.parse({ sentences: result });
      
      // 兼容 AI 返回了 sentences 键但不是数组，或者直接返回了数组内容的情况
      if (!("sentences" in result) || !Array.isArray(result.sentences)) {
        const potentialArray = Object.values(result).find(val => Array.isArray(val));
        return analysisSchema.parse({ sentences: Array.isArray(potentialArray) ? potentialArray : [] });
      }

      return analysisSchema.parse(result);
    }),
});
