document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-btn');
    const downloadAllBtn = document.getElementById('download-all-btn');
    const qrInput = document.getElementById('qr-input');
    const qrSizeSelect = document.getElementById('qr-size');
    const qrColorInput = document.getElementById('qr-color');
    const resultsSection = document.getElementById('results-section');
    const qrGrid = document.getElementById('qr-grid');
    const countSpan = document.getElementById('count');
    const labelModeCheckbox = document.getElementById('label-mode');

    let generatedItems = []; // Store generated items (QR or Label) for download

    generateBtn.addEventListener('click', async () => {
        const text = qrInput.value.trim();
        if (!text) {
            alert('Vui lòng nhập nội dung để tạo mã QR.');
            return;
        }

        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0) return;

        // Show loading state
        const btnIcon = generateBtn.querySelector('.btn-icon');
        const spinner = generateBtn.querySelector('.spinner');
        const btnText = generateBtn.querySelector('.btn-text');

        generateBtn.classList.add('btn-loading');
        if (btnIcon) btnIcon.classList.add('hidden');
        if (spinner) spinner.classList.remove('hidden');
        if (btnText) btnText.textContent = 'Đang tạo...';

        // Reset UI
        qrGrid.innerHTML = '';
        generatedItems = [];
        resultsSection.classList.remove('hidden');
        countSpan.textContent = lines.length;

        // Add pop animation to badge
        countSpan.classList.remove('pop');
        void countSpan.offsetWidth; // Trigger reflow
        countSpan.classList.add('pop');

        const size = parseInt(qrSizeSelect.value);
        const color = qrColorInput.value;
        const isLabelMode = labelModeCheckbox.checked;

        // Generate Items
        for (let i = 0; i < lines.length; i++) {
            const content = lines[i].trim();
            const itemContainer = document.createElement('div');
            itemContainer.className = 'qr-item';
            itemContainer.title = 'Click để tải xuống';

            qrGrid.appendChild(itemContainer);

            if (isLabelMode) {
                // Label Mode Generation
                try {
                    const dataUrl = await generateLabel(content, size, color);
                    const img = document.createElement('img');
                    img.src = dataUrl;
                    itemContainer.appendChild(img);

                    const item = {
                        name: `label_${i + 1}_${sanitizeFilename(content)}.png`,
                        data: dataUrl
                    };
                    generatedItems.push(item);

                    // Add click-to-download
                    itemContainer.addEventListener('click', () => downloadSingleItem(item));
                } catch (e) {
                    console.error("Error generating label:", e);
                }
            } else {
                // Standard QR Mode
                const qrDiv = document.createElement('div');
                itemContainer.appendChild(qrDiv);

                const label = document.createElement('div');
                label.className = 'qr-text';
                label.textContent = content;
                itemContainer.appendChild(label);

                new QRCode(qrDiv, {
                    text: content,
                    width: size,
                    height: size,
                    colorDark: color,
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });

                await new Promise(resolve => setTimeout(resolve, 50));

                const img = qrDiv.querySelector('img');
                let item;
                if (img) {
                    if (!img.complete) await new Promise(r => img.onload = r);
                    item = {
                        name: `qr_${i + 1}_${sanitizeFilename(content)}.png`,
                        data: img.src
                    };
                } else {
                    const canvas = qrDiv.querySelector('canvas');
                    if (canvas) {
                        item = {
                            name: `qr_${i + 1}_${sanitizeFilename(content)}.png`,
                            data: canvas.toDataURL('image/png')
                        };
                    }
                }

                if (item) {
                    generatedItems.push(item);
                    // Add click-to-download
                    itemContainer.addEventListener('click', () => downloadSingleItem(item));
                }
            }
        }

        // Reset button state
        generateBtn.classList.remove('btn-loading');
        if (btnIcon) btnIcon.classList.remove('hidden');
        if (spinner) spinner.classList.add('hidden');
        if (btnText) btnText.textContent = 'Tạo QR Code Ngay';
    });

    downloadAllBtn.addEventListener('click', () => {
        if (generatedItems.length === 0) return;

        const zip = new JSZip();
        const folderName = labelModeCheckbox.checked ? "labels" : "qr_codes";
        const folder = zip.folder(folderName);

        generatedItems.forEach(item => {
            const base64Data = item.data.split(',')[1];
            folder.file(item.name, base64Data, { base64: true });
        });

        zip.generateAsync({ type: "blob" })
            .then(function (content) {
                saveAs(content, `${folderName}.zip`);
            });
    });

    function sanitizeFilename(text) {
        return text.replace(/[^a-z0-9]/gi, '_').substring(0, 20);
    }

    function downloadSingleItem(item) {
        const link = document.createElement('a');
        link.href = item.data;
        link.download = item.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async function generateLabel(text, qrSize, color) {
        return new Promise((resolve) => {
            // Create a temporary container for QR generation
            const tempDiv = document.createElement('div');

            // Generate QR first
            new QRCode(tempDiv, {
                text: text,
                width: qrSize,
                height: qrSize,
                colorDark: color,
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });

            // Wait for QR to be ready
            setTimeout(() => {
                const qrImg = tempDiv.querySelector('img');
                const qrCanvas = tempDiv.querySelector('canvas');

                let qrSource = qrImg && qrImg.src ? qrImg : qrCanvas;

                if (!qrSource) {
                    resolve(null);
                    return;
                }

                // Canvas setup for the label
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Label dimensions (approx 3:1 ratio based on image)
                // We'll scale based on QR size. 
                // Let's say QR is 100px, Label height is 120px (padding), Width is 350px.
                const padding = 20;
                const labelHeight = qrSize + (padding * 2);
                const labelWidth = (qrSize * 3.5) + (padding * 2);

                canvas.width = labelWidth;
                canvas.height = labelHeight;

                // Draw White Background
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, labelWidth, labelHeight);

                // Draw Border
                ctx.strokeStyle = "#000000";
                ctx.lineWidth = 4;
                ctx.strokeRect(2, 2, labelWidth - 4, labelHeight - 4);

                // Draw QR Code
                // If it's an image, we need to ensure it's loaded, but qrcodejs usually gives datauri immediately
                if (qrSource instanceof HTMLImageElement && !qrSource.complete) {
                    qrSource.onload = () => drawContent(ctx, qrSource, text, qrSize, padding, labelWidth, labelHeight, resolve, canvas);
                } else {
                    drawContent(ctx, qrSource, text, qrSize, padding, labelWidth, labelHeight, resolve, canvas);
                }
            }, 50);
        });
    }

    function drawContent(ctx, qrSource, text, qrSize, padding, labelWidth, labelHeight, resolve, canvas) {
        // Draw QR
        ctx.drawImage(qrSource, padding + 10, padding, qrSize, qrSize);

        // Draw Text
        ctx.fillStyle = "#000000";
        // Font size relative to QR size
        const fontSize = Math.floor(qrSize / 5.5);
        ctx.font = `${fontSize}px Arial`;
        ctx.textBaseline = 'middle';

        const textX = padding + qrSize + 30;
        const centerY = labelHeight / 2;

        // Split text logic (simple split by length or specific pattern)
        // User pattern: 293D1752P0024A202512100001W0111 (31 chars)
        // Split roughly in half or by specific logic. 
        // Let's split at 18 chars as per plan or just find a good midpoint.

        let line1 = text;
        let line2 = "";

        if (text.length > 18) {
            line1 = text.substring(0, 18);
            line2 = text.substring(18);
        }

        ctx.fillText(line1, textX, centerY - (fontSize * 0.8));
        ctx.fillText(line2, textX, centerY + (fontSize * 0.8));

        resolve(canvas.toDataURL('image/png'));
    }
});
