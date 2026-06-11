import React, { useState } from 'react';
import styled from 'styled-components';
import { colors, spacing, typography, rounded } from '../styles/theme';

const LoginWrapper = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: ${colors['surface-tile-1']};
`;

const LoginContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${spacing.xl};
`;

const LoginCard = styled.div`
  background-color: ${colors.canvas};
  border-radius: ${rounded.lg};
  padding: ${spacing.xxl};
  width: 100%;
  max-width: 400px;
  box-shadow: rgba(0, 0, 0, 0.22) 3px 5px 30px 0;
`;

const Logo = styled.div`
  font-size: 32px;
  text-align: center;
  margin-bottom: ${spacing.xl};
`;

const Title = styled.h1`
  font-family: ${typography['display-md'].fontFamily};
  font-size: ${typography['display-md'].fontSize};
  font-weight: ${typography['display-md'].fontWeight};
  color: ${colors.ink};
  text-align: center;
  margin-bottom: ${spacing.sm};
`;

const Subtitle = styled.p`
  font-family: ${typography.body.fontFamily};
  font-size: ${typography.body.fontSize};
  color: ${colors['ink-muted-48']};
  text-align: center;
  margin-bottom: ${spacing.xl};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${spacing.md};
`;

const InputGroup = styled.div`
  position: relative;
`;

const Input = styled.input`
  width: 100%;
  padding: 14px 18px;
  border: 1px solid ${colors['divider-soft']};
  border-radius: ${rounded.md};
  font-family: ${typography.body.fontFamily};
  font-size: ${typography.body.fontSize};
  transition: border-color 0.2s ease;
  background-color: ${colors.canvas};

  &:focus {
    outline: none;
    border-color: ${colors.primary};
  }

  &::placeholder {
    color: ${colors['ink-muted-48']};
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 14px;
  background-color: ${colors.primary};
  color: ${colors['on-primary']};
  border: none;
  border-radius: ${rounded.pill};
  font-family: ${typography.body.fontFamily};
  font-size: ${typography.body.fontSize};
  font-weight: 600;
  cursor: pointer;
  margin-top: ${spacing.sm};
  transition: background-color 0.2s ease, transform 0.1s ease;

  &:hover {
    background-color: ${colors['primary-focus']};
  }

  &:active {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.p`
  color: ${colors.danger};
  font-size: 14px;
  text-align: center;
  margin-top: ${spacing.sm};
`;

const Footer = styled.footer`
  padding: ${spacing.lg};
  text-align: center;
  background-color: ${colors['surface-tile-1']};
`;

const IcpLink = styled.a`
  color: ${colors['body-muted']};
  font-size: ${typography['fine-print'].fontSize};
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover {
    color: ${colors['body-on-dark']};
  }
`;

interface LoginPageProps {
  onLogin: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('请输入用户名和密码');
      return;
    }

    setLoading(true);
    
    // 模拟登录请求
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // 简单验证（可自行扩展）
    if (username === 'admin' && password === '123456') {
      onLogin();
    } else {
      setError('用户名或密码错误');
    }
    
    setLoading(false);
  };

  return (
    <LoginWrapper>
      <LoginContainer>
        <LoginCard>
          <Logo>💰</Logo>
          <Title>家庭账本</Title>
          <Subtitle>登录以管理您的家庭开支</Subtitle>

          <Form onSubmit={handleSubmit}>
            <InputGroup>
              <Input
                type="text"
                placeholder="用户名"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
              />
            </InputGroup>
            <InputGroup>
              <Input
                type="password"
                placeholder="密码"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </InputGroup>

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <SubmitButton type="submit" disabled={loading}>
              {loading ? '登录中...' : '登录'}
            </SubmitButton>
          </Form>
        </LoginCard>
      </LoginContainer>

      <Footer>
        <IcpLink href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">
          沪ICP备2023030536号-2
        </IcpLink>
      </Footer>
    </LoginWrapper>
  );
};

export default LoginPage;
