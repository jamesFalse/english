
# Gemini.md: English Syntax Analyzer & CEFR Leveler

## 1. 项目概述

构建一个基于 Web 的英语语法分析工具。用户输入段落后，后端调用 Gemini API 识别其中的“复杂句”，将其拆解为语法成分（如从句、插入语、伴随状语等）并着色显示，同时根据 CEFR 标准（A1-C2）标注句子难度。

## 2. 技术栈

* **后端**: Python 3.10+, Flask
* **前端**: HTML5, Tailwind CSS (CDN), JavaScript (用于异步请求和 DOM 渲染)
* **AI**: `google-genai` (模型: `gemini-3-flash-preview`)
* **部署**: Windows `.bat` 一键启动

## 3. 核心 Prompt 定义 (API Logic)

为了让前端能直接渲染颜色，Gemini 必须返回如下格式的 JSON：

```json
{
  "sentences": [
    {
      "original": "Sentence text",
      "is_complex": true,
      "difficulty": "B2",
      "analysis": [
        {"text": "Although it was raining", "type": "concessive_clause", "color": "text-blue-500"},
        {"text": ", he went out", "type": "main_clause", "color": "text-gray-800"}
      ]
    }
  ]
}

```

## 4. 任务任务拆解 (TODO List)

### 阶段一：环境准备与基础架构

* [x] **TODO 1: 初始化项目目录**
* 创建文件夹结构：`app.py`, `templates/index.html`, `requirements.txt`。
* 在当前文件夹（analyze）下创建一个python venv的虚拟环境用于运行项目


* [x] **TODO 2: 依赖管理**
* 在 `requirements.txt` 中添加 `flask`, `google-genai`。


* [x] **TODO 3: 编写一键启动脚本 `start.bat**`
* 功能：安装依赖（可选）、启动 Flask 后端、延时 2 秒后自动打开浏览器访问 `http://127.0.0.1:5001`。



### 阶段二：后端 API 开发

* [x] **TODO 4: 集成 Gemini SDK**
* 使用最新的 `google-genai` 客户端，封装 `analyze_syntax(text)` 函数。
* **开发点**: 编写 System Instruction，强制模型只解析复杂句，并严格输出 JSON 格式。


* [x] **TODO 5: Flask 路由设计**
* 创建 `/` 路由渲染首页，`/analyze` 路由接收 POST 请求并转发给 Gemini。



### 阶段三：前端界面与交互

* [x] **TODO 6: 响应式 UI 设计 (Tailwind)**
* 左侧/上方：`textarea` 输入区域。
* 右侧/下方：结果展示区域，支持卡片式列出每个句子的解析结果。


* [x] **TODO 7: JavaScript 异步渲染逻辑**
* 使用 `fetch` 发送请求。
* 循环 JSON 结果，根据 `analysis` 数组动态创建 `<span>` 标签，应用返回的颜色类名。



### 阶段四：优化与调试

* [x] **TODO 8: 简单句过滤逻辑**
* 在 Prompt 或 Python 后端逻辑中确保简单句（如 "I love apple"）不进行复杂拆解，仅显示难度。


* [x] **TODO 9: 错误处理**
* 处理 API Key 无效或网络连接超时的 UI 提示。


---

## 5. 关键代码参考

### 一键启动脚本 (`start.bat`)

```batch
@echo off
start "" http://127.0.0.1:5001
python app.py
pause

```

### 核心 Prompt 策略

> "你是一个专业的英语语言学家。请分析以下文本。对于每个句子：
> 1. 判断是否为复杂句（含有从句、非谓语动词短语、长介词短语等）。
> 2. 若是，将其拆分为逻辑片段，并根据成分指定 Tailwind 颜色类（主句用 text-slate-900，从句用 text-blue-600，状语用 text-green-600）。
> 3. 根据词汇和语法复杂度给出 CEFR 等级。
> 4. 仅输出 JSON。"