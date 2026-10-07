// Pitfall Harry Player Class with Multi-Character Selection, Physics & Animation
class Player {
    constructor() {
        this.width = 28;
        this.height = 48;
        
        // 3 Characters setup: Gambi (1), Gambizinho (2), Dona Gambi (3)
        this.characters = [
            { id: 0, name: "GAMBI", src: "graphics/player_sheet.png", heightRatio: 1.0 },
            { id: 1, name: "GAMBIZINHO", src: "graphics/player_sheet-2.png", heightRatio: 0.9 },
            { id: 2, name: "DONA GAMBI", src: "graphics/player_sheet-3.png", heightRatio: 0.95 }
        ];

        this.characterSheets = this.characters.map(c => {
            const img = new Image();
            img.src = c.src;
            return img;
        });

        this.selectedCharacter = 0;
        this.spriteSheet = this.characterSheets[0];
        this.vineCooldown = 0;

        this.reset();
    }

    setCharacter(index) {
        if (index >= 0 && index < this.characters.length) {
            this.selectedCharacter = index;
            this.spriteSheet = this.characterSheets[index];
        }
    }

    reset(x = 80, y = 182) {
        this.x = x;
        this.y = y; // Y coordinate is top-left of player bounding box
        this.vx = 0;
        this.vy = 0;
        this.facing = 'RIGHT'; // 'LEFT' or 'RIGHT'
        this.isGround = true;
        this.isUnderground = false;
        this.isClimbing = false;
        this.isSwinging = false;
        this.isSinking = false;
        this.isDying = false;
        this.deathTimer = 0;
        this.tripTimer = 0;
        this.vineCooldown = 0;
        this.jumpWasHeld = false; // track if jump was held when vine was grabbed

        this.animFrame = 0;
        this.animTimer = 0;

        // Constants adjusted for character height (48px)
        this.GROUND_Y = 182; // Ground level Y (230 - 48 height)
        this.UNDERGROUND_Y = 312; // Underground floor Y (360 - 48 height)
        this.SPEED = 3.2;
        this.JUMP_FORCE = -7.8;
        this.GRAVITY = 0.45;
    }

    update(input, hazardManager, game) {
        if (this.isDying) {
            this.deathTimer++;
            if (this.deathTimer > 60) {
                game.onPlayerDeath();
            }
            return;
        }

        if (this.tripTimer > 0) {
            this.tripTimer--;
            return;
        }

        if (this.vineCooldown > 0) {
            this.vineCooldown--;
        }

        // 1. Vine Swinging Physics & Controlled Jump Release
        if (this.isSwinging) {
            const tip = hazardManager.getVineTipPos();
            this.x = tip.x - this.width / 2;
            this.y = tip.y;

            // Track jump release so we don't release immediately if player was holding jump when grabbed
            if (this.jumpWasHeld && !input.keys.jump) {
                this.jumpWasHeld = false;
            }

            // Release Vine only on a fresh jump press (not held from before grab)
            if (!this.jumpWasHeld && input.keys.jump) {
                this.isSwinging = false;
                this.vineCooldown = 25;
                input.keys.jump = false;

                const swingDir = hazardManager.vine.angleVel >= 0 ? 1 : -1;
                const hSpeed = Math.max(3.5, Math.min(Math.abs(hazardManager.vine.angleVel) * 80, 5.5));
                this.vx = swingDir * hSpeed;
                if (input.keys.right) this.vx = Math.max(this.vx, 4.0);
                if (input.keys.left) this.vx = Math.min(this.vx, -4.0);

                this.vy = -5.8;
                this.isGround = false;
                this.facing = this.vx >= 0 ? 'RIGHT' : 'LEFT';

                if (window.soundFx) window.soundFx.playJump();
                return;
            }
            return;
        }

        // 2. Ladder Climbing Logic
        const onLadderZone = (this.x > 280 && this.x < 330 && hazardManager.hasLadder);

        if (this.isClimbing) {
            this.vx = 0;
            this.vy = 0;

            if (input.keys.up) {
                this.y -= 2;
                this.animTimer += 0.15;
            } else if (input.keys.down) {
                this.y += 2;
                this.animTimer += 0.15;
            }

            // Exit climbing at top or bottom
            if (this.y <= this.GROUND_Y) {
                this.y = this.GROUND_Y;
                this.isClimbing = false;
                this.isUnderground = false;
            } else if (this.y >= this.UNDERGROUND_Y) {
                this.y = this.UNDERGROUND_Y;
                this.isClimbing = false;
                this.isUnderground = true;
            }
            return;
        }

        if (onLadderZone && (input.keys.down && !this.isUnderground || input.keys.up && this.isUnderground)) {
            this.isClimbing = true;
            return;
        }

        // 3. Movement Controls (Left / Right)
        this.vx = 0;
        if (input.keys.left) {
            this.vx = -this.SPEED;
            this.facing = 'LEFT';
        } else if (input.keys.right) {
            this.vx = this.SPEED;
            this.facing = 'RIGHT';
        }

        // 4. Jump Action
        const currentTargetY = this.isUnderground ? this.UNDERGROUND_Y : this.GROUND_Y;
        if (input.keys.jump && this.isGround && !this.isSinking) {
            this.vy = this.JUMP_FORCE;
            this.isGround = false;
            if (window.soundFx) window.soundFx.playJump();
        }

        // 5. Gravity & Vertical Movement
        if (!this.isGround) {
            this.vy += this.GRAVITY;
        }
        this.x += this.vx;
        this.y += this.vy;

        // Ceiling clamp so player never shoots above screen
        if (this.y < 20) {
            this.y = 20;
            if (this.vy < 0) this.vy = 0;
        }

        // 6. Underground Brick Wall Blocking
        if (this.isUnderground && hazardManager.undergroundWall) {
            if (this.x + this.width > 280 && this.x < 320) {
                if (this.vx > 0) this.x = 280 - this.width;
                if (this.vx < 0) this.x = 320;
            }
        }

        // 7. Check Vine Collision / Grab (with vineCooldown exception check)
        if (hazardManager.vine.active && !this.isSwinging && this.vineCooldown <= 0 && this.vy >= 0 && this.y < 230) {
            const tip = hazardManager.getVineTipPos();
            const dx = (this.x + this.width / 2) - tip.x;
            const dy = (this.y + 15) - tip.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 24) {
                this.isSwinging = true;
                this.vy = 0;
                this.vx = 0;
                // If jump was held when grabbed, require release before vine jump
                this.jumpWasHeld = input.keys.jump;
                if (window.soundFx) window.soundFx.playSwing();
            }
        }

