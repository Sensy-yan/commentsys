import QRCode from 'qrcode';

export async function generateQrSvg(url: string): Promise<string> {
  return await QRCode.toString(url, {
    type: 'svg',
    width: 512,
    margin: 2,
    errorCorrectionLevel: 'M',
  });
}
