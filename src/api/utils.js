export function getFormData(data, formData = new FormData(), parentKey) {
  if (Array.isArray(data)) {
    data.forEach((item, index) => {
      getFormData(item, formData, `${parentKey}[${index}]`)
    })
  } else if (data && typeof data === 'object' && !(data instanceof Date) && !(data instanceof File) && !(data instanceof Blob)) {
    Object.keys(data).forEach(key => {
      getFormData(data[key], formData, parentKey ? `${parentKey}[${key}]` : key);
    });
  } else if (parentKey) {
    let value = data === null ? '' : data
    if (value instanceof Date) {
      value = value.toString()
    }
    formData.append(parentKey, value)
  }
  return formData
}

export const renameKeys = (keysMap, obj, skipOtherKeys) =>
  Object.keys(obj).reduce(
    (acc, key) => {
      if (skipOtherKeys && !keysMap[key]) return acc
      return {
        ...acc,
        ...{ [keysMap[key] || key]: obj[key] }
      }
    },
    {}
  )

export const pipe = (...fns) => x => fns.filter(f => typeof f === 'function').reduce((v, f) => typeof f === 'function' ? f(v) : v, x)

export const order = sorter => data => sorter ? data.sort((a, b) => {
  const type = typeof sorter
  switch (type) {
    case 'function':
      return sorter(a, b)
    case 'string':
      const isNumber = typeof a[sorter] === 'number' && typeof b[sorter] === 'number'
      return isNumber ? a - b : a[sorter]?.localeCompare(b[sorter])

    default:
      return 0
  }
}) : data

export const filter = cond => data => cond ? data.filter(item => {
  const type = typeof cond
  switch (type) {
    case 'function':
      return cond(item)
    case 'object':
      return Object.entries(cond).every(([key, value]) => item[key] === value)
    default:
      return true
  }
}) : data

export const group = grouper => data => grouper ? data.reduce((acc, item) => {
  const key = typeof grouper === 'function' ? grouper(item) : item[grouper]
  if (!acc[key]) {
    acc[key] = []
  }
  acc[key].push(item)
  return acc
}, {}) : data
