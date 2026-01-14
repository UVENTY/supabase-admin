import { supabase } from './client'

export async function getCurrencies() {
  try {
    const { data, error } = await supabase
      .from('currency')
      .select('*')
      .order('iso4217_code_a')

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get currencies error:', error)
    return { data: null, error }
  }
}

export async function getLangs() {
  try {
    const { data, error } = await supabase
      .from('lang')
      .select('*')
      .order('id_lang')

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get langs error:', error)
    return { data: null, error }
  }
}

export async function getCities() {
  try {
    const { data, error } = await supabase
      .from('city')
      .select('*')
      .order('id_city')

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get cities error:', error)
    return { data: null, error }
  }
}

export async function getCountries() {
  try {
    const { data, error } = await supabase
      .from('countries_list')
      .select('*')
      .order('ISO 3166-1 alpha-2 code')

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get countries error:', error)
    return { data: null, error }
  }
}

export async function getConfig() {
  try {
    const [currencies, langs, cities, countries] = await Promise.all([
      getCurrencies(),
      getLangs(),
      getCities(),
      getCountries()
    ])

    const formatAsObject = (array, idKey) => {
      if (!array || !Array.isArray(array)) return {}
      return array.reduce((acc, item) => {
        acc[item[idKey]] = item
        return acc
      }, {})
    }

    return {
      data: {
        currencies: formatAsObject(currencies.data, 'iso4217_code_a'),
        langs: formatAsObject(langs.data, 'id_lang'),
        cities: formatAsObject(cities.data, 'id_city'),
        countries: formatAsObject(countries.data, 'ISO 3166-1 alpha-2 code'),
        lang_vls: {}, 
        default_currency: 'EUR' 
      },
      error: null
    }
  } catch (error) {
    console.error('Get config error:', error)
    return { data: null, error }
  }
}