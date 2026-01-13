import { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Row, Table } from 'antd'
import { PlusCircleFilled, CaretLeftFilled } from '@ant-design/icons'
import TicketsForm from '../../components/TicketsForm'
import { fetchTicketGroups, fetchAllTickets, getMatchTickets } from '../../redux/tickets'
import { fetchData, getSchedule } from '../../redux/data'
import { getIsAdmin } from '../../redux/user'
import { getColumnSearch } from '../../utils/components'
import { getOptions } from '../../utils/utils'
import TicketsApi from '../../api/tickets'

function MatchList({ schedule }) {
  const navigate = useNavigate()
  const groups = useSelector(getMatchTickets)
  const isLoading = useSelector(state => state.tickets.isLoading)
  
  const { items, homeOptions, awayOptions, tournamentOptions } = useMemo(() => {
    const items = groups.map(group => ({
      ...group,
      match: schedule[group.matchId]
    }))
      .filter(item => item.match)
    const homeOptions = getOptions(items, 'match.team1.en')
    const awayOptions = getOptions(items, 'match.team2.en')
    const tournamentOptions = getOptions(items, 'match.tournament.en')

    return { items, homeOptions, awayOptions, tournamentOptions }
  }, [groups, schedule])

  const columns = [
    {
      title: 'Tournament',
      dataIndex: 'match',
      key: 'tournament',
      render: match => match.tournament && match.tournament?.en,
      sorter: (a, b) => a.match?.tournament?.en?.localeCompare(b.match?.tournament?.en),
      ...getColumnSearch('tournament', { getData: record => record.match?.tournament?.en, options: tournamentOptions })
    },
    {
      title: 'Team home',
      dataIndex: 'match',
      key: 'home',
      render: match => match.team1.en,
      sorter: (a, b) => (a.match?.team1?.en || '').localeCompare(b.match?.team1?.en),
      ...getColumnSearch('home', { getData: record => record.match?.team1?.en, options: homeOptions })
    },
    {
      title: 'Team away',
      dataIndex: 'match',
      key: 'away',
      render: match => match.team2.en,
      sorter: (a, b) => (a.match?.team2?.en || '').localeCompare(b.match?.team2?.en),
      ...getColumnSearch('away', { getData: record => record.match?.team2?.en, options: awayOptions })
    },
    {
      title: 'Tickets',
      dataIndex: 'tickets',
      key: 'tickets',
      render: tickets => `${tickets.length} ${tickets.length === 1 ? 'ticket' : 'tickets'}`
    }
  ]

  return (
    <Table
      columns={columns}
      dataSource={items}
      loading={isLoading}
      rowKey={({ matchId }) => matchId}
      onRow={record => ({
          onClick: () => navigate(`/tickets/${record.matchId}`)
      })}
    />
  )
}

export default function PageTickets() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const params = useParams()
  const schedule = useSelector(getSchedule)
  const dataLoaded = useSelector(state => state.data.isLoaded)
  const isAdmin = useSelector(getIsAdmin)
  const t = TicketsApi.useTickets({ limit: 10, skip: 10 })
  
  const isAddPage = params.matchId === 'add'
  const isMatchPage = !!params.matchId
  
  useEffect(() => {
    if (isAdmin) {
      dispatch(fetchAllTickets)
    } else {
      dispatch(fetchTicketGroups)
    }
  }, [isAdmin])

  useEffect(() => {
    if (!Object.keys(schedule).length) {
      dispatch(fetchData())
    }
  }, [schedule])

  return (
    <>
      <Row
        style={{
          borderBottom: '1px solid #ccc',
          padding: '10px'
        }}
      >
        {isMatchPage && <Button
          icon={<CaretLeftFilled />}
          style={{ marginRight: '10px' }}
          onClick={() => navigate('/tickets')}
        >
          Back
        </Button>}
        {!isMatchPage && !isAdmin && <Button
          icon={<PlusCircleFilled />}
          style={{ marginRight: '10px' }}
          type='primary'
          onClick={() => navigate('/tickets/add')}
        >
          Add tickets
        </Button>}
      </Row>
      {!isMatchPage &&
        <MatchList
          schedule={schedule}
        />
      }
      {isMatchPage && dataLoaded &&
        <TicketsForm
          isAdmin={isAdmin}
          matchId={!isAddPage && params.matchId}
        />
      }
    </>
  )
}