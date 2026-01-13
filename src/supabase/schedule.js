import { supabase } from './client'

export async function getSchedules(filters = {}) {
  try {
    let query = supabase
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

    if (filters.stadium) {
      query = query.eq('id_stadium', filters.stadium)
    }
    if (filters.tournament) {
      query = query.eq('id_tournament', filters.tournament)
    }

    const { data, error } = await query

    if (error) throw error

    const processedData = data?.map(item => {
      const processed = {
        ...item,
        datetime: item.start_datetime?.split('+')[0] || item.start_datetime,
        team1: item.team1_table || item.team1,
        team2: item.team2_table || item.team2
      }
      delete processed.team1_table
      delete processed.team2_table
      return processed
    })

    return { data: processedData, error: null }
  } catch (error) {
    console.error('Get schedules error:', error)
    return { data: null, error }
  }
}

export async function getScheduleById(id) {
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
      .eq('id_schedule', id)
      .single()

    if (error) throw error

    if (data) {
      data.datetime = data.start_datetime?.split('+')[0] || data.start_datetime
      data.team1 = data.team1_table || data.team1
      data.team2 = data.team2_table || data.team2
      delete data.team1_table
      delete data.team2_table
    }

    return { data, error: null }
  } catch (error) {
    console.error('Get schedule by id error:', error)
    return { data: null, error }
  }
}

export async function createSchedule(scheduleData) {
  try {
    console.log('📡 Creating schedule via Supabase...', scheduleData)
    
    if (!scheduleData.team1) {
      throw new Error('Team1 is required')
    }

    const insertData = {
      team1: scheduleData.team1,
      team2: scheduleData.team2 || null,
      id_stadium: scheduleData.stadium || null,
      id_tournament: scheduleData.tournament || null,
      start_datetime: scheduleData.datetime || scheduleData.start_datetime,
      duration: scheduleData.duration || null,
      only_date: scheduleData.only_date || false,
      top: scheduleData.top === '1' || scheduleData.top === true || false,
      time_zone: scheduleData.time_zone || '+03:00',
      currency: scheduleData.currency || null,
      id_stripe_account: scheduleData.stripe_account || 1,
      fee: scheduleData.fee || null,
      tariff: scheduleData.tariff || null,
      active: true,
      options: scheduleData.options ? JSON.stringify(scheduleData.options) : '{}',
      email_subject: scheduleData.email_subject || null,
      email_body: scheduleData.email_body || null,
      pdf_template: scheduleData.pdf_template || null
    }

    const { data, error } = await supabase
      .from('schedule')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ Create schedule error:', error)
      throw error
    }

    console.log('✅ Schedule created successfully:', data.id_schedule)
    return { data, error: null }
  } catch (error) {
    console.error('Create schedule error:', error)
    return { data: null, error }
  }
}

export async function updateSchedule(id, scheduleData) {
  try {
    console.log('📡 Updating schedule via Supabase...', id, scheduleData)
    
    const updateData = {
      team1: scheduleData.team1 || null,
      team2: scheduleData.team2 || null,
      id_stadium: scheduleData.stadium || null,
      id_tournament: scheduleData.tournament || null,
      start_datetime: scheduleData.datetime || scheduleData.start_datetime || null,
      duration: scheduleData.duration || null,
      only_date: scheduleData.only_date || false,
      top: scheduleData.top === '1' || scheduleData.top === true || false,
      time_zone: scheduleData.time_zone || null,
      currency: scheduleData.currency || null,
      id_stripe_account: scheduleData.stripe_account || null,
      fee: scheduleData.fee || null,
      tariff: scheduleData.tariff || null,
      email_subject: scheduleData.email_subject || null,
      email_body: scheduleData.email_body || null,
      pdf_template: scheduleData.pdf_template || null
    }

    Object.keys(updateData).forEach(key => {
      if (updateData[key] === null || updateData[key] === undefined) {
        delete updateData[key]
      }
    })

    if (scheduleData.options) {
      updateData.options = JSON.stringify(scheduleData.options)
    }

    const { data, error } = await supabase
      .from('schedule')
      .update(updateData)
      .eq('id_schedule', id)
      .select()
      .single()

    if (error) {
      console.error('❌ Update schedule error:', error)
      throw error
    }

    console.log('✅ Schedule updated successfully:', data.id_schedule)
    return { data, error: null }
  } catch (error) {
    console.error('Update schedule error:', error)
    return { data: null, error }
  }
}

export async function deleteSchedule(id) {
  try {
    const { data, error } = await supabase
      .from('schedule')
      .update({ active: false })
      .eq('id_schedule', id)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Delete schedule error:', error)
    return { data: null, error }
  }
}