        // 8. Pit Hazards & Landing Logic
        const inPitZone = (!this.isUnderground && hazardManager.pitType !== 'NONE' &&
            this.x + this.width > hazardManager.pitBounds.left &&
            this.x < hazardManager.pitBounds.right);

        if (inPitZone && this.y >= this.GROUND_Y && this.vy >= 0 && !this.isSwinging) {
            if (hazardManager.pitType === 'WATER') {
                let landedOnCroc = false;
                let hitCrocMouth = false;

                const pLeft = hazardManager.pitBounds.left;
                const crocWidth = 50;
                const spacing = ((hazardManager.pitBounds.right - pLeft) - 3 * crocWidth) / 4;

                for (let i = 0; i < 3; i++) {
                    const cx = pLeft + spacing + i * (crocWidth + spacing);
                    if (this.x + this.width > cx && this.x < cx + crocWidth) {
                        if (hazardManager.crocMouthOpen && this.x + this.width > cx + crocWidth - 14) {
                            hitCrocMouth = true;
                        } else {
                            landedOnCroc = true;
                        }
                    }
                }

                if (hitCrocMouth) {
                    this.triggerDeath(game);
                } else if (landedOnCroc) {
                    this.y = this.GROUND_Y;
                    this.vy = 0;
                    this.isGround = true;
                } else {
                    this.triggerDeath(game);
                }
            } else if (hazardManager.pitType === 'QUICKSAND' || hazardManager.pitType === 'TAR') {
                if (!this.isSinking) {
                    this.isSinking = true;
                    this.vy = 0;
                    this.isGround = true;
                }
                this.y += 0.5;
                if (this.y > 220) {
                    this.triggerDeath(game);
                }
            }
        } else {
            this.isSinking = false;
            if (this.vy >= 0 && this.y >= currentTargetY) {
                this.y = currentTargetY;
                this.vy = 0;
                this.isGround = true;
            }
        }

        // 9. Log Collision
        if (!this.isUnderground && !this.isSwinging) {
            hazardManager.logs.forEach(log => {
                if (this.checkRectOverlap(this, log)) {
                    this.tripTimer = 20;
                    game.subScore(100);
                    if (window.soundFx) window.soundFx.playLogHit();
                    this.x += (this.facing === 'RIGHT') ? -12 : 12;
                }
            });
        }

