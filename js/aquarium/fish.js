import { Aquarium } from "./aquarium.js";

const cubism4Model =
  "./resources/l2d_feesh/fish.model3.json";
// const glowFilter = new PIXI.filters.GlowFilter({ distance: 15, outerStrength: 3 })

let fishCounter = 0;

export function Fish (options = {}) {
    this.node = document.createElement("a");
    this.speed = options.speed || randomRange(0.25, 2);
    this.scale = options.scale || randomRange(0.02, 0.125);
    this.direction = Math.random() >= 0.5 ? 1 : -1;
}

Fish.prototype.init = async function () {
    this.id = fishCounter++;
    this.model = await PIXI.live2d.Live2DModel.from(cubism4Model, { autoUpdate: false, autoInteract: false, idleMotionGroup: 'idle' });
    this.model.cullable = true;
    this.model.filters = [];
    this.model.anchor.set(0.5);
    this.model.scale.set(this.scale);
    if (this.direction === 1) {
        this.model.scale.x *= -1;
    }
    Aquarium.app.ticker.add(this.update.bind(this));
    Aquarium.emitEvent("fishCreated", this);
    return this;
}
Fish.prototype.setVisible = function (isVisible) {
    this.model.renderable = isVisible;
}
Fish.prototype.isVisible = function () {
    return this.model.renderable;
}
Fish.prototype.isInBounds = function (top, left, bottom, right) {
    return  ((this.model.y - (this.model.height / 2)) >= top) && 
            ((this.model.y + this.model.height / 2) <= bottom) && 
            ((this.model.x) >= left) &&
            ((this.model.x) <= right);

}
Fish.prototype.toggleDirection = function () {
    this.direction *= -1;
    this.model.scale.x *= -1;
}
Fish.prototype.update = function (delta) {
    this.setVisible(this.isInBounds(Aquarium.viewport.top - this.model.height, -100, Aquarium.viewport.bottom + this.model.height, Aquarium.viewport.right + 100));
    if (!Aquarium.accessibilityActive) {
        if (Aquarium.currentActiveFish !== this && (this.model.containsPoint(Aquarium.app.renderer.events.pointer))) {
            Aquarium.emitEvent("onFishOver", this);
        }
        else if (Aquarium.currentActiveFish === this && !(this.model.containsPoint(Aquarium.app.renderer.events.pointer))) {
            Aquarium.emitEvent("onFishOut", this);
        }
    }
    if (!this.isVisible()) return;
    if ((this.model.x < 0 && this.direction === -1) || (this.model.x > Aquarium.viewport.worldWidth && this.direction === 1)) {
        this.toggleDirection();
    }
    this.model.update(Aquarium.app.ticker.elapsedMS);
    this.model.x += this.speed * this.direction;
}

Fish.prototype.toggleHighlight = function (isOn) {
    // if (isOn && this.model.filters.length === 0) {
    //     this.model.filters.push(glowFilter);
    // }
    // else if (!isOn && this.model.filters.length > 0) {
    //     this.model.filters.pop();
    // }
}

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}