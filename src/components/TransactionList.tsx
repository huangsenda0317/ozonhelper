import React from 'react';
import styled from 'styled-components';
import { colors, spacing, typography } from '../styles/theme';
import { Transaction, Category } from '../types';
import { UtilityCard, CaptionText, StrongText, Badge } from '../styles/components';

const TransactionItem = styled(UtilityCard)`
  display: flex;
  align-items: center;
  gap: ${spacing.md};
  padding: ${spacing.md} ${spacing.lg};
  transition: transform 0.2s ease;

  &:hover {
    transform: translateX(4px);
  }
`;

const IconWrapper = styled.div<{ $color: string }>`
  width: 44px;
  height: 44px;
  border-radius: ${props => props.$color === '#ffd60a' ? '50%' : '50%'};
  background-color: ${props => props.$color}20;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
`;

const ContentWrapper = styled.div`
  flex: 1;
  min-width: 0;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.sm};
  margin-bottom: 2px;
`;

const Description = styled(StrongText)`
  color: ${colors.ink};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CategoryLabel = styled(CaptionText)`
  color: ${colors['ink-muted-48']};
`;

const AmountWrapper = styled.div`
  text-align: right;
`;

const Amount = styled(StrongText)<{ $type: 'income' | 'expense' }>`
  color: ${props => props.$type === 'income' ? colors.success : colors.danger};
  font-size: 17px;
`;

const DateLabel = styled(CaptionText)`
  color: ${colors['ink-muted-48']};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${spacing.xs};
  opacity: 0;
  transition: opacity 0.2s ease;

  ${TransactionItem}:hover & {
    opacity: 1;
  }
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  color: ${colors['ink-muted-48']};
  transition: color 0.2s ease;

  &:hover {
    color: ${colors.primary};
  }
`;

const TransactionListWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.sm};
`;

interface TransactionItemProps {
  transaction: Transaction;
  category: Category;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

const TransactionItemComponent: React.FC<TransactionItemProps> = ({
  transaction,
  category,
  onEdit,
  onDelete,
}) => {
  const formatAmount = (amount: number, type: 'income' | 'expense') => {
    const prefix = type === 'income' ? '+' : '-';
    return `${prefix}¥${amount.toFixed(2)}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <TransactionItem>
      <IconWrapper $color={category.color}>
        {category.icon}
      </IconWrapper>
      <ContentWrapper>
        <TitleRow>
          <Description>{transaction.description || category.name}</Description>
        </TitleRow>
        <CategoryLabel>{category.name}</CategoryLabel>
      </ContentWrapper>
      <AmountWrapper>
        <Amount $type={transaction.type}>{formatAmount(transaction.amount, transaction.type)}</Amount>
        <DateLabel style={{ display: 'block' }}>{formatDate(transaction.date)}</DateLabel>
      </AmountWrapper>
      <ActionButtons>
        <ActionButton onClick={() => onEdit(transaction)} title="编辑">✏️</ActionButton>
        <ActionButton onClick={() => onDelete(transaction.id)} title="删除">🗑️</ActionButton>
      </ActionButtons>
    </TransactionItem>
  );
};

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  categories,
  onEdit,
  onDelete,
}) => {
  const getCategoryById = (id: string) => {
    return categories.find(c => c.id === id) || categories[categories.length - 1];
  };

  const sortedTransactions = [...transactions].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  if (transactions.length === 0) {
    return null;
  }

  return (
    <TransactionListWrapper>
      {sortedTransactions.map(transaction => (
        <TransactionItemComponent
          key={transaction.id}
          transaction={transaction}
          category={getCategoryById(transaction.category)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </TransactionListWrapper>
  );
};

export default TransactionList;
