// Main Pitfall! Game Loop, Title Screen & Character Selection Logic
class PitfallGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.input = new InputHandler();
        this.screenMgr = new ScreenManager();
        this.hazardMgr = new HazardManager();
        this.player = new Player();

        this.gameState = 'TITLE_SCREEN'; // 'TITLE_SCREEN', 'CHAR_SELECT', 'PLAYING', 'GAME_OVER', 'VICTORY'
        this.selectedCharIndex = 0; // 0: Gambi, 1: Gambizinho, 2: Dona Gambi

        this.score = 2000;
        this.highScore = parseInt(localStorage.getItem('pitfall_highscore') || '2000', 10);
        this.lives = 3;
        this.timerSeconds = 20 * 60; // 20:00 minutes countdown
        this.lastTime = 0;
        this.flashTimer = 0;

        // Custom Title Art Image
        this.titleImg = new Image();
        this.titleImg.src = 'graphics/tela titulo.jpg';

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
        this.player.reset(80, 182);
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
            this.player.reset(80, 182);
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

        // 1. Title Screen: Press Start -> Character Selection Screen
        if (this.gameState === 'TITLE_SCREEN') {
            if (this.input.consumeStart()) {
                this.gameState = 'CHAR_SELECT';
                if (window.soundFx) window.soundFx.playStart();
            }
            return;
        }

        // 2. Character Selection Screen: Navigate, select & start
        if (this.gameState === 'CHAR_SELECT') {
            // D-Pad / Arrow keys navigation
            const navDir = this.input.consumeNav();
            if (navDir !== 0) {
                this.selectedCharIndex = (this.selectedCharIndex + navDir + 3) % 3;
                if (window.soundFx) window.soundFx.playJump();
            }

            // Click / Tap on character cards
            const click = this.input.consumeClick();
            if (click) {
                // Card 0: X 50..215, Y 115..305
                // Card 1: X 237..402, Y 115..305
                // Card 2: X 425..590, Y 115..305
                let clickedCard = -1;
                if (click.y >= 115 && click.y <= 305) {
                    if (click.x >= 50 && click.x <= 215) clickedCard = 0;
                    else if (click.x >= 237 && click.x <= 402) clickedCard = 1;
                    else if (click.x >= 425 && click.x <= 590) clickedCard = 2;
                }

                if (clickedCard !== -1) {
                    if (this.selectedCharIndex === clickedCard) {
                        // Confirm selected character and start!
                        this.player.setCharacter(this.selectedCharIndex);
                        this.startNewGame();
                        return;
                    } else {
                        this.selectedCharIndex = clickedCard;
                        if (window.soundFx) window.soundFx.playJump();
                    }
                }
            }

            // Confirm selection via Jump / Space / Enter or Touch Start
            if (this.input.keys.jump || this.input.consumeStart()) {
                this.input.keys.jump = false;
                this.player.setCharacter(this.selectedCharIndex);
                this.startNewGame();
                return;
            }
            return;
        }

        // 3. Game Over & Victory restart
        if (this.gameState === 'GAME_OVER' || this.gameState === 'VICTORY') {
            if (this.input.consumeStart() || this.input.keys.jump) {
                this.input.keys.jump = false;
                this.gameState = 'CHAR_SELECT';
                if (window.soundFx) window.soundFx.playStart();
            }
            return;
        }

        // 4. Playing State
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
        } else if (this.gameState === 'CHAR_SELECT') {
            this.drawCharSelectScreen();
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
        // Draw Original High Quality Title JPG Image filling the screen
        if (this.titleImg.complete && this.titleImg.naturalWidth > 0) {
            this.ctx.save();
            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';
            this.ctx.drawImage(this.titleImg, 0, 0, 640, 400);
            this.ctx.restore();
        } else {
            // Dark Jungle Background fallback
            this.ctx.fillStyle = '#0b1807';
            this.ctx.fillRect(0, 0, 640, 400);
        }

        // Overlay Text with Dropshadow
        this.ctx.shadowColor = '#000000';
        this.ctx.shadowBlur = 6;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;

        // High Score display
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`RECORD HIGHSCORE: ${this.highScore}`, 320, 330);

        // Press Start Flashing Text
        if (Math.sin(this.flashTimer * 3) > 0) {
            this.ctx.fillStyle = '#ffff00';
            this.ctx.font = 'bold 22px monospace';
            this.ctx.fillText('PRESS START / TOQUE NA TELA', 320, 365);
        }

        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
    }

    drawCharSelectScreen() {
        // Dark Jungle Retro Background
        this.ctx.fillStyle = '#091506';
        this.ctx.fillRect(0, 0, 640, 400);

        // Top & Bottom Border
        this.ctx.fillStyle = '#2d6a1b';
        this.ctx.fillRect(0, 0, 640, 20);
        this.ctx.fillRect(0, 380, 640, 20);

        // Header Title
        this.ctx.shadowColor = '#000000';
        this.ctx.shadowBlur = 8;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;

        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = 'bold 28px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('ESCOLHA SEU PERSONAGEM', 320, 56);

        this.ctx.fillStyle = '#8cb868';
        this.ctx.font = '13px monospace';
        this.ctx.fillText('Use ◀ ▶ ou toque no personagem para escolher', 320, 84);

        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;

        // 3 Character Cards
        const cardWidth = 165;
        const cardHeight = 195;
        const cardY = 108;
        const cardXs = [50, 237, 425];

        for (let i = 0; i < 3; i++) {
            const cardX = cardXs[i];
            const isSelected = (this.selectedCharIndex === i);
            const charData = this.player.characters[i];
            const sheet = this.player.characterSheets[i];

            // Card Background
            this.ctx.fillStyle = isSelected ? 'rgba(35, 60, 22, 0.95)' : 'rgba(15, 25, 10, 0.8)';
            this.ctx.fillRect(cardX, cardY, cardWidth, cardHeight);

            // Card Border
            if (isSelected) {
                this.ctx.strokeStyle = '#ffd700';
                this.ctx.lineWidth = 4;
                this.ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);

                // Flashing selector badge
                if (Math.sin(this.flashTimer * 4) > 0) {
                    this.ctx.fillStyle = '#ffd700';
                    this.ctx.font = 'bold 12px monospace';
                    this.ctx.fillText('▶ SELECIONADO ◀', cardX + cardWidth / 2, cardY + cardHeight - 12);
                } else {
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.font = 'bold 12px monospace';
                    this.ctx.fillText('SELECIONADO', cardX + cardWidth / 2, cardY + cardHeight - 12);
                }
            } else {
                this.ctx.strokeStyle = '#3a5820';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);

                this.ctx.fillStyle = '#6b8e23';
                this.ctx.font = '11px monospace';
                this.ctx.fillText('TOQUE P/ ESCOLHER', cardX + cardWidth / 2, cardY + cardHeight - 12);
            }

            // Character Name Header in Card
            this.ctx.fillStyle = isSelected ? '#ffffff' : '#a0b888';
            this.ctx.font = 'bold 16px monospace';
            this.ctx.fillText(charData.name, cardX + cardWidth / 2, cardY + 28);

            // Character Frame 0 (Idle) Sprite
            if (sheet && sheet.complete && sheet.naturalWidth > 0) {
                this.ctx.save();
                this.ctx.imageSmoothingEnabled = false; // Pixel-perfect crispness

                const sw = sheet.naturalWidth / 7;
                const sh = sheet.naturalHeight;
                const aspect = sw / sh;

                const spriteH = isSelected ? 92 : 82;
                const spriteW = Math.round(spriteH * aspect);
                const spriteX = cardX + (cardWidth - spriteW) / 2;
                const spriteY = cardY + 42 + (96 - spriteH) / 2;

                // Frame 0 (Idle)
                this.ctx.drawImage(
                    sheet,
                    0, 0, sw, sh,
                    spriteX, spriteY, spriteW, spriteH
                );

                this.ctx.restore();
            }
        }

        // Start Prompt at bottom
        if (Math.sin(this.flashTimer * 3) > 0) {
            this.ctx.fillStyle = '#00ffff';
            this.ctx.font = 'bold 18px monospace';
            this.ctx.fillText('PRESSIONE PULAR / TOQUE PARA CONFIRMAR', 320, 335);
        }

        this.ctx.fillStyle = '#a0b888';
        this.ctx.font = '12px monospace';
        this.ctx.fillText('PC: Espaço / Enter  |  Mobile: Botão PULAR', 320, 362);
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

        // Player Lives Icons (Selected Character Frame 0 Idle Sprite)
        for (let i = 0; i < this.lives; i++) {
            const lx = 20 + i * 26;
            const ly = 364;
            const iconW = 20;
            const iconH = 26;

            if (this.player.spriteSheet.complete && this.player.spriteSheet.naturalWidth > 0) {
                this.ctx.save();
                this.ctx.imageSmoothingEnabled = false;
                const sw = this.player.spriteSheet.naturalWidth / 7;
                const sh = this.player.spriteSheet.naturalHeight;
                this.ctx.drawImage(
                    this.player.spriteSheet,
                    0, 0, sw, sh,
                    lx, ly, iconW, iconH
                );
                this.ctx.restore();
            } else {
                this.ctx.fillStyle = '#228b22';
                this.ctx.fillRect(lx, ly + 6, 12, 14);
            }
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
