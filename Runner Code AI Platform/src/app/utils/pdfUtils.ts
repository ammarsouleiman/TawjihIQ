import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

// Set worker source - using unpkg for latest version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs`;

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF document with configuration
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    const maxPages = Math.min(pdf.numPages, 100); // Increased to 100 pages
    
    // Extract text from each page with better formatting
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Improved text extraction with line breaks preservation
      let lastY = -1;
      const lines: string[] = [];
      let currentLine = '';
      
      textContent.items
        .filter((item): item is TextItem => 'str' in item)
        .forEach((item) => {
          const itemY = item.transform[5]; // Y coordinate
          
          // Detect line break (significant Y change)
          if (lastY !== -1 && Math.abs(itemY - lastY) > 5) {
            if (currentLine.trim()) {
              lines.push(currentLine.trim());
            }
            currentLine = item.str;
          } else {
            // Same line, add space if needed
            if (currentLine && !currentLine.endsWith(' ') && !item.str.startsWith(' ')) {
              currentLine += ' ';
            }
            currentLine += item.str;
          }
          
          lastY = itemY;
        });
      
      // Add last line
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }
      
      const pageText = lines.join('\n');
      
      if (pageText.trim()) {
        fullText += `\n\n========== PAGE ${pageNum} ==========\n${pageText}`;
      }
    }
    
    if (pdf.numPages > maxPages) {
      fullText += `\n\n[Note: This PDF has ${pdf.numPages} total pages. Showing content from first ${maxPages} pages.]`;
    }
    
    return fullText.trim() || 'No text content found in PDF';
  } catch (error) {
    throw new Error(`Failed to read PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function formatPDFTextForAI(text: string, fileName: string, maxLength: number = 25000): string {
  // Increased limit for better context
  let processedText = text;
  
  if (text.length > maxLength) {
    // Smart truncation - try to keep complete sections
    processedText = text.substring(0, maxLength);
    const lastPageBreak = processedText.lastIndexOf('========== PAGE');
    if (lastPageBreak > maxLength * 0.7) {
      processedText = processedText.substring(0, lastPageBreak);
    }
    processedText += '\n\n[Note: Document content continues...]';
  }
  
  return `Here is the content of the PDF document "${fileName}":

${processedText}

Please answer any questions about this document naturally and conversationally, as if you've read and understood the entire content.`;
}
