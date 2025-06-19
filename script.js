// --- Configuration ---
const SCRIPT_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"; 

// --- DOM Elements ---
const statusMessage = document.getElementById('status-message');
const qrReaderElement = document.getElementById('qr-reader');
const actionPanel = document.getElementById('action-panel');
const scannedRollIdElement = document.getElementById('scanned-roll-id');
const machineSelection = document.getElementById('machine-selection');
const machineIdDropdown = document.getElementById('machine-id');
const stockButton = document.getElementById('stock-button');
const useButton = document.getElementById('use-button');
const rescanButton = document.getElementById('rescan-button');
// --- NEW DEBUG ELEMENTS ---
const debugUrl = document.getElementById('debug-url');
const debugPayload = document.getElementById('debug-payload');
const debugError = document.getElementById('debug-error');

// --- State Management ---
let appState = { /* ... */ };

// --- Main App Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // --- NEW: Display the URL on screen immediately ---
    debugUrl.textContent = `Target URL: ${SCRIPT_URL}`;
    
    const html5QrCode = new Html5Qrcode("qr-reader");
    // ... (rest of the code in this section is the same)
});

// ... (handleScanSuccess function is the same) ...

/**
 * Sends data to the backend Google Apps Script.
 * UPDATED WITH MORE DEBUGGING.
 */
function sendDataToAction(payload) {
    appState.isSubmitting = true;
    statusMessage.querySelector('p').textContent = 'Sending data to server...';
    
    payload.rollId = appState.scannedData;

    // --- NEW: Display the data being sent ---
    debugPayload.textContent = `Sending Payload: ${JSON.stringify(payload, null, 2)}`;
    debugError.textContent = ""; // Clear previous errors

    fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(payload)
    })
    .then(response => {
        statusMessage.querySelector('p').innerHTML = `✅ Success! Data sent to server.`;
        debugPayload.textContent = ""; // Clear payload on success
    })
    .catch(error => {
        statusMessage.querySelector('p').textContent = '❌ Error: Could not connect to the server.';
        // --- NEW: Display the detailed error on screen ---
        debugError.textContent = `Fetch Error: ${error.toString()}`;
    });
}

// ... (updateUI function is the same) ...


// ===============================================================================
// Full code for functions that were unchanged is included below for completeness
// ===============================================================================
let appState = { isScanning: true, scannedData: null, isSubmitting: false };
document.addEventListener('DOMContentLoaded', () => {
    debugUrl.textContent = `Target URL: ${SCRIPT_URL}`;
    const html5QrCode = new Html5Qrcode("qr-reader");
    const startScanner = () => {
        appState.isScanning = true;
        appState.isSubmitting = false;
        appState.scannedData = null;
        updateUI();
        const qrCodeSuccessCallback = (decodedText, decodedResult) => {
            if (appState.isScanning) {
                html5QrCode.stop().then(() => { handleScanSuccess(decodedText); }).catch(err => console.error("Failed to stop scanner.", err));
            }
        };
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback)
            .catch(err => {
                console.log("Unable to start scanning.", err);
                statusMessage.querySelector('p').textContent = 'Error: Could not start camera. Please grant permission.';
            });
    };
    startScanner();
    stockButton.addEventListener('click', () => { if (appState.isSubmitting) return; sendDataToAction({ action: 'stock' }); });
    useButton.addEventListener('click', () => { if (appState.isSubmitting) return; machineSelection.classList.remove('hidden'); useButton.style.display = 'none'; stockButton.style.display = 'none'; statusMessage.querySelector('p').textContent = 'Please select a machine to confirm.'; });
    machineIdDropdown.addEventListener('change', () => { const selectedMachine = machineIdDropdown.value; if (selectedMachine) { if (appState.isSubmitting) return; sendDataToAction({ action: 'use', machineId: selectedMachine }); } });
    rescanButton.addEventListener('click', () => { startScanner(); });
});
function handleScanSuccess(decodedText) {
    let rollId = decodedText;
    if (decodedText.includes("docs.google.com/forms")) {
        try { const url = new URL(decodedText); const params = new URLSearchParams(url.search); rollId = Array.from(params.values())[0] || "Invalid URL"; } catch (e) { rollId = "Invalid URL Scanned"; }
    }
    appState.isScanning = false; appState.scannedData = rollId; updateUI();
}
function updateUI() {
    if (appState.isScanning) {
        qrReaderElement.style.display = 'block'; actionPanel.classList.add('hidden'); statusMessage.querySelector('p').textContent = 'Point camera at a QR code to begin.';
    } else {
        qrReaderElement.style.display = 'none'; actionPanel.classList.remove('hidden'); stockButton.style.display = 'inline-block'; useButton.style.display = 'inline-block'; machineSelection.classList.add('hidden'); scannedRollIdElement.textContent = appState.scannedData; statusMessage.querySelector('p').textContent = 'Scan successful. Please choose an action.';
    }
}
