const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const statusEl = document.getElementById('status-message');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const finalStrikeBtn = document.getElementById('final-strike-btn');
const restartBtn = document.getElementById('restart-btn');

// Replace this with the actual site key if you test locally
const RECAPTCHA_SITE_KEY = 'your_site_key_here';

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

let score = 0;
const targetScore = 100;
let gameActive = true;
let orbs = [];
let particles = [];

class Orb {
    constructor() {
        this.radius = 30 + Math.random() * 20;
        this.x = this.radius + Math.random() * (canvas.width - this.radius * 2);
        this.y = this.radius + Math.random() * (canvas.height - this.radius * 2);
        this.color = `hsl(${180 + Math.random() * 60}, 100%, 50%)`;
        this.life = 1.0;
        this.decay = 0.005 + Math.random() * 0.01;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life;
        ctx.fill();

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fff';
        ctx.stroke();

        ctx.globalAlpha = 1.0; // Reset
    }

    update() {
        this.life -= this.decay;
        this.radius -= this.decay * 30; // shrink over time
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.life = 1.0;
        this.color = color;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.05;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life;
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

function spawnOrb() {
    if (gameActive && orbs.length < 5) {
        orbs.push(new Orb());
    }
    setTimeout(spawnOrb, 500 + Math.random() * 1000);
}

function explode(x, y, color) {
    for (let i = 0; i < 20; i++) {
        particles.push(new Particle(x, y, color));
    }
}

canvas.addEventListener('mousedown', (e) => {
    if (!gameActive) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    for (let i = orbs.length - 1; i >= 0; i--) {
        const orb = orbs[i];
        const dist = Math.hypot(mouseX - orb.x, mouseY - orb.y);

        if (dist < orb.radius) {
            // Hit!
            explode(orb.x, orb.y, orb.color);
            orbs.splice(i, 1);
            score += 10;
            scoreEl.textContent = score;

            if (score >= targetScore) {
                triggerBossFight();
            }
            break;
        }
    }
});

function draw() {
    ctx.fillStyle = 'rgba(5, 5, 16, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = orbs.length - 1; i >= 0; i--) {
        orbs[i].update();
        if (orbs[i].life <= 0 || orbs[i].radius <= 0) {
            orbs.splice(i, 1);
        } else {
            orbs[i].draw();
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        } else {
            particles[i].draw();
        }
    }

    requestAnimationFrame(draw);
}

function triggerBossFight() {
    gameActive = false;
    orbs = [];
    particles = [];
    statusEl.textContent = "Energy fully charged. Boss incoming...";

    setTimeout(() => {
        overlay.classList.remove('hidden');
        finalStrikeBtn.classList.remove('hidden');
    }, 1000);
}

// ---------------------------------------------------------
// reCAPTCHA and Backend Integration
// ---------------------------------------------------------

finalStrikeBtn.addEventListener('click', async () => {
    finalStrikeBtn.textContent = 'EXECUTING...';
    finalStrikeBtn.disabled = true;

    try {
        if (typeof grecaptcha !== 'undefined' && grecaptcha.ready) {
            grecaptcha.ready(function () {
                grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'boss_fight' }).then(async function (token) {
                    await verifyWithBackend(token);
                }).catch(async (err) => {
                    console.warn("reCAPTCHA execute failed. Likely mock environment without API key.");
                    await verifyWithBackend("mock_token");
                });
            });
        } else {
            console.warn("grecaptcha not found. Mock local testing mode.");
            await verifyWithBackend("mock_token");
        }
    } catch (e) {
        console.error("reCAPTCHA error:", e);
        await verifyWithBackend("mock_token");
    }
});

async function verifyWithBackend(token) {
    overlayText.textContent = "Verifying neural patterns with central server...";

    try {
        const fingerprint = await Utils.getFingerprint();

        const response = await fetch('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, fingerprint })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Victory
            overlayTitle.textContent = "BOSS DEFEATED";
            overlayTitle.className = "success-theme";
            overlayText.textContent = `Humanity confirmed. (Score: ${data.score || 'Mock'}) - Plays today: ${data.attempts}`;
            finalStrikeBtn.classList.add('hidden');

            restartBtn.classList.remove('hidden');
            restartBtn.className = "success-border";
        } else {
            // Defeat / Rate Limit / Bot Detected
            overlayTitle.textContent = "SYSTEM LOCKDOWN";
            overlayText.textContent = data.message || "You failed the verification.";
            finalStrikeBtn.classList.add('hidden');

            if (response.status !== 429) {
                restartBtn.classList.remove('hidden');
            }
        }
    } catch (error) {
        overlayTitle.textContent = "COMMUNICATION ERROR";
        overlayText.textContent = "Could not reach the central server. The backend might not be configured correctly.";
        finalStrikeBtn.classList.add('hidden');
        restartBtn.classList.remove('hidden');
    }
}

restartBtn.addEventListener('click', () => {
    // Reset Game
    score = 0;
    scoreEl.textContent = score;
    gameActive = true;
    overlay.classList.add('hidden');
    restartBtn.classList.add('hidden');
    overlayTitle.textContent = "BOSS APPROACHING";
    overlayTitle.className = "";
    overlayText.textContent = "Prepare your final strike.";
    finalStrikeBtn.textContent = "EXECUTE FINAL STRIKE";
    finalStrikeBtn.disabled = false;
    statusEl.textContent = "Click the energy orbs to charge your weapon.";
});

// Start game
spawnOrb();
draw();
