/**
 * Subway Game - Main game controller
 * Handles game loop, player state, and scene management
 */

class SubwayGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    if (!this.canvas) {
      console.error('Canvas element not found!');
      return;
    }

    this.ctx = this.canvas.getContext('2d');

    // Set canvas size
    this.canvas.width = 800;
    this.canvas.height = 600;

    // Game components
    this.raycaster = new Raycaster(this.canvas);

    // Player state
    this.player = {
      x: 7.5,         // Starting position X (center of platform)
      y: 5.0,         // Starting position Y
      angle: 0,       // Viewing angle (radians)
      moveSpeed: 0.05,   // Movement speed
      rotSpeed: 0.03     // Rotation speed
    };

    // Input state
    this.keys = {};
    this.mouse = {
      locked: false,
      sensitivity: 0.002
    };

    // Game state
    this.running = false;
    this.lastTime = 0;

    // Instructions overlay
    this.showInstructions = true;
  }

  /**
   * Initialize the game
   */
  async init() {
    console.log('Initializing subway game...');

    // Load raycaster textures
    await this.raycaster.loadTextures();

    // Setup input handlers
    this.setupInput();

    // Start game loop
    this.running = true;
    this.lastTime = performance.now();
    this.gameLoop();

    console.log('Game initialized!');
  }

  /**
   * Setup keyboard and mouse input
   */
  setupInput() {
    // Keyboard input
    document.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;

      // Hide instructions on first keypress
      if (this.showInstructions) {
        this.showInstructions = false;
        const overlay = document.getElementById('instructions-overlay');
        if (overlay) overlay.style.display = 'none';
      }
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    // Mouse input (pointer lock for FPS controls)
    this.canvas.addEventListener('click', () => {
      this.canvas.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      this.mouse.locked = document.pointerLockElement === this.canvas;
      console.log('Pointer lock:', this.mouse.locked);
    });

    document.addEventListener('mousemove', (e) => {
      if (this.mouse.locked) {
        this.player.angle += e.movementX * this.mouse.sensitivity;
      }
    });

    // Exit pointer lock on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.mouse.locked) {
        document.exitPointerLock();
      }
    });
  }

  /**
   * Main game loop
   */
  gameLoop() {
    if (!this.running) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 16.67; // Normalize to 60fps
    this.lastTime = currentTime;

    // Update game state
    this.update(deltaTime);

    // Render frame
    this.render();

    // Continue loop
    requestAnimationFrame(() => this.gameLoop());
  }

  /**
   * Update game state
   */
  update(deltaTime) {
    this.handleMovement(deltaTime);
  }

  /**
   * Handle player movement
   */
  handleMovement(deltaTime) {
    const moveSpeed = this.player.moveSpeed * deltaTime;
    const rotSpeed = this.player.rotSpeed * deltaTime;

    // Rotation (A/D or Arrow Keys)
    if (this.keys['arrowleft']) {
      this.player.angle -= rotSpeed;
    }
    if (this.keys['arrowright']) {
      this.player.angle += rotSpeed;
    }

    // Calculate movement direction
    let moveX = 0;
    let moveY = 0;

    // Forward/Backward (W/S)
    if (this.keys['w'] || this.keys['arrowup']) {
      moveX += Math.cos(this.player.angle) * moveSpeed;
      moveY += Math.sin(this.player.angle) * moveSpeed;
    }
    if (this.keys['s'] || this.keys['arrowdown']) {
      moveX -= Math.cos(this.player.angle) * moveSpeed;
      moveY -= Math.sin(this.player.angle) * moveSpeed;
    }

    // Strafe (A/D when mouse locked)
    if (this.mouse.locked) {
      if (this.keys['a']) {
        moveX += Math.cos(this.player.angle - Math.PI / 2) * moveSpeed;
        moveY += Math.sin(this.player.angle - Math.PI / 2) * moveSpeed;
      }
      if (this.keys['d']) {
        moveX += Math.cos(this.player.angle + Math.PI / 2) * moveSpeed;
        moveY += Math.sin(this.player.angle + Math.PI / 2) * moveSpeed;
      }
    }

    // Apply movement with collision detection
    if (moveX !== 0 || moveY !== 0) {
      this.movePlayer(moveX, moveY);
    }
  }

  /**
   * Move player with collision detection
   */
  movePlayer(dx, dy) {
    const newX = this.player.x + dx;
    const newY = this.player.y + dy;

    // Check collision with walls
    const mapX = Math.floor(newX);
    const mapY = Math.floor(newY);

    // Check if new position is valid
    const canMoveX = this.raycaster.map[Math.floor(this.player.y)][mapX] === 0;
    const canMoveY = this.raycaster.map[mapY][Math.floor(this.player.x)] === 0;

    // Apply movement (slide along walls)
    if (canMoveX) {
      this.player.x = newX;
    }
    if (canMoveY) {
      this.player.y = newY;
    }
  }

  /**
   * Render current frame
   */
  render() {
    // Render 3D view with raycaster
    this.raycaster.render(this.player);

    // Render HUD overlay
    this.renderHUD();
  }

  /**
   * Render HUD (heads-up display)
   */
  renderHUD() {
    this.ctx.save();

    // Draw crosshair
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const crosshairSize = 10;

    this.ctx.beginPath();
    this.ctx.moveTo(centerX - crosshairSize, centerY);
    this.ctx.lineTo(centerX + crosshairSize, centerY);
    this.ctx.moveTo(centerX, centerY - crosshairSize);
    this.ctx.lineTo(centerX, centerY + crosshairSize);
    this.ctx.stroke();

    // Draw debug info (optional)
    if (this.keys['`']) {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '12px monospace';
      this.ctx.fillText(`Position: ${this.player.x.toFixed(2)}, ${this.player.y.toFixed(2)}`, 10, 20);
      this.ctx.fillText(`Angle: ${(this.player.angle * 180 / Math.PI).toFixed(1)}°`, 10, 40);
      this.ctx.fillText(`Pointer Lock: ${this.mouse.locked}`, 10, 60);
    }

    this.ctx.restore();
  }

  /**
   * Stop the game loop
   */
  stop() {
    this.running = false;
  }
}

// Initialize game when page loads
let game = null;

window.addEventListener('load', () => {
  console.log('Page loaded, initializing game...');
  game = new SubwayGame();
  game.init();
});
