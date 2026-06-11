const monthInput = document.getElementById("monthInput");
const kwhInput = document.getElementById("kwhInput");
const costInput = document.getElementById("costInput");
const interpXInput = document.getElementById("interpX");
const dataForm = document.getElementById("dataForm");
const dataTable = document.getElementById("dataTable");
const resultOutput = document.getElementById("resultOutput");
const toast = document.getElementById("toast");

let energyChart;
let data = [];

let currentLanguage =localStorage.getItem("language") || "id";

const months = {
    id: [
        "Januari","Februari","Maret","April",
        "Mei","Juni","Juli","Agustus",
        "September","Oktober","November","Desember"
    ],

    en: [
        "January","February","March","April",
        "May","June","July","August",
        "September","October","November","December"
    ]
};

function updateMonthOptions(lang) {

    const monthInput = document.getElementById("monthInput");

    monthInput.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.disabled = true;
    defaultOption.selected = true;

    defaultOption.textContent =
        lang === "id"
            ? "Pilih Bulan"
            : "Select Month";

    monthInput.appendChild(defaultOption);

    months[lang].forEach(month => {

        const option = document.createElement("option");

        option.value = month;
        option.textContent = month;

        monthInput.appendChild(option);

    });
}


const currency = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
});

window.addEventListener("load", () => {

    const savedLanguage =
        localStorage.getItem("language") || "id";

    currentLanguage = savedLanguage;

    setLanguage(savedLanguage);

    setTimeout(() =>
        document.getElementById("loader")
            .classList.add("hidden"),
        450
    );

    render();

});

$(document).ready(function () {

    $('#monthInput').datepicker({
        format: "MM yyyy",
        minViewMode: 1,
        autoclose: true,
        language: "id"
    });

});

dataForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addData();
});

document.querySelector(".primary-btn.full").addEventListener("click", render);
document.getElementById("resetBtn").addEventListener("click", resetData);
document.getElementById("sampleBtn").addEventListener("click", loadSampleData);
document.getElementById("themeBtn").addEventListener("click", () => {
    document.body.classList.toggle("light");
    renderChart(calculateAll());
});
document.getElementById("excelBtn").addEventListener("click", exportExcel);
document.getElementById("pdfBtn").addEventListener("click", downloadPdf);

function addData() {
    const month = monthInput.value.trim();
    const kwh = Number(kwhInput.value);
    const cost = Number(costInput.value);

    if (!month || !Number.isFinite(kwh) || !Number.isFinite(cost) || kwh <= 0 || cost < 0) {
        showToast(translations[currentLanguage].invalidInput);
        return;
    }

    data.push({ month, kwh, cost });
    dataForm.reset();
    render();
    showToast(translations[currentLanguage].dataAdded);
}

function resetData() {
    data = [];
    render();
    showToast(translations[currentLanguage].dataReset);
}

function loadSampleData() {
    data = [
        { month: "Januari", kwh: 210, cost: 315000 },
        { month: "Februari", kwh: 230, cost: 345000 },
        { month: "Maret", kwh: 250, cost: 375000 },
        { month: "April", kwh: 270, cost: 405000 },
        { month: "Mei", kwh: 300, cost: 450000 }
    ];
    interpXInput.value = "2.5";
    render();
    showToast(translations[currentLanguage].namaKey);
}

function deleteRow(index) {
    data.splice(index, 1);
    render();
    showToast(translations[currentLanguage].dataDeleted);
}

function render() {
    const calculations = calculateAll();
    renderStats(calculations);
    renderTable();
    renderResult(calculations);
    renderChart(calculations);
}

function calculateAll() {
    const xValues = data.map((_, index) => index + 1);
    const yValues = data.map((item) => item.kwh);
    const interpolationX = Number(interpXInput.value);
    const interpolation = calculateInterpolation(xValues, yValues, interpolationX);
    const regression = calculateRegression(xValues, yValues);
    const nextX = data.length + 1;
    const prediction = regression ? regression.a + regression.b * nextX : 0;

    return { xValues, yValues, interpolationX, interpolation, regression, nextX, prediction };
}

function calculateInterpolation(xValues, yValues, targetX) {
    if (data.length < 2 || !Number.isFinite(targetX)) {
        return null;
    }

    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    if (targetX < minX || targetX > maxX) {
        return {error: translations[currentLanguage].interpolationError};
    }

    let rightIndex = xValues.findIndex((x) => x >= targetX);
    if (rightIndex === 0) {
        rightIndex = 1;
    }

    const leftIndex = rightIndex - 1;
    const x1 = xValues[leftIndex];
    const y1 = yValues[leftIndex];
    const x2 = xValues[rightIndex];
    const y2 = yValues[rightIndex];
    const y = y1 + ((targetX - x1) / (x2 - x1)) * (y2 - y1);

    return { x1, y1, x2, y2, y };
}