        // 10. Snake / Fire / Scorpion Collision
        if (!this.isUnderground && hazardManager.snake.active) {
            if (this.checkRectOverlap(this, hazardManager.snake)) {
                this.triggerDeath(game);
            }
        }
        if (!this.isUnderground && hazardManager.fire.active) {
            if (this.checkRectOverlap(this, hazardManager.fire)) {
                this.triggerDeath(game);
            }
        }
        if (this.isUnderground && hazardManager.scorpion.active) {
            if (this.checkRectOverlap(this, hazardManager.scorpion)) {
                this.triggerDeath(game);
            }
        }

        // 11. Treasure Collision
        if (hazardManager.treasure && !hazardManager.treasure.collected) {
            const t = hazardManager.treasure;
            const sameLevel = (this.isUnderground ? (t.y > 300) : (t.y < 300));
            if (sameLevel && this.checkRectOverlap(this, t)) {
                t.collected = true;
                game.addScore(t.points);
                if (window.soundFx) window.soundFx.playTreasure();
            }
        }

        // 12. Screen Transition Edge Detection
        if (this.x < -this.width + 5) {
            game.changeScreen(this.isUnderground ? 'UNDERGROUND_PREV' : 'PREV');
            this.x = 640 - this.width - 5;
        } else if (this.x > 640 - 5) {
            game.changeScreen(this.isUnderground ? 'UNDERGROUND_NEXT' : 'NEXT');
            this.x = 5;
        }

        // Animation Timer
        if (this.vx !== 0 && this.isGround) {
            this.animTimer += 0.22;
        }
    }

    checkRectOverlap(r1, r2) {
        return (r1.x < r2.x + r2.width &&
            r1.x + r1.width > r2.x &&
            r1.y < r2.y + r2.height &&
            r1.y + r1.height > r2.y);
    }

    triggerDeath(game) {
        if (this.isDying) return;
        this.isDying = true;
        this.deathTimer = 0;
        if (window.soundFx) window.soundFx.playDeath();
    }

    draw(ctx) {
        ctx.save();

        if (this.isDying) {
            if (this.deathTimer % 6 < 3) {
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(this.x, this.y, this.width, this.height);
                ctx.restore();
                return;
            }
        }

        // Select sprite frame index from 7-frame sprite sheet
        // 0: IDLE, 1..2: RUNNING, 3: JUMP/SWING, 4..5: CLIMB, 6: HURT
        let frameIdx = 0;

        if (this.isDying) {
            frameIdx = 6; // HURT
        } else if (this.isClimbing) {
            frameIdx = (Math.floor(this.animTimer) % 2 === 0) ? 4 : 5; // CLIMB 1 & 2
        } else if (this.isSwinging || !this.isGround) {
            frameIdx = 3; // JUMP / SWING
        } else if (this.vx !== 0) {
            const runFrames = [1, 2];
            frameIdx = runFrames[Math.floor(this.animTimer) % 2]; // RUN 1 & 2
        }

        if (this.spriteSheet.complete && this.spriteSheet.naturalWidth > 0) {
            ctx.imageSmoothingEnabled = false;

            const totalWidth = this.spriteSheet.naturalWidth;
            const totalHeight = this.spriteSheet.naturalHeight;
            const sw = totalWidth / 7;
            const sh = totalHeight;
            const sx = frameIdx * sw;

            const heightRatio = (this.characters[this.selectedCharacter] && this.characters[this.selectedCharacter].heightRatio) || 1.0;
            const drawH = Math.round(60 * heightRatio);
            const drawW = Math.round(drawH * (sw / sh));
            const drawX = Math.floor(this.x - (drawW - this.width) / 2);
            const drawY = Math.floor(this.y - (drawH - this.height));

            if (this.facing === 'LEFT') {
                ctx.translate(drawX + drawW, drawY);
                ctx.scale(-1, 1);
                ctx.drawImage(
                    this.spriteSheet,
                    sx, 0, sw, sh,
                    0, 0, drawW, drawH
                );
            } else {
                ctx.drawImage(
                    this.spriteSheet,
                    sx, 0, sw, sh,
                    drawX, drawY, drawW, drawH
                );
            }

            // Subtle CRT Scanline Interlace directly over player sprite
            ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
            for (let sy = drawY; sy < drawY + drawH; sy += 3) {
                ctx.fillRect(drawX, sy, drawW, 1);
            }
        } else {
            ctx.fillStyle = '#228b22';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        ctx.restore();
    }
}
