import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

/**
 * Temukan area tanda tangan di halaman terakhir PDF.
 * Area: di bawah "tempat, tanggal" dan di atas nama penanda tangan.
 * @param {Buffer} pdfBuffer
 * @returns {Promise<{x: number, y: number}>} Posisi estimasi untuk QR code
 */
export async function detectSignatureArea(pdfBuffer) {
  // Load PDF
  const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pdf.numPages);

  // Ekstrak teks dan posisi
  const textContent = await page.getTextContent();
  const items = textContent.items;

  // Temukan "tempat, tanggal"
  let tempatTanggalIdx = -1;
  let namaIdx = -1;
  let tempatTanggalY = null;
  let namaY = null;

  // Pola pencarian
  const tempatTanggalRegex = /(tempat|tanggal|,)/i;
  const namaRegex = /(nama|ttd|signature|signed|oleh|by)/i;

  // Scan dari bawah ke atas
  for (let i = items.length - 1; i >= 0; i--) {
    const str = items[i].str.trim().toLowerCase();
    if (namaIdx === -1 && namaRegex.test(str)) {
      namaIdx = i;
      namaY = items[i].transform[5]; // y position
    }
    if (tempatTanggalIdx === -1 && tempatTanggalRegex.test(str)) {
      tempatTanggalIdx = i;
      tempatTanggalY = items[i].transform[5];
    }
    if (namaIdx !== -1 && tempatTanggalIdx !== -1) break;
  }

  // Estimasi posisi QR code
  let x = 300, y = 100; // fallback default
  if (tempatTanggalY && namaY) {
    // Tempatkan QR code di tengah antara tempatTanggalY dan namaY
    y = tempatTanggalY - ((tempatTanggalY - namaY) / 2);
    // x bisa di kanan bawah, misal:
    x = page.view[2] - 120;
  }

  return { x, y };
}