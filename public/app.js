// ----------------------------------------
// INITIALIZATION
// ----------------------------------------

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// calculate the scale factor so I want that no matter the size of the screen, 4k or 1080p, it should always be the same
const scaleFactor = Math.min(canvas.width / 1920, canvas.height / 1080);
const scaledWidth = 1920 * scaleFactor;
const scaledHeight = 1080 * scaleFactor;


var camera = {
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height,
    effects: {
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
    },
    renderWidth: canvas.width,
    renderHeight: canvas.height,
}
var validName = {
    'minLength': 3,
    'maxLength': 20,
    'anonymous': false,
    'allowedCharacters': 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_ -'
};
var debug = true;


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

    updatePosition(x, y) {
        this.x = x;
        this.y = y;
    }
}



//


// ----------------------------------------
// MAIN
// ----------------------------------------
const main_group = new RenderGroup();
main_group.add(new Circle(100, 100, 50, 'red'));
main_group.add(new AnimatedSprite(['assets/enemy-0.png', 'assets/enemy-1.png', 'assets/enemy-2.png'], 100, 100, 100, 1, screen.width, screen.height));



let lastTime = 0;

function update(currentTime) {
    const deltaTime = Math.round((currentTime - lastTime));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    main_group.update(deltaTime);
    main_group.objects.sort((a, b) => a.zIndex - b.zIndex);
    main_group.draw(ctx);
    


    console.log(deltaTime);
    lastTime = currentTime;
    requestAnimationFrame(update);
}

update(performance.now());
