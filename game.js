const CANVAS = document.getElementById("game-canvas");
const CANVAS_CONTEXT = CANVAS.getContext("2d");

const CAT_SPRITE = document.getElementById("cat-sprite");
const CAT_WIDTH = 64;
const CAT_HEIGHT = 64;

const GROUND_SPRITE = document.getElementById("ground-sprite");
const GROUND_WIDTH = 320;
const GROUND_HEIGHT = 80;

const CANNON_WHEEL_SPRITE = document.getElementById("cannon-wheel-sprite");
const CANNON_WHEEL_WIDTH = 80;
const CANNON_WHEEL_HEIGHT = 80;

const CANNON_SPRITE = document.getElementById("cannon-sprite");
const CANNON_WIDTH = 128;
const CANNON_HEIGHT = 64;

const LAND_BUTTON_SPRITE = document.getElementById("land-button-sprite");
const LAND_BUTTON_WIDTH = 64;
const LAND_BUTTON_HEIGHT = 64;

const TRAMPOLINE_SPRITE = document.getElementById("trampoline-sprite");
const TRAMPOLINE_WIDTH = 80;
const TRAMPOLINE_HEIGHT = 40;

const PUDDLE_SPRITE = document.getElementById("puddle-sprite");
const PUDDLE_WIDTH = 128;
const PUDDLE_HEIGHT = 32;

const CLEW_SPRITE = document.getElementById("clew-sprite");
const CLEW_WIDTH = 48;
const CLEW_HEIGHT = 48;

const MUSIC = document.getElementById("music");
const MEOW_SOUND = document.getElementById("meow-sound");
const CANNON_SOUND = document.getElementById("cannon-sound");
const LAND_SOUND = document.getElementById("land-sound");
const TRAMPOLINE_SOUNDS = [document.getElementById("trampoline-1-sound"),
                           document.getElementById("trampoline-2-sound")];
const PUDDLE_SOUNDS = [document.getElementById("puddle-1-sound"),
                       document.getElementById("puddle-2-sound"),
                       document.getElementById("puddle-3-sound"),
                       document.getElementById("puddle-4-sound"),
                       document.getElementById("puddle-5-sound")];
const HAPPY_MEOW_SOUND = document.getElementById("happy-meow-sound");

const GAME_CONTAINER = document.getElementById("game-container");
const LOADING_SCREEN = document.getElementById("loading-screen");
const GAME_ICON = document.getElementById("game-icon");
const PLAY_BUTTON = document.getElementById("play-button");

const SCORE = document.getElementById("score");
const BEST_SCORE = document.getElementById("best-score");

const IDLE_TIME = document.getElementById("idle-time");

const LAND_BUTTON = document.getElementById("land-button");
const LAND_COOLDOWN = document.getElementById("land-cooldown");

const UPDATE_DISTANCE = 256;

const CANNON_VELOCITY = 768;

const LAND_VELOCITY = 512;

const GRAVITY = 256;

class Game {
    static #instance;

    #lastUpdate;
    #cameraX;
    #cameraY;
    #landCooldown;
    #cat;
    #cannon;
    #isGameRunning;
    #isCatLaunched;
    #idleTime;
    #bestScore;
    #score;
    #objects;

