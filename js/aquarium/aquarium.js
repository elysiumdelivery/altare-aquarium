import { Fish, parseMath } from "./fish.js";
import { Particles } from "./particle.js";

const spineModel = "../images/spine/AltareBoatBdayAnimationPrep.json";


export const WORLD_WIDTH = 1920;
export const WORLD_HEIGHT = 23000;
export const LEVELS = {
    "Sky": 0,
    "Top": 1600,
    "Surface": 1800,
    "Middle": WORLD_HEIGHT * (1 / 2),
    "Floor": WORLD_HEIGHT * 0.75
}
const LAYERS = {
    "Grounded": 0,
    "Moving": 100
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
        debug: options.debug || false,
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

    Aquarium.app.renderer.events.cursorStyles.grab = "grab";
    // activate plugins
    Aquarium.viewport
        .drag({direction: "all", pressDrag: true, clampWheel: true })
        .decelerate({
            friction: 0.95,                 // percent to decelerate after movement
            bounce: 0,                      // percent to decelerate when past boundaries (only applicable when viewport.bounce() is active)
            minSpeed: 0.01,                 // minimum velocity before stopping/reversing acceleration
    })
    Aquarium.viewport.on("moved", (e) => {
        if (e.type == "drag") {
            this.isDraggingViewport = true;
        }
        Aquarium.particlesFront.particleContainer.y = e.viewport.top;
        Aquarium.particlesBack.particleContainer.y = e.viewport.top;
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
        ["#4c8bda", "#D2E9FF", "#2a75c5", "#ccfff6", "#82cbff", "#2973c4", "#011138"], 
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

    let clouds = new PIXI.Container();
    let bgCloud1 = PIXI.Sprite.from("../images/AltareBGElements_cloud-5.webp");
    let bgCloud2 = PIXI.Sprite.from("../images/AltareBGElements_cloud-6.webp");
    let bgCloud3 = PIXI.Sprite.from("../images/AltareBGElements_cloud-5.webp");
    let bgCloud4 = PIXI.Sprite.from("../images/AltareBGElements_cloud-6.webp");

    bgCloud1.x = 100;
    bgCloud2.x = WORLD_WIDTH - 100;
    bgCloud3.x = 300;
    bgCloud4.x = WORLD_WIDTH - 600;
    bgCloud1.y = LEVELS.Sky + 100;
    bgCloud2.y = LEVELS.Sky + 200;
    bgCloud3.y = LEVELS.Sky + 600;
    bgCloud4.y = LEVELS.Sky + 700;
    clouds.alpha = 0.65;
    clouds.addChild(bgCloud1, bgCloud2, bgCloud3, bgCloud4)

    let bgOceanRight = PIXI.Sprite.from("../images/AltareBGElements_OceanFloorRight.webp");
    let bgOceanLeft = PIXI.Sprite.from("../images/AltareBGElements_OceanFloorLeft.webp");
    let bgOceanBottom = PIXI.Sprite.from("../images/AltareBGElements_OceanBottom.webp");
    bgOceanRight.x = WORLD_WIDTH;
    bgOceanLeft.x = 0;
    bgOceanRight.y = 11500 - 300;
    bgOceanLeft.y = 11500 + 50;

    bgOceanLeft.scale.set(0.85);
    bgOceanRight.scale.set(0.85);

    bgOceanRight.anchor.set(1, 1);
    bgOceanLeft.anchor.set(0, 1);
    bgOceanBottom.anchor.set(0, 1);
    bgOceanBottom.width = WORLD_WIDTH;
    bgOceanBottom.y = WORLD_HEIGHT;
    Aquarium.viewport.addChild(clouds, bgOceanLeft, bgOceanRight, bgOceanBottom)


    overlayGraphic = new PIXI.Graphics();
    overlayGraphic.blendMode = PIXI.BLEND_MODES.MULTIPLY
    overlayGraphic.beginFill("#253C78", 1);
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
        if (Aquarium.altareFloat) {
            Aquarium.altareFloat.y = 14500 + Math.sin(Date.now() / 500) * 50;
            Aquarium.altareSlime.y = 14500 + Math.sin(50 + Date.now() / 500) * 20;
            Aquarium.altareFloat.rotation = Math.sin(Date.now() / 380) / 10;
            Aquarium.altareSlime.rotation = Math.sin(100 + Date.now() / 380) / 10;
        }
        if (Aquarium.settings.filters) {
            overlayGraphic.alpha = (Aquarium.viewport.bottom / WORLD_HEIGHT) * 0.8;
            if (Aquarium.particlesFront && Aquarium.particlesBack) {
                Aquarium.particlesFront.particleContainer.alpha = (Aquarium.viewport.top / WORLD_HEIGHT) * 0.8;
                Aquarium.particlesBack.particleContainer.alpha = (Aquarium.viewport.top / WORLD_HEIGHT) * 0.8;
            }
            // Aquarium.emitter.parent.alpha = clamp(lerp(0, 1, (Aquarium.viewport.top - LEVELS.Top) / (LEVELS.Top + 100)), 0, 1);
            Aquarium.filters.godrayFilter.time += d / lerp(50, 100, 1 - (Aquarium.viewport.top / WORLD_HEIGHT));
            Aquarium.filters.godrayFilter.gain = lerp(0.1, 0.4, 1 - (Aquarium.viewport.top / WORLD_HEIGHT));
            Aquarium.filters.godrayFilter.lacunarity = lerp(1.8, 5, 1 - (Aquarium.viewport.top / WORLD_HEIGHT));
            Aquarium.filters.godrayFilter.alpha = lerp(0, 0.3, clamp((Aquarium.viewport.top - LEVELS.Surface) / LEVELS.Surface, 0, 1));

            Aquarium.filters.displacementFilter.enabled = Aquarium.viewport.top >= LEVELS.Surface;
        }
        
        updateDebugLayer();
    });

    Aquarium.resize = resize;

    // setupSound();

    Aquarium.app.start();
    Aquarium.viewport.alpha = 1;

    window.addEventListener("resize", resize);

    return loadAltare().then(() => loadData(data)).then(() => {
        allFish.sort((a, b) => {
            if (a.model.y > b.model.y) return 1;
            else if (a.model.y < b.model.y) return -1;
            else return 0
        }).forEach((fish, i) => {
            if (fish.data["Movement"] === "Moving") {
                fish.model.zIndex = LAYERS.Moving + i;
            }
            if (fish.data["Grounded"] === "Moving") {
                fish.model.zIndex = LAYERS.Grounded + i;
            }
        });

        Aquarium.particlesFront = new Particles();
        Aquarium.particlesBack = new Particles();
        Aquarium.viewport.addChild(Aquarium.particlesFront.particleContainer)
        Aquarium.viewport.addChild(Aquarium.particlesBack.particleContainer)
        Aquarium.particlesFront.particleContainer.zIndex = LAYERS.Moving + 1000;
        Aquarium.viewport.on("wheel", (e) => {
            Aquarium.particlesFront.handleScroll(e);
            Aquarium.particlesBack.handleScroll(e);
        });
        Aquarium.viewport.on("wheel", (e) => {
            Aquarium.particlesFront.handleScroll(e);
            Aquarium.particlesBack.handleScroll(e);
        });
        Aquarium.viewport.on("drag-start", (e) => {
            Aquarium.particlesFront.handleDrag("start", e);
            Aquarium.particlesBack.handleDrag("start", e);
        });
        Aquarium.viewport.on("moved", (e) => {
            Aquarium.particlesFront.handleDrag("dragging", e);
            Aquarium.particlesBack.handleDrag("dragging", e);
        });
        Aquarium.viewport.fitWidth()
        Aquarium.viewport.clamp({direction: "all"})
        Aquarium.toggleFilters(Aquarium.settings.filters);
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
        Aquarium.altareBoat.scale.set(0.8)
        Aquarium.altareBoat.x = WORLD_WIDTH - 500;
        Aquarium.altareBoat.y = LEVELS.Top;

        Aquarium.altareFloat = PIXI.Sprite.from("../images/Altare.webp")
        Aquarium.altareSlime = PIXI.Sprite.from("../images/Slime.webp")
        Aquarium.altareFloat.anchor.set(0.5);
        Aquarium.altareSlime.anchor.set(0.5);
        Aquarium.altareFloat.scale.set(0.5);
        Aquarium.altareSlime.scale.set(0.5);
        Aquarium.altareFloat.x = 200;
        Aquarium.altareFloat.y = 14500;
        Aquarium.altareSlime.x = 400;
        Aquarium.altareSlime.y = 14500;

        Aquarium.altareFloat.interactive = true;
        Aquarium.altareSlime.interactive = true;
        Aquarium.altareFloat.cursor = "grab";
        Aquarium.altareSlime.cursor = "grab";
        
        // add the animation to the scene and render...
        Aquarium.viewport.addChild(Aquarium.altareFloat);
        Aquarium.viewport.addChild(Aquarium.altareSlime);
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
                    fish.model.y = parseMath(fish.data["Position Y"]);
                }
                else if (lastFish) {
                    fish.model.y = (lastFish.model.y + (fish.model.getBounds().height / 2) + (randomRange(20, 50)));
                }
                else {
                    fish.model.y = (fish.model.getBounds().height / 2);
                }
                if (fish.data["Position X"]) {
                    fish.model.x = parseMath(fish.data["Position X"]);
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
                    if (window.innerWidth > window.innerHeight) {
                        if ((this.model.y + (this.model.getBounds().height / 2)) > Aquarium.viewport.bottom || (this.model.y - (this.model.getBounds().height / 2)) <= Aquarium.viewport.top) {
                            Aquarium.viewport.animate({ time: 250, position: {x: Aquarium.viewport.center.x, y: this.model.y}, removeOnInterrupt: true })
                        }
                    }
                    else {
                        Aquarium.viewport.animate({ time: 250, position: {x: this.model.x, y: this.model.y}, removeOnInterrupt: true })
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
    const displacementMap = "images/displacement_map.webp";
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
        Aquarium.particlesFront.particleContainer.visible = true;
        Aquarium.particlesBack.particleContainer.visible = true;
        Aquarium.viewport.filters = [Aquarium.filters.displacementFilter, Aquarium.filters.godrayFilter]
    }
    else {
        Aquarium.overlay.visible = false;
        Aquarium.viewport.filters = [];
        Aquarium.particlesFront.particleContainer.visible = false;
        Aquarium.particlesBack.particleContainer.visible = false;
    }
}

function setupSound () {
    Aquarium.bgm = PIXI.sound.add('bgm', 'sounds/bgm.mp3');
    Aquarium.bgm.loop = true;
    Aquarium.bgm.volume = 0.5;
    Aquarium.bgm.singleInstance = true;
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
    let pointer = Aquarium.app.renderer.events.rootPointerEvent
    let screenToWorld = Aquarium.viewport.toWorld(pointer.screenX, pointer.screenY);
    debug.fps.text = `Debug Window:\n` +
                        `${PIXI.Ticker.shared.FPS.toFixed(0)} fps\n` +
                        `Viewport: ${Aquarium.app.renderer.width}px x ${Aquarium.app.renderer.height}px\n` +
                        `World: ${Aquarium.viewport.worldWidth}px x ${Aquarium.viewport.worldHeight}px\n` +
                        `${Aquarium.getActiveFish().length}/${Aquarium.getAllFish().length} active fish\n` + 
                        `Mouse Coord: ${screenToWorld.x.toFixed(0)}, ${screenToWorld.y.toFixed(0)}`
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
export function lerp (start, end, v){
    return (1 - v) * start + v * end;
}
export function clamp (v, min, max) {
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
    Aquarium.particlesFront.width = WORLD_WIDTH;
    Aquarium.particlesBack.width = WORLD_WIDTH;
    Aquarium.particlesFront.height = Aquarium.viewport.bottom - Aquarium.viewport.top;
    Aquarium.particlesBack.height = Aquarium.viewport.bottom - Aquarium.viewport.top;

    Aquarium.emitEvent("onViewportUpdate", Aquarium.viewport);
}