function calculateRegression(xValues, yValues) {
    const n = data.length;
    if (n < 2) {
        return null;
    }

    const sumX = xValues.reduce((sum, value) => sum + value, 0);
    const sumY = yValues.reduce((sum, value) => sum + value, 0);
    const sumXY = xValues.reduce((sum, x, index) => sum + x * yValues[index], 0);
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
    const denominator = n * sumX2 - sumX * sumX;

    if (denominator === 0) {
        return null;
    }

    const b = (n * sumXY - sumX * sumY) / denominator;
    const a = (sumY - b * sumX) / n;
    return { n, sumX, sumY, sumXY, sumX2, a, b };
}

function renderStats({ regression, prediction }) {
    const totalKwh = data.reduce((sum, item) => sum + item.kwh, 0);
    const totalCost = data.reduce((sum, item) => sum + item.cost, 0);
    const avg = data.length ? totalKwh / data.length : 0;

    document.getElementById("totalData").textContent = data.length;
    document.getElementById("avgKwh").textContent = `${avg.toFixed(1)} kWh`;
    document.getElementById("totalCost").textContent = currency.format(totalCost);
    document.getElementById("trendValue").textContent = regression ? `${regression.b.toFixed(2)} kWh/bln` : "0";
    document.getElementById("heroPrediction").textContent = `${prediction.toFixed(1)} kWh`;
}

function renderTable() {
    if (!data.length) {
        dataTable.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    ${translations[currentLanguage].noDataTable}
                </td>
            </tr>`;
        return;
    }

    dataTable.innerHTML = data.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(item.month)}</td>
            <td>${item.kwh.toFixed(2)}</td>
            <td>${currency.format(item.cost)}</td>
            <td><button class="delete-btn" onclick="deleteRow(${index})" title="Hapus"><i class="fa-solid fa-trash"></i></button></td>
        </tr>
    `).join("");
}

function renderResult({ interpolation, interpolationX, regression, nextX, prediction }) {
    if (data.length < 2) {
        resultOutput.innerHTML =`<div class="step">${translations[currentLanguage].noDataMsg}</div>`;
        return;
    }

    const interpolationHtml = interpolation?.error
        ? `<div class="step">${interpolation.error}</div>`
        : `
            <div class="step">
                <strong>${translations[currentLanguage].interpolationTitle}</strong>
                Diketahui x = ${interpolationX}, titik terdekat adalah
                (${interpolation.x1}, ${interpolation.y1}) dan (${interpolation.x2}, ${interpolation.y2}).<br>
                y = ${interpolation.y1} + ((${interpolationX} - ${interpolation.x1}) / (${interpolation.x2} - ${interpolation.x1})) * (${interpolation.y2} - ${interpolation.y1})<br>
                <strong>${translations[currentLanguage].interpolationResult} = ${interpolation.y.toFixed(2)} kWh</strong>
            </div>
        `;

    const regressionHtml = regression
        ? `
            <div class="step">
                <strong>${translations[currentLanguage].regressionTitle}</strong>
                n = ${regression.n}, Σx = ${regression.sumX.toFixed(2)}, Σy = ${regression.sumY.toFixed(2)},
                Σxy = ${regression.sumXY.toFixed(2)}, Σx² = ${regression.sumX2.toFixed(2)}<br>
                b = (${regression.n}(${regression.sumXY.toFixed(2)}) - (${regression.sumX.toFixed(2)})(${regression.sumY.toFixed(2)})) /
                (${regression.n}(${regression.sumX2.toFixed(2)}) - (${regression.sumX.toFixed(2)})²)<br>
                a = (Σy - bΣx) / n<br>
                <strong>a = ${regression.a.toFixed(4)}, b = ${regression.b.toFixed(4)}</strong><br>
                ${translations[currentLanguage].equation}: <strong>y = ${regression.a.toFixed(4)} + ${regression.b.toFixed(4)}x</strong><br>
                ${translations[currentLanguage].prediction}${nextX}: <strong>${prediction.toFixed(2)} kWh</strong>
            </div>
            <div class="step">
                <strong>${translations[currentLanguage].conclusionTitle}</strong>
                ${translations[currentLanguage].conclusionText} ${regression.b >= 0
                                                                  ? translations[currentLanguage].increase
                                                                  : translations[currentLanguage].decrease}
                ${Math.abs(regression.b).toFixed(2)} ${translations[currentLanguage].everyMonth}${translations[currentLanguage].estimateText} ${prediction.toFixed(2)} kWh.
            </div>
        `
        : "";

    resultOutput.innerHTML = interpolationHtml + regressionHtml;
}

