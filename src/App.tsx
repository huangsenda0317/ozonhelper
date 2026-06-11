import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { colors, spacing, typography, rounded, shadows } from './styles/theme';
import { Transaction } from './types';
import { defaultCategories } from './data/mockData';
import { useLocalStorage } from './hooks/useLocalStorage';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import ExpenseStats from './components/ExpenseStats';
import LoginPage from './pages/LoginPage';
import {
  GlobalStyle,
  GlobalNav,
  NavLink,
  SubNav,
  NavTitle,
  TabGroup,
  Tab,
  ButtonPrimary,
  IconButton,
  Container,
  Section,
  DisplayTitle,
  LeadText,
  CaptionText,
  StrongText,
  UtilityCard,
  EmptyState,
} from './styles/components';

const Logo = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: ${colors['body-on-dark']};
  display: flex;
  align-items: center;
  gap: ${spacing.xs};
`;

const NavActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.md};
`;

const Header = styled.header`
  padding: ${spacing.section} 0;
  background-color: ${colors['surface-tile-1']};
  color: ${colors['body-on-dark']};
  text-align: center;
`;

const HeaderContent = styled.div`
  max-width: 600px;
  margin: 0 auto;
`;

const BalanceCard = styled(UtilityCard)`
  margin-top: ${spacing.xl};
  display: flex;
  justify-content: space-around;
  text-align: center;
`;

const BalanceItem = styled.div``;

const BalanceLabel = styled(CaptionText)`
  color: ${colors['ink-muted-48']};
  margin-bottom: ${spacing.xxs};
`;

const BalanceValue = styled(StrongText)<{ $color?: string }>`
  font-size: 24px;
  color: ${props => props.$color || colors.ink};
`;

const ContentSection = styled(Section)`
  padding-top: ${spacing.xl};
`;

const FilterBar = styled.div`
  display: flex;
  gap: ${spacing.md};
  margin-bottom: ${spacing.xl};
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
`;

const FilterGroup = styled.div`
  display: flex;
  gap: ${spacing.sm};
`;

const SectionTitle = styled.h2`
  font-family: ${typography['body-strong'].fontFamily};
  font-size: ${typography['body-strong'].fontSize};
  font-weight: ${typography['body-strong'].fontWeight};
  color: ${colors.ink};
  margin-bottom: ${spacing.lg};
`;

const MonthSelector = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.sm};
`;

const MonthButton = styled.button`
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: ${colors.primary};
  padding: 4px 8px;
  border-radius: ${rounded.sm};

  &:hover {
    background-color: ${colors['canvas-parchment']};
  }
`;

const CurrentMonth = styled.span`
  font-family: ${typography['body-strong'].fontFamily};
  font-size: ${typography['body-strong'].fontSize};
  min-width: 100px;
  text-align: center;
`;

const FloatingButton = styled(IconButton)`
  position: fixed;
  bottom: 24px;
  right: 24px;
  background-color: ${colors.primary};
  color: ${colors['on-primary']};
  font-size: 24px;
  box-shadow: ${shadows['product-shadow']};
  z-index: 50;

  &:hover {
    background-color: ${colors['primary-focus']};
  }
`;

const EmptyIcon = styled.div`
  font-size: 64px;
  margin-bottom: ${spacing.md};
`;

const LogoutButton = styled.button`
  background: none;
  border: none;
  color: ${colors['body-muted']};
  font-family: ${typography['nav-link'].fontFamily};
  font-size: ${typography['nav-link'].fontSize};
  cursor: pointer;
  padding: 0 ${spacing.sm};
  transition: color 0.2s ease;

  &:hover {
    color: ${colors['body-on-dark']};
  }
