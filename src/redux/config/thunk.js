import { setLoading, setLoaded, setConfig, setUpdating } from '.'
import { getConfig } from '../../supabase/config'

export const fetchConfig = async (dispatch) => {
  dispatch(setLoading(true))
  try {
    const { data, error } = await getConfig()
    
    if (error) {
      console.error('❌ Supabase fetch config error:', error)
      throw error
    }

    const {
      currencies,
      lang_vls,
      langs: respLangs,
      cities: respCities,
      countries: respCountries,
      default_currency
    } = data

    const currency = {
      default: default_currency || 'USD',
      map: Object.keys(currencies || {}).reduce((acc, code) => ({ ...acc, [code]: { ...currencies[code], code } }), {})
    }
    const langs = Object.keys(respLangs || {}).reduce((acc, id) => ({ ...acc, [id]: { ...respLangs[id], id } }), {})
    
    const countries = Object.keys(respCountries || {}).reduce((acc, code) => {
      const country = respCountries[code]
      acc[code] = {
        ...country,
        id: country['ISO 3166-1 alpha-2 code'] || code,
        en: country.name_en || country.en || ''
      }
      return acc
    }, {})
    
    const cities = Object.keys(respCities || {}).reduce((acc, id) => {
      const city = respCities[id]
      acc[id] = {
        ...city,
        id: city.id_city || id,
        en: city.name_en || city.en || ''
      }
      return acc
    }, {})
    
    dispatch(setConfig({ currency, langs, cities, countries, langValues: lang_vls || {} }))
    dispatch(setLoaded(true))
  } catch(e) {
    console.error('❌ Fetch config exception:', e)
  } finally {
    dispatch(setLoading(false))
  }
}

export const updateLang = lang_vls => async (dispatch) => {
  dispatch(setUpdating(true))
  try {
    console.warn('⚠️ updateLang не реализован для Supabase, пока только чтение')
    dispatch(fetchConfig(dispatch))
  } catch (e) {
    console.error(e)
  } finally {
    dispatch(setUpdating(false))
  }
}
