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
    ticketsPurchases: {}, 
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
    },
    setTicketsPurchases: (state, action) => {
      const { eventId, tickets } = action.payload
      if (eventId && tickets) {
        state.ticketsPurchases[String(eventId)] = tickets.map(ticket => {
          let dateString = null
          if (ticket.sold_info && ticket.sold_info.date) {
            if (typeof ticket.sold_info.date === 'string') {
              dateString = ticket.sold_info.date
            } else if (ticket.sold_info.date && typeof ticket.sold_info.date.format === 'function') {
              dateString = ticket.sold_info.date.format('YYYY-MM-DD')
            } else if (ticket.sold_info.date instanceof Date) {
              dateString = new Date(ticket.sold_info.date).toISOString().split('T')[0]
            }
          }
          
          return {
            section: ticket.section,
            row: ticket.row,
            seat: ticket.seat,
            tariff: ticket.tariff,
            currency: ticket.currency,
            status: ticket.status,
            sold_info: ticket.sold_info ? {
              user_id: ticket.sold_info.user_id,
              buy_id: ticket.sold_info.buy_id,
              date: dateString
            } : null
          }
        })
      }
    },
    clearTicketsPurchases: (state, action) => {
      const { eventId } = action.payload
      if (eventId) {
        delete state.ticketsPurchases[String(eventId)]
      } else {
        state.ticketsPurchases = {}
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
  setTicketsPurchases,
  clearTicketsPurchases,
} = dataSlice.actions

export * from './selectors'

export * from './thunk'

export default dataSlice.reducer