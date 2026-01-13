export default function toFormData(params) {
  const data = new FormData()
  Object.keys(params).forEach(key => {
    data.append(key, params[key])
  })
  return data
}