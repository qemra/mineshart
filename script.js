// Global Game Object to encapsulate all logic
const GAME = {
    // --- 1. Game Constants and Setup ---
    TILE_SIZE: 32,
    WORLD_WIDTH: 100, 
    WORLD_HEIGHT: 60,
    GRAVITY: 0.8,
    MAX_FALL_SPEED: 15,
    JUMP_POWER: 15,
    MOVEMENT_SPEED: 5,

    TILE: {
        AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, OAK_LOG: 4, SAND: 5, WATER: 6,
        COAL_ORE: 7, IRON_ORE: 8, BEDROCK: 9, CRAFTING_TABLE: 10, FURNACE: 11
    },
    
    // Simplified Tile Textures/Colors
    TILE_COLORS: {
        0: 'rgba(0, 0, 0, 0)', 1: '#009000', 2: '#8B4513', 3: '#A9A9A9', 4: '#654321',
        5: '#FADA5E', 6: '#4682B4', 7: '#36454F', 8: '#808080', 9: '#000000',
        10: '#A0522D', 11: '#444444'
    },

    ITEM: {
        WOOD_PLANK: 100, STICK: 101, COBBLESTONE: 102
    },

    TILE_DROPS: {
        1: 2, 2: 2, 3: 102, 4: 100, 7: 7, 8: 8
    },

    // Game State Variables
    player: {
        x: 0, y: 0, velY: 0, isJumping: false, health: 20,
        selectedSlot: 0
    },
    inventorySlots: new Array(9).fill(null).map(() => ({ tileId: 0, count: 0 })),
    world: [],
    keys: {},
    currentScreen: 'TITLE', // TITLE, GAME, CRAFTING, FURNACE
    gamePaused: true,

    canvas: null,
    ctx: null,
    
    // --- 2. Utility Functions ---
    generateNoise(seed, length, smoothness) {
        // Simple 1D Perlin-like Noise implementation
        const noise = [];
        let currentHeight = 0; // Simplified
        for (let i = 0; i < length; i++) {
            currentHeight += (Math.random() - 0.5) * smoothness;
            currentHeight = Math.max(5, Math.min(this.WORLD_HEIGHT - 10, currentHeight));
            noise.push(Math.floor(this.WORLD_HEIGHT - 20 + currentHeight)); // Start high up
        }
        return noise;
    },

    getTile(x, y) {
        const tileX = Math.floor(x / this.TILE_SIZE);
        const tileY = Math.floor(y / this.TILE_SIZE);
        if (tileX >= 0 && tileX < this.WORLD_WIDTH && tileY >= 0 && tileY < this.WORLD_HEIGHT) {
            return { id: this.world[tileY][tileX], x: tileX, y: tileY };
        }
        return { id: this.TILE.AIR, x: -1, y: -1 };
    },
    
    addItemToInventory(itemId, count) {
        for (let slot of this.inventorySlots) {
            if (slot.tileId === itemId) {
                slot.count += count;
                return;
            }
        }
        // Find empty slot
        for (let slot of this.inventorySlots) {
            if (slot.tileId === this.TILE.AIR) {
                slot.tileId = itemId;
                slot.count = count;
                return;
            }
        }
    },

    // --- 3. World Management ---
    generateWorld(seed) {
        this.world = [];
        // Use a simple seed for terrain: just affects the initial height range
        const baseHeight = this.WORLD_HEIGHT - 20 - (parseInt(seed) % 10);
        const terrainNoise = this.generateNoise(baseHeight, this.WORLD_WIDTH, 0.8);
        const waterLevel = this.WORLD_HEIGHT - 15;

        for (let y = 0; y < this.WORLD_HEIGHT; y++) {
            this.world[y] = [];
            for (let x = 0; x < this.WORLD_WIDTH; x++) {
                const surfaceY = terrainNoise[x];

                if (y < surfaceY) {
                    this.world[y][x] = y >= waterLevel ? this.TILE.WATER : this.TILE.AIR;
                } else if (y === surfaceY) {
                    this.world[y][x] = (y >= waterLevel - 2 && y < waterLevel) ? this.TILE.SAND : this.TILE.GRASS;
                } else if (y > surfaceY && y < surfaceY + 4) {
                    this.world[y][x] = this.TILE.DIRT;
                } else if (y >= surfaceY + 4 && y < this.WORLD_HEIGHT - 5) {
                    // Stone layer with simple ore generation
                    if (Math.random() < 0.01) {
                        this.world[y][x] = this.TILE.COAL_ORE;
                    } else if (Math.random() < 0.005) {
                        this.world[y][x] = this.TILE.IRON_ORE;
                    } else {
                        this.world[y][x] = this.TILE.STONE;
                    }
                } else {
                    this.world[y][x] = this.TILE.BEDROCK;
                }
            }
        }
    },

    // --- 4. Interface and Game Flow ---
    startGame(seed) {
        this.generateWorld(seed);
        this.player.x = this.WORLD_WIDTH * this.TILE_SIZE / 2;
        this.player.y = this.WORLD_HEIGHT * this.TILE_SIZE - this.TILE_SIZE * 5;
        this.player.health = 20;

        // Give starting items (Dirt block for testing)
        this.inventorySlots[0].tileId = this.TILE.DIRT;
        this.inventorySlots[0].count = 64;

        this.closeInterfaces();
        document.getElementById('title-menu').classList.add('hidden');
        this.currentScreen = 'GAME';
        this.gamePaused = false;
    },

    openCraftingInterface() {
        this.gamePaused = true;
        this.currentScreen = 'CRAFTING';
        document.getElementById('crafting-ui').classList.remove('hidden');
        document.getElementById('interaction-prompt').style.display = 'none';
    },

    closeInterfaces() {
        this.gamePaused = false;
        this.currentScreen = 'GAME';
        document.getElementById('crafting-ui').classList.add('hidden');
        document.getElementById('furnace-ui').classList.add('hidden');
        document.getElementById('title-menu').classList.add('hidden');
        document.getElementById('interaction-prompt').style.display = 'none';
    },

    checkInteraction() {
        if (this.currentScreen !== 'GAME') return;
        
        // Check tile below the cursor/in front of player
        const checkX = this.keys['d'] ? this.player.x + this.TILE_SIZE * 2 : this.player.x - this.TILE_SIZE;
        const checkY = this.player.y + this.TILE_SIZE; 
        const targetTile = this.getTile(checkX, checkY);
        
        const promptEl = document.getElementById('interaction-prompt');

        if (targetTile.id === this.TILE.CRAFTING_TABLE) {
            promptEl.innerText = "Press 'E' to use Crafting Table";
            promptEl.style.display = 'block';
            if (this.keys['e']) {
                this.openCraftingInterface();
                this.keys['e'] = false; // Consume the key press
            }
        } else {
            promptEl.style.display = 'none';
        }
    },

    // --- 5. Game Loop and Player Logic ---
    updatePlayer() {
        if (this.gamePaused) return;

        // Gravity and vertical movement
        this.player.velY += this.GRAVITY;
        this.player.velY = Math.min(this.player.velY, this.MAX_FALL_SPEED);
        let newX = this.player.x;
        let newY = this.player.y + this.player.velY;
        
        // Collision check
        const playerBottomTile = this.getTile(this.player.x, this.player.y + this.TILE_SIZE * 2 + 1);
        const isStanding = playerBottomTile.id !== this.TILE.AIR && playerBottomTile.id !== this.TILE.WATER;
        
        if (isStanding && this.player.velY > 0) {
            this.player.velY = 0;
            this.player.isJumping = false;
            newY = playerBottomTile.y * this.TILE_SIZE - this.TILE_SIZE;
        }

        // Horizontal Movement and Collision (Simplified)
        if (this.keys['a']) newX -= this.MOVEMENT_SPEED;
        if (this.keys['d']) newX += this.MOVEMENT_SPEED;
        
        // Jump
        if (this.keys['w'] && isStanding && !this.player.isJumping) {
            this.player.velY = -this.JUMP_POWER;
            this.player.isJumping = true;
        }
        
        this.player.x = newX; // Needs better collision

        this.player.y = newY;
        
        // Basic Damage
        if (this.player.y > this.WORLD_HEIGHT * this.TILE_SIZE) {
            this.player.health = 0;
        }
        if (this.player.health <= 0) {
            console.log("Player Died! (Game Over logic needed)");
            this.currentScreen = 'TITLE';
            document.getElementById('title-menu').classList.remove('hidden');
        }
    },

    handleMining(e) {
        if (this.gamePaused) return;

        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const camX = this.player.x - this.canvas.width / 2;
        const camY = this.player.y - this.canvas.height / 2;
        const worldX = clickX + camX;
        const worldY = clickY + camY;
        
        const tileX = Math.floor(worldX / this.TILE_SIZE);
        const tileY = Math.floor(worldY / this.TILE_SIZE);
        
        // Simple range check (e.g., must be within 4 tiles)
        const distSq = Math.pow(tileX - Math.floor(this.player.x / this.TILE_SIZE), 2) + 
                       Math.pow(tileY - Math.floor(this.player.y / this.TILE_SIZE), 2);

        if (distSq > 16) return; // Too far to mine

        if (tileX >= 0 && tileX < this.WORLD_WIDTH && tileY >= 0 && tileY < this.WORLD_HEIGHT) {
            const tileId = this.world[tileY][tileX];
            if (tileId !== this.TILE.AIR && tileId !== this.TILE.BEDROCK) {
                this.world[tileY][tileX] = this.TILE.AIR;
                
                const dropId = this.TILE_DROPS[tileId] || tileId;
                this.addItemToInventory(dropId, 1);
            }
        }
    },

    // --- 6. Rendering ---
    drawWorld() {
        const viewPortWidth = this.canvas.width;
        const viewPortHeight = this.canvas.height;
        
        const camX = this.player.x - viewPortWidth / 2;
        const camY = this.player.y - viewPortHeight / 2;
        
        const startX = Math.floor(camX / this.TILE_SIZE);
        const endX = Math.ceil((camX + viewPortWidth) / this.TILE_SIZE);
        const startY = Math.floor(camY / this.TILE_SIZE);
        const endY = Math.ceil((camY + viewPortHeight) / this.TILE_SIZE);

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                if (x >= 0 && x < this.WORLD_WIDTH && y >= 0 && y < this.WORLD_HEIGHT) {
                    const tileId = this.world[y][x];
                    if (tileId !== this.TILE.AIR) {
                        this.ctx.fillStyle = this.TILE_COLORS[tileId];
                        this.ctx.fillRect(
                            x * this.TILE_SIZE - camX, 
                            y * this.TILE_SIZE - camY,
                            this.TILE_SIZE, this.TILE_SIZE
                        );
                    }
                }
            }
        }
    },

    drawPlayer() {
        const camX = this.player.x - this.canvas.width / 2;
        const camY = this.player.y - this.canvas.height / 2;

        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(this.player.x - camX, this.player.y - camY, this.TILE_SIZE, this.TILE_SIZE * 2);

        // Health Bar
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(10, 10, 100, 10);
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(10, 10, this.player.health * 5, 10);
    },

    drawHud() {
        const barX = this.canvas.width / 2 - (this.inventorySlots.length * this.TILE_SIZE * 1.5) / 2;
        const barY = this.canvas.height - this.TILE_SIZE * 2;

        for (let i = 0; i < this.inventorySlots.length; i++) {
            const slot = this.inventorySlots[i];
            const x = barX + i * this.TILE_SIZE * 1.5;
            
            // Draw slot background
            this.ctx.fillStyle = i === this.player.selectedSlot ? 'yellow' : 'gray';
            this.ctx.fillRect(x, barY, this.TILE_SIZE * 1.4, this.TILE_SIZE * 1.4);
            
            // Draw item
            if (slot.tileId !== this.TILE.AIR) {
                this.ctx.fillStyle = this.TILE_COLORS[slot.tileId] || 'purple';
                this.ctx.fillRect(x + 2, barY + 2, this.TILE_SIZE * 1.4 - 4, this.TILE_SIZE * 1.4 - 4);
                
                // Draw count
                this.ctx.fillStyle = 'white';
                this.ctx.font = '12px Arial';
                this.ctx.fillText(slot.count, x + this.TILE_SIZE * 1.4 - 15, barY + this.TILE_SIZE * 1.4 - 5);
            }
        }
    },

    gameLoop() {
        // Clear canvas
        GAME.ctx.fillStyle = '#ADD8E6';
        GAME.ctx.fillRect(0, 0, GAME.canvas.width, GAME.canvas.height);
        
        if (GAME.currentScreen === 'GAME') {
            GAME.updatePlayer();
            GAME.checkInteraction();
            GAME.drawWorld();
            GAME.drawPlayer();
            GAME.drawHud();
        } else if (GAME.currentScreen === 'TITLE') {
            // Draw is handled by the title-menu div, but keep the canvas clean
        }
        
        requestAnimationFrame(GAME.gameLoop);
    },

    // --- 7. Initialization ---
    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        // Set canvas size (can be responsive later)
        this.canvas.width = 800;
        this.canvas.height = 600;

        // Ensure title screen is visible on load
        document.getElementById('title-menu').classList.remove('hidden');

        // Input Listeners
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            if (e.key.toLowerCase() === 'e' && this.currentScreen !== 'TITLE') {
                if (this.currentScreen === 'CRAFTING' || this.currentScreen === 'FURNACE') {
                    this.closeInterfaces();
                }
            }
            
            if (e.key >= '1' && e.key <= '9') {
                this.player.selectedSlot = parseInt(e.key) - 1;
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        this.canvas.addEventListener('click', this.handleMining.bind(this));
        
        // Start the game loop
        this.gameLoop();
    }
};

window.onload = () => {
    GAME.init();
};
