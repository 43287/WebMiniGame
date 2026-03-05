# 游戏平台通用模块化与扑克扩展计划

本计划旨在通过重构现有架构，提取跨游戏的通用模块（逻辑与UI），并以此为基础快速实现“扑克（Poker）”游戏及其变种（斗地主、炸金花）。核心目标是最大化代码复用，同时确保**涂鸦风格（Doodle Style）**的视觉一致性，并实现**规则配置的深度模块化**。

## 核心理念：平台级模块化 (Platform-Level Modularity)
我们将从“特定游戏实现”转向“通用游戏引擎”模式，将以下内容抽离为公共模块：
1.  **逻辑层**：回合管理、牌堆操作、玩家轮转。
2.  **UI层**：保持涂鸦风格的牌桌布局、手牌管理容器、玩家状态展示。
3.  **规则层**：元数据驱动的规则定义（含人数限制、Bot支持、自定义选项）。

## 阶段一：提取通用逻辑与工具 (`src/games/common`)

### 1.1 通用回合管理 (`src/games/common/turnUtils.ts`)
*   从 `uno/utils.ts` 中提取 `getNextPlayerIndex`，支持顺/逆时针。
*   新增 `TurnManager` 类，封装跳过(Skip)、反转(Reverse)等常见逻辑。

### 1.2 通用牌堆工具 (`src/games/common/deckUtils.ts`)
*   实现泛型 `shuffle<T>(deck: T[])`。
*   实现泛型 `deal<T>(deck: T[], count: number)`。
*   实现 `draw<T>(deck: T[], discardPile: T[])` (包含洗切弃牌堆逻辑)。

### 1.3 基础类型定义 (`src/games/common/types.ts`)
*   定义 `BaseCard` 接口（id, type, value 等基础属性）。
*   定义 `BasePlayer` 接口扩展。

## 阶段二：构建通用 UI 组件库 (保持涂鸦风格)

### 2.1 响应式手牌容器 (`HandLayout.tsx`)
*   **风格保持**：复用 UNO 的 `motion` 动画和阴影效果。
*   **功能**：接收任意组件列表，自动计算重叠度(Overlap)、旋转角度和缩放。
*   **复用点**：提取 UNO 的 `Board.tsx` 中计算 `visibleWidth` 和 `scale` 的核心算法。
*   **API**: `<HandLayout cards={[]} renderCard={(card) => <CardView card={card} />} />`

### 2.2 标准牌桌布局 (`TableLayout.tsx`)
*   **风格保持**：保持绿色背景、粗边框、硬阴影的视觉风格。
*   **功能**：提供一个标准的 2-10 人圆桌/方桌布局。
*   **区域**：
    *   `Center`: 公共牌/弃牌堆区域。
    *   `Players`: 自动根据玩家数量将头像分布在四周（Top, Left, Right, Bottom）。
    *   `MyHand`: 底部固定区域，用于放置 `HandLayout`。

### 2.3 通用玩家头像 (`PlayerAvatar.tsx`)
*   **风格保持**：统一使用白色背景、黑色粗边框、圆形/方形头像。
*   **功能**：显示头像、倒计时、状态（准备/托管）、聊天气泡。

## 阶段三：规则模块化架构 (`src/games/poker/rules`)

### 3.1 规则定义接口 (`GameRuleDefinition`)
不仅仅是逻辑，还包括元数据：
```typescript
interface GameRuleDefinition {
    meta: {
        id: string;
        name: string;
        minPlayers: number; // 如斗地主固定3人
        maxPlayers: number; // 如炸金花2-10人
        allowBots: boolean; // 是否允许AI
        settingsSchema: any; // 自定义设置（如：底分、封顶）
    };
    createLogic(settings: any): GameLogic; // 工厂方法
}
```

### 3.2 规则实现
*   **炸金花 (ZhaJinhuaRule)**:
    *   `meta`: min=2, max=5, allowBots=true。
    *   `logic`: 继承通用回合逻辑，实现下注/比牌。
*   **斗地主 (DouDizhuRule)**:
    *   `meta`: min=3, max=3, allowBots=true。
    *   `logic`: 继承通用发牌逻辑，实现叫地主/出牌。

## 阶段四：扑克游戏实现与集成

### 4.1 扑克基础 (`src/games/poker`)
*   **数据结构**: 定义 `PokerCard` (继承 `BaseCard`)。
*   **UI组件**: 实现 `PokerCard` (仅负责渲染单张扑克，复用通用阴影/圆角样式)。

### 4.2 动态配置面板
*   修改 `GameSettingsPanel`，根据选中的规则（如从斗地主切换到炸金花），动态更新人数限制滑块和自定义选项。

## 待办事项 (Todo List)
- [ ] **Common Logic**: 创建 `src/games/common` 并提取 `turnUtils`, `deckUtils`。
- [ ] **Common UI**: 提取并封装 `HandLayout` (确保样式一致)。
- [ ] **Common UI**: 封装 `TableLayout` 和 `PlayerAvatar` (确保样式一致)。
- [ ] **Poker Base**: 定义 `PokerCard` 类型与组件。
- [ ] **Rule Arch**: 定义 `GameRuleDefinition` 接口。
- [ ] **Poker Rules**: 实现 `DouDizhu` 和 `ZhaJinhua` 的 `Definition` (含元数据和逻辑骨架)。
- [ ] **Registry**: 注册游戏，并验证设置面板是否根据规则动态变化。
