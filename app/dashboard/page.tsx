"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePreferences } from "@/lib/contexts/preferences-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  DollarSign, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  Plus,
  // AlertCircle,
  // CheckCircle,
  Clock,
  Loader,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ChevronDown
} from "lucide-react";
import Link from "next/link";
import { WeeklySalesChart } from "@/components/charts/weekly-sales-chart";
// import { PaymentAnalytics } from "@/components/payment-analytics";

interface DashboardData {
  // Today's Snapshot
  todaySales: { count: number; amount: number; changePercent: number };
  todayExpenses: { count: number; amount: number; changePercent: number };
  todayNewCustomers: { count: number; changePercent: number };
  outstandingInvoices: { count: number; amount: number; changePercent: number };
  
  // Cash Flow Overview
  dailyData: { date: string; day: string; sales: number; expenses: number }[];
  monthlyRevenue: number;
  monthlyExpenses: number;
  
  // Customer Highlights
  newCustomersThisWeek: number;
  repeatCustomersThisWeek: number;
  topCustomers: { name: string; total: number }[];
  
  // Actionable Items
  unpaidInvoices: Array<{
    id: string;
    invoice_number: string;
    total_amount: number;
    status: string;
    due_date?: string;
    invoice_date: string;
    customer?: { name: string };
  }>;
  recentTransactions: Array<{
    id: string;
    description: string;
    amount: number;
    type: string;
    transaction_date: string;
    customer?: { name: string };
  }>;
}

