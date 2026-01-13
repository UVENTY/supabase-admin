import { SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import ColumnFilter from '../components/ColumnFilter'

export const getColumnSearch = (name, { getData, options = [], type } = {}) => {
  const searchParams = new URL(window.document.location).searchParams
  let result = {}
  if (searchParams && searchParams.get(name)) {
    result.defaultFilteredValue = [searchParams.get(name)]
  }
  result = {
    ...result,
    filterDropdown: props => (
      <ColumnFilter
        {...props}
        type={type || (options.length > 0 ? 'select' : 'input')}
        options={options}
        name={name}
        showSearch
      />
    ),
    filterIcon: (filtered) => (
      <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
    ),
    onFilter: (value, record) => {
      const dataValue = getData ? (typeof getData === 'function' ? getData(record) : record[getData]) : record[name]
      if (type === 'date') {
        return dayjs(dataValue).isSame(value, 'day')
      }
      return (dataValue || '').toString().toLowerCase().includes((value).toLowerCase())
    }
  }
  return result
}