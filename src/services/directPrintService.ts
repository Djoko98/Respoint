import { invoke } from '@tauri-apps/api/core';
import { loadFromStorage } from './storageService';

interface ReservationPrintData {
  guestName: string;
  date: string;
  time: string;
  numberOfGuests: number;
  tableNumber?: string;
  serviceType?: string;
  additionalRequirements?: string;
  restaurantName?: string;
  restaurantAddress?: string;
  logoUrl?: string;
}

interface PrintOptions {
  paperWidth?: number; // characters per line (default 32 for 58mm)
  includeHeader?: boolean;
  includeFooter?: boolean;
}

export class DirectPrintService {
  private static readonly DEFAULT_WIDTH = 30; // slightly reduced to avoid clipping on some printers
  private static readonly LOGO_MAX_WIDTH = 384; // max width for logo in pixels (58mm ~= 384px)
  private static readonly LEFT_MARGIN_SPACES = 2; // slightly bigger left margin for better centering
  private static readonly ESC = '\x1B';
  private static readonly GS = '\x1D';
  
  // ESC/POS commands for thermal printers
  private static readonly COMMANDS = {
    INITIALIZE: '\x1B\x40', // ESC @
    CENTER_ALIGN: '\x1B\x61\x01', // ESC a 1
    LEFT_ALIGN: '\x1B\x61\x00', // ESC a 0
    BOLD_ON: '\x1B\x45\x01', // ESC E 1
    BOLD_OFF: '\x1B\x45\x00', // ESC E 0
    DOUBLE_HEIGHT: '\x1B\x21\x10', // ESC ! 16
    DOUBLE_WIDTH: '\x1B\x21\x20',  // ESC ! 32
    DOUBLE_SIZE: '\x1B\x21\x30',   // ESC ! 48 (double width + height)
    NORMAL_SIZE: '\x1B\x21\x00', // ESC ! 0
    CUT_PAPER: '\x1D\x56\x42\x00', // GS V B 0 (partial cut)
    FEED_LINES: (lines: number) => '\x1B\x64' + lines.toString(16).padStart(2, '0'), // ESC d n
    BITMAP_MODE: '\x1B\x2A\x00', // ESC * 0 (8-dot single density bitmap)
    LINE_FEED: '\x0A', // LF
  };

  private static isLikelyPosPrinterName(name: string): boolean {
    const n = name.toLowerCase();
    return [
      'epson', 'esc/pos', 'esc-pos', 'star', 'bixolon', 'xprinter', 'zjiang', 'gp-', 'pos', 'thermal'
    ].some(k => n.includes(k));
  }

  /**
   * Convert logo URL to ESC/POS bitmap format
   */
  private static async convertLogoToBitmap(logoUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          // Create canvas for image processing
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // For 58mm printer, use exact dimensions without scaling
          // Logo is already optimized at 384x384px
          let targetWidth = img.width;
          let targetHeight = img.height;
          
          // If logo is wider than printer max width (384px), scale it down
          if (targetWidth > this.LOGO_MAX_WIDTH) {
            const scale = this.LOGO_MAX_WIDTH / targetWidth;
            targetWidth = this.LOGO_MAX_WIDTH;
            targetHeight = Math.floor(targetHeight * scale);
          }
          
          // Ensure width is divisible by 8 (required for ESC/POS bitmap)
          targetWidth = Math.floor(targetWidth / 8) * 8;
          if (targetWidth === 0) targetWidth = 8;
          
          // Keep aspect ratio when adjusting for 8-bit alignment
          if (targetWidth !== img.width) {
            const scale = targetWidth / img.width;
            targetHeight = Math.floor(img.height * scale);
          }
          
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          
          // Use pixelated rendering to maintain sharp edges
          ctx.imageSmoothingEnabled = false;
          // Vendor prefixes for broader compatibility
          (ctx as any).webkitImageSmoothingEnabled = false;
          (ctx as any).mozImageSmoothingEnabled = false;
          (ctx as any).msImageSmoothingEnabled = false;
          
          // Fill white background
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          
          // Draw image at exact size
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          
          // Get image data
          const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
          const data = imageData.data;
          
          console.log(`🖼️ Logo conversion: ${img.width}x${img.height} → ${targetWidth}x${targetHeight} pixels`);
          
          // Convert to monochrome bitmap
          let bitmapData = '';
          
          for (let y = 0; y < targetHeight; y++) {
            // ESC/POS bitmap command for this line
            const bytesPerLine = targetWidth / 8;
            bitmapData += this.COMMANDS.BITMAP_MODE;
            bitmapData += String.fromCharCode(bytesPerLine & 0xFF);
            bitmapData += String.fromCharCode((bytesPerLine >> 8) & 0xFF);
            
            // Process pixels in groups of 8
            for (let x = 0; x < targetWidth; x += 8) {
              let byte = 0;
              
              for (let bit = 0; bit < 8; bit++) {
                const pixelX = x + bit;
                if (pixelX < targetWidth) {
                  const pixelIndex = (y * targetWidth + pixelX) * 4;
                  const r = data[pixelIndex];
                  const g = data[pixelIndex + 1];
                  const b = data[pixelIndex + 2];
                  
                  // Convert to grayscale using proper luminance formula
                  const grayscale = (r * 0.299 + g * 0.587 + b * 0.114);
                  
                  // Use better threshold for black/white conversion
                  const threshold = 127; // Adjust if needed (0-255)
                  
                  // If pixel is dark enough, set bit (1 = black, 0 = white)
                  if (grayscale < threshold) {
                    byte |= (1 << (7 - bit));
                  }
                }
              }
              
              bitmapData += String.fromCharCode(byte);
            }
            
            bitmapData += this.COMMANDS.LINE_FEED;
          }
          
          resolve(bitmapData);
          
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load logo image'));
      };
      
