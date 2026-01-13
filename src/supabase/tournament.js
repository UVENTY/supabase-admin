import { supabase } from './client'

export async function getTournaments(filters = {}) {
  try {
    let query = supabase
      .from('tournament')
      .select('*')
      .eq('active', true)
      .order('id_tournament', { ascending: true })

    const { data, error } = await query

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get tournaments error:', error)
    return { data: null, error }
  }
}

export async function getTournamentById(id) {
  try {
    const { data, error } = await supabase
      .from('tournament')
      .select('*')
      .eq('id_tournament', id)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get tournament by id error:', error)
    return { data: null, error }
  }
}

export async function createTournament(tournamentData) {
  try {
    console.log('📡 Creating tournament via Supabase...', tournamentData)
    
    const insertData = {
      name_ru: tournamentData.ru || '',
      name_en: tournamentData.en || '',
      name_ar: tournamentData.ar || '',
      name_fr: tournamentData.fr || '',
      name_es: tournamentData.es || '',
      description_ru: tournamentData.about_ru || '',
      description_en: tournamentData.about_en || '',
      description_ar: tournamentData.about_ar || '',
      description_fr: tournamentData.about_fr || '',
      description_es: tournamentData.about_es || '',
      active: true
    }

    const { data, error } = await supabase
      .from('tournament')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ Create tournament error:', error)
      throw error
    }

    console.log('✅ Tournament created successfully:', data.id_tournament)
    return { data, error: null }
  } catch (error) {
    console.error('Create tournament error:', error)
    return { data: null, error }
  }
}

export async function updateTournament(id, tournamentData) {
  try {
    console.log('📡 Updating tournament via Supabase...', id, tournamentData)
    
    const updateData = {
      name_ru: tournamentData.ru || '',
      name_en: tournamentData.en || '',
      name_ar: tournamentData.ar || '',
      name_fr: tournamentData.fr || '',
      name_es: tournamentData.es || '',
      description_ru: tournamentData.about_ru || '',
      description_en: tournamentData.about_en || '',
      description_ar: tournamentData.about_ar || '',
      description_fr: tournamentData.about_fr || '',
      description_es: tournamentData.about_es || '',
      active: true
    }

    Object.keys(updateData).forEach(key => {
      if (updateData[key] === null || updateData[key] === undefined) {
        delete updateData[key]
      }
    })

    const { data, error } = await supabase
      .from('tournament')
      .update(updateData)
      .eq('id_tournament', id)
      .select()
      .single()

    if (error) {
      console.error('❌ Update tournament error:', error)
      throw error
    }

    console.log('✅ Tournament updated successfully:', data.id_tournament)
    return { data, error: null }
  } catch (error) {
    console.error('Update tournament error:', error)
    return { data: null, error }
  }
}