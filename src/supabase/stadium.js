import { supabase } from './client'

export async function getStadiums(filters = {}) {
  try {
    let query = supabase
      .from('stadium')
      .select('*')
      .eq('active', true)
      .order('id_stadium', { ascending: true })

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
    console.error('Get stadiums error:', error)
    return { data: null, error }
  }
}

export async function getStadiumById(id) {
  try {
    const { data, error } = await supabase
      .from('stadium')
      .select('*')
      .eq('id_stadium', id)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get stadium by id error:', error)
    return { data: null, error }
  }
}

export async function createStadium(stadiumData) {
  try {
    console.log('📡 Creating stadium via Supabase...', stadiumData)

    let schemeLink = ''
    if (stadiumData.scheme_blob && typeof stadiumData.scheme_blob === 'string') {
      if (stadiumData.scheme_blob.length <= 255) {
        schemeLink = stadiumData.scheme_blob
      } else {
        console.info(`ℹ️ scheme_blob слишком длинный (${stadiumData.scheme_blob.length} символов), сохраняем только в scheme`)
      }
    }
    
    let schemeValue = stadiumData.scheme || ''
    if (typeof schemeValue === 'object') {
      schemeValue = JSON.stringify(schemeValue).replaceAll('"', '\'')
    }
    
    const insertData = {
      name_ru: stadiumData.ru || '',
      name_en: stadiumData.en || '',
      name_ar: stadiumData.ar || '',
      name_fr: stadiumData.fr || '',
      name_es: stadiumData.es || '',
      address_ru: stadiumData.address_ru || '',
      address_en: stadiumData.address_en || '',
      address_ar: stadiumData.address_ar || '',
      address_fr: stadiumData.address_fr || '',
      address_es: stadiumData.address_es || '',
      scheme: schemeValue,
      scheme_link: schemeLink,
      id_city: stadiumData.city || null,
      country: stadiumData.country || null,
      active: true
    }
    
    if (!schemeLink) {
      delete insertData.scheme_link
    }

    const { data, error } = await supabase
      .from('stadium')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ Create stadium error:', error)
      throw error
    }

    console.log('✅ Stadium created successfully:', data.id_stadium)
    return { data, error: null }
  } catch (error) {
    console.error('Create stadium error:', error)
    return { data: null, error }
  }
}

export async function updateStadium(id, stadiumData) {
  try {
    console.log('📡 Updating stadium via Supabase...', id, stadiumData)
    
    let schemeLink = ''
    if (stadiumData.scheme_blob && typeof stadiumData.scheme_blob === 'string') {
      if (stadiumData.scheme_blob.length <= 255) {
        schemeLink = stadiumData.scheme_blob
      } else {
        console.info(`ℹ️ scheme_blob слишком длинный (${stadiumData.scheme_blob.length} символов), сохраняем только в scheme`)
      }
    }
    
    let schemeValue = stadiumData.scheme || ''
    
    console.log('🔍 Processing scheme in updateStadium:', {
      hasScheme: !!stadiumData.scheme,
      schemeType: typeof stadiumData.scheme,
      isObject: typeof stadiumData.scheme === 'object' && stadiumData.scheme !== null,
      schemeKeys: typeof stadiumData.scheme === 'object' && stadiumData.scheme !== null ? Object.keys(stadiumData.scheme) : null
    })
    
    if (typeof schemeValue === 'object' && schemeValue !== null) {
      schemeValue = JSON.stringify(schemeValue).replaceAll('"', '\'')
      console.log('✅ Converted scheme object to string, length:', schemeValue.length)
    } else if (typeof schemeValue === 'string') {
      console.log('ℹ️ Scheme is already a string, length:', schemeValue.length)
    } else {
      console.warn('⚠️ Scheme is empty or has unexpected type:', typeof schemeValue)
      schemeValue = ''
    }

    const updateData = {
      name_ru: stadiumData.ru || '',
      name_en: stadiumData.en || '',
      name_ar: stadiumData.ar || '',
      name_fr: stadiumData.fr || '',
      name_es: stadiumData.es || '',
      address_ru: stadiumData.address_ru || '',
      address_en: stadiumData.address_en || '',
      address_ar: stadiumData.address_ar || '',
      address_fr: stadiumData.address_fr || '',
      address_es: stadiumData.address_es || '',
      scheme: schemeValue, 
      scheme_link: schemeLink || null,
      id_city: stadiumData.city || null,
      country: stadiumData.country || null,
      active: true
    }

    Object.keys(updateData).forEach(key => {
      if (key === 'scheme') {
        console.log('✅ Keeping scheme field:', {
          length: updateData[key]?.length || 0,
          isEmpty: !updateData[key] || updateData[key] === ''
        })
        return
      }
      if (updateData[key] === null || updateData[key] === undefined || updateData[key] === '') {
        delete updateData[key]
      }
    })
    
    console.log('📤 Final updateData:', {
      hasScheme: !!updateData.scheme,
      schemeLength: updateData.scheme?.length || 0,
      schemePreview: updateData.scheme ? updateData.scheme.substring(0, 100) + '...' : 'empty'
    })

    const { data, error } = await supabase
      .from('stadium')
      .update(updateData)
      .eq('id_stadium', id)
      .select()
      .single()

    if (error) {
      console.error('❌ Update stadium error:', error)
      throw error
    }

    console.log('✅ Stadium updated successfully:', data.id_stadium)
    return { data, error: null }
  } catch (error) {
    console.error('Update stadium error:', error)
    return { data: null, error }
  }
}