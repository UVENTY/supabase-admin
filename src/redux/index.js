import { configureStore } from '@reduxjs/toolkit'
import configReducer from './config'
import dataReducer from './data'
import ticketsReducer from './tickets'
import userReducer from './user'
import usersReducer from './users'

export default configureStore({
  reducer: {
    config: configReducer,
    data: dataReducer,
    tickets: ticketsReducer,
    user: userReducer,
    users: usersReducer,
  },
})