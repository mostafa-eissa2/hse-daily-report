async function generatePdf(contentId) {
    const { jsPDF } = window.jspdf;
    if (!jsPDF || !html2canvas) {
        alert('Error: PDF libraries not loaded.');
        return;
    }

    const downloadButton = document.getElementById('download-btn');
    const originalButtonText = downloadButton.textContent;
    downloadButton.textContent = '';
    downloadButton.classList.add('loading');
    downloadButton.disabled = true;

    // Use an invisible iframe to render the content in a controlled desktop-sized environment
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '950px'; // Force desktop width
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow.document;

    // Gather all data from the user-visible form
    const formData = {};
    const inputs = document.querySelectorAll(`#${contentId} input, #${contentId} textarea`);
    inputs.forEach(input => {
        if (input.id) formData[input.id] = input.value;
    });
    formData.subcontractors = [];
    document.querySelectorAll('#subcontractors-body tr').forEach(row => {
        const name = row.querySelector('.subcontractor-name').value;
        const count = row.querySelector('.subcontractor-count').value;
        if (name || count) {
            formData.subcontractors.push({ name, count });
        }
    });

    const originalHtml = document.getElementById(contentId).innerHTML;
    // We only need the stylesheet link here. No special overrides.
    const printHtml = `
        <!DOCTYPE html><html lang="${currentLang}" dir="${currentLang === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="UTF-8">
        <link rel="stylesheet" href="style.css">
        </head><body>
            <div class="container">
                <div id="content-to-print">${originalHtml}</div>
            </div>
        </body></html>`;

    iframeDoc.open();
    iframeDoc.write(printHtml);
    iframeDoc.close();

    // Populate the iframe's form with the data
    Object.keys(formData).forEach(id => {
        if (id !== 'subcontractors') {
            const element = iframeDoc.getElementById(id);
            if (element) element.value = formData[id];
        }
    });
    const iframeSubBody = iframeDoc.getElementById('subcontractors-body');
    if (iframeSubBody) {
        iframeSubBody.innerHTML = '';
        formData.subcontractors.forEach(sub => {
            const row = iframeDoc.createElement('tr');
            row.innerHTML = `<td><input type="text" value="${sub.name || ''}" readonly></td><td><input type="number" value="${sub.count || 0}" readonly></td>`;
            iframeSubBody.appendChild(row);
        });
        const addBtn = iframeDoc.getElementById('add-subcontractor-btn');
        if (addBtn) addBtn.style.display = 'none';
        const removeColumnHeader = iframeDoc.querySelector('#subcontractors-table th:nth-child(3)');
        if (removeColumnHeader) removeColumnHeader.style.display = 'none';
    }

    const pageTranslations = translations[currentLang].hse_report_page;
    iframeDoc.querySelectorAll('[data-lang-key]').forEach(el => {
        const key = el.dataset.langKey;
        if (pageTranslations[key]) el.textContent = pageTranslations[key];
    });
    const iframeIncTable = iframeDoc.getElementById('incidents-table');
    if (iframeIncTable) {
        iframeIncTable.querySelector('tbody tr:nth-child(1) td:first-child b').textContent = pageTranslations['company'];
        iframeIncTable.querySelector('tbody tr:nth-child(2) td:first-child b').textContent = pageTranslations['subcontractor'];
    }
    const iframeObsTable = iframeDoc.getElementById('observations-table');
    if (iframeObsTable) {
        iframeObsTable.querySelector('tbody tr:nth-child(1) td:first-child b').textContent = pageTranslations['company'];
        iframeObsTable.querySelector('tbody tr:nth-child(2) td:first-child b').textContent = pageTranslations['subcontractor'];
    }

    try {
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for iframe to render fully

        const contentToPrint = iframeDoc.getElementById('content-to-print');
        const sections = Array.from(contentToPrint.querySelectorAll('.pdf-section'));
        const pdf = new jsPDF('p', 'mm', 'a4');
        const margin = 10;
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const printableWidth = pdfWidth - (margin * 2);
        const printableHeight = pdf.internal.pageSize.getHeight() - (margin * 2);
        let yPosition = margin;

        // FINAL METHOD: Render each section individually in a clean wrapper to solve BOTH problems
        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];

            // Create a clean wrapper for rendering to avoid capturing the parent's shadow
            const renderWrapper = iframeDoc.createElement('div');
            renderWrapper.style.background = 'white';
            iframeDoc.body.appendChild(renderWrapper);
            renderWrapper.appendChild(section.cloneNode(true));

            const canvas = await html2canvas(renderWrapper, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            // Clean up the temporary wrapper immediately after capture
            iframeDoc.body.removeChild(renderWrapper);

            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / printableWidth;
            const imageInPdfHeight = canvasHeight / ratio;

            // Smart splitting logic
            if (yPosition + imageInPdfHeight > printableHeight && i > 0) {
                pdf.addPage();
                yPosition = margin;
            }

            pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', margin, yPosition, printableWidth, imageInPdfHeight);
            yPosition += imageInPdfHeight + 4; // Add a 4mm gap between sections
        }

        const projectName = formData['projectName'] || 'Report';
        const reportDate = formData['reportDate'] || new Date().toISOString().split('T')[0];
        pdf.save(`HSE Report - ${projectName} - ${reportDate}.pdf`);

    } catch (err) {
        alert("An error occurred: " + err.message);
    } finally {
        document.body.removeChild(iframe);
        downloadButton.textContent = originalButtonText;
        downloadButton.classList.remove('loading');
        downloadButton.disabled = false;
    }
}