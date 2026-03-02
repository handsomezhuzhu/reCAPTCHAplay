const scoreEl = document.getElementById('score');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const flashOverlay = document.getElementById('flash-overlay');
const flashText = document.getElementById('flash-text');
const restartBtn = document.getElementById('restart-btn');
const recaptchaWrapper = document.querySelector('.recaptcha-wrapper');

let score = 0;
let isVerifying = false;

// Google reCAPTCHA v2 callback attached via data-callback
window.onCaptchaSolved = async function (token) {
    if (isVerifying) return;
    isVerifying = true;

    overlayTitle.textContent = "DECRYPTING...";
    overlayTitle.className = "success-theme";
    overlayText.textContent = "Analyzing solution against central firewall...";
    recaptchaWrapper.style.opacity = "0.5";

    // Call our backend to verify the token
    await verifyWithBackend(token);
};

window.onCaptchaExpired = function () {
    overlayTitle.textContent = "SESSION EXPIRED";
    overlayTitle.className = "error-theme";
    overlayText.textContent = "Warning, cryptographic token timed out.";
    isVerifying = false;
};

window.onCaptchaError = function () {
    overlayTitle.textContent = "CRITICAL FAILURE";
    overlayTitle.className = "error-theme";
    overlayText.textContent = "Widget connection lost. Verify network access.";
    isVerifying = false;
};

async function verifyWithBackend(token) {
    try {
        const fingerprint = await Utils.getFingerprint();

        const response = await fetch('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, fingerprint }) // Keep the same API shape
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
    // Show flash
    flashOverlay.classList.remove('hidden');
    flashOverlay.classList.remove('error');
    flashText.textContent = "ACCESS GRANTED";

    score++;

    // Reset the widget for the next level
    setTimeout(() => {
        if (typeof grecaptcha !== 'undefined') {
            grecaptcha.reset();
        }

        scoreEl.textContent = score;

        flashOverlay.classList.add('hidden');
        overlayTitle.textContent = "SECURITY PROTOCOL TRIGGERED";
        overlayTitle.className = "error-theme"; // red
        overlayText.textContent = `Bypass Level ${score + 1} Firewall. Verify neural patterns.`;
        recaptchaWrapper.style.opacity = "1";
        isVerifying = false;
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

    recaptchaWrapper.classList.add('hidden'); // Hide the widget on fail
    restartBtn.classList.remove('hidden');

    setTimeout(() => {
        flashOverlay.classList.add('hidden');
    }, 2000);
}

restartBtn.addEventListener('click', () => {
    // Restart logic
    score = 0;
    scoreEl.textContent = score;
    overlayTitle.textContent = "SECURITY PROTOCOL TRIGGERED";
    overlayTitle.className = "error-theme";
    overlayText.textContent = "Verify neural patterns to bypass the firewall.";
    isVerifying = false;

    recaptchaWrapper.classList.remove('hidden');
    recaptchaWrapper.style.opacity = "1";
    restartBtn.classList.add('hidden');

    if (typeof grecaptcha !== 'undefined') {
        grecaptcha.reset();
    }
});
