import { GoogleGenAI } from '@google/genai';
import { env } from "~/env";

// 统一 AI 客户端初始化
const ai = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
});

export type GeminiModel = "gemini-3-flash-preview";

export interface GeminiOptions {
  model?: GeminiModel;
  systemInstruction?: string;
  temperature?: number;
  responseMimeType?: "application/json" | "text/plain";
}

/**
 * 统一的 Gemini 调用工具函数
 */
export async function callGemini(
  prompt: string,
  options: GeminiOptions & { responseMimeType: "application/json" },
): Promise<unknown>;
export async function callGemini(
  prompt: string,
  options?: GeminiOptions,
): Promise<string>;
export async function callGemini(prompt: string, options: GeminiOptions = {}) {
  const modelName = options.model ?? "gemini-3-flash-preview";

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: options.systemInstruction,
        temperature: options.temperature ?? 0.7,
        responseMimeType: options.responseMimeType ?? "text/plain",
      }
    });

    const text = response.text ?? "";

    if (options.responseMimeType === "application/json") {
      if (!text) throw new Error("AI returned empty response");
      try {
        // 清理可能存在的 Markdown 代码块标记
        const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
        return JSON.parse(cleaned) as unknown;
      } catch {
        console.error("Gemini JSON 解析失败:", text);
        throw new Error("AI 返回了无效的 JSON 格式");
      }
    }

    return text;
  } catch (error: unknown) {
    console.error("Gemini 调用异常:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    throw new Error(`AI 服务异常: ${message}`);
  }
}
