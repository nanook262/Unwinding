// --- Configuration ---
// This MUST be your correct, deployed Web App URL.
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxKE2ukx_7WLezPayj6wtQ-i5IIBy0jn0jynHaXHgOxv_5-xHpnfdIiYBm-qL67N1ZJLA/exec"; 

// --- DOM Elements ---
const statusMessageElement = document.getElementById('status-message').querySelector('p');
const qrReaderElement = document.getElementById('qr-reader');
const actionPanel = document.getElementById('action-panel');
const scannedRollIdElement = document.getElementById('scanned-roll-id');
const machineSelection = document.getElementById('machine-selection');
const machineIdDropdown = document.getElementById('machine-id');
const stockButton = document.getElementById('stock-button');
const useButton = document.getElementById('use-button');
const rescanButton = document.getElementById('rescan-button');
const debugUrl = document.getElementById('debug-url');
const debugPayload = document.getElementById('debug-payload');
const debugError = document.getElementById('debug-error');

// --- State Management ---
let appState = {
    isScanning: true,
    scannedData: null,
    isSubmitting: false
};

// --- Main App Logic ---
document.addEventListener('DOMContentLoaded', () => {
    debugUrl.textContent = `Target URL: ${SCRIPT_URL}`;
    const html5QrCode = new Html5Qrcode("qr-reader");

    const startScanner = () => {
        appState.isScanning = true;
        appState.scannedData = null;
        appState.isSubmitting = false;
        updateUI();

        const qrCodeSuccessCallback = (decodedText, decodedResult) => {
            if (appState.isScanning) {
                html5QrCode.stop().then(() => {
                    handleScanSuccess(decodedText);
                }).catch(err => console.error("Failed to stop scanner.", err));
            }
        };

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        statusMessageElement.textContent = 'Requesting camera access...';
        Html5Qrcode.getCameras().then(cameras => {
            if (cameras && cameras.length) {
                const cameraId = cameras.find(camera => camera.label.toLowerCase().includes('back'))?.id || cameras[0].id;
                statusMessageElement.textContent = 'Starting camera...';
                html5QrCode.start(cameraId, config, qrCodeSuccessCallback)
                    .catch(err => {
                        statusMessageElement.textContent = `❌ Error starting camera. Check permissions.`;
                        debugError.textContent = `Camera Error: ${err}`;
                    });
            } else {
                statusMessageElement.textContent = '❌ No cameras found on this device.';
            }
        }).catch(err => {
            statusMessageElement.textContent = '❌ Could not get camera list. Grant permission and refresh.';
            debugError.textContent = `Permission Error: ${err}`;
        });
    };
    
    startScanner();

    // --- Event Listeners ---
    stockButton.addEventListener('click', () => { if (appState.isSubmitting) return; sendDataToAction({ action: 'stock' }); });
    useButton.addEventListener('click', () => { if (appState.isSubmitting) return; machineSelection.classList.remove('hidden'); useButton.style.display = 'none'; stockButton.style.display = 'none'; statusMessageElement.textContent = 'Please select a machine to confirm.'; });
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

/**
 * Sends data to the backend Google Apps Script using 'cors' mode to get detailed errors.
 */
function sendDataToAction(payload) {
    appState.isSubmitting = true;
    statusMessageElement.textContent = 'Sending data to server...';
    payload.rollId = appState.scannedData;
    debugPayload.textContent = `Sending Payload: ${JSON.stringify(payload, null, 2)}`;
    debugError.textContent = "";

    // --- MODIFICATION HERE: Using 'cors' mode ---
    fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'cors', // Switched back to cors to see the real error
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/json',
        },
        redirect: 'follow',
        body: JSON.stringify(payload)
    })
    .then(response => {
        if (!response.ok) {
            // This will catch server-side errors that are not network errors
            throw new Error(`Server responded with status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            statusMessageElement.innerHTML = `✅ Success: ${data.message}`;
        } else {
            statusMessageElement.innerHTML = `❌ Error from Server: ${data.message}`;
        }
    })
    .catch(error => {
        // This is the most important part. It will display the browser's security error.
        console.error('Error:', error);
        statusMessageElement.textContent = '❌ A connection error occurred.';
        debugError.textContent = `Fetch Error: ${error.toString()}`;
    })
    .finally(() => {
        // Disable buttons after an attempt
        stockButton.style.display = 'none';
        useButton.style.display = 'none';
        machineSelection.classList.add('hidden');
        appState.isSubmitting = false;
    });
}

function updateUI() {
    if (appState.isScanning) {
        qrReaderElement.style.display = 'block'; actionPanel.classList.add('hidden'); statusMessageElement.textContent = 'Point camera at a QR code to begin.';
    } else {
        qrReaderElement.style.display = 'none'; actionPanel.classList.remove('hidden'); stockButton.style.display = 'inline-block'; useButton.style.display = 'inline-block'; machineSelection.classList.add('hidden'); scannedRollIdElement.textContent = appState.scannedData; statusMessageElement.textContent = 'Scan successful. Please choose an action.';
    }
}
