import { useMemo, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Button, Row, Table, Switch, message } from 'antd'
import { PlusCircleFilled } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { getColumnSearch } from '../../utils/components'
import { getOptions } from '../../utils/utils'
import { fetchData, getScheduleList } from '../../redux/data'
import { updateSchedule } from '../../supabase/schedule'

export default function PageMatches() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector(state => state.user.profile)
  const isLoading = useSelector(state => state.data.isLoading)
  const schedule = useSelector(getScheduleList)
  const queryClient = useQueryClient()
  
  useEffect(() => {
    dispatch(fetchData())
  }, [])

  const handleSwitchTop = useCallback(async (match) => {
    const { id, top } = match
    try {
      console.log('📡 Updating match top status...', id, top)
      const result = await updateSchedule(id, { top: top ? '1' : '0' })
      
      if (result.error) {
        console.error('❌ Update match top error:', result.error)
        message.error(`Ошибка при обновлении матча: ${result.error.message || 'Неизвестная ошибка'}`)
        return
      }

      queryClient.invalidateQueries({ queryKey: ['data'] })
      dispatch(fetchData())
      message.success('Статус матча обновлен!')
    } catch (error) {
      console.error('❌ Update match top exception:', error)
      message.error(`Ошибка при обновлении матча: ${error.message || 'Неизвестная ошибка'}`)
    }
  }, [dispatch, queryClient])

  const options = useMemo(() => ({
    home: getOptions(schedule, 'team1.en'),
    away: getOptions(schedule, 'team2.en'),
    tournament: getOptions(schedule, 'tournament.en'),
    stadium: getOptions(schedule, item => item.stadium?.en || item.team1?.stadium?.en)
  }), [schedule])

  const columns = [
    {
      title: 'Team home',
      dataIndex: 'team1',
      key: 'team1',
      render: team => team && team.en,
      ...getColumnSearch('home', { getData: record => record.team1?.en, options: options.home })
    },
    {
      title: 'Team away',
      dataIndex: 'team2',
      key: 'team2',
      render: team => team && team.en,
      ...getColumnSearch('away', { getData: record => record.team2?.en, options: options.away })
    },
    {
      title: 'Tournament',
      dataIndex: 'tournament',
      key: 'tournament',
      render: tournament => tournament && tournament.en,
      ...getColumnSearch('tournament', { getData: record => record.tournament?.en, options: options.tournament })
    },
    {
      title: 'Stadium',
      dataIndex: 'stadium',
      key: 'stadium',
      render: (stadium, { team1 }) => stadium ? stadium.en : team1?.stadium?.en,
      ...getColumnSearch('stadium', { getData: record => record.stadium?.en || record.team1?.stadium?.en, options: options.stadium })
    },
    {
      title: 'Date',
      dataIndex: 'datetime',
      key: 'datetime',
      render: datetime => datetime,
      ...getColumnSearch('datetime', { type: 'date' })
    },
    {
      title: 'Top match',
      dataIndex: 'top',
      key: 'top',
      render: (top, match) => <Switch
        onClick={(val, e) => {
          e.stopPropagation()
          handleSwitchTop({ id: match.id, top: val })
        }}
        checked={Number(top)}
      />,
      filters: [{
        text: 'Only top matches',
        value: '1'
      }],
      onFilter: (value, record) => record.top === value
    }
  ]

  return (
    <>
      <Row
        style={{
          borderBottom: '1px solid #ccc',
          padding: '10px'
        }}
      >
        <Button
          icon={<PlusCircleFilled />}
          type='primary'
          onClick={() => navigate('/matches/create')}
        >
          Create match
        </Button>
      </Row>
      <Table
        columns={columns}
        dataSource={schedule}
        loading={isLoading}
        rowKey={({ id }) => id}
        onRow={record => ({
            onClick: () => user.u_role === '4' && navigate(`/matches/${record.id}`)
        })}
      />
    </>
  )
}