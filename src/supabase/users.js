import { supabase } from './client'
import md5 from 'md5'

export async function getUsers(filters = {}) {
  try {
    let query = supabase
      .from('users')
      .select('*')
      .eq('active', true)
      .eq('deleted', 0)
      .order('id_user', { ascending: false })

    if (filters.role) {
      query = query.eq('id_role', filters.role)
    }
    if (filters.email) {
      query = query.ilike('email', `%${filters.email}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ Get users error:', error)
      throw error
    }
    
    return { data, error: null }
  } catch (error) {
    console.error('Get users error:', error)
    return { data: null, error }
  }
}

export async function getUserById(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id_user', userId)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get user by id error:', error)
    return { data: null, error }
  }
}

export async function checkUserExists(email) {
  try {
    const normalizedEmail = (email || '').trim().toLowerCase()
    const { data, error } = await supabase
      .from('users')
      .select('id_user')
      .ilike('email', normalizedEmail)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') throw error 
    return { exists: !!data, error: null }
  } catch (error) {
    console.error('Check user exists error:', error)
    return { exists: false, error }
  }
}

async function createUserInAuth(email, password) {
  try {
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
    const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !anonKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/create-user-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ email, password }),
    })

    const result = await response.json()
    
    if (result.data && result.data.exists) {
      return { data: { exists: true }, error: null }
    }
    
    if (!response.ok) {
      const errorMessage = result.error || 'Failed to create user in Auth'
      
      if (errorMessage.includes('already been registered') || 
          errorMessage.includes('already exists') ||
          errorMessage.toLowerCase().includes('already registered')) {
        return { data: { exists: true }, error: null }
      }
      
      throw new Error(errorMessage)
    }

    return { data: result.data || result, error: null }
  } catch (error) {
    const errorMessage = error.message || String(error)
    if (errorMessage.includes('already been registered') || 
        errorMessage.includes('already exists') ||
        errorMessage.toLowerCase().includes('already registered')) {
      return { data: { exists: true }, error: null }
    }
    
    return { data: null, error }
  }
}

export async function createUser(userData) {
  try {
    const normalizedEmail = (userData.email || '').trim().toLowerCase()
    
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id_user, email, id_role')
      .ilike('email', normalizedEmail)
      .maybeSingle()
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking user existence:', checkError)
    }
    
    if (existingUser) {
      return { 
        data: null, 
        error: { message: `Пользователь с email ${normalizedEmail} уже существует в базе данных (ID: ${existingUser.id_user}, роль: ${existingUser.id_role})` } 
      }
    }
    
    const pwdHash = userData.pwd ? md5(md5(userData.pwd)) : md5(md5('temp'))
    const referralCode = userData.referral_code || `uid${Date.now()}${Math.floor(Math.random() * 10000)}`
    const generateSecretId = () => {
      const chars = '0123456789abcdefghijklmnopqrstuvwxyz'
      let result = 's'
      for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return result
    }
    const secretId = userData.secret_id || generateSecretId()
    const now = new Date().toISOString()

    let phoneNumber = null
    if (userData.phone) {
      const phoneStr = String(userData.phone).replace(/\D/g, '') 
      if (phoneStr.length > 0) {
        phoneNumber = parseInt(phoneStr, 10)
      }
    }

    const roleId = userData.id_role !== null && userData.id_role !== undefined 
      ? parseInt(userData.id_role, 10) 
      : 1
    
    if (isNaN(roleId)) {
      return { 
        data: null, 
        error: { message: 'Неверное значение роли пользователя' } 
      }
    }

    const insertData = {
      email: normalizedEmail, 
      name: userData.name,
      family: userData.family || '',
      middle: userData.middle || '',
      phone: phoneNumber, 
      id_role: roleId,
      active: true,
      deleted: 0,
      pwd: pwdHash,
      referral_code: referralCode,
      secret_id: secretId, 
      create_datetime: now,
      last_edit_datetime: now
    }

    if (userData.id_schedule !== null && userData.id_schedule !== undefined && userData.id_schedule !== '') {
      const scheduleId = typeof userData.id_schedule === 'string' ? parseInt(userData.id_schedule) : Number(userData.id_schedule)
      if (!isNaN(scheduleId)) {
        insertData.id_schedule = scheduleId
      }
    }

    const { data, error } = await supabase
      .from('users')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        const { data: existingUserCheck, error: checkError } = await supabase
          .from('users')
          .select('id_user, email, id_role, name, family')
          .ilike('email', normalizedEmail)
          .maybeSingle()
        
        if (existingUserCheck) {
          return { 
            data: null, 
            error: { 
              message: `Пользователь с email ${normalizedEmail} уже существует в базе данных (ID: ${existingUserCheck.id_user}${existingUserCheck.name ? `, имя: ${existingUserCheck.name}` : ''}${existingUserCheck.id_role ? `, роль: ${existingUserCheck.id_role}` : ''})` 
            } 
          }
        }
        
        return { 
          data: null, 
          error: { message: `Пользователь с email ${normalizedEmail} уже существует в базе данных (конфликт уникального ключа)` } 
        }
      }
      
      console.error('Error inserting user:', error)
      return { 
        data: null, 
        error: { message: `Ошибка при создании пользователя: ${error.message || error.code || 'Неизвестная ошибка'}` } 
      }
    }

    if (data && data.id_user) {
      const updateData = {
        create_user: data.id_user,
        last_edit_user: data.id_user,
        referral_code: `uid${data.id_user}`,
        last_edit_datetime: new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id_user', data.id_user)

      if (updateError) {
        console.warn('Warning: failed to update user metadata:', updateError)
      } else {
        data.create_user = data.id_user
        data.last_edit_user = data.id_user
        data.referral_code = `uid${data.id_user}`
      }
    }

    if (userData.pwd && userData.pwd.trim() !== '' && data && data.id_user) {
      console.log('📡 Creating user in Supabase Auth...')
      const { data: authData, error: authError } = await createUserInAuth(normalizedEmail, userData.pwd)
      
      if (authData?.exists) {
        console.log('ℹ️ User already exists in Auth (user already created in users table)')
      } else if (authError) {
        console.warn('⚠️ Warning: User created in users table but failed to create in Auth:', authError.message)
      } else {
        console.log('✅ User created in Supabase Auth successfully')
      }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Create user error:', error)
    return { data: null, error }
  }
}

export async function updateUser(userId, updates) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        last_edit_datetime: new Date().toISOString()
      })
      .eq('id_user', userId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Update user error:', error)
    return { data: null, error }
  }
}

export async function getUsersByRole(roleId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id_role', roleId)
      .eq('active', true)
      .eq('deleted', 0)
      .order('id_user')

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get users by role error:', error)
    return { data: null, error }
  }
}