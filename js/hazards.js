// Hazards, Vine, Crocodiles, Logs, Scorpions and Treasures
class HazardManager {
    constructor() {
        this.reset();
    }

    reset() {
        this.logs = []; // Array of {x, y, speed, width, height}
        this.crocTimer = 0;
        this.crocMouthOpen = false; // toggles every ~1.5 sec
        this.vine = {
            active: false,
            anchorX: 320,
            anchorY: 70,
            length: 150,
            angle: 0,
            angleVel: 0,
            maxAngle: Math.PI / 4 // 45 deg
        };
        this.scorpion = {
            active: false,
            x: 200,
            y: 345,
            dir: 1,
            speed: 1.5,
            width: 24,
            height: 14
        };
        this.snake = {
            active: false,
            x: 480,
            y: 215,
            width: 16,
            height: 15,
            tongueTimer: 0
        };
        this.fire = {
            active: false,
            x: 320,
            y: 212,
            width: 20,
            height: 18,
            frame: 0
        };
        this.treasure = null; // { type, x, y, width, height, points, collected }
        this.pitType = 'NONE'; // 'NONE', 'WATER', 'QUICKSAND', 'TAR', 'OPEN'
        this.pitBounds = { left: 200, right: 440 };
        this.hasLadder = false;
        this.undergroundWall = false; // If true, wall blocks underground passage
    }

    setupScreen(screenConfig) {
        this.reset();
        this.pitType = screenConfig.pitType || 'NONE';
        this.hasLadder = screenConfig.hasLadder || false;
        this.undergroundWall = screenConfig.undergroundWall || false;

        // Setup Vine
        if (screenConfig.hasVine) {
            this.vine.active = true;
            this.vine.angle = -this.vine.maxAngle; // Start swinging
            this.vine.angleVel = 0;
        }

        // Setup Logs
        if (screenConfig.logCount > 0) {
            for (let i = 0; i < screenConfig.logCount; i++) {
                this.logs.push({
                    x: 640 + i * 200,
                    y: 220,
                    width: 20,
                    height: 10,
                    speed: 2.2 + i * 0.3
                });
            }
        }

        // Setup Snake
        if (screenConfig.hasSnake) {
            this.snake.active = true;
            this.snake.x = screenConfig.snakeX || 480;
        }

        // Setup Fire
        if (screenConfig.hasFire) {
            this.fire.active = true;
            this.fire.x = screenConfig.fireX || 320;
        }

        // Setup Scorpion (underground)
        if (screenConfig.hasScorpion) {
            this.scorpion.active = true;
            this.scorpion.x = 250;
        }

        // Setup Treasure
        if (screenConfig.treasureType && !screenConfig.treasureCollected) {
            let points = 2000;
            let color = '#C0C0C0';
            if (screenConfig.treasureType === 'GOLD') { points = 3000; color = '#FFD700'; }
            if (screenConfig.treasureType === 'MONEY') { points = 4000; color = '#85bb65'; }
            if (screenConfig.treasureType === 'RING') { points = 5000; color = '#00FFFF'; }

            this.treasure = {
                type: screenConfig.treasureType,
                x: screenConfig.treasureX || 520,
                y: screenConfig.treasureUnderground ? 340 : 210,
                width: 18,
                height: 16,
                points: points,
                color: color,
                collected: false
            };
        }
    }

