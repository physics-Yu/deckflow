# 契约：一份 deck 必须满足什么

规则分三层。层次本身就是设计：硬规则尽量少、全部可以被机器检查；其余要么是可以豁免的默认，要么完全放开。

| 层 | 含义 | 违反时 | 怎么改 |
|---|---|---|---|
| **必须** | 不满足就没法可靠地展示、评审或分享 | 自检报 `error` | 只能修 |
| **默认** | 多数汇报里是对的，但你可能有理由不这么做 | 自检报 `warn` | 修，或在页面上写 `data-allow="规则名"` 并说明理由 |
| **自由** | 叙事、构图、图怎么画、交互怎么做、主题 | 不检查 | 随意 |

自检在浏览器里运行（`core/review.js`）：按 `R` 看面板，或调用 `DeckReview.run()` 拿 JSON。

---

## 文档骨架

```html
<main class="deck" data-title-style="topic">
  <section class="slide" id="title" data-layout="title"> … </section>
  <section class="slide" id="tradeoff">
    <h2>Throughput vs. loss</h2>
    <div class="body"> … </div>
  </section>
</main>
```

- 舞台固定 1920×1080，运行时整体缩放。所有尺寸按舞台像素写，**24px 相当于 13.33 英寸幻灯片上的 12pt**。
- 窗口足够宽时翻页显示；窄于 720px 自动改为纵向滚动；打印时一页一张。
- `data-layout`：`title`（扉页）、`bare`（没有标题行，整页归图）、缺省（标题 + 正文）。

## 必须（error）

| 规则名 | 要求 | 为什么 |
|---|---|---|
| `id` | 每页有唯一的语义 id（`tradeoff`、`encoder`），不能是页码（`s3`、`page-5`） | 页码一改全乱；评审时"删 P5"删错页就是这么来的 |
| `title` | 每页有 `h2`（`bare` 页除外） | 概览和导航依赖它 |
| `overflow` | 没有任何元素超出舞台或被裁掉 | 缩放后溢出的内容直接消失 |
| `font` | 任何文字的有效字号不低于 20px，**包括 SVG 里的文字** | 投影后看不见的字等于没有 |
| `axes` | 图表有 x 轴和 y 轴标注（`data-role="xlabel"` / `"ylabel"`），写明含义和单位 | 听众不该猜坐标轴是什么 |
| `portable` | 没有 `iframe`，没有外链资源 | 托管平台会把 iframe 和跨文件请求拦掉；单文件才发得出去 |
| `runtime` | 页面没有 JavaScript 报错 | — |

## 默认（warn，可用 `data-allow` 豁免）

| 规则名 | 默认 | 典型的豁免理由 |
|---|---|---|
| `font` | 文字不低于 24px | 密集的参考表 |
| `words` | 每页正文不超过 45 词（中文两字计一词），没有超过 28 词的解释性段落 | 引用原文 |
| `visual` | 每页至少有一样可看的东西（图、表、卡片、大数字） | 过渡页 |
| `title` | `topic` 风格标题不超过 9 词；`claim` 风格不超过 22 词 | — |
| `legend` | 图表有图例（`data-role="legend"`）；单条曲线写 `data-single-series` | — |
| `provenance` | 每个 `<figure>` 有 `data-src="S3"`（对应 sources.md），或 `data-kind="schematic"` | — |
| `interactive` | 表单控件放在 `[data-interactive]` 容器里 | — |

豁免写法：`<section class="slide" id="ref-table" data-allow="font words">`。豁免会出现在自检报告的 `waived` 里，不会被藏起来。

## 待办标记（open，不算缺陷）

这三个属性让"还欠什么"自动出现在报告里，而不是靠人记得：

| 属性 | 用在哪 |
|---|---|
| `data-placeholder="等什么"` | 材料还没到的位置。配合 `.placeholder` 样式显示成虚线框 |
| `data-derived="怎么推出来的"` | AI 自己算、拟合、从图上读出来的数值或结论 |
| `data-unverified="为什么没核实"` | 凭已有知识写的引用、没对回原文的说法 |

## 交互约定

- 演示者要操作的区域加 `data-interactive`：触摸滑动翻页会避开它。
- 需要自己处理方向键的图加 `data-keys="local"`：焦点在里面时方向键不翻页，`Esc` 退出。
- `PageDown` / `PageUp`（翻页笔发的键）永远翻页。
- 动画在 `deck:enter` 时开始、`deck:leave` 时停：`section.addEventListener('deck:enter', fn)`。
- 分步出现：`data-step="1"`、`data-step="2"`…

## 键位

`←` `→` `空格` 翻页 · `Home` `End` 首末页 · `O` 概览 · `F` 全屏 · `R` 自检面板 · `Esc` 退出焦点

## 公式

用 Unicode（x/x₀、∝、⁻¹）或 MathML。不依赖运行时公式库：它们要么需要联网，要么在单文件里体积很大，而且是公式显示出错的主要来源。

## 主题

主题只改 `:root` 里的颜色和字号变量，不碰布局。见 `themes/ink.css`。
