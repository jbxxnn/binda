"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  timezone: string;
  currency: string;
  date_format: string;
}

interface PreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (newPreferences: Partial<UserPreferences>) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
}

const defaultPreferences: UserPreferences = {
  notifications: {
    email: true,
    push: true,
    sms: false
  },
  timezone: 'America/New_York',
  currency: 'USD',
  date_format: 'MM/DD/YYYY'
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('userPreferences');
    console.log('Loading preferences from localStorage:', savedPreferences);
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        // Remove theme property if it exists (migration)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { theme, ...preferencesWithoutTheme } = parsed;
        console.log('Parsed preferences:', preferencesWithoutTheme);
        setPreferences(preferencesWithoutTheme);
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    } else {
      console.log('No saved preferences found, using defaults');
    }
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('userPreferences', JSON.stringify(preferences));
  }, [preferences]);

  const updatePreferences = (newPreferences: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }));
  };

  // Currency formatting function
  const formatCurrency = (amount: number): string => {
    const currencyCode = preferences.currency;
    
    // Debug logging
    console.log('formatCurrency called with:', { amount, currencyCode, preferences });
    console.log('Current preferences state:', preferences);
    console.log('Currency from preferences:', preferences.currency);
    
    // Check if preferences are still loading
    if (!currencyCode || currencyCode === 'USD') {
      console.warn('Currency not loaded yet or still USD, using NGN as fallback');
      const fallbackSymbol = '₦';
      const formattedNumber = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
      return `${fallbackSymbol}${formattedNumber}`;
    }
    
    // Currency symbol mapping
    const currencySymbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CHF': 'CHF',
      'CAD': 'C$',
      'AUD': 'A$',
      'NZD': 'NZ$',
      'NGN': '₦',
      'ZAR': 'R',
      'EGP': 'E£',
      'KES': 'KSh',
      'GHS': '₵',
      'MAD': 'MAD',
      'TND': 'DT',
      'DZD': 'DA',
      'ETB': 'Br',
      'UGX': 'USh',
      'TZS': 'TSh',
      'ZMW': 'ZK',
      'BWP': 'P',
      'NAD': 'N$',
      'XOF': 'CFA',
      'XAF': 'FCFA',
      'CNY': '¥',
      'INR': '₹',
      'BRL': 'R$',
      'MXN': '$',
      'SGD': 'S$',
      'HKD': 'HK$',
      'NOK': 'kr',
      'SEK': 'kr',
      'DKK': 'kr',
      'PLN': 'zł',
      'CZK': 'Kč',
      'HUF': 'Ft',
      'RUB': '₽',
      'TRY': '₺',
      'KRW': '₩',
      'THB': '฿',
      'MYR': 'RM',
      'IDR': 'Rp',
      'PHP': '₱'
    };

    const symbol = currencySymbols[currencyCode] || currencyCode;
    
    console.log('Currency formatting:', { currencyCode, symbol, amount });
    
    // Use custom formatting for better symbol control
    try {
      // Format the number with proper locale formatting
      const formattedNumber = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
      
      // Add our custom symbol
      const result = `${symbol}${formattedNumber}`;
      console.log('Final formatted currency:', result);
      return result;
    } catch {
      // Fallback formatting if number formatting fails
      const result = `${symbol}${amount.toFixed(2)}`;
      console.log('Fallback formatted currency:', result);
      return result;
    }
  };

  // Date formatting function
  const formatDate = (date: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
    if (!date) return '';
    
    try {
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString('en-US', {
        timeZone: preferences.timezone,
        ...options
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  // DateTime formatting function
  const formatDateTime = (date: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
    if (!date) return '';
    
    try {
      const dateObj = new Date(date);
      return dateObj.toLocaleString('en-US', {
        timeZone: preferences.timezone,
        ...options
      });
    } catch (error) {
      console.error('Error formatting datetime:', error);
      return '';
    }
  };

  const value: PreferencesContextType = {
    preferences,
    updatePreferences,
    formatCurrency,
    formatDate,
    formatDateTime
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
