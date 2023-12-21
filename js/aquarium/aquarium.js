import { Fish } from "./fish.js";

// const spineModel = "../resources/fish/FishAnimationTest.json";


const WORLD_WIDTH = 1000;
const WORLD_HEIGHT = 10000;
const LEVELS = {
    "Surface": 0,
    "Mid": WORLD_HEIGHT * 1 / 3,
    "Floor": WORLD_HEIGHT * 2 / 3
}
const debug = {};
const allFish = [];

let overlayGraphic;
// expose PIXI to window so that this plugin is able to
// reference window.PIXI.Ticker to automatically update Live2D models
window.PIXI = PIXI;

export const Aquarium = ((options = {}) => {
    const self = {};
    const gameStateListeners = {};
    self.accessibilityActive = false;
    self.settings = {
        worldWidth: options.worldWidth || WORLD_WIDTH,
        worldHeight: options.worldHeight || WORLD_HEIGHT,
        debug: options.debug || true,
        filters: options.filters || false
    };
    self.emitEvent = (e, data) => {
        if (gameStateListeners[e]) {
            gameStateListeners[e].forEach((listener) => {
                listener(data);
            })
        }
    }
    self.filters = {};
    self.init = init;
    self.resize = resize;
    self.setDebug = setDebug;
    self.addFish = (fish) => { allFish.push(newFish); }
    self.getActiveFish = () => { return allFish.filter(fish => fish.isVisible()) }
    self.getAllFish = () => { return allFish; }
    self.checkActiveFish = (fish) => {
        if (fish === self.currentActiveFish) {
            debug.debugHitbox.visible = self.currentActiveFish.isVisible();
            var screenCoords = self.viewport.toScreen(Math.abs(fish.model.x), Math.abs(fish.model.y));
            updateDebugHitbox({x: screenCoords.x, y: screenCoords.y, width: Math.abs(fish.model.width * self.viewport.scaled), height: Math.abs(fish.model.height * self.viewport.scaled)});
            return true;
        }
    }
    self.addGameStateListener = (e, listener) => {
        if (gameStateListeners[e] === undefined) {
            gameStateListeners[e] = []
        }
        gameStateListeners[e].push(listener.bind(self));
    }

    return self;
})();

async function init (data) {
    Aquarium.app = new PIXI.Application({
        view: document.getElementById('canvas'),
        backgroundAlpha: 1,
        resizeTo: window,
        resolution: 0.95
    });
    Aquarium.viewport = new pixi_viewport.Viewport({
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        passiveWheel: false,
        worldWidth: WORLD_WIDTH,
        worldHeight: WORLD_HEIGHT,

        events: Aquarium.app.renderer.events
    });
    // activate plugins
    Aquarium.viewport
        .drag({direction: "y", pressDrag: true, clampWheel: true })
        .decelerate({
            friction: 0.95,                 // percent to decelerate after movement
            bounce: 0,                      // percent to decelerate when past boundaries (only applicable when viewport.bounce() is active)
            minSpeed: 0.01,                 // minimum velocity before stopping/reversing acceleration
    })
    Aquarium.viewport.eventMode = 'dynamic';
    Aquarium.viewport.alpha = 0;
    Aquarium.viewport.sortableChildren = true;

    Aquarium.overlay = new PIXI.Container();
    Aquarium.app.stage.addChild(Aquarium.viewport)
    Aquarium.app.stage.addChild(Aquarium.overlay)

    let bg = new PIXI.Sprite(generateGradient(["#D3FFE9", "#2B59C3", "#011138"], { width: 64, height: 64 }));
    bg.width = WORLD_WIDTH;
    bg.height = WORLD_HEIGHT;
    Aquarium.viewport.addChild(bg);

    if (Aquarium.settings.filters) {
        overlayGraphic = new PIXI.Graphics();
        overlayGraphic.blendMode = PIXI.BLEND_MODES.MULTIPLY
        overlayGraphic.beginFill("#253C78", 1);
        overlayGraphic.drawRect(0, 0, window.innerWidth, window.innerHeight);
        overlayGraphic.endFill();
        Aquarium.overlay.addChild(overlayGraphic);
    }

    setupDebug();
    setupFilters();

    let loader = document.getElementById("loader-progress");
    loader.setAttribute("max", 100);
    loader.setAttribute("value", 0);

    await loadData(data);

    allFish.sort((a, b) => {
        if (a.model.scale.y > b.model.scale.y) return -1;
        else if (a.model.scale.y < b.model.scale.y) return 1;
        else return 0
    }).forEach((fish, i) => {
        fish.model.zIndex = i;
    })

    Aquarium.app.view.addEventListener("pointermove", (e) => {
        if (Aquarium.accessibilityActive) {
            Aquarium.accessibilityActive = false;
            if (Aquarium.currentActiveFish) {
                Aquarium.emitEvent("onFishOut", Aquarium.currentActiveFish);
            }
        }
    })
    /**
     * Click events are kinda weird w/ the L2D Model Plugin.
     * Workaround where we emit our own event that acts as the click.
     */
    Aquarium.app.view.addEventListener('pointerdown', (e) => {
        if (Aquarium.currentActiveFish && Aquarium.currentActiveFish.model.containsPoint(e)) {
            Aquarium.emitEvent("onFishClicked", { idx: Aquarium.currentActiveFish.id, data: Aquarium.currentActiveFish.data });
        }
    });

    Aquarium.addGameStateListener("onFishOver", (fish) => {
        if (Aquarium.currentActiveFish && Aquarium.currentActiveFish !== fish) {
            Aquarium.currentActiveFish.toggleHighlight(false);
            Aquarium.currentActiveFish.node.blur();
        }
        Aquarium.currentActiveFish = fish;
        fish.toggleHighlight(true);
    })

    Aquarium.addGameStateListener("onFishOut", (fish) => {
        if (Aquarium.currentActiveFish === fish) {
            Aquarium.currentActiveFish.node.blur();
            Aquarium.currentActiveFish = undefined;
        }
        fish.toggleHighlight(false);
    })

    Aquarium.app.ticker.add(d => {
        if (Aquarium.settings.filters) {
            overlayGraphic.alpha = (Aquarium.viewport.bottom / WORLD_HEIGHT) * 0.8;
            Aquarium.filters.godrayFilter.time += d / lerp(50, 100, 1 - (Aquarium.viewport.top / WORLD_HEIGHT));
            Aquarium.filters.godrayFilter.gain = lerp(0.1, 0.4, 1 - (Aquarium.viewport.top / WORLD_HEIGHT));
            Aquarium.filters.godrayFilter.lacunarity = lerp(1.8, 5, 1 - (Aquarium.viewport.top / WORLD_HEIGHT));
        }
        updateDebugLayer();
    });

    Aquarium.resize = resize;

    Aquarium.app.start();
    Aquarium.viewport.alpha = 1;
    Aquarium.viewport.fitWidth()
    Aquarium.viewport.clamp({direction: "y"})
    Aquarium.viewport.moveCenter(WORLD_WIDTH / 2, 0)

    window.addEventListener("resize", resize);
    resize();
}

