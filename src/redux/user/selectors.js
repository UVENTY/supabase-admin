import { createSelector } from 'reselect'
import { USER_ROLES } from '../../consts'

export const getUserRole = state => state.user.profile?.u_role

export const getIsAdmin = createSelector(
  getUserRole,
  role => USER_ROLES[role] === 'Admin'
)

export const getIsSeller = createSelector(
  getUserRole,
  role => USER_ROLES[role] === 'Seller'
)