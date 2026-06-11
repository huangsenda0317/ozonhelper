import React from 'react';
import styled from 'styled-components';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { colors, spacing, typography } from '../styles/theme';
import { Transaction, Category, CategoryStats, MonthlyStats } from '../types';
import { Section, Container, DisplayMdTitle, CaptionText, StrongText, UtilityCard, TabGroup, Tab } from '../styles/components';

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${spacing.lg};
  margin-bottom: ${spacing.xl};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled(UtilityCard)`
  text-align: center;
  padding: ${spacing.xl};
`;

const StatLabel = styled(CaptionText)`
  color: ${colors['ink-muted-48']};
  margin-bottom: ${spacing.xs};
`;

const StatValue = styled(StrongText)<{ $color?: string }>`
  font-size: 28px;
  color: ${props => props.$color || colors.ink};
`;

const ChartSection = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${spacing.xl};

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled(UtilityCard)`
  padding: ${spacing.lg};
`;

const ChartTitle = styled.h3`
  font-family: ${typography['body-strong'].fontFamily};
  font-size: ${typography['body-strong'].fontSize};
  font-weight: ${typography['body-strong'].fontWeight};
  color: ${colors.ink};
  margin-bottom: ${spacing.lg};
`;

const ChartContainer = styled.div`
  height: 280px;
`;

const LegendList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing.md};
  margin-top: ${spacing.lg};
  justify-content: center;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.xs};
`;

const LegendDot = styled.div<{ $color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${props => props.$color};
`;

const LegendLabel = styled(CaptionText)`
  color: ${colors['ink-muted-80']};
`;

const TrendBadge = styled.span<{ $positive: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  background-color: ${props => props.$positive ? `${colors.success}20` : `${colors.danger}20`};
  color: ${props => props.$positive ? colors.success : colors.danger};
  margin-left: ${spacing.xs};
`;

const EmptyChart = styled.div`
  height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${colors['ink-muted-48']};
  font-size: 14px;
`;

interface ExpenseStatsProps {
  transactions: Transaction[];
  categories: Category[];
  currentMonth: string;
}

export const ExpenseStats: React.FC<ExpenseStatsProps> = ({
  transactions,
  categories,
  currentMonth,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateStats = () => {
    const monthTransactions = transactions.filter(t => {
      const transMonth = t.date.substring(0, 7);
      return transMonth === currentMonth;
    });

    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = income - expense;

    return { income, expense, balance };
  };

  const getCategoryStats = (): CategoryStats[] => {
    const monthExpenses = transactions.filter(t => {
      const transMonth = t.date.substring(0, 7);
      return transMonth === currentMonth && t.type === 'expense';
    });

    const categoryTotals = monthExpenses.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    const total = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);

    return Object.entries(categoryTotals)
      .map(([categoryId, amount]) => {
        const category = categories.find(c => c.id === categoryId) || categories[categories.length - 1];
        return {
          category: category.name,
          amount,
          percentage: total > 0 ? (amount / total) * 100 : 0,
          color: category.color,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  };

  const getMonthlyTrend = (): MonthlyStats[] => {
    const last6Months: MonthlyStats[] = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = date.toISOString().substring(0, 7);
      const monthLabel = date.toLocaleDateString('zh-CN', { month: 'short' });

      const monthTransactions = transactions.filter(t => t.date.startsWith(monthKey));
      const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

      last6Months.push({ month: monthLabel, income, expense });
    }

    return last6Months;
  };

  const stats = calculateStats();
  const categoryStats = getCategoryStats();
  const monthlyTrend = getMonthlyTrend();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: colors.canvas,
          border: `1px solid ${colors.hairline}`,
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: 600, marginBottom: '8px' }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ margin: 0, color: entry.color, fontSize: '14px' }}>
              {entry.name}: ¥{entry.value.toFixed(2)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Section variant="light">
      <Container>
        <DisplayMdTitle style={{ marginBottom: spacing.xl, textAlign: 'center' }}>
          {new Date(currentMonth + '-01').toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })} 收支概况
        </DisplayMdTitle>

        <StatsGrid>
          <StatCard>
            <StatLabel>收入</StatLabel>
            <StatValue $color={colors.success}>{formatCurrency(stats.income)}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>支出</StatLabel>
            <StatValue $color={colors.danger}>{formatCurrency(stats.expense)}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>结余</StatLabel>
            <StatValue $color={stats.balance >= 0 ? colors.success : colors.danger}>
              {formatCurrency(stats.balance)}
              <TrendBadge $positive={stats.balance >= 0}>
                {stats.balance >= 0 ? '↑' : '↓'}
                {Math.abs((stats.income > 0 ? (stats.balance / stats.income) * 100 : 0)).toFixed(1)}%
              </TrendBadge>
            </StatValue>
          </StatCard>
        </StatsGrid>

        <ChartSection>
          <ChartCard>
            <ChartTitle>支出分类</ChartTitle>
            {categoryStats.length > 0 ? (
              <>
                <ChartContainer>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryStats}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                      >
                        {categoryStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
                <LegendList>
                  {categoryStats.slice(0, 5).map(stat => (
                    <LegendItem key={stat.category}>
                      <LegendDot $color={stat.color} />
                      <LegendLabel>{stat.category}</LegendLabel>
                    </LegendItem>
                  ))}
                </LegendList>
              </>
            ) : (
              <EmptyChart>本月暂无支出记录</EmptyChart>
            )}
          </ChartCard>

          <ChartCard>
            <ChartTitle>月度趋势</ChartTitle>
            <ChartContainer>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend}>
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12, fill: colors['ink-muted-48'] }}
                    axisLine={{ stroke: colors.hairline }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: colors['ink-muted-48'] }}
                    axisLine={{ stroke: colors.hairline }}
                    tickLine={false}
                    tickFormatter={(value) => `¥${value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }}
                  />
                  <Bar dataKey="income" name="收入" fill={colors.success} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="支出" fill={colors.danger} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </ChartCard>
        </ChartSection>
      </Container>
    </Section>
  );
};

export default ExpenseStats;
