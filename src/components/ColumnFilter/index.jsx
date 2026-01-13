import { useMemo } from 'react'
import { Button, Calendar, Input, Select } from 'antd'
import { useSearchParams, useLocation } from 'react-router-dom'
import { SearchOutlined } from '@ant-design/icons'

export default function ColumnFilter({
  placeholder = 'Search',
  type = 'input',
  showSearch,
  options = [],
  setSelectedKeys,
  selectedKeys,
  confirm,
  clearFilters,
  name
}) {
  const [ searchParams, setSearchParams ] = useSearchParams()
  const isInput = type === 'input'
  const isSelect = type === 'select'
  const isDate = type === 'date'
  const selectOptions = useMemo(() => {
    if (!Array.isArray(options)) return
    return options.map(item => item.value ? item : ({ value: item, label: item }))
  }, [options])

  const addSearchParam = (name, val) => {
    const params = {}
    for (const [ key, value ] of searchParams) {
      if (key !== name) {
        params[key] = value
      }
    }
    if (val) {
      params[name] = val
    }
    setSearchParams(params)
  }

  return (
    <div style={{ padding: 10 }} onKeyDown={e => e.stopPropagation()}>
      <div style={{ minWidth: 200, maxWidth: 300 }}>
        {isInput && <Input
          placeholder={placeholder}
          value={selectedKeys[0]}
          onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => {
            addSearchParam(name, selectedKeys[0])
            confirm()
          }}
          style={{ width: '100%', marginBottom: 8 }}
        />}
        {isSelect && <Select
          placeholder={placeholder}
          value={selectedKeys[0]}
          onChange={value => {
            addSearchParam(name, String(value))
            setSelectedKeys(value ? [String(value)] : [])
          }}
          onSelect={() => confirm()}
          onPressEnter={() => confirm()}
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={selectOptions}
          showSearch={showSearch}
          style={{ width: '100%', marginBottom: 8 }}
        />}
        {isDate && <Calendar
          fullscreen={false}
          value={selectedKeys[0]}
          onChange={date => setSelectedKeys([date])}
        />}
      </div>
      <div>
        {(isInput || isDate) && <Button
          type='primary'
          onClick={() => {
            addSearchParam(name, selectedKeys[0])
            confirm()
          }}
          icon={<SearchOutlined />}
          size='small'
          style={{ width: '100%', marginBottom: 8 }}
        >
          Search
        </Button>}
        <Button
          onClick={() => {
            clearFilters && clearFilters()
            addSearchParam(name)
            confirm()
          }}
          size='small'
          style={{ width: '100%' }}
        >
          Reset
        </Button>
      </div>
    </div>
  )
}