// script.js (Partial Update)

const GAME = {
    // ... (Existing TILE, TILE_COLORS, etc.) ...

    // --- NEW: Player Models (Updated) ---
    PLAYER_MODELS: {
        PLEB: { color: '#888888', name: 'Pleb' }, // New default model
        STEVE: { color: '#38761d', name: 'Steve' },
        ALEX: { color: '#ffc1a8', name: 'Alex' },
        ZOMBIE: { color: '#006600', name: 'Zombie' }
    },

    // ... (Existing ITEM, MINING_DURABILITY, etc.) ...
    
    // Define item names for recipes tab (Expanded significantly)
    ITEM_NAMES: {
        0: "Air", 1: "Grass Block", 2: "Dirt", 3: "Stone", 4: "Oak Log", 5: "Sand", 6: "Water", 
        7: "Coal Ore", 8: "Iron Ore", 9: "Bedrock", 10: "Crafting Table", 11: "Furnace",
        100: "Wood Plank", 101: "Stick", 102: "Cobblestone",
        201: "Stone Pickaxe", 202: "Wooden Pickaxe",
        // Simple tools and armor
        301: "Wooden Helmet", 302: "Wooden Chestplate", 303: "Wooden Leggings", 304: "Wooden Boots",
    },

    // --- NEW: Comprehensive Crafting Recipes (3x3 grid) ---
    // Format: [[R1C1, R1C2, R1C3], [R2C1, R2C2, R2C3], [R3C1, R3C2, R3C3], [Result ID, Count]]
    // Use 0 for GAME.TILE.AIR or unused slots
    RECIPES: [
        // 2x2 Recipes (for Mini Crafting)
        [[0, 4, 0], [0, 0, 0], [0, 0, 0], [GAME.ITEM.WOOD_PLANK, 4]], // Log -> Planks
        [[0, 100, 0], [0, 100, 0], [0, 0, 0], [GAME.ITEM.STICK, 4]], // 2 Planks -> 4 Sticks
        [[100, 100, 0], [100, 100, 0], [0, 0, 0], [GAME.TILE.CRAFTING_TABLE, 1]], // 4 Planks -> Crafting Table

        // 3x3 Tool Recipes
        // Wooden Pickaxe (2x Sticks, 3x Planks)
        [[100, 100, 100], [0, 101, 0], [0, 101, 0], [GAME.ITEM.WOODEN_PICKAXE, 1]], 
        // Stone Pickaxe (2x Sticks, 3x Cobblestone)
        [[102, 102, 102], [0, 101, 0], [0, 101, 0], [GAME.ITEM.STONE_PICKAXE, 1]],
        
        // Furnace (8x Cobblestone)
        [[102, 102, 102], [102, 0, 102], [102, 102, 102], [GAME.TILE.FURNACE, 1]],
        
        // Armor (Simple Wooden Helmet)
        [[100, 100, 100], [100, 0, 100], [0, 0, 0], [GAME.ITEM.WOODEN_HELMET, 1]],
    ],

    // --- NEW: World and Settings State ---
    worldState: {
        name: 'Default World',
        seed: 'random_seed',
        lastPlayed: null
    },
    settings: {
        volume: 50,
        difficulty: 'Normal',
        fullscreen: false
    },
    
    // ... (Existing Game State Variables) ...
    player: {
        x: 0, y: 0, velY: 0, isJumping: false, health: 20,
        selectedSlot: 0,
        model: 'PLEB', // Default to Pleb
        armor: { HELMET: 0, CHESTPLATE: 0, LEGGINGS: 0, BOOTS: 0 }
    },
    
    // --- Utility Functions ---
    
    // NEW: Save world data to Local Storage
    saveGame() {
        const saveData = {
            world: this.world,
            player: this.player,
            inventory: this.inventory,
            worldState: this.worldState,
            settings: this.settings
        };
        // Use world name as the key
        localStorage.setItem(`2DMC_Save_${this.worldState.name}`, JSON.stringify(saveData));
        console.log(`Game saved as: ${this.worldState.name}`);
    },

    // --- 2. Interface and Game Flow ---
    
    // UPDATED: startGame now takes worldName
    startGame(seed, worldName) {
        const finalSeed = seed && seed !== 'random_seed' ? seed : String(Math.floor(Math.random() * 99999));
        
        this.worldState.name = worldName || `World ${Date.now()}`;
        this.worldState.seed = finalSeed;
        this.worldState.lastPlayed = Date.now();
        
        this.generateWorld(finalSeed);
        
        // ... (Player initialization) ...
        
        // Give starter items (Hotbar slots 27-35)
        this.inventory[27] = { id: this.TILE.DIRT, count: 64 };
        this.inventory[28] = { id: this.ITEM.WOODEN_PICKAXE, count: 1 }; // Give wooden pickaxe
        this.inventory[29] = { id: this.TILE.OAK_LOG, count: 10 };
        this.inventory[30] = { id: this.ITEM.WOODEN_HELMET, count: 1 };
        
        this.closeInterfaces();
        document.getElementById('title-menu').classList.add('hidden');
        this.currentScreen = 'GAME';
        this.gamePaused = false;
        this.lastUpdateTime = Date.now();
        
        // Save game immediately after starting
        this.saveGame();
    },

    // NEW: Open Settings Menu
    openSettingsMenu() {
        this.gamePaused = true;
        this.currentScreen = 'SETTINGS';
        document.getElementById('title-menu').classList.add('hidden');
        document.getElementById('settings-menu').classList.remove('hidden');
        // Load current settings into the UI elements
        document.getElementById('volumeSlider').value = this.settings.volume;
        document.getElementById('volumeValue').innerText = `${this.settings.volume}%`;
        document.getElementById('difficultySelect').value = this.settings.difficulty;
    },

    // NEW: Set a setting value
    setSetting(key, value) {
        if (key === 'volume') {
            this.settings.volume = parseInt(value);
            document.getElementById('volumeValue').innerText = `${this.settings.volume}%`;
        } else if (key === 'difficulty') {
            this.settings.difficulty = value;
        }
        // Save settings after change
        localStorage.setItem('2DMC_Settings', JSON.stringify(this.settings));
        console.log(`Setting ${key} changed to ${value}`);
    },
    
    // NEW: Toggle Fullscreen
    toggleFullscreen(checked) {
        this.settings.fullscreen = checked;
        if (checked) {
            this.canvas.requestFullscreen();
        } else if (document.fullscreenElement) {
            document.exitFullscreen();
        }
    },

    openRecipesMenu() {
        this.gamePaused = true;
        this.currentScreen = 'RECIPES';
        document.getElementById('title-menu').classList.add('hidden');
        document.getElementById('recipes-menu').classList.remove('hidden');
        this.renderRecipeList();
    },

    closeInterfaces() {
        // ... (Existing logic, now hides settings-menu too) ...
        this.gamePaused = false;
        this.currentScreen = 'GAME';
        document.getElementById('crafting-ui').classList.add('hidden');
        document.getElementById('inventory-ui').classList.add('hidden');
        document.getElementById('recipes-menu').classList.add('hidden');
        document.getElementById('settings-menu').classList.add('hidden'); // NEW
        document.getElementById('interaction-prompt').style.display = 'none';
        this.miningTarget.active = false; 
        document.getElementById('mining-progress').classList.add('hidden');
    },

    // --- NEW: Recipe Rendering ---
    renderRecipeList() {
        const listEl = document.getElementById('recipe-list');
        listEl.innerHTML = '';
        
        this.RECIPES.forEach((recipe, index) => {
            const resultId = recipe[3][0];
            const resultCount = recipe[3][1];
            
            // Collect unique input items and counts
            const inputs = {};
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    const id = recipe[i][j];
                    if (id !== 0) {
                        inputs[id] = (inputs[id] || 0) + 1;
                    }
                }
            }
            
            const inputString = Object.keys(inputs).map(id => {
                const count = inputs[id];
                const name = this.getItemName(parseInt(id));
                return `${count}x ${name}`;
            }).join(' + ');

            const outputString = `${resultCount}x ${this.getItemName(resultId)}`;

            const itemEl = document.createElement('div');
            itemEl.className = 'recipe-item';
            
            // Use LaTeX for the arrow for formality in the list
            itemEl.innerHTML = `**${inputString || "No Input"}** $\\rightarrow$ **${outputString}**`;

            listEl.appendChild(itemEl);
        });
    },

    // --- 5. Initialization ---
    init() {
        // ... (Existing canvas setup) ...
        
        // Load settings from storage
        const savedSettings = localStorage.getItem('2DMC_Settings');
        if (savedSettings) {
            this.settings = JSON.parse(savedSettings);
        }

        this.setupModelSelection();
        
        // Set default model to PLEB
        document.getElementById('playerModel').value = 'PLEB';
        this.updateModelPreview();
        
        // ... (Rest of init remains the same, ensuring UI is hidden and listeners are attached) ...
    },
    
    // UPDATED: setupModelSelection to include 'Pleb'
    setupModelSelection() {
        const select = document.getElementById('playerModel');
        const models = Object.keys(this.PLAYER_MODELS);
        
        select.innerHTML = models.map(key => 
            `<option value="${key}">${this.PLAYER_MODELS[key].name}</option>`
        ).join('');
        
        select.value = 'PLEB'; // Ensure PLEB is selected
        this.player.model = 'PLEB';
        this.updateModelPreview();
    },
    
    // ... (rest of the GAME object) ...
};

window.onload = () => {
    GAME.init();
};
