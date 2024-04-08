// ----------------------------------------
// INITIALIZATION
// ----------------------------------------
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';
ctx.scale(1, 1);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const scaleFactor = Math.min(canvas.width / 1920, canvas.height / 1080);
const scaledWidth = 1920 * scaleFactor;
const scaledHeight = 1080 * scaleFactor;


// ----------------------------------------
// GLOBAL VARIABLES
// ----------------------------------------
var debug = true;
const GRAVITY = 1000
const LIFESPAN = 5000 // 5 seconds
var pressed_keys = {}
var KEYCODES = {
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    SPACE: 32,
    SHIFT: 16,
    CTRL: 17,
};
var mouse = {
    x: undefined,
    y: undefined,
    click: false,
    clickX: undefined,
    clickY: undefined
  };


// ----------------------------------------
// CLASSES
// ----------------------------------------
class RenderGroup {
    constructor() {
        this.objects = [];
        this.running = true;
    }
    add(object) {
        this.objects.push(object);
    }
    remove(object) {
        this.objects = this.objects.filter(obj => obj !== object);
    }
    stop() {
        this.running = false;
    }
    start() {
        this.running = true;
    }
    update(deltaTime) {
        if (this.running) {
            this.objects.forEach(object => {
                object.update(deltaTime);
            });
        }
    }

    draw(ctx) {
        if (this.running) {
            this.objects.forEach(object => {
                object.draw(ctx);
            });
        }
    }
}

class Camera{
    constructor(x, y, width, height){
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.effects = {
            shake: {
                active: false,
                intensity: 0,
                duration: 0,
                time: 0,
                x: 0,
                y: 0
            },
            zoom: {
                active: false,
                intensity: 0,
                duration: 0,
                time: 0,
                x: 0,
                y: 0
            }
        }
        this.renderWidth = width;
        this.renderHeight = height;
        this.zIndex = -100;
    }

    update(deltaTime){
        if (pressed_keys[KEYCODES.LEFT]) {
            main_camera.move(main_camera.x + deltaTime, main_camera.y);
        }

        if (pressed_keys[KEYCODES.RIGHT]) {
            main_camera.move(main_camera.x - deltaTime, main_camera.y);
        }

        if (debug){
            if (pressed_keys[KEYCODES.DOWN]) {
                main_camera.move(main_camera.x, main_camera.y - deltaTime);
            }
            if (pressed_keys[KEYCODES.UP]) {
                main_camera.move(main_camera.x, main_camera.y + deltaTime);
            }
        }
    }

    move(x, y){
        this.x = x;
        this.y = y;
    }

    draw(ctx){
        ctx.setTransform(1, 0, 0, 1, this.x, this.y);
    }
}


class Circle {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.vector = { x: 0, y: 0 };
        this.radius = radius;
        this.color = color;
        this.zIndex = 0;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
    update(deltaTime) {
        this.x += this.vector.x * deltaTime / 1000;
        this.y += this.vector.y * deltaTime / 1000;
    }
}


class Rectangle {
    constructor(x, y, width, height, color) {
        this.x = x;
        this.y = y;
        this.vector = { x: 0, y: 0 };
        this.width = width;
        this.height = height;
        this.color = color;
        this.zIndex = 0;
    }

    draw() {
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
    update(deltaTime) {
        this.x += this.vector.x * deltaTime / 1000;
        this.y += this.vector.y * deltaTime / 1000;
    }
}

class Projectile extends Circle {
    constructor(x, y, radius, color, vector, lifeSpan, gravity) {
        super(x, y, radius, color);
        this.vector = vector;
        this.lifeSpan = lifeSpan || 10000;
        this.startTime = performance.now();
        this.gravity = gravity || 9800;
        this.zIndex = -1;
    }
    update(deltaTime) {
        if (performance.now() - this.startTime > this.lifeSpan) {
            main_group.remove(this);
        }else{
            this.vector.y += this.gravity * deltaTime / 1000;
            super.update(deltaTime);
        }
    
    }

}


class AnimatedSprite {
    constructor(imagePaths, frameDuration, x, y, sf, canvasWidth, canvasHeight) {
        this.imagePaths = imagePaths;
        this.frameDuration = frameDuration;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.currentIndex = 0;
        this.imageObjects = [];
        this.loadImages();
        this.lastFrameTime = 0;
        this.x = x;
        this.y = y;
        this.sf = sf;
        this.orientation = 1;
        this.flipped = false;
    }

