// Функция для создания многострочного текста в SVG
export const createMultilineText = (svg, text, x, y, maxWidth, fontSize = 14, fill = '#fff', fontWeight = 'bold') => {
  const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  textElement.setAttribute('x', x)
  textElement.setAttribute('y', y)
  textElement.setAttribute('text-anchor', 'middle')
  textElement.setAttribute('dominant-baseline', 'middle')
  textElement.setAttribute('fill', fill)
  textElement.setAttribute('font-size', fontSize)
  textElement.setAttribute('font-weight', fontWeight)
  textElement.setAttribute('pointer-events', 'none')
  
  // Примерная ширина символа (приблизительно)
  const charWidth = fontSize * 0.6
  const maxCharsPerLine = Math.floor(maxWidth / charWidth)
  
  // Разбиваем текст на слова
  const words = text.split(' ')
  const lines = []
  let currentLine = ''
  
  words.forEach(word => {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (testLine.length <= maxCharsPerLine) {
      currentLine = testLine
    } else {
      if (currentLine) {
        lines.push(currentLine)
      }
      // Если одно слово длиннее максимальной ширины, разбиваем его
      if (word.length > maxCharsPerLine) {
        for (let i = 0; i < word.length; i += maxCharsPerLine) {
          lines.push(word.substring(i, i + maxCharsPerLine))
        }
        currentLine = ''
      } else {
        currentLine = word
      }
    }
  })
  
  if (currentLine) {
    lines.push(currentLine)
  }
  
  // Если текст влезает в одну строку, используем обычный textContent
  if (lines.length === 1) {
    textElement.textContent = lines[0]
    svg.appendChild(textElement)
    return textElement
  }
  
  // Создаем несколько строк с tspan
  lines.forEach((line, index) => {
    const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan')
    tspan.setAttribute('x', x)
    tspan.setAttribute('dy', index === 0 ? '0' : `${fontSize * 1.2}`)
    tspan.textContent = line
    textElement.appendChild(tspan)
  })
  
  svg.appendChild(textElement)
  return textElement
}

// Функция для выравнивания по сетке (шаг сетки 10px)
export const snapToGrid = (value) => {
  return Math.round(value / 10) * 10
}
