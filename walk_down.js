let currentLang = localStorage.getItem('preferredLang') || 'ar';
const langBtn = document.getElementById('lang-toggle-btn');

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('preferredLang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    const pageTranslations = translations[lang].weekly_walk_down_page;

    document.querySelectorAll('[data-lang-key]').forEach(el => {
        const key = el.dataset.langKey;
        if (pageTranslations && pageTranslations[key]) {
            el.textContent = pageTranslations[key];
        }
    });

    // Update table data-labels for mobile view
    document.querySelectorAll('td[data-label-key]').forEach(td => {
        const key = td.dataset.labelKey;
        if (pageTranslations[key]) {
            td.dataset.label = pageTranslations[key];
        }
    });

    document.querySelectorAll('#observation-template option').forEach(opt => {
         const key = opt.dataset.langKey;
         if(pageTranslations[key]) opt.textContent = pageTranslations[key];
    });
}

function addDynamicRow(tableBodyId, cellsHtml) {
    const tableBody = document.getElementById(tableBodyId);
    const row = document.createElement('tr');
    row.innerHTML = cellsHtml;
    tableBody.appendChild(row);

    // Re-apply translation to the new row's labels
    const pageTranslations = translations[currentLang].weekly_walk_down_page;
    row.querySelectorAll('td[data-label-key]').forEach(td => {
        const key = td.dataset.labelKey;
        if (pageTranslations[key]) {
            td.dataset.label = pageTranslations[key];
        }
    });

    row.querySelector('.remove-btn').addEventListener('click', () => row.remove());
}

document.getElementById('add-attendee-btn').addEventListener('click', () => {
    addDynamicRow('attendance-body', `
        <td data-label-key="name"><input type="text" class="attendee-name"></td>
        <td data-label-key="title"><input type="text" class="attendee-title"></td>
        <td data-label-key="company"><input type="text" class="attendee-company"></td>
        <td class="no-border"><button type="button" class="remove-btn">x</button></td>
    `);
});

const observationContainer = document.getElementById('observations-container');
const observationTemplate = document.getElementById('observation-template');

function addObservationBlock() {
    const clone = observationTemplate.content.cloneNode(true);
    observationContainer.appendChild(clone);

    const newBlock = observationContainer.lastElementChild;
    const pageTranslations = translations[currentLang].weekly_walk_down_page;

    newBlock.querySelectorAll('[data-lang-key]').forEach(el => {
        const key = el.dataset.langKey;
        if (pageTranslations && pageTranslations[key]) {
            el.textContent = pageTranslations[key];
        }
    });
    newBlock.querySelectorAll('option').forEach(opt => {
        const key = opt.dataset.langKey;
        if (pageTranslations[key]) {
            opt.textContent = pageTranslations[key];
        }
    });

    newBlock.querySelector('.remove-observation-btn').addEventListener('click', () => newBlock.remove());

    const imageInput = newBlock.querySelector('.pictures');
    const previewsContainer = newBlock.querySelector('.image-previews');
    imageInput.addEventListener('change', (event) => {
        previewsContainer.innerHTML = '';
        for (const file of event.target.files) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const container = document.createElement('div');
                container.className = 'image-preview-container';
                const img = document.createElement('img');
                img.src = e.target.result;
                container.appendChild(img);
                previewsContainer.appendChild(container);
            };
            reader.readAsDataURL(file);
        }
    });
}

document.getElementById('add-observation-btn').addEventListener('click', addObservationBlock);
langBtn.addEventListener('click', () => {
    const newLang = currentLang === 'ar' ? 'en' : 'ar';
    setLanguage(newLang);
});
document.getElementById('download-btn').addEventListener('click', () => generateWalkDownPdf('content-to-print'));

// Initialize Page
addObservationBlock(); 
for(let i=0; i<5; i++) {
    document.getElementById('add-attendee-btn').click();
}
setLanguage(currentLang);