import React, { forwardRef, useImperativeHandle, useEffect } from 'react'
import { Form, Input, Switch, App } from 'antd'
import { supabase } from '../../supabase/client'

const StripeAccountForm = forwardRef(function StripeAccountForm({ editingAccount, onSaved, onLoadingChange }, ref) {
  const [form] = Form.useForm()
  const { message } = App.useApp()

  useImperativeHandle(ref, () => ({
    submit: () => {
      form.submit()
    }
  }))

  useEffect(() => {
    if (editingAccount) {
      form.setFieldsValue(editingAccount)
    } else {
      form.resetFields()
      form.setFieldsValue({
        active: true,
        is_test_mode: false
      })
    }
  }, [editingAccount, form])

  const handleSubmit = async (values) => {
    try {
      if (onLoadingChange) {
        onLoadingChange(true)
      }

      const accountData = {
        name: values.name,
        description: values.description,
        secret_key_live: values.secret_key_live,
        publishable_key_live: values.publishable_key_live,
        secret_key_test: values.secret_key_test || null,
        publishable_key_test: values.publishable_key_test || null,
        is_test_mode: values.is_test_mode || false,
        active: values.active !== undefined ? values.active : true
      }

      if (editingAccount) {
        const { error } = await supabase
          .from('stripe_accounts')
          .update(accountData)
          .eq('id_stripe_account', editingAccount.id_stripe_account)

        if (error) throw error
        message.success('Account updated')
      } else {
        const { error } = await supabase
          .from('stripe_accounts')
          .insert(accountData)

        if (error) throw error
        message.success('Account created')
      }

      form.resetFields()
      if (onSaved) {
        onSaved()
      }
    } catch (error) {
      console.error('Error saving stripe account:', error)
      
      let errorMessage = 'Error saving: ' + error.message
      
      if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique')) {
        errorMessage = 'Account with this name already exists. Please use a different name.'
      } else if (error.code === '23514' || error.message?.includes('check constraint')) {
        errorMessage = 'Invalid key format. Live keys must start with sk_live_/pk_live_, test keys with sk_test_/pk_test_'
      } else if (error.code === '23502' || error.message?.includes('null value')) {
        errorMessage = 'Required fields are missing. Please fill in all required fields.'
      }
      
      message.error(errorMessage)
    } finally {
      if (onLoadingChange) {
        onLoadingChange(false)
      }
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      component="div"
    >
      <Form.Item
        name="name"
        label="Account Name"
        rules={[{ required: true, message: 'Enter account name' }]}
      >
        <Input placeholder="e.g., Production Account" />
      </Form.Item>

      <Form.Item
        name="description"
        label="Description"
      >
        <Input.TextArea placeholder="Account description" />
      </Form.Item>

      <Form.Item
        name="is_test_mode"
        label="Test Mode"
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>

      <Form.Item
        name="active"
        label="Active"
        valuePropName="checked"
        initialValue={true}
      >
        <Switch />
      </Form.Item>

      <div style={{ border: '1px solid #d9d9d9', padding: 16, marginBottom: 16, borderRadius: 6 }}>
        <h4>Live Keys (Production)</h4>
        <Form.Item
          name="secret_key_live"
          label="Secret Key Live"
          rules={[
            { required: true, message: 'Enter Secret Key' },
            { pattern: /^sk_live_/, message: 'Must start with sk_live_' }
          ]}
        >
          <Input.Password placeholder="sk_live_..." />
        </Form.Item>

        <Form.Item
          name="publishable_key_live"
          label="Publishable Key Live"
          rules={[
            { required: true, message: 'Enter Publishable Key' },
            { pattern: /^pk_live_/, message: 'Must start with pk_live_' }
          ]}
        >
          <Input placeholder="pk_live_..." />
        </Form.Item>
      </div>

      <div style={{ border: '1px solid #d9d9d9', padding: 16, borderRadius: 6 }}>
        <h4>Test Keys (Test Mode)</h4>
        <Form.Item
          name="secret_key_test"
          label="Secret Key Test"
        >
          <Input.Password placeholder="sk_test_..." />
        </Form.Item>

        <Form.Item
          name="publishable_key_test"
          label="Publishable Key Test"
        >
          <Input placeholder="pk_test_..." />
        </Form.Item>
      </div>
    </Form>
  )
})

export default StripeAccountForm

