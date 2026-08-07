import jsPDF from 'jspdf';

export interface PDFGenerationOptions {
  title?: string;
  content: string;
  fileName?: string;
}

export function generatePDFFromText(options: PDFGenerationOptions): string {
  const { title = 'Document', content, fileName = 'document.pdf' } = options;
  
  try {
    // Create new PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    
    // App primary color (Red #E31E24)
    const primaryR = 227;
    const primaryG = 30;
    const primaryB = 36;
    
    // Add professional header background (App primary color)
    doc.setFillColor(primaryR, primaryG, primaryB);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    // Add accent bar (slightly lighter primary)
    doc.setFillColor(Math.min(255, primaryR + 20), Math.min(255, primaryG + 50), Math.min(255, primaryB + 50)); // Lighter shade of primary
    doc.rect(0, 42, pageWidth, 3, 'F');
    
    // Add title in white
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(title, pageWidth - (margin * 2));
    doc.text(titleLines[0], margin, 25);
    
    // Add date in white
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    doc.text(`Generated: ${date}`, margin, 35);
    
    // Reset text color to dark gray for content readability
    doc.setTextColor(40, 40, 40);
    
    // Process and clean content (remove markdown and special symbols for better PDF output)
    let cleanContent = content
      // Remove PDF Ready messages and UI instructions
      .replace(/PDF Ready:.*?(?:Click the Download PDF button|download|get your).*?(?:document|PDF)\.?/gi, '')
      .replace(/Your (?:professionally formatted )?document is ready\.?/gi, '')
      .replace(/Click.*?(?:Download PDF|button below).*?(?:to get|download).*?/gi, '')
      .replace(/```[\s\S]*?```/g, (match) => {
        // Keep code blocks but remove the backticks
        return match.replace(/```\w*\n?/g, '').replace(/```/g, '');
      })
      .replace(/\*\*/g, '') // Remove bold markers
      .replace(/\*/g, '') // Remove italic markers  
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Convert links to plain text
      .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '[Image: $1]') // Convert images
      .replace(/[✨⚡📄🎯💡🚀🔥💪👍✅❌📝🎨💻🌟⭐]/g, '') // Remove emojis
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove all emojis (Unicode range)
      .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
      .trim(); // Remove leading/trailing whitespace
    
    // Add content with automatic page breaks
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'normal');
    
    const maxWidth = pageWidth - (margin * 2);
    const lineHeight = 6;
    let yPosition = 60; // Start after header
    
    // Split content into lines that fit the page width
    const lines = doc.splitTextToSize(cleanContent, maxWidth);
    
    lines.forEach((line: string) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = margin;
      }
      
      // Add bullet points with app color
      if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
        doc.setTextColor(primaryR, primaryG, primaryB); // App primary color
        doc.setFont('helvetica', 'bold');
        doc.text('-', margin, yPosition);
        doc.setTextColor(40, 40, 40); // Dark text for readability
        doc.setFont('helvetica', 'normal');
        doc.text(line.replace(/^[-*]\s*/, ''), margin + 5, yPosition);
      } else {
        doc.text(line, margin, yPosition);
      }
      
      yPosition += lineHeight;
    });
    
    // Add professional footer with page numbers and branding (all in primary color)
    const pageCount = doc.internal.pages.length - 1;
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Footer line in light gray
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
      
      // Footer text in gray
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      
      // Website on left
      doc.setFont('helvetica', 'normal');
      doc.text('ai.runner-code.com', margin, pageHeight - 12);
      
      // Page number in center
      doc.setFont('helvetica', 'italic');
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 12,
        { align: 'center' }
      );
      
      // Branding on right with full app color
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryR, primaryG, primaryB);
      doc.text(
        'Runner Code AI',
        pageWidth - margin,
        pageHeight - 12,
        { align: 'right' }
      );
    }
    
    // Save the PDF
    doc.save(fileName);
    
    return fileName;
  } catch (error) {
    throw new Error('Failed to generate PDF document');
  }
}

export function canGeneratePDF(content: string): boolean {
  // Check if content is suitable for PDF generation
  return content.length > 50 && content.length < 100000;
}
