import { supabase } from './client'

export async function getTeams(filters = {}) {
  try {
    let query = supabase
      .from('team')
      .select('*')
      .eq('active', true)
      .order('id_team', { ascending: true })

    if (filters.country) {
      query = query.eq('country', filters.country)
    }
    if (filters.city) {
      query = query.eq('id_city', filters.city)
    }

    const { data, error } = await query

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get teams error:', error)
    return { data: null, error }
  }
}

export async function getTeamById(id) {
  try {
    const { data, error } = await supabase
      .from('team')
      .select('*')
      .eq('id_team', id)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get team by id error:', error)
    return { data: null, error }
  }
}

export async function createTeam(teamData) {
  try {
    console.log('📡 Creating team via Supabase...', teamData)
    
    const insertData = {
      name_ru: teamData.ru || '',
      name_en: teamData.en || '',
      name_ar: teamData.ar || '',
      name_fr: teamData.fr || '',
      name_es: teamData.es || '',
      country: teamData.country || null,
      id_city: teamData.city || null,
      id_stadium: teamData.stadium || null,
      logo: teamData.logo || '',
      active: true
    }

    const { data, error } = await supabase
      .from('team')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ Create team error:', error)
      throw error
    }

    console.log('✅ Team created successfully:', data.id_team)
    return { data, error: null }
  } catch (error) {
    console.error('Create team error:', error)
    return { data: null, error }
  }
}

export async function updateTeam(id, teamData) {
  try {
    console.log('📡 Updating team via Supabase...', id, teamData)
    
    const updateData = {
      name_ru: teamData.ru || '',
      name_en: teamData.en || '',
      name_ar: teamData.ar || '',
      name_fr: teamData.fr || '',
      name_es: teamData.es || '',
      country: teamData.country || null,
      id_city: teamData.city || null,
      id_stadium: teamData.stadium || null,
      logo: teamData.logo || null,
      active: true
    }

    Object.keys(updateData).forEach(key => {
      if (updateData[key] === null || updateData[key] === undefined) {
        delete updateData[key]
      }
    })

    const { data, error } = await supabase
      .from('team')
      .update(updateData)
      .eq('id_team', id)
      .select()
      .single()

    if (error) {
      console.error('❌ Update team error:', error)
      throw error
    }

    console.log('✅ Team updated successfully:', data.id_team)
    return { data, error: null }
  } catch (error) {
    console.error('Update team error:', error)
    return { data: null, error }
  }
}