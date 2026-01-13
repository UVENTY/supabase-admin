export const defaultCustomProps = [
  {
    value: 'row',
    label: 'Row'
  }, {
    value: 'seat',
    label: 'Seat'
  }, {
    value: 'count',
    label: 'Tickets leave',
    type: 'number',
  }, {
    value: 'busyCount',
    label: 'Booking / Sold',
    type: 'number',
  }, {
    value: 'price',
    label: 'Price',
    type: 'number',
    groupEditable: true,
    system: true
  }, {
    value: 'icon',
    label: 'Place Icon',
    type: 'file',
    accept: '.svg',
    originalColors: false,
    groupEditable: true
  }, {
    value: 'text',
    label: 'Text',
    groupEditable: true
  }, {
    value: 'disabled',
    label: 'Disabled',
    type: 'checkbox',
    groupEditable: true
  }
]

export const seatClassName = 'svg-seat'
export const activeSeatClassName = 'active'
export const labelClass = 'ant-col ant-form-item-label'