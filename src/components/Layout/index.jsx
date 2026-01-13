import { useState } from 'react'
import {
  CalendarOutlined,
  DashboardOutlined,
  FileTextOutlined,
  MailOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
  CreditCardOutlined,
} from '@ant-design/icons'
import {
  Menu,
  Layout,
  Divider,
} from 'antd'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import StadiumIcon from './stadiumIcon'
import s from './layout.module.scss'
import Logo from '../../instance/components/logo'

const { Header, Content, Footer } = Layout

const NAVBAR_TOP = [
  {
    key: 'events',
    label: <Link to='/events'><CalendarOutlined />&nbsp;&nbsp;Events</Link>,
  }, {
    key: 'teams',
    label: <Link to='/teams'><TeamOutlined />&nbsp;&nbsp;Teams</Link>,
  }, {
    key: 'stadiums',
    label: <Link to='/stadiums'><StadiumIcon width={14} heiht={14} />&nbsp;&nbsp;Stadiums</Link>,
  }, {
    key: 'tournaments',
    label: <Link to='/tournaments'><TrophyOutlined />&nbsp;&nbsp;Tournaments</Link>,
  }, {
    key: 'd1',
    label: <Divider type='vertical' />
  }
]

const NAVBAR_RIGHT = [
  {
    key: 'templates',
    icon: <MailOutlined />,
    label: 'E-mail templates',
    children: [{
        key: 'signup',
        label: <Link to='/templates/signup'>Signup</Link>
      },
      { label: <Link to='/templates/email-verification'>Email verification</Link>, key: 'email-verification' },
      { label: <Link to='/templates/booking-in-cart'>Booking tickets in cart</Link>, key: 'booking-in-cart' },
      { label: <Link to='/templates/successful-payment'>Successful payment</Link>, key: 'successful-payment' },
      { label: <Link to='/templates/checking-ticket'>Checking ticket</Link>, key: 'checking-ticket' },
      { label: <Link to='/templates/checking-ticket-available'>Tickets are in stock</Link>, key: 'checking-ticket-available' },
      { label: <Link to='/templates/feedback'>Feedback</Link>,key:  'feedback' },
      { label: <Link to='/templates/restore-password'>Restore password</Link>, key: 'restore-password' },
      { label: <Link to='/templates/html_pdf_ticket_paid_body'>PDF Ticket Body</Link>, key: 'html_pdf_ticket_paid_body' },
    ],
  }, {
    label: 'Content',
    key: 'content',
    icon: <FileTextOutlined />,
    children: [
      { label: <Link to='/content/about-us'>About us</Link>, key: 'about-us' },
      { label: <Link to='/content/faq'>FAQ</Link>,key:  'faq' },
      { label: <Link to='/content/news'>News</Link>,key:  'news' },
      { label: <Link to='/content/corporate'>Corporate</Link>,key:  'corporate' },
      { label: <Link to='/content/privacy-policy'>Privacy policy</Link>, key: 'privacy-policy' },
      { label: <Link to='/content/become-a-partner'>Become a partner</Link>, key: 'become-a-partner' },
  ]},
  { key: 'users', label:<Link to='/users'>Users</Link>, icon: <UserOutlined /> },
  { key: 'stripe-accounts', label:<Link to='/stripe-accounts'>Stripe Accounts</Link>, icon: <CreditCardOutlined /> }
]

export default function PageLayout() {
  const location = useLocation()

   const path = location.pathname.split('/').filter(Boolean)
   const rootPage = path[0]

  const getSelectedRightMenuKeys = () => {
    if (rootPage === 'users') return ['users']
    if (rootPage === 'stripe-accounts') return ['stripe-accounts']
    
    if (rootPage === 'templates' && path[1]) {
      return ['templates', path[1]]
    }
    if (rootPage === 'content' && path[1]) {
      return ['content', path[1]]
    }
    
    return []
  }

  return (
    <Layout>
      <Header className={s.header}>
        <Logo />
        <Menu
          className={s.topNavbar}
          mode='horizontal'
          items={NAVBAR_TOP}
          style={{ flex: 1, minWidth: 0 }}
          triggerSubMenuAction='click'
          selectedKeys={NAVBAR_TOP.filter(item => rootPage === item.key).map(item => item.key)}
        />
        <Menu 
          style={{ flex: '1 1 0'}} 
          mode='horizontal' 
          items={NAVBAR_RIGHT}
          selectedKeys={getSelectedRightMenuKeys()}
          triggerSubMenuAction='click'
        />
      </Header>
      <Content className={s.content}>
        <Outlet />
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        
      </Footer>
    </Layout>
  )
}