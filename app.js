// ----------------------------------------
// INITIALIZATION
// ----------------------------------------
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ----------------------------------------
// GLOBAL VARIABLES
// ----------------------------------------
var debug = true; // Set to true to draw collision boxes
const GRAVITY = 2000; // Gravity strength
var pressed_keys = {};
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

// Ground level
const groundY = canvas.height * 0.78;

// Game speed and score
let gameSpeed = 5; // Initial game speed
let score = 0;     // Score counter
let highScore = 0; // High score
let gameOver = false; // Game over flag

// Retrieve high score from cookie
function getCookie(name) {
    let nameEQ = name + "=";
    let ca = document.cookie.split(';');
    for(let i=0;i < ca.length;i++) {
        let c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return parseInt(c.substring(nameEQ.length,c.length));
    }
    return 0;
}

function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        let date = new Date();
        date.setTime(date.getTime()+(days*24*60*60*1000));
        expires = "; expires="+date.toUTCString();
    }
    document.cookie = name+"="+(value||"")+expires+"; path=/";
}

highScore = getCookie('highScore') || 0;

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
            // Sort objects by zIndex
            this.objects.sort((a, b) => a.zIndex - b.zIndex);
            this.objects.forEach(object => {
                object.draw(ctx);
            });
        }
    }
}

class GameObject {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.vector = { x: 0, y: 0 };
        this.width = width;
        this.height = height;
        this.zIndex = 0;

        // Default hitbox scales to 100% unless specified
        this.hitboxScaleX = 1;
        this.hitboxScaleY = 1;
    }

    getBoundingBox() {
        return {
            x: this.x + this.width * (1 - this.hitboxScaleX) / 2,
            y: this.y + this.height * (1 - this.hitboxScaleY) / 2,
            width: this.width * this.hitboxScaleX,
            height: this.height * this.hitboxScaleY
        };
    }

    drawBoundingBox(ctx) {
        const bbox = this.getBoundingBox();
        ctx.save();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
        ctx.restore();
    }

    update(deltaTime) {
        this.x += this.vector.x * deltaTime / 1000;
        this.y += this.vector.y * deltaTime / 1000;
    }

    draw(ctx) {
        // To be implemented in subclasses
    }
}

class AnimatedSprite extends GameObject {
    constructor(imagePaths, frameDuration, x, y, sf) {
        super(x, y, 0, 0);
        this.imagePaths = imagePaths;
        this.frameDuration = frameDuration;
        this.currentIndex = 0;
        this.imageObjects = [];
        this.loadImages();
        this.lastFrameTime = 0;
        this.sf = sf;
        this.orientation = 1;
        this.flipped = false;
        this.zIndex = 1;
        this.isOnGround = false;

        // Adjusted hitbox scale to 80% (smaller by 20%)
        this.hitboxScaleX = 0.8;
        this.hitboxScaleY = 0.8;
    }

    loadImages() {
        this.imagePaths.forEach(path => {
            const image = new Image();
            image.src = path;
            image.onload = () => {
                this.width = image.width * this.sf;
                this.height = image.height * this.sf;
            };
            this.imageObjects.push(image);
        });
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    draw(ctx) {
        const image = this.imageObjects[this.currentIndex];
        if (!image) return;

        ctx.save();
        ctx.scale(this.sf, this.sf);
        ctx.drawImage(image, this.x / this.sf, this.y / this.sf, image.width, image.height);
        ctx.restore();

        if (debug) {
            this.drawBoundingBox(ctx);
        }
    }

    update(deltaTime) {
        if (gameOver) return;

        // Animation frame update
        if (!this.lastFrameTime) {
            this.lastFrameTime = performance.now();
        }

        if (performance.now() - this.lastFrameTime > this.frameDuration) {
            this.currentIndex = (this.currentIndex + 1) % this.imageObjects.length;
            this.lastFrameTime = performance.now();
        }

        // Physics update
        this.vector.y += GRAVITY * deltaTime / 1000; // Apply gravity
        this.y += this.vector.y * deltaTime / 1000;

        // Ground collision detection
        if (this.y + this.getHeight() >= groundY) {
            this.y = groundY - this.getHeight();
            this.vector.y = 0; // Stop falling
            this.isOnGround = true;
        } else {
            this.isOnGround = false;
        }
    }
}

class Sprite extends GameObject {
    constructor(imagePath, x, y, sf) {
        super(x, y, 0, 0);
        this.image = new Image();
        this.image.src = imagePath;
        this.sf = sf;
        this.image.onload = () => {
            this.width = this.image.width * this.sf;
            this.height = this.image.height * this.sf;
        };

        // Default hitbox scales to 100% unless specified
        this.hitboxScaleX = 1;
        this.hitboxScaleY = 1;
    }