      img.src = logoUrl;
    });
  }

  /**
   * Format reservation data for 58mm POS printer
   */
  static async formatReservationReceipt(data: ReservationPrintData, options: PrintOptions = {}): Promise<string> {
    const width = options.paperWidth || this.DEFAULT_WIDTH;
    let content = '';

    // Initialize printer and set bold globally
    content += this.COMMANDS.INITIALIZE;
    content += this.COMMANDS.BOLD_ON;
    
    // Header section
    if (options.includeHeader !== false) {
      content += this.COMMANDS.CENTER_ALIGN;
      
      // Add logo if available (full width)
      if (data.logoUrl) {
        try {
          const logoBitmap = await this.convertLogoToBitmap(data.logoUrl);
          content += logoBitmap;
          // Extra spacing after logo
          content += this.COMMANDS.FEED_LINES(2);
        } catch (error) {
          console.warn('Failed to process logo for printing:', error);
          // Continue without logo
        }
      }
      // Restaurant name larger and bold
      content += this.COMMANDS.DOUBLE_SIZE; // double width + height
      content += this.centerText(data.restaurantName || 'RESTAURANT', Math.max(1, Math.floor(width / 2))) + '\n';
      content += this.COMMANDS.NORMAL_SIZE;
      // Center rule visually with left margin
      content += this.printLine('-', width) + '\n';
      content += this.COMMANDS.FEED_LINES(1);
      if (data.restaurantAddress) {
        content += this.centerText(data.restaurantAddress, width) + '\n';
      }
      // Move rule after address
      content += this.printLine('=', width) + '\n';
      content += this.COMMANDS.FEED_LINES(1);
    }

    // Reservation title (larger)
    content += this.COMMANDS.CENTER_ALIGN;
    content += this.COMMANDS.DOUBLE_SIZE; // larger title
    content += this.centerText('POTVRDA REZERVACIJE', Math.max(1, Math.floor(width / 2))) + '\n';
    content += this.COMMANDS.NORMAL_SIZE;
    content += this.printLine('-', width) + '\n';
    content += this.COMMANDS.FEED_LINES(1);

    // Reservation details - increased spacing and taller rows
    content += this.COMMANDS.LEFT_ALIGN;
    content += this.COMMANDS.DOUBLE_HEIGHT; // taller rows
    content += this.formatDetailLine('Ime gosta:', data.guestName, width) + '\n';
    content += this.COMMANDS.FEED_LINES(2);
    content += this.formatDetailLine('Datum:', this.formatDate(data.date), width) + '\n';
    content += this.COMMANDS.FEED_LINES(2);
    content += this.formatDetailLine('Vreme:', this.formatTime(data.time), width) + '\n';
    content += this.COMMANDS.FEED_LINES(2);
    
    if (data.tableNumber) {
      content += this.formatDetailLine('Sto:', data.tableNumber, width) + '\n';
      content += this.COMMANDS.FEED_LINES(2);
    }
    
    content += this.formatDetailLine('Mesta:', data.numberOfGuests.toString(), width) + '\n';
    content += this.COMMANDS.FEED_LINES(2);
    
    if (data.serviceType) {
      content += this.formatDetailLine('Servis:', data.serviceType, width) + '\n';
      content += this.COMMANDS.FEED_LINES(2);
    }

    // Notes section
    if (data.additionalRequirements) {
      content += '\n' + this.printLine('-', width) + '\n';
      content += 'Napomene:\n';
      content += this.wrapText(data.additionalRequirements, Math.floor(width * 0.85)) + '\n';
      content += this.COMMANDS.FEED_LINES(2);
    }

    // Reset height for footer
    content += this.COMMANDS.NORMAL_SIZE;

    // Footer
    if (options.includeFooter !== false) {
      content += '\n' + this.printLine('=', width) + '\n';
      content += this.COMMANDS.CENTER_ALIGN;
      // Make footer slightly larger for readability
      content += this.COMMANDS.DOUBLE_HEIGHT;
      content += this.centerText('Hvala na rezervaciji!', width) + '\n';
      content += this.centerText('Radujemo se vasoj poseti.', width) + '\n';
      content += this.COMMANDS.NORMAL_SIZE;
      
      // Print timestamp
      const now = new Date();
      const timestamp = now.toLocaleString('sr-RS', {
        timeZone: 'Europe/Belgrade',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      content += '\n' + this.centerText(`Stampano: ${timestamp}`, width) + '\n';
      content += this.COMMANDS.FEED_LINES(2);
    }

    // Final formatting
    content += '\n\n';
    content += this.COMMANDS.CUT_PAPER;
    // Turn off bold at the very end
    content += this.COMMANDS.BOLD_OFF;
    
    return content;
  }

  /**
   * Send formatted content directly to POS printer
   */
  static async printReservation(data: ReservationPrintData, options: PrintOptions = {}): Promise<void> {
    try {
      // Ensure default printer looks like POS; otherwise let caller fallback
      let printerName = '';
      try {
        // Preferred printer from settings takes priority
        const preferred = loadFromStorage<string>('posPrinterName', '');
        if (preferred) {
          printerName = preferred;
        } else {
          printerName = await invoke<string>('get_default_printer');
        }
        console.log('🖨️ Using printer:', printerName || '(system default)');
      } catch (e) {
        // Not in Tauri or command unavailable
        throw new Error('Direct POS print not available');
      }

      if (!printerName || !this.isLikelyPosPrinterName(printerName)) {
        throw new Error('Selected/default printer is not a POS/thermal printer');
      }

      const formattedContent = await this.formatReservationReceipt(data, options);
      console.log('🖨️ Sending to POS printer:', {
        printer: printerName,
        restaurant: data.restaurantName,
        guest: data.guestName,
        contentLength: formattedContent.length
      });

      const result = await invoke<string>('print_to_pos', { 
        content: formattedContent,
        printerName: printerName
      });
      console.log('✅ Print successful:', result);
    } catch (error) {
      console.error('❌ Print failed (POS route):', error);
      throw error;
    }
  }

  // Helper methods for formatting
  private static centerText(text: string, width: number): string {
    const innerWidth = Math.max(1, width - this.LEFT_MARGIN_SPACES);
    const trimmed = text.length > innerWidth ? text.substring(0, innerWidth) : text;
    const padding = Math.floor((innerWidth - trimmed.length) / 2);
    return ' '.repeat(this.LEFT_MARGIN_SPACES + padding) + trimmed;
  }

  private static printLine(char: string, width: number): string {
    const innerWidth = Math.max(1, width - this.LEFT_MARGIN_SPACES);
    return ' '.repeat(this.LEFT_MARGIN_SPACES) + char.repeat(innerWidth);
  }

  private static formatDetailLine(label: string, value: string, width: number): string {
    const innerWidth = Math.max(8, width - this.LEFT_MARGIN_SPACES);
    const maxValueLength = innerWidth - label.length - 1;
    const truncatedValue = value.length > maxValueLength 
      ? value.substring(0, maxValueLength) 
      : value;
    
    const padding = innerWidth - label.length - truncatedValue.length;
    return ' '.repeat(this.LEFT_MARGIN_SPACES) + label + ' '.repeat(Math.max(1, padding)) + truncatedValue + '\n';
  }

  private static wrapText(text: string, width: number): string {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + word).length <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word.length <= width ? word : word.substring(0, width);
      }
    }
    
    if (currentLine) lines.push(currentLine);
    return lines.join('\n');
  }

  private static formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  private static formatTime(timeString: string): string {
    const [hour, minute] = timeString.split(':');
    return `${hour}:${minute}h`;
  }
}

export default DirectPrintService; 