import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { createHash } from 'crypto'

export async function addSignatureStamp(
  pdfBytes: Uint8Array,
  signerName: string,
  signedAt: Date,
  ipAddress: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Generate SHA-256 hash of the original PDF
  const pdfHash = createHash('sha256').update(pdfBytes).digest('hex').substring(0, 16).toUpperCase()

  const dateStr = signedAt.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const pages = pdfDoc.getPages()
  const lastPage = pages[pages.length - 1]
  const { width } = lastPage.getSize()

  // Stamp dimensions
  const stampW = 280
  const stampH = 72
  const stampX = width - stampW - 30
  const stampY = 30

  // Draw border
  lastPage.drawRectangle({
    x: stampX,
    y: stampY,
    width: stampW,
    height: stampH,
    borderColor: rgb(0.2, 0.4, 0.7),
    borderWidth: 1.5,
    color: rgb(0.96, 0.97, 1),
  })

  // Title
  lastPage.drawText('DOCUMENTO FIRMATO DIGITALMENTE', {
    x: stampX + 10,
    y: stampY + stampH - 16,
    size: 7.5,
    font: helveticaBold,
    color: rgb(0.2, 0.4, 0.7),
  })

  // Signer name
  lastPage.drawText(`Firmatario: ${signerName}`, {
    x: stampX + 10,
    y: stampY + stampH - 30,
    size: 7,
    font: helvetica,
    color: rgb(0.2, 0.2, 0.2),
  })

  // Date
  lastPage.drawText(`Data: ${dateStr}`, {
    x: stampX + 10,
    y: stampY + stampH - 42,
    size: 7,
    font: helvetica,
    color: rgb(0.2, 0.2, 0.2),
  })

  // Hash
  lastPage.drawText(`Hash SHA-256: ${pdfHash}`, {
    x: stampX + 10,
    y: stampY + stampH - 54,
    size: 6.5,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  })

  // IP address
  lastPage.drawText(`IP: ${ipAddress}`, {
    x: stampX + 10,
    y: stampY + stampH - 64,
    size: 6.5,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  })

  return pdfDoc.save()
}
