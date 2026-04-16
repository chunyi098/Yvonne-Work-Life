document.getElementById('receiptUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    Tesseract.recognize(file, 'eng').then(({ data: { text } }) => {
        // Simple logic to find a '$' or 'Total' in the text
        const amountMatch = text.match(/\$?\d+(\.\d{2})?/);
        if(amountMatch) document.getElementById('expAmount').value = amountMatch[0];
        alert("Scanned text: " + text.substring(0, 100) + "...");
    });
});
