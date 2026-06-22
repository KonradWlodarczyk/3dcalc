// --- STAN APLIKACJI (Zapisywany w LocalStorage) ---
let spools = JSON.parse(localStorage.getItem('zenSpools')) || [
    { id: 1, name: "PLA Basic (Domyślny)", price: 90 }
];
let machines = JSON.parse(localStorage.getItem('zenMachines')) || [
    { id: 1, name: "Bambu Lab P2S (AMS)", power: 300 },
    { id: 2, name: "Standard i3 (Single color)", power: 150 }
];
let historyData = JSON.parse(localStorage.getItem('zenHistory')) || [];
let currentTotal = 0;

// --- SYSTEM JĘZYKOWY (i18n) ---
const i18n = {
    pl: {
        // Nawigacja
        tabCalc: "Kalkulator",
        tabRes: "Zasoby i Maszyny",
        tabHist: "Historia i Eksport",
        
        // Zakładka 1: Kalkulator
        dropZoneTitle: "<strong>Upuść plik .gcode tutaj</strong> lub kliknij, aby załadować",
        dropZoneHelp: "Automatycznie odczytamy czas i wagę ze slicera",
        projDetails: "Szczegóły Projektu",
        projNameLabel: "Nazwa projektu",
        projNamePlaceholder: "np. Obudowa elektroniki",
        machineProfile: "Profil drukarki",
        materialsTitle: "Zużycie Materiałów (Multi-color)",
        addSpoolBtn: "+ Dodaj kolejną szpulę do projektu",
        wasteLabel: "Odpady materiału / Zrzuty (g)",
        exploitTitle: "Eksploatacja i Czas",
        timeLabel: "Czas druku (godziny)",
        powerLabel: "Pobór mocy maszyny (W)",
        energyLabel: "Cena energii (waluta/kWh)",
        calcBtn: "Przelicz i wyceń",
        totalCostLabel: "Całkowity koszt projektu:",
        alertAnalyzed: "Plik przeanalizowany! Przenieśliśmy dane do formularza.",
        alertError: "Najpierw przelicz koszty!",

        // Zakładka 2: Zasoby i Maszyny
        spoolTitle: "Magazyn Szpul",
        spoolNameLabel: "Nazwa / Kolor filamentu",
        spoolNamePlaceholder: "np. Bambu PLA Matte Green",
        spoolPriceLabel: "Cena za 1 kg (waluta)",
        addSpoolToStorageBtn: "Dodaj do magazynu",
        fleetTitle: "Flota Maszyn",
        machineNameLabel: "Nazwa drukarki",
        machineNamePlaceholder: "np. Bambu Lab P2S (AMS)",
        machinePowerLabel: "Średni pobór mocy (W)",
        addMachineBtn: "Dodaj maszynę",

        // Zakładka 3: Historia
        historyTitle: "Zapisane projekty",
        exportBtn: "💾 Eksportuj do CSV",
        clearHistoryBtn: "Wyczyść historię"
    },
    en: {
        // Navigation
        tabCalc: "Calculator",
        tabRes: "Resources & Machines",
        tabHist: "History & Export",
        
        // Tab 1: Calculator
        dropZoneTitle: "<strong>Drop .gcode file here</strong> or click to load",
        dropZoneHelp: "We will automatically read time and weight from the slicer",
        projDetails: "Project Details",
        projNameLabel: "Project name",
        projNamePlaceholder: "e.g. Electronics Enclosure",
        machineProfile: "Printer profile",
        materialsTitle: "Material Usage (Multi-color)",
        addSpoolBtn: "+ Add another spool to project",
        wasteLabel: "Material waste / Poop (g)",
        exploitTitle: "Operation & Time",
        timeLabel: "Print time (hours)",
        powerLabel: "Machine power draw (W)",
        energyLabel: "Energy price (currency/kWh)",
        calcBtn: "Calculate Cost",
        totalCostLabel: "Total project cost:",
        alertAnalyzed: "File analyzed! Data transferred to the form.",
        alertError: "Calculate costs first!",

        // Tab 2: Resources & Machines
        spoolTitle: "Spool Storage",
        spoolNameLabel: "Filament Name / Color",
        spoolNamePlaceholder: "e.g. Bambu PLA Matte Green",
        spoolPriceLabel: "Price per 1 kg (currency)",
        addSpoolToStorageBtn: "Add to storage",
        fleetTitle: "Machine Fleet",
        machineNameLabel: "Printer name",
        machineNamePlaceholder: "e.g. Bambu Lab X1C",
        machinePowerLabel: "Average power draw (W)",
        addMachineBtn: "Add machine",

        // Tab 3: History
        historyTitle: "Saved Projects",
        exportBtn: "💾 Export to CSV",
        clearHistoryBtn: "Clear history"
    }
};

