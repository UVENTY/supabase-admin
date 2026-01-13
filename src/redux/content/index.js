import { createSlice } from '@reduxjs/toolkit'

export const configSlice = createSlice({
  name: 'content',
  initialState: {
    isLoading: false,
    isLoaded: false,
    isUpdating: false,
    byName: {}
  },
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload
    },
    setLoaded: (state, action) => {
      state.isLoaded = action.payload
    },
    setUpdating: (state, action) => {
      state.isUpdating = action.payload
    },
    setContent: (state, action) => {
      
    }
  },
})

export const {
  setLoading,
  setLoaded,
  setUpdating,
  setContent
} = configSlice.actions

export * from './selectors'

export * from './thunk'

export default configSlice.reducer