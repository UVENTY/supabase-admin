import Cookies from 'universal-cookie'
import axios from '../../utils/axios'
import toFormData from '../../utils/formData'
import { setToken, setLoading, setProfile } from '.'
import { signIn, signOut, getCurrentUser } from '../../supabase/auth'

export const login = params => async (dispatch) => {
  dispatch(setLoading(true))
  try {
    const { email, password } = params
    const { data, error } = await signIn({ email, password })

    if (error) {
      console.error('Login error:', error)
      return false
    }

    const userData = data?.userData
    const idRole = userData?.id_role
    const userRole = idRole !== undefined && idRole !== null 
      ? String(idRole) 
      : (userData?.u_role ? String(userData.u_role) : null)

    console.log('🔐 Login attempt:', { 
      email, 
      id_role: idRole, 
      userRole, 
      userData: userData ? { ...userData, pwd: '***' } : null 
    })

    if (!userRole || !['2', '4'].includes(userRole)) {
      console.error('❌ Access denied: insufficient permissions', { 
        userRole, 
        allowedRoles: ['2', '4'],
        id_role: idRole 
      })
      await signOut()
      return false
    }

    dispatch(setProfile({ 
      ...userData,
      u_role: userRole,
      authorized: true 
    }))

    return userRole
  } catch(e) {
    console.error('Login exception:', e)
    return false
  } finally {
    dispatch(setLoading(false))
  }
}

export const logout = async (dispatch) => {
  dispatch(setLoading(true))
  try {
    await signOut()
    const cookies = new Cookies()
    dispatch(setProfile({ authorized: false }))
    cookies.remove('token')
    cookies.remove('u_hash')
  } catch(e) {
    console.error('Logout error:', e)
  } finally {
    dispatch(setLoading(false))
  }
}

export const authorizeByTokens = async (dispatch) => {
  dispatch(setLoading(true))
  try {
    const { data: user, error } = await getCurrentUser()

    if (error || !user) {
      dispatch(setLoading(false))
      return false
    }

    const idRole = user?.id_role
    const userRole = idRole !== undefined && idRole !== null 
      ? String(idRole) 
      : (user?.u_role ? String(user.u_role) : null)

    if (!userRole || !['2', '4'].includes(userRole)) {
      console.error('❌ Access denied: insufficient permissions', { 
        userRole, 
        allowedRoles: ['2', '4'],
        id_role: idRole 
      })
      await signOut()
      dispatch(setLoading(false))
      return false
    }

    dispatch(setProfile({ 
      ...user,
      u_role: userRole,
      authorized: true 
    }))

    return userRole
  } catch(e) {
    console.error('Authorize error:', e)
    dispatch(setLoading(false))
    return false
  } finally {
    dispatch(setLoading(false))
  }
}

export const getToken = hash => async (dispatch) => {
  return {}
}