`;

function App() {
  const [isLoggedIn, setIsLoggedIn] = useLocalStorage<boolean>('is-logged-in', false);
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('expense-records', []);
  const [categories] = useState(defaultCategories);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesType = filterType === 'all' || t.type === filterType;
      const matchesMonth = t.date.startsWith(currentMonth);
      return matchesType && matchesMonth;
    });
  }, [transactions, filterType, currentMonth]);

  const monthStats = useMemo(() => {
    const monthTransactions = transactions.filter(t => t.date.startsWith(currentMonth));
    const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [transactions, currentMonth]);

  const handleAddTransaction = (data: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...data,
      id: Date.now().toString(),
    };
    setTransactions(prev => [newTransaction, ...prev]);
  };

  const handleEditTransaction = (data: Omit<Transaction, 'id'>) => {
    if (!editingTransaction) return;
    setTransactions(prev =>
      prev.map(t => (t.id === editingTransaction.id ? { ...data, id: editingTransaction.id } : t))
    );
    setEditingTransaction(undefined);
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm('确定要删除这条记录吗？')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleOpenEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTransaction(undefined);
  };

  const changeMonth = (delta: number) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const newDate = new Date(year, month - 1 + delta, 1);
    setCurrentMonth(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  // 如果未登录，显示登录页面
  if (!isLoggedIn) {
    return (
      <>
        <GlobalStyle />
        <LoginPage onLogin={() => setIsLoggedIn(true)} />
      </>
    );
  }

  return (
    <>
      <GlobalStyle />
      
      <GlobalNav>
        <Logo>💰 家庭账本</Logo>
        <NavActions>
          <NavLink href="#" onClick={(e) => { e.preventDefault(); setIsFormOpen(true); }}>
            + 添加
          </NavLink>
          <LogoutButton onClick={handleLogout}>退出</LogoutButton>
        </NavActions>
      </GlobalNav>

      <SubNav>
        <NavTitle>家庭开支管理</NavTitle>
        <TabGroup>
          <Tab $active={filterType === 'all'} onClick={() => setFilterType('all')}>全部</Tab>
          <Tab $active={filterType === 'expense'} onClick={() => setFilterType('expense')}>支出</Tab>
          <Tab $active={filterType === 'income'} onClick={() => setFilterType('income')}>收入</Tab>
        </TabGroup>
      </SubNav>

      <Header>
        <Container>
          <HeaderContent>
            <LeadText style={{ color: colors['body-muted'], marginBottom: spacing.sm }}>
              {new Date(currentMonth + '-01').toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
            </LeadText>
            <DisplayTitle style={{ color: colors['body-on-dark'] }}>
              {formatCurrency(monthStats.balance)}
            </DisplayTitle>
            <CaptionText style={{ color: colors['body-muted'] }}>本月结余</CaptionText>

            <BalanceCard style={{ marginTop: spacing.lg }}>
              <BalanceItem>
                <BalanceLabel>收入</BalanceLabel>
                <BalanceValue $color={colors.success}>{formatCurrency(monthStats.income)}</BalanceValue>
              </BalanceItem>
              <BalanceItem>
                <BalanceLabel>支出</BalanceLabel>
                <BalanceValue $color={colors.danger}>{formatCurrency(monthStats.expense)}</BalanceValue>
              </BalanceItem>
            </BalanceCard>
          </HeaderContent>
        </Container>
      </Header>

      <ExpenseStats
        transactions={transactions}
        categories={categories}
        currentMonth={currentMonth}
      />

      <ContentSection variant="parchment">
        <Container>
          <FilterBar>
            <SectionTitle style={{ marginBottom: 0 }}>交易记录</SectionTitle>
            <FilterGroup>
              <MonthSelector>
                <MonthButton onClick={() => changeMonth(-1)}>◀</MonthButton>
                <CurrentMonth>{new Date(currentMonth + '-01').toLocaleDateString('zh-CN', { month: 'short' })}</CurrentMonth>
                <MonthButton onClick={() => changeMonth(1)}>▶</MonthButton>
              </MonthSelector>
            </FilterGroup>
          </FilterBar>

          {filteredTransactions.length > 0 ? (
            <TransactionList
              transactions={filteredTransactions}
              categories={categories}
              onEdit={handleOpenEdit}
              onDelete={handleDeleteTransaction}
            />
          ) : (
            <EmptyState>
              <EmptyIcon>📝</EmptyIcon>
              <LeadText style={{ color: colors['ink-muted-48'] }}>暂无记录</LeadText>
              <CaptionText style={{ color: colors['ink-muted-48'], marginTop: spacing.xs }}>
                点击下方按钮添加您的第一笔收支
              </CaptionText>
            </EmptyState>
          )}
        </Container>
      </ContentSection>

      <FloatingButton onClick={() => setIsFormOpen(true)}>+</FloatingButton>

      <TransactionForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={editingTransaction ? handleEditTransaction : handleAddTransaction}
        categories={categories}
        initialData={editingTransaction}
      />
    </>
  );
}

export default App;