    draw(ctx) {
        if (!this.image) return;

        ctx.save();
        ctx.scale(this.sf, this.sf);
        ctx.drawImage(this.image, this.x / this.sf, this.y / this.sf, this.image.width, this.image.height);
        ctx.restore();

        if (debug) {
            this.drawBoundingBox(ctx);
        }
    }

    update(deltaTime) {
        if (gameOver) return;

        // Move to the left to simulate character running
        this.x -= gameSpeed;
    }
}

class Spike extends GameObject {
    constructor(x, y, sf, sizeMultiplier = 1) {
        const width = 50 * sizeMultiplier;
        const height = 50 * sizeMultiplier;
        super(x, y - (height - 50), width, height); // Adjust y to keep spike on ground
        this.image = new Image();
        this.image.src = 'assets/smallspike.png';
        this.sf = sf * sizeMultiplier;
        this.zIndex = 0;
        this.passed = false; // To check if spike has been passed for scoring

        // Fixed hitbox size scaled with spike
        this.hitboxScaleX = 1;
        this.hitboxScaleY = 1;

        this.sizeMultiplier = sizeMultiplier;
    }

    draw(ctx) {
        if (!this.image) return;

        ctx.save();
        ctx.scale(this.sf, this.sf);
        // Draw image with scaled size
        ctx.drawImage(this.image, this.x / this.sf, this.y / this.sf, 50, 50);
        ctx.restore();

        if (debug) {
            this.drawBoundingBox(ctx);
        }
    }

    update(deltaTime) {
        if (gameOver) return;

        // Move to the left
        this.x -= gameSpeed;

        // Check for collision with character before removing
        if (checkCollision(character, this)) {
            // Handle collision (game over)
            gameOver = true;
            if (score > highScore) {
                highScore = score;
                setCookie('highScore', highScore, 365);
            }
        }

        // Remove spike if off-screen
        if (this.x + this.width < 0) {
            main_group.remove(this);
            spikes.splice(spikes.indexOf(this), 1);
        }

        // Check if spike is passed for scoring
        if (!this.passed && this.x + this.width < character.x) {
            this.passed = true;
            score++;
        }
    }
}

class Ground extends GameObject {
    constructor(x, y, width, height) {
        super(x, y, width, height);
        this.zIndex = -10;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = 'white';
        ctx.fill();
    }

