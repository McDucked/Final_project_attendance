interface QRCodeData {
  lectureId: string;
  token: string;
  expiresAt: number;
  generatedAt: number;
}

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
  } catch (_error) {
    return { valid: false, error: 'Failed to parse QR code' };
  }
}

export function getRemainingTime(qrCodeString: string): number {
  try {
    const qrData: QRCodeData = JSON.parse(qrCodeString);
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((qrData.expiresAt - now) / 1000));
    return remaining;
  } catch (_error) {
    return 0;
  }
}