function renderChart({ interpolation, interpolationX, regression, nextX, prediction }) {
    const labels = data.map((item) => item.month);
    const actualValues = data.map((item) => item.kwh);
    const regressionValues = data.map((_, index) => regression ? regression.a + regression.b * (index + 1) : null);

    const extendedLabels = [...labels,`${translations[currentLanguage].predictionMonth} ${nextX}`];
    const actualSeries = [...actualValues, null];
    const regressionSeries = [...regressionValues, prediction || null];
    const interpolationSeries = new Array(extendedLabels.length).fill(null);

    if (interpolation && !interpolation.error) {
        interpolationSeries[Math.max(0, Math.round(interpolationX) - 1)] = interpolation.y;
    }

    const textColor = getComputedStyle(document.body).getPropertyValue("--text").trim();
    const mutedColor = getComputedStyle(document.body).getPropertyValue("--muted").trim();

    if (!energyChart) {
        const context = document.getElementById("energyChart");
        energyChart = new Chart(context, {
            type: "line",
            data: {
                labels: extendedLabels,
                datasets: [
                    {
                        label: translations[currentLanguage].chartActual,
                        data: actualSeries,
                        borderColor: "#19d7ff",
                        backgroundColor: "rgba(25, 215, 255, 0.16)",
                        tension: 0.35,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 5
                    },
                    {
                        label: translations[currentLanguage].chartRegression,
                        data: regressionSeries,
                        borderColor: "#32e6a7",
                        borderDash: [8, 6],
                        tension: 0.35,
                        pointRadius: 4,
                        pointHoverRadius: 5
                    },
                    {
                        label: translations[currentLanguage].chartInterpolation,
                        data: interpolationSeries,
                        borderColor: "#ffcf5a",
                        pointBackgroundColor: "#ffcf5a",
                        pointRadius: 5,
                        pointHoverRadius: 6,
                        showLine: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 250
                },
                plugins: {
                    legend: {
                        labels: { color: textColor }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: mutedColor },
                        grid: { color: "rgba(145, 168, 186, 0.12)" }
                    },
                    y: {
                        ticks: { color: mutedColor },
                        grid: { color: "rgba(145, 168, 186, 0.12)" }
                    }
                }
            }
        });
        return;
    }

    energyChart.data.labels = extendedLabels;
    energyChart.data.datasets[0].data = actualSeries;
    energyChart.data.datasets[1].data = regressionSeries;
    energyChart.data.datasets[2].data = interpolationSeries;
    energyChart.options.plugins.legend.labels.color = textColor;
    energyChart.options.scales.x.ticks.color = mutedColor;
    energyChart.options.scales.y.ticks.color = mutedColor;
    energyChart.update("none");
}

