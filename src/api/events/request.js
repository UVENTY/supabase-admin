import { axios } from '../axios'

export async function fetchTickets(params) {
  const response = await axios.post('/trip/get', { params })
  return response.data?.data
}

export async function createTickets(params) {
  const response = await axios.post('/trip', params)
  return response.data
}