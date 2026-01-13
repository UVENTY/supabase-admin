import axios from 'axios'
import Cookies from 'universal-cookie'
import toFormData from './formData'
import { API_URL } from '../consts'

const instance = axios.create({
  baseURL: API_URL
})

instance.postWithAuth = function(url, params, options) {
  const cookies = new Cookies()
  const data = params || {}
  let formData = data
  if (data instanceof URLSearchParams) {
    formData.append('token', cookies.get('token'))
    formData.append('u_hash', cookies.get('u_hash'))
  } else {
    data.token = cookies.get('token')
    data.u_hash = cookies.get('u_hash')
    formData = toFormData(data)
  }
  return instance.post(url, formData, options)
}

export default instance