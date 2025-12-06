/**
 * Raycaster Engine - 2.5D Doom-style rendering
 * Based on DDA (Digital Differential Analysis) algorithm
 */

class Raycaster {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 800;
    this.height = 600;
    this.fov = Math.PI / 3; // 60 degrees

    // Subway platform map (1=white tiles, 2=cream tiles, 3=concrete, 4=poster wall)
    this.map = [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
      [2,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
      [2,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
      [2,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
      [3,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
      [3,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
      [3,3,3,3,0,0,0,0,0,0,0,3,3,3,3]
    ];

    this.mapWidth = this.map[0].length;
    this.mapHeight = this.map.length;

    // Sprites (objects in the world)
    // scale: how tall the sprite appears (1.0 = full wall height, 0.5 = half height, etc.)
    this.sprites = [
      { x: 3.5, y: 3.5, type: 'turnstile', texture: null, scale: 0.8 },
      { x: 2.0, y: 2.0, type: 'bench', texture: null, scale: 0.4 },
      { x: 12.0, y: 2.0, type: 'bench', texture: null, scale: 0.4 },
      { x: 7.5, y: 2.0, type: 'column', texture: null, scale: 1.2 },
      { x: 7.5, y: 6.0, type: 'column', texture: null, scale: 1.2 },
      { x: 2.0, y: 7.0, type: 'trash', texture: null, scale: 0.5 },
      { x: 12.0, y: 7.0, type: 'trash', texture: null, scale: 0.5 },
      { x: 7.5, y: 8.0, type: 'sign', texture: null, scale: 0.35 }
    ];

    // Textures (will be loaded)
    this.textures = {};
    this.spriteTextures = {};
    this.texturesLoaded = false;

    // Z-buffer for sprite rendering
    this.zBuffer = new Array(this.width);

    // Drawing buffers
    this.floorColor = '#3a3a3a';
    this.ceilingColor = '#1a1a1a';
  }

  /**
   * Load wall textures and sprites
   */
  async loadTextures() {
    // Create procedural wall textures
    this.textures = {
      1: this.createTileTexture('#e0e0e0', '#d0d0d0'), // White subway tiles
      2: this.createTileTexture('#f5f5dc', '#e5e5cc'), // Cream tiles
      3: this.createConcreteTexture('#5a5a5a', '#4a4a4a'), // Concrete
      4: this.createPosterWallTexture('#d0d0d0', '#4a90e2') // Poster wall
    };

    // Create procedural sprite textures
    this.spriteTextures = {
      'turnstile': this.createTurnstileSprite(),
      'bench': this.createBenchSprite(),
      'column': this.createColumnSprite(),
      'trash': this.createTrashSprite(),
      'sign': this.createSignSprite()
    };

    // Try to load external images (optional - will use procedural if not found)
    // Uncomment these lines to load from image files instead:
    // await this.loadExternalSprite('turnstile', '../assets/images/subway/sprites/turnstile.png');
    // await this.loadExternalSprite('bench', '../assets/images/subway/sprites/bench.png');
    await this.loadExternalSprite('trash', '../assets/images/subway/sprites/trash.png');
    await this.loadExternalSprite('sign', '../assets/images/subway/sprites/sign.png');

    // Assign textures to sprites
    this.sprites.forEach(sprite => {
      sprite.texture = this.spriteTextures[sprite.type];
    });

    this.texturesLoaded = true;
  }

  /**
   * Load external sprite image file
   */
  async loadExternalSprite(spriteName, imagePath) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.spriteTextures[spriteName] = img;
        console.log(`Loaded external sprite: ${spriteName}`);
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`Failed to load ${imagePath}, using procedural sprite`);
        resolve(null); // Don't reject, just keep procedural
      };
      img.src = imagePath;
    });
  }

  /**
   * Create a simple tile texture procedurally
   */
  createTileTexture(color1, color2) {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Create tile pattern
    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, size, size);

    // Add tile lines
    ctx.strokeStyle = color2;
    ctx.lineWidth = 2;

    // Vertical lines
    for (let x = 0; x < size; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y < size; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    return canvas;
  }

  /**
   * Create concrete texture
   */
  createConcreteTexture(color1, color2) {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, size, size);

    // Add random noise for concrete texture
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const brightness = Math.random() * 30 - 15;
      ctx.fillStyle = `rgb(${90 + brightness}, ${90 + brightness}, ${90 + brightness})`;
      ctx.fillRect(x, y, 2, 2);
    }

    return canvas;
  }

  /**
   * Create poster wall texture
   */
  createPosterWallTexture(bgColor, posterColor) {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);

    // Add some "posters"
    ctx.fillStyle = posterColor;
    ctx.fillRect(5, 5, 20, 25);
    ctx.fillRect(35, 10, 20, 20);

    return canvas;
  }

  /**
   * Create turnstile sprite
   */
  createTurnstileSprite() {
    const width = 64;
    const height = 96;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Yellow/silver turnstile bars
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(10, 30, 44, 50);

    ctx.fillStyle = '#ffd700';
    ctx.fillRect(15, 40, 8, 40);
    ctx.fillRect(25, 40, 8, 40);
    ctx.fillRect(35, 40, 8, 40);

    // Base
    ctx.fillStyle = '#666';
    ctx.fillRect(5, 80, 54, 16);

    return canvas;
  }

  /**
   * Create bench sprite
   */
  createBenchSprite() {
    const width = 96;
    const height = 48;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Bench seat
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(10, 15, 76, 12);

    // Bench back
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(10, 5, 76, 8);

    // Legs
    ctx.fillStyle = '#666';
    ctx.fillRect(15, 27, 4, 18);
    ctx.fillRect(77, 27, 4, 18);

    return canvas;
  }

  /**
   * Create column sprite
   */
  createColumnSprite() {
    const width = 48;
    const height = 128;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Column body
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(10, 0, 28, 128);

    // Add shadows/highlights
    ctx.fillStyle = '#b0b0b0';
    ctx.fillRect(10, 0, 4, 128);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(34, 0, 4, 128);

    return canvas;
  }

  /**
   * Create trash can sprite
   */
  createTrashSprite() {
    const width = 48;
    const height = 64;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // NYC-style metal trash can

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.ellipse(24, 60, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body (cylinder shape with shading)
    const gradient = ctx.createLinearGradient(10, 0, 38, 0);
    gradient.addColorStop(0, '#3a3a3a');
    gradient.addColorStop(0.3, '#5a5a5a');
    gradient.addColorStop(0.7, '#4a4a4a');
    gradient.addColorStop(1, '#2a2a2a');
    ctx.fillStyle = gradient;
    ctx.fillRect(10, 20, 28, 36);

    // Top rim
    ctx.fillStyle = '#666';
    ctx.fillRect(8, 18, 32, 3);

    // Bottom rim
    ctx.fillStyle = '#555';
    ctx.fillRect(10, 55, 28, 2);

    // Lid dome
    ctx.fillStyle = '#5a5a5a';
    ctx.beginPath();
    ctx.ellipse(24, 18, 14, 6, 0, Math.PI, 2 * Math.PI);
    ctx.fill();

    // Lid top highlight
    ctx.fillStyle = '#6a6a6a';
    ctx.beginPath();
    ctx.ellipse(24, 16, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lid handle
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(24, 14, 6, 0, Math.PI, true);
    ctx.stroke();

    // Horizontal bands (NYC trash can detail)
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 1;
    for (let y = 28; y < 55; y += 8) {
      ctx.beginPath();
      ctx.moveTo(10, y);
      ctx.lineTo(38, y);
      ctx.stroke();
    }

    // Vertical highlights (metallic look)
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(16, 20);
    ctx.lineTo(16, 55);
    ctx.stroke();

    return canvas;
  }

  /**
   * Create sign sprite
   */
  createSignSprite() {
    const width = 96;
    const height = 48;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Sign background
    ctx.fillStyle = '#000';
    ctx.fillRect(10, 10, 76, 28);

    // Border
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 76, 28);

    // Text (simplified)
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('A TRAIN', 18, 28);

    return canvas;
  }

  /**
   * Main rendering function - cast rays for entire view
   */
  render(player) {
    if (!this.texturesLoaded) return;

    // Clear screen
    this.drawBackground();

    // Cast one ray per vertical screen column
    const numRays = this.width;

    for (let x = 0; x < numRays; x++) {
      // Calculate ray angle
      const cameraX = 2 * x / numRays - 1; // x-coordinate in camera space (-1 to 1)
      const rayAngle = player.angle + Math.atan(cameraX * Math.tan(this.fov / 2));

      // Ray direction
      const rayDirX = Math.cos(rayAngle);
      const rayDirY = Math.sin(rayAngle);

      // Perform DDA raycasting
      const hit = this.castRay(player.x, player.y, rayDirX, rayDirY);

      if (hit) {
        // Calculate perpendicular distance to avoid fish-eye effect
        const perpDistance = hit.distance * Math.cos(rayAngle - player.angle);

        // Store in z-buffer for sprite rendering
        this.zBuffer[x] = perpDistance;

        // Calculate wall height on screen
        const wallHeight = (this.height / perpDistance) * 0.5;

        // Calculate draw positions
        const drawStart = Math.max(0, (this.height - wallHeight) / 2);
        const drawEnd = Math.min(this.height, (this.height + wallHeight) / 2);

        // Draw textured wall strip
        this.drawWallStrip(x, drawStart, drawEnd, hit.textureId, hit.textureX, perpDistance);
      } else {
        this.zBuffer[x] = Infinity;
      }
    }

    // Render sprites after walls
    this.renderSprites(player);
  }

  /**
   * Draw floor and ceiling
   */
  drawBackground() {
    // Ceiling
    this.ctx.fillStyle = this.ceilingColor;
    this.ctx.fillRect(0, 0, this.width, this.height / 2);

    // Floor
    this.ctx.fillStyle = this.floorColor;
    this.ctx.fillRect(0, this.height / 2, this.width, this.height / 2);
  }

  /**
   * Cast a single ray using DDA algorithm
   */
  castRay(startX, startY, dirX, dirY) {
    // Current map position
    let mapX = Math.floor(startX);
    let mapY = Math.floor(startY);

    // Length of ray from one side to next in map
    const deltaDistX = Math.abs(1 / dirX);
    const deltaDistY = Math.abs(1 / dirY);

    // Step direction
    const stepX = dirX < 0 ? -1 : 1;
    const stepY = dirY < 0 ? -1 : 1;

    // Initial side distances
    let sideDistX = dirX < 0
      ? (startX - mapX) * deltaDistX
      : (mapX + 1 - startX) * deltaDistX;
    let sideDistY = dirY < 0
      ? (startY - mapY) * deltaDistY
      : (mapY + 1 - startY) * deltaDistY;

    // Perform DDA
    let hit = false;
    let side; // 0 = vertical wall, 1 = horizontal wall
    let wallType = 0;

    const maxDistance = 20; // Maximum ray distance
    let iterations = 0;

    while (!hit && iterations < maxDistance) {
      // Jump to next map square
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }

      // Check if ray has hit a wall
      if (mapX < 0 || mapX >= this.mapWidth || mapY < 0 || mapY >= this.mapHeight) {
        break; // Out of bounds
      }

      wallType = this.map[mapY][mapX];
      if (wallType > 0) {
        hit = true;
      }

      iterations++;
    }

    if (!hit) return null;

    // Calculate distance
    let distance;
    if (side === 0) {
      distance = (mapX - startX + (1 - stepX) / 2) / dirX;
    } else {
      distance = (mapY - startY + (1 - stepY) / 2) / dirY;
    }

    // Calculate texture X coordinate (0 to 1)
    let wallX;
    if (side === 0) {
      wallX = startY + distance * dirY;
    } else {
      wallX = startX + distance * dirX;
    }
    wallX = wallX - Math.floor(wallX);

    return {
      distance: distance,
      textureId: wallType,
      textureX: wallX,
      side: side
    };
  }

  /**
   * Draw a vertical strip of textured wall
   */
  drawWallStrip(screenX, drawStart, drawEnd, textureId, textureX, distance) {
    const texture = this.textures[textureId];
    if (!texture) return;

    const textureWidth = texture.width;
    const textureHeight = texture.height;

    // Calculate texture column
    const texX = Math.floor(textureX * textureWidth);

    // Calculate shading based on distance (fog effect)
    const maxFog = 10;
    const fogFactor = Math.min(1, distance / maxFog);

    // Draw the textured strip
    this.ctx.save();

    // Apply fog/darkness based on distance
    this.ctx.globalAlpha = 1 - (fogFactor * 0.7);

    this.ctx.drawImage(
      texture,
      texX, 0, 1, textureHeight,  // Source
      screenX, drawStart, 1, drawEnd - drawStart  // Destination
    );

    this.ctx.restore();
  }

  /**
   * Render sprites (billboards) in 3D space
   */
  renderSprites(player) {
    // Calculate sprite distances and sort (back to front)
    const spriteData = this.sprites.map(sprite => {
      const dx = sprite.x - player.x;
      const dy = sprite.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      return {
        sprite: sprite,
        distance: distance,
        dx: dx,
        dy: dy
      };
    });

    // Sort by distance (farthest first)
    spriteData.sort((a, b) => b.distance - a.distance);

    // Camera direction and plane vectors
    const dirX = Math.cos(player.angle);
    const dirY = Math.sin(player.angle);
    const planeX = -dirY * Math.tan(this.fov / 2);
    const planeY = dirX * Math.tan(this.fov / 2);

    // Render each sprite
    spriteData.forEach(data => {
      const sprite = data.sprite;

      // Transform sprite position to camera space
      // Using inverse of camera matrix
      const invDet = 1.0 / (planeX * dirY - dirX * planeY);

      const transformX = invDet * (dirY * data.dx - dirX * data.dy);
      const transformY = invDet * (-planeY * data.dx + planeX * data.dy);

      // Skip if sprite is behind player
      if (transformY <= 0.1) return;

      // Calculate sprite screen position
      const spriteScreenX = Math.floor((this.width / 2) * (1 + transformX / transformY));

      // Calculate sprite height (with scale factor)
      const spriteHeight = Math.abs(Math.floor((this.height / transformY) * sprite.scale));

      // Calculate sprite width (same as height for square sprites)
      const spriteWidth = Math.abs(Math.floor((this.height / transformY) * sprite.scale));

      // Calculate draw positions (anchor sprites to floor, not center)
      // Horizon line is at this.height / 2
      // Sprites should sit on the floor, with bottom at/below horizon
      const drawStartY = Math.max(0, this.height / 2 - spriteHeight * 0.2); // Top of sprite slightly above horizon
      const drawEndY = Math.min(this.height, drawStartY + spriteHeight);
      const drawStartX = Math.max(0, -spriteWidth / 2 + spriteScreenX);
      const drawEndX = Math.min(this.width, spriteWidth / 2 + spriteScreenX);

      // Draw sprite strips (with z-buffer check)
      for (let stripe = Math.floor(drawStartX); stripe < drawEndX; stripe++) {
        // Check z-buffer
        if (transformY < this.zBuffer[stripe]) {
          const texX = Math.floor((stripe - (-spriteWidth / 2 + spriteScreenX)) *
                                  sprite.texture.width / spriteWidth);

          if (texX >= 0 && texX < sprite.texture.width) {
            // Draw vertical stripe
            this.ctx.drawImage(
              sprite.texture,
              texX, 0, 1, sprite.texture.height,
              stripe, drawStartY, 1, drawEndY - drawStartY
            );
          }
        }
      }
    });
  }
}
