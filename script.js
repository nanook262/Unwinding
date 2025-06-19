// --- Configuration ---
// IMPORTANT: Paste the Web App URL you copied when you deployed your Google Apps Script.
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwWE91XWqzFK_0Ug-aN0BEHsp7W-7A0r_OOKrNQjjhGsJTJkW1riWlknSQ5SYMgc_Dsgw/exec"; 

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

// --- State Management ---
let appState = {
    isScanning: true,
    scannedData: null,
    isSubmitting: false
};

// --- Main App Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const html5QrCode = new Html5Qrcode("qr-reader");

    const startScanner = () => {
        appState.isScanning = true;
        appState.isSubmitting = false;
        appState.scannedData = null;
        updateUI();

        const qrCodeSuccessCallback = (decodedText, decodedResult) => {
            if (appState.isScanning) {
                html5QrCode.stop().then(() => {
                    handleScanSuccess(decodedText);
                }).catch(err => console.error("Failed to stop scanner.", err));
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

    // --- Event Listeners for Buttons ---
    stockButton.addEventListener('click', () => {
        if (appState.isSubmitting) return;
        sendDataToAction({ action: 'stock' });
    });

    useButton.addEventListener('click', () => {
        if (appState.isSubmitting) return;
        machineSelection.classList.remove('hidden');
        useButton.style.display = 'none';
        stockButton.style.display = 'none';
        statusMessage.querySelector('p').textContent = 'Please select a machine to confirm.';
    });

    machineIdDropdown.addEventListener('change', () => {
        const selectedMachine = machineIdDropdown.value;
        if (selectedMachine) {
             if (appState.isSubmitting) return;
             sendDataToAction({ action: 'use', machineId: selectedMachine });
        }
    });

    rescanButton.addEventListener('click', () => {
        startScanner();
    });
});

/**
 * Handles logic after a QR code is scanned. It smartly handles old and new QR codes.
 */
function handleScanSuccess(decodedText) {
    let rollId = decodedText;
    if (decodedText.includes("docs.google.com/forms")) {
        try {
            const url = new URL(decodedText);
            const params = new URLSearchParams(url.search);
            rollId = Array.from(params.values())[0] || "Invalid URL"; // Assumes Roll ID is the first param
        } catch (e) {
            rollId = "Invalid URL Scanned";
        }
    }
    appState.isScanning = false;
    appState.scannedData = rollId;
    updateUI();
}

/**
 * Sends data to the backend Google Apps Script.
 */
function sendDataToAction(payload) {
    appState.isSubmitting = true;
    statusMessage.querySelector('p').textContent = 'Sending data to server...';
    
    payload.rollId = appState.scannedData;

    fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            statusMessage.querySelector('p').innerHTML = `✅ Success: ${data.message}`;
        } else {
            statusMessage.querySelector('p').innerHTML = `❌ Error: ${data.message}`;
        }
        stockButton.style.display = 'none';
        useButton.style.display = 'none';
        machineSelection.classList.add('hidden');
        appState.isSubmitting = false;
    })
    .catch(error => {
        console.error('Error:', error);
        statusMessage.querySelector('p').textContent = '❌ Error: Could not connect to the server.';
        appState.isSubmitting = false;
    });
}

/**
 * Updates the UI based on the current app state.
 */
function updateUI() {
    if (appState.isScanning) {
        qrReaderElement.style.display = 'block';
        actionPanel.classList.add('hidden');
        statusMessage.querySelector('p').textContent = 'Point camera at a QR code to begin.';
    } else {
        qrReaderElement.style.display = 'none';
        actionPanel.classList.remove('hidden');
        stockButton.style.display = 'inline-block';
        useButton.style.display = 'inline-block';
        machineSelection.classList.add('hidden');
        scannedRollIdElement.textContent = appState.scannedData;
        statusMessage.querySelector('p').textContent = 'Scan successful. Please choose an action.';
    }
}
