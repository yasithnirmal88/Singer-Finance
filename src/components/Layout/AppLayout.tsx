import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar, Space, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  ShoppingCartOutlined, 
  UserOutlined, 
  ShoppingOutlined, 
  HistoryOutlined, 
  LogoutOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/useAuth';
import { COMPANY_LOGO_SRC } from '../../config/company';

const { Header, Sider, Content } = Layout;

/**
 * The authenticated shell: sidebar, header, and the screen the current URL
 * selects. The URL is the only record of which screen is open, so there is no
 * tab state to keep in step with the page.
 */
export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'email',
      label: <span className="font-semibold text-slate-700">{user?.email}</span>,
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: 'Sign Out',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: handleLogout,
    },
  ];

  const menuItems = [
    {
      key: '/',
      icon: <ShoppingCartOutlined className="text-lg" />,
      label: 'New Sale',
    },
    {
      key: '/customers',
      icon: <UserOutlined className="text-lg" />,
      label: 'Customers',
    },
    {
      key: '/items',
      icon: <ShoppingOutlined className="text-lg" />,
      label: 'Items',
    },
    {
      key: '/history',
      icon: <HistoryOutlined className="text-lg" />,
      label: 'Sales History',
    },
    {
      key: '/data',
      icon: <DatabaseOutlined className="text-lg" />,
      label: 'Data Management',
    },
  ];

  /**
   * The nav entry covering the current URL. A screen with a subpath of its own
   * still highlights its parent, so /history/123 keeps Sales History selected.
   */
  const activeKey = (path: string) =>
    menuItems.map(item => item.key).find(key => key !== '/' && path.startsWith(key)) ?? '/';

  return (
    <Layout className="min-h-screen bg-slate-50">
      {/* Sidebar Sider */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        collapsedWidth={0}
        theme="dark"
        className="shadow-xl bg-slate-900 border-r border-slate-800 no-print"
        width={240}
      >
        <div className="h-16 flex items-center justify-center border-b border-slate-800 gap-2 px-4 overflow-hidden">
          <img src={COMPANY_LOGO_SRC} alt="Singer Finance" style={{ height: '28px', width: 'auto', objectFit: 'contain', display: 'block' }} />
          {!collapsed && (
            <span className="text-slate-100 font-bold text-sm tracking-wide transition-opacity duration-300 whitespace-nowrap">
              SINGER FINANCE
            </span>
          )}
        </div>
        
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[activeKey(pathname)]}
          onClick={({ key }) => navigate(key)}
          items={menuItems}
          className="bg-transparent mt-4 border-none px-2"
        />
      </Sider>

      {/* Main Layout Area */}
      <Layout>
        {/* Header */}
        <Header className="bg-white px-6 border-b border-slate-200/80 flex items-center justify-between h-16 shadow-sm no-print">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-600 hover:text-slate-800 focus:text-slate-800"
            size="large"
          />

          <Space size="large">
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors">
                <Avatar 
                  style={{ backgroundColor: '#d6073b', verticalAlign: 'middle' }}
                  icon={<UserOutlined />}
                />
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">Portal Operator</div>
                  <div className="text-[10px] text-slate-400 font-medium leading-none">{user?.email}</div>
                </div>
              </div>
            </Dropdown>
          </Space>
        </Header>

        {/* Content Wrapper */}
        <Content className="m-6 overflow-y-auto">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
export default AppLayout;
