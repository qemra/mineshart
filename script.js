// script.js

const GAME = {
    // ... (All existing constants, TILE, ITEM, RECIPES, etc.) ...
    
    // Game State Variables
    // ... (player, inventory, world, keys, etc.) ...
    
    // Helper to get item name or default to ID
    getItemName(id) {
        // ... (function body remains the same) ...
    },
    
    // --- 2. Interface and Game Flow ---
    
    // FIXED: Default seed if none is provided
    startGame(seed) {
        // Use a random number if no seed is provided or it's just a placeholder
        const finalSeed = seed && seed !== 'random_seed' ? seed : String(Math.floor(Math.random() * 99999));
        
        this.generateWorld(finalSeed);
        this.player.x = this.WORLD_WIDTH * this.TILE_SIZE / 2;
        this.player.y = this.WORLD_HEIGHT * this.TILE_SIZE - this.TILE_SIZE * 5;
        this.player.health = 20;

        // Initialize inventory with starter items (Hotbar slots 27-35)
        this.inventory[27].id = this.TILE.DIRT; this.inventory[27].count = 64;
        this.inventory[28].id = this.ITEM.STONE_PICKAXE; this.inventory[28].count = 1;
        this.inventory[29].id = this.TILE.OAK_LOG; this.inventory[29].count = 10;
        
        this.closeInterfaces();
        document.getElementById('title-menu').classList.add('hidden');
        this.currentScreen = 'GAME';
        this.gamePaused = false;
        this.lastUpdateTime = Date.now(); 
    },

    openRecipesMenu() {
        this.gamePaused = true;
        this.currentScreen = 'RECIPES';
        document.getElementById('title-menu').classList.add('hidden');
        document.getElementById('recipes-menu').classList.remove('hidden');
        this.renderRecipeList();
    },

    openTitleMenu() {
        // This is crucial for navigating from Recipes/Settings back to the main menu
        this.closeInterfaces(); 
        this.currentScreen = 'TITLE';
        document.getElementById('title-menu').classList.remove('hidden');
    },

    closeInterfaces() {
        // ... (function body remains the same, ensures all UI is hidden) ...
        this.gamePaused = false;
        this.currentScreen = 'GAME';
        document.getElementById('crafting-ui').classList.add('hidden');
        document.getElementById('inventory-ui').classList.add('hidden');
        document.getElementById('recipes-menu').classList.add('hidden');
        document.getElementById('interaction-prompt').style.display = 'none';
        this.miningTarget.active = false; 
        document.getElementById('mining-progress').classList.add('hidden');
    },
    
    // ... (rest of the functions: updatePlayer, handleMining, drawPlayer, etc.) ...
    
    // --- 5. Initialization ---
    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;

        this.setupModelSelection();
        
        // Ensure only the title menu is visible on startup
        document.getElementById('title-menu').classList.remove('hidden');
        this.currentScreen = 'TITLE'; // Set initial state
        this.gamePaused = true;
        
        // Initialize other UI elements as hidden to prevent layout issues
        document.getElementById('inventory-ui').classList.add('hidden');
        document.getElementById('recipes-menu').classList.add('hidden');
        document.getElementById('crafting-ui').classList.add('hidden');

        // ... (Input Listeners remain the same) ...

        document.addEventListener('keydown', (e) => {
            // ... (key listeners, Q for inventory, E for close, 1-9 for hotbar) ...
        });
        
        // ... (Keyup and mouse listeners) ...
        
        this.gameLoop();
    }
    // ... (rest of the GAME object) ...
};

window.onload = () => {
    GAME.init();
};
