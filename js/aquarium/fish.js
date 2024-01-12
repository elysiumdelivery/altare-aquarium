import { Aquarium } from "./aquarium.js";

// const glowFilter = new PIXI.filters.GlowFilter({ distance: 15, outerStrength: 3 })
const outlineFilter = new PIXI.filters.OutlineFilter(2, 0x00ffff, 0.25)


let fishCounter = 0;

export function Fish (fishData) {
    this.data = fishData;
    this.node = document.createElement("a");
    this.speed = Number.parseFloat(this.data["Speed"]);
    if (Number.isNaN(this.speed)) {
        this.speed = getSpeedFromSize(fishData["Size Category"]) || randomRange(0.25, 2);
    }
    this.scale = getScaleFromSize(fishData["Size Category"]) || randomRange(0.02, 0.125);
    this.direction = Math.random() >= 0.5 ? 1 : -1;
    this.rangeX = this.data["Position X Range"].split("-").map((n) => Number.parseInt(n));
}

Fish.prototype.init = async function () {
    let self = this;
    self.isStatic = self.data["Is Static"] == "TRUE";
    this.id = fishCounter++;
    if (self.isStatic) {
        let modelFilePath = `images/static/${this.data["Filename"]}.png`;
        self.model = PIXI.Sprite.from(modelFilePath);
        self.model.cullable = true;
        self.model.filters = [];
        self.model.anchor.set(0.5);
        self.model.scale.set(self.scale);
        if (self.direction === 1) {
            self.model.scale.x *= -1;
        }
        return Promise.resolve(self);
    }
    else {
        let modelFilePath = `images/l2d/${this.data["Sea Level"]}/${this.data["Filename"]}/${this.data["Filename"]}.model3.json`;
        return PIXI.live2d.Live2DModel.from(modelFilePath, { autoUpdate: false, autoInteract: false, idleMotionGroup: 'Idle' }).then((loadedModel) => {
            self.model = loadedModel;
            self.model.cullable = true;
            self.model.filters = [];
            self.model.anchor.set(0.5);
            self.model.scale.set(self.scale);
            if (self.direction === 1) {
                self.model.scale.x *= -1;
            }
        
            // setup hitboxes b/c model bounds are huge and go beyond the actual rendered parts
            self.bounds = getActualBounds(self.model);
    
            self.hitArea = new PIXI.Graphics();
            self.hitArea.beginFill(0xff0000);
            self.bounds.forEach(bound => {
                self.hitArea.drawRect(bound.x, bound.y, bound.width, bound.height);
            });
            self.hitArea.endFill();
            self.hitArea.alpha = 0;
            self.model.addChild(self.hitArea); 
    
            return Promise.resolve(self);
        })
    }
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
Fish.prototype.containsPoint = function (point) {
    if (this.isStatic) {
        return this.model.containsPoint(point);
    }
    else {
        return this.hitArea.containsPoint(point);
    }
}
Fish.prototype.inRangeX = function (x, direction) {
    let xMin = this.rangeX[0] || 0;
    let xMax = this.rangeX[1] || Aquarium.viewport.worldWidth;
    return (x < xMin && direction === -1) || (x > xMax && direction === 1);
}
Fish.prototype.update = function (delta) {
    this.setVisible(this.isInBounds(Aquarium.viewport.top - this.model.height, -100, Aquarium.viewport.bottom + this.model.height, Aquarium.viewport.right + 100));
    if (!Aquarium.accessibilityActive) {
        if (Aquarium.currentActiveFish !== this && (this.containsPoint(Aquarium.app.renderer.events.pointer))) {
            Aquarium.emitEvent("onFishOver", this);
        }
        else if (Aquarium.currentActiveFish === this && !(this.containsPoint(Aquarium.app.renderer.events.pointer))) {
            Aquarium.emitEvent("onFishOut", this);
        }
    }
    if (!this.isVisible()) return;
    if (this.inRangeX(this.model.x, this.direction)) {
        this.toggleDirection();
    }
    if (!this.isStatic) {
        this.model.update(Aquarium.app.ticker.elapsedMS);
    }
    this.model.x += delta * this.speed * this.direction;
}

Fish.prototype.toggleHighlight = function (isOn) {
    if (isOn && this.model.filters.length === 0) {
        this.model.filters.push(outlineFilter);
    }
    else if (!isOn && this.model.filters.length > 0) {
        this.model.filters.pop();
    }
}

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

function getSpeedFromSize (sizeCategory) {
    switch (sizeCategory) {
        case "L": return randomRange(0.5, 1);
        case "M": return randomRange(1, 1.5);
        case "S": return randomRange(1.5, 2);
    }
}

function getScaleFromSize (sizeCategory) {
    return 0.25;
    switch (sizeCategory) {
        case "L": return 0.25;
        case "M": return 0.1;
        case "S": return 0.05;
    }
}

function getActualBounds (model) {
    let drawables = model.internalModel.getDrawableIDs();
    return drawables.map((meshId, idx) => {
        let bounds = model.internalModel.getDrawableBounds(idx);
        return {
            x: bounds.x,
            y: bounds.y,
            width: ((bounds.width)),
            height: ((bounds.height)),
        }
    });
}