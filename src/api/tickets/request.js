import { axios } from '../axios'
import { fetchTicketsFromSupabase } from './request_supabase'
import jsPDF from 'jspdf'
import html2pdf from 'html2pdf.js'

export async function fetchTickets(params) {
  try {
    return await fetchTicketsFromSupabase(params)
  } catch (error) {
    console.error('Error fetching tickets from Supabase, falling back to old API:', error)
  const [response, response2] = await Promise.all([
    axios.post('/trip/get', params),
    axios.post('/schedule/ticket/select', { sc_id: params.filter, code_qr: true })
  ])
  return { old: response.data?.data, new: response2.data?.data }
  }
}

export async function fetchTicketsPaymentData(tickets = []) {
  const ids = tickets
    .map(item => item.sold_info?.buy_id)
    .filter((item, i, arr) => Boolean(item) && arr.indexOf(item) === i)
  
  if (!ids.length) return { data: [] }
  const response = await axios.post(`/drive/get/${ids.join(',')}`)
  return response.data
}

export async function createTickets(params) {
  const response = await axios.post('/trip', params)
  return response.data
}

export async function editTickets(t_id, params) {
  const response = await axios.post(`/trip/get/${t_id}/ticket/edit`, params)
  return response.data
}

export async function getTicketPdf(params) {
  if (params.ticketData) {
    return await generateTicketPdfFromSupabase(params.ticketData, params.pdfTemplate)
  }
  
  try {
  const response = await axios.post(
    `trip/get/${params.t_id}/ticket/read/`, {
      seat: params.seat,
      pdf: true
    },
    {
      responseType: 'blob'
    }
  )
  return response.data
  } catch (error) {
    console.error('Error fetching PDF from old API:', error)
    throw error
  }
}

