# Storyboard · demo

**主线（一句话）**：流程固定判断发生的位置，契约固定能被机器检查的东西，其余全部开放。

---

## title · built
- point:    题目和日期
- visual:   三张叠放的幻灯片，最前面一张上有两条交叉的曲线
- source:   schematic
- interact: —
- comment:

## loop · built
- point:    七个阶段、三道闸门；评审意见按"要讲的不对 / 表现不对"回到不同的阶段
- visual:   横向流程图：七个节点，三个闸门菱形，两条从 Review 出发的虚线回路
- source:   S1
- interact: 点一个阶段，下方显示它的产物、AI 做什么、人做什么
- comment:

## layers · built
- point:    硬规则很少而且能被机器检查，其余空间是开放的
- visual:   三层嵌套的框：MUST 在最里面，DEFAULT 包着它，FREE 是最外面的大片空白
- source:   S1
- interact: —
- comment:

## one-point · built
- point:    分镜里的一句 point 决定一页长什么样；同样的内容可以做成讲稿，也可以做成一张图
- visual:   左边是分镜条目，右边是一张缩略幻灯片，可以在两种做法之间切换
- source:   schematic
- interact: 切换"写来读的"和"做来讲的"
- comment:

## tradeoff · built
- point:    演示 Kit.plot：拖一个参数，两个方案的排名交换
- visual:   散点图。x = 每轮损失 (%)，y = 每秒轮数（对数）；两个方案各 4 个点
- source:   S2（玩具模型）
- interact: 读出时间滑块；右侧显示当前最快和损失最低的方案
- comment:

## replay · built
- point:    演示 Kit.player 和 Kit.panzoom：过程回放要有慢速档、阶段条、缩放
- visual:   两个区域之间搬运 12 个对象，分两批
- source:   schematic
- interact: 播放、倍速、点进度条跳转、滚轮缩放、拖动
- comment:

## review · built
- point:    deck 自己检查自己，并把"还欠什么"列出来
- visual:   左边四种标记，右边是对这份 deck 实时运行自检的结果
- source:   S1
- interact: 按钮重新运行自检
- comment:

## start · built
- point:    三个入口
- visual:   三张卡片，各配一个小图标和启动命令
- source:   S1
- interact: —
- comment:
