// Load the saved language from localStorage, or default to Arabic
let currentLang = localStorage.getItem('preferredLang') || 'ar';
const langBtn = document.getElementById('lang-toggle-btn');
const subcontractorsBody = document.getElementById('subcontractors-body');

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('preferredLang', lang); // Save the chosen language
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    const pageTranslations = translations[lang].hse_report_page;

    document.querySelectorAll('[data-lang-key]').forEach(el => {
        const key = el.dataset.langKey;
        if (pageTranslations[key]) {
            el.textContent = pageTranslations[key];
        }
    });

    document.querySelectorAll('[data-lang-placeholder-key]').forEach(el => {
        const key = el.dataset.langPlaceholderKey;
        if (pageTranslations[key]) {
            el.placeholder = pageTranslations[key];
        }
    });

    // Update Entity column in tables
    const incidentsTable = document.getElementById('incidents-table');
    if (incidentsTable) {
        incidentsTable.querySelector('tbody tr:nth-child(1) td:first-child b').textContent = pageTranslations['company'];
        incidentsTable.querySelector('tbody tr:nth-child(2) td:first-child b').textContent = pageTranslations['subcontractor'];
    }

    const observationsTable = document.getElementById('observations-table');
    if (observationsTable) {
        observationsTable.querySelector('tbody tr:nth-child(1) td:first-child b').textContent = pageTranslations['company'];
        observationsTable.querySelector('tbody tr:nth-child(2) td:first-child b').textContent = pageTranslations['subcontractor'];
    }

    // Update data-labels for mobile view
    document.querySelectorAll('td[data-label-key]').forEach(td => {
        const key = td.dataset.labelKey;
        if (pageTranslations[key]) {
            td.dataset.label = pageTranslations[key];
        }
    });
    updateSubcontractorPlaceholders(lang);
}

function updateSubcontractorPlaceholders(lang) {
    const pageTranslations = translations[lang].hse_report_page;
    const subPlaceholders = subcontractorsBody.querySelectorAll('input[type="text"]');
    subPlaceholders.forEach((input) => {
        input.placeholder = `${pageTranslations.subcontractorNamePlaceholder}`;
    });
}

function addSubcontractorRow() {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" class="subcontractor-name"></td>
        <td><input type="number" class="subcontractor-count" placeholder="0"></td>
        <td style="border: none; background: transparent; text-align: center;"><button type="button" class="remove-btn">x</button></td>
    `;
    subcontractorsBody.appendChild(row);
    updateSubcontractorPlaceholders(currentLang);

    row.querySelector('.remove-btn').addEventListener('click', () => {
        row.remove();
    });
}

langBtn.addEventListener('click', () => {
    const newLang = currentLang === 'ar' ? 'en' : 'ar';
    setLanguage(newLang);
});

document.getElementById('add-subcontractor-btn').addEventListener('click', addSubcontractorRow);
document.getElementById('download-btn').addEventListener('click', () => generatePdf('content-to-print'));

// Initialize Page
addSubcontractorRow();
setLanguage(currentLang); // Set the language based on the saved preference