async function generateTicketPdfFromSupabase(ticketData, pdfTemplate) {
  const { qrBase64 } = await import('../../utils/utils')
  
  let qrCodeBase64 = ticketData.code_qr_base64 || ticketData.code_qr || ''
  
  if (!qrCodeBase64 && ticketData.code) {
    try {
      console.warn('⚠️ QR код отсутствует в БД, генерируем из кода:', ticketData.code)
      qrCodeBase64 = await qrBase64(ticketData.code)
      console.log('✅ QR код сгенерирован')
    } catch (error) {
      console.error('❌ Error generating QR code:', error)
    }
  }
  
  let format = 'a4'
  let margins = [3, 3, 3, 3]
  
  if (pdfTemplate && pdfTemplate.trim()) {
    pdfTemplate.replace(/<!--format:([^>]+)-->/i, (match, formatStr) => {
      const formatParts = formatStr.trim().split(/\s*,\s*/)
      if (formatParts.length === 2) {
        format = [parseFloat(formatParts[0]), parseFloat(formatParts[1])]
      } else {
        format = formatParts[0]
      }
      return ''
    })
    
    pdfTemplate.replace(/<!--margins:([^>]+)-->/i, (match, marginsStr) => {
      const marginsParts = marginsStr.trim().split(/\s*,\s*/).map(m => parseFloat(m))
      if (marginsParts.length === 1) {
        margins = [marginsParts[0], marginsParts[0], marginsParts[0], marginsParts[0]]
      } else if (marginsParts.length === 2) {
        margins = [marginsParts[0], marginsParts[1], marginsParts[0], marginsParts[1]]
      } else if (marginsParts.length === 3) {
        margins = [marginsParts[0], marginsParts[1], marginsParts[2], marginsParts[1]]
      } else {
        margins = marginsParts
      }
      return ''
    })
  }
  
  if (pdfTemplate && pdfTemplate.trim()) {
    try {
      const schedule = ticketData.schedule || {}
      const team1Name = schedule.team1?.name_en || schedule.team1_table?.name_en || ''
      const team2Name = schedule.team2?.name_en || schedule.team2_table?.name_en || ''
      const eventName = (team1Name && team2Name) 
        ? `${team1Name} vs ${team2Name}` 
        : schedule.name || schedule.title || 'Event'
      
      const eventDate = schedule.start_datetime 
        ? (() => {
            const date = new Date(schedule.start_datetime)
            const year = date.getUTCFullYear()
            const month = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })
            const day = date.getUTCDate()
            const hours = date.getUTCHours()
            const minutes = date.getUTCMinutes()
            const ampm = hours >= 12 ? 'PM' : 'AM'
            const hours12 = hours % 12 || 12
            const minutesStr = minutes.toString().padStart(2, '0')
            return `${month} ${day}, ${year} at ${hours12}:${minutesStr} ${ampm}`
          })()
        : ''
      
      const section = String(ticketData.section || ticketData.block || '')
      const row = String(ticketData.row || '')
      const seat = String(ticketData.seat || '')
      const code = String(ticketData.code || '')
      const price = String(ticketData.tariff || ticketData.price || 0)
      const currency = String(ticketData.currency || 'USD')
      
      let htmlContent = pdfTemplate
        .replace(/\{event_name\}/g, eventName)
        .replace(/\{event_date\}/g, eventDate)
        .replace(/\{code\}/g, code)
        .replace(/\{section\}/g, section)
        .replace(/\{row\}/g, row)
        .replace(/\{seat\}/g, seat)
        .replace(/\{price\}/g, price)
        .replace(/\{currency\}/g, currency)
        .replace(/\{\$ticket\}\{\*,trips,\*,seats,\*,code_qr_base64;val\}/g, qrCodeBase64 || '')
        .replace(/\{\$ticket\}\{\*,schedule,\*,str\}/g, eventName ? `${eventName}, ${eventDate}` : eventDate)
        .replace(/\{\$ticket\}\{\*,trips,\*,seats,\*,block;val\}/g, section)
        .replace(/\{\$ticket\}\{\*,trips,\*,seats,\*,row;val\}/g, row)
        .replace(/\{\$ticket\}\{\*,trips,\*,seats,\*,seat;val\}/g, seat)
        .replace(/\{\$ticket\}\{\*,trips,\*,seats,\*,code;val\}/g, code)
        .replace(/\{\$ticket\}\{\*,trips,\*,seats,\*,price;val\}/g, price)
      
      if (qrCodeBase64) {
        htmlContent = htmlContent.replace(/src="\{[^}]+\}"/g, `src="${qrCodeBase64}"`)
        htmlContent = htmlContent.replace(/src='\{[^}]+\}'/g, `src='${qrCodeBase64}'`)
      }
      
      htmlContent = htmlContent.replace(/>Event</gi, `>${eventName}<`)

      htmlContent = htmlContent.replace(/(row[^>]*>)\s*NONE\s*(<\/td>)/gi, `$1${row}$2`)
      htmlContent = htmlContent.replace(/(seat[^>]*>)\s*NONE\s*(<\/td>)/gi, `$1${seat}$2`)
      
      let parsedFormat = format
      htmlContent = htmlContent.replace(/<!--format:([^>]+)-->/i, (match, formatStr) => {
        const formatParts = formatStr.trim().split(/\s*,\s*/)
        if (formatParts.length === 2) {
          parsedFormat = [parseFloat(formatParts[0]), parseFloat(formatParts[1])]
        } else {
          parsedFormat = formatParts[0]
        }
        return '' 
      })
      
      htmlContent = htmlContent.replace(/<!--margins:([^>]+)-->/i, (match, marginsStr) => {
        const marginsParts = marginsStr.trim().split(/\s*,\s*/).map(m => parseFloat(m))
        if (marginsParts.length === 1) {
          margins = [marginsParts[0], marginsParts[0], marginsParts[0], marginsParts[0]]
        } else if (marginsParts.length === 2) {
          margins = [marginsParts[0], marginsParts[1], marginsParts[0], marginsParts[1]]
        } else if (marginsParts.length === 3) {
          margins = [marginsParts[0], marginsParts[1], marginsParts[2], marginsParts[1]]
        } else {
          margins = marginsParts
        }
        return '' 
      })
      
      htmlContent = htmlContent.replace(/<page>/gi, '<div class="pdf-page">')
      htmlContent = htmlContent.replace(/<\/page>/gi, '</div>')
      
      htmlContent = htmlContent.replace(/\{\$ticket;foreach;[\s\S]*?\}/gi, '')
      htmlContent = htmlContent.replace(/\{\$this_seat;foreach;[\s\S]*?\}/gi, '')
      htmlContent = htmlContent.replace(/\{\$this_seat\}\{[\s\S]*?\}/gi, '')

      htmlContent = htmlContent.replace(/\{\$ticket\}\{[^}]*trips[^}]*\}/gi, '')
      htmlContent = htmlContent.replace(/,\s*trips,\s*/gi, '')
      htmlContent = htmlContent.replace(/,\s*seats,\s*/gi, '')

      htmlContent = htmlContent.replace(/\{sc_id_i;val\}/gi, '')
      htmlContent = htmlContent.replace(/\{t_id_i;val\}/gi, '')
      htmlContent = htmlContent.replace(/\{seat_i;val\}/gi, '')

      htmlContent = htmlContent.replace(/\{\$ticket\}[\s\S]*?\{[^}]*;val\}[^}]*\}/gi, '')

      htmlContent = htmlContent.replace(/\n\s*\n\s*\n/g, '\n\n')
      

      htmlContent = htmlContent.replace(/[`]{2,}/g, '')

      htmlContent = htmlContent.replace(/[`;{}\\]{3,}/g, '')

      htmlContent = htmlContent.replace(/^\s*[`;{}\\]+\s*/gm, '')

      htmlContent = htmlContent.replace(/\s*[`;{}\\]+\s*$/gm, '')

      htmlContent = htmlContent.replace(/^[^<]*[`;{}\\]+\s*/m, '')

      htmlContent = htmlContent.replace(/>\s*[`;{}\\]+\s*</g, '><')
      
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = htmlContent
      document.body.appendChild(tempDiv)
      
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const images = tempDiv.querySelectorAll('img')
      if (images.length > 0) {
        await new Promise((resolve) => {
          let loaded = 0
          const total = images.length
          images.forEach((img) => {
            if (img.complete && img.naturalWidth > 0) {
              loaded++
            } else {
              img.onload = () => loaded++
              img.onerror = () => loaded++
            }
          })
          const checkComplete = () => {
            if (loaded >= total) resolve()
            else setTimeout(checkComplete, 100)
          }
          checkComplete()
        })
      }
      
      const opt = {
        margin: margins,
        filename: `ticket_${ticketData.code || 'ticket'}.pdf`,
        image: { type: 'png', quality: 1.0 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          backgroundColor: '#ffffff'
        },
        jsPDF: { 
          unit: 'mm', 
          format: parsedFormat, 
          orientation: 'portrait'
        }
      }
      
      const pdfBlob = await html2pdf().set(opt).from(tempDiv).outputPdf('blob')
      
      document.body.removeChild(tempDiv)
      
      return pdfBlob
      
    } catch (error) {
      console.error('❌ Ошибка генерации PDF из HTML шаблона:', error)
      console.warn('⚠️ Переключение на fallback генерацию через jsPDF...')
    }
  }
  
  console.log('🔄 Генерация PDF через jsPDF (fallback)...')
  
  let qrCodeData = qrCodeBase64
  if (qrCodeBase64 && qrCodeBase64.startsWith('data:image')) {
    qrCodeData = qrCodeBase64.split(',')[1] || qrCodeBase64
  }
  
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })
    
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    let yPos = margin + 15
    
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('Event Ticket', pageWidth / 2, yPos, { align: 'center' })
    yPos += 30
    
    const section = String(ticketData.section || '')
    const row = String(ticketData.row || '')
    const seat = String(ticketData.seat || '')
    const price = String(ticketData.tariff || ticketData.price || 0)
    const currency = String(ticketData.currency || 'USD')
    const code = String(ticketData.code || '')
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    
    doc.setFont('helvetica', 'bold')
    doc.text('Section:', margin, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(section, margin + 35, yPos)
    yPos += 10
    
    doc.setFont('helvetica', 'bold')
    doc.text('Row:', margin, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(row, margin + 35, yPos)
    yPos += 10
    
    doc.setFont('helvetica', 'bold')
    doc.text('Seat:', margin, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(seat, margin + 35, yPos)
    yPos += 10
    
    doc.setFont('helvetica', 'bold')
    doc.text('Price:', margin, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(`${price} ${currency}`, margin + 35, yPos)
    yPos += 10
    
    if (code) {
      doc.setFont('helvetica', 'bold')
      doc.text('Ticket Code:', margin, yPos)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(code, margin + 35, yPos)
      doc.setFontSize(14)
      yPos += 10
    }
    
    if (qrCodeData) {
      try {
        const qrSize = 50
        const qrX = (pageWidth - qrSize) / 2
        const qrY = yPos + 20
        doc.addImage(qrCodeData, 'PNG', qrX, qrY, qrSize, qrSize)
      } catch (error) {
        console.error('❌ Ошибка добавления QR кода:', error)
      }
    }
    
    const pdfBlob = doc.output('blob')
    console.log('✅ PDF успешно сгенерирован через jsPDF, размер:', pdfBlob.size, 'bytes')
    return pdfBlob
    
  } catch (error) {
    console.error('❌ Error generating PDF:', error)
    throw new Error(`Ошибка при генерации PDF: ${error.message}`)
  }
}

