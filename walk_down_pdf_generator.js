// Helper function to get the dimensions of an image from its source
function getImageDimensions(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = reject;
        img.src = src;
    });
}

async function generateWalkDownPdf(contentId) {
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

    // Use an invisible iframe to render a clean, desktop-only version of the form
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '1200px';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow.document;

    const originalHtml = document.getElementById(contentId).innerHTML;
    const printHtml = `
        <!DOCTYPE html><html lang="${currentLang}" dir="${currentLang === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="UTF-8">
        <link rel="stylesheet" href="style.css">
        <style>
            body { background: #fff !important; }
            .container {
                box-shadow: none !important;
                border: none !important;
                max-width: 100% !important;
            }
        </style>
        </head><body>
            <div class="container">
                <div id="content-to-print">${originalHtml}</div>
            </div>
        </body></html>`;

    iframeDoc.open();
    iframeDoc.write(printHtml);
    iframeDoc.close();

    // Transfer data from the live form to the clean iframe form
    const inputs = document.querySelectorAll(`#${contentId} input, #${contentId} textarea, #${contentId} select`);
    const iframeInputs = iframeDoc.querySelectorAll(`#${contentId} input, #${contentId} textarea, #${contentId} select`);
    iframeInputs.forEach((iframeInput, index) => {
        if (inputs[index] && iframeInput.type !== 'file') {
            iframeInput.value = inputs[index].value;
        }
    });

    // Correctly handle image data transfer to prevent duplication
    const originalImagePreviews = document.querySelectorAll('.image-previews');
    const iframeImagePreviews = iframeDoc.querySelectorAll('.image-previews');
    iframeImagePreviews.forEach((previewContainer, index) => {
        previewContainer.innerHTML = ''; // Clear any images that were cloned with innerHTML
        const originalImages = originalImagePreviews[index].querySelectorAll('img');
        originalImages.forEach(img => {
            const newImg = iframeDoc.createElement('img');
            newImg.src = img.src;
            previewContainer.appendChild(newImg);
        });
    });

    const pageTranslations = translations[currentLang].weekly_walk_down_page;
    iframeDoc.querySelectorAll('[data-lang-key]').forEach(el => {
        const key = el.dataset.langKey;
        if (pageTranslations[key]) el.textContent = pageTranslations[key];
    });

    // Hide all buttons that shouldn't be in the PDF
    iframeDoc.querySelectorAll('.remove-btn, .add-btn, input[type="file"]').forEach(btn => btn.style.display = 'none');
    iframeDoc.querySelectorAll('#attendance-table th:last-child, #attendance-table td:last-child').forEach(th => th.style.display = 'none');

    try {
        await new Promise(resolve => setTimeout(resolve, 500));

        const contentToPrint = iframeDoc.getElementById('content-to-print');
        const sections = Array.from(contentToPrint.querySelectorAll('.pdf-section, .observation-block'));
        const pdf = new jsPDF('p', 'mm', 'a4');
        const margin = 10;
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const printableWidth = pdfWidth - (margin * 2);
        const printableHeight = pdf.internal.pageSize.getHeight() - (margin * 2);
        let yPosition = margin;

        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];

            // Render the text/form part of the section first
            const imageContainer = section.querySelector('.image-previews');
            const images = imageContainer ? Array.from(imageContainer.querySelectorAll('img')) : [];
            if (imageContainer) imageContainer.style.display = 'none';

            const canvas = await html2canvas(section, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            if (imageContainer) imageContainer.style.display = 'grid'; // Restore visibility

            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / printableWidth;
            const textPartHeight = canvasHeight / ratio;

            if (yPosition + textPartHeight > printableHeight && i > 0) {
                pdf.addPage();
                yPosition = margin;
            }

            pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', margin, yPosition, printableWidth, textPartHeight);

            // FIXED: Increased the space between sections
            yPosition += textPartHeight + 5;

            // Now, manually draw the large, high-quality images in a 2-column layout
            if (images.length > 0) {
                yPosition += 5; // Space before images start

                const imageBoxWidth = (printableWidth / 2) - 2; // Two images per row with a 4mm gap
                const imageBoxHeight = imageBoxWidth; // Make the container square
                const gap = 4;
                let currentX = margin;
                let rowCounter = 0;

                for (const img of images) {
                    const dimensions = await getImageDimensions(img.src);

                    // Calculate 'contain' dimensions
                    const wRatio = imageBoxWidth / dimensions.width;
                    const hRatio = imageBoxHeight / dimensions.height;
                    const fitRatio = Math.min(wRatio, hRatio);
                    const imgWidthInPdf = dimensions.width * fitRatio;
                    const imgHeightInPdf = dimensions.height * fitRatio;

                    // Center the image within its box
                    const xOffset = (imageBoxWidth - imgWidthInPdf) / 2;
                    const yOffset = (imageBoxHeight - imgHeightInPdf) / 2;

                    if (yPosition + imageBoxHeight > printableHeight) {
                        pdf.addPage();
                        yPosition = margin;
                        currentX = margin;
                        rowCounter = 0;
                    }

                    // FIXED: Draw gray background behind each image
                    pdf.setFillColor(248, 249, 250); // Light gray color #f8f9fa
                    pdf.rect(currentX, yPosition, imageBoxWidth, imageBoxHeight, 'F'); // Draw filled rectangle

                    pdf.addImage(img.src, 'JPEG', currentX + xOffset, yPosition + yOffset, imgWidthInPdf, imgHeightInPdf);

                    if (rowCounter % 2 === 0) { // First image in a row
                        currentX += imageBoxWidth + gap;
                    } else { // Second image in a row, move to next line
                        currentX = margin;
                        yPosition += imageBoxHeight + gap;
                    }
                    rowCounter++;
                }

                // If the last row had only one image, we still need to advance Y
                if (images.length % 2 !== 0) {
                    yPosition += imageBoxHeight + gap;
                }
            }
        }

        const projectName = document.getElementById('project').value || 'Report';
        const reportDate = document.getElementById('reportDate').value || new Date().toISOString().split('T')[0];
        pdf.save(`Weekly_Walk_Down - ${projectName} - ${reportDate}.pdf`);

    } catch (err) {
        alert("An error occurred: " + err.message);
    } finally {
        document.body.removeChild(iframe);
        downloadButton.textContent = originalButtonText;
        downloadButton.classList.remove('loading');
        downloadButton.disabled = false;
    }
}