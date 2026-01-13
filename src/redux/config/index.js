import { createSlice } from '@reduxjs/toolkit'

export const configSlice = createSlice({
  name: 'config',
  initialState: {
    isLoading: false,
    isLoaded: false,
    isUpdating: false,
    data: {}
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
    setConfig: (state, action) => {
      const { payload } = action
      Object.keys(payload).forEach(key => {
        state.data[key] = payload[key]
      })
    }
  },
})

export const {
  setLoading,
  setLoaded,
  setUpdating,
  setConfig
} = configSlice.actions

export * from './selectors'

export * from './thunk'

export default configSlice.reducer