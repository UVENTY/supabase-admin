import { mapValues } from 'lodash'
import { setLoading, setLoaded, setSubmitting, updateData, setData, setStadiumScheme, setStadiumSchemeStatus, setNotifications, setFetchingNotifications } from '.'
import { getAllData, getStadiums } from '../../supabase/data'

export const fetchData = (params = { fields: 'F', easy: true }) => async (dispatch) => {
  dispatch(setLoading(true))
  try {
    const { data, error } = await getAllData()
    
    if (error) {
      console.error('Fetch data error:', error)
      throw error
    }

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
    const axios = (await import('../../utils/axios')).default
    const resp = await axios.postWithAuth('/data', {
      data: JSON.stringify(params)
    })
    dispatch(updateData(params))
    return resp.data
  } catch(e) {
    console.error('Post data error:', e)
  } finally {
    dispatch(setSubmitting(false))
  }
}

export const fetchStadiumScheme = stadiumId => async (dispatch) => {
  dispatch(setStadiumSchemeStatus({ id: stadiumId, isLoading: true }))
  try {
    const { data: stadiums, error } = await getStadiums()
    
    if (error) throw error

    const stadium = stadiums?.find(s => s.id_stadium == stadiumId)
    if (stadium?.scheme) {
      const scheme = typeof stadium.scheme === 'string' 
        ? JSON.parse(stadium.scheme.replaceAll('\'', '"')) 
        : stadium.scheme
      
      dispatch(setStadiumSchemeStatus({ id: stadiumId, isLoading: false, isLoaded: true }))
      dispatch(setStadiumScheme({ id: stadiumId, scheme }))
    } else {
      dispatch(setStadiumSchemeStatus({ id: stadiumId, isLoading: false }))
    }
  } catch (e) {
    dispatch(setStadiumSchemeStatus({ id: stadiumId, isLoading: false }))
    console.error('Fetch stadium scheme error:', e)
  }
}

export const fetchNotifications = async (dispatch) => {
  dispatch(setFetchingNotifications(true))
  try {
    const axios = (await import('../../utils/axios')).default
    const { data } = await axios.postWithAuth('/query/select', {
      sql: 'SELECT cart_block.id_user as u_id, cart_block.product as prod, cart_block.property as prop, u.name, u.family, u.middle, u.phone FROM cart_block LEFT JOIN (SELECT schedule.id_schedule FROM schedule LEFT JOIN trip ON trip.from = CAST(CONCAT("sc_id",schedule.id_schedule) as char) WHERE schedule.active = "1" and schedule.start_datetime >= now()) sc ON sc.id_schedule = cart_block.product LEFT JOIN users u on u.id_user=cart_block.id_user WHERE sc.id_schedule IS NOT NULL'
    })
    const notices = (data.data || []).map((item, id) => ({
      id,
      u_id: item.u_id,
      match_id: item.prod,
      blocks: (item.prop || '').split(';'),
      user: {
        id: item.u_id,
        name: item.name,
        middle: item.middle,
        family: item.family
      }
    }))
    dispatch(setNotifications(notices))
  } catch (e) {
    console.error('Fetch notifications error:', e)
  } finally {
    dispatch(setFetchingNotifications(false))
  }
}


