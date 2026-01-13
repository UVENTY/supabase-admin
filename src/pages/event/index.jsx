import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Button, Table } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { fetchData } from '../../redux/data'
import TicketsApi from '../../api/tickets'
import dayjs from 'dayjs'
import Sidebar from '../../components/Layout/sidebar'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../supabase/client'

export default function PageEvent() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector(state => state.user.profile)

  const schedule = useSelector(state => state.data.schedule || {})
  const stadiums = useSelector(state => state.data.stadiums || {})
  const teams = useSelector(state => state.data.teams || {})
  const tournaments = useSelector(state => state.data.tournaments || {})
  const isLoading = useSelector(state => state.data.isLoading)
  
  const events = Object.keys(schedule).map(id => {
    const event = { ...schedule[id] }
    const { stadium, tournament, team1 } = event
    if (stadiums[stadium]) event.stadium = { id: stadium, ...stadiums[stadium] }
    if (tournaments[tournament]) event.tournament = { id: tournament, ...tournaments[tournament] }
    if (teams[team1]) event.team1 = { id: team1, ...teams[team1] }
    return { id, date: dayjs(event.datetime), ...event }
  })
  
  const eventIds = events.map(e => e.id)
  const { data: allTickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ['all-tickets', eventIds],
    queryFn: async () => {
      if (eventIds.length === 0) return {}
      
      const { data: tickets, error } = await supabase
        .from('ticket')
        .select('id_schedule, id_seat, section, row, seat, status')
        .in('id_schedule', eventIds)
      
      if (error) {
        console.error('Error fetching all tickets:', error)
        return {}
      }
      
      const grouped = {}
      tickets.forEach(ticket => {
        const eventId = String(ticket.id_schedule)
        if (!grouped[eventId]) {
          grouped[eventId] = []
        }
        grouped[eventId].push(ticket)
      })
      
      return grouped
    },
    enabled: eventIds.length > 0
  })
  
  const tickets = {
    data: allTickets || {},
    isLoading: ticketsLoading
  }
  
  useEffect(() => {
    dispatch(fetchData())
  }, [dispatch])

  const columns = [
    {
      title: 'Artist',
      dataIndex: 'team1',
      key: 'team1',
      render: team => team && (team.en || team.name_en || ''),
    },
    {
      title: 'Hall',
      dataIndex: 'stadium',
      key: 'stadium',
      render: (stadium) => stadium ? (stadium.en || stadium.name_en || '') : null,
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: date => date.format('DD.MM.YYYY'),
    },
    {
      key: 'tickets',
      title: 'Number of tickets',
      render: ({ id }) => tickets.data && tickets.data[id]?.length
    }
  ]

  return (
    <>
      <Sidebar buttons sticky>
        <Button icon={<PlusOutlined />} type='primary' onClick={() => navigate(`/event/create`)} block>Create</Button>
      </Sidebar>
      <Table
        style={{ flex: '1 1 0'}}
        className='event-table'
        columns={columns}
        dataSource={events}
        loading={isLoading}
        rowKey={({ id }) => id}
        onRow={record => ({
          onClick: () => user.u_role === '4' && navigate(`/event/${record.id}`)
        })}
      />
      <Sidebar />
    </>
  )
}