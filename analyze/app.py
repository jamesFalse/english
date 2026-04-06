import os
import json
from flask import Flask, render_template, request, jsonify
from google import genai

app = Flask(__name__)

PROXY_URL = "http://127.0.0.1:7890"

if PROXY_URL:
    os.environ["HTTP_PROXY"] = PROXY_URL
    os.environ["HTTPS_PROXY"] = PROXY_URL
# Initialize Gemini Client
api_key = '' # add it by yourself
PROXY_URL = "http://127.0.0.1:7890"  # 替换为你的代理服务器地址
client = genai.Client(api_key=api_key) if api_key else None

SYSTEM_INSTRUCTION = """
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

必须严格按照以下 JSON 格式输出，且仅输出 JSON，不要包含任何 Markdown 格式：
{
  "sentences": [
    {
      "original": "Sentence text",
      "difficulty": "C1",
      "logic_summary": "核心逻辑总结",
      "chunks": [
        {
          "text": "Part of sentence",
          "mental_note": "母语者看到这里的心理预期或反馈",
          "logic_tag": "预警/背景/核心/转折",
          "color_class": "text-blue-600"
        }
      ]
    }
  ]
}
"""

def analyze_logic_flow(text):
    if not client:
        raise Exception("Gemini API key not configured. Please set GEMINI_API_KEY environment variable.")
    
    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        config={
            "system_instruction": SYSTEM_INSTRUCTION,
            "response_mime_type": "application/json"
        },
        contents=text
    )
    return response.text

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    text = data.get('text', '')
    if not text:
        return jsonify({"error": "No text provided"}), 400
    
    try:
        result_json_str = analyze_logic_flow(text)
        result_data = json.loads(result_json_str)
        return jsonify(result_data)
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)
