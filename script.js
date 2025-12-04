document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-btn');
    const downloadAllBtn = document.getElementById('download-all-btn');
    const qrInput = document.getElementById('qr-input');
    const qrSizeSelect = document.getElementById('qr-size');
    const qrColorInput = document.getElementById('qr-color');
    const resultsSection = document.getElementById('results-section');
    const qrGrid = document.getElementById('qr-grid');
    const countSpan = document.getElementById('count');

    let generatedQRs = []; // Store generated QR data for download

    generateBtn.addEventListener('click', async () => {
        const text = qrInput.value.trim();
        if (!text) {
            alert('Vui lòng nhập nội dung để tạo mã QR.');
            return;
        }

        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0) return;

        // Reset UI
        qrGrid.innerHTML = '';
        generatedQRs = [];
        resultsSection.classList.remove('hidden');
        countSpan.textContent = lines.length;
        
        const size = parseInt(qrSizeSelect.value);
        const color = qrColorInput.value;

        // Generate QRs
        for (let i = 0; i < lines.length; i++) {
            const content = lines[i].trim();
            const qrContainer = document.createElement('div');
            qrContainer.className = 'qr-item';
            
            // Container for the QR code library to render into
            const qrDiv = document.createElement('div');
            qrContainer.appendChild(qrDiv);
            
            const label = document.createElement('div');
            label.className = 'qr-text';
            label.textContent = content;
            qrContainer.appendChild(label);

            qrGrid.appendChild(qrContainer);

            // Generate QR
            // Using a Promise to ensure rendering before moving on (though qrcodejs is sync usually)
            new QRCode(qrDiv, {
                text: content,
                width: size,
                height: size,
                colorDark : color,
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });

            // Wait a bit for the canvas/img to be ready to grab data URL
            await new Promise(resolve => setTimeout(resolve, 50));

            const img = qrDiv.querySelector('img');
            if (img) {
                // Wait for image load if it's an img tag
                if (!img.complete) {
                    await new Promise(r => img.onload = r);
                }
                generatedQRs.push({
                    name: `qr_${i + 1}_${sanitizeFilename(content)}.png`,
                    data: img.src
                });
            } else {
                // Fallback for canvas
                const canvas = qrDiv.querySelector('canvas');
                if (canvas) {
                    generatedQRs.push({
                        name: `qr_${i + 1}_${sanitizeFilename(content)}.png`,
                        data: canvas.toDataURL('image/png')
                    });
                }
            }
        }
    });

    downloadAllBtn.addEventListener('click', () => {
        if (generatedQRs.length === 0) return;

        const zip = new JSZip();
        const folder = zip.folder("qr_codes");

        generatedQRs.forEach(qr => {
            // Remove data:image/png;base64, prefix
            const base64Data = qr.data.split(',')[1];
            folder.file(qr.name, base64Data, {base64: true});
        });

        zip.generateAsync({type:"blob"})
        .then(function(content) {
            saveAs(content, "qr_codes.zip");
        });
    });

    function sanitizeFilename(text) {
        return text.replace(/[^a-z0-9]/gi, '_').substring(0, 20);
    }
});
