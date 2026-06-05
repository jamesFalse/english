import "server-only";

import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { env } from "~/env";

const gemini = env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
    })
  : null;

const deepseek = env.DEEPSEEK_API_KEY
  ? new OpenAI({
      baseURL: "https://api.deepseek.com",
      apiKey: env.DEEPSEEK_API_KEY,
    })
  : null;

export type GeminiModel = "gemini-3.1-flash-lite";
export type DeepSeekModel = "deepseek-v4-pro";
export type ProviderModel = GeminiModel | DeepSeekModel;
export type AIProvider = "gemini" | "deepseek";

export interface ProviderOptions {
  model?: ProviderModel;
  systemInstruction?: string;
  temperature?: number;
  responseMimeType?: "application/json" | "text/plain";
}

const parseResponse = (text: string, responseMimeType?: ProviderOptions["responseMimeType"]) => {
  if (responseMimeType !== "application/json") return text;

  if (!text) throw new Error("AI returned empty response");

  try {
    // 清理可能存在的 Markdown 代码块标记
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned) as unknown;
  } catch {
    console.error("AI JSON 解析失败:", text);
    throw new Error("AI 返回了无效的 JSON 格式");
  }
};

const callGeminiProvider = async (prompt: string, options: ProviderOptions) => {
  if (!gemini) throw new Error("Gemini client is not configured");

  const response = await gemini.models.generateContent({
    model: options.model === "gemini-3.1-flash-lite" ? options.model : "gemini-3.1-flash-lite",
    contents: prompt,
    config: {
      systemInstruction: options.systemInstruction,
      temperature: options.temperature ?? 0.7,
      responseMimeType: options.responseMimeType ?? "text/plain",
    },
  });

  return response.text ?? "";
};

const callDeepSeekProvider = async (prompt: string, options: ProviderOptions) => {
  if (!deepseek) throw new Error("DeepSeek client is not configured");

  const completion = (await deepseek.chat.completions.create({
    model: options.model === "deepseek-v4-pro" ? options.model : "deepseek-v4-pro",
    messages: [
      ...(options.systemInstruction
        ? [{ role: "system" as const, content: options.systemInstruction }]
        : []),
      { role: "user" as const, content: prompt },
    ],
    temperature: options.temperature ?? 0.7,
    response_format:
      options.responseMimeType === "application/json"
        ? { type: "json_object" as const }
        : undefined,
    stream: false,
  } as Parameters<typeof deepseek.chat.completions.create>[0])) as {
    choices: Array<{ message: { content: string | null } }>;
  };

  return completion.choices[0]?.message.content ?? "";
};

/**
 * 统一的 AI 调用工具函数。通过 PROVIDER=gemini|deepseek 选择供应商。
 */
export async function callProvider(
  prompt: string,
  options: ProviderOptions & { responseMimeType: "application/json" },
): Promise<unknown>;
export async function callProvider(
  prompt: string,
  options?: ProviderOptions,
): Promise<string>;
export async function callProvider(prompt: string, options: ProviderOptions = {}) {
  const start = Date.now();
  const model =
    env.PROVIDER === "deepseek"
      ? options.model === "deepseek-v4-pro"
        ? options.model
        : "deepseek-v4-pro"
      : options.model === "gemini-3.1-flash-lite"
        ? options.model
        : "gemini-3.1-flash-lite";

  try {
    const text =
      env.PROVIDER === "deepseek"
        ? await callDeepSeekProvider(prompt, options)
        : await callGeminiProvider(prompt, options);

    if (env.NODE_ENV === "development") {
      console.info(
        `[AI] provider=${env.PROVIDER} model=${model} duration=${Date.now() - start}ms outputChars=${text.length}`,
      );
    }

    return parseResponse(text, options.responseMimeType);
  } catch (error: unknown) {
    if (env.NODE_ENV === "development") {
      console.info(
        `[AI] provider=${env.PROVIDER} model=${model} duration=${Date.now() - start}ms failed=true`,
      );
    }

    console.error(`${env.PROVIDER} 调用异常:`, error);
    throw new Error("AI 服务暂时不可用，请稍后重试。");
  }
}
