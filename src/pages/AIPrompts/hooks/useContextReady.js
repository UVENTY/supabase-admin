import { useState, useEffect } from 'react'

export function useContextReady(selectedEvents, schedule, ticketsData, ticketsPurchases, isLoadingPurchases) {
  const [contextReady, setContextReady] = useState({}) 
  const [loadingContext, setLoadingContext] = useState({}) 

  const checkContextReady = (promptId, eventId) => {
    if (!eventId) {
      setContextReady(prev => ({ ...prev, [promptId]: false }))
      setLoadingContext(prev => ({ ...prev, [promptId]: false }))
      return false
    }

    const eventIdStr = String(eventId)

    if (!schedule || !schedule[eventIdStr]) {
      setContextReady(prev => ({ ...prev, [promptId]: false }))
      setLoadingContext(prev => ({ ...prev, [promptId]: true }))
      return false
    }
    if (!ticketsData || !ticketsData[eventIdStr]) {
      setContextReady(prev => ({ ...prev, [promptId]: false }))
      setLoadingContext(prev => ({ ...prev, [promptId]: true }))
      return false
    }

    const hasPurchasesData = ticketsPurchases && ticketsPurchases[eventIdStr]
    const isEventSelected = Object.values(selectedEvents).some(id => String(id) === eventIdStr)
    
    const isContextReady = true 
    const isLoading = !hasPurchasesData && isEventSelected && isLoadingPurchases
    
    setContextReady(prev => ({ ...prev, [promptId]: isContextReady }))
    setLoadingContext(prev => ({ ...prev, [promptId]: isLoading }))
    return isContextReady
  }

  useEffect(() => {
    const timers = []
    
    for (const [promptId, eventId] of Object.entries(selectedEvents)) {
      if (eventId) {
        const timer = setTimeout(() => {
          checkContextReady(promptId, eventId)
        }, 300)
        timers.push(timer)
      } else {
        setContextReady(prev => ({ ...prev, [promptId]: false }))
        setLoadingContext(prev => ({ ...prev, [promptId]: false }))
      }
    }
    
    return () => {
      timers.forEach(timer => clearTimeout(timer))
    }
  }, [selectedEvents, schedule, ticketsData, ticketsPurchases, isLoadingPurchases])

  return { contextReady, setContextReady, loadingContext, setLoadingContext }
}
