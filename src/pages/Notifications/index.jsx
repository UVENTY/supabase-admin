import { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Table } from 'antd'
import { fetchData, fetchNotifications, getNotifications } from '../../redux/data'
import { getColumnSearch } from '../../utils/components'
import { getOptions } from '../../utils/utils'

export default function PageNotifications() {
  const dispatch = useDispatch()
  const isLoading = useSelector(state => state.data.isFetchingNotifications)
  const notifications = useSelector(getNotifications)

  useEffect(() => {
    dispatch(fetchData())
    dispatch(fetchNotifications)
  }, [])

  const homeOptions = useMemo(() => getOptions(Object.values(notifications), 'match.team1.en'), [notifications])
  const awayOptions = useMemo(() => getOptions(Object.values(notifications), 'match.team2.en'), [notifications])
  const tournamentOptions = useMemo(() => getOptions(Object.values(notifications), 'match.tournament.en'), [notifications])

  const columns = [
    {
      width: 100,
      title: 'User id',
      dataIndex: 'u_id',
      key: 'user',
      ...getColumnSearch('user', { getData: 'u_id' })
    },
    {
      width: 250,
      title: 'User name',
      dataIndex: 'user',
      key: 'name',
      render: ({ name, middle, family }) => [name, middle, family].filter(s => s).join(' '),
      ...getColumnSearch('name', { getData: ({ user: { name, middle, family } }) => [name, middle, family].filter(s => s).join(' ') })
    },
    {
      width: 200,
      title: 'Team home',
      dataIndex: 'match',
      key: 'home',
      render: match => match.team1.en,
      sorter: (a, b) => (a.match?.team1?.en || '').localeCompare(b.match?.team1?.en),
      ...getColumnSearch('home', { getData: record => record.match?.team1?.en, options: homeOptions })
    },
    {
      width: 200,
      title: 'Team away',
      dataIndex: 'match',
      key: 'away',
      render: match => match.team2.en,
      sorter: (a, b) => (a.match?.team2?.en || '').localeCompare(b.match?.team2?.en),
      ...getColumnSearch('away', { getData: record => record.match?.team2?.en, options: awayOptions })
    },
    {
      width: 200,
      title: 'Tournament',
      dataIndex: 'match',
      key: 'tournament',
      render: match => match?.tournament?.en,
      ...getColumnSearch('tournament', { getData: record => record.tournament?.en, options: tournamentOptions })
    },
    {
      width: 200,
      title: 'Date',
      dataIndex: 'match',
      key: 'date',
      render: match => match?.datetime,
      sorter: (a, b) => new Date(a.match?.datetime).getTime() - new Date(b.match?.datetime).getTime(),
      ...getColumnSearch('date', { getData: record => record.match?.datetime, type: 'date' })
    },
    {
      title: 'Blocks',
      dataIndex: 'blocks',
      key: 'blocks',
      render: blocks => Array.isArray(blocks) ? blocks.join(', ') : '',
      ...getColumnSearch('blocks', { getData: ({ blocks }) => Array.isArray(blocks) ? blocks.join(', ') : '' })
    }
  ]

  return (
    <Table
      columns={columns}
      dataSource={notifications}
      loading={isLoading}
      rowKey={({ id }) => id}
    />
  )
}