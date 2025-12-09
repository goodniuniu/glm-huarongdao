const GRID_SIZE = 80;
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
    history: [] // 存储历史状态
};

function isPositionOccupied(x, y, excludeBlockId = null) {
    return gameState.blocks.some(block =>
        block.id !== excludeBlockId &&
        x >= block.x &&
        x < block.x + block.width &&
        y >= block.y &&
        y < block.y + block.height
    );
}

function canMoveTo(block, newX, newY) {
    // 检查边界
    if (newX < 0 || newY < 0 ||
        newX + block.width > BOARD_WIDTH ||
        newY + block.height > BOARD_HEIGHT) {
        return false;
    }

    // 检查目标位置是否被占用
    for (let x = newX; x < newX + block.width; x++) {
        for (let y = newY; y < newY + block.height; y++) {
            if (isPositionOccupied(x, y, block.id)) {
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

    gameState.blocks.forEach(block => {
        const blockElement = document.createElement('div');
        blockElement.className = `block ${block.type}`;
        blockElement.style.left = `${block.x * GRID_SIZE}px`;
        blockElement.style.top = `${block.y * GRID_SIZE}px`;
        blockElement.style.width = `${block.width * GRID_SIZE - 10}px`;
        blockElement.style.height = `${block.height * GRID_SIZE - 10}px`;
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
    // 将滑块状态序列化为字符串键，用于visited集合
    return blocks
        .map(block => `${block.id}:${block.x},${block.y}`)
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

            if (canMoveTo(block, newX, newY)) {
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
    const initialState = deepCopyBlocks(gameState.blocks);
    const initialStateKey = stateToString(initialState);

    // BFS队列：存储 {blocks: 状态, path: 移动路径}
    const queue = [{
        blocks: initialState,
        path: []
    }];

    // visited集合：存储已访问的状态
    const visited = new Set([initialStateKey]);
    let steps = 0;
    const maxSteps = 10000; // 防止无限循环

    console.log('🧩 开始华容道求解...');
    console.log('初始状态:', initialStateKey);

    while (queue.length > 0 && steps < maxSteps) {
        steps++;

        // 取出队列头部状态
        const current = queue.shift();
        const currentStateKey = stateToString(current.blocks);

        console.log(`步骤 ${steps}: 队列大小=${queue.length}, 已访问=${visited.size}`);

        // 检查是否达到胜利条件
        if (isVictoryState(current.blocks)) {
            console.log('🎉 找到解决方案！步骤数:', current.path.length);
            console.log('解决方案:', current.path);
            return current.path;
        }

        // 生成所有可能的移动
        const possibleMoves = generateMoves(current.blocks);

        for (const move of possibleMoves) {
            // 应用移动生成新状态
            const newBlocks = applyMove(current.blocks, move);
            const newStateKey = stateToString(newBlocks);

            // 如果新状态未被访问过
            if (!visited.has(newStateKey)) {
                visited.add(newStateKey);
                queue.push({
                    blocks: newBlocks,
                    path: [...current.path, {
                        blockId: move.blockId,
                        direction: move.direction
                    }]
                });
            }
        }

        // 每隔1000步显示进度
        if (steps % 1000 === 0) {
            console.log(`求解进度: ${steps}步, 已探索${visited.size}个状态`);
        }
    }

    if (steps >= maxSteps) {
        console.log('⏱️ 求解超时，已探索10000步');
    } else {
        console.log('❌ 未找到解决方案');
    }

    return null; // 未找到解决方案
}

function showHint() {
    alert('🎮 游戏控制：\n\n• 鼠标点击滑块选中，再次点击移动\n• 方向键控制：↑↓←→ 移动选中的滑块\n• 撤销操作：点击"↶ 回退"按钮 或按 Ctrl+Z (Mac: Cmd+Z)\n• 重新开始：点击"重新开始"按钮\n\n🎯 游戏目标：把曹操（红色大方块）移到底部中间位置！');
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

// 初始化游戏
render();
updateUndoButton(); // 初始化撤销按钮状态