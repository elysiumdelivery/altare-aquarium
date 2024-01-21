import { Aquarium, LEVELS, WORLD_WIDTH, WORLD_HEIGHT } from "./aquarium.js";

// const glowFilter = new PIXI.filters.GlowFilter({ distance: 15, outerStrength: 3 })
const outlineFilter = new PIXI.filters.OutlineFilter(2, 0x00ffff, 0.25)

let staticFish = ["SmallFish_SandDollar_Semiluminary"];
let fishCounter = 0;

export function Fish (fishData) {
    this.data = fishData;
    this.node = document.createElement("a");
    this.speed = getSpeedFromData(this.data);
    this.scale = getScaleFromSize(this.data["Size Category"]) || randomRange(0.02, 0.125);
    this.direction = Math.random() >= 0.5 ? 1 : -1;
    this.rangeX = this.data["Position X Range"].split("-").map((n) => Number.parseInt(n));
}

Fish.prototype.init = async function () {
    let self = this;
    self.isStatic = staticFish.includes(this.data["Filename"]);
    this.id = fishCounter++;
    if (staticFish.includes(this.data["Filename"])) {
        let modelFilePath = `images/static/${this.data["Filename"]}.png`;
        self.model = PIXI.Sprite.from(modelFilePath);
        self.model.cullable = true;
        self.model.filters = [];
        self.model.anchor.set(0.5, 0.5);
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
            self.hitArea.alpha = 0;
            let minSize = 800;
            if (self.hitArea.width < minSize || self.hitArea.height < minSize) {
                let bounds = self.hitArea.getBounds();
                self.hitArea.drawRect(bounds.x + (bounds.width/2) - (minSize/2), bounds.y + (bounds.y/2) - (minSize/2), minSize, minSize);
            }
            self.hitArea.endFill();
            self.hitArea.cursor = "pointer";
            self.hitArea.interactive = true;
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
        else if (Aquarium.currentActiveFish === this && (this.containsPoint(Aquarium.app.renderer.events.pointer))) {
            Aquarium.emitEvent("onFishMove", this);
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
    if (this.data["Movement"] === "Moving") {
        this.model.y += delta * this.speed * 0.5 * Math.sin((Date.now() + randomRange(20, 100))/ 600);
    }
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

function getSpeedFromData (data) {
    if (data["Slow"] == "TRUE") return randomRange(0.5, 1);
    if (data["Fast"] == "TRUE") return randomRange(1, 1.5);
    if (data["Stationary"] == "TRUE") return 0;
}

function getScaleFromSize (sizeCategory) {
    // return 0.25;
    switch (sizeCategory) {
        case "L": return 0.35;
        case "M": return 0.25;
        case "S": return 0.25;
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

export function parseMath (string) {
    string = string.replace(/\s/g, "");
    string = string.replace("top", LEVELS.Top);
    string = string.replace("surface", LEVELS.Surface);
    string = string.replace("middle", LEVELS.Middle);
    string = string.replace("bottom", WORLD_HEIGHT);
    return parsePlusSeparatedExpression(string);
}

const parseMultiplicationSeparatedExpression = (expression) => {
	const numbersString = expression.split('*');
	const numbers = numbersString.map(noStr => +noStr);
	const initialValue = 1.0;
	const result = numbers.reduce((acc, no) => acc * no, initialValue);
	return result;
};

// both * -
const parseMinusSeparatedExpression = (expression) => {
	const numbersString = expression.split('-');
	const numbers = numbersString.map(noStr => parseMultiplicationSeparatedExpression(noStr));
	const initialValue = numbers[0];
	const result = numbers.slice(1).reduce((acc, no) => acc - no, initialValue);
	return result;
};

// * - + 
const parsePlusSeparatedExpression = (expression) => {
	const numbersString = expression.split('+');
	const numbers = numbersString.map(noStr => parseMinusSeparatedExpression(noStr));
	const initialValue = 0.0;
	const result = numbers.reduce((acc, no) => acc + no, initialValue);
	return result;
};