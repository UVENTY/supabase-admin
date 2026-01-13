import { createSlice } from '@reduxjs/toolkit'

export const ticketsSlice = createSlice({
  name: 'tickets',
  initialState: {
    isLoading: false,
    isLoaded: false,
    ticketsByMatch: {},
    ticketsWithFile: {}
  },
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload
    },
    setLoaded: (state, action) => {
      state.isLoaded = action.payload
    },
    setTicketByMatch: (state, action) => {
      state.ticketsByMatch = action.payload
    },
    setTicketsFile: (state, action) => {
      Object.keys(action.payload).forEach(seatId => {
        state.ticketsWithFile[seatId] = action.payload[seatId]
      })
    }
  },
})

export const {
  setLoading,
  setLoaded,
  setTicketByMatch,
  setTicketsFile,
} = ticketsSlice.actions

export * from './selectors'

export * from './thunk'

export default ticketsSlice.reducer