let currentLang = localStorage.getItem('zenLang') || 'pl';

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('zenLang', lang);

    // Przełączanie aktywnego przycisku
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('btn-' + lang).classList.add('active');

    // Tłumaczenie elementów w DOM
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18n[lang][key]) {
            if (el.tagName === 'INPUT' && el.type === 'text') {
                el.placeholder = i18n[lang][key];
            } else {
                el.innerHTML = i18n[lang][key];
            }
        }
    });

    // Zmiana symbolu waluty w kalkulatorze (opcjonalne, dla estetyki)
    const currency = document.getElementById('currencySymbol');
    if (currency) currency.innerText = lang === 'pl' ? 'zł' : '$';
}

// --- INICJALIZACJA INTERFEJSU ---
window.onload = function() {
    setLanguage(currentLang);
    initDragAndDrop();
    initDragAndDrop();
    renderSpools();
    renderMachines();
    updateMachineSelect();
    renderHistory();
    addFilamentRow(); // Pierwszy domyślny wiersz materiału
    
    document.getElementById('enableSales').addEventListener('change', function() {
        document.getElementById('sales-section').style.display = this.checked ? 'block' : 'none';
    });
};

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
    event.currentTarget.classList.add('active');
}

// --- GAME CHANGER 1: ANALIZATOR G-CODE ---
function initDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('gcodeFileInput');

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) processGCodeFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) processGCodeFile(e.target.files[0]);
    });
}

function processGCodeFile(file) {
    const reader = new FileReader();
    // Odczytujemy końcówkę pliku (większość slicerów zapisuje tam metadane)
    const sliceSize = 150000; // Ostatnie 150KB pliku
    const blob = file.slice(file.size - sliceSize, file.size);
    
    reader.onload = function(e) {
        const text = e.target.result;
        parseGCodeMetadata(text, file.name);
    };
    reader.readAsText(blob);
}

function parseGCodeMetadata(text, filename) {
    // Regexy dopasowane do Bambu Studio / OrcaSlicer / PrusaSlicer
    let weightMatch = text.match(/;\s*filament\s+used\s+\[g\]\s*=\s*([\d.]+)/i) || 
                      text.match(/;\s*total\s+filament\s+used\s+\[g\]\s*=\s*([\d.]+)/i) ||
                      text.match(/;\s*filament\s+used\s*=\s*.*?\(([\d.]+)g\)/i);
                      
    let timeMatch = text.match(/;\s*estimated\s+time\s*=\s*(.+)/i) ||
                    text.match(/;\s*total_estimated_time\s*=\s*([\d.]+)/i);

    document.getElementById('projectName').value = filename.replace('.gcode', '');

    if (weightMatch) {
        const parsedWeight = parseFloat(weightMatch[1]);
        // Wpisujemy wage w pierwszy wiersz filamentu
        const firstWeightInput = document.querySelector('.spool-weight');
        if (firstWeightInput) firstWeightInput.value = parsedWeight.toFixed(1);
    }

    if (timeMatch) {
        let timeStr = timeMatch[1].trim();
        let hours = 0;
        
        if (!isNaN(timeStr)) { // Czas w sekundach
            hours = parseFloat(timeStr) / 3600;
        } else { // Format tekstowy np: "1h 23m 45s" lub "45m 12s"
            let h = timeStr.match(/(\d+)\s*h/);
            let m = timeStr.match(/(\d+)\s*m/);
            let s = timeStr.match(/(\d+)\s*s/);
            if (h) hours += parseInt(h[1]);
            if (m) hours += parseInt(m[1]) / 60;
            if (s) hours += parseInt(s[1]) / 3600;
        }
        document.getElementById('printTime').value = hours > 0 ? hours.toFixed(2) : 0;
    }
    
    alert("Plik przeanalizowany! Przenieśliśmy dane do formularza.");
}

