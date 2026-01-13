import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Ticket } from '../constants';
import { requestMediaLibraryPermissionWithAlert } from './permissions';

export interface PdfGenerationResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  savedToDownloads?: boolean;
  error?: string;
}

/**
 * Generate QR code URL from QR token
 */
export const getQrCodeUrl = (qrCode: string, ticketId: string): string => {
  if (qrCode) {
    const encodedToken = encodeURIComponent(qrCode);
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedToken}`;
  }
  // Fallback if no qrToken
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${ticketId}`;
};

/**
 * Generate HTML template for ticket PDF
 */
export const generateTicketHTML = (ticket: Ticket, qrCodeBase64: string): string => {
  const eventTitle = ticket.eventTitle || 'Event Ticket';
  const date = ticket.date || 'TBA';
  const location = ticket.location || 'TBA';

  // Use seat from ticket, or generate a default based on tier if not available
  const seat = ticket.seat || (() => {
    const tier = ticket.tier || 'General';
    const sectionMap: { [key: string]: string } = {
      'VIP': 'BLOCK A',
      'Premium': 'BLOCK B',
      'General': 'BLOCK C'
    };
    const section = sectionMap[tier] || 'BLOCK C';
    const ticketIdNum = parseInt(ticket.id.replace(/\D/g, '')) || 1;
    const rowNum = (ticketIdNum % 20) + 1;
    const seatNum = (ticketIdNum % 50) + 1;
    return `${section} / ROW ${rowNum} / SEAT ${seatNum}`;
  })();

  const ticketId = ticket.id || 'N/A';
  const qrToken = ticket.qrCode || 'N/A';
  const ticketTier = ticket.tier || 'General Entry Pass';

  // Calculate generation date
  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Event Ticket - Professional Template</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #f4f4f7;
            color: #2d3436;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }

        .ticket-wrapper {
            max-width: 850px;
            width: 100%;
            box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
        }

        .ticket {
            background: white;
            display: flex;
            border-radius: 16px;
            overflow: hidden;
            position: relative;
            background-image: 
                radial-gradient(circle at 0 50%, transparent 15px, white 15px),
                radial-gradient(circle at 100% 50%, transparent 15px, white 15px);
        }

        .ticket-main {
            flex: 3;
            padding: 40px;
            border-right: 2px dashed #dfe6e9;
            position: relative;
        }

        .ticket-stub {
            flex: 1.2;
            background: #fafafa;
            padding: 40px 30px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
        }

        .security-strip {
            position: absolute;
            top: 0;
            left: 0;
            width: 8px;
            height: 100%;
            background: linear-gradient(to bottom, #d4af37, #f1c40f, #d4af37);
        }

        .event-category {
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 3px;
            color: #d4af37;
            margin-bottom: 8px;
            display: block;
        }

        .event-title {
            font-size: 32px;
            font-weight: 900;
            line-height: 1.1;
            margin-bottom: 25px;
            color: #1a1a1a;
            text-transform: uppercase;
        }

        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 25px;
        }

        .info-item label {
            display: block;
            font-size: 11px;
            text-transform: uppercase;
            color: #636e72;
            font-weight: 700;
            letter-spacing: 1px;
            margin-bottom: 4px;
        }

        .info-item span {
            font-size: 16px;
            font-weight: 600;
            color: #1a1a1a;
        }

        .qr-container {
            background: white;
            padding: 10px;
            border: 1px solid #dfe6e9;
            border-radius: 12px;
            margin-bottom: 15px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }

        .qr-container img {
            width: 140px;
            height: 140px;
            display: block;
        }

        .stub-id {
            font-family: "Courier New", Courier, monospace;
            font-size: 13px;
            font-weight: bold;
            color: #636e72;
        }

        .ticket-id-large {
            margin-top: auto;
            font-family: "Courier New", Courier, monospace;
            font-size: 14px;
            color: #636e72;
            border-top: 1px solid #dfe6e9;
            padding-top: 20px;
        }

        @media print {
            body { 
                background: white !important; 
                padding: 0 !important; 
            }
            .ticket-wrapper { 
                box-shadow: none !important; 
                max-width: 100% !important; 
            }
            .ticket { 
                border: 1px solid #eee !important; 
                background: white !important; 
            }
            .ticket-stub { 
                background: white !important; 
            }
            @page { 
                margin: 1cm; 
            }
        }

        @media (max-width: 650px) {
            .ticket { 
                flex-direction: column; 
            }
            .ticket-main { 
                border-right: none; 
                border-bottom: 2px dashed #dfe6e9; 
            }
            .ticket-stub { 
                padding: 30px; 
            }
            .qr-container img { 
                width: 100px; 
                height: 100px; 
            }
        }
    </style>
</head>
<body>

    <div class="ticket-wrapper">
        <div class="ticket">
            <div class="security-strip"></div>

            <div class="ticket-main">
                <span class="event-category">Premium Admittance</span>
                <h1 class="event-title">${eventTitle}</h1>
                
                <div class="info-grid">
                    <div class="info-item">
                        <label>Date & Time</label>
                        <span>${date}</span>
                    </div>
                    <div class="info-item">
                        <label>Venue Location</label>
                        <span>${location}</span>
                    </div>
                    <div class="info-item">
                        <label>Assigned Seat</label>
                        <span>${seat}</span>
                    </div>
                    <div class="info-item">
                        <label>Ticket Type</label>
                        <span>${ticketTier}</span>
                    </div>
                </div>

                <div class="ticket-id-large">
                    IDENTIFIER: <span style="color: #000;">${ticketId}</span>
                </div>
            </div>

            <div class="ticket-stub">
                <div class="qr-container">
                    <img src="data:image/png;base64,${qrCodeBase64}" alt="Verification QR">
                </div>
                <div class="info-item" style="margin-bottom: 10px;">
                    <label>Entry Token</label>
                    <span class="stub-id">${qrToken}</span>
                </div>
                <div style="font-size: 10px; color: #aaa; text-transform: uppercase; font-weight: bold;">
                    Scan at Entrance
                </div>
            </div>
        </div>

        <div style="margin-top: 20px; text-align: center; color: #636e72; font-size: 12px;">
            <p>Please present this digital or printed pass upon arrival. Photo ID may be required.</p>
            <p style="margin-top: 5px;">Generated on: ${generatedDate}</p>
        </div>
    </div>

</body>
</html>
  `;
};

/**
 * Generate ticket PDF and save to device
 * @param ticket - Ticket object with all required information
 * @param options - Options for PDF generation (directDownload, share)
 * @returns Promise with PDF generation result
 */
export const generateTicketPDF = async (
  ticket: Ticket,
  options: { directDownload?: boolean; share?: boolean } = {}
): Promise<PdfGenerationResult> => {
  if (!ticket.qrCode) {
    return {
      success: false,
      error: 'QR code is not available for this ticket.',
    };
  }

  try {
    const qrCodeUrl = getQrCodeUrl(ticket.qrCode, ticket.id);

    // Request media library permission for iOS direct download to gallery
    let hasPermission = false;
    if (options.directDownload && Platform.OS === 'ios') {
      // Request permission for iOS when saving to gallery
      hasPermission = await requestMediaLibraryPermissionWithAlert();
      // If permission denied, PDF will still be saved to app directory
    } else if (Platform.OS === 'ios' && !options.share) {
      // For iOS share/download, we try to get media library permission
      hasPermission = await requestMediaLibraryPermissionWithAlert();
      // If permission denied on iOS, PDF will still be saved to app directory
    }

    // Step 1: Download QR code image and convert to base64
    const sanitizedId = ticket.id.replace(/[^a-zA-Z0-9]/g, '_');
    const tempQrFileUri = FileSystem.documentDirectory + `temp_qr_${sanitizedId}.png`;



    const qrDownloadResult = await FileSystem.downloadAsync(qrCodeUrl, tempQrFileUri);

    if (qrDownloadResult.status !== 200) {
      throw new Error(`Failed to download QR code. Status: ${qrDownloadResult.status}`);
    }

    // Read QR code image as base64
    const qrBase64 = await FileSystem.readAsStringAsync(tempQrFileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Step 2: Generate HTML template with ticket details and QR code
    const htmlContent = generateTicketHTML(ticket, qrBase64);

    // Step 3: Generate PDF from HTML
    const { uri: pdfUri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    // Step 4: Create final PDF filename
    const timestamp = new Date().getTime();
    const sanitizedToken = ticket.qrCode.substring(0, 8).replace(/[^a-zA-Z0-9]/g, '_');
    const pdfFileName = `ticket_${sanitizedId}_${sanitizedToken}_${timestamp}.pdf`;
    const finalPdfUri = FileSystem.documentDirectory + pdfFileName;

    // Move PDF to final location
    await FileSystem.moveAsync({
      from: pdfUri,
      to: finalPdfUri,
    });

    // Step 5: Save PDF to Gallery or share
    let savedToDownloads = false;

    if (options.share) {
      // Share the PDF (opens share dialog)
      try {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(finalPdfUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Share Ticket PDF',
            UTI: 'com.adobe.pdf',
          });
          savedToDownloads = true;
        } else {
          throw new Error('Sharing is not available on this device');
        }
      } catch (shareError: any) {
        // Clean up temporary QR code file before returning error
        try {
          await FileSystem.deleteAsync(tempQrFileUri, { idempotent: true });
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        // Return error so caller can handle it
        return {
          success: false,
          filePath: finalPdfUri,
          fileName: pdfFileName,
          error: shareError?.message || 'Failed to share PDF. Please try again.',
        };
      }
    } else if (options.directDownload) {
      // Direct download to Downloads/Gallery (no share dialog)
      if (Platform.OS === 'android') {
        // On Android, use Sharing API with intent to save directly to Downloads
        // This is the most reliable way to save PDFs to Downloads on Android
        try {
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            // Share with intent to save - user can quickly select "Save to Downloads"
            // On most Android devices, this will show Downloads as the first option
            await Sharing.shareAsync(finalPdfUri, {
              mimeType: 'application/pdf',
              dialogTitle: 'Save Ticket PDF',
              UTI: 'com.adobe.pdf',
            });
            savedToDownloads = true;
          } else {
            // If sharing not available, PDF is in document directory
            savedToDownloads = false;
          }
        } catch (shareError: any) {
          // PDF is still in document directory
          savedToDownloads = false;
        }
      } else if (Platform.OS === 'ios' && hasPermission) {
        // On iOS, save to MediaLibrary which appears in Files app
        try {
          const asset = await MediaLibrary.createAssetAsync(finalPdfUri);

          // Try to create album for tickets or add to existing
          try {
            await MediaLibrary.createAlbumAsync('Ticket PDFs', asset, false);
          } catch (albumError: any) {
            // Album might already exist, try to add to existing album
            const albums = await MediaLibrary.getAlbumsAsync();
            const ticketAlbum = albums.find(album => album.title === 'Ticket PDFs');
            if (ticketAlbum) {
              await MediaLibrary.addAssetsToAlbumAsync([asset], ticketAlbum, false);
            } else {
              // Try Downloads album
              const downloadsAlbum = albums.find(album => album.title === 'Downloads');
              if (downloadsAlbum) {
                await MediaLibrary.addAssetsToAlbumAsync([asset], downloadsAlbum, false);
              }
            }
          }
          savedToDownloads = true;
        } catch (saveError: any) {
        }
      }
    }

    // Clean up temporary QR code file
    try {
      await FileSystem.deleteAsync(tempQrFileUri, { idempotent: true });
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    return {
      success: true,
      filePath: finalPdfUri,
      fileName: pdfFileName,
      savedToDownloads,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to generate ticket PDF. Please check your internet connection and try again.',
    };
  }
};

