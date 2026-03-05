# 游戏大厅项目文档 (Game Lobby Project Documentation)

本项目是一个基于 React + Express + Socket.IO 的实时多人游戏大厅，目前包含井字棋 (Tic-Tac-Toe) 和 UNO 游戏。

## 1. 项目架构 (Project Architecture)

本项目采用前后端分离的架构，但在开发环境中通过 Vite 中间件集成在同一个 Express 服务中。

*   **前端 (Frontend)**:
    *   **框架**: React 19 + Vite
    *   **样式**: Tailwind CSS v4 (使用 `@import "tailwindcss";` 方式)
    *   **动画**: Motion (framer-motion 的继任者)
    *   **图标**: Lucide React
    *   **通信**: Socket.IO Client
    *   **主要目录**: `src/components` (UI组件), `src/games` (游戏逻辑接口与实现)

*   **后端 (Backend)**:
    *   **框架**: Express
    *   **通信**: Socket.IO Server
    *   **主要文件**: `server.ts` (处理连接、房间管理、游戏状态同步)

## 2. 快速开始 (Quick Start)

### 前置要求
*   Node.js (建议 v18+)
*   npm

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```
服务器默认运行在 `http://localhost:3000`。

## 3. 如何游玩 (How to Play)

1.  启动服务器后，在浏览器打开 `http://localhost:3000`。
2.  输入昵称，点击“创建房间”。
3.  复制房间号（或直接在另一个标签页打开 `http://localhost:3000` 并输入房间号加入）。
4.  房主可以在大厅选择游戏（如 UNO 或 井字棋）。
5.  房主可以调整游戏规则（如开启“抢牌”规则）。
6.  点击“开始游戏”即可游玩。
7.  游戏过程中可以点击自己的头像发送快捷聊天消息。

## 4. 开发指南 (Development Guide)

### 4.1 如何添加新游戏 (Add New Game)

1.  **定义游戏类型**: 在 `src/types.ts` 中的 `GameType` 联合类型中添加新游戏的字符串标识（例如 `'chess'`）。
2.  **实现游戏逻辑**:
    *   在 `src/games/` 目录下创建新文件（例如 `Chess.ts`）。
    *   实现 `GameLogic` 接口（定义在 `src/games/GameInterface.ts`）。
    *   主要方法：
        *   `init(players, settings)`: 初始化游戏状态。
        *   `makeMove(state, playerId, move)`: 处理玩家移动，返回新状态。
        *   `checkWin(state)`: 检查胜利条件。
        *   `getBotMove(state, botId)`: (可选) 实现 AI 逻辑。
3.  **注册游戏**: 在 `server.ts` 中的 `games` 对象中注册新游戏实例。
4.  **添加 UI 组件**:
    *   在 `src/components/` 下创建游戏面板组件（例如 `ChessBoard.tsx`）。
    *   在 `src/components/GameRoom.tsx` 中引入并根据 `gameType` 渲染该组件。

### 4.2 如何添加/修改规则 (Add/Modify Rules)

1.  **修改类型定义**: 在 `src/types.ts` 中找到对应游戏的设置接口（例如 `UnoSettings`），添加新的布尔值字段。
2.  **更新 UI**: 在 `src/components/GameSettingsPanel.tsx` 中添加对应的 `SettingToggle` 开关。
3.  **更新逻辑**: 在对应的游戏逻辑文件（例如 `src/games/Uno.ts`）的 `init` 或 `makeMove` 方法中，读取 `settings` 中的新字段并应用逻辑。

### 4.3 如何添加子规则 (Add Sub-Rules)

子规则是指依赖于父规则的选项（例如：只有开启“抢牌”才能开启“同色抢牌”）。

1.  **UI 实现**:
    *   在 `src/components/GameSettingsPanel.tsx` 中，使用缩进（`ml-6`）来视觉上区分。
    *   在 `onChange` 事件中处理依赖关系：
        *   开启子规则时，自动开启父规则。
        *   关闭父规则时，自动关闭子规则。
    *   示例代码参考 `GameSettingsPanel.tsx` 中的 `sameColorJumpIn` 实现。

### 4.4 如何添加 AI (Add AI)

1.  在游戏逻辑类（例如 `src/games/Uno.ts`）中实现 `getBotMove(state, botId)` 方法。
2.  该方法应分析当前 `state`，并返回一个合法的 `move` 对象。
3.  后端 `server.ts` 会在检测到当前是机器人回合时自动调用此方法，并执行移动。

## 5. 项目结构优化建议 (Optimization)

*   **组件拆分**: `GameRoom.tsx` 包含了房间管理、聊天、游戏渲染等多个职责，未来可考虑将聊天模块、玩家列表模块拆分为独立组件。
*   **类型共享**: 前后端完全共享 `src/types.ts`，确保了类型安全。
*   **样式管理**: 使用 Tailwind CSS 极大简化了样式代码，建议继续保持，避免引入额外的 CSS 文件。

## 6. 常见问题 (FAQ)

*   **Q: 为什么修改代码后需要刷新页面？**
    *   A: 本项目配置了 HMR (热更新)，但在某些状态丢失的情况下（如 socket 断开），可能需要手动刷新。
*   **Q: 如何修改聊天气泡的位置？**
    *   A: 聊天气泡使用了 React Portal 渲染在 `body` 层级，位置计算逻辑在 `src/components/GameRoom.tsx` 的 `ChatBubble` 组件中，通过 `getBoundingClientRect` 动态计算。

---
*文档生成时间: 2026-03-02*
