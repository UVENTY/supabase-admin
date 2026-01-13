import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Button, Row, Table, App } from 'antd'
import { PlusOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { getColumnSearch } from '../../utils/components'
import { fetchData, getTournamentsList } from '../../redux/data'
import Sidebar from '../../components/Layout/sidebar'
import { supabase } from '../../supabase/client'

const getColumns = (handleDeleteTournament, deletingTournament) => [
  {
    title: 'Name',
    dataIndex: 'en',
    key: 'en',
    sorter: (a, b) => a.en.localeCompare(b.en),
    ...getColumnSearch('name', { getData: 'en' })
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 120,
    align: 'center',
    render: (_, record) => (
      <Button
        icon={<DeleteOutlined />}
        danger
        onClick={(e) => {
          e.stopPropagation()
          handleDeleteTournament(record)
        }}
        disabled={deletingTournament}
        size="large"
        block
      >
        Delete
      </Button>
    )
  }
]

export default function PageTournaments() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const isLoading = useSelector(state => state.data.isLoading)
  const tournaments = useSelector(getTournamentsList)
  const [deletingTournament, setDeletingTournament] = useState(false)
  const { message, modal } = App.useApp()

  useEffect(() => {
    dispatch(fetchData())
  }, [])
  
  const checkTournamentHasEvents = async (tournamentId) => {
    try {
      const { data, error } = await supabase
        .from('schedule')
        .select('id_schedule, id_tournament')
        .eq('id_tournament', tournamentId)
      
      if (error) {
        console.error('Error checking tournament events:', error)
        return []
      }
      
      return data || []
    } catch (error) {
      console.error('Error checking tournament events:', error)
      return []
    }
  }
  
  const handleDeleteTournament = async (tournament) => {
    const tournamentId = tournament.id || tournament.id_tournament
    
    const events = await checkTournamentHasEvents(tournamentId)
    
    if (events && events.length > 0) {
      const eventIds = events.map(e => e.id_schedule).join(', ')
      modal.warning({
        title: 'Cannot Delete Tournament',
        icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
        content: `This tournament cannot be deleted because it is linked to event(s): ${eventIds}. Please remove the tournament from the event(s) first.`,
        okText: 'OK',
        centered: true,
        maskClosable: false
      })
      return
    }
    
    modal.confirm({
      title: 'Confirm Deletion',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: 'This action cannot be undone. Are you sure you want to delete this tournament?',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'No, Cancel',
      centered: true,
      maskClosable: false,
      onOk: async () => {
        setDeletingTournament(true)
        try {
          const { error } = await supabase
            .from('tournament')
            .delete()
            .eq('id_tournament', tournamentId)

          if (error) throw error
          message.success('Tournament deleted successfully')
          
          dispatch(fetchData())
        } catch (error) {
          console.error('Error deleting tournament:', error)
          message.error('Error deleting tournament: ' + error.message)
        } finally {
          setDeletingTournament(false)
        }
      }
    })
  }

  return (
    <>
      <Sidebar buttons sticky>
        <Button icon={<PlusOutlined />} type='primary' onClick={() => navigate('/tournaments/create')} block>Create</Button>
      </Sidebar>
      <Table
        style={{ flex: '1 1 0'}}
        columns={getColumns(handleDeleteTournament, deletingTournament)}
        dataSource={tournaments || []}
        loading={isLoading}
        rowKey={({ id }) => id || 'unknown'}
        onRow={record => ({
            onClick: () => record.id && navigate(`/tournaments/${record.id}`)
        })}
      />
      <Sidebar />
    </>
  )
}