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
        this.navLeft = false;
        this.navRight = false;
        this.lastClick = null;

        this.initKeyboard();
        this.initTouch();
    }

    initKeyboard() {
        window.addEventListener('keydown', (e) => {
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyW", "KeyA", "KeyS", "KeyD", "Enter"].includes(e.code)) {
                e.preventDefault();
            }

            this.startPressed = true;
            if (window.soundFx) window.soundFx.init();

            switch (e.code) {
                case 'ArrowLeft':
                case 'KeyA':
                    if (!this.keys.left) this.navLeft = true;
                    this.keys.left = true;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    if (!this.keys.right) this.navRight = true;
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
                case 'Enter':
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
                case 'Enter':
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
                if (e.cancelable) e.preventDefault();
                this.startPressed = true;
                if (window.soundFx) window.soundFx.init();
                btn.classList.add('active');
                if (keyName === 'jump') {
                    this.keys.jump = true;
                } else {
                    this.keys[keyName] = true;
                    if (keyName === 'left') this.navLeft = true;
                    if (keyName === 'right') this.navRight = true;
                }
            };

            const handleEnd = (e) => {
                if (e.cancelable) e.preventDefault();
                btn.classList.remove('active');
                if (keyName === 'jump') {
                    this.keys.jump = false;
                } else {
                    this.keys[keyName] = false;
                }
            };

            btn.addEventListener('touchstart', handleStart, { passive: false });
            btn.addEventListener('touchend', handleEnd, { passive: false });
            btn.addEventListener('touchcancel', handleEnd, { passive: false });
            btn.addEventListener('mousedown', handleStart);
            btn.addEventListener('mouseup', handleEnd);
            btn.addEventListener('mouseleave', handleEnd);
        };

        attachTouch('btn-left', 'left');
        attachTouch('btn-right', 'right');
        attachTouch('btn-up', 'up');
        attachTouch('btn-down', 'down');
        attachTouch('btn-jump', 'jump');

        // Global canvas tap for clicks and start on mobile/desktop
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            const handleCanvasClick = (clientX, clientY) => {
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                this.lastClick = {
                    x: (clientX - rect.left) * scaleX,
                    y: (clientY - rect.top) * scaleY
                };
            };

            canvas.addEventListener('touchstart', (e) => {
                this.startPressed = true;
                if (window.soundFx) window.soundFx.init();
                if (e.touches && e.touches[0]) {
                    handleCanvasClick(e.touches[0].clientX, e.touches[0].clientY);
                }
            }, { passive: true });

            canvas.addEventListener('mousedown', (e) => {
                this.startPressed = true;
                if (window.soundFx) window.soundFx.init();
                handleCanvasClick(e.clientX, e.clientY);
            });
        }
    }

    consumeStart() {
        const pressed = this.startPressed;
        this.startPressed = false;
        return pressed;
    }

    consumeNav() {
        let dir = 0;
        if (this.navLeft) {
            dir = -1;
            this.navLeft = false;
        } else if (this.navRight) {
            dir = 1;
            this.navRight = false;
        }
        return dir;
    }

    consumeClick() {
        const click = this.lastClick;
        this.lastClick = null;
        return click;
    }
}
