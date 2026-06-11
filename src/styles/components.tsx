import React from 'react';
import styled, { css, createGlobalStyle } from 'styled-components';
import { colors, typography, spacing, rounded, shadows } from './theme';

// Global Styles
export const GlobalStyle = createGlobalStyle`${css`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    font-family: ${typography.body.fontFamily};
    font-size: ${typography.body.fontSize};
    line-height: ${typography.body.lineHeight};
    letter-spacing: ${typography.body.letterSpacing};
    color: ${colors.ink};
    background-color: ${colors['canvas-parchment']};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  ::selection {
    background-color: ${colors.primary};
    color: ${colors['on-primary']};
  }

  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${colors['canvas-parchment']};
  }

  ::-webkit-scrollbar-thumb {
    background: ${colors['ink-muted-48']};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${colors['ink-muted-80']};
  }

  input:focus,
  select:focus,
  textarea:focus {
    outline: 2px solid ${colors['primary-focus']};
    outline-offset: 2px;
  }
`}`;

// Button Primary
export const ButtonPrimary = styled.button`
  background-color: ${colors.primary};
  color: ${colors['on-primary']};
  font-family: ${typography.body.fontFamily};
  font-size: ${typography.body.fontSize};
  font-weight: 400;
  border: none;
  border-radius: ${rounded.pill};
  padding: 11px 22px;
  cursor: pointer;
  transition: transform 0.1s ease;

  &:active {
    transform: scale(0.95);
  }

  &:hover {
    background-color: ${colors['primary-focus']};
  }

  &:focus {
    outline: 2px solid ${colors['primary-focus']};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const ButtonSecondary = styled.button`
  background-color: transparent;
  color: ${colors.primary};
  font-family: ${typography.body.fontFamily};
  font-size: ${typography.body.fontSize};
  font-weight: 400;
  border: 1px solid ${colors.primary};
  border-radius: ${rounded.pill};
  padding: 11px 22px;
  cursor: pointer;
  transition: transform 0.1s ease;

  &:active {
    transform: scale(0.95);
  }

  &:hover {
    background-color: ${colors.primary};
    color: ${colors['on-primary']};
  }
`;

export const ButtonDark = styled.button`
  background-color: ${colors.ink};
  color: ${colors['on-dark']};
  font-family: ${typography['button-utility'].fontFamily};
  font-size: ${typography['button-utility'].fontSize};
  font-weight: 400;
  border: none;
  border-radius: ${rounded.sm};
  padding: 8px 15px;
  cursor: pointer;
  transition: transform 0.1s ease;

  &:active {
    transform: scale(0.95);
  }
`;

export const IconButton = styled.button<{ size?: number }>`
  background-color: rgba(210, 210, 215, 0.64);
  color: ${colors.ink};
  border: none;
  border-radius: 50%;
  width: ${props => props.size || 44}px;
  height: ${props => props.size || 44}px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
  transition: transform 0.1s ease;

  &:active {
    transform: scale(0.95);
  }
`;

// Input
export const Input = styled.input`
  background-color: ${colors.canvas};
  color: ${colors.ink};
  font-family: ${typography.body.fontFamily};
  font-size: ${typography.body.fontSize};
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: ${rounded.pill};
  padding: 12px 20px;
  height: 44px;
  width: 100%;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: ${colors['ink-muted-48']};
  }

  &:focus {
    border-color: ${colors.primary};
  }
`;

export const Select = styled.select`
  background-color: ${colors.canvas};
  color: ${colors.ink};
  font-family: ${typography.body.fontFamily};
  font-size: ${typography.body.fontSize};
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: ${rounded.pill};
  padding: 12px 20px;
  height: 44px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%237a7a7a' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 16px center;
  padding-right: 40px;

  &:focus {
    border-color: ${colors.primary};
  }
