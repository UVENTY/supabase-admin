import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Button, Row, Table, App } from 'antd'
import { PlusOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { fetchData, getTeams } from '../../redux/data'
import { getCities, getCountries } from '../../redux/config'
import { getColumnSearch } from '../../utils/components'
import { getOptions } from '../../utils/utils'
import Sidebar from '../../components/Layout/sidebar'
import { supabase } from '../../supabase/client'

export default function PageTeams() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const isLoading = useSelector(state => state.data.isLoading)
  const teams = useSelector(getTeams)
  const cities = useSelector(getCities)
  const countries = useSelector(getCountries)
  const [deletingTeam, setDeletingTeam] = useState(false)
  const { message, modal } = App.useApp()

  const citiesOptions = useMemo(() => getOptions(Object.values(cities), 'en'), [cities])
  const countriesOptions = useMemo(() => getOptions(Object.values(countries), 'en'), [countries])
  
  const checkTeamHasEvents = async (teamId) => {
    try {
      const { data, error } = await supabase
        .from('schedule')
        .select('id_schedule, team1, team2')
        .or(`team1.eq.${teamId},team2.eq.${teamId}`)
      
      if (error) {
        console.error('Error checking team events:', error)
        return []
      }
      
      return data || []
    } catch (error) {
      console.error('Error checking team events:', error)
      return []
    }
  }
  
  const handleDeleteTeam = async (team) => {
    const teamId = team.id || team.id_team
    
    const events = await checkTeamHasEvents(teamId)
    
    if (events && events.length > 0) {
      const eventIds = events.map(e => e.id_schedule).join(', ')
      modal.warning({
        title: 'Cannot Delete Team',
        icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
        content: `This team cannot be deleted because it is linked to event(s): ${eventIds}. Please remove the team from the event(s) first.`,
        okText: 'OK',
        centered: true,
        maskClosable: false
      })
      return
    }
    
    modal.confirm({
      title: 'Confirm Deletion',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: 'This action cannot be undone. Are you sure you want to delete this team?',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'No, Cancel',
      centered: true,
      maskClosable: false,
      onOk: async () => {
        setDeletingTeam(true)
        try {
          const { error } = await supabase
            .from('team')
            .delete()
            .eq('id_team', teamId)

          if (error) throw error
          message.success('Team deleted successfully')
          
          dispatch(fetchData())
        } catch (error) {
          console.error('Error deleting team:', error)
          message.error('Error deleting team: ' + error.message)
        } finally {
          setDeletingTeam(false)
        }
      }
    })
  }

  const columns = [
    {
      title: 'Country',
      dataIndex: 'country',
      key: 'country',
      width: 180,
      sorter: (a, b) => a.country.localeCompare(b.country),
      render: id => countries[id].en,
      ...getColumnSearch('country', { getData: record => countries[record.country].en, options: countriesOptions }),
    },
    {
      title: 'Logo',
      dataIndex: 'logo',
      key: 'logo',
      width: 40,
      render: src => (<img src={src} width={32} />)
    },
    {
      title: 'Name',
      dataIndex: 'en',
      key: 'en',
      sorter: (a, b) => a.country.localeCompare(b.country),
      ...getColumnSearch('name', { getData: 'en' }),
    },
    {
      title: 'City',
      dataIndex: 'city',
      key: 'city',
      render: cityId => cities[cityId]?.en,
      ...getColumnSearch('city', { getData: record => cities[record.city]?.en, options: citiesOptions }),
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
            handleDeleteTeam(record)
          }}
          disabled={deletingTeam}
          size="large"
          block
        >
          Delete
        </Button>
      )
    }
  ]

  useEffect(() => {
    dispatch(fetchData())
  }, [])

  return (
    <>
      <Sidebar buttons sticky>
        <Button icon={<PlusOutlined />} type='primary' onClick={() => navigate('/teams/create')} block>Create</Button>
      </Sidebar>
      <Table
        style={{ flex: '1 1 0'}}
        columns={columns}
        dataSource={teams}
        loading={isLoading}
        rowKey={({ id }) => id}
        onRow={record => ({
            onClick: () => navigate(`/teams/${record.id}`)
        })}
      />
      <Sidebar />
    </>
  )
}