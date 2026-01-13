import { supabase } from './client'
import { getUsers, getUsersByRole } from './users'

export async function getUsersForAdmin() {
  try {
    const { data, error } = await getUsers({
      active: true,
      deleted: 0
    })

    if (error) throw error

    return { 
      data: data || [], 
      error: null 
    }
  } catch (error) {
    console.error('Get users for admin error:', error)
    return { data: null, error }
  }
}

export async function queryUsers(sql) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id_user, id_role, phone, email, name, family, middle, id_verification_status')
      .eq('active', true)
      .eq('deleted', 0)

    if (error) throw error

    return { 
      data: data || [], 
      error: null 
    }
  } catch (error) {
    console.error('Query users error:', error)
    return { data: null, error }
  }
}