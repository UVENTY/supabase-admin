import { useState, forwardRef, useImperativeHandle } from 'react'
import { Form, Input, Select, Button, Row, Col, App } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { USER_ROLES } from '../../consts'
import { createUser, checkUserExists } from '../../supabase/users'

const { Option } = Select

const CreateUser = forwardRef(function CreateUser({ onUserCreated, eventId, onCancel, onLoadingChange }, ref) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  useImperativeHandle(ref, () => ({
    submit: () => {
      form.submit()
    }
  }))

  const setLoadingState = (value) => {
    setLoading(value)
    if (onLoadingChange) {
      onLoadingChange(value)
    }
  }
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { message } = App.useApp()

  const handleSubmit = async (values) => {
    setLoadingState(true)
    try {
      if (!values.name || values.name.trim() === '') {
        message.error('Please enter name!')
        setLoadingState(false)
        return
      }
      if (!values.email || values.email.trim() === '') {
        message.error('Please enter email!')
        setLoadingState(false)
        return
      }
      if (!values.phone || values.phone.trim() === '') {
        message.error('Please enter phone!')
        setLoadingState(false)
        return
      }

      console.log('📡 Creating user via Supabase...')
      console.log('📋 Form values:', values)
      const roleId = values.id_role || values.role || (eventId ? '6' : undefined) || '1'
      console.log('🔑 Role ID:', roleId, 'from values.id_role:', values.id_role, 'from values.role:', values.role, 'eventId:', eventId)
      const { data, error } = await createUser({
        email: values.email,
        name: values.name,
        family: values.family,
        middle: values.middle,
        phone: values.phone,
        id_role: roleId,
        pwd: values.pwd,
        id_schedule: values.id_schedule || eventId || null 
      })

      if (error) {
        console.error('❌ Error creating user:', error)
        const errorMessage = error.message || 'Error creating user'
        message.error(`Error creating user: ${errorMessage}`)
        setLoadingState(false)
        return
      }

      if (data) {
        console.log('✅ User created successfully:', data.id_user)
        form.resetFields()
        
        queryClient.invalidateQueries({ queryKey: ['users'] })
        
        if (onUserCreated) {
          onUserCreated()
        } else {
          setTimeout(() => {
            navigate('/users')
          }, 1500)
        }
        
        message.success('Controller created/updated successfully!')
        message.info(`Controller can login to tickets-control using email: ${values.email} and the password`)
      } else {
        message.error('Error creating user')
        setLoadingState(false)
      }
    } catch (error) {
      console.error('Error creating user:', error)
      message.error('Error creating user')
      setLoadingState(false)
    }
  }

  const roleOptions = Object.entries(USER_ROLES).map(([value, label]) => ({ value, label }))

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      component="div"
      initialValues={{ 
        id_role: eventId ? '6' : undefined, 
        active: true, 
        id_schedule: eventId || undefined 
      }}
    >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="name"
                  label="Name"
                  rules={[{ required: true, message: 'Please enter name!' }]}
                >
                  <Input placeholder="Enter name" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="family"
                  label="Last Name"
                >
                  <Input placeholder="Enter last name" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="id_role"
                  label="Role"
                  rules={[{ required: true, message: 'Please select role!' }]}
                >
                  <Select placeholder="Select role">
                    {roleOptions.map(option => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="id_schedule"
                  label="Event ID"
                  tooltip={eventId ? `Controller will be linked to event ${eventId}` : "If not specified, controller can check tickets for all events"}
                >
                  <Input 
                    placeholder={eventId ? `Event ${eventId}` : "Enter event ID (leave empty for all events)"}
                    disabled={!!eventId}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[
                    { required: true, message: 'Please enter email!' },
                    { type: 'email', message: 'Please enter a valid email!' }
                  ]}
                >
                  <Input placeholder="Enter email" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="phone"
                  label="Phone"
                  rules={[{ required: true, message: 'Please enter phone!' }]}
                >
                  <Input placeholder="Enter phone" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="pwd"
                  label="Password"
                  rules={[
                    { required: true, message: 'Please enter password!' },
                    { min: 6, message: 'Password must be at least 6 characters!' }
                  ]}
                >
                  <Input.Password placeholder="Enter password" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="confirmPassword"
                  label="Confirm Password"
                  dependencies={['pwd']}
                  rules={[
                    { required: true, message: 'Please confirm password!' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('pwd') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('Passwords do not match!'));
                      },
                    }),
                  ]}
                >
                  <Input.Password placeholder="Confirm password" />
                </Form.Item>
              </Col>
            </Row>
    </Form>
  )
})

export default CreateUser 