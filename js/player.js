// Pitfall Harry Player Class with Physics, Animation & Collision
class Player {
    constructor() {
        this.width = 18;
        this.height = 25;
        this.reset();
    }

    reset(x = 80, y = 205) {
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

        this.animFrame = 0;
        this.animTimer = 0;

        // Constants
        this.GROUND_Y = 205; // Ground level Y (230 - 25 height)
        this.UNDERGROUND_Y = 335; // Underground floor Y (360 - 25 height)
        this.SPEED = 3.0;
        this.JUMP_FORCE = -7.5;
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

        // 1. Vine Swinging Physics
        if (this.isSwinging) {
            const tip = hazardManager.getVineTipPos();
            this.x = tip.x - this.width / 2;
            this.y = tip.y;

            // Release Vine on Jump or Up
            if (input.keys.jump) {
                this.isSwinging = false;
                // Give player velocity based on vine swing angleVel & direction
                const vAngle = hazardManager.vine.angle;
                const vVel = hazardManager.vine.angleVel;
                this.vx = Math.cos(vAngle) * vVel * 120 + (input.keys.right ? 2 : (input.keys.left ? -2 : 0));
                this.vy = this.JUMP_FORCE * 0.8;
                if (window.soundFx) window.soundFx.playJump();
            }
            return;
        }

        // 2. Ladder Climbing Logic
        const onLadderZone = (this.x > 285 && this.x < 325 && hazardManager.hasLadder);

        if (this.isClimbing) {
            this.vx = 0;
            this.vy = 0;

            if (input.keys.up) {
                this.y -= 2;
                this.animFrame = (this.animFrame + 0.1) % 2;
            } else if (input.keys.down) {
                this.y += 2;
                this.animFrame = (this.animFrame + 0.1) % 2;
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
        if (!this.isGround && !this.isSinking) {
            this.vy += this.GRAVITY;
        }
        this.x += this.vx;
        this.y += this.vy;

        // 6. Underground Brick Wall Blocking
        if (this.isUnderground && hazardManager.undergroundWall) {
            // Wall is located at X: 280 to 320
            if (this.x + this.width > 280 && this.x < 320) {
                if (this.vx > 0) this.x = 280 - this.width;
                if (this.vx < 0) this.x = 320;
            }
        }

        // 7. Check Vine Collision / Grab
        if (hazardManager.vine.active && !this.isSwinging && this.vy >= 0 && this.y < 230) {
            const tip = hazardManager.getVineTipPos();
            const dx = (this.x + this.width / 2) - tip.x;
            const dy = (this.y + 10) - tip.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 22) {
                this.isSwinging = true;
                this.vy = 0;
                this.vx = 0;
                if (window.soundFx) window.soundFx.playSwing();
            }
        }

        // 8. Pit Hazards & Landing Logic
        const inPitZone = (!this.isUnderground && hazardManager.pitType !== 'NONE' &&
            this.x + this.width > hazardManager.pitBounds.left &&
            this.x < hazardManager.pitBounds.right);

        if (inPitZone && this.y >= this.GROUND_Y && !this.isSwinging) {
            if (hazardManager.pitType === 'WATER') {
                // Check Crocodiles landing!
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
                    // Fell into water!
                    this.triggerDeath(game);
                }
            } else if (hazardManager.pitType === 'QUICKSAND' || hazardManager.pitType === 'TAR') {
                this.isSinking = true;
                this.y += 0.5;
                if (this.y > 240) {
                    this.triggerDeath(game);
                }
            }
        } else {
            // Normal Ground Collision
            if (this.y >= currentTargetY) {
                this.y = currentTargetY;
                this.vy = 0;
                this.isGround = true;
            }
        }

        // 9. Log Collision (Upper level)
        if (!this.isUnderground && !this.isSwinging) {
            hazardManager.logs.forEach(log => {
                if (this.checkRectOverlap(this, log)) {
                    this.tripTimer = 20; // Stun / trip player briefly
                    game.subScore(100);
                    if (window.soundFx) window.soundFx.playLogHit();
                    // Bounce back slightly
                    this.x += (this.facing === 'RIGHT') ? -10 : 10;
                }
            });
        }

        // 10. Snake / Fire / Scorpion Collision (Fatal Hazards)
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
            const sameLevel = (this.isUnderground && hazardManager.screens ? true : (!this.isUnderground === (t.y < 300)));
            if (sameLevel && this.checkRectOverlap(this, t)) {
                t.collected = true;
                game.addScore(t.points);
                if (window.soundFx) window.soundFx.playTreasure();
            }
        }

