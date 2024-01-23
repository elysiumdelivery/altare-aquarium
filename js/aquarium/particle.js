import { Aquarium, LEVELS, WORLD_WIDTH, WORLD_HEIGHT } from "./aquarium.js";

let MOTION_PREF = "allow";

const PARTICLE_COUNT = 100;

// from: https://www.joshwcomeau.com/snippets/javascript/debounce/
const debounce = (callback, wait) => {
  let timeoutId = null;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback.apply(null, args);
    }, wait);
  };
};

function Particle (texture, radius, x, y, speed) {
    this.radius = radius;
    this.sprite = PIXI.Sprite.from(texture);
    this.sprite.anchor.set(0.5);
    this.sprite.direction = Math.random() * Math.PI * 2;
    this.sprite.turnSpeed = Math.random() - 0.8;
    this.sprite.scale.set(0.25 + Math.random() * 0.15);
    this.sprite.original = new PIXI.Point();
    this.sprite.original.copyFrom(this.sprite.scale);
    this.sprite.x = x;
    this.sprite.y = y;
    this.sprite.alpha = 0.5;
    this.sprite.speed = speed;
    this.interactive = true;
    this.sprite.eventMode = "static";
    this.sprite.inertia = 0;
    this.scrollDelta = 0;

    this.move = function (delta, count) {
        this.sprite.direction += this.sprite.turnSpeed * 0.01;
        this.sprite.x += Math.sin(this.sprite.direction) * this.sprite.speed;
        this.sprite.y += Math.cos(this.sprite.direction) * this.sprite.speed;
        this.sprite.rotation = -this.sprite.direction - Math.PI / 2;

        if (this.sprite.inertia > 0) {
        const depthShift =
            (this.radius / 10) * this.scrollDelta * this.sprite.inertia;
        this.sprite.y += depthShift;
        this.sprite.inertia -= delta * 0.02;
        }

        if (this.sprite.x < 0) {
            this.sprite.x += WORLD_WIDTH;
        } else if (this.sprite.x > 0 + WORLD_WIDTH) {
            this.sprite.x -= WORLD_WIDTH;
        }

        let worldHeight = Aquarium.viewport.bottom - Aquarium.viewport.top;

        if (this.sprite.y < 0) {
            this.sprite.y += worldHeight;
        } else if (this.sprite.y > 0 + worldHeight) {
            this.sprite.y -= worldHeight;
        }
  }

    this.shift = function (amount) {
        const depthShift = (this.radius / 10) * amount;
        this.sprite.y += depthShift;
    }
}

export function Particles () {
    let self = this;
    self.particles = [];
    self.particleTotal = PARTICLE_COUNT;
    self.count = 0;
    self.scrollY;
    self.ticking = false;
    self.motionPref = true;

    Aquarium.app.ticker.add((d) => {
        self.count += 0.2;
        self.particles.forEach((particle) => {
            particle.move(d, self.count);
        });
    });

    self.createParticles();

    // window.addEventListener("themeSwitch", this.handleSwitch);
    // window.addEventListener("motionSwitch", this.handleMotion);
    // window.addEventListener("scroll", this.handleScroll);
    return self;
}

Particles.prototype.createParticles = function () {
    if (this.particleContainer) return;

    this.particleContainer = new PIXI.ParticleContainer();

    for (let i = 0; i < this.particleTotal; i++) {
        const circle = new PIXI.Graphics();
        const x = Math.random() * WORLD_WIDTH;
        const y = Math.random() * WORLD_HEIGHT;
        const radius = Math.random() * 10 + 4;
        const color = "#ffffff"
        const speed = this.motionPref ? Math.random() : 0;

        circle.beginFill(color);
        circle.drawCircle(0, 0, radius);
        circle.endFill();

        const circleTexture = Aquarium.app.renderer.generateTexture(circle);
        const particle = new Particle(
            circleTexture,
            radius,
            x,
            y,
            speed
        );

        this.particles.push(particle);
        this.particleContainer.addChild(particle.sprite);
    }
}

Particles.prototype.handleResize = debounce((event) => {
    this.particleContainer.destroy();
    this.particleContainer = null;
    this.createParticles();
});

Particles.prototype.handleScroll = function (event) {
    let self = this;
    if (!this.ticking) {
        window.requestAnimationFrame(() => {
            let newScroll = Aquarium.viewport.y;
            let scrollDelta = self.scrollY - newScroll;
            let delta = Math.floor(scrollDelta) || 0;
            self.scrollY = newScroll;
            self.particles.forEach((particle) => {
                // particle.shift(delta)
                particle.sprite.inertia = 1;
                particle.scrollDelta = -delta;
            });
            self.ticking = false;
        });
        self.ticking = true;
    }
}

//   handleMotion = () => {
//     this.particles.forEach((particle) => {
//       const speed = this.motionPref ? Math.random() : 0;
//       particle.sprite.speed = speed;
//     });
//   };


// HELPER FUNCTIONS
// for toggling theme and motion for demo purposes
// this does not account for system preferences

// const toggleMotion = document.getElementById("toggle-motion");

// toggleMotion.addEventListener("click", () => {
//   let newPref;
//   if (MOTION_PREF === "allow") {
//     newPref = "reduced";
//   } else {
//     newPref = "allow";
//   }

//   MOTION_PREF = newPref;
//   const event = new CustomEvent("motionSwitch", { detail: newPref });
//   window.dispatchEvent(event);
// });
