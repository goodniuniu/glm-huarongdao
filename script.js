const GRID_SIZE = 80;
const MOBILE_GRID_SIZE = 70; // Mobile will use smaller grid but more of the screen

// 获取当前设备的基础网格大小
function getCurrentGridSize() {
    if (window.innerWidth <= 320) {
        return 60; // 超小屏幕 (iPhone SE)
    } else if (window.innerWidth <= 480) {
        return MOBILE_GRID_SIZE; // 标准移动设备
    }
    return GRID_SIZE; // 桌面
}
const BOARD_WIDTH = 4;
const BOARD_HEIGHT = 5;

let gameState = {
    blocks: [
        // 曹操 (2x2)
        { id: 'caocao', type: 'cao-cao', name: '曹操', x: 1, y: 0, width: 2, height: 2, color: '#e74c3c' },

        // 武将们
        { id: 'zhangfei', type: 'general', name: '张飞', x: 0, y: 0, width: 1, height: 2, color: '#3498db' },
        { id: 'zhaoyun', type: 'general', name: '赵云', x: 3, y: 0, width: 1, height: 2, color: '#3498db' },
        { id: 'machao', type: 'general', name: '马超', x: 0, y: 2, width: 1, height: 2, color: '#3498db' },
        { id: 'huangzhong', type: 'general', name: '黄忠', x: 3, y: 2, width: 1, height: 2, color: '#3498db' },
        { id: 'guanyu', type: 'horizontal-general', name: '关羽', x: 1, y: 2, width: 2, height: 1, color: '#9b59b6' },

        // 小兵们
        { id: 'soldier1', type: 'soldier', name: '兵', x: 0, y: 4, width: 1, height: 1, color: '#2ecc71' },
        { id: 'soldier2', type: 'soldier', name: '兵', x: 1, y: 3, width: 1, height: 1, color: '#2ecc71' },
        { id: 'soldier3', type: 'soldier', name: '兵', x: 2, y: 3, width: 1, height: 1, color: '#2ecc71' },
        { id: 'soldier4', type: 'soldier', name: '兵', x: 3, y: 4, width: 1, height: 1, color: '#2ecc71' }
    ],
    selectedBlock: null,
    moves: 0,
    history: [], // 存储历史状态
    isAutoSolving: false, // 是否正在自动求解
    autoSolveTimeout: null // 自动求解定时器
};

function isPositionOccupied(x, y, excludeBlockId = null, blocks = gameState.blocks) {
    return blocks.some(block =>
        block.id !== excludeBlockId &&
        x >= block.x &&
        x < block.x + block.width &&
        y >= block.y &&
        y < block.y + block.height
    );
}

function canMoveTo(block, newX, newY, blocks = gameState.blocks) {
    // 检查边界
    if (newX < 0 || newY < 0 ||
        newX + block.width > BOARD_WIDTH ||
        newY + block.height > BOARD_HEIGHT) {
        return false;
    }

    // 检查目标位置是否被占用
    for (let x = newX; x < newX + block.width; x++) {
        for (let y = newY; y < newY + block.height; y++) {
            // 注意：这里传入了 blocks
            if (isPositionOccupied(x, y, block.id, blocks)) {
                return false;
            }
        }
    }

    return true;
}

function getPossibleMoves(block) {
    const moves = [];
    const directions = [
        { dx: 0, dy: -1, direction: 'up' },
        { dx: 0, dy: 1, direction: 'down' },
        { dx: -1, dy: 0, direction: 'left' },
        { dx: 1, dy: 0, direction: 'right' }
    ];

    for (const { dx, dy, direction } of directions) {
        const newX = block.x + dx;
        const newY = block.y + dy;

        if (canMoveTo(block, newX, newY)) {
            moves.push({ x: newX, y: newY, direction });
        }
    }

    return moves;
}

function saveHistory() {
    // 深拷贝当前状态到历史记录
    gameState.history.push({
        blocks: JSON.parse(JSON.stringify(gameState.blocks)),
        selectedBlock: gameState.selectedBlock,
        moves: gameState.moves
    });

    // 限制历史记录长度，避免内存过大
    if (gameState.history.length > 100) {
        gameState.history.shift();
    }
}