    update(deltaTime) {
        if (gameOver) return;

        // Move ground to the left
        this.x -= gameSpeed;

        // Reset position if off-screen
        if (this.x <= -canvas.width) {
            this.x = 0;
        }
    }
}

// ----------------------------------------
// FUNCTIONS
// ----------------------------------------
function checkCollision(objA, objB) {
    const a = objA.getBoundingBox();
    const b = objB.getBoundingBox();

    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

// Function to determine maximum spikes on screen based on score
function getMaxSpikesOnScreen() {
    // Increase max spikes every 10 points, up to a maximum of 3
    return Math.min(1 + Math.floor(score / 10), 3);
}

// Spike size scaling based on score
function getSpikeSizeMultiplier() {
    // Increase spike size every 15 points, up to a maximum multiplier of 2
    return Math.min(1 + (score / 30), 2);
}

function spawnSpikes() {
    if (gameOver) return;

    // Calculate maximum spikes allowed based on score
    let maxSpikesOnScreen = getMaxSpikesOnScreen();

    // Check if current spikes on screen are less than max allowed
    if (spikes.length < maxSpikesOnScreen) {
        // Determine if we should spawn a batch of spikes
        let spawnBatch = Math.random() < 0.3; // 30% chance to spawn a batch
        let batchCount = spawnBatch ? Math.floor(Math.random() * 3) + 2 : 1; // Spawn 2-4 spikes in a batch

        // Ensure batch is passable
        let gapCreated = false;

        for (let i = 0; i < batchCount; i++) {
            let sizeMultiplier = getSpikeSizeMultiplier();
            let spikeHeight = 50 * sizeMultiplier;
            let spikeY = groundY - spikeHeight;
            let spikeX = canvas.width + i * (60 * sizeMultiplier); // Spikes are spaced out

            // Create a gap in the batch to ensure it's passable
            if (!gapCreated && Math.random() < 0.5) {
                gapCreated = true;
                continue; // Skip this iteration to create a gap
            }

            let spike = new Spike(spikeX, spikeY, 1, sizeMultiplier);
            spikes.push(spike);
            main_group.add(spike);
        }

        // Ensure at least one gap is created
        if (!gapCreated && batchCount > 1) {
            // Remove a random spike to create a gap
            let randomIndex = Math.floor(Math.random() * spikes.length);
            let spikeToRemove = spikes[randomIndex];
            main_group.remove(spikeToRemove);
            spikes.splice(randomIndex, 1);
        }
    }

    let minSpawnInterval = 2000; // Adjusted minimum time between spawn attempts
    let maxSpawnInterval = 4000; // Adjusted maximum time between spawn attempts
    let spawnInterval = Math.random() * (maxSpawnInterval - minSpawnInterval) + minSpawnInterval;

    // Recursively call spawnSpikes after a delay
    setTimeout(spawnSpikes, spawnInterval / gameSpeed);
}

function showGameOverScreen() {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 50);

    ctx.font = '24px Arial';
    ctx.fillText('Click to Restart', canvas.width / 2, canvas.height / 2);

    ctx.font = '24px Arial';
    ctx.fillText('High Score: ' + highScore, canvas.width / 2, canvas.height / 2 + 50);

    ctx.restore();
}

function resetGame() {
    gameOver = false;
    score = 0;
    gameSpeed = 5;

    // Remove all spikes
    spikes.forEach(spike => main_group.remove(spike));
    spikes = [];

    // Reset character position
    character.y = groundY - character.getHeight();
    character.vector.y = 0;
    character.isOnGround = true;

    // Reset ground position
    ground.x = 0;

    // Restart spawning spikes
    spawnSpikes();
}

// ----------------------------------------
// EVENT LISTENERS
// ----------------------------------------
window.addEventListener('keydown', (e) => {
    pressed_keys[e.keyCode] = true;

    // Jump when space or up arrow is pressed
    if ((e.keyCode === KEYCODES.SPACE || e.keyCode === KEYCODES.UP) && character.isOnGround) {
        character.vector.y = -900; // Adjust jump strength as needed
    }
});

window.addEventListener('keyup', (e) => {
    pressed_keys[e.keyCode] = false;
});

window.addEventListener('mousedown', (e) => {
    mouse.click = true;
    mouse.clickX = e.x;
    mouse.clickY = e.y;

    if (gameOver) {
        // Restart game on click
        resetGame();
    } else {
        // Jump when screen is clicked
        if (character.isOnGround) {
            character.vector.y = -900; // Adjust jump strength as needed
        }
    }
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

// Character setup
var character = new AnimatedSprite(
    ['assets/enemy-0.png', 'assets/enemy-1.png', 'assets/enemy-2.png'],
    100,
    100,
    groundY - 100, // Starting position adjusted
    1
);
main_group.add(character);

// Array to hold spikes for collision detection
var spikes = [];

// Start spawning spikes
spawnSpikes();

// Ground
const ground = new Ground(0, groundY, canvas.width * 2, canvas.height - groundY); // Extended width for smoother scrolling
main_group.add(ground);

let lastTime = 0;
function update(currentTime) {
    const deltaTime = currentTime - lastTime;

    if (!gameOver) {
        // Increase game speed over time
        gameSpeed += 0.001; // Adjust the increment to control speed increase rate
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    main_group.update(deltaTime);
    main_group.draw(ctx);

    // Draw current score centered in white
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Score: ' + score, canvas.width / 2, 30);
    ctx.restore();

    // Draw high score at top-left in black
    ctx.save();
    ctx.fillStyle = 'black';
    ctx.font = '18px Arial';
    ctx.fillText('High Score: ' + highScore, 10, 20);
    ctx.restore();

    if (gameOver) {
        showGameOverScreen();
    }

    lastTime = currentTime;
    requestAnimationFrame(update);
}

update(performance.now());
