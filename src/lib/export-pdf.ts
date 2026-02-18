import html2canvas from 'html2canvas-pro'
import { jsPDF } from 'jspdf'

export async function exportReportPdf(elementId: string, title = 'Report Analytics') {
  const element = document.getElementById(elementId)
  if (!element) return

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  })

  const imgWidth = 297 // A4 landscape width in mm
  const pageHeight = 210 // A4 landscape height in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  const pdf = new jsPDF('l', 'mm', 'a4')

  // Header
  pdf.setFontSize(18)
  pdf.setTextColor(30, 30, 30)
  pdf.text(title, 14, 15)
  pdf.setFontSize(10)
  pdf.setTextColor(120, 120, 120)
  pdf.text(`Generato il ${new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}`, 14, 22)
  pdf.setDrawColor(200, 200, 200)
  pdf.line(14, 25, imgWidth - 14, 25)

  const startY = 30
  const availableHeight = pageHeight - startY - 10
  const imgData = canvas.toDataURL('image/png')

  if (imgHeight <= availableHeight) {
    pdf.addImage(imgData, 'PNG', 7, startY, imgWidth - 14, imgHeight)
  } else {
    // Multi-page
    let y = 0
    let page = 0
    const srcHeight = canvas.height
    const srcWidth = canvas.width
    const pageImgHeight = (availableHeight / imgWidth) * srcWidth

    while (y < srcHeight) {
      if (page > 0) {
        pdf.addPage()
      }
      const sliceHeight = Math.min(pageImgHeight, srcHeight - y)
      const sliceCanvas = document.createElement('canvas')
      sliceCanvas.width = srcWidth
      sliceCanvas.height = sliceHeight
      const ctx = sliceCanvas.getContext('2d')!
      ctx.drawImage(canvas, 0, y, srcWidth, sliceHeight, 0, 0, srcWidth, sliceHeight)

      const sliceData = sliceCanvas.toDataURL('image/png')
      const sliceRenderHeight = (sliceHeight * imgWidth) / srcWidth
      pdf.addImage(sliceData, 'PNG', 7, page === 0 ? startY : 10, imgWidth - 14, sliceRenderHeight)

      y += sliceHeight
      page++
    }
  }

  pdf.save(`${title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`)
}