function moveBlock(block, direction) {
    const moves = getPossibleMoves(block);
    const move = moves.find(m => m.direction === direction);

    if (move) {
        // 保存历史状态
        saveHistory();

        // 执行移动
        const oldX = block.x;
        const oldY = block.y;
        block.x = move.x;
        block.y = move.y;
        gameState.moves++;

        updateMovesDisplay();
        render();
        checkVictory();
        return true;
    }

    return false;
}

function handleBlockClick(blockId) {
    const block = gameState.blocks.find(b => b.id === blockId);

    if (gameState.selectedBlock === blockId) {
        // 如果点击已选中的块，尝试四个方向移动
        const directions = ['up', 'down', 'left', 'right'];
        for (const direction of directions) {
            if (moveBlock(block, direction)) {
                break;
            }
        }
        gameState.selectedBlock = null;
    } else {
        // 选中新块
        gameState.selectedBlock = blockId;
        render();
    }
}

function handleKeyPress(e) {
    // 检查全局撤销快捷键 (Ctrl+Z / Cmd+Z)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
        return;
    }

    // 检查是否有选中的滑块
    if (!gameState.selectedBlock) return;

    const block = gameState.blocks.find(b => b.id === gameState.selectedBlock);
    if (!block) return;

    const directionMap = {
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right'
    };

    const direction = directionMap[e.key];
    if (direction) {
        e.preventDefault();
        if (moveBlock(block, direction)) {
            gameState.selectedBlock = null;
        }
    }
}

function render() {
    const board = document.getElementById('gameBoard');
    board.innerHTML = '';

    const currentGridSize = getCurrentGridSize();

    // 动态设置棋盘大小
    const boardWidth = BOARD_WIDTH * currentGridSize;
    const boardHeight = BOARD_HEIGHT * currentGridSize;
    board.style.width = `${boardWidth}px`;
    board.style.height = `${boardHeight}px`;

    // 移动端使用更小的间距
    const blockGap = window.innerWidth <= 480 ? 6 : 10;

    gameState.blocks.forEach(block => {
        const blockElement = document.createElement('div');
        blockElement.className = `block ${block.type}`;
        blockElement.setAttribute('data-block-id', block.id);
        blockElement.style.left = `${block.x * currentGridSize}px`;
        blockElement.style.top = `${block.y * currentGridSize}px`;
        blockElement.style.width = `${block.width * currentGridSize - blockGap}px`;
        blockElement.style.height = `${block.height * currentGridSize - blockGap}px`;
        blockElement.style.background = `linear-gradient(135deg, ${block.color}, ${adjustColor(block.color, -20)})`;
        blockElement.textContent = block.name;
        blockElement.onclick = () => handleBlockClick(block.id);

        if (gameState.selectedBlock === block.id) {
            blockElement.classList.add('selected');
        }

        board.appendChild(blockElement);
    });
}

function adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function checkVictory() {
    const caocao = gameState.blocks.find(b => b.id === 'caocao');
    if (caocao.x === 1 && caocao.y === 3) {
        setTimeout(() => {
            document.getElementById('finalMoves').textContent = gameState.moves;
            document.getElementById('victoryModal').style.display = 'flex';
        }, 300);
    }
}

function updateMovesDisplay() {
    document.getElementById('moves').textContent = gameState.moves;
    updateUndoButton(); // 同时更新撤销按钮状态
}

