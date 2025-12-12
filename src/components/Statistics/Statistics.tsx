import React, { useContext, useState, useEffect, useCallback } from 'react';
import { UserContext } from '../../context/UserContext';
import { ZoneContext } from '../../context/ZoneContext';
import { LayoutContext } from '../../context/LayoutContext';
import { useLanguage } from '../../context/LanguageContext';
import { statisticsService } from '../../services/statisticsService';
import { reservationsService } from '../../services/reservationsService';
import { eventReservationsService } from '../../services/eventReservationsService';
import { guestbookService } from '../../services/guestbookService';
import { supabase } from '../../utils/supabaseClient';
import { Reservation } from '../../types/reservation';
import { EventReservation } from '../../types/event';
import { formatZoneName, formatTableNames } from '../../utils/tableHelper';
import CustomDatePicker from './CustomDatePicker';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  subDays, subMonths, isWithinInterval, parseISO, isSameDay
} from 'date-fns';
import DeleteConfirmationModal from '../common/DeleteConfirmationModal';
import { ThemeContext } from '../../context/ThemeContext';

interface StatisticsProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterType = 'today' | 'week' | 'month';

const Statistics: React.FC<StatisticsProps> = ({ isOpen, onClose }) => {
  const { user } = useContext(UserContext);
  const { zones } = useContext(ZoneContext);
  const { zoneLayouts } = useContext(LayoutContext);
  const { t, getMonthNames, translations } = useLanguage();
  const { theme } = useContext(ThemeContext);
  const isLight = theme === 'light';
  
  // Helper function to format month name with translation
  const formatMonthYear = (dateString: string): string => {
    const date = parseISO(dateString);
    const monthNames = getMonthNames();
    const monthIndex = date.getMonth();
    const year = date.getFullYear();
    return `${monthNames[monthIndex]} ${year}`;
  };

  // Helper function to translate status values
  const getStatusTranslation = (status: string): string => {
    switch (status) {
      case 'arrived':
        return t('arrivedLabel');
      case 'not_arrived':
        return t('notArrivedLabel');
      case 'cancelled':
        return t('cancelledLabel');
      case 'confirmed':
        return t('confirmed');
      case 'pending':
        return t('pending');
      case 'waiting':
      case 'booked': // Event reservations use 'booked' status, treat same as 'waiting'
        return t('waiting');
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };
  
  const [filter, setFilter] = useState<FilterType>('month');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedWeek, setSelectedWeek] = useState<string>(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<any[]>([]);
  const [topTables, setTopTables] = useState<any[]>([]);
  const [topZones, setTopZones] = useState<any[]>([]);
  const [topWaiters, setTopWaiters] = useState<any[]>([]);
  const [topLoyaltyGuests, setTopLoyaltyGuests] = useState<any[]>([]);
  const [todayReservations, setTodayReservations] = useState<any[]>([]);
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [allEventReservations, setAllEventReservations] = useState<EventReservation[]>([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Define loadStatistics function with useCallback to avoid initialization issues
  const loadStatistics = useCallback(async () => {
    if (!user) return;
    
    console.log('�� Loading statistics');
    setLoading(true);
    try {
      let startDate: string;
      let endDate: string;
      
      switch (filter) {
        case 'today':
          const selectedDateObj = new Date(selectedDate);
          startDate = format(startOfDay(selectedDateObj), 'yyyy-MM-dd');
          endDate = format(endOfDay(selectedDateObj), 'yyyy-MM-dd');
          break;
        case 'week':
          const selectedWeekObj = new Date(selectedWeek);
          startDate = format(startOfWeek(selectedWeekObj, { weekStartsOn: 1 }), 'yyyy-MM-dd');
          endDate = format(endOfWeek(selectedWeekObj, { weekStartsOn: 1 }), 'yyyy-MM-dd');
          break;
        case 'month':
          const selectedMonthObj = new Date(selectedMonth + '-01');
          startDate = format(startOfMonth(selectedMonthObj), 'yyyy-MM-dd');
          endDate = format(endOfMonth(selectedMonthObj), 'yyyy-MM-dd');
          break;
      }
      


      // Get daily statistics for chart (regular reservations only, for backward compat)
      const dailyData = await statisticsService.getStatistics(user.id, startDate, endDate);
      setDailyStats(dailyData);
      
      // Load all reservations for the current filter period
      let allReservationsData: Reservation[] = [];
      let allEventReservationsData: EventReservation[] = [];
      
      try {
        console.log('📊 Loading all reservations for period:', { startDate, endDate, filter });
        allReservationsData = await reservationsService.getReservationsForAnalytics(user.id, startDate, endDate);
        console.log('📊 All reservations data length:', allReservationsData?.length || 0);
        setAllReservations(allReservationsData || []);
      } catch (error) {
        console.error('Error loading all reservations:', error);
        setAllReservations([]);
      }

      // Load all event reservations for the current filter period (including soft deleted for statistics)
      try {
        console.log('📊 Loading all event reservations for period:', { startDate, endDate, filter });
        allEventReservationsData = await eventReservationsService.getForAnalytics(user.id, startDate, endDate);
        console.log('📊 All event reservations data length:', allEventReservationsData?.length || 0);
        setAllEventReservations(allEventReservationsData || []);
      } catch (error) {
        console.error('Error loading all event reservations:', error);
        setAllEventReservations([]);
      }

      // Calculate combined aggregated statistics from both regular and event reservations
      const combinedStats = {
        totalReservations: 0,
        totalGuests: 0,
        arrivedReservations: 0,
        notArrivedReservations: 0,
        cancelledReservations: 0
      };

      // Count regular reservations
      (allReservationsData || []).forEach((r: any) => {
        combinedStats.totalReservations += 1;
        combinedStats.totalGuests += r.numberOfGuests || 0;
        // Treat cleared finished stays as arrived
        if (r.status === 'arrived' || (r.status === 'cancelled' && r.cleared === true)) {
          combinedStats.arrivedReservations += 1;
        } else if (r.status === 'not_arrived') {
          combinedStats.notArrivedReservations += 1;
        } else if (r.status === 'cancelled') {
          combinedStats.cancelledReservations += 1;
        }
      });

      // Count event reservations
      (allEventReservationsData || []).forEach((r: any) => {
        combinedStats.totalReservations += 1;
        combinedStats.totalGuests += r.numberOfGuests || 0;
        if (r.status === 'arrived') {
          combinedStats.arrivedReservations += 1;
        } else if (r.status === 'not_arrived') {
          combinedStats.notArrivedReservations += 1;
        } else if (r.status === 'cancelled') {
          combinedStats.cancelledReservations += 1;
        }
        // 'booked' status is treated as 'waiting', not counted in arrived/not_arrived/cancelled
      });

      console.log('📊 Combined statistics:', combinedStats);
      setStats(combinedStats);

      // If Today filter is selected, combine reservations for hourly breakdown
      if (filter === 'today') {
        try {
          console.log('📊 Loading today reservations for date range:', startDate, 'to', endDate);
          // Combine regular and event reservations for today's hourly breakdown
          const combinedTodayReservations = [
            ...(allReservationsData || []).map((r: any) => ({ ...r, _type: 'regular' })),
            ...(allEventReservationsData || []).map((r: any) => ({ ...r, _type: 'event' }))
          ];
          console.log('📊 Combined today reservations:', combinedTodayReservations.length);
          setTodayReservations(combinedTodayReservations);
        } catch (error) {
          console.error('Error loading today reservations:', error);
          setTodayReservations([]);
        }
      } else {
        // Clear today reservations when not in 'today' filter
        setTodayReservations([]);
      }
      
      // Get monthly statistics for overview - using direct reservations for accuracy
      try {
        console.log('📊 Loading monthly statistics');
        const sixMonthsAgo = format(subMonths(new Date(), 6), 'yyyy-MM-dd');
        const monthlyEndDate = format(new Date(), 'yyyy-MM-dd');
        
        // Get all reservations for the last 6 months (both regular and event)
        const [monthlyReservationsData, monthlyEventReservationsData] = await Promise.all([
          reservationsService.getReservationsForAnalytics(user.id, sixMonthsAgo, monthlyEndDate),
          eventReservationsService.getForAnalytics(user.id, sixMonthsAgo, monthlyEndDate)
        ]);
        console.log('📊 Monthly reservations data:', monthlyReservationsData?.length || 0, 'reservations');
        console.log('📊 Monthly event reservations data:', monthlyEventReservationsData?.length || 0, 'event reservations');
        
        // Combine regular and event reservations for monthly stats
        const allMonthlyData = [
          ...(monthlyReservationsData || []).map((r: any) => ({ ...r, type: 'regular' })),
          ...(monthlyEventReservationsData || []).map((r: any) => ({ ...r, type: 'event' }))
        ];
        
        if (allMonthlyData.length > 0) {
          // Group by month
          const monthlyGrouped = allMonthlyData.reduce((acc: any, reservation: any) => {
            const month = format(parseISO(reservation.date), 'yyyy-MM');
            if (!acc[month]) {
              acc[month] = {
                month: formatMonthYear(reservation.date),
                reservations: 0,
                guests: 0,
                arrived: 0,
                notArrived: 0,
                cancelled: 0
              };
            }
            acc[month].reservations += 1;
            acc[month].guests += reservation.numberOfGuests || 0;
            // Treat cleared finished stays as arrived
            if (reservation.status === 'arrived' || (reservation.status === 'cancelled' && reservation.cleared === true)) {
              acc[month].arrived += 1;
            } else if (reservation.status === 'not_arrived') {
              acc[month].notArrived += 1;
            } else if (reservation.status === 'cancelled') {
              acc[month].cancelled += 1;
            }
            return acc;
          }, {});
          
          // Sort by month from newest to oldest and take last 6 months
          const sortedMonths = Object.values(monthlyGrouped)
            .sort((a: any, b: any) => new Date(b.month).getTime() - new Date(a.month).getTime())
            .slice(0, 6);
          
          console.log('📊 Monthly grouped data:', sortedMonths);
          setMonthlyStats(sortedMonths);
        } else {
          console.log('📊 No monthly reservations found');
          setMonthlyStats([]);
        }
      } catch (error) {
        console.error('Error loading monthly statistics:', error);
        setMonthlyStats([]);
      }
      
      // Get top tables statistics (combined from regular and event reservations)
      try {
        console.log('📊 Loading top tables statistics (combined regular + event)');
        const tableCount: { [key: string]: number } = {};
        
        // Get all regular reservations for the user
        const { data: regularReservationsForTables, error: regularError } = await supabase
          .from('reservations')
          .select('table_ids')
          .eq('user_id', user.id)
          .not('table_ids', 'is', null);
          
        if (!regularError && regularReservationsForTables) {
          regularReservationsForTables.forEach((reservation: any) => {
            if (reservation.table_ids && Array.isArray(reservation.table_ids)) {
              reservation.table_ids.forEach((tableId: string) => {
                tableCount[tableId] = (tableCount[tableId] || 0) + 1;
              });
            }
          });
        }
        
        // Get all event reservations for the user (for tables and zones)
        const { data: eventReservationsForTables, error: eventError } = await supabase
          .from('event_reservations')
          .select('table_ids')
          .eq('user_id', user.id)
          .not('table_ids', 'is', null);
          
        if (!eventError && eventReservationsForTables) {
          eventReservationsForTables.forEach((reservation: any) => {
            if (reservation.table_ids && Array.isArray(reservation.table_ids)) {
              // Event reservations store table numbers/names directly, not IDs
              reservation.table_ids.forEach((tableNumber: string) => {
                tableCount[tableNumber] = (tableCount[tableNumber] || 0) + 1;
              });
            }
          });
        }
        
        // Convert to array and sort for tables
        const topTablesArray = Object.entries(tableCount)
          .map(([tableId, count]) => ({
            table_id: tableId,
            reservation_count: count
          }))
          .sort((a, b) => b.reservation_count - a.reservation_count)
          .slice(0, 10);
          
        console.log('📊 Combined top tables:', topTablesArray);
        setTopTables(topTablesArray);

        // ----- Top Zones -----
        const zoneCount: Record<string, number> = {};

        // Count regular reservations per zone
        (allReservationsData || []).forEach((r: any) => {
          const zoneId = r.zoneId || r.zone_id;
          if (!zoneId) return;
          zoneCount[zoneId] = (zoneCount[zoneId] || 0) + 1;
        });

        // Count event reservations per zone
        (allEventReservationsData || []).forEach((r: any) => {
          const zoneId = r.zoneId || r.zone_id;
          if (!zoneId) return;
          zoneCount[zoneId] = (zoneCount[zoneId] || 0) + 1;
        });

        const topZonesArray = Object.entries(zoneCount)
          .map(([zoneId, count]) => ({
            zone_id: zoneId,
            reservation_count: count
          }))
          .sort((a, b) => b.reservation_count - a.reservation_count)
          .slice(0, 10);

        console.log('📊 Combined top zones:', topZonesArray);
        setTopZones(topZonesArray);

        // ----- Top Waiters -----
        const waiterCount: Record<string, number> = {};

        try {
          // Regular reservations waiters
          const { data: waiterRows, error: waiterErr } = await supabase
            .from('reservation_waiters')
            .select('waiter_name')
            .eq('user_id', user.id);

          if (!waiterErr && waiterRows) {
            waiterRows.forEach((row: any) => {
              const name = (row.waiter_name || '').trim();
              if (!name) return;
              waiterCount[name] = (waiterCount[name] || 0) + 1;
            });
          }
        } catch (err) {
          console.error('Error loading waiter statistics:', err);
        }

        const topWaitersArray = Object.entries(waiterCount)
          .map(([name, count]) => ({
            waiter_name: name,
            reservation_count: count
          }))
          .sort((a, b) => b.reservation_count - a.reservation_count)
          .slice(0, 10);

        console.log('📊 Top waiters:', topWaitersArray);
        setTopWaiters(topWaitersArray);

        // ----- Top Loyalty Guests (Guestbook) -----
        try {
          const guestbookEntries = await guestbookService.list();
          const loyaltyCandidates = (guestbookEntries || []).filter((g: any) => {
            const visits = typeof g.totalVisits === 'number' ? g.totalVisits : 0;
            const avgBill = typeof g.averageBill === 'number' ? g.averageBill : 0;
            const hasLoyaltyTag =
              Array.isArray(g.tags) && g.tags.some((t: string) => typeof t === 'string' && t.startsWith('loy:'));
            // Consider as loyalty if marked VIP or has a loyalty tag, and has at least 1 visit
            return (g.isVip || hasLoyaltyTag) && (visits > 0 || avgBill > 0);
          });

          const topLoyaltyArray = loyaltyCandidates
            .map((g: any) => ({
              id: g.id,
              name: g.name || '',
              totalVisits: typeof g.totalVisits === 'number' ? g.totalVisits : 0,
              averageBill: typeof g.averageBill === 'number' ? g.averageBill : 0
            }))
            .sort((a, b) => {
              if (b.totalVisits !== a.totalVisits) return b.totalVisits - a.totalVisits;
              if (b.averageBill !== a.averageBill) return b.averageBill - a.averageBill;
              return a.name.localeCompare(b.name || '');
            })
            .slice(0, 10);

          console.log('📊 Top loyalty guests:', topLoyaltyArray);
          setTopLoyaltyGuests(topLoyaltyArray);
        } catch (err) {
          console.error('Error loading top loyalty guests:', err);
          setTopLoyaltyGuests([]);
        }
      } catch (error) {
        console.error('Error loading top tables:', error);
        setTopTables([]);
      }
      
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  }, [user, filter, selectedDate, selectedWeek, selectedMonth]);

  // Load statistics when component opens or focus changes
  useEffect(() => {
    if (isOpen && user) {
      console.log('📊 Statistics effect triggered - loading data');
      loadStatistics();
    }
  }, [isOpen, user, filter, selectedDate, selectedWeek, selectedMonth, loadStatistics]);

  // Update statistics when a reservation changes
  const updateTodayStatistics = async () => {
    if (!user) return;
    
    const today = format(new Date(), 'yyyy-MM-dd');
    try {
      await statisticsService.updateDailyStatistics(user.id, today);
      // Reload statistics
      loadStatistics();
    } catch (error) {
      console.error('Error updating statistics:', error);
    }
  };
  
  // Export functions
  const exportToCSV = async () => {
    if (!stats || !dailyStats) return;
    
    const headers = [translations.csvHeaders.date, translations.csvHeaders.totalReservations, translations.csvHeaders.totalGuests, translations.csvHeaders.arrived, translations.csvHeaders.notArrived, translations.csvHeaders.cancelled, translations.csvHeaders.revenue];
    const rows = dailyStats.map(s => [
      format(parseISO(s.date), 'yyyy-MM-dd'),
      s.total_reservations.toString(),
      s.total_guests.toString(),
      s.arrived_reservations.toString(),
      s.not_arrived_reservations.toString(),
      s.cancelled_reservations.toString(),
      s.revenue.toString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statistics_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  
  // Clear all reservations history (both regular and event reservations)
  const handleClearHistory = async () => {
    if (!user) return;
    
    setIsDeleting(true);
    try {
      // Delete all regular reservations for the user
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error clearing regular reservations:', error);
        throw error;
      }
      
      // Delete all event reservations for the user
      const { error: eventError } = await supabase
        .from('event_reservations')
        .delete()
        .eq('user_id', user.id);
        
      if (eventError) {
        console.error('Error clearing event reservations:', eventError);
        throw eventError;
      }
      
      // Delete all statistics for the user
      const { error: statsError } = await supabase
        .from('statistics')
        .delete()
        .eq('user_id', user.id);
        
      if (statsError) {
        console.error('Error clearing statistics:', statsError);
        throw statsError;
      }
      
      // Reload statistics
      loadStatistics();
      setShowDeleteConfirmation(false);
    } catch (error) {
      console.error('Error clearing reservation history:', error);
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Global modal events – keep hook order stable
  useEffect(() => {
    if (!isOpen) return;
    try { window.dispatchEvent(new CustomEvent('modal-open')); } catch {}
    return () => { try { window.dispatchEvent(new CustomEvent('modal-close')); } catch {} };
  }, [isOpen]);

  if (!isOpen) return null;
  
  const getDailyChartData = () => {
    // For 'today' filter, show hourly breakdown
    if (filter === 'today') {
      console.log('📊 getDailyChartData: Processing today filter');
      console.log('📊 todayReservations:', todayReservations);
      console.log('📊 todayReservations.length:', todayReservations.length);
      
      if (!todayReservations.length) {
        console.log('📊 No reservations found for today');
        return [];
      }
      
      // Create hourly data structure (00h - 23h)
      const hourlyData: { [key: string]: { reservations: number; guests: number; cancelled: number; notArrived: number; arrived: number } } = {};
      
      // Initialize all hours with 0
      for (let hour = 0; hour < 24; hour++) {
        const hourKey = hour.toString().padStart(2, '0');
        hourlyData[hourKey] = { reservations: 0, guests: 0, cancelled: 0, notArrived: 0, arrived: 0 };
      }
      
      const todayDate = selectedDate;
      console.log('📊 Today date for comparison:', todayDate);
      
      // Group today's reservations by hour
      todayReservations.forEach((reservation, index) => {
        console.log(`📊 Processing reservation ${index + 1}:`, {
          date: reservation.date,
          time: reservation.time,
          guestName: reservation.guestName,
          numberOfGuests: reservation.numberOfGuests
        });
        
        if (reservation.time && reservation.date === todayDate) {
          // Extract hour from time (could be "HH:MM" or other formats)
          let hour;
          if (typeof reservation.time === 'string' && reservation.time.includes(':')) {
            hour = reservation.time.split(':')[0].padStart(2, '0');
          } else {
            // Fallback: try to parse as date and get hours
            try {
              const timeDate = new Date(`2000-01-01 ${reservation.time}`);
              hour = timeDate.getHours().toString().padStart(2, '0');
            } catch (error) {
              console.warn('📊 Could not parse time:', reservation.time);
              return; // Skip this reservation
            }
          }
          
          console.log(`📊 Extracted hour: ${hour} from time: ${reservation.time}`);
          
          if (hourlyData[hour]) {
            hourlyData[hour].reservations += 1;
            hourlyData[hour].guests += reservation.numberOfGuests || 0;
            // Treat cleared finished stays as arrived, not cancelled
            if (reservation.status === 'cancelled' && reservation.cleared === true) {
              hourlyData[hour].arrived += 1;
            } else if (reservation.status === 'cancelled') {
              hourlyData[hour].cancelled += 1;
            } else if (reservation.status === 'not_arrived') {
              hourlyData[hour].notArrived += 1;
            } else if (reservation.status === 'arrived') {
              hourlyData[hour].arrived += 1;
            }
            // Note: waiting/confirmed reservations are not counted separately
            console.log(`📊 Updated hourly data for ${hour}:`, hourlyData[hour]);
          }
        } else {
          console.log(`📊 Reservation skipped - date: ${reservation.date}, todayDate: ${todayDate}, time: ${reservation.time}`);
        }
      });
      
      console.log('📊 Final hourly data:', hourlyData);
      
      // Convert to array and sort by hour
      const result = Object.entries(hourlyData)
        .map(([hour, data]) => {
          const hourNum = parseInt(hour);
          return {
            date: `${hour.padStart(2, '0')}h`, // All hours have labels now
            reservations: data.reservations,
            guests: data.guests,
            arrived: data.arrived,
            notArrived: data.notArrived,
            cancelled: data.cancelled,
            hour: hourNum, // For sorting
            timeLabel: `${hour.padStart(2, '0')}h` // For tooltip display
          };
        })
        .sort((a, b) => a.hour - b.hour);
        
      console.log('📊 Final chart data:', result);
      
      // Filter out hours with no data for cleaner display, but keep at least some hours for context
      const hasData = result.some(item => item.reservations > 0);
      if (!hasData) {
        console.log('📊 No reservations found in any hour');
        return []; // This will trigger "No reservations for today" message
      }
      
      return result;
    }
    
    // For other filters, show daily breakdown
    // Combine regular and event reservations for charts
    const combinedReservations = [
      ...allReservations.map(r => ({ ...r, _type: 'regular' as const })),
      ...allEventReservations.map(r => ({ ...r, _type: 'event' as const }))
    ];

    if (filter === 'month') {
      // For month filter, generate all days in selected month using direct reservation data
      const selectedMonthObj = new Date(selectedMonth + '-01');
      const startOfCurrentMonth = startOfMonth(selectedMonthObj);
      const endOfCurrentMonth = endOfMonth(selectedMonthObj);
      const daysInMonth = [];
      
      // Generate array of all days in current month
      for (let day = startOfCurrentMonth; day <= endOfCurrentMonth; day = new Date(day.getTime() + 24 * 60 * 60 * 1000)) {
        const dateStr = format(day, 'yyyy-MM-dd');
        
        // Calculate from combined reservation data (regular + event)
        const dayReservations = combinedReservations.filter(r => r.date === dateStr);
        
        daysInMonth.push({
          date: format(day, 'dd'),
          reservations: dayReservations.length,
          guests: dayReservations.reduce((sum, r) => sum + r.numberOfGuests, 0),
          arrived: dayReservations.filter(r => r.status === 'arrived' || (r.status === 'cancelled' && (r as any).cleared === true)).length,
          notArrived: dayReservations.filter(r => r.status === 'not_arrived').length,
          cancelled: dayReservations.filter(r => r.status === 'cancelled' && !(r as any).cleared).length
        });
      }

      // If there are no reservations in the whole month, treat as "no data"
      const hasData = daysInMonth.some(d => d.reservations > 0);
      if (!hasData) return [];

      return daysInMonth;
    }
    
    if (filter === 'week') {
      // For week filter, generate all days in selected week using direct reservation data
      const selectedWeekObj = new Date(selectedWeek);
      const startOfCurrentWeek = startOfWeek(selectedWeekObj, { weekStartsOn: 1 }); // Monday
      const endOfCurrentWeek = endOfWeek(selectedWeekObj, { weekStartsOn: 1 }); // Sunday
      const daysInWeek = [];
      
      // Generate array of all days in current week
      for (let day = startOfCurrentWeek; day <= endOfCurrentWeek; day = new Date(day.getTime() + 24 * 60 * 60 * 1000)) {
        const dateStr = format(day, 'yyyy-MM-dd');
        
        // Calculate from combined reservation data (regular + event)
        const dayReservations = combinedReservations.filter(r => r.date === dateStr);
        
        daysInWeek.push({
          date: format(day, 'EEE'),
          reservations: dayReservations.length,
          guests: dayReservations.reduce((sum, r) => sum + r.numberOfGuests, 0),
          arrived: dayReservations.filter(r => r.status === 'arrived' || (r.status === 'cancelled' && (r as any).cleared === true)).length,
          notArrived: dayReservations.filter(r => r.status === 'not_arrived').length,
          cancelled: dayReservations.filter(r => r.status === 'cancelled' && !(r as any).cleared).length
        });
      }

      // If there are no reservations in the whole week, treat as "no data"
      const hasData = daysInWeek.some(d => d.reservations > 0);
      if (!hasData) return [];

      return daysInWeek;
    }
    
    // For other filters, show last 7 days using combined reservation data
    const now = new Date();
    const last7Days = [];
    
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = format(day, 'yyyy-MM-dd');
      
      // Calculate from combined reservation data (regular + event)
      const dayReservations = combinedReservations.filter(r => r.date === dateStr);
      
      last7Days.push({
        date: format(day, 'dd'),
        reservations: dayReservations.length,
        guests: dayReservations.reduce((sum, r) => sum + r.numberOfGuests, 0),
        arrived: dayReservations.filter(r => r.status === 'arrived' || (r.status === 'cancelled' && (r as any).cleared === true)).length,
        notArrived: dayReservations.filter(r => r.status === 'not_arrived').length,
        cancelled: dayReservations.filter(r => r.status === 'cancelled' && !(r as any).cleared).length
      });
    }
    
    return last7Days;
  };

  // Get overview items for the right-hand overview card based on current filter
  const getOverviewItems = () => {
    if (filter === 'month') {
      return (monthlyStats || []).map((m: any) => ({
        label: m.month,
        arrived: m.arrived,
        notArrived: m.notArrived,
        cancelled: m.cancelled,
      }));
    }
    // For 'today' and 'week', reuse the daily chart data (hours for today, days for week)
    const daily = getDailyChartData();
    return (daily || []).map((d: any) => ({
      label: d.timeLabel || d.date,
      arrived: d.arrived || 0,
      notArrived: d.notArrived || 0,
      cancelled: d.cancelled || 0,
    }));
  };
  
  return (
    <div className="fixed inset-x-0 bottom-0 top-[var(--titlebar-h)] bg-black/70 backdrop-blur-sm backdrop-brightness-75 z-[12050] flex items-stretch justify-center p-0">
      <div className="bg-[#000814] w-full h-full max-w-none max-h-none rounded-none flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-xl font-light text-white tracking-wide">{t('statistics')}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Filters */}
        <div className="px-6 py-3 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {(['today', 'week', 'month'] as FilterType[]).map((f, index) => (
                <React.Fragment key={f}>
                  <button
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 text-xs font-medium transition-all ${
                      filter === f
                        ? 'text-white'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {f === 'today' ? t('today') : f === 'week' ? t('thisWeek') : t('thisMonth')}
                  </button>
                  {index < 2 && <span className="text-gray-700">|</span>}
                </React.Fragment>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirmation(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {t('clearHistory')}
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded text-blue-400 hover:bg-blue-500/10 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 0l-3 3m3-3l3 3M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
                </svg>
                {t('exportCSV')}
              </button>
              <button
                onClick={updateTodayStatistics}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors ${
                  theme === 'light'
                    ? 'text-gray-800 hover:bg-gray-100'
                    : 'text-gray-300 hover:bg-gray-800 transition-colors'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {t('refresh')}
              </button>
            </div>
          </div>
        </div>
        
        {/* Date Selectors */}
        <div className="px-6 py-3 border-b border-gray-800">
          <div className="flex items-center gap-4">
            {filter === 'today' && (
              <CustomDatePicker
                value={selectedDate}
                onChange={setSelectedDate}
                type="date"
                label={t('date')}
                size="sm"
              />
            )}
            
            {filter === 'week' && (
              <div className="flex items-center gap-4">
                <CustomDatePicker
                  value={selectedWeek}
                  onChange={setSelectedWeek}
                  type="date"
                  label={t('weekOf')}
                  size="sm"
                />
                <span className="text-xs text-gray-400">
                  ({format(startOfWeek(new Date(selectedWeek), { weekStartsOn: 1 }), 'MMM dd')} - {format(endOfWeek(new Date(selectedWeek), { weekStartsOn: 1 }), 'MMM dd')})
                </span>
              </div>
            )}
            
            {filter === 'month' && (
              <CustomDatePicker
                value={selectedMonth}
                onChange={setSelectedMonth}
                type="month"
                label={t('month')}
                size="sm"
              />
            )}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 statistics-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-400">{t('loadingStatistics')}</div>
            </div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                {/* Key Metrics */}
                <div className="bg-[#0A1929] border border-gray-800 rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">{t('total')}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="text-2xl font-light text-white">
                    {stats.totalReservations}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{t('reservations')}</div>
                </div>
                
                <div className="bg-[#0A1929] border border-gray-800 rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">{t('guests')}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="text-2xl font-light text-white">
                    {stats.totalGuests}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{t('totalGuests')}</div>
                </div>
                
                <div className="bg-[#0A1929] border border-gray-800 rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">{t('arrivedLabel')}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-green-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-2xl font-light text-green-400">
                    {stats.arrivedReservations}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{t('arrived')}</div>
                </div>
                
                <div className="bg-[#0A1929] border border-gray-800 rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">{t('notArrivedLabel')}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="text-2xl font-light text-red-400">
                    {stats.notArrivedReservations}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{t('notArrived')}</div>
                </div>
                
                <div className="bg-[#0A1929] border border-gray-800 rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">{t('cancelledLabel')}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="text-2xl font-light text-gray-400">
                    {stats.cancelledReservations}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{t('cancelled')}</div>
                </div>


              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Reservations by Day/Hour */}
                <div className={`${isLight ? 'bg-white border-gray-200' : 'bg-[#0A1929] border-gray-800'} border rounded p-4`}>
                  <h3 className="text-sm font-medium text-gray-300 mb-4 uppercase tracking-wider">
                    {filter === 'today' ? t('hourlyBreakdown') : filter === 'week' ? t('weeklyBreakdown') : t('dailyBreakdown')}
                  </h3>
                  {getDailyChartData().length > 0 ? (
                    <div className="w-full">
                      <div className="w-full flex justify-center">
                        <ResponsiveContainer width="95%" height={180}>
                        <LineChart data={getDailyChartData()} margin={{ top: 10, right: 10, bottom: 0, left: -30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#E5E7EB' : '#2A3B4F'} />
                        <XAxis 
                          dataKey="date" 
                          stroke="#4B5563" 
                          fontSize={11} 
                          interval={filter === 'week' ? 0 : 1}
                          angle={0}
                          textAnchor="middle"
                        />
                        <YAxis
                          stroke="#4B5563"
                          fontSize={11}
                          allowDecimals={false}
                          domain={[0, 'dataMax + 1']}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#0A1929', 
                            border: '1px solid #1F2937', 
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                          labelStyle={{ color: '#9CA3AF' }}
                          labelFormatter={(value, payload) => {
                            if (filter === 'today' && payload && payload[0]) {
                              return `${t('time')}: ${payload[0].payload.timeLabel}`;
                            }
                            return filter === 'today' ? `${t('time')}: ${value}` : `${t('day')}: ${value}`;
                          }}
                        />

                        <Line 
                          type="monotone" 
                          dataKey="arrived" 
                          stroke="#22C55E" 
                          strokeWidth={1.5}
                          dot={false}
                          name={t('arrivedLabel')}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="notArrived" 
                          stroke="#EF4444" 
                          strokeWidth={1.5}
                          dot={false}
                          name={t('notArrivedLabel')}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="cancelled" 
                          stroke="#6B7280" 
                          strokeWidth={1.5}
                          dot={false}
                          name={t('cancelledLabel')}
                        />

                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      {/* External, centered legend (decoupled from chart size/margins) */}
                      <div className="mt-2 w-full flex items-center justify-center gap-6 text-xs select-none">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full border-2" style={{ borderColor: '#22C55E' }} />
                        <span className={isLight ? 'text-green-600' : 'text-green-400'}>{t('arrivedLabel')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full border-2" style={{ borderColor: '#EF4444' }} />
                        <span className={isLight ? 'text-red-600' : 'text-red-400'}>{t('notArrivedLabel')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full border-2" style={{ borderColor: '#6B7280' }} />
                        <span className={isLight ? 'text-gray-600' : 'text-gray-400'}>{t('cancelledLabel')}</span>
                      </div>
                    </div>
                    </div>
                  ) : (
                    <div className="h-[180px] flex items-center justify-center">
                      <span className="text-xs text-gray-600">
                        {filter === 'today' ? t('noReservationsToday') : t('noDataAvailable')}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Overview (Daily/Weekly/Monthly based on filter) */}
                <div className={`${isLight ? 'bg-white border-gray-200' : 'bg-[#0A1929] border-gray-800'} border rounded p-4`}>
                  <h3 className="text-sm font-medium text-gray-300 mb-4 uppercase tracking-wider">{filter === 'today' ? t('dailyOverview') : filter === 'week' ? t('weeklyOverview') : t('monthlyOverview')}</h3>
                  <div className="h-[180px] overflow-y-auto space-y-4 pr-2 statistics-scrollbar">
                    {getOverviewItems().length > 0 ? (
                      getOverviewItems().slice(0, filter === 'month' ? 12 : undefined).map((item, index) => {
                      // Only count finalized reservations for progress bar
                      const finalizedTotal = item.arrived + item.notArrived + item.cancelled;
                      const arrivedPercent = finalizedTotal > 0 ? (item.arrived / finalizedTotal) * 100 : 0;
                      const notArrivedPercent = finalizedTotal > 0 ? (item.notArrived / finalizedTotal) * 100 : 0;
                      const cancelledPercent = finalizedTotal > 0 ? (item.cancelled / finalizedTotal) * 100 : 0;
                      
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-300">
                              {item.label}
                            </span>
                          </div>
                          
                          {/* Numbers above segments - only show arrived and cancelled */}
                          <div className="flex items-center justify-between text-xs font-medium">
                            <span className="text-green-400">{item.arrived}</span>
                            <span className="text-gray-400">{item.cancelled}</span>
                          </div>
                          
                          {/* Single progress bar with three segments - only show if there are finalized reservations */}
                          <div className="relative mb-4">
                            <div className="bg-gray-800 rounded-full h-2 overflow-hidden">
                              {finalizedTotal > 0 ? (
                                <div className="flex h-full gap-0.5">
                                  {/* Arrived segment (green) */}
                                  <div 
                                    className="bg-green-500 transition-all rounded-l-full"
                                    style={{ width: `${arrivedPercent}%` }}
                                  />
                                  {/* Not arrived segment (red) */}
                                  <div 
                                    className="bg-red-500 transition-all"
                                    style={{ width: `${notArrivedPercent}%` }}
                                  />
                                  {/* Cancelled segment (gray) */}
                                  <div 
                                    className="bg-gray-500 transition-all rounded-r-full"
                                    style={{ width: `${cancelledPercent}%` }}
                                  />
                                </div>
                              ) : (
                                <div className="w-full h-full bg-gray-800"></div>
                              )}
                            </div>
                            {/* Not arrived number positioned in the middle of red segment */}
                            {item.notArrived > 0 && notArrivedPercent > 0 && (
                              <div 
                                className="absolute -top-4 text-xs font-medium text-red-400 z-10"
                                style={{ 
                                  left: `${arrivedPercent + (notArrivedPercent / 2)}%`,
                                  transform: 'translateX(-50%)'
                                }}
                              >
                                {item.notArrived}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }) 
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-xs text-gray-600">{filter === 'month' ? t('noReservationsThisMonth') : t('noDataAvailable')}</span>
                      </div>
                    )}
                  </div>
                </div>
                
              </div>

              {/* Second row: Top Tables / Top Zones / Top Waiters / Top Loyalty Guests */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Top Tables */}
                <div className={`${isLight ? 'bg-white border-gray-200' : 'bg-[#0A1929] border-gray-800'} border rounded p-4`}>
                  <h3 className="text-sm font-medium ${isLight ? 'text-gray-800' : 'text-gray-300'} mb-4 uppercase tracking-wider">{t('topTablesTitle')}</h3>
                  <div className="h-[180px] overflow-y-auto space-y-3 pr-2 statistics-scrollbar">
                    {topTables.length > 0 ? (
                      topTables
                        .map((table) => ({
                          ...table,
                          name: formatTableNames([table.table_id], zoneLayouts)
                        }))
                        .filter((t) => t.name && t.name.trim().length > 0)
                        .map((table, index) => (
                          <div
                            key={table.table_id}
                            className={`flex items-center justify-between py-2 px-3 rounded top-tables-item ${
                              isLight ? 'bg-gray-100' : 'bg-gray-800/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-medium w-6 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                #{index + 1}
                              </span>
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                className={isLight ? 'text-gray-500' : 'text-gray-500'}
                              >
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                <line x1="8" y1="21" x2="16" y2="21" />
                                <line x1="12" y1="17" x2="12" y2="21" />
                              </svg>
                              <span className={`text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                                {table.name}
                              </span>
                            </div>
                            <span className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                              {table.reservation_count} res
                            </span>
                          </div>
                        ))
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-xs text-gray-600">{t('noTableDataAvailable')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Zones */}
                <div className={`${isLight ? 'bg-white border-gray-200' : 'bg-[#0A1929] border-gray-800'} border rounded p-4`}>
                  <h3 className={`text-sm font-medium mb-4 uppercase tracking-wider ${isLight ? 'text-gray-800' : 'text-gray-300'}`}>
                    {t('topZonesTitle')}
                  </h3>
                  <div className="h-[180px] overflow-y-auto space-y-3 pr-2 statistics-scrollbar">
                    {topZones.length > 0 ? (
                      topZones.map((zone, index) => {
                        const zoneObj = zones.find((z) => String(z.id) === String(zone.zone_id));
                        const zoneName = zoneObj?.name || zone.zone_id;
                        return (
                          <div
                            key={zone.zone_id}
                            className={`flex items-center justify-between py-2 px-3 rounded top-tables-item ${
                              isLight ? 'bg-gray-100' : 'bg-gray-800/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-medium w-6 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                #{index + 1}
                              </span>
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                className={isLight ? 'text-gray-500' : 'text-gray-500'}
                              >
                                <rect x="3" y="4" width="18" height="16" rx="2" ry="2" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                              <span className={`text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                                {zoneName}
                              </span>
                            </div>
                            <span className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                              {zone.reservation_count} res
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-xs text-gray-600">{t('noDataAvailable')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Waiters */}
                <div className={`${isLight ? 'bg-white border-gray-200' : 'bg-[#0A1929] border-gray-800'} border rounded p-4`}>
                  <h3 className={`text-sm font-medium mb-4 uppercase tracking-wider ${isLight ? 'text-gray-800' : 'text-gray-300'}`}>
                    {t('topWaitersTitle')}
                  </h3>
                  <div className="h-[180px] overflow-y-auto space-y-3 pr-2 statistics-scrollbar">
                    {topWaiters.length > 0 ? (
                      topWaiters.map((waiter, index) => (
                        <div
                          key={waiter.waiter_name}
                          className={`flex items-center justify-between py-2 px-3 rounded top-tables-item ${
                            isLight ? 'bg-gray-100' : 'bg-gray-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-medium w-6 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                              #{index + 1}
                            </span>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              className={isLight ? 'text-gray-500' : 'text-gray-500'}
                            >
                              <circle cx="12" cy="8" r="3" />
                              <path d="M5 21c0-3.5 3-6 7-6s7 2.5 7 6" />
                            </svg>
                            <span className={`text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                              {waiter.waiter_name}
                            </span>
                          </div>
                          <span className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                            {waiter.reservation_count} res
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-xs text-gray-600">{t('noDataAvailable')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Loyalty Guests */}
                <div className={`${isLight ? 'bg-white border-gray-200' : 'bg-[#0A1929] border-gray-800'} border rounded p-4`}>
                  <h3 className={`text-sm font-medium mb-4 uppercase tracking-wider ${isLight ? 'text-gray-800' : 'text-gray-300'}`}>
                    {t('topLoyaltyTitle')}
                  </h3>
                  <div className="h-[180px] overflow-y-auto space-y-3 pr-2 statistics-scrollbar">
                    {topLoyaltyGuests.length > 0 ? (
                      topLoyaltyGuests.map((guest, index) => (
                        <div
                          key={guest.id}
                          className={`flex items-center justify-between py-2 px-3 rounded top-tables-item ${
                            isLight ? 'bg-gray-100' : 'bg-gray-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-medium w-6 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                              #{index + 1}
                            </span>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              className={isLight ? 'text-yellow-500' : 'text-yellow-400'}
                            >
                              <path d="M12 2l3 7h7l-5.5 4.2L18 21l-6-3.8L6 21l1.5-7.8L2 9h7z" />
                            </svg>
                            <div className="flex flex-col">
                              <span className={`text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                                {guest.name || '-'}
                              </span>
                              <span className={`text-[11px] ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                {guest.totalVisits} visits
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`block text-xs font-medium ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
                              {guest.averageBill ? guest.averageBill.toLocaleString() : '0'}
                            </span>
                            <span className={`block text-[11px] ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                              avg bill
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-xs text-gray-600">{t('noDataAvailable')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* All Reservations List (always shown, even when empty) */}
              <div className="mt-6">
                <div className="bg-[#0A1929] border border-gray-800 rounded p-4">
                  <h3 className="text-sm font-medium text-gray-300 mb-4 uppercase tracking-wider">
                    {t('allReservations')} ({(allReservations?.length || 0) + (allEventReservations?.length || 0)})
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    {t('allReservationsDescription')}
                  </p>
                  {(allReservations && allReservations.length > 0) || (allEventReservations && allEventReservations.length > 0) ? (
                    <div className="h-[320px] overflow-y-auto statistics-scrollbar">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className={`border-b ${isLight ? 'border-gray-200' : 'border-gray-800'}`}>
                              <th className="text-left py-2 px-3 text-gray-500 font-medium">{t('type')}</th>
                              <th className="text-left py-2 px-3 text-gray-500 font-medium">{t('date')}</th>
                              <th className="text-left py-2 px-3 text-gray-500 font-medium">{t('time')}</th>
                              <th className="text-left py-2 px-3 text-gray-500 font-medium">{t('guestName')}</th>
                              <th className="text-left py-2 px-3 text-gray-500 font-medium">{t('guests')}</th>
                              <th className="text-left py-2 px-3 text-gray-500 font-medium">{t('phone')}</th>
                              <th className="text-left py-2 px-3 text-gray-500 font-medium">{t('status')}</th>
                              <th className="text-left py-2 px-3 text-gray-500 font-medium">{t('zone')}</th>
                              {/* Show service type instead of generic notes for all-reservations panel */}
                              <th className="text-left py-2 px-3 text-gray-500 font-medium">{t('serviceType')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Combined and sorted reservations */}
                            {[
                              ...(allReservations || []).map((r) => ({ ...r, _type: 'regular' as const })),
                              ...(allEventReservations || []).map((r) => ({ ...r, _type: 'event' as const }))
                            ]
                              .slice()
                              .sort((a, b) => {
                                // Sort by date first (newest first), then by time (latest first)
                                const dateCompare = b.date.localeCompare(a.date);
                                if (dateCompare !== 0) return dateCompare;
                                return b.time.localeCompare(a.time);
                              })
                              .map((reservation) => (
                                <tr
                                  key={`${reservation._type}-${reservation.id}`}
                                  className={`border-b ${
                                    isLight
                                      ? 'border-gray-200 hover:bg-gray-50'
                                      : 'border-gray-800 hover:bg-gray-900/30'
                                  } ${(reservation as any).isDeleted ? 'opacity-60' : ''}`}
                                >
                                  <td className="py-2 px-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                                      reservation._type === 'event'
                                        ? (isLight ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-purple-500/20 text-purple-300 border-purple-500/30')
                                        : (isLight ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-blue-500/20 text-blue-300 border-blue-500/30')
                                    }`}>
                                      {reservation._type === 'event' ? 'Event' : 'Regular'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-gray-300">
                                    {format(new Date(reservation.date), 'dd/MM/yyyy')}
                                  </td>
                                  <td className="py-2 px-3 text-gray-300">
                                    {reservation.time}
                                  </td>
                                  <td className="py-2 px-3 text-white font-medium">
                                    {reservation.guestName}
                                    {(reservation as any).isDeleted && (
                                      <span className="ml-2 text-xs text-gray-500">{t('deleted')}</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-gray-300">
                                    {reservation.numberOfGuests}
                                  </td>
                                  <td className="py-2 px-3 text-gray-300">
                                    {reservation.phone || '-'}
                                  </td>
                                  <td className="py-2 px-3">
                                    {(() => {
                                      // Normalize status: 'booked' -> 'waiting', cleared cancelled -> 'arrived'
                                      let displayStatus = reservation.status;
                                      if (reservation.status === 'cancelled' && (reservation as any).cleared === true) {
                                        displayStatus = 'arrived';
                                      } else if (reservation.status === 'booked') {
                                        displayStatus = 'waiting'; // Event reservations use 'booked', normalize to 'waiting'
                                      }
                                      const chipClass = (() => {
                                        if (isLight) {
                                          return displayStatus === 'arrived'
                                            ? 'bg-green-100 text-green-700 border border-green-300'
                                            : displayStatus === 'not_arrived'
                                            ? 'bg-red-100 text-red-700 border border-red-300'
                                            : displayStatus === 'cancelled'
                                            ? 'bg-gray-200 text-gray-700 border border-gray-300'
                                            : displayStatus === 'confirmed'
                                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                            : 'bg-yellow-100 text-yellow-700 border border-yellow-300'; // waiting
                                        }
                                        return displayStatus === 'arrived'
                                          ? 'bg-green-900/50 text-green-400 border border-green-800'
                                          : displayStatus === 'not_arrived'
                                          ? 'bg-red-900/50 text-red-400 border border-red-800'
                                          : displayStatus === 'cancelled'
                                          ? 'bg-gray-900/50 text-gray-400 border border-gray-800'
                                          : displayStatus === 'confirmed'
                                          ? 'bg-blue-900/50 text-blue-400 border border-blue-800'
                                          : 'bg-yellow-900/50 text-yellow-400 border border-yellow-800'; // waiting
                                      })();
                                      return (
                                        <span
                                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${chipClass}`}
                                        >
                                          {getStatusTranslation(displayStatus)}
                                        </span>
                                      );
                                    })()}
                                  </td>
                                  <td className="py-2 px-3 text-gray-300">
                                    {formatZoneName(reservation.zoneId, (reservation as any).zoneName, zones)}
                                  </td>
                                  <td className="py-2 px-3 text-gray-400 max-w-[150px] truncate">
                                    {reservation.notes || '-'}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[160px] flex items-center justify-center">
                      <span className="text-xs text-gray-600">
                        {t('noReservationsEntered')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-400 text-center">
                <p className="mb-2">{t('noStatisticsAvailable')}</p>
                <p className="text-xs">{t('createReservationsToSeeAnalytics')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={handleClearHistory}
        title={t('confirmClearHistory')}
        message={t('clearHistoryMessage')}
        confirmText={t('clearHistoryButton')}
        cancelText={t('keepHistory')}
        type="danger"
      />
    </div>
  );
};

export default Statistics; 