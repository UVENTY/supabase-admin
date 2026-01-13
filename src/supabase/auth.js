import { supabase } from './client'

export async function signUp({ email, phone, password, name, family, middle }) {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          family,
          middle,
          phone
        }
      }
    })

    if (authError) throw authError

    if (authData.user) {
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id_user: parseInt(authData.user.id) || undefined, 
          email,
          phone,
          name,
          family,
          middle,
          id_role: 1 
        })

      if (userError && !userError.message.includes('duplicate')) {
        console.error('Error creating user record:', userError)
      }
    }

    return { data: authData, error: null }
  } catch (error) {
    console.error('Sign up error:', error)
    return { data: null, error }
  }
}


export async function signIn({ email, password }) {
  try {
    if (!email || !password) {
      throw new Error('Email and password are required')
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password
    })

    if (error) throw error

    if (data.user) {
      const normalizedEmail = email.trim().toLowerCase()
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .ilike('email', normalizedEmail)
        .maybeSingle()

      if (userError) {
        console.error('Error fetching user data:', userError)
        if (userError.code === 'PGRST116') {
          console.warn('User record not found in users table. Please create it via SQL.')
          return { 
            data: { ...data, userData: null }, 
            error: { message: 'User record not found in database. Please contact administrator.' } 
          }
        }
        
        return { data: { ...data, userData: null }, error: userError }
      }

      return { 
        data: { ...data, userData }, 
        error: null 
      }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Sign in error:', error)
    return { data: null, error }
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Sign out error:', error)
    return { error }
  }
}

export async function getCurrentUser() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { data: null, error: authError }
    }

    const normalizedEmail = (user.email || '').toLowerCase()
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .ilike('email', normalizedEmail)
      .maybeSingle()

    if (userError) {
      console.error('Error fetching user data:', userError)
      return { data: { ...user, id_role: 1 }, error: null } 
    }

    return { 
      data: { ...user, ...userData }, 
      error: null 
    }
  } catch (error) {
    console.error('Get current user error:', error)
    return { data: null, error }
  }
}

export async function updateProfile(userId, updates) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id_user', userId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Update profile error:', error)
    return { data: null, error }
  }
}

export async function isAuthenticated() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return !!session
  } catch (error) {
    console.error('Check authentication error:', error)
    return false
  }
}

