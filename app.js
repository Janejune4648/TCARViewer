document.addEventListener('DOMContentLoaded', async () => {
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registered', reg))
            .catch(err => console.error('Service Worker registration failed', err));
    }

    const subpartSelect = document.getElementById('subpart-select');
    const sectionSelect = document.getElementById('section-select');
    const fclSelect = document.getElementById('fcl-select');
    const contentDisplay = document.getElementById('content-display');
    const translateBtn = document.getElementById('translate-btn');
    const translatedContentDiv = document.getElementById('translated-content');
    const statusDiv = document.getElementById('status');
    const controlsDiv = document.querySelector('.controls');

    let PDF_DATA = {};
    const PDF_PATH = 'TCAR-PEL-Part-FCL-Regulation-Issue-01-Rev.01- (1).pdf';

    // --- Main Logic ---
    try {
        PDF_DATA = await parsePdfContent(PDF_PATH);
        statusDiv.style.display = 'none'; // Hide status
        controlsDiv.style.display = 'flex'; // Show controls
        populateSubparts();
    } catch (error) {
        console.error("Failed to load or parse PDF:", error);
        statusDiv.textContent = "เกิดข้อผิดพลาดในการโหลด PDF";
    }

    function populateSubparts() {
        const subparts = Object.keys(PDF_DATA);
        subparts.forEach(subpart => {
            const option = new Option(subpart, subpart);
            subpartSelect.add(option);
        });
    }

    // --- Event Listeners ---
    subpartSelect.addEventListener('change', () => {
        resetSelect(sectionSelect, '-- เลือก SECTION --');
        resetSelect(fclSelect, '-- เลือก FCL --');
        sectionSelect.disabled = true;
        fclSelect.disabled = true;
        translateBtn.disabled = true;

        const selectedSubpart = subpartSelect.value;
        if (selectedSubpart) {
            const sections = Object.keys(PDF_DATA[selectedSubpart]);
            sections.forEach(section => {
                const option = new Option(section, section);
                sectionSelect.add(option);
            });
            sectionSelect.disabled = false;
        }
    });

    sectionSelect.addEventListener('change', () => {
        resetSelect(fclSelect, '-- เลือก FCL --');
        fclSelect.disabled = true;
        translateBtn.disabled = true;
        
        const selectedSubpart = subpartSelect.value;
        const selectedSection = sectionSelect.value;
        if (selectedSection) {
            const fcls = PDF_DATA[selectedSubpart][selectedSection].fcls;
            fcls.forEach(fcl => {
                const option = new Option(fcl, fcl);
                fclSelect.add(option);
            });
            fclSelect.disabled = false;
        }
    });

    fclSelect.addEventListener('change', () => {
        const selectedSubpart = subpartSelect.value;
        const selectedSection = sectionSelect.value;
        const selectedFcl = fclSelect.value;
        translateBtn.disabled = true;
        translatedContentDiv.style.display = 'none';

        if (selectedFcl) {
            const content = PDF_DATA[selectedSubpart][selectedSection].content[selectedFcl];
            contentDisplay.textContent = content || "ไม่พบเนื้อหา";
            translateBtn.disabled = false;
        }
    });
    
    translateBtn.addEventListener('click', async () => {
        const textToTranslate = contentDisplay.textContent;
        // !! คำเตือน: การใส่ API Key ในโค้ดฝั่ง Client ไม่ปลอดภัย !!
        // ควรใช้ Serverless Function เป็น proxy ในการเรียก API
        const API_KEY = 'YOUR_GOOGLE_TRANSLATE_API_KEY'; // <--- ใส่ Key ของคุณที่นี่
        const url = `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    q: textToTranslate,
                    target: 'th'
                }),
            });
            const result = await response.json();
            const translatedText = result.data.translations[0].translatedText;
            translatedContentDiv.querySelector('p').textContent = translatedText;
            translatedContentDiv.style.display = 'block';
        } catch (error) {
            console.error("Translation failed:", error);
            translatedContentDiv.querySelector('p').textContent = "การแปลล้มเหลว";
            translatedContentDiv.style.display = 'block';
        }
    });

    function resetSelect(selectElement, defaultText) {
        selectElement.innerHTML = `<option value="">${defaultText}</option>`;
    }
});
