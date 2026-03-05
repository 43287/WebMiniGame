# 项目重构与优化计划

本计划旨在解决代码审查中发现的安全性、效率和模块化问题。

## 目标

1.  **安全性 (Security)**: 修复全量状态广播导致的手牌泄露问题（实现状态脱敏）。
2.  **效率 (Efficiency)**:
    *   使用 `immer` 优化游戏状态的不可变更新，替代昂贵的深拷贝。
    *   优化服务端玩家查找算法，从 O(N) 降低到 O(1)。
3.  **模块化 (Modularity)**: 拆分 UI 组件，提高代码可维护性。
4.  **质量保障**: 添加单元测试框架 `vitest` 并编写测试用例。

## 实施步骤

### 第一阶段：依赖与环境准备

1.  **添加依赖**
    *   安装 `immer` (用于高效的状态管理)。
    *   安装 `vitest` (用于单元测试)。
    *   在 `package.json` 中添加测试脚本 `"test": "vitest"`。

### 第二阶段：安全性修复 (Security)

2.  **定义脱敏接口**
    *   修改 `src/games/GameInterface.ts`，在 `GameLogic` 接口中添加 `maskState?(state: GameState, playerId: string): GameState` 方法。

3.  **实现 Uno 状态脱敏**
    *   修改 `src/games/uno/logic.ts`，实现 `maskState` 方法。
    *   逻辑：保留当前玩家的手牌，将其他玩家的手牌替换为仅包含数量信息的占位符（例如：`{ id: 'unknown', type: 'unknown', color: 'black', value: 0 }`），防止前端通过抓包获取对手手牌。

4.  **服务端广播改造**
    *   修改 `server.ts` 中的状态广播逻辑。
    *   不再使用 `io.to(roomId).emit('gameStateUpdated', ...)` 群发。
    *   改为遍历房间内的每个玩家，调用 `gameLogic.maskState(state, player.id)` 获取脱敏后的状态，然后通过 `io.to(player.socketId).emit(...)` 单独发送。

### 第三阶段：效率优化 (Efficiency)

5.  **服务端查找优化**
    *   在 `server.ts` 中引入全局映射 `const socketToRoom = new Map<string, string>();`。
    *   在 `createRoom`, `joinRoom`, `rejoinRoom` 时记录 `socket.id -> roomId` 的映射。
    *   在 `disconnect`, `leaveRoom` 时移除映射。
    *   重构 `findPlayerBySocketId` 函数，利用 `socketToRoom` 映射直接获取 `roomId`，从而避免遍历所有房间。

6.  **Uno 逻辑重构 (Immer)**
    *   修改 `src/games/uno/logic.ts`。
    *   引入 `import { produce } from 'immer';`。
    *   重构 `makeMove` 方法：
        *   移除 `JSON.parse(JSON.stringify(state))`。
        *   使用 `produce(state, draft => { ... })` 包裹逻辑。
        *   将所有对 `newState` 的修改改为对 `draft` 的修改。

### 第四阶段：模块化重构 (Modularity)

7.  **UI 组件拆分**
    *   创建新文件 `src/games/uno/ui/UnoCard.tsx`。
    *   将 `src/games/uno/ui/Board.tsx` 中的 `UnoCard` 组件代码移动到新文件中。
    *   在 `Board.tsx` 中导入并使用 `UnoCard`。

### 第五阶段：单元测试 (Testing)

8.  **编写测试用例**
    *   创建 `src/games/uno/logic.test.ts`。
    *   **测试安全性**: 验证 `maskState` 是否正确隐藏了对手的手牌信息。
    *   **测试逻辑正确性**: 验证使用 `immer` 重构后的 `makeMove` 逻辑是否依然正确（如：正常出牌、摸牌、Uno 规则等）。
    *   运行测试并确保通过。

## 验证计划

-   **单元测试**: 运行 `npm test` 确保所有新编写的测试用例通过。
-   **手动验证**: 启动服务器，模拟两个玩家进行 Uno 游戏，验证游戏流程是否正常，检查浏览器网络请求确认接收到的状态数据是否已脱敏。
