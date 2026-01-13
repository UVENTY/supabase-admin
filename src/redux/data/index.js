import { createSlice } from '@reduxjs/toolkit'

export const dataSlice = createSlice({
  name: 'data',
  initialState: {
    isFetchingNotifications: false,
    isLoading: false,
    isLoaded: false,
    isSubmitting: false,
    tournaments: {},
    teams: {},
    stadiums: {},
    schedule: {},
    notifications: [],
  },
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload
    },
    setLoaded: (state, action) => {
      state.isLoaded = action.payload
    },
    setSubmitting: (state, action) => {
      state.isSubmitting = action.payload
    },
    setData: (state, action) => {
      ['stadiums', 'schedule', 'teams', 'tournaments'].forEach(name => {
        const obj = action.payload[name]
        if (!obj) return
        const normalizedObj = {}
        Object.keys(obj).forEach(id => {
          const item = { ...obj[id] }
          item.id = String(id)
          
          if (name === 'stadiums' && state.stadiums && state.stadiums[id]) {
            const oldStadium = state.stadiums[id]
            if (oldStadium.scheme) {
              item.scheme = oldStadium.scheme
            }
            if (oldStadium.isSchemeLoaded !== undefined) {
              item.isSchemeLoaded = oldStadium.isSchemeLoaded
            }
            if (oldStadium.isSchemeLoading !== undefined) {
              item.isSchemeLoading = oldStadium.isSchemeLoading
            }
          }
          
          normalizedObj[String(id)] = item
        })
        state[name] = normalizedObj
      })
    },
    setFetchingNotifications: (state, action) => {
      state.isFetchingNotifications = action.payload
    },
    setNotifications: (state, action) => {
      state.notifications = action.payload
    },
    updateData: (state, action) => {
      ['stadiums', 'schedule', 'teams', 'tournaments'].forEach(name => {
        const obj = action.payload[name]
        if (!obj) return
        const newObj = obj.reduce((acc, item) => ({ ...acc, [item.id]: { ...state[name][item.id], ...item } }), {})
        state[name] = { ...state[name], ...newObj }
      })
    },
    setStadiumScheme: (state, action) => {
      const { id, scheme } = action.payload
      if (!state.stadiums || !state.stadiums[id]) return
      state.stadiums[id].scheme = scheme
    },
    setStadiumSchemeStatus: (state, action) => {
      const { payload = {} } = action
      const { id, isLoaded, isLoading } = payload
      if (!state.stadiums || !state.stadiums[id]) return
      if (isLoaded !== undefined) {
        state.stadiums[id].isSchemeLoaded = isLoaded
      }
      if (isLoading !== undefined) {
        state.stadiums[id].isSchemeLoading = isLoading
      }
    }
  },
})

export const {
  setLoading,
  setLoaded,
  setSubmitting,
  setData,
  updateData,
  setStadiumScheme,
  setStadiumSchemeStatus,
  setNotifications,
  setFetchingNotifications,
} = dataSlice.actions

export * from './selectors'

export * from './thunk'

export default dataSlice.reducer