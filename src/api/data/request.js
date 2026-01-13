import { getAllData } from '../../supabase/data'
import axios from '../../utils/axios'

export async function fetchData(params = {}) {
  try {
    const result = await getAllData()
    const { data, error } = result

    if (error) {
      console.error('❌ Supabase fetch data error:', error)
      console.error('❌ Error details:', JSON.stringify(error, null, 2))

      throw new Error(`Supabase error: ${error.message || JSON.stringify(error)}`)
    }

    const response = {
      data,
      default_lang: 'en' 
    }
    
    return response
  } catch (error) {
    console.error('❌ Fetch data exception:', error)
    throw error
  }
}

export async function updateData(params) {
  try {
    console.warn('⚠️ updateData не реализован для Supabase, возвращаем заглушку')
    return { code: '200', data: params }
  } catch (error) {
    console.error('Update data error:', error)
    throw error
  }
}
