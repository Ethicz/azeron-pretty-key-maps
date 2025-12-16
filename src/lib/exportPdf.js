// src/lib/exportPdf.js
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

/**
 * Export an HTML element to PDF (US Letter landscape)
 * @param {HTMLElement} element - The DOM element to export
 * @param {string} filename - Output filename (without extension)
 */
export async function downloadPDF(element, filename = 'keymap') {
  if (!element) {
    console.warn('No element provided for PDF export');
    return;
  }

  try {
    // Generate high-quality PNG from the element
    const dataUrl = await toPng(element, {
      quality: 1.0,
      pixelRatio: 2, // Higher resolution for print
      backgroundColor: '#0b0d12'
    });

    // Create PDF in landscape US Letter format
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'in',
      format: 'letter' // 11 x 8.5 inches
    });

    // Get image dimensions
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = dataUrl;
    });

    // Calculate dimensions to fit the page while maintaining aspect ratio
    const pageWidth = 11; // Letter landscape width
    const pageHeight = 8.5; // Letter landscape height
    const margin = 0.25; // Quarter inch margin

    const availWidth = pageWidth - (margin * 2);
    const availHeight = pageHeight - (margin * 2);

    const imgAspect = img.width / img.height;
    const pageAspect = availWidth / availHeight;

    let finalWidth, finalHeight;
    if (imgAspect > pageAspect) {
      // Image is wider than page
      finalWidth = availWidth;
      finalHeight = availWidth / imgAspect;
    } else {
      // Image is taller than page
      finalHeight = availHeight;
      finalWidth = availHeight * imgAspect;
    }

    // Center the image on the page
    const x = margin + (availWidth - finalWidth) / 2;
    const y = margin + (availHeight - finalHeight) / 2;

    pdf.addImage(dataUrl, 'PNG', x, y, finalWidth, finalHeight);
    pdf.save(`${filename}.pdf`);

  } catch (error) {
    console.error('PDF export failed:', error);
    throw error;
  }
}