function resetGame() {
    // 停止自动求解
    if (gameState.isAutoSolving) {
        stopAutoSolve();
    }

    gameState.moves = 0;
    gameState.selectedBlock = null;
    gameState.history = []; // 清空历史记录
    gameState.blocks = [
        { id: 'caocao', type: 'cao-cao', name: '曹操', x: 1, y: 0, width: 2, height: 2, color: '#e74c3c' },
        { id: 'zhangfei', type: 'general', name: '张飞', x: 0, y: 0, width: 1, height: 2, color: '#3498db' },
        { id: 'zhaoyun', type: 'general', name: '赵云', x: 3, y: 0, width: 1, height: 2, color: '#3498db' },
        { id: 'machao', type: 'general', name: '马超', x: 0, y: 2, width: 1, height: 2, color: '#3498db' },
        { id: 'huangzhong', type: 'general', name: '黄忠', x: 3, y: 2, width: 1, height: 2, color: '#3498db' },
        { id: 'guanyu', type: 'horizontal-general', name: '关羽', x: 1, y: 2, width: 2, height: 1, color: '#9b59b6' },
        { id: 'soldier1', type: 'soldier', name: '兵', x: 0, y: 4, width: 1, height: 1, color: '#2ecc71' },
        { id: 'soldier2', type: 'soldier', name: '兵', x: 1, y: 3, width: 1, height: 1, color: '#2ecc71' },
        { id: 'soldier3', type: 'soldier', name: '兵', x: 2, y: 3, width: 1, height: 1, color: '#2ecc71' },
        { id: 'soldier4', type: 'soldier', name: '兵', x: 3, y: 4, width: 1, height: 1, color: '#2ecc71' }
    ];
    document.getElementById('victoryModal').style.display = 'none';
    updateMovesDisplay();
    updateUndoButton();
    render();
}

function undo() {
    if (gameState.history.length === 0) {
        alert('没有可以撤销的步骤！');
        return;
    }

    // 恢复上一个历史状态
    const previousState = gameState.history.pop();
    gameState.blocks = previousState.blocks;
    gameState.selectedBlock = previousState.selectedBlock;
    gameState.moves = previousState.moves;

    updateMovesDisplay();
    updateUndoButton();
    render();
}

function updateUndoButton() {
    const undoButton = document.getElementById('undoButton');
    if (undoButton) {
        undoButton.disabled = gameState.history.length === 0;
        undoButton.style.opacity = gameState.history.length === 0 ? '0.5' : '1';
    }
}

function stateToString(blocks) {
    // 将滑块状态序列化为规范化字符串键，解决状态爆炸问题
    // 使用 block.type + 坐标，而不是 block.id，将同类棋子视为等效
    return blocks
        .map(block => `${block.type}:${block.x},${block.y}`)
        .sort()
        .join('|');
}

function deepCopyBlocks(blocks) {
    return JSON.parse(JSON.stringify(blocks));
}

function isVictoryState(blocks) {
    const caocao = blocks.find(b => b.id === 'caocao');
    return caocao.x === 1 && caocao.y === 3;
}

function generateMoves(blocks) {
    const moves = [];
    const directions = ['up', 'down', 'left', 'right'];

    for (const block of blocks) {
        for (const direction of directions) {
            const directionMap = {
                'up': { dx: 0, dy: -1 },
                'down': { dx: 0, dy: 1 },
                'left': { dx: -1, dy: 0 },
                'right': { dx: 1, dy: 0 }
            };

            const { dx, dy } = directionMap[direction];
            const newX = block.x + dx;
            const newY = block.y + dy;

            // ⚠️ 修复点：必须将当前的 blocks 传给 canMoveTo
            if (canMoveTo(block, newX, newY, blocks)) {
                moves.push({
                    blockId: block.id,
                    direction: direction,
                    newX: newX,
                    newY: newY
                });
            }
        }
    }

    return moves;
}

function applyMove(blocks, move) {
    const newBlocks = deepCopyBlocks(blocks);
    const block = newBlocks.find(b => b.id === move.blockId);
    if (block) {
        block.x = move.newX;
        block.y = move.newY;
    }
    return newBlocks;
}

