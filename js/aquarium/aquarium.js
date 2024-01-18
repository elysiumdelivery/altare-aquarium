import { Fish } from "./fish.js";

const spineModel = "../images/spine/AltareBoatBdayAnimationPrep.json";


const WORLD_WIDTH = 1920;
const WORLD_HEIGHT = 23000;
const LEVELS = {
    "Sky": 0,
    "Top": 1200,
    "Surface": 1800,
    "Middle": WORLD_HEIGHT * (1 / 2),
    "Floor": WORLD_HEIGHT * 0.75
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
        filters: options.filters || true
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
    self.toggleFilters = toggleFilters;

    self.isDraggingViewport = false;

    self.addFish = (fish) => { allFish.push(newFish); }
    self.getActiveFish = () => { return allFish.filter(fish => fish.isVisible()) }
    self.getAllFish = () => { return allFish; }
    self.checkActiveFish = (fish) => {
        if (fish === self.currentActiveFish) {
            debug.debugHitbox.visible = self.currentActiveFish.isVisible();
            var screenCoords = self.viewport.toScreen(Math.abs(fish.model.x), Math.abs(fish.model.y));
            updateDebugHitbox({x: screenCoords.x, y: screenCoords.y, width: Math.abs(fish.model.width * self.viewport.scaled), height: Math.abs(fish.bounds[1] * self.viewport.scaled)});
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
        .drag({direction: "all", pressDrag: true, clampWheel: true })
        .decelerate({
            friction: 0.95,                 // percent to decelerate after movement
            bounce: 0,                      // percent to decelerate when past boundaries (only applicable when viewport.bounce() is active)
            minSpeed: 0.01,                 // minimum velocity before stopping/reversing acceleration
    })
    Aquarium.viewport.on("moved", (e) => {
        this.isDraggingViewport = true;
        Aquarium.emitEvent("onViewportUpdate", e.viewport);

    });
    Aquarium.viewport.on("moved-end", (e) => {
        setTimeout(function () {
            this.isDraggingViewport = false;
        }.bind(this), 50)
    });
    
    Aquarium.viewport.eventMode = 'dynamic';
    Aquarium.viewport.alpha = 0;
    Aquarium.viewport.sortableChildren = true;

    Aquarium.overlay = new PIXI.Container();
    Aquarium.app.stage.addChild(Aquarium.viewport)
    Aquarium.app.stage.addChild(Aquarium.overlay)

    let bg = new PIXI.Sprite(generateGradient(
        // ["#82cbff", "#82cbff", "#D3FFE9", "#2B59C3", "#011138"]
        // ["#74b9ff", "#D2E9FF", "#D2E9FF", "#2973c4", "#2973c4", "#011138"], 
        ["#74b9ff", "#D2E9FF", "#2a75c5", "#ccfff6", "#82cbff", "#2973c4", "#011138"], 
        { 
            stops: [
                0,
                (LEVELS.Top) / WORLD_HEIGHT, 
                (LEVELS.Top + 100) / WORLD_HEIGHT, 
                (LEVELS.Surface) / WORLD_HEIGHT, 
                0.5 * LEVELS.Middle / WORLD_HEIGHT,
                LEVELS.Middle / WORLD_HEIGHT,
                1
            ],
            width: 64,
            height: 64
        }
    ));
    bg.width = WORLD_WIDTH;
    bg.height = WORLD_HEIGHT;
    Aquarium.viewport.addChild(bg);

    overlayGraphic = new PIXI.Graphics();
    overlayGraphic.blendMode = PIXI.BLEND_MODES.MULTIPLY
    overlayGraphic.beginFill("#253C78", 0.5);
    overlayGraphic.drawRect(0, 0, window.innerWidth, window.innerHeight);
    overlayGraphic.endFill();
    Aquarium.overlay.addChild(overlayGraphic);

    setupDebug();
    setupFilters();

    let loader = document.getElementById("loader-progress");
    loader.setAttribute("max", data.length);
    loader.setAttribute("value", 0);

    Aquarium.addGameStateListener("fishCreated", (fish) => {
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
    Aquarium.app.view.addEventListener('pointerup', (e) => {
        if (!Aquarium.isDraggingViewport && Aquarium.currentActiveFish && Aquarium.currentActiveFish.model.containsPoint(e)) {
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
        if (Aquarium.altareBoat) {
            Aquarium.altareBoat.y = LEVELS.Top + Math.sin(Date.now() / 380);
        }
        if (Aquarium.settings.filters) {
            overlayGraphic.alpha = (Aquarium.viewport.bottom / WORLD_HEIGHT) * 0.8;
            Aquarium.filters.godrayFilter.time += d / lerp(50, 100, 1 - (Aquarium.viewport.top / WORLD_HEIGHT));
            Aquarium.filters.godrayFilter.gain = lerp(0.1, 0.4, 1 - (Aquarium.viewport.top / WORLD_HEIGHT));
            Aquarium.filters.godrayFilter.lacunarity = lerp(1.8, 5, 1 - (Aquarium.viewport.top / WORLD_HEIGHT));
            Aquarium.filters.godrayFilter.alpha = lerp(0, 0.3, clamp((Aquarium.viewport.top - LEVELS.Surface) / LEVELS.Surface, 0, 1));

            Aquarium.filters.displacementFilter.enabled = Aquarium.viewport.top >= LEVELS.Surface;
        }
        updateDebugLayer();
    });

    Aquarium.toggleFilters(Aquarium.settings.filters);
    Aquarium.resize = resize;

    Aquarium.app.start();
    Aquarium.viewport.alpha = 1;

    window.addEventListener("resize", resize);

    return loadAltare().then(() => loadData(data)).then(() => {
        allFish.sort((a, b) => {
            if (a.model.scale.y > b.model.scale.y) return -1;
            else if (a.model.scale.y < b.model.scale.y) return 1;
            else return 0
        }).forEach((fish, i) => {
            fish.model.zIndex = i;
        });

        Aquarium.viewport.fitWidth()
        Aquarium.viewport.clamp({direction: "all"})
        resize();
        if (window.innerHeight >= window.innerWidth) {
            Aquarium.viewport.moveCenter(WORLD_WIDTH - 500, 0);
        }
        else {
            Aquarium.viewport.moveCenter(WORLD_WIDTH / 2, 0)
        }
    });
}

async function loadAltare () {
    return PIXI.Assets.load(spineModel).then((resource) => {

        Aquarium.altareBoat = new PIXI.spine.Spine(resource.spineData);
        let waterRepeatingTexRight = PIXI.Sprite.from("../images/spine/water.png");
        let waterRepeatingTexLeft = PIXI.Sprite.from("../images/spine/water.png");
        Aquarium.altareBoat.scale.set(0.5)
        Aquarium.altareBoat.x = WORLD_WIDTH - 500;
        Aquarium.altareBoat.y = LEVELS.Top;

        waterRepeatingTexRight.anchor.set(1, 0);
        waterRepeatingTexLeft.anchor.set(0, 0);
        waterRepeatingTexRight.x = 650;
        waterRepeatingTexLeft.x = -3180;
        waterRepeatingTexRight.y = -110;
        waterRepeatingTexLeft.y = -110;
        waterRepeatingTexRight.scale.set(-1, 1.28);
        waterRepeatingTexLeft.scale.set(1, 1.28);
        Aquarium.altareBoat.addChild(waterRepeatingTexRight);
        Aquarium.altareBoat.addChild(waterRepeatingTexLeft);
        
        // add the animation to the scene and render...
        Aquarium.viewport.addChild(Aquarium.altareBoat);
        
        if (Aquarium.altareBoat.state.hasAnimation("animation")) {
            // run forever, little boy!
            Aquarium.altareBoat.state.setAnimation(0, "animation", true);
            // // dont run too fast
            // animation.state.timeScale = 0.1;
            // // update yourself
            // animation.autoUpdate = true;
        }

        return Promise.resolve();
    });
}

async function loadData(allFishData) {
    let lastFishAtLevel = {};
    let fishPromises = [];
    for (var i = 0; i < allFishData.length; i++) {
        let fishData = allFishData[i];
        let newFish = new Fish(fishData);
        fishPromises.push(newFish.init().then((fish) => {
            document.getElementById("loader-progress").value++;
            return Promise.resolve(fish);
        }).catch(() => {
            document.getElementById("loader-progress").max--;
            return Promise.reject();
        }));
    }

    return Promise.allSettled(fishPromises).then((results) => {
        results.forEach((loadResult, i) => {
            if (loadResult.status == "fulfilled") {
                let fish = loadResult.value;
                let level = fish.data["Sea Level"];
                // let lastFish = lastFishAtLevel[level] !== undefined ? allFish[lastFishAtLevel[level]] : undefined;
                let lastFish = allFish[allFish.length - 1];
                if (fish.data["Position Y"]) {
                    fish.model.y = parseInt(fish.data["Position Y"])
                }
                else if (lastFish) {
                    fish.model.y = (lastFish.model.y + (fish.model.getBounds().height / 2) + (randomRange(50, 200)));
                }
                else {
                    fish.model.y = (fish.model.getBounds().height / 2);
                }
                if (Number.isFinite(parseInt(fish.data["Position X"]))) {
                    fish.model.x = parseInt(fish.data["Position X"]);
                }
                else {
                    fish.model.x = randomRange(fish.rangeX[0] || 0, fish.rangeX[1] || WORLD_WIDTH);
                }

                Aquarium.viewport.addChild(fish.model);
                lastFishAtLevel[level] = allFish.length;
                allFish.push(fish);

                // model.filters = [new PIXI.filters.ColorOverlayFilter(0xFFFFFF * Math.random(), 0.5)]
                let node = document.createElement("button");
                node.title = fish.data["Fish Display Name"];
                node.innerText = fish.data["Fish Display Name"];
                node.role = "listitem"
                node.ariaPosInSet = i;
                node.tabIndex = 0;
                node.onfocus = function () {
                    Aquarium.accessibilityActive = true;
                    Aquarium.emitEvent("onFishOver", this);
                    if ((this.model.y + (this.model.getBounds().height / 2)) > Aquarium.viewport.bottom || (this.model.y - (this.model.getBounds().height / 2)) <= Aquarium.viewport.top) {
                        Aquarium.viewport.animate({ time: 250, position: {x: Aquarium.viewport.center.x, y: this.model.y}, removeOnInterrupt: true })
                    }
                }.bind(fish)
                node.onblur = function () {
                    Aquarium.accessibilityActive = true;
                    Aquarium.emitEvent("onFishOut", this);
                }.bind(fish)
                node.onclick = function () {
                    console.log(this)
                    Aquarium.emitEvent("onFishClicked", { idx: this.id, data: this.data });
                }.bind(fish);
                fish.node = node;
                fishAriaDiv.appendChild(node);
                Aquarium.app.ticker.add(fish.update.bind(fish));
                Aquarium.emitEvent("fishCreated", fish);
            }
        })
    });
}

function setupFilters () {
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
}

function toggleFilters (isOn) {
    Aquarium.settings.filters = isOn;
    if (Aquarium.settings.filters) {
        Aquarium.overlay.visible = true;
        Aquarium.viewport.filters = [Aquarium.filters.displacementFilter, Aquarium.filters.godrayFilter]
    }
    else {
        Aquarium.overlay.visible = false;
        Aquarium.viewport.filters = [];
    }
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
    // if (Aquarium.currentActiveFish) Aquarium.checkActiveFish(Aquarium.currentActiveFish);
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
function clamp (v, min, max) {
    return Math.min(Math.max(v, min), max);
};
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
    // cap height to at least 480
    Aquarium.viewport.resize();
    if (window.innerWidth <= window.innerHeight) {
        let width = lerp(WORLD_WIDTH / 8, WORLD_WIDTH * 0.9, (window.innerWidth / window.innerHeight));
        width = clamp(width, WORLD_WIDTH / 8, WORLD_WIDTH * 0.9);
        console.log(width)
        Aquarium.viewport.fitWidth(width, false, true, true);
        Aquarium.viewport.moveCenter(WORLD_WIDTH - 500, Aquarium.viewport.center.y);
    }
    else {
        Aquarium.viewport.fitWidth();
    }
    if (overlayGraphic) {
        overlayGraphic.width = window.innerWidth;
        overlayGraphic.height = window.innerHeight;
    }

    Aquarium.emitEvent("onViewportUpdate", Aquarium.viewport);
}