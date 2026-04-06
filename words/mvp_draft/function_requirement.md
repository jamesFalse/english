# AI-Powered English Reading Tool
## 概览
- 通过经过处理的`oxford_5000_filtered.json`作为英语单词学习的一个开始的材料，使用Gemini API进行故事生成，帮助我自己更好的通过故事理解，记忆英语单词
## 功能要求
### 主要功能
- 从`oxford_5000_filtered.json`随机选择一组（30个）英语词汇并展示：
    1. 给出针对Basic (A1-A2), Independent (B1-B2), and Proficient (C1-C2)三个大等级的数字输入框，数字保留整数，Basic 默认10, Independent默认70, Proficient默认20，单位为百分比。
    2. 给出一个整数的数字输入框，根据第一步给出的百分比，从`oxford_5000_filtered.json`中随机抽取数字框对应数值的英文单词，数字框默认值30
    3. 将对应的单词在一行中，按照CEFR用颜色标记展示，鼠标悬浮到单词上方后展示对应的英文解释和CEFR等级
- 对抽取到的一组英语词汇，使用Geimini API生成故事：
    1. 给出一个阅读难度的下拉选择，可选择Basic，Independent，Proficient，默认Independent
    2. 给出对应故事文本长度的下拉选择，可选择200，500，700，默认500
    3. 根据阅读难度，故事文本长度，抽取到的英语词汇，生成故事，在生成的故事中高亮对应的英语词汇
        - 由于AI可能给出对应词汇的不同形态，所以在AI生成故事是直接要求AI对单词高亮
    4. 在生成的故事的文本框中增加一个字数标记，文本框不可编辑，但是可以复制。
- 标记记忆过的单词
    - 在`oxford_5000_filtered.json`中针对每个单词,增加一个新的属性`remember`,初始值为0
    - 增加一个"remember"的multiply choice标签选择,选择完后点击`remember +1`,更新对应单词的`remember`属性
        - 如果一个单词在`oxford_5000_filtered.json`中存在复数个对应,对所有的对应单词都+1
    - 找个地方展示学习过的单词数量
    - 将对应的单词在一行中，按照CEFR用颜色标记展示，鼠标悬浮到单词上方后展示对应的英文解释和CEFR等级,remember的值