function solveGame() {
    const startTime = performance.now();

    // 1. 准备初始状态
    const initialBlocks = deepCopyBlocks(gameState.blocks);
    const initialKey = stateToString(initialBlocks);

    // 2. 核心数据结构优化
    // queue: 只存储当前的方块状态，不存储路径，节省巨大的内存
    const queue = [initialBlocks];
    let head = 0; // 【关键优化】使用指针代替 queue.shift()，速度提升 O(n) 倍

    // predecessor: 记录"族谱" Map<StateKey, { parentKey, move }>
    // 用于找到终点后倒推路径
    const predecessor = new Map();
    predecessor.set(initialKey, null);

    // 3. 设置安全阈值
    // 横刀立马通常需要 20,000+ 个状态探索，给够 200,000 防止意外
    const maxIterations = 200000;

    console.log('🚀 启动高性能 BFS 求解器...');

    while (head < queue.length) {
        // 安全中断
        if (head > maxIterations) {
            console.log(`❌ 超出最大计算步数 (${maxIterations})，停止搜索。`);
            return null;
        }

        // 【关键优化】O(1) 复杂度取出当前状态
        const currentBlocks = queue[head++];
        const currentKey = stateToString(currentBlocks);

        // 4. 检查胜利
        if (isVictoryState(currentBlocks)) {
            const endTime = performance.now();
            console.log(`🎉 胜利！搜索状态总数: ${head}, 队列剩余: ${queue.length - head}`);

            // 5. 倒推路径 (Backtracking)
            const path = reconstructPath(predecessor, currentKey);

            const duration = ((endTime - startTime) / 1000).toFixed(2);
            console.log(`✅ 最优解步数: ${path.length}, 耗时: ${duration}秒`);
            return path;
        }

        // 6. 生成新状态
        const possibleMoves = generateMoves(currentBlocks);

        for (const move of possibleMoves) {
            const newBlocks = applyMove(currentBlocks, move);
            const newStateKey = stateToString(newBlocks);

            // 如果是全新的状态（未在族谱中记录过）
            if (!predecessor.has(newStateKey)) {
                // 记录这个状态是从哪来的，以及怎么走过来的
                predecessor.set(newStateKey, {
                    parentKey: currentKey,
                    move: {
                        blockId: move.blockId,
                        direction: move.direction,
                        newX: move.newX, // 预存坐标供演示使用
                        newY: move.newY
                    }
                });

                // 加入队列
                queue.push(newBlocks);
            }
        }
    }

    console.log('❌ 队列已空，无解。');
    return null;
}

// 【新增】辅助函数：通过族谱倒推路径
function reconstructPath(predecessorMap, endKey) {
    const path = [];
    let currentKey = endKey;

    while (true) {
        const record = predecessorMap.get(currentKey);
        if (!record) break; // 到达起点（起点没有 parent）

        // 因为是倒推的，所以加入到数组头部，或者最后 reverse
        path.push(record.move);
        currentKey = record.parentKey;
    }

    // 翻转数组，使其变为 起点 -> 终点 的顺序
    return path.reverse();
}

function showHint() {
    if (gameState.isAutoSolving) {
        // 如果正在自动求解，则停止
        stopAutoSolve();
        return;
    }

    alert('🧩 正在计算最优解，请稍候...\n\n这将使用BFS算法找到当前局面的最短解决方案。');

    // 使用setTimeout避免阻塞UI
    setTimeout(() => {
        const solution = solveGame();

        if (solution && solution.length > 0) {
            startAutoSolve(solution);
        } else {
            alert('❌ 无法找到解决方案或求解超时。\n\n这可能意味着当前状态无法解决，或者需要更多计算时间。');
        }
    }, 100);
}

function startAutoSolve(solution) {
    gameState.isAutoSolving = true;
    updateButtonStates();

    const blockNames = {
        'caocao': '曹操',
        'zhangfei': '张飞',
        'zhaoyun': '赵云',
        'machao': '马超',
        'huangzhong': '黄忠',
        'guanyu': '关羽',
        'soldier1': '兵1',
        'soldier2': '兵2',
        'soldier3': '兵3',
        'soldier4': '兵4'
    };

    const directionNames = {
        'up': '上',
        'down': '下',
        'left': '左',
        'right': '右'
    };

    let stepIndex = 0;

    alert(`🧩 找到最短解决方案！\n\n总共需要 ${solution.length} 步\n\n点击"确定"开始演示，每步间隔500ms`);

    function executeNextStep() {
        if (!gameState.isAutoSolving || stepIndex >= solution.length) {
            if (stepIndex >= solution.length) {
                setTimeout(() => {
                    alert('🎉 演示完成！已成功将曹操移到底部中间位置。');
                }, 500);
            }
            stopAutoSolve();
            return;
        }

        const step = solution[stepIndex];
        const block = gameState.blocks.find(b => b.id === step.blockId);

        if (block) {
            // 高亮当前要移动的滑块
            highlightBlock(block.id);

            // 直接使用解法步骤中预计算好的坐标
            // 修复演示逻辑：防止与算法路径不一致
            if (step.newX !== undefined && step.newY !== undefined) {
                block.x = step.newX;
                block.y = step.newY;
            } else {
                // 兼容旧格式：根据direction计算新位置
                const directionMap = {
                    'up': { dx: 0, dy: -1 },
                    'down': { dx: 0, dy: 1 },
                    'left': { dx: -1, dy: 0 },
                    'right': { dx: 1, dy: 0 }
                };

                const { dx, dy } = directionMap[step.direction];
                block.x += dx;
                block.y += dy;
            }

            gameState.moves++;
            updateMovesDisplay();
            render();

            // 显示当前步骤信息
            console.log(`步骤 ${stepIndex + 1}: ${blockNames[step.blockId]} → ${directionNames[step.direction]}`);

            stepIndex++;

            // 设置下一步的定时器
            gameState.autoSolveTimeout = setTimeout(executeNextStep, 500);
        } else {
            console.error('找不到滑块:', step.blockId);
            stepIndex++;
            gameState.autoSolveTimeout = setTimeout(executeNextStep, 100);
        }
    }

    // 开始执行第一步
    gameState.autoSolveTimeout = setTimeout(executeNextStep, 1000);
}