export default function DashboardPage() {
  const { formatCurrency, formatDate } = usePreferences();
  const [data, setData] = useState<DashboardData>({
    todaySales: { count: 0, amount: 0, changePercent: 0 },
    todayExpenses: { count: 0, amount: 0, changePercent: 0 },
    todayNewCustomers: { count: 0, changePercent: 0 },
    outstandingInvoices: { count: 0, amount: 0, changePercent: 0 },
    dailyData: [],
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    newCustomersThisWeek: 0,
    repeatCustomersThisWeek: 0,
    topCustomers: [],
    unpaidInvoices: [],
    recentTransactions: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [timePeriod, setTimePeriod] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [isMobile, setIsMobile] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [business, setBusiness] = useState<{
    id: string;
    name: string;
    slug: string;
  } | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const supabase = createClient();
        
        // Get current user and business
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: businesses } = await supabase
          .from('businesses')
          .select('*')
          .eq('owner_id', user.id);

        if (!businesses || businesses.length === 0) return;
        
        const currentBusiness = businesses[0];
        setBusiness(currentBusiness);

        // Get all transactions
        const { data: transactions } = await supabase
          .from('transactions')
          .select(`
            *,
            customer:customers(id, name)
          `)
          .eq('business_id', currentBusiness.id)
          .order('transaction_date', { ascending: false });

        // Get all invoices
        const { data: invoices } = await supabase
          .from('invoices')
          .select(`
            *,
            customer:customers(id, name)
          `)
          .eq('business_id', currentBusiness.id)
          .order('created_at', { ascending: false });

        // Get all customers
        const { data: customers } = await supabase
          .from('customers')
          .select('*')
          .eq('business_id', currentBusiness.id);

        // PERIOD SNAPSHOT - Use selected date and time period
        const periodStart = getPeriodStart(selectedDate, timePeriod);
        const periodEnd = getPeriodEnd(selectedDate, timePeriod);
        const previousPeriodStart = getPeriodStart(getPreviousPeriod(selectedDate, timePeriod), timePeriod);
        const previousPeriodEnd = getPeriodEnd(getPreviousPeriod(selectedDate, timePeriod), timePeriod);
        
        const selectedPeriodTransactions = transactions?.filter(t => {
          const transactionDate = new Date(t.transaction_date);
          return transactionDate >= periodStart && transactionDate <= periodEnd;
        }) || [];
        
        const previousPeriodTransactions = transactions?.filter(t => {
          const transactionDate = new Date(t.transaction_date);
          return transactionDate >= previousPeriodStart && transactionDate <= previousPeriodEnd;
        }) || [];
        
        const selectedPeriodSales = selectedPeriodTransactions.filter(t => t.type === 'income');
        const selectedPeriodExpenses = selectedPeriodTransactions.filter(t => t.type === 'expense');
        const previousPeriodSales = previousPeriodTransactions.filter(t => t.type === 'income');
        const previousPeriodExpenses = previousPeriodTransactions.filter(t => t.type === 'expense');
        
        const selectedPeriodSalesAmount = selectedPeriodSales.reduce((sum, t) => sum + (t.amount || 0), 0);
        const selectedPeriodExpensesAmount = selectedPeriodExpenses.reduce((sum, t) => sum + (t.amount || 0), 0);
        const previousPeriodSalesAmount = previousPeriodSales.reduce((sum, t) => sum + (t.amount || 0), 0);
        const previousPeriodExpensesAmount = previousPeriodExpenses.reduce((sum, t) => sum + (t.amount || 0), 0);
        
        // Calculate percentage changes
        const salesChangePercent = previousPeriodSalesAmount > 0 
          ? ((selectedPeriodSalesAmount - previousPeriodSalesAmount) / previousPeriodSalesAmount) * 100 
          : selectedPeriodSalesAmount > 0 ? 100 : 0;
        
        const expensesChangePercent = previousPeriodExpensesAmount > 0 
          ? ((selectedPeriodExpensesAmount - previousPeriodExpensesAmount) / previousPeriodExpensesAmount) * 100 
          : selectedPeriodExpensesAmount > 0 ? 100 : 0;
        
        const selectedPeriodNewCustomers = customers?.filter(c => {
          const customerDate = new Date(c.created_at);
          return customerDate >= periodStart && customerDate <= periodEnd;
        }).length || 0;
        
        const previousPeriodNewCustomers = customers?.filter(c => {
          const customerDate = new Date(c.created_at);
          return customerDate >= previousPeriodStart && customerDate <= previousPeriodEnd;
        }).length || 0;
        
        const customersChangePercent = previousPeriodNewCustomers > 0 
          ? ((selectedPeriodNewCustomers - previousPeriodNewCustomers) / previousPeriodNewCustomers) * 100 
          : selectedPeriodNewCustomers > 0 ? 100 : 0;
        
        const outstandingInvoices = invoices?.filter(i => 
          i.status === 'sent' || i.status === 'overdue'
        ) || [];
        const outstandingAmount = outstandingInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
        
        // Note: For outstanding invoices, we're comparing current vs a week ago
        // Since we don't have historical data, we'll use current data as baseline
        const weekAgoOutstandingAmount = 0; // Placeholder - would need historical data
        
        const outstandingChangePercent = weekAgoOutstandingAmount > 0 
          ? ((outstandingAmount - weekAgoOutstandingAmount) / weekAgoOutstandingAmount) * 100 
          : outstandingAmount > 0 ? 100 : 0;

        // CASH FLOW OVERVIEW - Full year daily data
        const dailyData = [];
        const todayDate = new Date();
        
        // Generate data for the past 365 days
        for (let i = 364; i >= 0; i--) {
          const date = new Date(todayDate);
          date.setDate(date.getDate() - i);
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          const dateStr = date.toISOString().split('T')[0];
          
          const dayTransactions = transactions?.filter(t => t.transaction_date === dateStr) || [];
          const daySales = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
          const dayExpenses = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
          
          dailyData.push({
            date: dateStr,
            day: dayName,
            sales: daySales,
            expenses: dayExpenses
          });
        }

        // Monthly totals
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyTransactions = transactions?.filter(t => 
          new Date(t.transaction_date).getMonth() === currentMonth &&
          new Date(t.transaction_date).getFullYear() === currentYear
        ) || [];
        
        const monthlyRevenue = monthlyTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + (t.amount || 0), 0);
        const monthlyExpenses = monthlyTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        // CUSTOMER HIGHLIGHTS
        const weekAgoForCustomers = new Date();
        weekAgoForCustomers.setDate(weekAgoForCustomers.getDate() - 7);
        const weekAgoStrForCustomers = weekAgoForCustomers.toISOString().split('T')[0];
        
        const newCustomersThisWeek = customers?.filter(c => 
          new Date(c.created_at).toISOString().split('T')[0] >= weekAgoStrForCustomers
        ).length || 0;

        // Calculate repeat customers (customers with more than 1 transaction this week)
        const weeklyTransactions = transactions?.filter(t => 
          new Date(t.transaction_date).toISOString().split('T')[0] >= weekAgoStrForCustomers
        ) || [];
        
        const customerTransactionCounts = weeklyTransactions.reduce((acc, t) => {
          if (t.customer_id) {
            acc[t.customer_id] = (acc[t.customer_id] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
        
        const repeatCustomersThisWeek = Object.values(customerTransactionCounts).filter((count) => (count as number) > 1).length;

        // Top customers by spend (all time)
        const customerSpending = transactions?.reduce((acc, t) => {
          if (t.customer_id && t.type === 'income') {
            if (!acc[t.customer_id]) {
              acc[t.customer_id] = { name: t.customer?.name || 'Unknown', total: 0 };
            }
            acc[t.customer_id].total += t.amount || 0;
          }
          return acc;
        }, {} as Record<string, { name: string; total: number }>) || {};

        const topCustomers = (Object.values(customerSpending) as { name: string; total: number }[])
          .sort((a, b) => b.total - a.total)
          .slice(0, 3);

        // ACTIONABLE ITEMS
        const unpaidInvoices = outstandingInvoices.slice(0, 5); // Top 5 unpaid
        const recentTransactions = transactions?.slice(0, 8) || []; // Last 8 transactions

        setData({
          todaySales: { count: selectedPeriodSales.length, amount: selectedPeriodSalesAmount, changePercent: salesChangePercent },
          todayExpenses: { count: selectedPeriodExpenses.length, amount: selectedPeriodExpensesAmount, changePercent: expensesChangePercent },
          todayNewCustomers: { count: selectedPeriodNewCustomers, changePercent: customersChangePercent },
          outstandingInvoices: { count: outstandingInvoices.length, amount: outstandingAmount, changePercent: outstandingChangePercent },
          dailyData,
          monthlyRevenue,
          monthlyExpenses,
          newCustomersThisWeek,
          repeatCustomersThisWeek,
          topCustomers: topCustomers as { name: string; total: number }[],
          unpaidInvoices: unpaidInvoices as Array<{
            id: string;
            invoice_number: string;
            total_amount: number;
            status: string;
            due_date?: string;
            invoice_date: string;
            customer?: { name: string };
          }>,
          recentTransactions: recentTransactions as Array<{
            id: string;
            description: string;
            amount: number;
            type: string;
            transaction_date: string;
            customer?: { name: string };
          }>
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedDate, timePeriod]);

  // Handle mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile(); // Check on mount
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };

    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCalendarOpen]);

  // Handle time period changes - ensure selected date is properly centered
  useEffect(() => {
    // When time period changes, we don't need to change selectedDate
    // The generateDateOptions will automatically center around the current selectedDate
    // This effect just ensures the UI updates properly
  }, [timePeriod]);



  const formatDateForSelector = (date: Date) => {
    return formatDate(date, {
      day: '2-digit',
      // month: 'short'
    });
  };

  const formatDayForSelector = (date: Date) => {
    return formatDate(date, {
      // weekday: 'short'
      month: 'short'
    });
  };

  // const navigateDate = (direction: 'prev' | 'next') => {
  //   const newDate = new Date(selectedDate);
  //   switch (timePeriod) {
  //     case 'day':
  //       newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
  //       break;
  //     case 'week':
  //       newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
  //       break;
  //     case 'month':
  //       newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
  //       break;
  //     case 'year':
  //       newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1));
  //       break;
  //   }
  //   setSelectedDate(newDate);
  // };

  // Helper functions for different time periods
  const getPeriodStart = (date: Date, period: 'day' | 'week' | 'month' | 'year') => {
    const start = new Date(date);
    switch (period) {
      case 'day':
        start.setHours(0, 0, 0, 0);
        return start;
      case 'week':
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        return start;
      case 'month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        return start;
      case 'year':
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        return start;
    }
  };

  const getPeriodEnd = (date: Date, period: 'day' | 'week' | 'month' | 'year') => {
    const end = new Date(date);
    switch (period) {
      case 'day':
        end.setHours(23, 59, 59, 999);
        return end;
      case 'week':
        const dayOfWeek = end.getDay();
        end.setDate(end.getDate() + (6 - dayOfWeek));
        end.setHours(23, 59, 59, 999);
        return end;
      case 'month':
        end.setMonth(end.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        return end;
      case 'year':
        end.setMonth(11, 31);
        end.setHours(23, 59, 59, 999);
        return end;
    }
  };

  const getPreviousPeriod = (date: Date, period: 'day' | 'week' | 'month' | 'year') => {
    const prev = new Date(date);
    switch (period) {
      case 'day':
        prev.setDate(prev.getDate() - 1);
        return prev;
      case 'week':
        prev.setDate(prev.getDate() - 7);
        return prev;
      case 'month':
        prev.setMonth(prev.getMonth() - 1);
        return prev;
      case 'year':
        prev.setFullYear(prev.getFullYear() - 1);
        return prev;
    }
  };

  const generateDateOptions = () => {
    const options = [];
    const currentDate = selectedDate; // Use selectedDate as the center point
    
    // Use responsive range based on screen size
    const range = isMobile ? 2 : 5; // 2 past + 1 present + 2 future on mobile, 5 past + 1 present + 5 future on desktop
    
    switch (timePeriod) {
      case 'day':
        for (let i = -range; i <= range; i++) {
          const date = new Date(currentDate);
          date.setDate(date.getDate() + i);
          options.push(date);
        }
        break;
      case 'week':
        for (let i = -range; i <= range; i++) {
          const date = new Date(currentDate);
          date.setDate(date.getDate() + (i * 7));
          options.push(getPeriodStart(date, 'week'));
        }
        break;
      case 'month':
        for (let i = -range; i <= range; i++) {
          const date = new Date(currentDate);
          date.setMonth(date.getMonth() + i);
          options.push(getPeriodStart(date, 'month'));
        }
        break;
      case 'year':
        for (let i = -range; i <= range; i++) {
          const date = new Date(currentDate);
          date.setFullYear(date.getFullYear() + i);
          options.push(getPeriodStart(date, 'year'));
        }
        break;
    }
    
    return options;
  };

  // Helper function to check if a date matches the selected period
  const isDateSelected = (date: Date) => {
    switch (timePeriod) {
      case 'day':
        return date.toDateString() === selectedDate.toDateString();
      case 'week':
        const selectedWeekStart = getPeriodStart(selectedDate, 'week');
        const dateWeekStart = getPeriodStart(date, 'week');
        return selectedWeekStart.toDateString() === dateWeekStart.toDateString();
      case 'month':
        return date.getMonth() === selectedDate.getMonth() && 
               date.getFullYear() === selectedDate.getFullYear();
      case 'year':
        return date.getFullYear() === selectedDate.getFullYear();
      default:
        return false;
    }
  };

  const generateCalendarDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const MiniCalendar = () => {
    const [currentMonth, setCurrentMonth] = useState(selectedDate.getMonth());
    const [currentYear, setCurrentYear] = useState(selectedDate.getFullYear());
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const navigateMonth = (direction: 'prev' | 'next') => {
      if (direction === 'prev') {
        if (currentMonth === 0) {
          setCurrentMonth(11);
          setCurrentYear(currentYear - 1);
        } else {
          setCurrentMonth(currentMonth - 1);
        }
      } else {
        if (currentMonth === 11) {
          setCurrentMonth(0);
          setCurrentYear(currentYear + 1);
        } else {
          setCurrentMonth(currentMonth + 1);
        }
      }
    };
    
    const handleDateSelect = (date: Date) => {
      setSelectedDate(date);
      setIsCalendarOpen(false);
    };
    
    const days = generateCalendarDays(currentYear, currentMonth);
    
    return (
      <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 w-80">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h3 className="text-lg font-semibold">
            {monthNames[currentMonth]} {currentYear}
          </h3>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            if (!day) {
              return <div key={index} className="p-2"></div>;
            }
            
            const isSelected = day.toDateString() === selectedDate.toDateString();
            const isToday = day.toDateString() === new Date().toDateString();
            
            return (
              <button
                key={index}
                onClick={() => handleDateSelect(day)}
                className={`p-2 text-sm rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : isToday
                    ? 'bg-blue-100 text-blue-600 font-semibold'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // const getStatusColor = (status: string) => {
  //   switch (status) {
  //     case 'draft': return 'bg-gray-100 text-gray-800';
  //     case 'sent': return 'bg-blue-100 text-blue-800';
  //     case 'paid': return 'bg-green-100 text-green-800';
  //     case 'overdue': return 'bg-red-100 text-red-800';
  //     case 'cancelled': return 'bg-gray-100 text-gray-800';
  //     default: return 'bg-gray-100 text-gray-800';
  //   }
  // };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center h-full">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 bg-brand-lightning">
      {/* Welcome Section */}
      <div className="space-y-2 pb-8">
        <h1 className="text-3xl font-bold tracking-tight">Good morning! 👋</h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with {business?.name || 'your business'} today.
        </p>
      </div>



      {/* DATE SELECTOR */}


      <div className="bg-brand-lightning">
        <div className="p-4">
          <div className="flex items-center justify-between flex-col md:flex-row gap-4 md:gap-0">
            <div className="flex items-center space-x-4">
             
              
              {/* <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate('prev')}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button> */}
              </div>

              <div className="flex items-center space-x-4">              
              <div className="flex space-x-1">
                {generateDateOptions().map((date, index) => {
                  const isSelected = isDateSelected(date);
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDate(date)}
                      className={`px-3 py-2 rounded-lg text-center transition-colors ${
                        isSelected
                          ? 'text-brand-hunter text-4xl'
                          : 'text-brand-tropical text-sm'
                      }`}
                    >
                      <div className="font-bold">
                        {timePeriod === 'day' && formatDateForSelector(date)}
                        {timePeriod === 'week' && `W${Math.ceil(date.getDate() / 7)}`}
                        {timePeriod === 'month' && date.toLocaleDateString('en-US', { month: 'short' })}
                        {timePeriod === 'year' && date.getFullYear().toString()}
                      </div>
                      <div className="text-xs opacity-75">
                        {timePeriod === 'day' && formatDayForSelector(date)}
                        {timePeriod === 'week' && formatDateForSelector(date)}
                        {timePeriod === 'month' && date.getFullYear().toString()}
                        {timePeriod === 'year' && ''}
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {/* <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate('next')}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button> */}
            </div>
            
            <div className="flex items-center space-x-4">
            <div className="relative" ref={calendarRef}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  className="h-8 w-8 p-0"
                >
                  <Calendar className="h-4 w-4" />
                </Button>
                {isCalendarOpen && <MiniCalendar />}
              </div>
              <div className="relative">
                <select
                  title="Select time period for dashboard data"
                  value={timePeriod}
                  onChange={(e) => setTimePeriod(e.target.value as 'day' | 'week' | 'month' | 'year')}
                  className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-1 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              
              {/* <div className="text-sm text-gray-500">
                {timePeriod === 'day' && (selectedDate.toDateString() === new Date().toDateString() ? 'Today' : 
                 selectedDate.toDateString() === new Date(Date.now() - 86400000).toDateString() ? 'Yesterday' :
                 formatDate(selectedDate.toISOString()))}
                {timePeriod === 'week' && `Week of ${formatDate(getPeriodStart(selectedDate, 'week').toISOString())}`}
                {timePeriod === 'month' && selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                {timePeriod === 'year' && selectedDate.getFullYear().toString()}
              </div> */}
            </div>
          </div>
        </div>
      </div>


      {/* General Snapshot */}

      <div className="grid gap-4 bg-[#ccd6c24d] p-6 rounded-sm border border-brand-tropical">
        <div>
          <div className="border-brand-tropical pb-12 px-0 md:px-8">
            <div className="text-2xl font-bold">Performance Metrics</div>
            <div className="text-sm text-muted-foreground">A snapshot of your business</div>
          </div>
           <div className="grid md:grid-cols-4 relative gap-12 md:gap-0">
             {/* <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-mint to-transparent shadow-[0_0_8px_rgba(251,191,36,0.3)]"></div> */}
             <div className="p-4 md:pl-8 h-20 flex flex-col justify-center relative">
               <div className="hidden md:block absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-brand-hunter to-transparent shadow-[0_0_8px_rgba(251,191,36,0.3)]"></div>
              <p className="text-sm font-medium text-green-800 mb-2">Sales Today</p>
              <div className="text-3xl font-medium text-green-900 flex items-center gap-2">
              {formatCurrency(data.todaySales.amount)}
              </div>
              <div className="flex items-center gap-2"> 
              <p className="text-xs text-green-700">
              {data.todaySales.count} transactions
              </p>
              <Badge className={`border-green-200 bg-green-200 font-regular text-green-600 gap-2 hover:bg-green-200 hover:text-green-600 shadow-none ${
                data.todaySales.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {data.todaySales.changePercent >= 0 ? '+' : ''}{data.todaySales.changePercent.toFixed(0)}%
                {data.todaySales.changePercent >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
              </Badge>
              </div>
             </div>
             <div className="p-4 md:pl-8 h-20 flex flex-col justify-center relative">
               <div className="hidden md:block absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-brand-hunter to-transparent shadow-[0_0_8px_rgba(251,191,36,0.3)]"></div>
               <p className="text-sm font-medium text-red-800 mb-2">Expenses Today</p>
              <div className="text-3xl font-medium text-red-900 flex items-center gap-2">
                {formatCurrency(data.todayExpenses.amount)}
              </div>
              <div className="flex items-center gap-2">
              <p className="text-xs text-red-700">
                {data.todayExpenses.count} transactions
              </p>
              <Badge className={`border-red-200 bg-red-200 font-regular text-red-600 gap-2 hover:bg-red-200 hover:text-red-600 shadow-none ${
                data.todayExpenses.changePercent >= 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {data.todayExpenses.changePercent >= 0 ? '+' : ''}{data.todayExpenses.changePercent.toFixed(0)}%
                {data.todayExpenses.changePercent >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
              </Badge>
              </div>
             </div>
             <div className="p-4 md:pl-8 h-20 flex flex-col justify-center relative">
                <div className="hidden md:block absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-brand-hunter to-transparent shadow-[0_0_8px_rgba(251,191,36,0.3)]"></div>
               <p className="text-sm font-medium text-blue-800 mb-2">New Customers</p>
              <div className="text-3xl font-medium text-blue-900 flex items-center gap-2">
                {data.todayNewCustomers.count}
              </div>
              <div className="flex items-center gap-2">
              <p className="text-xs text-blue-700">
                added today
              </p>
              <Badge className={`border-blue-200 bg-blue-200 font-regular text-blue-600 gap-2 hover:bg-blue-200 hover:text-blue-600 shadow-none ${
                data.todayNewCustomers.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {data.todayNewCustomers.changePercent >= 0 ? '+' : ''}{data.todayNewCustomers.changePercent.toFixed(0)}%
                {data.todayNewCustomers.changePercent >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
              </Badge>
              </div>
             </div>
             <div className="p-4 md:pl-8 h-20 flex flex-col justify-center relative">
               {/* <div className="hidden md:block absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-amber-300 to-transparent shadow-[0_0_8px_rgba(251,191,36,0.3)]"></div> */}
               <p className="text-sm font-medium text-orange-800 mb-2">Outstanding</p>
              <div className="text-3xl font-medium text-orange-900 flex items-center gap-2">
                {formatCurrency(data.outstandingInvoices.amount)}
              </div>
              <div className="flex items-center gap-2">
              <p className="text-xs text-orange-700">
                unpaid invoices
              </p>
              <Badge className={`border-orange-200 bg-orange-200 font-regular text-orange-600 gap-2 hover:bg-orange-200 hover:text-orange-600 shadow-none ${
                data.outstandingInvoices.changePercent >= 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {data.outstandingInvoices.changePercent >= 0 ? '+' : ''}{data.outstandingInvoices.changePercent.toFixed(0)}%
                {data.outstandingInvoices.changePercent >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
              </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CASH FLOW OVERVIEW - Charts */}
      <div className="grid gap-6">
        {/* Daily Sales vs Expenses - Interactive Chart */}
        <WeeklySalesChart data={data.dailyData} />
      </div>

      <div className="grid gap-6 md:grid-cols-3">

        {/* Monthly Totals */}
        <div className="bg-brand-snowman p-6 min-h-[25rem] rounded-sm border border-brand-tropical flex justify-between flex-col">
          <div className="border-b pb-4">
            <h3 className="text-sm font-medium text-gray-900">This Month</h3>
            <p>Monthly revenue and expenses</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <ArrowUpRight className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-sm font-medium text-green-800">Revenue</div>
                  <div className="text-xs text-green-600">Money coming in</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-green-900">
                {formatCurrency(data.monthlyRevenue)}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <ArrowDownRight className="h-5 w-5 text-red-600" />
                <div>
                  <div className="text-sm font-medium text-red-800">Expenses</div>
                  <div className="text-xs text-red-600">Money going out</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-red-900">
                {formatCurrency(data.monthlyExpenses)}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <DollarSign className="h-5 w-5 text-gray-600" />
                <div>
                  <div className="text-sm font-medium text-gray-800">Net Profit</div>
                  <div className="text-xs text-gray-600">Revenue - Expenses</div>
                </div>
              </div>
              <div className={`text-2xl font-bold ${
                data.monthlyRevenue > data.monthlyExpenses ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(data.monthlyRevenue - data.monthlyExpenses)}
              </div>
            </div>
          </div>
        </div>

      {/* CUSTOMER HIGHLIGHTS */}
      <div className="bg-brand-snowman p-6 min-h-[25rem] rounded-sm border border-brand-tropical flex flex-col">
        <div className="border-b pb-4">
          <h3 className="text-sm font-medium text-gray-900">Customer Growth</h3>
          <p>How your customer base is growing</p>
        </div>
        <div className="space-y-4 mt-4">
          <div className="grid gap-4">
            <div className="text-center p-2 bg-blue-50 rounded-sm flex items-center justify-start gap-4">
              <div className="text-2xl font-bold text-blue-900">{data.newCustomersThisWeek}</div>
              <div className="text-sm text-blue-700">New customers this week</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded-sm flex items-center justify-start gap-4">
              <div className="text-2xl font-bold text-green-900">{data.repeatCustomersThisWeek}</div>
              <div className="text-sm text-green-700">Repeat customers this week</div>
            </div>
            <div className="text-center p-2 bg-purple-50 rounded-sm flex items-center justify-start gap-4">
              <div className="text-2xl font-bold text-purple-900">{data.topCustomers.length}</div>
              <div className="text-sm text-purple-700">Top customers tracked</div>
            </div>
          </div>
          
          {data.topCustomers.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Top Customers by Spend</h4>
              <div className="space-y-2">
                {data.topCustomers.map((customer, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium">{customer.name}</span>
                    <span className="text-sm font-bold text-green-600">{formatCurrency(customer.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

       {/* Recent Transactions */}
       <div className="bg-brand-snowman p-6 min-h-[25rem] rounded-sm border border-brand-tropical flex flex-col">
          <div className="border-b pb-4">
            <h3 className="text-sm font-medium text-gray-900">Recent Transactions</h3>
            <p>Latest sales and expenses</p>
          </div>
          <div className="space-y-3 mt-4">
            <div className="space-y-3">
              {data.recentTransactions.length > 0 ? (
                data.recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {transaction.type === 'income' ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{transaction.description}</div>
                        <div className="text-xs text-gray-600">
                          {transaction.customer?.name || 'No customer'} • {formatDate(transaction.transaction_date)}
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm font-bold ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <div>No transactions yet</div>
                </div>
              )}
            </div>
          </div>
        </div>
      
      </div>

      {/* ACTIONABLE ITEMS */}
     

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to get things done</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button className="h-20 flex-col space-y-2" variant="outline" asChild>
              <Link href="/dashboard/transactions">
                <Plus className="h-6 w-6" />
                <span>Record Sale</span>
              </Link>
            </Button>
            <Button className="h-20 flex-col space-y-2" variant="outline" asChild>
              <Link href="/dashboard/invoices">
                <FileText className="h-6 w-6" />
                <span>Create Invoice</span>
              </Link>
            </Button>
            <Button className="h-20 flex-col space-y-2" variant="outline" asChild>
              <Link href="/dashboard/customers">
                <Users className="h-6 w-6" />
                <span>Add Customer</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PAYMENT ANALYTICS */}
      {/* <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Payment Analytics</h2>
        <PaymentAnalytics selectedDate={selectedDate} timePeriod={timePeriod} />
      </div> */}
    </div>
  );
}