    constructor() {
        if (Game.#instance)
            return Game.#instance;
        Game.#instance = this;

        this.#lastUpdate = Date.now();

        this.#cat = new Cat();
        this.#cannon = new Cannon(this.#cat);

        this.#objects = [];

        document.addEventListener("keydown", this.#onKeydown.bind(this));

        BEST_SCORE.innerText = this.#bestScore = localStorage.getItem("bestScore") || 0;

        requestAnimationFrame(this.#update.bind(this));
        requestAnimationFrame(this.#render.bind(this));
    }

    #clearCanvas() {
        CANVAS_CONTEXT.setTransform(1, 0, 0, 1, 0, 0);
        CANVAS_CONTEXT.clearRect(0, 0, CANVAS.width, CANVAS.height);
    }

    start() {
        this.#cameraX = 0;
        this.#cameraY = 0;
        this.#landCooldown = 0;
        this.#score = 0;
        this.#isCatLaunched = false;
        this.#addObject(768);
        this.#cat.init();
        this.#cannon.init();
        this.#isGameRunning = true;
    }

    stop() {
        if (this.#score > this.#bestScore) {
            BEST_SCORE.innerText = this.#bestScore = this.#score;
            localStorage.setItem("bestScore", this.#bestScore);
        }
        this.#isGameRunning = false;
        this.#objects = [];
    }

    #restart() {
        this.stop();
        this.start();
    }

    #onKeydown(ev) {
        if (ev.code == "Space" || ev.code == "Enter")
            if (this.#isCatLaunched)
                this.land();
            else
                this.launchCat();
    }

    land() {
        if (this.#landCooldown > 0 || !this.#isCatLaunched)
            return;
        LAND_SOUND.play();
        this.#landCooldown = 12;
        this.#cat.velocityY = Math.max(this.#cat.velocityY, 0) + LAND_VELOCITY;
    }

    launchCat() {
        if (this.#isCatLaunched)
            return;
        this.#isCatLaunched = true;
        this.#cannon.launch();
    }

    #update() {
        if (!this.#isGameRunning)
            return;

        let now = Date.now();
        let deltaTime = (now - this.#lastUpdate) / 1000;
        this.#lastUpdate = now;

        this.#landCooldown = Math.max(this.#landCooldown - deltaTime, 0);
        LAND_COOLDOWN.innerText = Math.round(this.#landCooldown);
        if (this.#landCooldown == 0) {
            LAND_COOLDOWN.style.display = "none";
            if (LAND_BUTTON.classList.contains("unavailable"))
                LAND_BUTTON.classList.remove("unavailable");
        }
        else {
            LAND_COOLDOWN.style.display = "block";
            if (!LAND_BUTTON.classList.contains("unavailable"))
                LAND_BUTTON.classList.add("unavailable");
        }

        let previousCatX = Math.round(this.#cat.positionX);
        let previousCatY = Math.round(this.#cat.positionY);

        this.#cannon.update(deltaTime, this.#isCatLaunched);
        this.#cat.update(deltaTime);
        this.#updateCamera();
        this.#updateBackground();
        this.#updateScore();
        this.#updateObjects();

        if (Math.round(this.#cat.positionX) == previousCatX && Math.round(this.#cat.positionY) == previousCatY) {
            this.#idleTime += deltaTime;
            if (this.#idleTime >= 2) {
                IDLE_TIME.innerText = Math.round(7 - this.#idleTime);
                IDLE_TIME.style.display = "block";
            }
            if (this.#idleTime >= 7)
                this.#restart();
        }
        else {
            this.#idleTime = 0;
            IDLE_TIME.style.display = "none";
        }

        requestAnimationFrame(this.#update.bind(this));
    }

    #updateCamera() {
        this.#cameraX = this.#cat.positionX;
        this.#cameraY = Math.min(this.#cat.positionY, CANVAS.height / 2);
    }

    #updateBackground() {
        document.body.style.backgroundColor = `hsl(180, 100%, ${33 - (CANVAS.height - this.#cat.positionY) / 1024}%)`;
    }

    #updateScore() {
        this.#score = Math.max(this.#score, Math.round(this.#cat.positionX / 10));
        SCORE.innerText = this.#score;
    }

    #updateObjects() {
        for (let object of this.#objects)
            if (distance(this.#cat.positionX, this.#cat.positionY, object.positionX, object.positionY) <= UPDATE_DISTANCE)
                object.update();

        let lastObject = this.#objects[this.#objects.length - 1];
        if (lastObject.positionX - this.#cameraX - CANVAS.width / 2 < 0)
            this.#addObject(lastObject.positionX + random(512, 1024));
    }

    #addObject(x) {
        this.#objects.push(new (GAME_OBJECTS[random(0, GAME_OBJECTS.length - 1)])(this.#cat, x));
    }

    #render() {
        this.#clearCanvas();

        this.#cat.render(this.#cameraX, this.#cameraY);
        this.#renderGround();
        this.#cannon.render(this.#cameraX, this.#cameraY);
        this.#renderObjects();

        requestAnimationFrame(this.#render.bind(this));
    }

    #renderGround() {
        if (CANVAS.height / 2 - GROUND_HEIGHT - this.#cameraY >= 0)
            return;
        CANVAS_CONTEXT.setTransform(1, 0, 0, 1, 0, 0);
        let offset = GROUND_WIDTH + this.#cameraX % GROUND_WIDTH;
        for (let x = 0; x - offset < CANVAS.width; x += GROUND_WIDTH)
            CANVAS_CONTEXT.drawImage(GROUND_SPRITE, x - offset, CANVAS.height * 1.5 - GROUND_HEIGHT - this.#cameraY, GROUND_WIDTH, GROUND_HEIGHT);
    }

    #renderObjects() {
        for (let object of this.#objects)
            object.render(this.#cameraX, this.#cameraY);
    }
}

class Cat {
    init() {
        this.positionX = 0;
        this.positionY = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.anchored = true;
        this.rotation = 0;
    }

    update(deltaTime) {
        if (this.anchored)
            return;

        this.velocityY += GRAVITY * deltaTime;

        this.positionX += this.velocityX * deltaTime;
        this.positionY += this.velocityY * deltaTime;

        if (this.positionY > CANVAS.height - GROUND_HEIGHT - CAT_HEIGHT / 2) {
            if (this.velocityY > 8)
                MEOW_SOUND.play();

            this.positionY = CANVAS.height - GROUND_HEIGHT - CAT_HEIGHT / 2;
            this.velocityY = -this.velocityY * .5;
            this.velocityX *= .8;
        }
    }

    render(cameraX, cameraY) {
        if (!this.anchored)
            this.rotation = Math.atan2(this.velocityY, this.velocityX);
        CANVAS_CONTEXT.setTransform(1, 0, 0, 1, this.positionX - cameraX + CANVAS.width / 2, this.positionY - cameraY + CANVAS.height / 2);
        CANVAS_CONTEXT.rotate(this.rotation);
        CANVAS_CONTEXT.drawImage(CAT_SPRITE, -CAT_WIDTH / 2, -CAT_HEIGHT / 2, CAT_WIDTH, CAT_HEIGHT);
    }
}

class Cannon {
    #cat;
    #rotation;
    #rotationDirection;
    #positionX = -CANNON_WIDTH;
    #positionY = CANVAS.height - GROUND_HEIGHT - CANNON_WHEEL_HEIGHT / 4;

    constructor(cat) {
        this.#cat = cat;
    }

    init() {
        this.#rotation = 0;
        this.#rotationDirection = -1;
    }

    update(deltaTime, isCatLaunched) {
        if (isCatLaunched)
            return;
        this.#rotation += Math.PI * deltaTime / 4 * this.#rotationDirection;
        if ((this.#rotationDirection == -1 && this.#rotation <= -Math.PI / 2) ||
            (this.#rotationDirection == 1 && this.#rotation >= 0))
            this.#rotationDirection = -this.#rotationDirection;
        this.#cat.rotation = this.#rotation;
        this.#cat.positionX = (CANNON_WIDTH / 2 + CAT_HEIGHT * .75) * Math.cos(this.#rotation) + this.#positionX;
        this.#cat.positionY = (CANNON_WIDTH / 2 + CAT_HEIGHT * .75) * Math.sin(this.#rotation) + this.#positionY - CANNON_HEIGHT / 4;
    }

    render(cameraX, cameraY) {
        if (!areObjectsColliding(this.#positionX, this.#positionY, CANNON_WIDTH, CANNON_HEIGHT,
                                 cameraX, cameraY, CANVAS.width, CANVAS.height))
            return;
        CANVAS_CONTEXT.setTransform(1, 0, 0, 1, this.#positionX - cameraX + CANVAS.width / 2, this.#positionY - CANNON_HEIGHT / 4 - cameraY + CANVAS.height / 2);
        CANVAS_CONTEXT.rotate(this.#rotation);
        CANVAS_CONTEXT.drawImage(CANNON_SPRITE, -CANNON_WIDTH / 4, -CANNON_HEIGHT / 2, CANNON_WIDTH, CANNON_HEIGHT);
        CANVAS_CONTEXT.setTransform(1, 0, 0, 1, 0, 0);
        CANVAS_CONTEXT.drawImage(CANNON_WHEEL_SPRITE, this.#positionX - CANNON_WHEEL_WIDTH / 2 - cameraX + CANVAS.width / 2, this.#positionY - CANNON_WHEEL_HEIGHT / 2 - cameraY + CANVAS.height / 2, CANNON_WHEEL_WIDTH, CANNON_WHEEL_HEIGHT);
    }

    launch() {
        CANNON_SOUND.play();
        this.#cat.anchored = false;
        let multiplier = 1.25 - Math.random() / 2;
        this.#cat.velocityX = CANNON_VELOCITY * multiplier * Math.cos(this.#rotation);
        this.#cat.velocityY = CANNON_VELOCITY * multiplier * Math.sin(this.#rotation);
    }
}

class GameObject {
    constructor(cat, x) {
        this._cat = cat;
        this.positionX = x;
    }
}

class Trampoline extends GameObject {
    #isColliding = false;

    positionY = CANVAS.height - GROUND_HEIGHT - TRAMPOLINE_HEIGHT / 3;

    update() {
        let isColliding = areObjectsColliding(
            this._cat.positionX, this._cat.positionY, CAT_WIDTH, CAT_HEIGHT,
            this.positionX, this.positionY, TRAMPOLINE_WIDTH, TRAMPOLINE_HEIGHT * 2
        );
        if (!this.#isColliding && isColliding) {
            TRAMPOLINE_SOUNDS[random(0, TRAMPOLINE_SOUNDS.length - 1)].play();
            this._cat.velocityX += random(4, 8);
            this._cat.velocityY = -512 - Math.max(this._cat.velocityY, 0) * (0.9 - Math.random() / 5);
        }
        this.#isColliding = isColliding;
    }

    render(cameraX, cameraY) {
        if (!areObjectsColliding(this.positionX, this.positionY, TRAMPOLINE_WIDTH, TRAMPOLINE_HEIGHT,
                                 cameraX, cameraY, CANVAS.width, CANVAS.height))
            return;
        CANVAS_CONTEXT.setTransform(1, 0, 0, 1, 0, 0);
        CANVAS_CONTEXT.drawImage(TRAMPOLINE_SPRITE, this.positionX - TRAMPOLINE_WIDTH / 2 - cameraX + CANVAS.width / 2, this.positionY - TRAMPOLINE_HEIGHT / 2 - cameraY + CANVAS.height / 2, TRAMPOLINE_WIDTH, TRAMPOLINE_HEIGHT);
    }
}

class Puddle extends GameObject {
    positionY = CANVAS.height - GROUND_HEIGHT + PUDDLE_HEIGHT / 2;

    update() {
        if (areObjectsColliding(
            this._cat.positionX, this._cat.positionY, CAT_WIDTH, CAT_HEIGHT,
            this.positionX, this.positionY, PUDDLE_WIDTH, PUDDLE_HEIGHT * 2
        )) {
            PUDDLE_SOUNDS[random(0, PUDDLE_SOUNDS.length - 1)].play();
            this._cat.velocityX *= 0.4;
            this._cat.velocityY *= 0.2;
        }
    }

    render(cameraX, cameraY) {
        if (!areObjectsColliding(this.positionX, this.positionY, PUDDLE_WIDTH, PUDDLE_HEIGHT,
                                 cameraX, cameraY, CANVAS.width, CANVAS.height))
            return;
        CANVAS_CONTEXT.setTransform(1, 0, 0, 1, 0, 0);
        CANVAS_CONTEXT.drawImage(PUDDLE_SPRITE, this.positionX - PUDDLE_WIDTH / 2 - cameraX + CANVAS.width / 2, this.positionY - PUDDLE_HEIGHT / 2 - cameraY + CANVAS.height / 2, PUDDLE_WIDTH, PUDDLE_HEIGHT);
    }
}

class Clew extends GameObject
{
    #isColliding = false;

    positionY = CANVAS.height - GROUND_HEIGHT - CLEW_HEIGHT / 2;

    update() {
        let isColliding = areObjectsColliding(
            this._cat.positionX, this._cat.positionY, CAT_WIDTH, CAT_HEIGHT,
            this.positionX, this.positionY, CLEW_WIDTH, CLEW_HEIGHT
        );
        if (!this.#isColliding && isColliding) {
            HAPPY_MEOW_SOUND.play();
            this._cat.velocityX = random(256, 512) + Math.max(this._cat.velocityX, 0);
            this._cat.velocityY = -128 - Math.max(this._cat.velocityY, 0) * 0.8;
        }
        this.#isColliding = isColliding;
    }

    render(cameraX, cameraY) {
        if (!areObjectsColliding(this.positionX, this.positionY, CLEW_WIDTH, CLEW_HEIGHT,
                                 cameraX, cameraY, CANVAS.width, CANVAS.height))
            return;
        CANVAS_CONTEXT.setTransform(1, 0, 0, 1, 0, 0);
        CANVAS_CONTEXT.drawImage(CLEW_SPRITE, this.positionX - CLEW_WIDTH / 2 - cameraX + CANVAS.width / 2, this.positionY - CLEW_HEIGHT / 2 - cameraY + CANVAS.height / 2, CLEW_WIDTH, CLEW_HEIGHT);
    }
}

const GAME_OBJECTS = [Trampoline, Puddle, Clew];

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function distance(x1, y1, x2, y2) {
    let a = x1 - x2;
    let b = y1 - y2;
    return Math.sqrt(a * a + b * b);
}

function areObjectsColliding(x1, y1, w1, h1, x2, y2, w2, h2) {
    return Math.abs(x1 - x2) <= (w1 + w2) / 2 &&
           Math.abs(y1 - y2) <= (h1 + h2) / 2;
}

function isInRect(x1, y1, x2, y2, w, h) {
    return Math.abs(x1 - x2) <= w / 2 &&
           Math.abs(y1 - y2) <= h / 2;
}

MUSIC.volume = 0.2;

window.onload = () => {
    GAME_ICON.classList.remove("game-icon-loading");
    PLAY_BUTTON.style.display = "block";
    PLAY_BUTTON.addEventListener("click", () => {
        LOADING_SCREEN.style.display = "none";
        GAME_CONTAINER.style.display = "block";

        MUSIC.play();

        let game = new Game();
        game.start();
        window.onbeforeunload = game.stop.bind(game);

        LAND_BUTTON.addEventListener("click", game.land.bind(game));
        CANVAS.addEventListener("click", game.launchCat.bind(game));
    });
};