function stopAutoSolve() {
    gameState.isAutoSolving = false;

    if (gameState.autoSolveTimeout) {
        clearTimeout(gameState.autoSolveTimeout);
        gameState.autoSolveTimeout = null;
    }

    clearHighlights();
    updateButtonStates();
    render();
}

function highlightBlock(blockId) {
    clearHighlights();
    const blockElement = document.querySelector(`[data-block-id="${blockId}"]`);
    if (blockElement) {
        blockElement.classList.add('auto-solving');
    }
}

function clearHighlights() {
    const highlightedBlocks = document.querySelectorAll('.auto-solving');
    highlightedBlocks.forEach(element => {
        element.classList.remove('auto-solving');
    });
}

function updateButtonStates() {
    const hintButton = document.querySelector('button[onclick*="showHint"]');
    const solveButton = document.querySelector('button[onclick*="solveAndShow"]');
    const resetButton = document.querySelector('button[onclick*="resetGame"]');
    const undoButton = document.getElementById('undoButton');

    if (gameState.isAutoSolving) {
        if (hintButton) {
            hintButton.textContent = '⏹️ 停止演示';
            hintButton.title = '停止自动演示';
        }
        if (solveButton) solveButton.disabled = true;
        if (resetButton) resetButton.disabled = true;
        if (undoButton) undoButton.disabled = true;
    } else {
        if (hintButton) {
            hintButton.textContent = '💡 提示';
            hintButton.title = '自动演示最优解';
        }
        if (solveButton) solveButton.disabled = false;
        if (resetButton) resetButton.disabled = false;
        updateUndoButton();
    }
}

function solveAndShow() {
    const solution = solveGame();

    if (solution) {
        const blockNames = {
            'caocao': '曹操',
            'zhangfei': '张飞',
            'zhaoyun': '赵云',
            'machao': '马超',
            'huangzhong': '黄忠',
            'guanyu': '关羽',
            'soldier1': '兵1',
            'soldier2': '兵2',
            'soldier3': '兵3',
            'soldier4': '兵4'
        };

        const directionNames = {
            'up': '上',
            'down': '下',
            'left': '左',
            'right': '右'
        };

        const solutionText = solution
            .map((step, index) => `${index + 1}. ${blockNames[step.blockId]} → ${directionNames[step.direction]}`)
            .join('\n');

        alert(`🧩 找到最短解决方案！\n\n总共需要 ${solution.length} 步：\n\n${solutionText}`);
    } else {
        alert('❌ 无法找到解决方案或求解超时。\n\n这可能意味着当前状态无法解决，或者需要更多计算时间。');
    }
}

// 键盘事件监听
document.addEventListener('keydown', handleKeyPress);

// 窗口大小变化监听（处理手机旋转）
window.addEventListener('resize', () => {
    render();
});

// 初始化游戏
render();
updateUndoButton(); // 初始化撤销按钮状态
updateButtonStates(); // 初始化按钮状态