    update(dt) {
        // Update Vine Pendulum Physics
        if (this.vine.active) {
            // Gravity pendulum acceleration = - (g/l) * sin(angle)
            const gravity = 0.003;
            const accel = -gravity * Math.sin(this.vine.angle);
            this.vine.angleVel += accel;
            this.vine.angle += this.vine.angleVel;
            // Slight damping for natural feel
            this.vine.angleVel *= 0.999;
        }

        // Update Crocodiles (mouth open/close state toggle)
        if (this.pitType === 'WATER') {
            this.crocTimer += dt;
            if (this.crocTimer > 120) { // ~2 seconds
                this.crocMouthOpen = !this.crocMouthOpen;
                this.crocTimer = 0;
            }
        }

        // Update Logs
        this.logs.forEach(log => {
            log.x -= log.speed;
            if (log.x < -40) {
                log.x = 640 + Math.random() * 80;
            }
        });

        // Update Scorpion
        if (this.scorpion.active) {
            this.scorpion.x += this.scorpion.speed * this.scorpion.dir;
            if (this.scorpion.x > 500) {
                this.scorpion.dir = -1;
            } else if (this.scorpion.x < 140) {
                this.scorpion.dir = 1;
            }
        }

        // Update Fire Animation
        if (this.fire.active) {
            this.fire.frame = (this.fire.frame + 0.15) % 3;
        }

        // Update Snake tongue animation
        if (this.snake.active) {
            this.snake.tongueTimer = (this.snake.tongueTimer + 0.1) % 2;
        }
    }

    getVineTipPos() {
        const x = this.vine.anchorX + Math.sin(this.vine.angle) * this.vine.length;
        const y = this.vine.anchorY + Math.cos(this.vine.angle) * this.vine.length;
        return { x, y };
    }