function exportExcel() {
    if (!data.length) {
        showToast(translations[currentLanguage].namaKey);
        return;
    }

    const calculations = calculateAll();

    const rows = data.map((item, index) => ({
    x: index + 1,
    [currentLanguage === "id" ? "Bulan" : "Month"]: item.month,
    kWh: item.kwh,
    [currentLanguage === "id" ? "Biaya" : "Cost"]: item.cost
    }));

    // Baris kosong
    rows.push({});

    // Hasil Interpolasi
    if (calculations.interpolation && !calculations.interpolation.error) {
        rows.push({
            x: "",
            [currentLanguage === "id" ? "Bulan" : "Month"]:currentLanguage === "id"? "Hasil Interpolasi": "Interpolation Result",
            kWh: calculations.interpolation.y.toFixed(2),
            Biaya: ""
        });
    }

    // Persamaan Regresi
    if (calculations.regression) {
        rows.push({
            x: "",
            [currentLanguage === "id" ? "Bulan" : "Month"]:currentLanguage === "id"? "Persamaan Regresi": "Regression Equation",
            kWh: `y = ${calculations.regression.a.toFixed(4)} + ${calculations.regression.b.toFixed(4)}x`,
            Biaya: ""
        });

        // Prediksi
        rows.push({
            x: calculations.nextX,
            [currentLanguage === "id" ? "Bulan" : "Month"]:currentLanguage === "id"? "Prediksi Bulan Berikutnya": "Next Month Prediction",
            kWh: calculations.prediction.toFixed(2),
            Biaya: ""
        });
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Lebar kolom otomatis
    worksheet["!cols"] = [
        { wch: 8 },
        { wch: 30 },
        { wch: 30 },
        { wch: 20 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook,worksheet,currentLanguage === "id"? "Konsumsi Listrik": "Electricity Consumption"
    );

    XLSX.writeFile(workbook,currentLanguage === "id"? "laporan-konsumsi-listrik.xlsx": "electricity-consumption-report.xlsx"
    );

    showToast(currentLanguage === "id"? "File Excel berhasil dibuat.": "Excel file created successfully."
    );
}
function downloadPdf() {
    if (!data.length) {
        showToast(
    currentLanguage === "id"
        ? "Tidak ada data untuk diekspor."
        : "No data available for export."
    );
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const calculations = calculateAll();
    const regression = calculations.regression;

    doc.setFontSize(15);
    doc.text("Laporan Konsumsi Listrik", 14, 18);
    doc.setFontSize(10);
    doc.text(currentLanguage === "id"? "Laporan Konsumsi Listrik": "Electricity Consumption Report",14,18);
    doc.setFontSize(10);
    doc.text(currentLanguage === "id"? "Metode Interpolasi Linear dan Regresi Linear": "Linear Interpolation and Regression Method",14,26);
    let y = 38;
    data.forEach((item, index) => {
        doc.text(`${index + 1}. ${item.month} - ${item.kwh} kWh - ${currency.format(item.cost)}`, 14, y);
        y += 7;
    });

    y += 6;
    if (regression) {
        doc.text(`Persamaan regresi: y = ${regression.a.toFixed(4)} + ${regression.b.toFixed(4)}x`, 14, y);
        y += 7;
        doc.text(`Prediksi bulan ke-${calculations.nextX}: ${calculations.prediction.toFixed(2)} kWh`, 14, y);
    }

    doc.save("laporan-konsumsi-listrik.pdf");
    showToast(translations[currentLanguage].namaKey);
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2400);
}

function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


const translations = {
    id: {
        heroTitle: "Menghitung Konsumsi Listrik Menggunakan Metode Interpolasi dan Regresi",
        heroLead: "Dashboard edukasi untuk memasukkan data bulanan, melihat proses perhitungan, memprediksi konsumsi, dan mengekspor hasil.",

        sidebarDashboard: "Dashboard",
        sidebarInput: "Input",
        sidebarData: "Data",
        sidebarResult: "Hasil",

        predictLabel: "Prediksi bulan berikutnya",

        inputTitle: "Input Data",
        tableTitle: "Tabel Data",
        resultTitle: "Hasil Perhitungan",

        totalDataLabel: "Total Data",
        avgKwhLabel: "Rata-rata kWh",
        totalCostLabel: "Total Biaya",
        trendLabel: "Tren Regresi",

        chartDesc: "Aktual, interpolasi, dan prediksi regresi",

        inputDesc: "Masukkan bulan, kWh, dan biaya listrik",
        
        monthLabel: "Bulan",
        monthPlaceholder: "Pilih Bulan",
        
        kwhLabel: "Pemakaian listrik (kWh)",
        costLabel: "Biaya listrik (Rp)",
        
        addBtn: "Tambah",
        
        interpLabel: "Nilai x Interpolasi",
        calculateBtn: "Hitung",
        
        tableDesc: "Data aktual penggunaan listrik",
        
        resultDesc: "Rumus, langkah, dan kesimpulan otomatis",
        
        noDataMsg: "Masukkan minimal dua data agar interpolasi dan regresi dapat dihitung.",

        interpolationTitle: "Interpolasi Linear",
        regressionTitle: "Regresi Linear",
        conclusionTitle: "Kesimpulan",
        
        nearestPoint: "Diketahui x",
        interpolationResult: "Hasil interpolasi",
        
        equation: "Persamaan",
        prediction: "Prediksi bulan ke",
        
        increase: "meningkat",
        decrease: "menurun",
        
        conclusionText:
        "Berdasarkan data yang dimasukkan, konsumsi listrik cenderung",
        
        estimateText:
        "Estimasi konsumsi bulan berikutnya adalah",

        invalidInput:
        "Input belum valid. Periksa bulan, kWh, dan biaya.",
        
        dataAdded:
        "Data berhasil ditambahkan.",
        
        dataDeleted:
        "Data dihapus.",
        
        dataReset:
        "Data berhasil direset.",
        
        sampleLoaded:
        "Contoh data dimuat.",
        
        excelCreated:
        "File Excel berhasil dibuat.",
        
        pdfCreated:
        "File PDF dibuat.",
        
        noExportData:
        "Tidak ada data untuk diekspor.",
        
        noPdfData:"Tidak ada data untuk PDF.",

        chartTitle: "Grafik Konsumsi",
        chartDesc: "Aktual, interpolasi, dan prediksi regresi",

        interpolationError:"Nilai x interpolasi harus berada di antara data aktual.",

        knownX: "Diketahui x",
        nearestPoint: "titik terdekat adalah",
        everyMonth: "kWh setiap bulan.",
        estimateText: "Estimasi konsumsi bulan berikutnya adalah",

        noPdfData:"Tidak ada data untuk PDF.",

        noDataTable:"Belum ada data.",
    
        chartTitle:"Grafik Konsumsi",

        chartActual: "Aktual kWh",
        chartRegression: "Regresi & Prediksi",
        chartInterpolation: "Interpolasi",

        predictionMonth: "Prediksi"

    },

    en: {
        heroTitle: "Electricity Consumption Using Interpolation and Linear Regression",
        heroLead: "Educational dashboard for entering monthly data, viewing calculations, predicting consumption, and exporting results.",

        sidebarDashboard: "Dashboard",
        sidebarInput: "Input",
        sidebarData: "Data",
        sidebarResult: "Results",

        predictLabel: "Next Month Prediction",

        inputTitle: "Input Data",
        tableTitle: "Data Table",
        resultTitle: "Calculation Results",

        totalDataLabel: "Total Data",
        avgKwhLabel: "Average kWh",
        totalCostLabel: "Total Cost",
        trendLabel: "Regression Trend",

        chartDesc: "Actual, interpolation, and regression prediction",

        inputDesc: "Enter month, kWh, and electricity cost",
        
        monthLabel: "Month",
        monthPlaceholder: "Select Month",
        
        kwhLabel: "Electricity Usage (kWh)",
        costLabel: "Electricity Cost (Rp)",
        
        addBtn: "Add",
        
        interpLabel: "Interpolation x Value",
        calculateBtn: "Calculate",
        
        tableDesc: "Actual electricity consumption data",
        
        resultDesc: "Formulas, steps, and automatic conclusions",
        
        noDataMsg: "Enter at least two data points before interpolation and regression can be calculated.",

        interpolationTitle: "Linear Interpolation",
        regressionTitle: "Linear Regression",
        conclusionTitle: "Conclusion",
        
        nearestPoint: "Given x",
        interpolationResult: "Interpolation result",
        
        equation: "Equation",
        prediction: "Prediction for month",
        
        increase: "increasing",
        decrease: "decreasing",
        
        conclusionText:
        "Based on the entered data, electricity consumption tends to be",
        
        estimateText:
        "The estimated electricity consumption for the next month is",

        invalidInput:
        "Invalid input. Please check month, kWh, and cost.",
        
        dataAdded:
        "Data added successfully.",
        
        dataDeleted:
        "Data deleted.",
        
        dataReset:
        "Data reset successfully.",
        
        sampleLoaded:
        "Sample data loaded.",
        
        excelCreated:
        "Excel file created successfully.",
        
        pdfCreated:
        "PDF file created.",
        
        noExportData:
        "No data available for export.",
        
        noPdfData:
        "No data available for PDF.",
        chartTitle: "Consumption Chart",
        chartDesc: "Actual, interpolation, and regression prediction",

        interpolationError:"Interpolation x value must be between actual data points.",

        knownX: "Given x",
        nearestPoint: "nearest points are",
        everyMonth: "kWh per month.",
        estimateText: "The estimated electricity consumption for next month is",

        noPdfData:"No data available for PDF.",

        noDataTable:"No data available.",
    
        chartTitle:"Consumption Chart",

        chartActual: "Actual kWh",
        chartRegression: "Regression & Prediction",
        chartInterpolation: "Interpolation",

        predictionMonth: "Prediction"
        }
    };

function setLanguage(lang) {

    console.log("SET LANGUAGE =", lang);

    currentLanguage = lang;

    localStorage.setItem("language", lang);

    Object.keys(translations[lang]).forEach(key => {

        const element = document.getElementById(key);

        if (element) {
            element.textContent = translations[lang][key];
        }

    });

    updateMonthOptions(lang);

    render(); // tambahkan ini

}

const idBtn = document.getElementById("idBtn");
const enBtn = document.getElementById("enBtn");

idBtn.addEventListener("click", () => {

    setLanguage("id");

    idBtn.classList.add("active");
    enBtn.classList.remove("active");

});

enBtn.addEventListener("click", () => {

    setLanguage("en");

    enBtn.classList.add("active");
    idBtn.classList.remove("active");

});
