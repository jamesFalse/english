# Gemini.md: English Logic Flow Analyzer

## 1. 项目概述

构建一个基于 Web 的英语学习工具，专注于解析长难句的**母语者阅读逻辑**。工具不再仅仅标注主宾谓，而是展示 Native Speaker 如何在阅读时建立“心理预期”并处理“逻辑钩子”。

## 2. 技术栈

* **后端**: Python 3.10+, Flask
* **前端**: HTML5, Tailwind CSS (CDN), JavaScript (用于 Tab 切换与异步渲染)
* **AI**: `google-genai` (模型: `gemini-3-flash-preview`)
* **部署**: Windows `.bat` 一键启动

## 3. 核心 Prompt 与数据结构 (API Logic)

为了驱动双 Tab 界面，Gemini 必须返回包含“心理路径”和“颜色编码”的结构化 JSON：

```json
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

```

## 4. 任务任务拆解 (TODO List)

### 阶段一：环境准备与基础架构

* [x] **TODO 1: 初始化项目目录**
* [x] **TODO 2: 依赖管理**
* [x] **TODO 3: 编写一键启动脚本 `start.bat**`

### 阶段二：后端与 Prompt 工程 (核心变更)

* [x] **TODO 4: 编写“母语者思维”系统指令**
* **开发点**: 要求模型模拟线性阅读过程。识别倒装、插入语、对比结构等。
* **开发点**: 强制模型对“逻辑对等项”指定统一风格的颜色或前缀。


* [x] **TODO 5: Flask 路由设计**
* 保持 `/analyze` 接口，确保能稳定解析并返回嵌套的 `chunks`结构。



### 阶段三：前端“双 Tab”交互开发

* [x] **TODO 6: 响应式 UI 布局 (左右布局)**
* 左侧：输入框 + 提交按钮。
* 右侧：结果面板，顶部为 Tab 切换按钮（Logic Flow / Visual Map）。


* [x] **TODO 7: 实现 Tab 1 - 逻辑流卡片 (The Debugger)**
* 遍历 `chunks`，生成垂直排列的卡片。
* 每张卡片包含 `text`、`logic_tag` 标签和 `mental_note` 解释。


* [x] **TODO 8: 实现 Tab 2 - 视觉高亮 (The Syntax Map)**
* 将 `chunks` 拼接回完整句子，但每个部分包裹在带有 `color_class` 的 `<span>` 中。
* **优化点**: 实现 **Hover 联动**。鼠标悬停在 `<span>` 上时，显示该部分的 `mental_note` 浮窗。



### 阶段四：针对长难句的细节优化

* [x] **TODO 9: 逻辑连线优化**
* 针对成对出现的逻辑词（如 `not... but...`），在 UI 上使用相同的边框色或特殊的加粗处理以示关联。


* [x] **TODO 10: 错误处理与加载态**
* 增加解析时的 Loading 动画（建议使用 Tailwind 的 `animate-pulse`）。



---

## 5. 关键 Prompt 策略参考 (针对新需求)

> "你是一个认知语言学家。请分析用户提供的英语文本。
> 对于每一个句子，请模拟母语者的线性阅读过程，将其拆解为多个语块（Chunks）。
> **解析规则：**
> 1. **线性预期**：解释母语者看到这个语块时，潜意识在等待什么。
> 2. **逻辑定位**：识别语块的功能（背景铺垫、核心谓语、补充说明、逻辑转折）。
> 3. **视觉编码**：为不同功能的语块指定 Tailwind 颜色类。
> 4. **难度判断**：为解析的句子判断 CEFR 等级。
> 
> **仅输出 JSON 格式。**"