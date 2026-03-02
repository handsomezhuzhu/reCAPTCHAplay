const scoreEl = document.getElementById('score');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const flashOverlay = document.getElementById('flash-overlay');
const flashText = document.getElementById('flash-text');
const restartBtn = document.getElementById('restart-btn');

const recaptchaWrapper = document.getElementById('recaptcha-wrapper');
const hcaptchaWrapper = document.getElementById('hcaptcha-wrapper');
const loadingIndicator = document.getElementById('loading-indicator');

let score = 0;
let isVerifying = false;

// The tokens we collect in sequence
let currentRecaptchaToken = null;
let currentHcaptchaToken = null;

let config = null;

// --- 1. Initialization ---
async function initializeGame() {
    try {
        const response = await fetch('/api/config');
        config = await response.json();

        // Dynamically inject Google script
        const gScript = document.createElement('script');
        gScript.src = "https://www.google.com/recaptcha/api.js";
        gScript.async = true;
        gScript.defer = true;
        document.head.appendChild(gScript);

        // Dynamically inject hCaptcha script
        const hScript = document.createElement('script');
        hScript.src = "https://js.hcaptcha.com/1/api.js";
        hScript.async = true;
        hScript.defer = true;
        document.head.appendChild(hScript);

        // Build containers
        recaptchaWrapper.innerHTML = `
            <div class="g-recaptcha" 
                data-sitekey="${config.recaptchaSiteKey}" 
                data-theme="dark"
                data-callback="onRecaptchaSolved">
            </div>
        `;

        hcaptchaWrapper.innerHTML = `
            <div class="h-captcha" 
                data-sitekey="${config.hcaptchaSiteKey}" 
                data-theme="dark"
                data-callback="onHcaptchaSolved">
            </div>
        `;

        // Wait a tiny bit for scripts to parse
        setTimeout(() => {
            loadingIndicator.classList.add('hidden');
            startLevelSequence();
        }, 1500);

    } catch (err) {
        console.error("Failed to load configuration", err);
        loadingIndicator.textContent = "CRITICAL ERROR: CONFIGURATION UNREACHABLE";
    }
}

// --- 2. Sequence Management ---
function startLevelSequence() {
    currentRecaptchaToken = null;
    currentHcaptchaToken = null;
    isVerifying = false;

    overlayTitle.textContent = "SECURITY PROTOCOL TRIGGERED";
    overlayTitle.className = "error-theme";
    overlayText.textContent = "PRIMARY FIREWALL: Verify neural patterns to proceed.";

    recaptchaWrapper.classList.remove('hidden');
    recaptchaWrapper.style.opacity = "1";
    hcaptchaWrapper.classList.add('hidden');
    hcaptchaWrapper.style.opacity = "1";

    // Reset widgets visually if APIs are loaded
    if (typeof grecaptcha !== 'undefined' && grecaptcha.reset) {
        grecaptcha.reset();
    }
    if (typeof hcaptcha !== 'undefined' && hcaptcha.reset) {
        hcaptcha.reset();
    }
}

// --- 3. Callbacks ---
window.onRecaptchaSolved = function (token) {
    currentRecaptchaToken = token;

    // Transition UI to the Secondary Firewall
    recaptchaWrapper.style.opacity = "0";
    setTimeout(() => {
        recaptchaWrapper.classList.add('hidden');

        overlayTitle.textContent = "PRIMARY WALL BREACHED";
        overlayTitle.className = "error-theme";
        overlayText.textContent = "SECONDARY FIREWALL (hCaptcha) ENGAGED. Awaiting pattern verification.";

        hcaptchaWrapper.classList.remove('hidden');
    }, 500);
};

window.onHcaptchaSolved = async function (token) {
    if (isVerifying) return;
    isVerifying = true;
    currentHcaptchaToken = token;

    overlayTitle.textContent = "DECRYPTING...";
    overlayTitle.className = "success-theme";
    overlayText.textContent = "Analyzing both solutions against central firewall...";
    hcaptchaWrapper.style.opacity = "0.5";

    await verifyWithBackend();
};

// --- 4. Backend Verification ---
async function verifyWithBackend() {
    try {
        const fingerprint = await Utils.getFingerprint();

        const response = await fetch('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recaptchaToken: currentRecaptchaToken,
                hcaptchaToken: currentHcaptchaToken,
                fingerprint
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            handleSuccess();
        } else {
            handleFailure(data.message || "Invalid authorization token.", response.status);
        }
    } catch (error) {
        handleFailure("Backend communication offline.", 500);
    }
}

function handleSuccess() {
    flashOverlay.classList.remove('hidden');
    flashOverlay.classList.remove('error');
    flashText.textContent = "DUAL ACCESS GRANTED";

    score++;

    setTimeout(() => {
        scoreEl.textContent = score;
        flashOverlay.classList.add('hidden');
        startLevelSequence();
    }, 2000);
}

function handleFailure(message, statusCode) {
    flashOverlay.classList.remove('hidden');
    flashOverlay.classList.add('error');

    if (statusCode === 429) {
        flashText.textContent = "LOCKDOWN";
    } else {
        flashText.textContent = "ACCESS DENIED";
    }

    overlayTitle.textContent = "SYSTEM LOCKDOWN";
    overlayTitle.className = "error-theme";
    overlayText.textContent = message;

    recaptchaWrapper.classList.add('hidden');
    hcaptchaWrapper.classList.add('hidden');
    restartBtn.classList.remove('hidden');

    setTimeout(() => {
        flashOverlay.classList.add('hidden');
    }, 2000);
}

restartBtn.addEventListener('click', () => {
    score = 0;
    scoreEl.textContent = score;
    restartBtn.classList.add('hidden');
    startLevelSequence();
});

// Boot UP
initializeGame();