        // 12. Screen Transition Edge Detection (Left / Right boundaries)
        if (this.x < -this.width + 5) {
            game.changeScreen(this.isUnderground ? 'UNDERGROUND_PREV' : 'PREV');
            this.x = 640 - this.width - 5;
        } else if (this.x > 640 - 5) {
            game.changeScreen(this.isUnderground ? 'UNDERGROUND_NEXT' : 'NEXT');
            this.x = 5;
        }

        // Animation counter
        if (this.vx !== 0 && this.isGround) {
            this.animTimer += 0.2;
            this.animFrame = Math.floor(this.animTimer) % 4;
        } else if (this.isGround) {
            this.animFrame = 0;
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
            // Flash red on death
            ctx.fillStyle = (this.deathTimer % 6 < 3) ? '#ff0000' : '#ffffff';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.restore();
            return;
        }

        // Draw Pitfall Harry Sprite (Pixel art style)
        // Green shirt, brown pants, skin tone head/arms, yellow hat
        const x = Math.floor(this.x);
        const y = Math.floor(this.y);

        // Hat (Yellow/Tan Atari Pitfall Hat)
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(x + 2, y, 14, 4);
        ctx.fillRect(x + (this.facing === 'RIGHT' ? 4 : 0), y + 3, 14, 2);

        // Head (Skin tone)
        ctx.fillStyle = '#ffcc99';
        ctx.fillRect(x + 4, y + 4, 10, 6);

        // Eyes / Hair
        ctx.fillStyle = '#5c3a21';
        ctx.fillRect(x + (this.facing === 'RIGHT' ? 10 : 4), y + 5, 3, 2);

        // Shirt (Green Jungle Vest)
        ctx.fillStyle = '#228b22';
        ctx.fillRect(x + 3, y + 10, 12, 8);

        // Arms
        ctx.fillStyle = '#ffcc99';
        if (this.isSwinging || this.isClimbing) {
            // Arms raised up
            ctx.fillRect(x, y + 4, 4, 8);
            ctx.fillRect(x + 14, y + 4, 4, 8);
        } else {
            ctx.fillRect(this.facing === 'RIGHT' ? x + 13 : x + 1, y + 10, 4, 6);
        }

        // Pants (Brown)
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(x + 3, y + 18, 12, 4);

        // Legs & Running Animation Frames
        ctx.fillStyle = '#5c2e0b';
        if (!this.isGround && !this.isClimbing && !this.isSwinging) {
            // Jump pose (Legs tucked)
            ctx.fillRect(x + 2, y + 20, 5, 5);
            ctx.fillRect(x + 11, y + 20, 5, 5);
        } else if (this.animFrame === 1) {
            ctx.fillRect(x, y + 21, 5, 4);
            ctx.fillRect(x + 13, y + 21, 5, 4);
        } else if (this.animFrame === 3) {
            ctx.fillRect(x + 2, y + 21, 6, 4);
            ctx.fillRect(x + 10, y + 21, 6, 4);
        } else {
            // Standing pose
            ctx.fillRect(x + 3, y + 21, 4, 4);
            ctx.fillRect(x + 11, y + 21, 4, 4);
        }

        ctx.restore();
    }
}