    loadImages() {
        this.imagePaths.forEach(path => {
            const image = new Image();
            image.src = path;
            this.imageObjects.push(image);
            console.log("loaded image: ", image.src);
        });
    }

    draw(ctx) {
        const image = this.imageObjects[this.currentIndex];
        ctx.save();
        ctx.scale(this.sf, this.sf);
        ctx.drawImage(image, this.x, this.y, image.width, image.height);
        ctx.restore();
    }

    update() {
        if (!this.lastFrameTime) {
            this.lastFrameTime = performance.now();
        }

        if (performance.now() - this.lastFrameTime > this.frameDuration) {
            this.currentIndex = (this.currentIndex + 1) % this.imageObjects.length;
            this.lastFrameTime = performance.now();
        }
    }

    move(x, y) {
        this.x = x;
        this.y = y;
    }
}


class Sprite {
    constructor(imagePath, x, y, sf) {
        this.image = new Image();
        this.image.src = imagePath;
        this.x = x;
        this.y = y;
        this.sf = sf;
    }

    draw(ctx) {
        ctx.save();
        ctx.scale(this.sf, this.sf);
        ctx.drawImage(this.image, this.x, this.y, this.image.width, this.image.height);
        ctx.restore();
    }

    update() {
        // do nothing
    }
}


// ----------------------------------------
// FUNCTIONS
// ----------------------------------------
function calculateAngle(startX, startY, targetX, targetY, force, gravity) {
    const dx = targetX - startX;
    const dy = targetY - startY;
    const g = gravity || 9.8; // default gravity value is 9.8 m/s^2

    const v0 = force;
    const v0Squared = v0 * v0;
    const v0SquaredSquared = v0Squared * v0Squared;

    const numerator = v0SquaredSquared - g * (g * dx * dx + 2 * dy * v0Squared);
    const denominator = g * dx;

    const tanTheta = (v0Squared + Math.sqrt(numerator)) / denominator;
    const angle = Math.atan(tanTheta);

    return angle;
}


// ----------------------------------------
// EVENT LISTENERS
// ----------------------------------------
window.addEventListener('keydown', (e) => {
    pressed_keys[e.keyCode] = true;
});

window.addEventListener('keyup', (e) => {
    pressed_keys[e.keyCode] = false;
});

window.addEventListener('mousdown', (e) => {
    mouse.click = true;
    mouse.clickX = e.x;
    mouse.clickY = e.y;
});

window.addEventListener('mouseup', (e) => {
    mouse.click = false;
    mouse.clickX = undefined;
    mouse.clickY = undefined;
});

window.addEventListener('mousemove', (e) => {
    mouse.x = e.x;
    mouse.y = e.y;
});

// ----------------------------------------
// MAIN
// ----------------------------------------
const main_group = new RenderGroup();
var main_camera = new Camera(0, 0, canvas.width, canvas.height);
main_group.add(main_camera);
/*
This is a multi-line comment in JavaScript.
You can add multiple lines of comments here.
main_group.add(new Circle(100, 100, 50, 'red'));
main_group.add(new AnimatedSprite(['assets/enemy-0.png', 'assets/enemy-1.png', 'assets/enemy-2.png'], 100, 100, 100, 1, screen.width, screen.height));
main_group.add(new Projectile(200, 200, 10, 'blue', { x: 100, y: 100 }, LIFESPAN, GRAVITY));
main_group.add(new Sprite('assets/tree.png', 300, 300, 0.5));
*/
for (let i = 0; i < canvas.width *3; i += 50) {
    for (let j = 0; j < canvas.height; j += 50) {
        const rectHorizontal = new Rectangle(i, j, 50, 1, 'gray');
        rectHorizontal.zIndex = -2;
        main_group.add(rectHorizontal);

        const rectVertical = new Rectangle(i, j, 1, 50, 'gray');
        rectVertical.zIndex = -2;
        main_group.add(rectVertical);
    }
}


let lastTime = 0;

function update(currentTime) {
    const deltaTime = Math.round((currentTime - lastTime));
    ctx.clearRect(0, 0, -main_camera.x + main_camera.width, -main_camera.y + main_camera.height);

    main_group.update(deltaTime);
    main_group.objects.sort((a, b) => a.zIndex - b.zIndex);
    main_group.draw(ctx);
    


    console.log(deltaTime);
    lastTime = currentTime;
    requestAnimationFrame(update);
}

update(performance.now());
