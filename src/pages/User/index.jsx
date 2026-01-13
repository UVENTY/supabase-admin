import { useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
import { Avatar, Col, Row, Tag, Switch } from 'antd'
import { fetchUser, updateUser } from '../../redux/users'
import { USER_ROLES, USER_ROLES_COLOR } from '../../consts'

export default function PageUser() {
  const dispatch = useDispatch()
  const profile = useSelector(state => state.users.currentProfile)
  const isUpdating = useSelector(state => state.users.isUpdating)
  const { id } = useParams()

  useEffect(() => {
    dispatch(fetchUser(id))
  }, [id])

  const changeStatus = useCallback((checked) => {
    if (!profile) return
    const state = checked ? '2' : null
    dispatch(updateUser(id, { u_check_state: state }))
  }, [profile, id])

  if (!profile) {
    return null
  }

  return (
    <Row style={{ margin: '0 100px', flex: '1 1 0' }}>
      <Col span={4}>
        <Avatar
          style={{ width: '128px', height: '128px', fontSize: '64px', lineHeight: '120px' }}
          src={profile.u_photo}
        >
          {(profile.u_name || '?')[0].toUpperCase()}
        </Avatar>
      </Col>
      <Col>
        {profile.u_name || 'No name'}<br />
        {profile.u_email || 'No email'}<br />
        <Tag color={USER_ROLES_COLOR[profile.u_role]}>{USER_ROLES[profile.u_role]}</Tag>
        {profile.u_role === '2' && <div style={{ marginTop: 20 }}>
          <Switch
            checked={profile.u_check_state === '2'}
            onChange={changeStatus}
            loading={isUpdating}
          />
          <span style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 5 }}>Checked seller</span>
        </div>}
      </Col>
    </Row>
  )
}