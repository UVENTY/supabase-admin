import { useState } from 'react'
import { Table, Button, Card, Row, Col, Form, Input, InputNumber, DatePicker, Switch, Tag, App } from 'antd'
import { PlusOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'
import dayjs from 'dayjs'
import { createPromocode, deletePromocode } from '../../supabase/promocode'
import { fetchData } from '../../redux/data'
import { supabase } from '../../supabase/client'

export default function PromocodesAccordion({ eventId, promocodes, messageApi, form }) {
  const [creatingPromocode, setCreatingPromocode] = useState(false)
  const [showCreatePromocodeForm, setShowCreatePromocodeForm] = useState(false)
  const [deletingPromocode, setDeletingPromocode] = useState(false)
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const { modal } = App.useApp()

  const handleCreatePromocode = async () => {
    try {
      const promocodeValues = form.getFieldValue('promocode_temp')
      if (!promocodeValues) {
        messageApi.error('Please fill in all required fields')
        return
      }

      if (!promocodeValues.value || !promocodeValues.discount || !promocodeValues.max_products || !promocodeValues.max_payments || !promocodeValues.limit) {
        messageApi.error('Please fill in all required fields')
        return
      }

      if (!eventId) {
        messageApi.error('Please save the event first before creating promocodes')
        return
      }

      setCreatingPromocode(true)

      const promocodeData = {
        value: promocodeValues.value,
        discount: promocodeValues.discount,
        max_products: promocodeValues.max_products,
        max_payments: promocodeValues.max_payments,
        limit: `${promocodeValues.limit.format('YYYY-MM-DD HH:mm:ss')}+03:00`,
        active: promocodeValues.active ? 1 : 0,
        json: '{}',
        schedule: [eventId]
      }

      await createPromocode(promocodeData)
      messageApi.success('Promocode created successfully!')
      
      form.setFieldsValue({
        promocode_temp: undefined
      })
      setShowCreatePromocodeForm(false)
      
      queryClient.invalidateQueries({ queryKey: ['data'] })
      dispatch(fetchData())
    } catch (error) {
      console.error('Error creating promocode:', error)
      messageApi.error(error.message || 'Error creating promocode')
    } finally {
      setCreatingPromocode(false)
    }
  }

  const handleDeletePromocode = (promocode) => {
    modal.confirm({
      title: 'Confirm Deletion',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: 'This action cannot be undone. Are you sure you want to delete this promocode?',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'No, Cancel',
      centered: true,
      maskClosable: false,
      onOk: async () => {
        setDeletingPromocode(true)
        try {
          const { error: linkError } = await supabase
            .from('promocode_schedule')
            .delete()
            .eq('id_promocode', promocode.id_promocode)

          if (linkError) {
            console.warn('Warning: Error deleting promocode_schedule links:', linkError)
          }

          const { error } = await supabase
            .from('promocode')
            .delete()
            .eq('id_promocode', promocode.id_promocode)

          if (error) throw error
          messageApi.success('Promocode deleted successfully')
          
          queryClient.invalidateQueries({ queryKey: ['data'] })
          dispatch(fetchData())
        } catch (error) {
          console.error('Error deleting promocode:', error)
          messageApi.error('Error deleting promocode: ' + error.message)
        } finally {
          setDeletingPromocode(false)
        }
      }
    })
  }

  return (
    <div>
      {promocodes && promocodes.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h4>Existing Promocodes</h4>
          <Table
            dataSource={promocodes}
            rowKey="id_promocode"
            pagination={false}
            size="small"
            columns={[
              {
                title: 'Promo Code',
                dataIndex: 'value',
                key: 'value',
                render: (text) => <strong>{text}</strong>
              },
              {
                title: 'Discount',
                dataIndex: 'discount',
                key: 'discount',
                render: (discount) => `${discount}%`
              },
              {
                title: 'Max Tickets',
                dataIndex: 'max_products',
                key: 'max_products'
              },
              {
                title: 'Max Orders',
                dataIndex: 'max_payments',
                key: 'max_payments'
              },
              {
                title: 'Status',
                dataIndex: 'active',
                key: 'active',
                render: (active) => (
                  <Tag color={active ? 'green' : 'red'}>
                    {active ? 'Active' : 'Inactive'}
                  </Tag>
                )
              },
              {
                title: 'Expiry Date',
                dataIndex: 'limit',
                key: 'limit',
                render: (date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'
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
                      handleDeletePromocode(record)
                    }}
                    disabled={deletingPromocode}
                    size="large"
                    block
                  >
                    Delete
                  </Button>
                )
              }
            ]}
          />
        </div>
      )}
      
      <h4 style={{ marginBottom: '16px' }}>Create New Promocodes</h4>
      {!showCreatePromocodeForm && (
        <Button 
          type="dashed" 
          onClick={() => setShowCreatePromocodeForm(true)} 
          block 
          icon={<PlusOutlined />}
          style={{ marginBottom: 16 }}
        >
          Add Promocode
        </Button>
      )}
      
      {showCreatePromocodeForm && (
        <Card
          size="small"
          style={{ marginBottom: 16 }}
          extra={
            <Button
              type="link"
              onClick={() => {
                setShowCreatePromocodeForm(false)
                form.setFieldsValue({
                  promocode_temp: undefined
                })
              }}
            >
              Cancel
            </Button>
          }
        >
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item
                name={['promocode_temp', 'value']}
                label="Promo Code"
                rules={[{ required: true, message: 'Enter promo code' }]}
              >
                <Input placeholder="e.g. SUMMER2025" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item
                name={['promocode_temp', 'discount']}
                label="Discount %"
                rules={[{ required: true, message: 'Enter discount' }]}
              >
                <InputNumber 
                  min={0} 
                  max={100} 
                  style={{ width: '100%' }}
                  placeholder="10"
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item
                name={['promocode_temp', 'max_products']}
                label="Max Tickets"
                rules={[{ required: true, message: 'Enter max tickets' }]}
              >
                <InputNumber 
                  min={1} 
                  style={{ width: '100%' }}
                  placeholder="100"
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item
                name={['promocode_temp', 'max_payments']}
                label="Max Orders"
                rules={[{ required: true, message: 'Enter max orders' }]}
              >
                <InputNumber 
                  min={1} 
                  style={{ width: '100%' }}
                  placeholder="50"
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name={['promocode_temp', 'limit']}
                label="Expiry Date"
                rules={[{ required: true, message: 'Select expiry date' }]}
              >
                <DatePicker 
                  showTime 
                  format="YYYY-MM-DD HH:mm:ss"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name={['promocode_temp', 'active']}
                label="Active"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <div style={{ marginTop: 24 }}>
            <Button 
              type="primary" 
              onClick={handleCreatePromocode}
              loading={creatingPromocode}
              block
            >
              Create Promocode
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
