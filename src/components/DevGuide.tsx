import React from 'react';
import { Button, Card } from './ui';
import { motion, AnimatePresence } from 'motion/react';

interface DevGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DevGuide({ isOpen, onClose }: DevGuideProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.9, rotate: 2 }}
            className="w-full max-w-3xl max-h-[80vh] overflow-y-auto"
          >
            <Card className="flex flex-col gap-6 border-4 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex justify-between items-center border-b-2 border-black pb-4">
                <h2 className="text-3xl font-black">🛠️ 开发者指南</h2>
                <Button onClick={onClose} variant="secondary">关闭</Button>
              </div>

              <div className="space-y-6 font-mono text-sm">
                <section>
                  <h3 className="text-xl font-bold bg-yellow-200 inline-block px-2 border-2 border-black mb-2 rotate-[-1deg]">
                    1. 如何修改规则
                  </h3>
                  <p className="mb-2">游戏逻辑位于 <code className="bg-gray-100 p-1 rounded">src/games/</code> 目录下。</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>打开 <code className="bg-gray-100 p-1 rounded">src/games/TicTacToe.ts</code> 或 <code className="bg-gray-100 p-1 rounded">Uno.ts</code>。</li>
                    <li>找到 <code className="bg-gray-100 p-1 rounded">makeMove</code> 函数。</li>
                    <li>添加或修改条件（例如：更改获胜连线方式，修改出牌验证逻辑）。</li>
                    <li>服务端是唯一的真理来源；客户端验证仅用于UI反馈。</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-xl font-bold bg-blue-200 inline-block px-2 border-2 border-black mb-2 rotate-[1deg]">
                    2. 如何添加新规则
                  </h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>状态定义：</strong> 在 <code className="bg-gray-100 p-1 rounded">src/games/Uno.ts</code> 中更新 <code className="bg-gray-100 p-1 rounded">GameState</code> 或特定的游戏数据类型（如 <code className="bg-gray-100 p-1 rounded">UnoData</code>），添加新字段（例如：<code className="bg-gray-100 p-1 rounded">allowStacking: boolean</code>）。</li>
                    <li><strong>逻辑实现：</strong> 在 <code className="bg-gray-100 p-1 rounded">makeMove</code> 中使用这些标志来改变行为。</li>
                    <li><strong>UI展示：</strong> 如果需要，将这些设置从 <code className="bg-gray-100 p-1 rounded">GameRoom</code> 传递给棋盘组件进行可视化。</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-xl font-bold bg-green-200 inline-block px-2 border-2 border-black mb-2 rotate-[-1deg]">
                    3. 如何添加新游戏
                  </h3>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li><strong>类型定义：</strong> 在 <code className="bg-gray-100 p-1 rounded">src/types.ts</code> 的 <code className="bg-gray-100 p-1 rounded">GameType</code> 中添加新游戏字符串。</li>
                    <li><strong>逻辑实现：</strong> 创建 <code className="bg-gray-100 p-1 rounded">src/games/NewGame.ts</code> 并实现 <code className="bg-gray-100 p-1 rounded">GameLogic</code> 接口。</li>
                    <li><strong>注册游戏：</strong> 在 <code className="bg-gray-100 p-1 rounded">server.ts</code> 中导入并将其添加到 <code className="bg-gray-100 p-1 rounded">games</code> 对象中。</li>
                    <li><strong>UI实现：</strong> 创建棋盘组件（例如 <code className="bg-gray-100 p-1 rounded">NewGameBoard.tsx</code>），并在 <code className="bg-gray-100 p-1 rounded">src/components/GameRoom.tsx</code> 的 switch case 中添加它。</li>
                  </ol>
                </section>

                <section>
                  <h3 className="text-xl font-bold bg-red-200 inline-block px-2 border-2 border-black mb-2 rotate-[1deg]">
                    4. 如何修改AI逻辑
                  </h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>进入游戏类文件（例如 <code className="bg-gray-100 p-1 rounded">src/games/TicTacToe.ts</code>）。</li>
                    <li>找到 <code className="bg-gray-100 p-1 rounded">getBotMove</code> 方法。</li>
                    <li>目前使用的是随机移动。你可以在这里实现 Minimax（用于井字棋）或启发式算法（用于UNO）。</li>
                    <li>当轮到机器人时，服务端会自动调用此方法。</li>
                  </ul>
                </section>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