async function loadData(allFishData) {
    let lastFishAtLevel = {};
    for (var i = 0; i < allFishData.length; i++) {
        let fishData = allFishData[i];
        let newFish = new Fish(fishData);
        await newFish.init();
        let level = fishData["Sea Level"];
        let lastModel = lastFishAtLevel[level] !== undefined ? allFish[lastFishAtLevel[level]].model : undefined;
        if (lastModel) {
            newFish.model.y = (lastModel.y + (newFish.model.height / 2));
        }
        else {
            newFish.model.y = LEVELS[level] + (newFish.model.height);
        }
        newFish.model.x = randomRange(0, WORLD_WIDTH);
        // model.filters = [new PIXI.filters.ColorOverlayFilter(0xFFFFFF * Math.random(), 0.5)]
        let node = document.createElement("button");
        node.title = fishData["Fish Display Name"];
        node.innerText = fishData["Fish Display Name"];
        node.role = "listitem"
        node.ariaPosInSet = i;
        node.tabIndex = 0;
        node.onfocus = function () {
            Aquarium.accessibilityActive = true;
            Aquarium.emitEvent("onFishOver", this);
            if ((this.model.y + (this.model.height / 2)) > Aquarium.viewport.bottom || (this.model.y - (this.model.height / 2)) <= Aquarium.viewport.top) {
                Aquarium.viewport.animate({ time: 250, position: {x: Aquarium.viewport.center.x, y: this.model.y}, removeOnInterrupt: true })
            }
        }.bind(newFish)
        node.onblur = function () {
            Aquarium.accessibilityActive = true;
            Aquarium.emitEvent("onFishOut", this);
        }.bind(newFish)
        node.onclick = function () {
            console.log(this)
            Aquarium.emitEvent("onFishClicked", { idx: this.id, data: this.data });
        }.bind(newFish);
        newFish.node = node;
        fishAriaDiv.appendChild(node);
        Aquarium.viewport.addChild(newFish.model);

        lastFishAtLevel[level] = allFish.length;
        allFish.push(newFish);
        loader.setAttribute("value", i + 1);
    }
}

