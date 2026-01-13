import { getValidSvg } from "../../utils/utils"

export const transformScheme = svg => {
  const doc = getValidSvg(svg)
  if (!doc) return null
  const seats = doc.querySelectorAll('*[class*="c-"]')
  Array.from(seats).forEach(el => {
    Array.from(el.classList).forEach(val => {
      const res = val.match(/^([c|r|p])-(.*)/)
      if (!res) return
      const [, key, value] = res
      const prop = { c: 'category', r: 'row', p: 'seat' }[key]
      el.setAttribute(`data-${prop}`, value)
      el.classList.remove(val)
    })
    el.classList.add('svg-seat')
  })
  return doc
}

export const getCategories = doc => {
  if (!doc) return null
  return Array.from(doc.querySelectorAll('.svg-seat')).reduce((acc, seat) => {
    const cat = seat.getAttribute('data-category')
    if (!acc.find(item => item.value === cat)) acc.push({ value: cat, label: cat, color: seat.getAttribute('fill'), icon: null })
    return acc
  }, [])
}

export const clearFillAndStringify = doc => {
  if (!doc) return
  Array.from(doc.querySelectorAll('.svg-seat')).forEach(el => {
    el.removeAttribute('fill')
  })
  const s = new XMLSerializer()
  return s.serializeToString(doc)
}