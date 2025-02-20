class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 20;
        this.reset();

        // 绑定按键事件
        document.addEventListener('keydown', this.handleKeyPress.bind(this));

        // 绑定按钮事件
        document.getElementById('aiToggle').addEventListener('change', (e) => {
            this.isAIActive = e.target.checked;

            // 如果游戏没有结束，重新开始游戏循环
            if (!this.gameOver) {
                if (this.gameLoop) {
                    clearInterval(this.gameLoop);
                    this.gameLoop = null;
                }
                this.startGame();
            }
        });
        document.getElementById('restart').addEventListener('click', () => this.reset());
        document.getElementById('modalRestart').addEventListener('click', () => {
            document.getElementById('gameOverModal').style.display = 'none';
            this.reset();
        });

        // 添加一个标记来记录游戏是否因对话框而暂停
        this.pausedByModal = false;

        // 绑定重置分数相关的事件
        document.getElementById('resetHighScore').addEventListener('click', () => {
            const resetModal = document.getElementById('resetConfirmModal');
            resetModal.style.display = 'block';

            // 如果游戏正在运行，则暂停并标记
            if (!this.gameOver && this.gameLoop) {
                clearInterval(this.gameLoop);
                this.gameLoop = null;
                this.pausedByModal = true;
            }
        });

        // 取消重置
        document.getElementById('cancelReset').addEventListener('click', () => {
            const resetModal = document.getElementById('resetConfirmModal');
            resetModal.style.display = 'none';

            // 如果是因为对话框暂停的游戏，则恢复
            if (this.pausedByModal && !this.gameOver) {
                this.startGame();
                this.pausedByModal = false;
            }
        });

        // 确认重置
        document.getElementById('confirmReset').addEventListener('click', () => {
            const resetModal = document.getElementById('resetConfirmModal');
            resetModal.style.display = 'none';
            this.pausedByModal = false;  // 重置暂停标记

            // 重置最高分
            this.highScore = 0;
            localStorage.setItem('snakeHighScore', '0');
            this.updateHighScore();

            // 重新开始游戏
            this.reset();
        });

        this.highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
        this.updateHighScore();

        this.baseSpeed = 200;    // 基础速度
        this.minSpeed = 50;      // 最小速度（最快）
        this.speedIncrease = 5;  // 每次加速减少的毫秒数
        this.speed = this.baseSpeed;

        // 记录 AI 状态
        this.isAIActive = false;
    }

    reset() {
        // 保存当前的 AI 状态
        const currentAIState = this.isAIActive;

        // 清除可能存在的倒计时
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }

        // 随机选择初始方向
        const directions = ['up', 'down', 'left', 'right'];
        this.direction = directions[Math.floor(Math.random() * directions.length)];

        // 根据方向设置初始蛇身
        const centerX = Math.floor((this.canvas.width / this.gridSize) / 2);
        const centerY = Math.floor((this.canvas.height / this.gridSize) / 2);

        // 根据不同方向设置蛇身
        switch (this.direction) {
            case 'right':
                this.snake = [
                    { x: centerX, y: centerY },
                    { x: centerX - 1, y: centerY },
                    { x: centerX - 2, y: centerY }
                ];
                break;
            case 'left':
                this.snake = [
                    { x: centerX, y: centerY },
                    { x: centerX + 1, y: centerY },
                    { x: centerX + 2, y: centerY }
                ];
                break;
            case 'up':
                this.snake = [
                    { x: centerX, y: centerY },
                    { x: centerX, y: centerY + 1 },
                    { x: centerX, y: centerY + 2 }
                ];
                break;
            case 'down':
                this.snake = [
                    { x: centerX, y: centerY },
                    { x: centerX, y: centerY - 1 },
                    { x: centerX, y: centerY - 2 }
                ];
                break;
        }

        this.food = this.generateFood();
        this.score = 0;
        this.speed = 200; // 初始速度
        this.gameOver = false;
        this.updateScore();
        this.updateHighScore();

        // 恢复 AI 状态
        this.isAIActive = currentAIState;
        document.getElementById('aiToggle').checked = currentAIState;

        // 清除之前的游戏循环
        if (this.gameLoop) clearInterval(this.gameLoop);
        this.startGame();

        // 清除所有烟花
        const fireworks = document.querySelectorAll('.firework');
        fireworks.forEach(firework => firework.remove());

        // 清除烟花效果
        if (this.fireworksInterval) {
            clearInterval(this.fireworksInterval);
            this.fireworksInterval = null;
        }
        if (this.fireworksContainer) {
            this.fireworksContainer.remove();
            this.fireworksContainer = null;
        }
    }

    generateFood() {
        const x = Math.floor(Math.random() * (this.canvas.width / this.gridSize));
        const y = Math.floor(Math.random() * (this.canvas.height / this.gridSize));
        return { x, y };
    }

    draw() {
        // 清空画布
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制蛇
        this.snake.forEach((segment, index) => {
            // 计算颜色
            let color;
            if (index === 0) {
                // 蛇头为深绿色
                color = '#2E7D32';
            } else {
                // 蛇身渐变：从浅绿到深绿
                const progress = (index - 1) / (this.snake.length - 1);
                const r = Math.round(46 + (178 - 46) * progress);
                const g = Math.round(125 + (223 - 125) * progress);
                const b = Math.round(50 + (185 - 50) * progress);
                color = `rgb(${r}, ${g}, ${b})`;
            }

            // 绘制蛇身
            this.ctx.fillStyle = color;
            this.ctx.fillRect(
                segment.x * this.gridSize,
                segment.y * this.gridSize,
                this.gridSize - 1,
                this.gridSize - 1
            );

            // 为蛇头添加眼睛
            if (index === 0) {
                this.drawSnakeEyes(segment);
            }
        });

        // 绘制食物 - 简单的红色方块
        this.ctx.fillStyle = '#e74c3c';  // 鲜艳的红色
        this.ctx.fillRect(
            this.food.x * this.gridSize,
            this.food.y * this.gridSize,
            this.gridSize - 1,
            this.gridSize - 1
        );
    }

    drawSnakeEyes(head) {
        const eyeSize = this.gridSize / 6;
        const eyeOffset = this.gridSize / 3;

        this.ctx.fillStyle = 'white';

        // 根据方向调整眼睛位置
        switch (this.direction) {
            case 'right':
                // 右眼
                this.ctx.fillRect(
                    (head.x * this.gridSize) + this.gridSize - eyeOffset,
                    (head.y * this.gridSize) + eyeOffset - eyeSize,
                    eyeSize,
                    eyeSize
                );
                // 左眼
                this.ctx.fillRect(
                    (head.x * this.gridSize) + this.gridSize - eyeOffset,
                    (head.y * this.gridSize) + this.gridSize - eyeOffset,
                    eyeSize,
                    eyeSize
                );
                break;
            case 'left':
                this.ctx.fillRect(
                    (head.x * this.gridSize) + eyeOffset - eyeSize,
                    (head.y * this.gridSize) + eyeOffset - eyeSize,
                    eyeSize,
                    eyeSize
                );
                this.ctx.fillRect(
                    (head.x * this.gridSize) + eyeOffset - eyeSize,
                    (head.y * this.gridSize) + this.gridSize - eyeOffset,
                    eyeSize,
                    eyeSize
                );
                break;
            case 'up':
                this.ctx.fillRect(
                    (head.x * this.gridSize) + eyeOffset - eyeSize,
                    (head.y * this.gridSize) + eyeOffset - eyeSize,
                    eyeSize,
                    eyeSize
                );
                this.ctx.fillRect(
                    (head.x * this.gridSize) + this.gridSize - eyeOffset,
                    (head.y * this.gridSize) + eyeOffset - eyeSize,
                    eyeSize,
                    eyeSize
                );
                break;
            case 'down':
                this.ctx.fillRect(
                    (head.x * this.gridSize) + eyeOffset - eyeSize,
                    (head.y * this.gridSize) + this.gridSize - eyeOffset,
                    eyeSize,
                    eyeSize
                );
                this.ctx.fillRect(
                    (head.x * this.gridSize) + this.gridSize - eyeOffset,
                    (head.y * this.gridSize) + this.gridSize - eyeOffset,
                    eyeSize,
                    eyeSize
                );
                break;
        }
    }

    move() {
        if (this.gameOver) return;

        const head = { ...this.snake[0] };

        switch (this.direction) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }

        // 检查碰撞
        if (this.checkCollision(head)) {
            this.gameOver = true;
            this.showGameOver();
            return;
        }

        this.snake.unshift(head);

        // 检查是否吃到食物
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score++;
            this.updateScore();
            // 更新最高分
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('snakeHighScore', this.highScore);
                this.updateHighScore();
            }
            // 生成新食物
            this.food = this.generateFood();
            // 直接调用加速
            this.increaseSpeed();
        } else {
            this.snake.pop();
        }
    }

    checkCollision(head) {
        // 检查墙壁碰撞
        if (head.x < 0 || head.x >= this.canvas.width / this.gridSize ||
            head.y < 0 || head.y >= this.canvas.height / this.gridSize) {
            return true;
        }

        // 检查自身碰撞
        return this.snake.some(segment => segment.x === head.x && segment.y === head.y);
    }

    handleKeyPress(event) {
        if (this.isAIActive) return; // AI模式下禁用键盘控制

        const keyMap = {
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right'
        };

        const newDirection = keyMap[event.key];
        if (newDirection) {
            // 阻止方向键的默认滚动行为
            event.preventDefault();

            // 防止180度转向
            const opposites = {
                'up': 'down',
                'down': 'up',
                'left': 'right',
                'right': 'left'
            };

            if (opposites[newDirection] !== this.direction) {
                this.direction = newDirection;
            }
        }
    }

    updateScore() {
        document.getElementById('score').innerHTML =
            `历史最高: ${this.highScore}<br>当前分数: ${this.score}`;
    }

    updateHighScore() {
        document.getElementById('score').textContent =
            `历史最高: ${this.highScore}\n分数: ${this.score}`;
    }

    increaseSpeed() {
        // 计算新速度，但不低于最小速度
        const newSpeed = Math.max(
            this.minSpeed,
            this.baseSpeed - this.score * this.speedIncrease
        );

        // 如果速度发生变化，更新游戏循环
        if (newSpeed !== this.speed) {
            this.speed = newSpeed;
            if (this.gameLoop) {
                clearInterval(this.gameLoop);
                this.startGame();
            }
        }
    }

    startGame() {
        this.gameLoop = setInterval(() => {
            if (this.isAIActive) this.aiMove();
            this.move();
            this.draw();
        }, this.speed);
    }

    aiMove() {
        const head = this.snake[0];
        const food = this.food;

        // 计算所有可能的移动方向
        const possibleMoves = this.getPossibleMoves();

        if (possibleMoves.length === 0) {
            return; // 无路可走
        }

        // 计算每个方向的评分
        const scoredMoves = possibleMoves.map(dir => ({
            direction: dir,
            score: this.evaluateMove(dir)
        }));

        // 选择最高分的移动方向
        const bestMove = scoredMoves.reduce((a, b) =>
            a.score > b.score ? a : b
        );

        this.direction = bestMove.direction;
    }

    getPossibleMoves() {
        const head = this.snake[0];
        const possibleDirections = ['up', 'down', 'left', 'right'];
        const opposites = {
            'up': 'down',
            'down': 'up',
            'left': 'right',
            'right': 'left'
        };

        // 过滤掉会导致立即死亡的方向
        return possibleDirections.filter(dir => {
            if (opposites[dir] === this.direction) {
                return false; // 禁止180度转向
            }

            const nextHead = { ...head };
            switch (dir) {
                case 'up': nextHead.y--; break;
                case 'down': nextHead.y++; break;
                case 'left': nextHead.x--; break;
                case 'right': nextHead.x++; break;
            }

            return !this.checkCollision(nextHead);
        });
    }

    evaluateMove(direction) {
        const head = this.snake[0];
        const nextHead = { ...head };

        switch (direction) {
            case 'up': nextHead.y--; break;
            case 'down': nextHead.y++; break;
            case 'left': nextHead.x--; break;
            case 'right': nextHead.x++; break;
        }

        // 如果会直接撞墙或撞到自己，立即返回极低分数
        if (this.wouldCollide(nextHead)) {
            return -1000;
        }

        let score = 0;

        // 1. 评估到食物的距离
        const distanceToFood = Math.abs(nextHead.x - this.food.x) + Math.abs(nextHead.y - this.food.y);
        score -= distanceToFood * 10;

        // 2. 评估可用空间
        const availableSpace = this.floodFill(nextHead);
        const totalSpace = (this.canvas.width / this.gridSize) * (this.canvas.height / this.gridSize);
        const spaceRatio = availableSpace / totalSpace;

        // 如果可用空间太小，给予惩罚
        if (spaceRatio < 0.3) {
            score -= 500;
        } else {
            score += availableSpace * 2;
        }

        // 3. 避免靠近墙壁，除非食物在那里
        if (this.isNearWall(nextHead) && distanceToFood > 2) {
            score -= 50;
        }

        // 4. 如果这步移动后能吃到食物，评估吃完后的情况
        if (nextHead.x === this.food.x && nextHead.y === this.food.y) {
            const futureSpace = this.evaluateFutureSpace(nextHead);
            if (futureSpace > this.snake.length) {
                score += 200; // 有足够的空间，鼓励吃食物
            } else {
                score -= 100; // 空间不足，避免吃食物
            }
        }

        return score;
    }

    // 使用泛洪填充算法评估可用空间
    floodFill(start) {
        const width = this.canvas.width / this.gridSize;
        const height = this.canvas.height / this.gridSize;
        const visited = new Set();
        const queue = [start];

        while (queue.length > 0) {
            const current = queue.shift();
            const key = `${current.x},${current.y}`;

            if (visited.has(key)) continue;
            visited.add(key);

            // 检查四个方向
            const directions = [
                { x: 0, y: -1 }, { x: 0, y: 1 },
                { x: -1, y: 0 }, { x: 1, y: 0 }
            ];

            for (const dir of directions) {
                const next = {
                    x: current.x + dir.x,
                    y: current.y + dir.y
                };

                if (this.isValidPosition(next) && !this.wouldCollide(next)) {
                    queue.push(next);
                }
            }
        }

        return visited.size;
    }

    // 检查位置是否在边界内
    isValidPosition(position) {
        const width = this.canvas.width / this.gridSize;
        const height = this.canvas.height / this.gridSize;
        return position.x >= 0 && position.x < width &&
            position.y >= 0 && position.y < height;
    }

    // 检查是否靠近墙壁
    isNearWall(position) {
        const width = this.canvas.width / this.gridSize;
        const height = this.canvas.height / this.gridSize;
        return position.x <= 1 || position.x >= width - 2 ||
            position.y <= 1 || position.y >= height - 2;
    }

    // 评估吃到食物后的可用空间
    evaluateFutureSpace(position) {
        const simulatedSnake = [...this.snake];
        simulatedSnake.unshift(position);

        const width = this.canvas.width / this.gridSize;
        const height = this.canvas.height / this.gridSize;
        let space = 0;

        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const pos = { x, y };
                if (!simulatedSnake.some(segment =>
                    segment.x === pos.x && segment.y === pos.y)) {
                    space++;
                }
            }
        }

        return space;
    }

    showGameOver() {
        const modal = document.getElementById('gameOverModal');
        const finalScore = document.getElementById('finalScore');
        const modalRestartBtn = document.getElementById('modalRestart');

        // 检查是否打破记录
        const isNewRecord = this.score > 0 && this.score === this.highScore;

        if (isNewRecord) {
            finalScore.innerHTML = `
                <div class="celebration-text">恭喜！新纪录！</div>
                得分：${this.score}<br>历史最高：${this.highScore}
            `;
            modalRestartBtn.textContent = '再来一局';
            setTimeout(() => {
                this.createFireworks();
            }, 100);
        } else {
            // 普通结算时添加倒计时
            let countdown = 5;
            finalScore.innerHTML = `
                得分：${this.score}<br>历史最高：${this.highScore}<br>
                <span class="countdown" style="color: #888; font-size: 14px;">${countdown}秒后自动重新开始</span>
            `;
            modalRestartBtn.textContent = '重新开始';

            // 开始倒计时
            const countdownInterval = setInterval(() => {
                countdown--;
                const countdownSpan = finalScore.querySelector('.countdown');
                if (countdownSpan) {
                    countdownSpan.textContent = `${countdown}秒后自动重新开始`;
                }

                // 倒计时结束时重新开始游戏
                if (countdown <= 0) {
                    clearInterval(countdownInterval);
                    modal.style.display = 'none';
                    this.reset();
                }
            }, 1000);

            // 如果用户手动点击重新开始，清除倒计时
            modalRestartBtn.addEventListener('click', () => {
                clearInterval(countdownInterval);
            }, { once: true });

            // 存储倒计时引用，以便在需要时清除
            this.countdownInterval = countdownInterval;
        }

        modal.style.display = 'block';
    }

    createFireworks() {
        // 创建一个覆盖整个屏幕的烟花容器
        const fireworksContainer = document.createElement('div');
        fireworksContainer.className = 'fireworks-container';
        document.body.appendChild(fireworksContainer);

        const colors = ['#FF4081', '#FF9800', '#4CAF50', '#2196F3', '#9C27B0', '#FFD700', '#FF1493'];
        const fireworkCount = 20;

        const createFireworkBatch = () => {
            for (let i = 0; i < fireworkCount; i++) {
                setTimeout(() => {
                    const firework = document.createElement('div');
                    firework.className = 'firework';

                    // 随机位置（覆盖整个屏幕）
                    const left = Math.random() * 100;
                    const top = Math.random() * 100;

                    // 随机颜色和大小
                    const color = colors[Math.floor(Math.random() * colors.length)];
                    const size = 10 + Math.random() * 20;

                    firework.style.cssText = `
                        left: ${left}%;
                        top: ${top}%;
                        background-color: ${color};
                        width: ${size}px;
                        height: ${size}px;
                    `;

                    fireworksContainer.appendChild(firework);

                    // 动画结束后移除元素
                    setTimeout(() => {
                        firework.remove();
                    }, 1200);
                }, i * 100);
            }
        };

        // 初始创建一批烟花
        createFireworkBatch();

        // 每2秒创建一批新的烟花
        this.fireworksInterval = setInterval(createFireworkBatch, 2000);

        // 存储容器引用，以便在reset时清除
        this.fireworksContainer = fireworksContainer;
    }

    // 添加 wouldCollide 方法
    wouldCollide(position) {
        // 检查墙壁碰撞
        if (position.x < 0 || position.x >= this.canvas.width / this.gridSize ||
            position.y < 0 || position.y >= this.canvas.height / this.gridSize) {
            return true;
        }

        // 检查自身碰撞
        return this.snake.some(segment => segment.x === position.x && segment.y === position.y);
    }
}

// 启动游戏
const game = new SnakeGame(); 