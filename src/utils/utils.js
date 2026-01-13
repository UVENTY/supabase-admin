import { map, uniq, orderBy } from 'lodash'
import QRCode from 'qrcode'
import { EMPTY_FUNC } from '../consts'

export const capitalizeFirstLetter = str => {
  return str[0].toUpperCase() + str.substr(1)
}

export const getFileExt = (fileName, withDot = false) => {
  if (!fileName || typeof fileName !== 'string') return ''
  const parts = fileName.split('.')
  const ext = parts[parts.length - 1]
  return withDot ? `.${ext}` : ext
}

export const toBase64 = file => new Promise((resolve, reject) => {
  const filename = (file.name || '').split('.').slice(0, -1).join('.')
  const fakeJson = new File([file], `${filename}.json`, {
    type: 'application/json',
    lastModified: new Date(),
  })
  const reader = new FileReader()
  reader.readAsDataURL(fakeJson)
  reader.onload = () => resolve(reader.result)
  reader.onerror = reject
})

export const toText = file => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.addEventListener('load', () => resolve(reader.result), false)
  reader.addEventListener('error', reject, false)
  reader.readAsText(file)
})

export const localeCompare = (str1, str2) => (str1 || '').localeCompare(str2 || '')

export const getOptions = (arr, path) =>
  orderBy(uniq(map(arr, path))).filter(item => item)

export const toOptions = (arr, keys, sorter = (a, b) => localeCompare(a.label, b.label)) => {
  const { label = 'en', value = 'id' } = keys || {}
  return Object.values(arr).map(item => ({ value: item[value], label: item[label] })).sort(sorter)
}
  

export const getValidSvg = (src, type = 'image/svg+xml') => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(src, 'image/svg+xml')
  return doc.querySelector('parsererror') === null ? doc : null
}

export const renderHiddenHTML = code => {
  const el = document.createElement('div')
  el.innerHTML = code
  document.body.appendChild(el)
  return el.firstChild
}

export const setCurrentColor = (svg) => svg.replaceAll(/(fill|stroke)=["']([^none].*?)["']/g, '$1="currentColor"')

export const isMacintosh = () => navigator.platform.indexOf('Mac') > -1

export const requestTimeout = (fn, args, delay, registerCancel) => {
  const start = new Date().getTime()
  const loop = () => {
    const delta = new Date().getTime() - start
    if (delta >= delay) {
      fn(...args)
      registerCancel(EMPTY_FUNC)
      return
    }
    const raf = requestAnimationFrame(loop)
    registerCancel(() => cancelAnimationFrame(raf))
  }

  const raf = requestAnimationFrame(loop)
  registerCancel(() => cancelAnimationFrame(raf))
}

export const translit = word => {
	const converter = {
		'а': 'a',    'б': 'b',    'в': 'v',    'г': 'g',    'д': 'd',
		'е': 'e',    'ё': 'e',    'ж': 'zh',   'з': 'z',    'и': 'i',
		'й': 'y',    'к': 'k',    'л': 'l',    'м': 'm',    'н': 'n',
		'о': 'o',    'п': 'p',    'р': 'r',    'с': 's',    'т': 't',
		'у': 'u',    'ф': 'f',    'х': 'h',    'ц': 'c',    'ч': 'ch',
		'ш': 'sh',   'щ': 'sch',  'ь': '',     'ы': 'y',    'ъ': '',
		'э': 'e',    'ю': 'yu',   'я': 'ya'
	}
 
	word = word.toLowerCase()
  
	let answer = ''
	for (let i = 0; i < word.length; ++i ) {
		if (converter[word[i]] === undefined){
			answer += word[i]
		} else {
			answer += converter[word[i]]
		}
	}
 
	answer = answer.replace(/[^-0-9a-z]/g, '-')
	answer = answer.replace(/[-]+/g, '-')
	answer = answer.replace(/^-|-$/g, ''); 
	return answer
}

export const qrBase64 = async (encode) =>
  await new Promise((resolve, reject) => {
    QRCode.toDataURL(encode, function (err, code) {
      if (err) {
        reject(reject)
        return
      }
      resolve(code)
    })
  })

export const jsonBase64 = async (obj, filename = 'file.json') => {
  const content = JSON.stringify(obj)
  if (!content || content === '{}') Promise.resolve()
    const scheme_file = new File([content], 'scheme.json', {
    type: 'application/json',
  })
  return await (scheme_file ? toBase64(scheme_file) : Promise.resolve())
}

export const downloadBlob = (blob, filename) => {
  try {
    const downloadUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    URL.revokeObjectURL(a.href)
    document.body.removeChild(a)
  } catch (e) {
    console.error(e)
  }
}