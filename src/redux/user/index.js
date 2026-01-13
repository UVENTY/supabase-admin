import { createSlice } from '@reduxjs/toolkit'

export const userSlice = createSlice({
  name: 'user',
  initialState: {
    isLoading: false,
    isLoaded: false,
    authorized: false,
    profile: {},
    token: {},
  },
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload
    },
    setLoaded: (state, action) => {
      state.isLoaded = action.payload
    },
    setProfile: (state, action) => {
      const { authorized = false, ...profile } = action.payload
      state.authorized = authorized
      state.profile = profile
    },
    setToken: (state, action) => {
      state.token = action.payload
    }
  },
})

export const {
  setWrongAttempt,
  setToken,
  setLoading,
  setLoaded,
  setProfile,
} = userSlice.actions

export * from './selectors'

export * from './thunk'

export default userSlice.reducer