`;

// Card
export const Card = styled.div<{ variant?: 'light' | 'parchment' | 'dark' }>`
  background-color: ${props => {
    switch (props.variant) {
      case 'dark':
        return colors['surface-tile-1'];
      case 'parchment':
        return colors['canvas-parchment'];
      default:
        return colors.canvas;
    }
  }};
  color: ${props => props.variant === 'dark' ? colors['body-on-dark'] : colors.ink};
  border-radius: ${rounded.lg};
  padding: ${spacing.lg};
  box-shadow: ${props => props.variant !== 'dark' ? 'none' : 'none'};
`;

export const UtilityCard = styled(Card)`
  border: 1px solid ${colors.hairline};
  box-shadow: none;
`;

// Navigation
export const GlobalNav = styled.nav`
  background-color: ${colors['surface-black']};
  color: ${colors['on-dark']};
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 ${spacing.lg};
  position: sticky;
  top: 0;
  z-index: 100;
`;

export const NavLink = styled.a`
  color: ${colors['on-dark']};
  font-family: ${typography['nav-link'].fontFamily};
  font-size: ${typography['nav-link'].fontSize};
  font-weight: ${typography['nav-link'].fontWeight};
  letter-spacing: ${typography['nav-link'].letterSpacing};
  text-decoration: none;
  padding: 0 ${spacing.sm};
  cursor: pointer;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.8;
  }
`;

export const SubNav = styled.div`
  background-color: rgba(245, 245, 247, 0.8);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 ${spacing.lg};
  border-bottom: 1px solid ${colors['divider-soft']};
`;

export const NavTitle = styled.h2`
  font-family: ${typography.tagline.fontFamily};
  font-size: ${typography.tagline.fontSize};
  font-weight: ${typography.tagline.fontWeight};
  letter-spacing: ${typography.tagline.letterSpacing};
  color: ${colors.ink};
`;

export const TabGroup = styled.div`
  display: flex;
  gap: ${spacing.xs};
`;

export const Tab = styled.button<{ $active?: boolean }>`
  background-color: ${props => props.$active ? colors.primary : 'transparent'};
  color: ${props => props.$active ? colors['on-primary'] : colors['ink-muted-80']};
  font-family: ${typography['caption'].fontFamily};
  font-size: ${typography['caption'].fontSize};
  font-weight: ${typography['caption'].fontWeight};
  border: ${props => props.$active ? 'none' : `1px solid ${colors['divider-soft']}`};
  border-radius: ${rounded.pill};
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.$active ? colors.primary : colors['surface-pearl']};
  }

  &:active {
    transform: scale(0.95);
  }
`;

// Typography
export const HeroTitle = styled.h1`
  font-family: ${typography['hero-display'].fontFamily};
  font-size: ${typography['hero-display'].fontSize};
  font-weight: ${typography['hero-display'].fontWeight};
  line-height: ${typography['hero-display'].lineHeight};
  letter-spacing: ${typography['hero-display'].letterSpacing};
`;

export const DisplayTitle = styled.h2`
  font-family: ${typography['display-lg'].fontFamily};
  font-size: ${typography['display-lg'].fontSize};
  font-weight: ${typography['display-lg'].fontWeight};
  line-height: ${typography['display-lg'].lineHeight};
  letter-spacing: ${typography['display-lg'].letterSpacing};
`;

export const DisplayMdTitle = styled.h3`
  font-family: ${typography['display-md'].fontFamily};
  font-size: ${typography['display-md'].fontSize};
  font-weight: ${typography['display-md'].fontWeight};
  line-height: ${typography['display-md'].lineHeight};
  letter-spacing: ${typography['display-md'].letterSpacing};
`;

export const LeadText = styled.p`
  font-family: ${typography.lead.fontFamily};
  font-size: ${typography.lead.fontSize};
  font-weight: ${typography.lead.fontWeight};
  line-height: ${typography.lead.lineHeight};
  letter-spacing: ${typography.lead.letterSpacing};