// --- GAME CHANGER 2: PROFILE MASZYN ---
function updateMachineSelect() {
    const select = document.getElementById('machineProfileSelect');
    select.innerHTML = machines.map(m => `<option value="${m.power}">${m.name} (${m.power}W)</option>`).join('');
    onMachineChange();
}

function onMachineChange() {
    const select = document.getElementById('machineProfileSelect');
    document.getElementById('printerPower').value = select.value;
}

function addMachine() {
    const name = document.getElementById('newMachineName').value.trim();
    const power = parseInt(document.getElementById('newMachinePower').value);
    if (!name || isNaN(power)) return alert("Wprowadź poprawne dane maszyny");

    machines.push({ id: Date.now(), name, power });
    localStorage.setItem('zenMachines', JSON.stringify(machines));
    document.getElementById('newMachineName').value = '';
    renderMachines();
    updateMachineSelect();
}

function deleteMachine(id) {
    machines = machines.filter(m => m.id !== id);
    localStorage.setItem('zenMachines', JSON.stringify(machines));
    renderMachines();
    updateMachineSelect();
}

function renderMachines() {
    const list = document.getElementById('machineList');
    list.innerHTML = machines.map(m => `
        <div class="list-item">
            <div><strong>${m.name}</strong> <span style="color:var(--zen-muted)">(${m.power} W)</span></div>
            <button class="danger-btn" style="padding:4px 8px;" onclick="deleteMachine(${m.id})">Usuń</button>
        </div>
    `).join('');
}

// --- OBSŁUGA SZPUL (MULTI-MATERIAL) ---
function addFilamentRow() {
    const container = document.getElementById('project-filaments');
    const rowId = 'row-' + Date.now();
    let options = spools.map(s => `<option value="${s.price}">${s.name} (${s.price} zł/kg)</option>`).join('');

    const div = document.createElement('div');
    div.className = 'filament-row';
    div.id = rowId;
    div.innerHTML = `
        <select class="spool-select">${options}</select>
        <input type="number" class="spool-weight" placeholder="Waga (g)" min="0" value="0">
        <button class="remove-row-btn" onclick="document.getElementById('${rowId}').remove()">✕</button>
    `;
    container.appendChild(div);
}

function addSpool() {
    const name = document.getElementById('newSpoolName').value.trim();
    const price = parseFloat(document.getElementById('newSpoolPrice').value);
    if (!name || isNaN(price)) return alert("Wprowadź poprawne dane szpuli");

    spools.push({ id: Date.now(), name, price });
    localStorage.setItem('zenSpools', JSON.stringify(spools));
    document.getElementById('newSpoolName').value = '';
    renderSpools();
    
    // Odśwież listy wyboru w kalkulatorze
    document.querySelectorAll('.spool-select').forEach(select => {
        const curr = select.value;
        select.innerHTML = spools.map(s => `<option value="${s.price}">${s.name} (${s.price} zł/kg)</option>`).join('');
        select.value = curr;
    });
}

function deleteSpool(id) {
    if(spools.length <= 1) return alert("Musisz mieć przynajmniej jedną szpulę w magazynie.");
    spools = spools.filter(s => s.id !== id);
    localStorage.setItem('zenSpools', JSON.stringify(spools));
    renderSpools();
}