    draw(ctx) {
        // 1. Draw Pit (Water, Quicksand, Tar)
        if (this.pitType !== 'NONE') {
            const p = this.pitBounds;
            const pWidth = p.right - p.left;

            if (this.pitType === 'WATER') {
                ctx.fillStyle = '#1e5799';
                ctx.fillRect(p.left, 230, pWidth, 25);

                // Draw Crocodiles (3 crocs in a row)
                const crocWidth = 50;
                const spacing = (pWidth - 3 * crocWidth) / 4;
                for (let i = 0; i < 3; i++) {
                    const cx = p.left + spacing + i * (crocWidth + spacing);
                    const cy = 230;

                    // Croc Body (Green)
                    ctx.fillStyle = '#2d7c2d';
                    ctx.fillRect(cx, cy + 8, crocWidth, 12);
                    ctx.fillStyle = '#1a4d1a';
                    // Scales / back ridge
                    for (let s = 0; s < 4; s++) {
                        ctx.fillRect(cx + 6 + s * 10, cy + 4, 4, 4);
                    }

                    // Croc Eye
                    ctx.fillStyle = '#ffff00';
                    ctx.fillRect(cx + crocWidth - 10, cy + 3, 3, 3);

                    // Croc Mouth (Open or Closed)
                    if (this.crocMouthOpen) {
                        ctx.fillStyle = '#ff3333';
                        ctx.fillRect(cx + crocWidth - 14, cy + 6, 12, 6); // inside mouth
                        ctx.fillStyle = '#ffffff'; // teeth
                        ctx.fillRect(cx + crocWidth - 12, cy + 6, 3, 2);
                        ctx.fillRect(cx + crocWidth - 6, cy + 6, 3, 2);
                    } else {
                        // Mouth closed - flat top head suitable for standing!
                        ctx.fillStyle = '#2d7c2d';
                        ctx.fillRect(cx + crocWidth - 14, cy + 6, 14, 4);
                    }
                }
            } else if (this.pitType === 'QUICKSAND') {
                ctx.fillStyle = '#d2b48c';
                ctx.fillRect(p.left, 230, pWidth, 25);
                // Ripples
                ctx.fillStyle = '#c3a275';
                ctx.fillRect(p.left + 20, 238, 60, 4);
                ctx.fillRect(p.left + 140, 244, 70, 4);
            } else if (this.pitType === 'TAR') {
                ctx.fillStyle = '#111111';
                ctx.fillRect(p.left, 230, pWidth, 25);
                // Tar bubbles
                ctx.fillStyle = '#333333';
                ctx.fillRect(p.left + 40, 235, 12, 6);
                ctx.fillRect(p.left + 160, 240, 16, 5);
            }
        }

        // 2. Draw Ladder (if screen has one)
        if (this.hasLadder) {
            const lx = 300;
            ctx.fillStyle = '#8b5a2b';
            ctx.fillRect(lx, 230, 4, 130);
            ctx.fillRect(lx + 24, 230, 4, 130);
            for (let y = 235; y < 360; y += 12) {
                ctx.fillRect(lx, y, 28, 3);
            }
        }

        // 3. Draw Underground Wall
        if (this.undergroundWall) {
            ctx.fillStyle = '#8b2500';
            ctx.fillRect(280, 250, 40, 110);
            // Brick lines
            ctx.fillStyle = '#5c1800';
            for (let y = 250; y < 360; y += 10) {
                ctx.fillRect(280, y, 40, 2);
            }
        }

        // 4. Draw Vine
        if (this.vine.active) {
            const tip = this.getVineTipPos();
            ctx.strokeStyle = '#6b8e23';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(this.vine.anchorX, this.vine.anchorY);
            ctx.lineTo(tip.x, tip.y);
            ctx.stroke();

            // Vine knob / handle at bottom
            ctx.fillStyle = '#4f691a';
            ctx.beginPath();
            ctx.arc(tip.x, tip.y, 6, 0, Math.PI * 2);
            ctx.fill();
        }

        // 5. Draw Logs
        this.logs.forEach(log => {
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(log.x, log.y, log.width, log.height);
            ctx.fillStyle = '#5c2e0b';
            ctx.fillRect(log.x + 2, log.y + 2, log.width - 4, log.height - 4);
        });

        // 6. Draw Snake
        if (this.snake.active) {
            ctx.fillStyle = '#228b22';
            // Snake body coil
            ctx.fillRect(this.snake.x, this.snake.y + 6, 16, 9);
            ctx.fillRect(this.snake.x + 4, this.snake.y, 8, 8); // Snake head
            // Eye
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(this.snake.x + 5, this.snake.y + 2, 2, 2);
            // Tongue flicker
            if (Math.floor(this.snake.tongueTimer) === 1) {
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(this.snake.x - 4, this.snake.y + 4, 4, 2);
            }
        }

        // 7. Draw Fire
        if (this.fire.active) {
            const fFrame = Math.floor(this.fire.frame);
            ctx.fillStyle = '#ff4500';
            ctx.fillRect(this.fire.x, this.fire.y + 6, 20, 12);
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(this.fire.x + 4 - fFrame, this.fire.y, 12, 10);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(this.fire.x + 7, this.fire.y + 2, 6, 6);
        }

        // 8. Draw Scorpion (Underground)
        if (this.scorpion.active) {
            const s = this.scorpion;
            ctx.fillStyle = '#cc0000';
            ctx.fillRect(s.x, s.y, s.width, s.height);
            // Tail up
            ctx.fillRect(s.dir === 1 ? s.x : s.x + s.width - 4, s.y - 6, 4, 6);
            ctx.fillRect(s.dir === 1 ? s.x - 2 : s.x + s.width, s.y - 8, 4, 4);
            // Legs
            ctx.fillStyle = '#880000';
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(s.x + 4 + i * 6, s.y + s.height, 2, 4);
            }
        }

        // 9. Draw Treasure
        if (this.treasure && !this.treasure.collected) {
            const t = this.treasure;
            ctx.fillStyle = t.color;
            if (t.type === 'RING') {
                ctx.beginPath();
                ctx.arc(t.x + 8, t.y + 8, 7, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(t.x + 8, t.y + 8, 4, 0, Math.PI * 2);
                ctx.fill();
            } else if (t.type === 'MONEY') {
                ctx.fillRect(t.x + 2, t.y + 4, 14, 12);
                ctx.fillRect(t.x + 5, t.y, 8, 4);
                ctx.fillStyle = '#ffffff';
                ctx.font = '9px monospace';
                ctx.fillText('$', t.x + 6, t.y + 13);
            } else { // GOLD / SILVER BARS
                ctx.fillRect(t.x, t.y + 4, t.width, t.height - 4);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(t.x + 2, t.y + 6, t.width - 4, 2);
            }
        }
    }
}
