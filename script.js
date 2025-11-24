// Global Game Object to encapsulate all logic
const GAME = {
    // --- 1. Game Constants and Setup ---
    TILE_SIZE: 32,
    WORLD_WIDTH: 100, 
    WORLD_HEIGHT: 60,
    GRAVITY: 0.8,
    // ... (Other Constants) ...
    
    TILE: {
        AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, OAK_LOG: 4, SAND: 5, WATER: 6,
        COAL_ORE: 7, IRON_ORE: 8, BEDROCK: 9, CRAFTING_TABLE: 10, FURNACE: 11
    },
    
    TILE_COLORS: {
        0: 'rgba(0, 0, 0, 0)', 1: '#009000', 2: '#8B4513', 3: '#A9A9A9', 4: '#654321',
        5: '#FADA5E', 6: '#4682B4', 7: '#36454F', 8: '#808080', 9: '#000000',
        10: '#A0522D', 11: '#444444', 
        100: '#D2B48C', // WOOD_PLANK color
        101: '#8B4513', // STICK color
        102: '#777777', // COBBLESTONE color
        201: '#999999', // STONE_PICKAXE color
    },

    PLAYER_MODELS: {
        STEVE: { color: '#38761d', name: 'Steve' },
        ALEX: { color: '#ffc1a8', name: 'Alex' },
        ZOMBIE: { color: '#006600', name: 'Zombie' }
    },

    ITEM: {
        WOOD_PLANK: 100, STICK: 101, COBBLESTONE: 102,
        STONE_PICKAXE: 201, IRON_AXE: 202,
        // New items for armor
        HELMET: 301, CHESTPLATE: 302, LEGGINGS: 303, BOOTS: 304,
    },
    
    // Define item names for recipes tab
    ITEM_NAMES: {
        1: "Grass Block", 2: "Dirt", 4: "Oak Log", 100: "Wood Plank", 10: "Crafting Table",
        // ... add all tile/item names
    },

    // --- NEW: Crafting Recipes (Simple 2x2 for Player Inventory) ---
    // Recipe Format: [[A, B], [C, D], [Result ID, Count]]
    RECIPES: [
        // Wood Plank (1x Log -> 4x Planks)
        [[GAME.TILE.OAK_LOG, GAME.TILE.AIR], [GAME.TILE.AIR, GAME.TILE.AIR], [GAME.ITEM.WOOD_PLANK, 4]],
        // Sticks (2x Planks vertically -> 4x Sticks)
        [[GAME.ITEM.WOOD_PLANK, GAME.TILE.AIR], [GAME.ITEM.WOOD_PLANK, GAME.TILE.AIR], [GAME.ITEM.STICK, 4]],
        // Crafting Table (4x Planks in 2x2 -> 1x Crafting Table)
        [[GAME.ITEM.WOOD_PLANK, GAME.ITEM.WOOD_PLANK], [GAME.ITEM.WOOD_PLANK, GAME.ITEM.WOOD_PLANK], [GAME.TILE.CRAFTING_TABLE, 1]],
    ],

    // Game State Variables
    player: {
        x: 0, y: 0, velY: 0, isJumping: false, health: 20,
        selectedSlot: 0,
        model: 'STEVE',
        // NEW: Armor slots
        armor: { HELMET: 0, CHESTPLATE: 0, LEGGINGS: 0, BOOTS: 0 }
    },

    // 27 Main Inventory Slots + 9 Hotbar Slots = 36 total
    inventory: new Array(36).fill(null).map(() => ({ id: 0, count: 0 })),
    craftingGrid: new Array(4).fill(null).map(() => ({ id: 0, count: 0 })),
    craftingResult: { id: 0, count: 0 },

    world: [],
    keys: {},
    currentScreen: 'TITLE', // TITLE, GAME, INVENTORY, CRAFTING, RECIPES
    gamePaused: true,

    miningTarget: { x: -1, y: -1, progress: 0, requiredTime: 0, active: false, tileId: 0 },
    lastUpdateTime: Date.now(),

    canvas: null,
    ctx: null,

    // Helper to get item name or default to ID
    getItemName(id) {
        return this.ITEM_NAMES[id] || (this.TILE_COLORS[id] ? `${this.TILE_COLORS[id]} Block` : `Item ${id}`);
    },

    // --- Utility Functions ---
    // Update inventory access to use the combined array
    getInventorySlot(index) {
        return this.inventory[index];
    },

    addItemToInventory(itemId, count) {
        // ... (Update this function to use the `this.inventory` array) ...
        for (let i = 0; i < this.inventory.length; i++) {
            const slot = this.inventory[i];
            if (slot.id === itemId && slot.count < 64) { // Stack limit check
                slot.count += count;
                return true;
            }
        }
        // Find empty slot
        for (let i = 0; i < this.inventory.length; i++) {
            const slot = this.inventory[i];
            if (slot.id === 0) {
                slot.id = itemId;
                slot.count = count;
                return true;
            }
        }
        return false; // Inventory is full
    },

    // --- 2. Interface and Game Flow ---
    
    // NEW: Open the Inventory screen
    openInventory() {
        if (this.currentScreen === 'GAME') {
            this.gamePaused = true;
            this.currentScreen = 'INVENTORY';
            document.getElementById('inventory-ui').classList.remove('hidden');
            this.renderInventoryGrid();
        }
    },

    // NEW: Open Recipes Menu
    openRecipesMenu() {
        this.gamePaused = true;
        this.currentScreen = 'RECIPES';
        document.getElementById('title-menu').classList.add('hidden');
        document.getElementById('recipes-menu').classList.remove('hidden');
        this.renderRecipeList();
    },

    openTitleMenu() {
        this.closeInterfaces();
        this.currentScreen = 'TITLE';
        document.getElementById('title-menu').classList.remove('hidden');
    },

    closeInterfaces() {
        this.gamePaused = false;
        this.currentScreen = 'GAME';
        document.getElementById('crafting-ui').classList.add('hidden');
        document.getElementById('inventory-ui').classList.add('hidden');
        document.getElementById('recipes-menu').classList.add('hidden');
        document.getElementById('interaction-prompt').style.display = 'none';
        this.miningTarget.active = false; 
        document.getElementById('mining-progress').classList.add('hidden');
    },

    // --- NEW: Rendering UI Logic ---
    renderInventoryGrid() {
        const fullInvGrid = document.getElementById('full-inventory-grid');
        const hotbarGrid = document.getElementById('hotbar-grid');

        // Clear existing slots
        fullInvGrid.innerHTML = '';
        hotbarGrid.innerHTML = '';

        // Render 27 main inventory slots (indices 0 to 26)
        for (let i = 0; i < 27; i++) {
            fullInvGrid.appendChild(this.createSlotElement(this.inventory[i]));
        }

        // Render 9 hotbar slots (indices 27 to 35)
        for (let i = 27; i < 36; i++) {
            const slotEl = this.createSlotElement(this.inventory[i]);
            if (i - 27 === this.player.selectedSlot) {
                slotEl.style.border = '2px solid yellow'; // Highlight selected slot
            }
            hotbarGrid.appendChild(slotEl);
        }
        
        // Render 2x2 Crafting Grid (simple logic)
        // Note: For now, this is just visual. Drag-and-drop logic is needed to make it functional.
        // We will manually add a placeholder for 1 Log -> 4 Planks
        this.checkMiniCrafting();
    },
    
    // Creates a visual element for an inventory slot
    createSlotElement(slotData) {
        const slotEl = document.createElement('div');
        slotEl.className = 'slot';
        
        if (slotData.id !== 0) {
            slotEl.style.backgroundColor = this.TILE_COLORS[slotData.id] || 'purple';
            
            const countEl = document.createElement('span');
            countEl.className = 'count';
            countEl.innerText = slotData.count;
            countEl.style.color = 'white';
            countEl.style.position = 'absolute';
            countEl.style.bottom = '2px';
            countEl.style.right = '2px';
            slotEl.appendChild(countEl);
        }
        
        return slotEl;
    },

    // Checks the 2x2 crafting grid against RECIPES
    checkMiniCrafting() {
        // Simple 2x2 implementation check (only for Wood Plank)
        const grid = this.craftingGrid;
        const resultSlotEl = document.querySelector('.mini-crafting-grid .result');
        
        // Check for 1 Log -> 4 Planks
        if (grid[0].id === this.TILE.OAK_LOG && grid[0].count >= 1 && 
            grid[1].id === 0 && grid[2].id === 0 && grid[3].id === 0) {
            
            this.craftingResult = { id: this.ITEM.WOOD_PLANK, count: 4 };
            resultSlotEl.style.backgroundColor = this.TILE_COLORS[this.ITEM.WOOD_PLANK];
        } else {
            this.craftingResult = { id: 0, count: 0 };
            resultSlotEl.style.backgroundColor = '#DDD';
        }
    },
    
    // Renders the recipes tab
    renderRecipeList() {
        const listEl = document.getElementById('recipe-list');
        listEl.innerHTML = '';
        
        this.RECIPES.forEach(recipe => {
            const resultId = recipe[2][0];
            const resultCount = recipe[2][1];
            
            // Simplified recipe display: Input -> Output
            // This needs complex logic to parse the 2x2 grid back into readable text (e.g., "4x Planks")
            
            const itemEl = document.createElement('div');
            itemEl.className = 'recipe-item';
            
            // For simplicity, we'll only display the plank recipe nicely
            if (resultId === this.ITEM.WOOD_PLANK) {
                itemEl.innerHTML = `**1x ${this.getItemName(this.TILE.OAK_LOG)}** $\\rightarrow$ **${resultCount}x ${this.getItemName(resultId)}**`;
            } else if (resultId === this.TILE.CRAFTING_TABLE) {
                itemEl.innerHTML = `**4x ${this.getItemName(this.ITEM.WOOD_PLANK)}** $\\rightarrow$ **1x ${this.getItemName(resultId)}**`;
            } else {
                 itemEl.innerHTML = `Recipe for **${this.getItemName(resultId)}** (Incomplete Display)`;
            }

            listEl.appendChild(itemEl);
        });
    },

    // --- 3. Player, Movement, and Mining Logic ---
    updatePlayer(deltaTime) {
        if (this.gamePaused) return;

        // ... (Existing Player movement and damage logic) ...
        
        this.player.x = newX;
        this.player.y = newY;
        
        // --- NEW: Handle Item Usage (Right Click for Placement) ---
        if (this.keys['rclick']) {
            // Placeholder for block placement logic
        }

        // --- Mining Update Logic (Same as before) ---
        if (this.miningTarget.active) {
            // ... (Mining time calculation and block breaking) ...
        }
    },

    // --- 4. Rendering ---

    drawPlayer() {
        const camX = this.player.x - this.canvas.width / 2;
        const camY = this.player.y - this.canvas.height / 2;

        const playerColor = this.PLAYER_MODELS[this.player.model].color;
        this.ctx.fillStyle = playerColor;
        this.ctx.fillRect(this.player.x - camX, this.player.y - camY, this.TILE_SIZE, this.TILE_SIZE * 2);

        // Health Bar (same)
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(10, 10, 100, 10);
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(10, 10, this.player.health * 5, 10);
        
        // **NEW: Draw selected item as held item (Placeholder)**
        const selectedSlotIndex = 27 + this.player.selectedSlot; // Hotbar index
        const heldItem = this.inventory[selectedSlotIndex];
        if (heldItem.id !== 0) {
             this.ctx.fillStyle = this.TILE_COLORS[heldItem.id] || 'purple';
             this.ctx.fillRect(this.player.x - camX + this.TILE_SIZE, this.player.y - camY + this.TILE_SIZE, 10, 10);
        }
    },

    drawHud() {
        // Draw the hotbar using the last 9 slots of the inventory array
        const hotbar = this.inventory.slice(27, 36);
        const barX = this.canvas.width / 2 - (hotbar.length * this.TILE_SIZE * 1.5) / 2;
        const barY = this.canvas.height - this.TILE_SIZE * 2;

        for (let i = 0; i < hotbar.length; i++) {
            const slot = hotbar[i];
            const x = barX + i * this.TILE_SIZE * 1.5;
            
            // Draw slot background (with selected slot indicator)
            this.ctx.strokeStyle = i === this.player.selectedSlot ? 'yellow' : 'gray';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(x, barY, this.TILE_SIZE * 1.4, this.TILE_SIZE * 1.4);
            this.ctx.fillStyle = '#444444';
            this.ctx.fillRect(x, barY, this.TILE_SIZE * 1.4, this.TILE_SIZE * 1.4);
            
            // Draw item
            if (slot.id !== 0) {
                this.ctx.fillStyle = this.TILE_COLORS[slot.id] || 'purple';
                this.ctx.fillRect(x + 2, barY + 2, this.TILE_SIZE * 1.4 - 4, this.TILE_SIZE * 1.4 - 4);
                
                // Draw count
                this.ctx.fillStyle = 'white';
                this.ctx.font = '12px Arial';
                this.ctx.fillText(slot.count, x + this.TILE_SIZE * 1.4 - 15, barY + this.TILE_SIZE * 1.4 - 5);
            }
        }
    },

    // --- 5. Initialization ---
    init() {
        // ... (Canvas setup) ...
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;

        // Give starter items (Hotbar slots 27-35)
        this.inventory[27].id = this.TILE.DIRT; this.inventory[27].count = 64;
        this.inventory[28].id = this.ITEM.STONE_PICKAXE; this.inventory[28].count = 1;
        this.inventory[29].id = this.TILE.OAK_LOG; this.inventory[29].count = 10;
        this.inventory[30].id = this.ITEM.HELMET; this.inventory[30].count = 1;

        this.setupModelSelection();
        document.getElementById('title-menu').classList.remove('hidden');

        // Input Listeners
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // Hotbar selection 1-9
            if (e.key >= '1' && e.key <= '9') {
                this.player.selectedSlot = parseInt(e.key) - 1;
                this.miningTarget.active = false; 
                document.getElementById('mining-progress').classList.add('hidden');
            }
            
            // Q opens inventory
            if (e.key.toLowerCase() === 'q') {
                if (this.currentScreen === 'GAME') {
                    this.openInventory();
                } else if (this.currentScreen === 'INVENTORY') {
                    this.closeInterfaces();
                }
            }
            
            // E key for Crafting Table / Closing UI
            if (e.key.toLowerCase() === 'e') {
                if (this.currentScreen === 'CRAFTING' || this.currentScreen === 'INVENTORY') {
                    this.closeInterfaces();
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Left-click for mining
        this.canvas.addEventListener('click', this.handleMining.bind(this));
        
        // Right-click for block placement (Prevent context menu)
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.keys['rclick'] = true; // Use this key in updatePlayer for placement
        });
        
        this.gameLoop();
    }
    // ... (rest of the functions remain the same) ...
};

window.onload = () => {
    GAME.init();
};
