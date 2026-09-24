// Main Pitfall! Game Loop & Title Screen Logic
class PitfallGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.input = new InputHandler();
        this.screenMgr = new ScreenManager();
        this.hazardMgr = new HazardManager();
        this.player = new Player();

        this.gameState = 'TITLE_SCREEN'; // 'TITLE_SCREEN', 'PLAYING', 'GAME_OVER', 'VICTORY'

        this.score = 2000;
        this.highScore = parseInt(localStorage.getItem('pitfall_highscore') || '2000', 10);
        this.lives = 3;
        this.timerSeconds = 20 * 60; // 20:00 minutes countdown
        this.lastTime = 0;
        this.flashTimer = 0;

        this.init();
    }

    init() {
        // Setup initial screen
        this.loadCurrentScreen();

        // Start animation loop
        requestAnimationFrame((timestamp) => this.loop(timestamp));
    }

    startNewGame() {
        this.score = 2000;
        this.lives = 3;
        this.timerSeconds = 20 * 60;
        this.screenMgr.currentScreenIndex = 0;
        this.screenMgr.generateScreens();
        this.loadCurrentScreen();
        this.player.reset(80, 205);
        this.gameState = 'PLAYING';

        if (window.soundFx) window.soundFx.playStart();
    }

    loadCurrentScreen() {
        const sc = this.screenMgr.getCurrentScreen();
        this.hazardMgr.setupScreen(sc);
    }

    changeScreen(direction) {
        if (direction === 'NEXT') {
            this.screenMgr.nextScreen();
        } else if (direction === 'PREV') {
            this.screenMgr.prevScreen();
        } else if (direction === 'UNDERGROUND_NEXT') {
            this.screenMgr.undergroundNext();
        } else if (direction === 'UNDERGROUND_PREV') {
            this.screenMgr.undergroundPrev();
        }
        this.loadCurrentScreen();
    }

    addScore(pts) {
        this.score += pts;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('pitfall_highscore', this.highScore.toString());
        }
    }

    subScore(pts) {
        this.score = Math.max(0, this.score - pts);
    }

    onPlayerDeath() {
        this.lives--;
        if (this.lives <= 0) {
            this.gameState = 'GAME_OVER';
        } else {
            // Respawn player at top level start of screen
            this.player.reset(80, 205);
        }
    }

    loop(timestamp) {
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(dt);
        this.draw();

        requestAnimationFrame((ts) => this.loop(ts));
    }

    update(dt) {
        this.flashTimer += 0.05;

        // Title Screen Input to start
        if (this.gameState === 'TITLE_SCREEN' || this.gameState === 'GAME_OVER' || this.gameState === 'VICTORY') {
            if (this.input.consumeStart()) {
                this.startNewGame();
            }
            return;
        }

        // Game Timer Countdown
        if (this.gameState === 'PLAYING') {
            this.timerSeconds -= dt;
            if (this.timerSeconds <= 0) {
                this.timerSeconds = 0;
                this.gameState = 'GAME_OVER';
            }

            // Update Game Objects
            this.hazardMgr.update(dt);
            this.player.update(this.input, this.hazardMgr, this);

            // Check Win Condition (All treasures collected)
            const remainingTreasures = this.screenMgr.screens.filter(s => s.treasureType && !s.treasureCollected).length;
            if (remainingTreasures === 0 && this.screenMgr.screens.some(s => s.treasureType)) {
                this.gameState = 'VICTORY';
            }
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.gameState === 'TITLE_SCREEN') {
            this.drawTitleScreen();
        } else {
            // Render Game World
            this.screenMgr.drawEnvironment(this.ctx);
            this.hazardMgr.draw(this.ctx);
            this.player.draw(this.ctx);

            // Render HUD (Score, Timer, Lives, Screen Num)
            this.drawHUD();

            if (this.gameState === 'GAME_OVER') {
                this.drawGameOverScreen();
            } else if (this.gameState === 'VICTORY') {
                this.drawVictoryScreen();
            }
        }
    }

    drawTitleScreen() {
        // Dark Jungle Background
        this.ctx.fillStyle = '#0f2409';
        this.ctx.fillRect(0, 0, 640, 400);

        // Canopy Border
        this.ctx.fillStyle = '#2d6a1b';
        this.ctx.fillRect(0, 0, 640, 40);
        this.ctx.fillRect(0, 360, 640, 40);

        // PITFALL! Logo Text (Atari Style Pixel Gold Title)
        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = 'bold 54px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = '#000000';
        this.ctx.shadowBlur = 10;
        this.ctx.fillText('PITFALL!', 320, 110);

        // Subtitle
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#8db600';
        this.ctx.font = 'bold 20px monospace';
        this.ctx.fillText('ATIVISION CLONE - JS VANILLA', 320, 150);

        // High Score display
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '16px monospace';
        this.ctx.fillText(`RECORD HIGHSCORE: ${this.highScore}`, 320, 200);

        // Press Start Flashing Text
        if (Math.sin(this.flashTimer * 3) > 0) {
            this.ctx.fillStyle = '#00ffff';
            this.ctx.font = 'bold 24px monospace';
            this.ctx.fillText('PRESS START / TOQUE NA TELA', 320, 260);
        }

        // Instructions Footer
        this.ctx.fillStyle = '#a0b888';
        this.ctx.font = '14px monospace';
        this.ctx.fillText('PC: Setas / WASD + Espaço  |  Mobile: Controles Touch', 320, 320);
    }

    drawHUD() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 18px monospace';
        this.ctx.textAlign = 'left';

        // Score
        const scoreStr = this.score.toString().padStart(6, '0');
        this.ctx.fillText(`PONTOS: ${scoreStr}`, 20, 30);

        // High Score
        this.ctx.fillText(`REC: ${this.highScore}`, 230, 30);

        // Timer (MM:SS)
        const mins = Math.floor(this.timerSeconds / 60).toString().padStart(2, '0');
        const secs = Math.floor(this.timerSeconds % 60).toString().padStart(2, '0');
        this.ctx.fillText(`TEMPO: ${mins}:${secs}`, 400, 30);

        // Screen Number
        this.ctx.fillText(`TELA: ${this.screenMgr.currentScreenIndex + 1}/${this.screenMgr.totalScreens}`, 530, 30);

        // Player Lives Icons (Harry Miniatures)
        for (let i = 0; i < this.lives; i++) {
            const lx = 20 + i * 22;
            const ly = 372;
            this.ctx.fillStyle = '#228b22';
            this.ctx.fillRect(lx, ly, 12, 14);
            this.ctx.fillStyle = '#ffcc99';
            this.ctx.fillRect(lx + 2, ly - 4, 8, 4);
        }
    }

    drawGameOverScreen() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        this.ctx.fillRect(0, 0, 640, 400);

        this.ctx.fillStyle = '#ff3333';
        this.ctx.font = 'bold 48px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('FIM DE JOGO', 320, 180);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '20px monospace';
        this.ctx.fillText(`PONTUAÇÃO FINAL: ${this.score}`, 320, 230);

        if (Math.sin(this.flashTimer * 3) > 0) {
            this.ctx.fillStyle = '#ffd700';
            this.ctx.fillText('PRESSIONE START PARA JOGAR NOVAMENTE', 320, 290);
        }
    }

    drawVictoryScreen() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        this.ctx.fillRect(0, 0, 640, 400);

        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = 'bold 48px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('VOCÊ VENCEU!', 320, 180);

        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = '20px monospace';
        this.ctx.fillText(`TODOS OS TESOUROS COLETADOS!`, 320, 230);
        this.ctx.fillText(`PONTUAÇÃO FINAL: ${this.score}`, 320, 260);

        if (Math.sin(this.flashTimer * 3) > 0) {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillText('PRESSIONE START PARA JOGAR NOVAMENTE', 320, 310);
        }
    }
}

// Initialize game on window load
window.addEventListener('load', () => {
    window.game = new PitfallGame();
});
