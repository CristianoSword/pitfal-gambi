class InputHandler {
    constructor() {
        this.keys = {
            left: false,
            right: false,
            up: false,
            down: false,
            jump: false
        };

        this.startPressed = false;

        this.initKeyboard();
        this.initTouch();
    }

    initKeyboard() {
        window.addEventListener('keydown', (e) => {
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) {
                e.preventDefault();
            }

            this.startPressed = true;
            if (window.soundFx) window.soundFx.init();

            switch (e.code) {
                case 'ArrowLeft':
                case 'KeyA':
                    this.keys.left = true;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.keys.right = true;
                    break;
                case 'ArrowUp':
                case 'KeyW':
                    this.keys.up = true;
                    this.keys.jump = true;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.keys.down = true;
                    break;
                case 'Space':
                    this.keys.jump = true;
                    break;
            }
        });

        window.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'ArrowLeft':
                case 'KeyA':
                    this.keys.left = false;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.keys.right = false;
                    break;
                case 'ArrowUp':
                case 'KeyW':
                    this.keys.up = false;
                    this.keys.jump = false;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.keys.down = false;
                    break;
                case 'Space':
                    this.keys.jump = false;
                    break;
            }
        });
    }

    initTouch() {
        const attachTouch = (btnId, keyName) => {
            const btn = document.getElementById(btnId);
            if (!btn) return;

            const handleStart = (e) => {
                e.preventDefault();
                this.startPressed = true;
                if (window.soundFx) window.soundFx.init();
                btn.classList.add('active');
                if (keyName === 'jump') {
                    this.keys.jump = true;
                } else {
                    this.keys[keyName] = true;
                }
            };

            const handleEnd = (e) => {
                e.preventDefault();
                btn.classList.remove('active');
                if (keyName === 'jump') {
                    this.keys.jump = false;
                } else {
                    this.keys[keyName] = false;
                }
            };

            btn.addEventListener('touchstart', handleStart, { passive: false });
            btn.addEventListener('touchend', handleEnd, { passive: false });
            btn.addEventListener('mousedown', handleStart);
            btn.addEventListener('mouseup', handleEnd);
            btn.addEventListener('mouseleave', handleEnd);
        };

        attachTouch('btn-left', 'left');
        attachTouch('btn-right', 'right');
        attachTouch('btn-up', 'up');
        attachTouch('btn-down', 'down');
        attachTouch('btn-jump', 'jump');

        // Global canvas tap for starting game on mobile
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.addEventListener('touchstart', (e) => {
                this.startPressed = true;
                if (window.soundFx) window.soundFx.init();
            }, { passive: true });
            canvas.addEventListener('mousedown', () => {
                this.startPressed = true;
                if (window.soundFx) window.soundFx.init();
            });
        }
    }

    consumeStart() {
        const pressed = this.startPressed;
        this.startPressed = false;
        return pressed;
    }
}
