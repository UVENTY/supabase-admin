import { createSelector } from 'reselect'
import { getOptions, toOptions } from '../../utils/utils'

export const getDefaultCurrency = createSelector(
  state => state.config.data?.currency,
  currency => currency.default
)

export const getCurrencyList = createSelector(
  state => state.config.data?.currency || {},
  currency => Object.values(currency.map)
)

export const getLang = createSelector(
  state => state.config.data?.langs,
  (state, key) => key,
  (langs, key) => key ? langs[key] : Object.values(langs)
)

export const getCity = createSelector(
  state => state.config.data?.cities,
  (state, cityId) => cityId,
  (cities, id) => cities[id]
)

export const getCities = createSelector(
  state => state.config.data?.cities,
  cities => cities
)

export const getCitiesOptions = createSelector(
  state => state.config.data?.cities,
  cities => {
    if (!cities || typeof cities !== 'object') return []
    const transformedCities = Object.values(cities).map(city => ({
      ...city,
      en: city.name_en || city.en || '',
      id: city.id_city || city.id
    }))
    return toOptions(transformedCities, { label: 'en', value: 'id' })
  }
)

export const getCountries = createSelector(
  state => state.config.data?.countries,
  countries => countries
)

export const getCountriesOptions = createSelector(
  state => state.config.data?.countries,
  countries => {
    if (!countries || typeof countries !== 'object') return []
    const transformedCountries = Object.values(countries).map(country => ({
      ...country,
      en: country.name_en || country.en || '',
      id: country['ISO 3166-1 alpha-2 code'] || country.id
    }))
    return toOptions(transformedCountries, { label: 'en', value: 'id' })
  }
)

const emptyLang = {}

export const getLangValue = createSelector(
  state => state.config.data?.langValues,
  (state, key) => key,
  (values, key) => key ? (values[key] || emptyLang) : values
)
