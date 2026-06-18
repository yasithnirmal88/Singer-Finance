import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Divider, message } from 'antd';
import { UserOutlined, LockOutlined, GoogleOutlined, LoginOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

export const Login: React.FC = () => {
  const { login, register, loginWithGoogle, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleEmailAuth = async (values: any) => {
    const email = values.email.trim().toLowerCase();
    const password = values.password;

    if (email !== 'surangi19831011@gmail.com' || password !== 'yasi2003') {
      message.error('Invalid operator credentials. Access Denied.');
      return;
    }

    setLoading(true);
    try {
      // Attempt Firebase Sign-In
      await login(email, password);
      message.success('Logged in successfully!');
    } catch (error: any) {
      // Auto-provisioning: If account doesn't exist in Firebase yet, create it.
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          await register(email, password);
          message.success('Operator account initialized and logged in!');
        } catch (regError: any) {
          console.error(regError);
          message.error('Authentication configuration failed. Please contact support.');
        }
      } else {
        console.error(error);
        message.error('Authentication failed. Please check connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      const userEmail = result.user?.email?.toLowerCase();
      if (userEmail !== 'surangi19831011@gmail.com') {
        await logout();
        message.error('Access Denied. Only surangi19831011@gmail.com is authorized.');
      } else {
        message.success('Logged in with Google successfully!');
      }
    } catch (error: any) {
      console.error(error);
      message.error('Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-tr from-slate-900 via-slate-850 to-blue-950 p-4 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <Card
        className="w-full max-w-[420px] border-slate-800/80 bg-slate-900/60 backdrop-blur-xl shadow-2xl rounded-2xl"
        styles={{ body: { padding: '32px 24px' } }}
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg mb-3">
            <span className="text-white text-xl font-bold tracking-wider">SF</span>
          </div>
          <Title level={3} className="!text-slate-100 !m-0 !font-semibold">
            Singer Finance
          </Title>
          <Text className="text-slate-400 block mt-1">
            Operator Portal Access
          </Text>
        </div>

        <Form
          form={form}
          name="login_form"
          layout="vertical"
          onFinish={handleEmailAuth}
          autoComplete="off"
          requiredMark={false}
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please input your email!' },
              { type: 'email', message: 'Please enter a valid email address!' },
            ]}
          >
            <Input
              prefix={<UserOutlined className="text-slate-500" />}
              placeholder="Authorized email (e.g., surangi19831011@gmail.com)"
              size="large"
              className="bg-slate-950/40 border-slate-800 text-slate-200 hover:border-blue-500/50 focus:border-blue-500/50 hover:bg-slate-950/60 focus:bg-slate-950/60 placeholder-slate-500"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Please input your password!' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-slate-500" />}
              placeholder="Password"
              size="large"
              className="bg-slate-950/40 border-slate-800 text-slate-200 hover:border-blue-500/50 focus:border-blue-500/50 hover:bg-slate-950/60 focus:bg-slate-950/60 placeholder-slate-500"
            />
          </Form.Item>

          <Form.Item className="mb-2">
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              icon={<LoginOutlined />}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 border-none hover:from-blue-500 hover:to-indigo-500 h-11 text-base font-medium shadow-lg shadow-blue-500/20"
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <Divider className="border-slate-800/80 !my-4">
          <span className="text-slate-500 text-xs px-2">OR CONTINUE WITH</span>
        </Divider>

        <Button
          icon={<GoogleOutlined className="text-[#ea4335]" />}
          size="large"
          block
          loading={loading}
          onClick={handleGoogleSignIn}
          className="bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/60 text-slate-300 font-medium h-11"
        >
          Google Account
        </Button>
      </Card>
    </div>
  );
};
export default Login;
