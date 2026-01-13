import { supabase } from './client'

export async function getAllData(filters = {}) {
  try {
    const [schedules, stadiums, teams, tournaments, promocodes] = await Promise.all([
      getSchedules(),
      getStadiums(),
      getTeams(),
      getTournaments(),
      getPromocodes()
    ])

    const data = {
      schedule: schedules.data || {},
      stadiums: stadiums.data || {},
      teams: teams.data || {},
      tournaments: tournaments.data || {},
      promocodes: promocodes.data || {}
    }

    const formatAsObject = (array, idKey) => {
      if (!array || !Array.isArray(array)) {
        console.warn(`⚠️ formatAsObject: array is not valid`, { array, idKey })
        return {}
      }
      const result = array.reduce((acc, item) => {
        const key = item[idKey]
        if (!key && key !== 0) {
          console.warn(`⚠️ formatAsObject: item missing ${idKey}`, item)
          return acc
        }
        acc[String(key)] = item
        return acc
      }, {})
      return result
    }

    const formattedData = {
      schedule: formatAsObject(schedules.data, 'id_schedule'),
      stadiums: formatAsObject(stadiums.data, 'id'), 
      teams: formatAsObject(teams.data, 'id'), 
      tournaments: formatAsObject(tournaments.data, 'id'), 
      promocodes: formatAsObject(promocodes.data, 'id_promocode')
    }
    
    return {
      data: formattedData,
      error: null
    }
  } catch (error) {
    console.error('Get all data error:', error)
    return { data: null, error }
  }
}

export async function getSchedules(filters = {}) {
  try {
    const { data, error } = await supabase
      .from('schedule')
      .select(`
        *,
        team1_table:team!team1(*),
        team2_table:team!team2(*),
        stadium(*),
        tournament(*)
      `)
      .eq('active', true)
      .order('start_datetime', { ascending: true })

    if (error) {
      console.error('❌ Supabase getSchedules error:', error)
      throw error
    }

    const processed = data?.map(item => {
      const processedItem = {
        ...item,
        datetime: item.start_datetime?.split('+')[0] || item.start_datetime,
        team1: item.team1_table || item.team1,
        team2: item.team2_table || item.team2
      }
      delete processedItem.team1_table
      delete processedItem.team2_table
      return processedItem
    })

    return { data: processed, error: null }
  } catch (error) {
    console.error('Get schedules error:', error)
    return { data: null, error }
  }
}

export async function getStadiums() {
  try {
    const { data, error } = await supabase
      .from('stadium')
      .select('*')
      .eq('active', true)
      .order('id_stadium')

    if (error) throw error
    
    const processed = data?.map(stadium => ({
      ...stadium,
      id: stadium.id_stadium,
      en: stadium.name_en || '',
      ru: stadium.name_ru || '',
      ar: stadium.name_ar || '',
      fr: stadium.name_fr || '',
      es: stadium.name_es || '',
      address_en: stadium.address_en || '',
      address_ru: stadium.address_ru || '',
      address_ar: stadium.address_ar || '',
      address_fr: stadium.address_fr || '',
      address_es: stadium.address_es || '',
      city: stadium.id_city
    })) || []
    
    return { data: processed, error: null }
  } catch (error) {
    console.error('Get stadiums error:', error)
    return { data: null, error }
  }
}

export async function getTeams() {
  try {
    const { data, error } = await supabase
      .from('team')
      .select('*')
      .eq('active', true)
      .order('id_team')

    if (error) throw error
    
    const processed = data?.map(team => ({
      ...team,
      id: team.id_team,
      en: team.name_en || '',
      ru: team.name_ru || '',
      ar: team.name_ar || '',
      fr: team.name_fr || '',
      es: team.name_es || '',
      city: team.id_city,
      stadium: team.id_stadium ? { id: team.id_stadium } : null
    }))
    
    return { data: processed, error: null }
  } catch (error) {
    console.error('Get teams error:', error)
    return { data: null, error }
  }
}

export async function getTournaments() {
  try {
    const { data, error } = await supabase
      .from('tournament')
      .select('*')
      .eq('active', true)
      .order('id_tournament')

    if (error) {
      console.error('❌ Get tournaments error:', error)
      throw error
    }
    
    const processed = data?.map(tournament => ({
      ...tournament,
      id: tournament.id_tournament,
      en: tournament.name_en || '',
      ru: tournament.name_ru || '',
      ar: tournament.name_ar || '',
      fr: tournament.name_fr || '',
      es: tournament.name_es || '',
      about_en: tournament.description_en || '',
      about_ru: tournament.description_ru || '',
      about_ar: tournament.description_ar || '',
      about_fr: tournament.description_fr || '',
      about_es: tournament.description_es || ''
    })) || []
    
    return { data: processed, error: null }
  } catch (error) {
    console.error('Get tournaments error:', error)
    return { data: null, error }
  }
}

export async function getPromocodes() {
  try {
    const { data, error } = await supabase
      .from('promocode')
      .select(`
        *,
        promocode_schedule(id_schedule)
      `)
      .eq('active', 1)
      .order('id_promocode')

    if (error) throw error

    const processed = data?.map(promo => ({
      ...promo,
      schedule: promo.promocode_schedule?.map(ps => ps.id_schedule) || []
    }))

    return { data: processed, error: null }
  } catch (error) {
    console.error('Get promocodes error:', error)
    return { data: null, error }
  }
}



