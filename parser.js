// ตั้งค่า worker ให้ pdf.js (สำคัญมาก)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

async function parsePdfContent(pdfPath) {
    console.log("Starting PDF parsing...");
    const loadingTask = pdfjsLib.getDocument(pdfPath);
    const doc = await loadingTask.promise;
    const numPages = doc.numPages;
    let fullText = '';

    // ดึงข้อความจากทุกหน้า
    for (let i = 1; i <= numPages; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(' ');
    }
    console.log("PDF text extracted.");

    // Regex Patterns (ปรับปรุงให้ทำงานกับข้อความที่ดึงมา)
    const subpartPattern = /SUBPART\s+[A-Z]\s+-\s+[\w\s]+/g;
    const sectionPattern = /SECTION\s+\d+\s+-\s+[\w\s]+/g;
    const fclPattern = /(FCL\.\d+(\(\w+\))?)\s+/g;
    
    let structure = {};

    // ค้นหาตำแหน่งของแต่ละส่วน
    const subpartMatches = [...fullText.matchAll(subpartPattern)];
    const sectionMatches = [...fullText.matchAll(sectionPattern)];
    const fclMatches = [...fullText.matchAll(fclPattern)];

    subpartMatches.forEach((subpartMatch, i) => {
        const subpartName = subpartMatch[0].trim();
        structure[subpartName] = {};
        const subpartStart = subpartMatch.index;
        const subpartEnd = (i + 1 < subpartMatches.length) ? subpartMatches[i + 1].index : Infinity;

        // ค้นหา Section ภายใน Subpart
        const sectionsInSubpart = sectionMatches.filter(s => s.index > subpartStart && s.index < subpartEnd);
        sectionsInSubpart.forEach((sectionMatch, j) => {
            const sectionName = sectionMatch[0].trim();
            structure[subpartName][sectionName] = { fcls: [], content: {} };
            const sectionStart = sectionMatch.index;
            const sectionEnd = (j + 1 < sectionsInSubpart.length) ? sectionsInSubpart[j + 1].index : subpartEnd;

            // ค้นหา FCL ภายใน Section
            const fclsInSection = fclMatches.filter(f => f.index > sectionStart && f.index < sectionEnd);
            fclsInSection.forEach((fclMatch, k) => {
                const fclName = fclMatch[1].trim();
                structure[subpartName][sectionName].fcls.push(fclName);
                
                const fclStart = fclMatch.index;
                const fclEnd = (k + 1 < fclsInSection.length) ? fclsInSection[k+1].index : sectionEnd;
                
                // ดึงเนื้อหาระหว่าง FCL นี้กับ FCL ถัดไป
                const fclContent = fullText.substring(fclStart + fclMatch[0].length, fclEnd).trim();
                structure[subpartName][sectionName].content[fclName] = fclContent;
            });
        });
    });

    console.log("PDF parsing complete.");
    return structure;
}