`;

export const BodyText = styled.p`
  font-family: ${typography.body.fontFamily};
  font-size: ${typography.body.fontSize};
  font-weight: ${typography.body.fontWeight};
  line-height: ${typography.body.lineHeight};
  letter-spacing: ${typography.body.letterSpacing};
`;

export const CaptionText = styled.span`
  font-family: ${typography.caption.fontFamily};
  font-size: ${typography.caption.fontSize};
  font-weight: ${typography.caption.fontWeight};
  line-height: ${typography.caption.lineHeight};
  letter-spacing: ${typography.caption.letterSpacing};
`;

export const StrongText = styled.span`
  font-family: ${typography['body-strong'].fontFamily};
  font-size: ${typography['body-strong'].fontSize};
  font-weight: ${typography['body-strong'].fontWeight};
  line-height: ${typography['body-strong'].lineHeight};
  letter-spacing: ${typography['body-strong'].letterSpacing};
`;

// Layout
export const Container = styled.div`
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 ${spacing.lg};
`;

export const Section = styled.section<{ variant?: 'light' | 'parchment' | 'dark' }>`
  background-color: ${props => {
    switch (props.variant) {
      case 'dark':
        return colors['surface-tile-1'];
      case 'parchment':
        return colors['canvas-parchment'];
      default:
        return colors.canvas;
    }
  }};
  color: ${props => props.variant === 'dark' ? colors['body-on-dark'] : colors.ink};
  padding: ${spacing.section} 0;
`;

export const Grid = styled.div<{ $cols?: number; $gap?: string }>`
  display: grid;
  grid-template-columns: repeat(${props => props.$cols || 2}, 1fr);
  gap: ${props => props.$gap || spacing.lg};

  @media (max-width: 834px) {
    grid-template-columns: repeat(1, 1fr);
  }
`;

// Modal
export const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

export const ModalContent = styled.div`
  background-color: ${colors.canvas};
  border-radius: ${rounded.lg};
  padding: ${spacing.xl};
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
`;

export const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${spacing.lg};
`;

export const ModalTitle = styled.h3`
  font-family: ${typography['body-strong'].fontFamily};
  font-size: ${typography['body-strong'].fontSize};
  font-weight: ${typography['body-strong'].fontWeight};
  color: ${colors.ink};
`;

// Form
export const FormGroup = styled.div`
  margin-bottom: ${spacing.md};
`;

export const Label = styled.label`
  display: block;
  font-family: ${typography['caption-strong'].fontFamily};
  font-size: ${typography['caption-strong'].fontSize};
  font-weight: ${typography['caption-strong'].fontWeight};
  color: ${colors['ink-muted-80']};
  margin-bottom: ${spacing.xs};
`;

export const FormActions = styled.div`
  display: flex;
  gap: ${spacing.sm};
  justify-content: flex-end;
  margin-top: ${spacing.lg};
`;

// Badge
export const Badge = styled.span<{ $variant?: 'success' | 'warning' | 'danger' | 'primary' }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: ${rounded.pill};
  font-family: ${typography['caption'].fontFamily};
  font-size: ${typography['caption'].fontSize};
  font-weight: 500;
  background-color: ${props => {
    switch (props.$variant) {
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'danger':
        return colors.danger;
      default:
        return colors.primary;
    }
  }};
  color: ${colors['on-primary']};
`;

// Text Link
export const TextLink = styled.a`
  color: ${colors.primary};
  text-decoration: none;
  cursor: pointer;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.8;
    text-decoration: underline;
  }
`;

// Divider
export const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${colors['divider-soft']};
  margin: ${spacing.md} 0;
`;

// Empty State
export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${spacing.xxl};
  text-align: center;
  color: ${colors['ink-muted-48']};
`;

export const EmptyIcon = styled.div`
  font-size: 64px;
  margin-bottom: ${spacing.md};
  opacity: 0.5;
`;
