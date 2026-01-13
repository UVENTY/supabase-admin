import { supabase } from './client'

export async function getPromocodes(filters = {}) {
  try {
    let query = supabase
      .from('promocode')
      .select(`
        *,
        promocode_schedule(*)
      `)
      .order('id_promocode', { ascending: false })

    if (filters.active !== undefined) {
      query = query.eq('active', filters.active ? 1 : 0)
    }
    if (filters.schedule_id) {
      query = query.eq('promocode_schedule.id_schedule', filters.schedule_id)
    }

    const { data, error } = await query

    if (error) throw error
    
    const processed = data?.map(promo => ({
      ...promo,
      id: promo.id_promocode,
      schedule: promo.promocode_schedule?.map(ps => ps.id_schedule) || []
    }))
    
    return { data: processed, error: null }
  } catch (error) {
    console.error('Get promocodes error:', error)
    return { data: null, error }
  }
}

export async function getPromocodeById(id) {
  try {
    const { data: promo, error: promoError } = await supabase
      .from('promocode')
      .select('*')
      .eq('id_promocode', id)
      .single()

    if (promoError) throw promoError

    const { data: schedules, error: scheduleError } = await supabase
      .from('promocode_schedule')
      .select('id_schedule')
      .eq('id_promocode', id)

    if (scheduleError) throw scheduleError

    return { 
      data: {
        ...promo,
        id: promo.id_promocode,
        schedule: schedules?.map(s => s.id_schedule) || []
      }, 
      error: null 
    }
  } catch (error) {
    console.error('Get promocode by id error:', error)
    return { data: null, error }
  }
}

export async function createPromocode(promocodeData) {
  try {
    console.log('📡 Creating promocode via Supabase...', promocodeData)
    
    const insertData = {
      value: promocodeData.value,
      discount: promocodeData.discount || null,
      max_products: promocodeData.max_products || 0,
      max_payments: promocodeData.max_payments || 0,
      limit: promocodeData.limit || new Date().toISOString(),
      active: promocodeData.active ? 1 : 0,
      json: promocodeData.json || '{}'
    }

    const { data, error } = await supabase
      .from('promocode')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ Create promocode error:', error)
      throw error
    }

    if (promocodeData.schedule && Array.isArray(promocodeData.schedule) && promocodeData.schedule.length > 0) {
      const scheduleLinks = promocodeData.schedule.map(scheduleId => ({
        id_promocode: data.id_promocode,
        id_schedule: scheduleId
      }))

      const { error: linkError } = await supabase
        .from('promocode_schedule')
        .insert(scheduleLinks)

      if (linkError) {
        console.error('❌ Create promocode_schedule links error:', linkError)
      }
    }

    console.log('✅ Promocode created successfully:', data.id_promocode)
    return { data, error: null }
  } catch (error) {
    console.error('Create promocode error:', error)
    return { data: null, error }
  }
}

export async function updatePromocode(id, promocodeData) {
  try {
    console.log('📡 Updating promocode via Supabase...', id, promocodeData)
    
    const updateData = {
      value: promocodeData.value,
      discount: promocodeData.discount || null,
      max_products: promocodeData.max_products || 0,
      max_payments: promocodeData.max_payments || 0,
      limit: promocodeData.limit || null,
      active: promocodeData.active ? 1 : 0,
      json: promocodeData.json || '{}'
    }

    Object.keys(updateData).forEach(key => {
      if (key !== 'discount' && (updateData[key] === null || updateData[key] === undefined)) {
        delete updateData[key]
      }
    })

    const { data, error } = await supabase
      .from('promocode')
      .update(updateData)
      .eq('id_promocode', id)
      .select()
      .single()

    if (error) {
      console.error('❌ Update promocode error:', error)
      throw error
    }

    if (promocodeData.schedule !== undefined && Array.isArray(promocodeData.schedule)) {
      const { error: deleteError } = await supabase
        .from('promocode_schedule')
        .delete()
        .eq('id_promocode', id)

      if (deleteError) {
        console.error('❌ Delete promocode_schedule links error:', deleteError)
      }

      if (promocodeData.schedule.length > 0) {
        const scheduleLinks = promocodeData.schedule.map(scheduleId => ({
          id_promocode: id,
          id_schedule: scheduleId
        }))

        const { error: linkError } = await supabase
          .from('promocode_schedule')
          .insert(scheduleLinks)

        if (linkError) {
          console.error('❌ Create promocode_schedule links error:', linkError)
        }
      }
    }

    console.log('✅ Promocode updated successfully:', data.id_promocode)
    return { data, error: null }
  } catch (error) {
    console.error('Update promocode error:', error)
    return { data: null, error }
  }
}