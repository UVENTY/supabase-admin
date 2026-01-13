import { mapValues } from 'lodash'
import {
  setLoading,
  setLoaded,
  setSubmitting,
  updateData,
  setData,
  setStadiumScheme,
  setStadiumSchemeStatus,
  setNotifications,
  setFetchingNotifications
} from '.'
import { getAllData, getStadiums } from '../../supabase/data'

export const fetchData = (params = { fields: 'F', easy: true }) => async (dispatch) => {
  dispatch(setLoading(true))
  try {
    const { data, error } = await getAllData()
    
    if (error) {
      console.error('❌ Supabase fetch data error:', error)
      console.error('❌ Error details:', JSON.stringify(error, null, 2))
      throw new Error(`Supabase error: ${error.message || JSON.stringify(error)}`)
    } else {
      const schedule = mapValues(data?.schedule || {}, item => {
        if (!item.datetime && !item.start_datetime) return item
        const datetime = item.datetime || item.start_datetime
        return {
          ...item,
          datetime: datetime.split('+')[0]
        }
      })
      
      dispatch(setData({ 
        ...data, 
        schedule,
        default_lang: 'en'
      }))
    }
  } catch(e) {
    console.error('Fetch data exception:', e)
  } finally {
    dispatch(setLoaded(true))
    dispatch(setLoading(false))
  }
}

export const postData = params => async (dispatch) => {
  dispatch(setSubmitting(true))
  try {
    console.warn('⚠️ postData не реализован для Supabase, обновляем только локальный state')
    dispatch(updateData(params))
    return { code: '200', data: params }
  } catch(e) {
    console.error('❌ Post data error:', e)
    throw e
  } finally {
    dispatch(setSubmitting(false))
  }
}

export const fetchStadiumScheme = stadiumId => async (dispatch) => {
  if (!stadiumId || stadiumId === 'create' || isNaN(Number(stadiumId))) {
    return
  }
  
  dispatch(setStadiumSchemeStatus({ id: stadiumId, isLoading: true }))
  try {
    const { data: stadiums, error } = await getStadiums()
    
    if (!error && stadiums) {
      const stadium = stadiums.find(s => s.id_stadium == stadiumId)
      
      if (!stadium) {
        dispatch(setStadiumSchemeStatus({ id: stadiumId, isLoading: false, isLoaded: false }))
        return
      }
      
      if (stadium?.scheme && stadium.scheme !== '' && stadium.scheme !== null) {
        try {
          const scheme = typeof stadium.scheme === 'string' 
            ? JSON.parse(stadium.scheme.replaceAll('\'', '"')) 
            : stadium.scheme
          
          dispatch(setStadiumSchemeStatus({ id: stadiumId, isLoading: false, isLoaded: true }))
          dispatch(setStadiumScheme({ id: stadiumId, scheme }))
          return
        } catch (parseError) {
          console.warn(`⚠️ Не удалось распарсить scheme стадиона ${stadiumId} как JSON:`, parseError)
          console.warn(`⚠️ Сырая схема (первые 200 символов):`, typeof stadium.scheme === 'string' ? stadium.scheme.substring(0, 200) : stadium.scheme)
        }
      } else {
        console.warn(`⚠️ Стадион ${stadiumId} не имеет поля scheme в Supabase или оно пустое:`, {
          scheme: stadium?.scheme,
          schemeType: typeof stadium?.scheme,
          isNull: stadium?.scheme === null,
          isEmpty: stadium?.scheme === ''
        })
      }
      
      if (stadium?.scheme_link && stadium.scheme_link.startsWith('data:')) {
        console.info(`ℹ️ Стадион ${stadiumId} имеет scheme_link (base64 data URL), но нет scheme (JSON). Схема не загружена.`)
        dispatch(setStadiumSchemeStatus({ id: stadiumId, isLoading: false, isLoaded: false }))
        return
      }
    }

    dispatch(setStadiumSchemeStatus({ id: stadiumId, isLoading: false, isLoaded: false }))
  } catch (e) {
    dispatch(setStadiumSchemeStatus({ id: stadiumId, isLoading: false }))
    console.error('Fetch stadium scheme error:', e)
  }
}

export const fetchNotifications = async (dispatch) => {
  dispatch(setFetchingNotifications(true))
  try {
    console.warn('⚠️ fetchNotifications не реализован для Supabase')
    dispatch(setNotifications([]))
  } catch (e) {
    console.error('❌ Fetch notifications error:', e)
  } finally {
    dispatch(setFetchingNotifications(false))
  }
}
