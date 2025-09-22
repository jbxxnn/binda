"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

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
  refreshPreferences: () => Promise<void>;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  isLoading: boolean;
  error: string | null;
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load preferences from database on mount
  const loadPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/preferences');
      if (!response.ok) {
        throw new Error('Failed to fetch preferences');
      }
      
      const data = await response.json();
      console.log('Loaded preferences from database:', data.preferences);
      
      // Remove theme property if it exists (migration)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { theme, ...preferencesWithoutTheme } = data.preferences;
      setPreferences(preferencesWithoutTheme);
      
      // Also save to localStorage as backup
      localStorage.setItem('userPreferences', JSON.stringify(preferencesWithoutTheme));
    } catch (error) {
      console.error('Error loading preferences from database:', error);
      setError('Failed to load preferences');
      
      // Fallback to localStorage
      const savedPreferences = localStorage.getItem('userPreferences');
      if (savedPreferences) {
        try {
          const parsed = JSON.parse(savedPreferences);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { theme, ...preferencesWithoutTheme } = parsed;
          console.log('Using localStorage fallback:', preferencesWithoutTheme);
          setPreferences(preferencesWithoutTheme);
        } catch (localError) {
          console.error('Error loading from localStorage fallback:', localError);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const updatePreferences = useCallback(async (newPreferences: Partial<UserPreferences>) => {
    try {
      setError(null);
      
      // Update local state immediately for better UX
      const updatedPreferences = { ...preferences, ...newPreferences };
      setPreferences(updatedPreferences);
      
      // Save to localStorage as backup
      localStorage.setItem('userPreferences', JSON.stringify(updatedPreferences));
      
      // Save to database
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences: updatedPreferences }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Failed to save preferences to database: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Preferences saved to database:', data.preferences);
    } catch (error) {
      console.error('Error saving preferences to database:', error);
      setError('Failed to save preferences');
      
      // Revert local state on error
      const savedPreferences = localStorage.getItem('userPreferences');
      if (savedPreferences) {
        try {
          const parsed = JSON.parse(savedPreferences);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { theme, ...preferencesWithoutTheme } = parsed;
          setPreferences(preferencesWithoutTheme);
        } catch (localError) {
          console.error('Error reverting to localStorage:', localError);
        }
      }
    }
  }, [preferences]);

  // Currency formatting function
  const formatCurrency = (amount: number): string => {
    const currencyCode = preferences.currency;
    
    // Debug logging
    console.log('formatCurrency called with:', { amount, currencyCode, preferences });
    console.log('Current preferences state:', preferences);
    console.log('Currency from preferences:', preferences.currency);
    console.log('Currency code type:', typeof currencyCode, 'Value:', currencyCode);
    
    // Check if preferences are still loading
    if (!currencyCode) {
      console.warn('Currency not loaded yet, using USD as fallback');
      const fallbackSymbol = '$';
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
    refreshPreferences: loadPreferences,
    formatCurrency,
    formatDate,
    formatDateTime,
    isLoading,
    error
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
