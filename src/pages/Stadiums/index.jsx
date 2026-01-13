import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Button, Row, Table, App } from 'antd'
import { PlusOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { getColumnSearch } from '../../utils/components'
import { getOptions } from '../../utils/utils'
import { fetchData, getStadiumsList } from '../../redux/data'
import { getCountries } from '../../redux/config'
import Sidebar from '../../components/Layout/sidebar'
import { supabase } from '../../supabase/client'

export default function PageStadiums() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const isLoading = useSelector(state => state.data.isLoading)
  const stadiums = useSelector(getStadiumsList)
  const countries = useSelector(getCountries)
  const [deletingStadium, setDeletingStadium] = useState(false)
  const { message, modal } = App.useApp()

  useEffect(() => {
    dispatch(fetchData())
  }, [])
  
  const checkStadiumHasEvents = async (stadiumId) => {
    try {
      const { data, error } = await supabase
        .from('schedule')
        .select('id_schedule, id_stadium')
        .eq('id_stadium', stadiumId)
      
      if (error) {
        console.error('Error checking stadium events:', error)
        return []
      }
      
      return data || []
    } catch (error) {
      console.error('Error checking stadium events:', error)
      return []
    }
  }
  
  const handleDeleteStadium = async (stadium) => {
    const stadiumId = stadium.id || stadium.id_stadium
    
    const events = await checkStadiumHasEvents(stadiumId)
    
    if (events && events.length > 0) {
      const eventIds = events.map(e => e.id_schedule).join(', ')
      modal.warning({
        title: 'Cannot Delete Stadium',
        icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
        content: `This stadium cannot be deleted because it is linked to event(s): ${eventIds}. Please remove the stadium from the event(s) first.`,
        okText: 'OK',
        centered: true,
        maskClosable: false
      })
      return
    }
    
    modal.confirm({
      title: 'Confirm Deletion',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: 'This action cannot be undone. Are you sure you want to delete this stadium?',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'No, Cancel',
      centered: true,
      maskClosable: false,
      onOk: async () => {
        setDeletingStadium(true)
        try {
          const { error } = await supabase
            .from('stadium')
            .delete()
            .eq('id_stadium', stadiumId)

          if (error) throw error
          message.success('Stadium deleted successfully')
          
          dispatch(fetchData())
        } catch (error) {
          console.error('Error deleting stadium:', error)
          message.error('Error deleting stadium: ' + error.message)
        } finally {
          setDeletingStadium(false)
        }
      }
    })
  }

  const countriesOptions = useMemo(() => getOptions(Object.values(countries), 'en'), [countries])

  const columns = [
    {
      width: 200,
      title: 'Name',
      dataIndex: 'en',
      key: 'en',
      ...getColumnSearch('name', { getData: 'en' }),
    },
    {
      width: 300,
      title: 'Country',
      dataIndex: 'country',
      key: 'country',
      sorter: (a, b) => (a.country || '').localeCompare(b.country || ''),
      render: id => countries[id]?.en,
      ...getColumnSearch('country', { getData: record => countries[record.country]?.en, options: countriesOptions }),
    },
    {
      title: 'Address',
      dataIndex: 'address_en',
      key: 'address_en',
      ...getColumnSearch('address', { getData: 'address_en' }),
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
            handleDeleteStadium(record)
          }}
          disabled={deletingStadium}
          size="large"
          block
        >
          Delete
        </Button>
      )
    }
  ]

  return (
    <>
      <Sidebar buttons sticky>
        <Button icon={<PlusOutlined />} type='primary' onClick={() => navigate('/stadiums/create')} block>Create</Button>
      </Sidebar>
      <Table
        style={{ flex: '1 1 0'}}
        columns={columns}
        dataSource={stadiums}
        loading={isLoading}
        rowKey={({ id }) => id}
        onRow={record => ({
            onClick: () => navigate(`/stadiums/${record.id}`)
        })}
      />
      <Sidebar />
    </>
  )
}