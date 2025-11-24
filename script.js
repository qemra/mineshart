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
    
    // Simplified Tile Textures/Colors (Added different player colors)
    TILE_COLORS: {
        0: 'rgba(0, 0, 0, 0)', 1: '#009000', 2: '#8B4513', 3: '#A9A9A9', 4: '#654321',
        5: '#FADA5E', 6: '#4682B4', 7: '#36454F', 8: '#808080', 9: '#000000',
        10: '#A0522D', 11: '#444444'
    },

    // --- NEW: Player Models ---
    PLAYER_MODELS: {
        STEVE: { color: '#38761d', name: 'Steve' },
        ALEX: { color: '#ffc1a8', name: 'Alex' },
        ZOMBIE: { color: '#006600', name: 'Zombie' }
    },

    // --- NEW: Mining Durability and Tool Modifiers ---
    MINING_DURABILITY: { // Time in milliseconds required to break with FIST (0 damage)
        [TILE.GRASS]: 200, [TILE.DIRT]: 200, [TILE.SAND]: 200,
        [TILE.OAK_LOG]: 500, // Logs require time
        [TILE.STONE]: 1500, // Stone requires long time
        [TILE.COAL_ORE]: 2000, [TILE.IRON_ORE]: 3000,
        [TILE.BEDROCK]: Infinity
    },

    TOOL_MODIFIERS: { // Multiplier for speed: 1.0 = FIST speed, 0.5 = 2x faster
        FIST: 1.0, 
        STONE_PICKAXE: 0.3, // Example tool for stone
        IRON_AXE: 0.2 // Example tool for wood
    },

    // Placeholder for item IDs that represent tools
    ITEM: {
        WOOD_PLANK: 100, STICK: 101, COBBLESTONE: 102,
        STONE_PICKAXE: 201, IRON_AXE: 202 // New tools
    },

    TILE_DROPS: {
        1: 2, 2: 2, 3: 102, 4: 100, 7: 7, 8: 8
    },

    // Game State Variables
    player: {
        x: 0, y: 0, velY: 0, isJumping: false, health: 20,
        selectedSlot: 0,
        model: 'STEVE' // New default model
    },
    inventorySlots: new Array(9).fill(null).map(() => ({ tileId: 0, count: 0 })),
    world: [],
    keys: {},
    currentScreen: 'TITLE', 
    gamePaused: true,

    // --- NEW: Mining State ---
    miningTarget: { x: -1, y: -1, progress: 0, requiredTime: 0, active: false, tileId: 0 },
    lastUpdateTime: Date.now(),

    canvas: null,
    ctx: null,
    
    // --- Utility Functions (Omitted for brevity, assumed to be here) ---
    generateNoise(seed, length, smoothness) { /* ... */ },
    getTile(x, y) { /* ... */ },
    addItemToInventory(itemId, count) { /* ... */ },
    generateWorld(seed) { /* ... */ },
    checkInteraction() { /* ... */ },
    
    // --- 2. Interface and Game Flow ---
    
    // NEW: Populates the model dropdown and sets up the initial preview
    setupModelSelection() {
        const select = document.getElementById('playerModel');
        const models = Object.keys(this.PLAYER_MODELS);
        
        select.innerHTML = models.map(key => 
            `<option value="${key}">${this.PLAYER_MODELS[key].name}</option>`
        ).join('');
        
        this.player.model = select.value;
        this.updateModelPreview();
    },

    // NEW: Updates the color of the preview block
    updateModelPreview() {
        const selectedModelKey = document.getElementById('playerModel').value;
        this.player.model = selectedModelKey;
        const color = this.PLAYER_MODELS[selectedModelKey].color;
        document.getElementById('model-preview').style.backgroundColor = color;
    },

    startGame(seed) {
        this.generateWorld(seed);
        this.player.x = this.WORLD_WIDTH * this.TILE_SIZE / 2;
        this.player.y = this.WORLD_HEIGHT * this.TILE_SIZE - this.TILE_SIZE * 5;
        this.player.health = 20;

        // Initialize inventory with starter items and an example tool
        this.inventorySlots[0].tileId = this.TILE.DIRT;
        this.inventorySlots[0].count = 64;
        this.inventorySlots[1].tileId = this.ITEM.STONE_PICKAXE; // Example Pickaxe
        this.inventorySlots[1].count = 1;

        this.closeInterfaces();
        document.getElementById('title-menu').classList.add('hidden');
        this.currentScreen = 'GAME';
        this.gamePaused = false;
        this.lastUpdateTime = Date.now(); // Reset time
    },

    closeInterfaces() {
        this.gamePaused = false;
        this.currentScreen = 'GAME';
        document.getElementById('crafting-ui').classList.add('hidden');
        document.getElementById('title-menu').classList.add('hidden');
        document.getElementById('interaction-prompt').style.display = 'none';
        this.miningTarget.active = false; // Stop mining if interface opens
        document.getElementById('mining-progress').classList.add('hidden');
    },

    // --- 3. Player, Movement, and Mining Logic ---
    updatePlayer(deltaTime) {
        if (this.gamePaused) return;
        
        // ... (Existing Movement and Gravity Logic) ...
        // Apply gravity
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
        
        this.player.x = newX;
        this.player.y = newY;
        
        // --- NEW: Mining Update Logic ---
        if (this.miningTarget.active) {
            // Check if player is still holding the mouse button (Left click) - Not possible with simple click listener, needs mousedown/mouseup
            // For now, assume a click starts a continuous process until break or new click
            
            this.miningTarget.progress += deltaTime;
            const percentage = this.miningTarget.progress / this.miningTarget.requiredTime;
            
            // Update Progress Bar UI
            const progressBar = document.getElementById('mining-bar');
            progressBar.style.width = `${Math.min(100, percentage * 100)}%`;

            if (this.miningTarget.progress >= this.miningTarget.requiredTime) {
                // Block broken!
                this.world[this.miningTarget.y][this.miningTarget.x] = this.TILE.AIR;
                
                // Add drop to inventory
                const dropId = this.TILE_DROPS[this.miningTarget.tileId] || this.miningTarget.tileId;
                this.addItemToInventory(dropId, 1);
                
                // Stop mining
                this.miningTarget.active = false;
                document.getElementById('mining-progress').classList.add('hidden');
            }
        }
    },

    getToolModifier() {
        const selectedSlot = this.inventorySlots[this.player.selectedSlot];
        const itemId = selectedSlot ? selectedSlot.tileId : 0;
        
        // Check if the selected item is a tool and return the modifier
        if (itemId === this.ITEM.STONE_PICKAXE) return this.TOOL_MODIFIERS.STONE_PICKAXE;
        if (itemId === this.ITEM.IRON_AXE) return this.TOOL_MODIFIERS.IRON_AXE;

        return this.TOOL_MODIFIERS.FIST; // Default to fist
    },

    handleMining(e) {
        if (this.gamePaused) return;

        // Convert screen coordinates to world coordinates
        const rect = this.canvas.getBoundingClientRect();
        const camX = this.player.x - this.canvas.width / 2;
        const camY = this.player.y - this.canvas.height / 2;
        const worldX = e.clientX - rect.left + camX;
        const worldY = e.clientY - rect.top + camY;
        
        const tileX = Math.floor(worldX / this.TILE_SIZE);
        const tileY = Math.floor(worldY / this.TILE_SIZE);
        
        const distSq = Math.pow(tileX - Math.floor(this.player.x / this.TILE_SIZE), 2) + 
                       Math.pow(tileY - Math.floor(this.player.y / this.TILE_SIZE), 2);

        if (distSq > 16) { // Too far to mine
            this.miningTarget.active = false;
            document.getElementById('mining-progress').classList.add('hidden');
            return;
        }

        const tileId = this.world[tileY][tileX];
        if (tileId !== this.TILE.AIR && tileId !== this.TILE.BEDROCK) {
            
            const baseDurability = this.MINING_DURABILITY[tileId] || this.MINING_DURABILITY[this.TILE.STONE];
            const toolModifier = this.getToolModifier();
            
            const requiredTime = baseDurability * toolModifier;
            
            if (requiredTime === Infinity) return; // Bedrock or unmineable block
            
            // Start a new mining process
            this.miningTarget = { 
                x: tileX, 
                y: tileY, 
                progress: 0, 
                requiredTime: requiredTime, 
                active: true,
                tileId: tileId
            };
            
            // Position and show the progress bar at the tile location
            const progressBarDiv = document.getElementById('mining-progress');
            progressBarDiv.style.left = `${e.clientX - 16}px`; // Centered on click (32px / 2 = 16)
            progressBarDiv.style.top = `${e.clientY + 16}px`; // Below the tile
            progressBarDiv.classList.remove('hidden');

        } else {
            // Clicked air or unmineable block
            this.miningTarget.active = false;
            document.getElementById('mining-progress').classList.add('hidden');
        }
    },

    // --- 4. Rendering ---
    drawWorld() {
        // ... (Existing drawWorld logic) ...
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
        
        // NEW: Simple Mining "Animation" (Tile overlay/damage)
        if (this.miningTarget.active) {
            const { x, y, progress, requiredTime } = this.miningTarget;
            const percentage = progress / requiredTime;
            
            // Simple visual: darken the tile based on progress
            this.ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + percentage * 0.5})`; // Max 60% darker
            this.ctx.fillRect(
                x * this.TILE_SIZE - camX, 
                y * this.TILE_SIZE - camY,
                this.TILE_SIZE, this.TILE_SIZE
            );
        }
    },

    drawPlayer() {
        const camX = this.player.x - this.canvas.width / 2;
        const camY = this.player.y - this.canvas.height / 2;

        // NEW: Draw player based on selected model color
        const playerColor = this.PLAYER_MODELS[this.player.model].color;
        this.ctx.fillStyle = playerColor;
        this.ctx.fillRect(this.player.x - camX, this.player.y - camY, this.TILE_SIZE, this.TILE_SIZE * 2);

        // Health Bar (same)
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(10, 10, 100, 10);
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(10, 10, this.player.health * 5, 10);
    },

    // ... (Existing drawHud logic) ...

    gameLoop() {
        const now = Date.now();
        const deltaTime = now - GAME.lastUpdateTime; // Time since last frame in ms
        GAME.lastUpdateTime = now;

        // Clear canvas
        GAME.ctx.fillStyle = '#ADD8E6';
        GAME.ctx.fillRect(0, 0, GAME.canvas.width, GAME.canvas.height);
        
        if (GAME.currentScreen === 'GAME') {
            GAME.updatePlayer(deltaTime); // Pass deltaTime for accurate mining timing
            GAME.checkInteraction();
            GAME.drawWorld();
            GAME.drawPlayer();
            GAME.drawHud();
        } 
        
        requestAnimationFrame(GAME.gameLoop);
    },

    // --- 5. Initialization ---
    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;

        // NEW: Setup model selection UI
        this.setupModelSelection();
        document.getElementById('title-menu').classList.remove('hidden');

        // Input Listeners
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            if (e.key.toLowerCase() === 'e' && this.currentScreen !== 'TITLE') {
                if (this.currentScreen === 'CRAFTING') {
                    this.closeInterfaces();
                }
            }
            
            if (e.key >= '1' && e.key <= '9') {
                this.player.selectedSlot = parseInt(e.key) - 1;
                this.miningTarget.active = false; // Interrupt mining when changing tools
                document.getElementById('mining-progress').classList.add('hidden');
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        this.canvas.addEventListener('click', this.handleMining.bind(this));
        
        this.gameLoop();
    }
};

window.onload = () => {
    GAME.init();
};
