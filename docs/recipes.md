# 配方

做得好的图值得沉淀下来。每个配方写清楚：**它让听众看到什么**、什么时候用、最小写法。欢迎通过 PR 增加。

---

## 带游标的响应曲线

**看到什么**：同一个对象在参数连续变化时的行为，以及任意一点上的读数。

```html
<figure data-src="S2">
  <div id="resp" class="grow"></div>
</figure>
<script>
Kit.plot(document.getElementById('resp'), {
  x: { label: 'load  L / L₀', domain: [0, 1.2] },
  y: { label: 'error rate per operation', domain: [1e-6, 1], scale: 'log' },
  series: [{ name: 'baseline', color: Kit.css('--accent'), points: data }],
  bands: [{ x0: 0.15, x1: 0.9, color: Kit.css('--bad'), label: 'unsafe' }],
  cursor: { x: 0.5, onMove: x => readout(x) }
});
</script>
```

`Kit.plot` 缺坐标轴标注会直接抛错。图例可以点击开关每条曲线。

## 参数一变、排名交换的散点图

**看到什么**："没有固定的赢家"。拖动一个参数，几个方案在同一张图上的相对位置发生交换。

写法：滑块的 `input` 事件里重新算每个点，然后 `plot.update({series})`。让坐标轴范围固定不动，否则看不出点在移动。示例见 `decks/demo/deck.html` 的 `tradeoff` 页。

## 过程回放

**看到什么**：一个过程按时间展开；哪个阶段占了多少时间。

```js
Kit.player(controlsEl, {
  duration: 150, rate: 30,                       // 150 个模型时间单位，1× 时每秒走 30
  phases: [{ name: 'load', t0: 0, t1: 40 }, …],  // 画在进度条上，点击跳转
  speeds: [0.1, 0.25, 0.5, 1, 4],                // 要有真正慢的档位
  format: t => t.toFixed(1) + ' ms',
  draw: t => render(t)
});
Kit.panzoom(svgRoot, groupToTransform);           // 滚轮缩放、拖动、双击复原
```

要点：动画节奏和真实时间通常不成比例，把真实时间放在读数里；离开页面时播放器会自动暂停。

## 框选放大

**看到什么**：整体趋势和局部细节同时可见，并且知道局部在整体的哪里。

写法：主图上画虚线框，引线接到旁边的子图；子图有自己的坐标轴标注（对数坐标要写明）。子图的坐标范围就是虚线框的范围。

## 前后对比切换

**看到什么**：一个改动到底改了什么。

写法：`.seg` 分段按钮切换两种状态，**同一套坐标、同一个位置**，只让差异的部分变化。不要做成两张不相关的图的标签页。

## 点一个对象，看它怎么传播

**看到什么**：因果链。点表里的一行，图上对应的部分逐步高亮。

写法：表格的行和图上的元素共享 `data-key`；点击时给匹配的元素加 `.on` 类，用 CSS `transition-delay` 做逐层出现。

## 等材料的占位

```html
<div class="placeholder" data-placeholder="S5: raw scan data (jsonl)">
  waiting for S5 — raw scan data
</div>
```

占位会出现在自检报告的 `open` 里。只用于真正在等材料的位置，不用于"懒得画"。
