interface QRCodeData {
  lectureId: string;
  token: string;
  expiresAt: number;
  generatedAt: number;
}

/**
 * Generate a time-limited QR code for a lecture
 * @param lectureId - The lecture ID from Firestore
 * @param durationSeconds - How long the QR code is valid (default: 60 seconds)
 * @returns JSON string to be encoded in QR code
 */

export function generateTimeLimitedQR(
  lectureId: string, 
  durationSeconds: number = 60
): string {
  const now = Date.now();
  
  // Generate random token using
  const token = Math.random().toString(36).substring(2, 15) + 
                Math.random().toString(36).substring(2, 15);
  
  const qrData: QRCodeData = {
    lectureId,
    token,
    expiresAt: now + (durationSeconds * 1000),
    generatedAt: now
  };

  return JSON.stringify(qrData);
}

/**
 * Verify if QR code is still valid
 * @param qrCodeString - The scanned QR code string
 * @returns Object with validity status and data
 */
export function verifyQRCode(qrCodeString: string): {
  valid: boolean;
  data?: QRCodeData;
  error?: string;
} {
  try {
    const qrData: QRCodeData = JSON.parse(qrCodeString);
    
    if (!qrData.lectureId || !qrData.token || !qrData.expiresAt) {
      return { valid: false, error: 'Invalid QR code format' };
    }

    const now = Date.now();
    if (now > qrData.expiresAt) {
      return { valid: false, error: 'QR code expired' };
    }

    return { valid: true, data: qrData };
  } catch (error) {
    return { valid: false, error: 'Failed to parse QR code' };
  }
}

/**
 * Get remaining time in seconds for a QR code
 * @param qrCodeString - The QR code string
 * @returns Remaining seconds or 0 if expired
 */
export function getRemainingTime(qrCodeString: string): number {
  try {
    const qrData: QRCodeData = JSON.parse(qrCodeString);
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((qrData.expiresAt - now) / 1000));
    return remaining;
  } catch {
    return 0;
  }
}