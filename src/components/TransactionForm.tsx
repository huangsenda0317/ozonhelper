import React, { useState } from 'react';
import styled from 'styled-components';
import { colors, spacing, rounded, typography } from '../styles/theme';
import { Transaction, TransactionType, Category } from '../types';
import { defaultCategories } from '../data/mockData';
import { ModalOverlay, ModalContent, ModalHeader, ModalTitle, IconButton, FormGroup, Label, Input, Select, ButtonPrimary, ButtonSecondary, FormActions, TabGroup, Tab } from '../styles/components';

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: ${colors['ink-muted-48']};
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${colors['canvas-parchment']};
    color: ${colors.ink};
  }
`;

const TypeToggle = styled.div`
  display: flex;
  background-color: ${colors['canvas-parchment']};
  border-radius: ${rounded.pill};
  padding: 4px;
  margin-bottom: ${spacing.md};
`;

const TypeButton = styled.button<{ $active: boolean; $type: TransactionType }>`
  flex: 1;
  padding: 8px 16px;
  border: none;
  border-radius: ${rounded.pill};
  font-family: ${typography['caption'].fontFamily};
  font-size: ${typography['caption'].fontSize};
  font-weight: 600;
  cursor: pointer;
  background-color: ${props => props.$active ? (props.$type === 'income' ? colors.success : colors.danger) : 'transparent'};
  color: ${props => props.$active ? colors['on-primary'] : colors['ink-muted-80']};
  transition: all 0.2s ease;

  &:hover {
    color: ${props => props.$active ? colors['on-primary'] : colors.ink};
  }
`;

const AmountInput = styled(Input)`
  font-size: 24px;
  font-weight: 600;
  text-align: center;
  color: ${colors.ink};
`;

const CurrencySymbol = styled.span`
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 24px;
  font-weight: 600;
  color: ${colors['ink-muted-48']};
`;

const InputWrapper = styled.div`
  position: relative;
`;

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transaction: Omit<Transaction, 'id'>) => void;
  categories: Category[];
  initialData?: Transaction;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  categories,
  initialData,
}) => {
  const [type, setType] = useState<TransactionType>(initialData?.type || 'expense');
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [category, setCategory] = useState(initialData?.category || 'food');
  const [description, setDescription] = useState(initialData?.description || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);

  const filteredCategories = categories.filter(c => 
    type === 'income' ? ['salary', 'bonus', 'investment', 'other'].includes(c.id) : c.id !== 'salary' && c.id !== 'bonus' && c.id !== 'investment'
  );

  React.useEffect(() => {
    if (!initialData) {
      setType('expense');
      setCategory('food');
    }
  }, [initialData, type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    onSubmit({
      type,
      amount: parseFloat(amount),
      category: type === 'income' && !filteredCategories.find(c => c.id === category) ? 'salary' : category,
      description,
      date,
    });

    // Reset form
    setAmount('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>{initialData ? '编辑记录' : '添加记录'}</ModalTitle>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </ModalHeader>

        <form onSubmit={handleSubmit}>
          <TypeToggle>
            <TypeButton
              type="button"
              $active={type === 'expense'}
              $type="expense"
              onClick={() => setType('expense')}
            >
              支出
            </TypeButton>
            <TypeButton
              type="button"
              $active={type === 'income'}
              $type="income"
              onClick={() => setType('income')}
            >
              收入
            </TypeButton>
          </TypeToggle>

          <FormGroup>
            <Label>金额</Label>
            <InputWrapper>
              <CurrencySymbol>¥</CurrencySymbol>
              <AmountInput
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                style={{ paddingLeft: '40px' }}
                autoFocus
              />
            </InputWrapper>
          </FormGroup>

          <FormGroup>
            <Label>分类</Label>
            <Select value={category} onChange={e => setCategory(e.target.value)}>
              {filteredCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>描述</Label>
            <Input
              type="text"
              placeholder="备注信息"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </FormGroup>

          <FormGroup>
            <Label>日期</Label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </FormGroup>

          <FormActions>
            <ButtonSecondary type="button" onClick={onClose}>
              取消
            </ButtonSecondary>
            <ButtonPrimary type="submit" disabled={!amount || parseFloat(amount) <= 0}>
              {initialData ? '保存' : '添加'}
            </ButtonPrimary>
          </FormActions>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
};

export default TransactionForm;
