// World Screen Generator & Environment Renderer
class ScreenManager {
    constructor() {
        this.currentScreenIndex = 0;
        this.totalScreens = 32;
        this.screens = [];
        this.generateScreens();
    }

    generateScreens() {
        const pitTypes = ['NONE', 'WATER', 'QUICKSAND', 'TAR', 'NONE', 'WATER', 'NONE'];
        const treasureTypes = [null, 'SILVER', 'GOLD', null, 'MONEY', 'RING', null];

        for (let i = 0; i < this.totalScreens; i++) {
            const pitType = pitTypes[i % pitTypes.length];
            const hasVine = (pitType !== 'NONE' && i % 2 === 1);
            const hasLadder = (i % 3 === 0);
            const undergroundWall = (!hasLadder && i % 4 === 1);
            const logCount = (pitType === 'NONE' && i % 2 === 0) ? (1 + (i % 3)) : 0;
            const hasSnake = (pitType === 'NONE' && i % 3 === 1 && logCount === 0);
            const hasFire = (pitType === 'NONE' && i % 5 === 2 && !hasSnake && logCount === 0);
            const hasScorpion = (i % 2 === 1);

            let treasure = treasureTypes[i % treasureTypes.length];
            // Don't place treasure on screen 0 (starting screen)
            if (i === 0) treasure = null;

            this.screens.push({
                index: i,
                pitType: pitType,
                hasVine: hasVine,
                hasLadder: hasLadder,
                undergroundWall: undergroundWall,
                logCount: logCount,
                hasSnake: hasSnake,
                hasFire: hasFire,
                hasScorpion: hasScorpion,
                treasureType: treasure,
                treasureUnderground: (i % 2 === 0),
                treasureCollected: false
            });
        }
    }

    getCurrentScreen() {
        return this.screens[this.currentScreenIndex];
    }

    nextScreen() {
        this.currentScreenIndex = (this.currentScreenIndex + 1) % this.totalScreens;
        return this.getCurrentScreen();
    }

    prevScreen() {
        this.currentScreenIndex = (this.currentScreenIndex - 1 + this.totalScreens) % this.totalScreens;
        return this.getCurrentScreen();
    }

    // Underground navigation (skips 3 screens ahead in classic Pitfall!)
    undergroundNext() {
        this.currentScreenIndex = (this.currentScreenIndex + 3) % this.totalScreens;
        return this.getCurrentScreen();
    }

    undergroundPrev() {
        this.currentScreenIndex = (this.currentScreenIndex - 3 + this.totalScreens) % this.totalScreens;
        return this.getCurrentScreen();
    }

    drawEnvironment(ctx) {
        // 1. Sky & Canopy Background (Dark Jungle Green)
        ctx.fillStyle = '#0f2409';
        ctx.fillRect(0, 0, 640, 230);

        // Jungle Tree Trunks (Left, Middle-Left, Middle-Right, Right)
        ctx.fillStyle = '#5c3a21';
        ctx.fillRect(20, 0, 40, 230);
        ctx.fillRect(160, 0, 35, 230);
        ctx.fillRect(440, 0, 35, 230);
        ctx.fillRect(580, 0, 40, 230);

        // Tree Leaf Canopy Tops
        ctx.fillStyle = '#2d6a1b';
        ctx.fillRect(0, 0, 640, 70);
        ctx.fillStyle = '#419628';
        ctx.fillRect(0, 50, 640, 20);

        // 2. Ground Surface Level (Green Turf / Grass)
        ctx.fillStyle = '#8db600';
        ctx.fillRect(0, 230, 640, 20);
        ctx.fillStyle = '#556b2f';
        ctx.fillRect(0, 245, 640, 5);

        // 3. Dirt / Underground Layer (Brown Earth + Red Brick Tunnel)
        ctx.fillStyle = '#3d2314';
        ctx.fillRect(0, 250, 640, 150);

        // Underground Floor / Brick Tunnel
        ctx.fillStyle = '#1c1009';
        ctx.fillRect(0, 360, 640, 40);

        // Underground Wall Background Pattern (Bricks)
        ctx.fillStyle = '#2b180d';
        for (let y = 260; y < 360; y += 20) {
            ctx.fillRect(0, y, 640, 2);
        }
        for (let x = 0; x < 640; x += 40) {
            ctx.fillRect(x, 260, 2, 100);
        }
    }
}