async function randomFishStressTest () {
    for (var i = 0; i < 100; i++) {
        const newFish = new Fish();
        await newFish.init();
        let lastModel = i > 0 ? allFish[i - 1].model : undefined;
        if (lastModel) {
            newFish.model.y = (lastModel.y + (WORLD_HEIGHT / 100));
        }
        else {
            newFish.model.y = (newFish.model.height);
        }
        newFish.model.x = randomRange(0, WORLD_WIDTH);
        // model.filters = [new PIXI.filters.ColorOverlayFilter(0xFFFFFF * Math.random(), 0.5)]
        let node = document.createElement("button");
        node.title = `Fish #${newFish.id}`;
        node.innerText = `Fish #${newFish.id}`;
        node.role = "listitem"
        node.ariaPosInSet = i;
        node.tabIndex = 0;
        node.onfocus = function () {
            Aquarium.accessibilityActive = true;
            Aquarium.emitEvent("onFishOver", this);
            if ((this.model.y + (this.model.height / 2)) > Aquarium.viewport.bottom || (this.model.y - (this.model.height / 2)) <= Aquarium.viewport.top) {
                Aquarium.viewport.animate({ time: 250, position: {x: Aquarium.viewport.center.x, y: this.model.y}, removeOnInterrupt: true })
            }
        }.bind(newFish)
        node.onblur = function () {
            Aquarium.accessibilityActive = true;
            Aquarium.emitEvent("onFishOut", this);
        }.bind(newFish)
        node.onclick = function () {
            console.log(this)
            Aquarium.emitEvent("onFishClicked", { idx: this.id });
        }.bind(newFish);
        newFish.node = node;
        fishAriaDiv.appendChild(node);
        Aquarium.viewport.addChild(newFish.model);

        allFish.push(newFish);
        loader.setAttribute("value", i + 1);
    }
}

function setupFilters () {
    if (!Aquarium.settings.filters) return;
    const displacementMap = "https://cdn.jsdelivr.net/gh/pixijs/pixi-filters/tools/demo/images/displacement_map.png";
    const displacementSprite = PIXI.Sprite.from(displacementMap, {
        wrapMode: PIXI.WRAP_MODES.REPEAT
    });
    
    Aquarium.filters.displacementFilter = new PIXI.DisplacementFilter(displacementSprite, 6);
    Aquarium.filters.godrayFilter = new PIXI.filters.GodrayFilter({
        time: 0,
        gain: 0.5,
        lacunarity: 1.8,
        parallel: true,
        angle: 30,
        alpha: 0.3
    });

    Aquarium.viewport.filters = [Aquarium.filters.displacementFilter, Aquarium.filters.godrayFilter]
}

function setupDebug () {
    debug.debugLayer = new PIXI.Container();
    Aquarium.app.stage.addChild(debug.debugLayer);
    // border(viewport, BORDER);
    debug.debugHitbox = new PIXI.Graphics();
    debug.debugLayer.addChild(debug.debugHitbox);
    debug.fps = new PIXI.Text('', {
        fontFamily: 'Arial',
        fontSize: 12,
        fill: 0xff0000,
        align: 'left',
    });
    debug.debugLayer.addChild(debug.fps);
}

function updateDebugLayer () {
    if (!Aquarium.settings.debug) return;
    debug.fps.text = `Debug Window:\n` +
                        `${PIXI.Ticker.shared.FPS.toFixed(0)} fps\n` +
                        `Viewport: ${Aquarium.app.renderer.width}px x ${Aquarium.app.renderer.height}px\n` +
                        `World: ${Aquarium.viewport.worldWidth}px x ${Aquarium.viewport.worldHeight}px\n` +
                        `${Aquarium.getActiveFish().length}/${Aquarium.getAllFish().length} active fish`
}

function updateDebugHitbox(options) {
    debug.debugHitbox.clear();
    if (Aquarium.settings.debug) {
        debug.debugHitbox.lineStyle(1, 0xFF0000);
        debug.debugHitbox.drawRect(options.x - options.width * 0.5, options.y - options.height * 0.5, options.width, options.height);
    }
}

function setDebug (isActive) {
    Aquarium.settings.debug = isActive;
    debug.debugLayer.visible = isActive;
}

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}
function lerp (start, end, v){
    return (1 - v) * start + v * end;
}
function border(viewport) {
    debug.viewportBorder = Aquarium.viewport.addChild(new PIXI.Graphics())
    debug.viewportBorder.lineStyle(10, 0xff0000).drawRect(0, 0, Aquarium.viewport.worldWidth, Aquarium.viewport.worldHeight)
}

function generateGradient (colors, options) {
    var canvas = document.createElement('canvas');
    canvas.width  = options.width;
    canvas.height = options.width;
    var ctx = canvas.getContext('2d');
    var gradient = ctx.createLinearGradient(options.width, 0, options.width, options.height);
    colors.forEach((color, i) => {
        gradient.addColorStop(options.stops ? options.stops[i] : i/(colors.length-1), color);
    })
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return PIXI.Texture.from(canvas, {
        wrapMode: PIXI.WRAP_MODES.CLAMP
    });
}

function resize () {
    // Resize the renderer
    Aquarium.app.renderer.resize(window.innerWidth, window.innerHeight);
    Aquarium.app.resize();
    Aquarium.viewport.resize();
    if (overlayGraphic) {
        overlayGraphic.width = window.innerWidth;
        overlayGraphic.height = window.innerHeight;
    }
    Aquarium.viewport.fitWidth()
}