function renderSpools() {
    document.getElementById('spoolList').innerHTML = spools.map(s => `
        <div class="list-item">
            <div><strong>${s.name}</strong> <span style="color:var(--zen-muted)">(${s.price.toFixed(2)} zł/kg)</span></div>
            <button class="danger-btn" style="padding:4px 8px;" onclick="deleteSpool(${s.id})">Usuń</button>
        </div>
    `).join('');
}

// --- OBLICZENIA FINANSOWE ---
function calculateCost() {
    let materialCost = 0;
    let totalWeight = 0;

    document.querySelectorAll('.filament-row').forEach(row => {
        const price = parseFloat(row.querySelector('.spool-select').value) || 0;
        const weight = parseFloat(row.querySelector('.spool-weight').value) || 0;
        materialCost += (weight / 1000) * price;
        totalWeight += weight;
    });

    // Automatyczne uśrednianie kosztów odpadów
    const waste = parseFloat(document.getElementById('wasteWeight').value) || 0;
    if (waste > 0 && totalWeight > 0) {
        const avgPricePerGram = materialCost / totalWeight;
        materialCost += (waste * avgPricePerGram);
    }

    const time = parseFloat(document.getElementById('printTime').value) || 0;
    const power = parseFloat(document.getElementById('printerPower').value) || 0;
    const electricityPrice = parseFloat(document.getElementById('electricityPrice').value) || 0;
    const powerCost = (power / 1000) * time * electricityPrice;

    let finalCost = materialCost + powerCost;

    if (document.getElementById('enableSales').checked) {
        const laborTime = parseFloat(document.getElementById('laborTime').value) || 0;
        const laborRate = parseFloat(document.getElementById('laborRate').value) || 0;
        const failure = parseFloat(document.getElementById('failureRate').value) || 0;
        const margin = parseFloat(document.getElementById('profitMargin').value) || 0;

        finalCost += (laborTime * laborRate);
        finalCost = finalCost * (1 + (failure / 100));
        finalCost = finalCost / (1 - (margin / 100));
    }

    currentTotal = finalCost.toFixed(2);
    document.getElementById('totalCost').innerText = currentTotal;
}

// --- HISTORIA I GAME CHANGER 3: EKSPORT CSV ---
function saveProject() {
    if (currentTotal == 0) return alert("Najpierw przelicz koszty!");
    const name = document.getElementById('projectName').value || "Projekt bez nazwy";
    const date = new Date().toLocaleDateString('pl-PL');

    historyData.unshift({ id: Date.now(), name, cost: currentTotal, date });
    localStorage.setItem('zenHistory', JSON.stringify(historyData));
    renderHistory();
    alert("Wycena dodana do historii.");
}

function renderHistory() {
    const container = document.getElementById('historyList');
    if (historyData.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding: 20px; color:var(--zen-muted);">Brak zapisanych wycen</div>';
        return;
    }
    container.innerHTML = historyData.map(h => `
        <div class="list-item">
            <div><strong>${h.name}</strong><br><span style="font-size:0.75rem; color:var(--zen-muted)">${h.date}</span></div>
            <div style="font-weight:600; color:var(--zen-accent); font-size:1.1rem;">${h.cost} zł</div>
        </div>
    `).join('');
}

function clearHistory() {
    if (confirm("Czy na pewno wyczyścić całą historię?")) {
        historyData = [];
        localStorage.removeItem('zenHistory');
        renderHistory();
    }
}

function exportToCSV() {
    if (historyData.length === 0) return alert("Brak danych do wyeksportowania.");
    
    // Dodanie bomu \uFEFF zapewnia poprawne czytanie polskich znaków w MS Excel
    let csvContent = "\uFEFFNazwa projektu;Data kalkulacji;Koszt całkowity (PLN)\n";
    
    historyData.forEach(item => {
        csvContent += `"${item.name}";"${item.date}";"${item.cost}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", `analiza_kosztow_3d_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
