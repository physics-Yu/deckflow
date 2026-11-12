# deckflow

**和 AI 一起做技术汇报的工作流，产物是一份单文件 HTML 幻灯片。**

*A workflow, not a template, for building talks with an AI: fixed entry points and gates, a small machine-checked contract, and everything else left open. Output is one offline HTML file.*

它不是一套模板。模板解决"长什么样"，而做一份汇报真正花时间的地方是"讲什么""以哪份数据为准""这页到底讲清楚没有"。deckflow 把这些事排成固定的顺序，让人的判断发生在便宜的地方（一句话），而不是昂贵的地方（做完的十几页）。

打开 [`dist/demo.html`](dist/demo.html) 看一份用它自己做出来的 8 页示例（方向键翻页，`R` 看自检，`O` 看概览）。

## 它管什么，不管什么

```
 new / adapt / revise
        │
        ▼
 S0 立项 ─G0─▶ S1 取材 ─▶ S2 分镜 ─G1─▶ S3 搭建 ─▶ S4 自检 ─▶ S5 评审 ─G2─▶ S6 交付
 brief.md      sources.md  storyboard.md  deck.html   DeckReview   review.md      dist/*.html
                               ▲              ▲                        │
                               └ 要讲的不对 ──┴── 表现不对 ◀───────────┘
```

| | 固定的 | 开放的 |
|---|---|---|
| **流程** | 三个入口、七个阶段、三道由人把关的闸门 | 每个阶段里怎么做 |
| **产物** | 每个 deck 五个文件，页面用稳定 id 而不是页码 | 文件里写什么 |
| **页面** | 一小组可以被机器检查的硬规则（不溢出、字够大、坐标轴有标注、单文件） | 叙事、构图、画什么图、做什么交互、主题 |
| **协作** | AI 自己推的东西必须标出来；交付必须自检并如实报告 | AI 在表现层自己拿主意，人有否决权 |

规则分三层：**必须**（自检报 error）、**默认**（报 warn，可以在页面上写明理由豁免）、**自由**（不检查）。详见 [docs/contract.md](docs/contract.md)。

## 开始用

需要：一个能读写文件的 AI 编码助手（Claude Code、Cursor、Codex……），Python 3.7+，一个浏览器。没有别的依赖。

```bash
git clone https://github.com/physics-Yu/deckflow && cd deckflow
python tools/new.py my-talk
```

然后把对应入口的启动说明交给 AI：

| 你手上有什么 | 入口 | 说明 |
|---|---|---|
| 一个主题和一堆材料 | **new** | [entry/new.md](entry/new.md) |
| 一份报告、网页、旧 PPT，想改造成 deck | **adapt** | [entry/adapt.md](entry/adapt.md) |
| 一份已有的 deck，要逐页改 | **revise** | [entry/revise.md](entry/revise.md) |

在 Claude Code 里可以直接用 `/deck new my-talk`、`/deck adapt my-talk report.html`、`/deck revise my-talk`。其他助手会读 [AGENTS.md](AGENTS.md)。

做完后打包成单文件：

```bash
python tools/build.py decks/my-talk
```

得到 `dist/my-talk.html`：离线可用，可以直接发给别人；打印即 PDF。

## 你（人）要做的三件事

1. **确认 brief**：给谁讲、什么语言、标题什么风格、页面上不要什么。
2. **逐条批准分镜**：每页一句 `point`。这是整个流程里最值得花时间的地方。
3. **按页面 id 提意见**：打开 deck 按 `R`，每页左上角有它的 id。

其余的——画图、排版、交互、自检、列出"哪些是我推断的"——是 AI 的活。

## 仓库里有什么

```
docs/workflow.md    七个阶段、三道闸门、谁说了算
docs/contract.md    页面必须满足什么，三层规则
docs/design.md      设计原则，以及哪些地方可以自由发挥
docs/recipes.md     做得好的图的写法
docs/lessons.md     这些规则是从哪些失败里来的
AGENTS.md           给 AI 的操作协议
entry/              三个入口的启动说明
core/               运行时：缩放与导航、图表与回放组件、浏览器内自检
themes/             主题（只改颜色和字号变量）
templates/deck/     新 deck 的五个文件
tools/              new.py 新建，build.py 打包
decks/demo/         示例 deck 的全部五个文件
```

## 内核提供什么

- **固定舞台**：1920×1080，整体缩放；窄窗口自动改为纵向滚动；打印一页一张。
- **导航**：方向键、翻页笔、触摸滑动、`#id` 直达、`O` 概览、分步出现。拖滑块时不会误翻页。
- **`Kit.plot`**：折线/散点图，坐标轴标注是必填项，图例可点击开关，支持对数坐标、色带、参考线、可拖动游标。
- **`Kit.player`**：播放、倍速（含慢速档）、带阶段标记的进度条。
- **`Kit.panzoom`**：滚轮缩放、拖动、双击复原。
- **`DeckReview`**：在浏览器里检查契约，给人一个面板（`R`），给 AI 一份 JSON（`DeckReview.run()`）。

`Kit` 只是省事的工具，不是限制：任何手写的 SVG、Canvas、JavaScript 都可以直接用。

## 参与

欢迎的贡献：新的主题、新的配方（[docs/recipes.md](docs/recipes.md)）、`Kit` 里的新组件、让某个 AI 助手更容易接入的入口文件、你自己踩过的坑（[docs/lessons.md](docs/lessons.md)）。

想改"必须"一层的规则，请先开 issue：它会影响所有 deck。

## License

MIT
