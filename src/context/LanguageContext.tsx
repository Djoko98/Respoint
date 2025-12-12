import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserContext } from './UserContext';

export interface Translations {
  // Header & Navigation
  dashboard: string;
  statistics: string;
  accountSettings: string;
  logout: string;
  
  // Dashboard & Main UI
  addReservation: string;
  todaysReservations: string;
  viewAllReservations: string;
  noReservationsToday: string;
  upcomingReservations: string;
  
  // Reservation Form
  guestName: string;
  phoneNumber: string;
  numberOfGuests: string;
  reservationDate: string;
  reservationTime: string;
  notes: string;
  type: string;
  selectTable: string;
  save: string;
  
  // Reservation Status
  confirmed: string;
  pending: string;
  cancelled: string;
  completed: string;
  notArrived: string;
  waiting: string;
  
  // Account Settings
  accountSettingsTitle: string;
  restaurantInformation: string;
  ownerInformation: string;
  contactInformation: string;
  preferences: string;
  advancedOptions: string;
  saveChanges: string;
  
  // Restaurant Info
  restaurantName: string;
  restaurantLogo: string;
  restaurantLogoDark: string;
  restaurantLogoLight: string;
  printLogo: string;
  uploadLogo: string;
  removeLogo: string;
  printLogoDescription: string;
  logoFileDescription: string;
  uploading: string;
  noLogo: string;
  noPrintLogo: string;
  enterRestaurantName: string;
  enterOwnerName: string;
  enterPhoneNumber: string;
  enterAddress: string;
  
  // Owner Info
  ownerName: string;
  emailAddress: string;
  emailCannotBeChanged: string;
  changePassword: string;
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
  
  // Contact Info
  phoneNumberLabel: string;
  addressLabel: string;
  timezoneLabel: string;
  
  // Preferences
  applicationLanguage: string;
  autoArchiveReservations: string;
  autoArchiveDescription: string;
  
  // Advanced Options
  exportData: string;
  exportDataDescription: string;
  deactivateAccount: string;
  deactivateAccountDescription: string;
  
  // Statistics
  totalReservations: string;
  todayReservations: string;
  thisWeekReservations: string;
  thisMonthReservations: string;
  averagePartySize: string;
  peakHours: string;
  mostBookedTables: string;
  analytics: string;
  totalGuests: string;
  arrivedReservations: string;
  notArrivedReservations: string;
  cancelledReservations: string;
  revenue: string;
  exportCSV: string;
  clearHistory: string;
  confirmClearHistory: string;
  clearHistoryMessage: string;
  clearHistoryButton: string;
  keepHistory: string;
  guests: string;
  arrived: string;
  reservations: string;
  noDataAvailable: string;
  topTablesTitle: string;
  topZonesTitle: string;
  topWaitersTitle: string;
  topLoyaltyTitle: string;
  monthlyOverview: string;
  reservationTrends: string;
  dailyOverview: string;
  weeklyOverview: string;
  hourlyBreakdown: string;
  dailyBreakdown: string;
  weeklyBreakdown: string;
  refresh: string;
  date: string;
  weekOf: string;
  month: string;
  loadingStatistics: string;
  total: string;
  time: string;
  day: string;
  arrivedLabel: string;
  notArrivedLabel: string;
  cancelledLabel: string;
  noReservationsThisMonth: string;
  noReservationsEntered: string;
  noTableDataAvailable: string;
  allReservations: string;
  allReservationsDescription: string;
  phone: string;
  status: string;
  zone: string;
  deleted: string;
  noStatisticsAvailable: string;
  createReservationsToSeeAnalytics: string;
  csvHeaders: {
    date: string;
    totalReservations: string;
    totalGuests: string;
    arrived: string;
    notArrived: string;
    cancelled: string;
    revenue: string;
  };
  
  // Toolbar & Actions
  addTable: string;
  addWall: string;
  addText: string;
  deleteSelected: string;
  copySelected: string;
  pasteSelected: string;
  undo: string;
  redo: string;
  
  // Zones
  addZone: string;
  editZone: string;
  deleteZone: string;
  zoneName: string;
  manageZones: string;
  addNewZone: string;
  existingZones: string;
  dragToReorder: string;
  saving: string;
  noZonesYet: string;
  addFirstZone: string;
  editZoneName: string;
  deleteZoneTooltip: string;
  cannotDeleteLastZone: string;
  deleteZoneTitle: string;
  deleteZoneMessage: string;
  deleteZoneButton: string;
  saveRequired: string;
  saveBeforeSwitchingZones: string;
  saveBeforeManagingZones: string;

  // Layout delete confirmations
  deleteLayout: string;
  deleteLayoutMessage: string;
  deleteLayoutButton: string;
  
  // Calendar
  today: string;
  tomorrow: string;
  yesterday: string;
  thisWeek: string;
  nextWeek: string;
  thisMonth: string;
  nextMonth: string;
  
  // Common Actions
  edit: string;
  delete: string;
  confirm: string;
  close: string;
  loading: string;
  search: string;
  filter: string;
  ok: string;
  cancel: string;
  
  // User Menu
  subscribe: string;
  confirmLogout: string;
  logoutMessage: string;
  logOutButton: string;
  stayLoggedIn: string;
  
  // Subscribe/Subscription
  subscription: string;
  currentPlan: string;
  availablePlans: string;
  subscriptionUpdated: string;
  subscriptionUpdateSuccess: string;
  updateFailed: string;
  updateFailedMessage: string;
  subscriptionCancelled: string;
  subscriptionCancelSuccess: string;
  cancellationFailed: string;
  cancellationFailedMessage: string;
  started: string;
  ends: string;
  active: string;
  upgrade: string;
  cancelSubscription: string;
  monthly: string;
  yearly: string;
  savePercent: string;
  mostPopular: string;
  currentPlanButton: string;
  selectPlan: string;
  importantInformation: string;
  confirmCancelSubscription: string;
  cancelSubscriptionMessage: string;
  cancelSubscriptionButton: string;
  keepSubscription: string;
  billedYearly: string;
  monthlyShort: string;
  loadingSubscriptionData: string;
  zones: string;
  usedThisMonth: string;
  planChangesImmediate: string;
  downgradesEndOfCycle: string;
  pricesInEUR: string;
  contactForEnterprise: string;
  // Subscription plan features (copy)
  planFeatureFreeReservations: string;
  planFeatureFreeZones: string;
  planFeatureFreeLayouts: string;
  planFeatureFreeCoreTools: string;
  planFeatureProReservations: string;
  planFeatureProZones: string;
  planFeatureProLayouts: string;
  planFeatureProStatistics: string;
  planFeatureProTimeline: string;
  planFeatureProCoreTools: string;
  planFeatureProEmailSupport: string;
  planFeatureEntEverythingInPro: string;
  planFeatureEntUnlimitedReservations: string;
  planFeatureEntUnlimitedZones: string;
  planFeatureEntGuestbook: string;
  planFeatureEntWaiterTab: string;
  planFeatureEntPrioritySupport: string;

  // POS Printer
  posPrinterTitle: string;
  desktopOnlyNotice: string;
  preferredPosPrinter: string;
  preferredPosPrinterDescription: string;
  choosePrinterPlaceholder: string;
  saveAsPreferred: string;
  windowsDefaultPrinter: string;

  // POS Footer customization
  receiptFooterTitle: string;
  footerLine1Label: string;
  footerLine2Label: string;
  saveFooter: string;
  editFooter: string;
  
  // Confirmation Messages
  deleteConfirmation: string;
  unsavedChanges: string;
  discardChanges: string;
  discardChangesMessage: string;
  keepEditing: string;
  
  // Error Messages
  errorOccurred: string;
  tryAgain: string;
  connectionError: string;
  saveFailed: string;
  loadFailed: string;
  
  // Success Messages
  saveSuccessful: string;
  deleteSuccessful: string;
  uploadSuccessful: string;
  
  // Time
  am: string;
  pm: string;
  
  // Days of week
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
  
  // Months
  january: string;
  february: string;
  march: string;
  april: string;
  may: string;
  june: string;
  july: string;
  august: string;
  september: string;
  october: string;
  november: string;
  december: string;
  
  // Canvas specific
  savedLayouts: string;
  refreshList: string;
  noSavedLayoutsYet: string;
  default: string;
  tables: string;
  loadLayout: string;
  saveLayout: string;
  layoutName: string;
  layoutNamePlaceholder: string;
  setAsDefaultLayout: string;
  updateLayout: string;
  saveLayoutAs: string;
  moveToolTooltip: string;
  squareTableTooltip: string;
  roundTableTooltip: string;
  wallToolTooltip: string;
  textToolTooltip: string;
  deleteToolTooltip: string;
  resetAllTooltip: string;
  fontLabel: string;
  decreaseFontSize: string;
  increaseFontSize: string;
  layouts: string;
  confirmTextTooltip: string;
  cancelTextTooltip: string;
  enterTextPlaceholder: string;
  rotate: string;
  tablesLabel: string;
  telLabel: string;
  addDefaultLayout: string;
  clickToStartDesigning: string;
  
  // Sidebar specific
  open: string;
  closed: string;
  name: string;
  table: string;
  mergedZones: string;
  booked: string;
  seated: string;
  cleared: string;
  arrivedQuestion: string;
  markAsArrived: string;
  markAsNotArrived: string;
  clearedQuestion: string;
  markAsCleared: string;
  markAsNotCleared: string;
  noOpenReservations: string;
  noClosedReservations: string;
  addOneOnPlusButton: string;
  noSeatedReservations: string;
  
  // Reservation Form & Modal specific
  addNewReservation: string;
  editReservation: string;
  reservationDetails: string;
  nameOfReservation: string;
  dateAndTime: string;
  noAdditionalNotes: string;
  finalizedReservation: string;
  finalizedReservationDesc: string;
  updateReservation: string;
  cancelReservation: string;
  deleteReservation: string;
  cancelReservationMessage: string;
  deleteReservationMessage: string;
  finalizedCannotEdit: string;
  saveFailedMessage: string;
  cancelFailed: string;
  cancelFailedMessage: string;
  
  // Form fields specific
  selectZone: string;
  tableNumber: string;
  removeTable: string;
  serviceType: string;
  popularServiceTypes: string;
  mobileNumber: string;
  additionalRequirements: string;
  print: string;
  preview: string;
  created: string;
  
  // Print Preview specific
  printPreview: string;
  reservationTitle: string;
  guestLabel: string;
  dateLabel: string;
  timeLabel: string;
  tableLabel: string;
  seatsLabel: string;
  serviceLabel: string;
  notesLabel: string;
  printFooterMessage: string;
  printFooterThankYou: string;
  
  // Validation Messages
  invalidDateTime: string;
  invalidDateTimeMessage: string;
  tableUnavailable: string;
  tableUnavailableMessage: string;
  tableNotFound: string;
  tableNotFoundMessage: string;
  deleteFailed: string;
  deleteFailedMessage: string;
  
  // Finalized Reservation Modal
  reservationDetailsFinalized: string;
  
  // Timeline Bar
  noReservationsSelectedDate: string;
  
  // Form Validation
  fieldRequired: string;
  emailRequired: string;
  passwordRequired: string;
  nameRequired: string;
  restaurantNameRequired: string;
  guestNameRequired: string;

  // Color / Table color
  tableColor: string;
  chooseTableColor: string;

  // Updates / Updater
  checkForUpdates: string;
  checkForUpdatesDescription: string;
  updateAvailableTitle: string;
  updateAvailableBody: string;
  noUpdateTitle: string;
  noUpdateBody: string;
}

const englishTranslations: Translations = {
  // Header & Navigation
  dashboard: 'Dashboard',
  statistics: 'Statistics',
  accountSettings: 'Account Settings',
  logout: 'Logout',
  
  // Dashboard & Main UI
  addReservation: 'Add Reservation',
  todaysReservations: "Today's Reservations",
  viewAllReservations: 'View All Reservations',
  noReservationsToday: 'No reservations for today',
  upcomingReservations: 'Upcoming Reservations',
  
  // Reservation Form
  guestName: 'Guest Name',
  phoneNumber: 'Phone Number',
  numberOfGuests: 'Number of Guests',
  reservationDate: 'Reservation Date',
  reservationTime: 'Reservation Time',
  notes: 'Notes',
  selectTable: 'Select Table',
  save: 'Save',
  
  // Reservation Status
  confirmed: 'Confirmed',
  pending: 'Pending',
  cancelled: 'Cancelled',
  completed: 'Completed',
  notArrived: 'Not Arrived',
  waiting: 'Waiting',
  
  // Account Settings
  accountSettingsTitle: 'Account Settings',
  restaurantInformation: 'Restaurant Information',
  ownerInformation: 'Owner Information',
  contactInformation: 'Contact Information',
  preferences: 'Preferences',
  advancedOptions: 'Advanced Options',
  saveChanges: 'Save Changes',
  checkForUpdates: 'Check for updates',
  checkForUpdatesDescription: 'Manually check if a new desktop update is available.',
  
  // Restaurant Info
  restaurantName: 'Restaurant Name',
  restaurantLogo: 'Restaurant Logo',
  restaurantLogoDark: 'Restaurant Logo - Dark Theme',
  restaurantLogoLight: 'Restaurant Logo - Light Theme',
  printLogo: 'Print Logo',
  uploadLogo: 'Upload Logo',
  removeLogo: 'Remove Logo',
  printLogoDescription: 'PNG, JPG (Max 5MB) - Used for receipts and print documents',
  logoFileDescription: 'PNG, JPG (Max 5MB)',
  uploading: 'Uploading...',
  noLogo: 'No logo',
  noPrintLogo: 'No print logo',
  enterRestaurantName: 'Enter restaurant name',
  enterOwnerName: "Enter owner's name",
  enterPhoneNumber: 'Enter phone number',
  enterAddress: 'Enter restaurant address',
  
  // Owner Info
  ownerName: "Owner's Name",
  emailAddress: 'Email Address',
  emailCannotBeChanged: 'Email cannot be changed',
  changePassword: 'Change Password',
  currentPassword: 'Current password',
  newPassword: 'New password',
  confirmNewPassword: 'Confirm new password',
  
  // Contact Info
  phoneNumberLabel: 'Phone Number',
  addressLabel: 'Address',
  timezoneLabel: 'Timezone',
  
  // Preferences
  applicationLanguage: 'Application Language',
  autoArchiveReservations: 'Auto-archive old reservations',
  autoArchiveDescription: 'Automatically archive reservations older than 30 days',
  
  // Advanced Options
  exportData: 'Export Data',
  exportDataDescription: 'Download all your data for backup or GDPR compliance',
  deactivateAccount: 'Deactivate Account',
  deactivateAccountDescription: 'Permanently disable your account. This action cannot be undone.',
  
  // Statistics
  totalReservations: 'Total Reservations',
  todayReservations: 'Today',
  thisWeekReservations: 'This Week',
  thisMonthReservations: 'This Month',
  averagePartySize: 'Average Party Size',
  peakHours: 'Peak Hours',
  mostBookedTables: 'Most Booked Tables',
  analytics: 'Analytics',
  totalGuests: 'Total Guests',
  arrivedReservations: 'Arrived',
  notArrivedReservations: 'Not Arrived',
  cancelledReservations: 'Cancelled',
  revenue: 'Revenue',
  exportCSV: 'Export CSV',
  clearHistory: 'Clear History',
  confirmClearHistory: 'Clear All History',
  clearHistoryMessage: 'This will permanently delete all reservation history and statistics. This action cannot be undone.',
  clearHistoryButton: 'Clear All Data',
  keepHistory: 'Keep History',
  topTablesTitle: 'Top Tables',
  topZonesTitle: 'Top Zones',
  topWaitersTitle: 'Top Waiters',
  topLoyaltyTitle: 'Top Loyalty Guests',
  monthlyOverview: 'Monthly Overview',
  reservationTrends: 'Reservation Trends',
  dailyOverview: 'Daily Overview',
  weeklyOverview: 'Weekly Overview',
  hourlyBreakdown: 'Hourly Breakdown',
  dailyBreakdown: 'Daily Breakdown',
  weeklyBreakdown: 'Weekly Breakdown',
  refresh: 'Refresh',
  date: 'Date',
  weekOf: 'Week of',
  month: 'Month',
  loadingStatistics: 'Loading statistics...',
  total: 'Total',
  time: 'Time',
  day: 'Day',
  guests: 'Guests',
  arrived: 'Arrived',
  reservations: 'Reservations',
  noDataAvailable: 'No data available',
  arrivedLabel: 'Arrived',
  notArrivedLabel: 'Not Arrived',
  cancelledLabel: 'Cancelled',
  noReservationsThisMonth: 'No reservations for this month',
  noReservationsEntered: 'No reservations entered yet',
  noTableDataAvailable: 'No table data available',
  allReservations: 'All Reservations',
  allReservationsDescription: 'This table shows all historical reservations including deleted ones for complete statistics tracking.',
  type: 'Type',
  phone: 'Phone',
  status: 'Status',
  zone: 'Zone',
  deleted: '(deleted)',
  noStatisticsAvailable: 'No statistics available',
  createReservationsToSeeAnalytics: 'Create some reservations to see analytics',
  csvHeaders: {
    date: 'Date',
    totalReservations: 'Total Reservations',
    totalGuests: 'Total Guests',
    arrived: 'Arrived',
    notArrived: 'Not Arrived',
    cancelled: 'Cancelled',
    revenue: 'Revenue'
  },
  
  // Toolbar & Actions
  addTable: 'Add Table',
  addWall: 'Add Wall',
  addText: 'Add Text',
  deleteSelected: 'Delete Selected',
  copySelected: 'Copy Selected',
  pasteSelected: 'Paste Selected',
  undo: 'Undo',
  redo: 'Redo',
  
  // Zones
  addZone: 'Add Zone',
  editZone: 'Edit Zone',
  deleteZone: 'Delete Zone',
  zoneName: 'Zone Name',
  manageZones: 'Manage Zones',
  addNewZone: 'Add New Zone',
  existingZones: 'Existing Zones',
  dragToReorder: 'Drag to reorder',
  saving: 'Saving...',
  noZonesYet: 'No zones created yet.',
  addFirstZone: 'Add your first zone above.',
  editZoneName: 'Edit zone name',
  deleteZoneTooltip: 'Delete zone',
  cannotDeleteLastZone: 'Cannot delete the last zone',
  deleteZoneTitle: 'Delete Zone',
  deleteZoneMessage: 'Are you sure you want to delete this zone? All layouts and table arrangements will be permanently lost. This action cannot be undone.',
  deleteZoneButton: 'Delete Zone',
  saveRequired: 'Save Required',
  saveBeforeSwitchingZones: 'Please save or cancel your changes before switching zones.',
  saveBeforeManagingZones: 'Please save or cancel your changes before managing zones.',
  
  // Layout delete confirmations
  deleteLayout: 'Delete Layout',
  deleteLayoutMessage: 'Are you sure you want to delete this layout? This will not delete any reservations, only the table arrangement.',
  deleteLayoutButton: 'Delete Layout',
  
  // Calendar
  today: 'Today',
  tomorrow: 'Tomorrow',
  yesterday: 'Yesterday',
  thisWeek: 'This Week',
  nextWeek: 'Next Week',
  thisMonth: 'This Month',
  nextMonth: 'Next Month',
  
  // Common Actions
  edit: 'Edit',
  delete: 'Delete',
  confirm: 'Confirm',
  close: 'Close',
  loading: 'Loading...',
  search: 'Search',
  filter: 'Filter',
  ok: 'OK',
  cancel: 'Cancel',
  
  // User Menu
  subscribe: 'Subscribe',
  confirmLogout: 'Confirm Logout',
  logoutMessage: 'Are you sure you want to log out? All unsaved changes will be lost and you will need to sign in again.',
  logOutButton: 'Log Out',
  stayLoggedIn: 'Stay Logged In',
  
  // Subscribe/Subscription
  subscription: 'Subscription',
  currentPlan: 'Current Plan',
  availablePlans: 'Available Plans',
  subscriptionUpdated: 'Subscription Updated',
  subscriptionUpdateSuccess: 'Subscription updated successfully!',
  updateFailed: 'Update Failed',
  updateFailedMessage: 'Failed to update subscription. Please try again.',
  subscriptionCancelled: 'Subscription Cancelled',
  subscriptionCancelSuccess: 'Subscription cancelled successfully.',
  cancellationFailed: 'Cancellation Failed',
  cancellationFailedMessage: 'Failed to cancel subscription. Please try again.',
  started: 'Started',
  ends: 'Ends',
  active: 'Active',
  upgrade: 'Upgrade',
  cancelSubscription: 'Cancel',
  monthly: 'Monthly',
  yearly: 'Yearly',
  savePercent: 'Save 20%',
  mostPopular: 'Most Popular',
  currentPlanButton: 'Current Plan',
  selectPlan: 'Select Plan',
  importantInformation: 'Important Information',
  confirmCancelSubscription: 'Cancel Subscription',
  cancelSubscriptionMessage: 'Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.',
  cancelSubscriptionButton: 'Cancel Subscription',
  keepSubscription: 'Keep Subscription',
  billedYearly: 'billed yearly',
  monthlyShort: 'month',
  loadingSubscriptionData: 'Loading subscription data...',
  zones: 'Zones',
  usedThisMonth: 'used this month',
  planChangesImmediate: 'Plan changes take effect immediately',
  downgradesEndOfCycle: 'Downgrades will be applied at the end of the current billing cycle',
  pricesInEUR: 'All prices are in EUR and exclude VAT where applicable',
  contactForEnterprise: 'Contact support@respoint.com for custom enterprise plans',
  // Subscription plan features (copy)
  planFeatureFreeReservations: 'Up to 10 reservations per month',
  planFeatureFreeZones: '1 zone',
  planFeatureFreeLayouts: '1 zone layout',
  planFeatureFreeCoreTools: 'Core tools: reservation entry and floor plan drawing',
  planFeatureProReservations: 'Up to 50 reservations per month',
  planFeatureProZones: 'Up to 3 zones',
  planFeatureProLayouts: 'Unlimited zone layouts',
  planFeatureProStatistics: 'Statistics dashboard',
  planFeatureProTimeline: 'Timeline scheduling',
  planFeatureProCoreTools: 'Core tools included',
  planFeatureProEmailSupport: 'Email support',
  planFeatureEntEverythingInPro: 'Everything in Pro',
  planFeatureEntUnlimitedReservations: 'Unlimited reservations',
  planFeatureEntUnlimitedZones: 'Unlimited zones',
  planFeatureEntGuestbook: 'Guestbook',
  planFeatureEntWaiterTab: 'Waiter tab',
  planFeatureEntPrioritySupport: 'Priority support',

  // POS Printer
  posPrinterTitle: 'POS Printer',
  desktopOnlyNotice: 'Available only in the desktop app.',
  preferredPosPrinter: 'Preferred POS printer',
  preferredPosPrinterDescription: 'Used for direct bill printing',
  choosePrinterPlaceholder: '-- Select printer --',
  saveAsPreferred: 'Save as preferred',
  windowsDefaultPrinter: 'Windows default:',

  // POS Footer customization
  receiptFooterTitle: 'Receipt footer',
  footerLine1Label: 'Footer line 1',
  footerLine2Label: 'Footer line 2',
  saveFooter: 'Save footer',
  editFooter: 'Edit footer',
  updateAvailableTitle: 'Update available',
  updateAvailableBody: 'You have new Update - Update Now',
  noUpdateTitle: 'Up to date',
  noUpdateBody: 'There are no updates available',
  
  // Confirmation Messages
  deleteConfirmation: 'Are you sure you want to delete this item?',
  unsavedChanges: 'You have unsaved changes. Are you sure you want to cancel?',
  discardChanges: 'Discard Changes',
  discardChangesMessage: 'You have unsaved changes. Are you sure you want to cancel? All changes will be lost.',
  keepEditing: 'Keep Editing',
  
  // Error Messages
  errorOccurred: 'An error occurred',
  tryAgain: 'Try Again',
  connectionError: 'Connection error. Please check your internet connection.',
  saveFailed: 'Failed to save changes',
  loadFailed: 'Failed to load data',
  
  // Success Messages
  saveSuccessful: 'Changes saved successfully',
  deleteSuccessful: 'Item deleted successfully',
  uploadSuccessful: 'File uploaded successfully',
  
  // Time
  am: 'AM',
  pm: 'PM',
  
  // Days of week
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
  
  // Months
  january: 'January',
  february: 'February',
  march: 'March',
  april: 'April',
  may: 'May',
  june: 'June',
  july: 'July',
  august: 'August',
  september: 'September',
  october: 'October',
  november: 'November',
  december: 'December',
  
  // Canvas specific
  savedLayouts: 'Saved Layouts',
  refreshList: 'Refresh list',
  noSavedLayoutsYet: 'No saved layouts yet',
  default: 'Default',
  tables: 'tables',
  loadLayout: 'Load Layout',
  saveLayout: 'Save Layout',
  layoutName: 'Layout Name',
  layoutNamePlaceholder: 'e.g., Birthday Party Setup',
  setAsDefaultLayout: 'Set as default layout for this zone',
  updateLayout: 'Update Layout',
  saveLayoutAs: 'Save Layout As',
  moveToolTooltip: 'Move Tool (Select)',
  squareTableTooltip: 'Square Table (Click & Drag to draw, hold Shift for square)',
  roundTableTooltip: 'Round Table (Click & Drag to draw, hold Shift for circle)',
  wallToolTooltip: 'Wall (Click & Drag to draw, hold Shift to constrain angle)',
  textToolTooltip: 'Text Tool (Click to place text)',
  deleteToolTooltip: 'Delete Tool (Click to delete)',
  resetAllTooltip: 'Reset All',
  fontLabel: 'Font:',
  decreaseFontSize: 'Decrease font size',
  increaseFontSize: 'Increase font size',
  layouts: 'Layouts',
  confirmTextTooltip: 'Confirm text (Enter)',
  cancelTextTooltip: 'Cancel text (Escape)',
  enterTextPlaceholder: 'Enter text...',
  rotate: 'Rotate',
  tablesLabel: 'Tables:',
  telLabel: 'Tel:',
  addDefaultLayout: 'Add Default Layout',
  clickToStartDesigning: 'Click to start designing your layout',
  
  // Sidebar specific
  open: 'Open',
  closed: 'Closed',
  name: 'Name',
  table: 'Table',
  mergedZones: 'Merged Zones',
  booked: 'BOOKED',
  seated: 'SEATED',
  cleared: 'CLEARED',
  arrivedQuestion: 'Arrived?',
  markAsArrived: 'Mark as arrived',
  markAsNotArrived: 'Mark as not arrived',
  clearedQuestion: 'Cleared?',
  markAsCleared: 'Mark as cleared',
  markAsNotCleared: 'Keep occupied',
  noOpenReservations: 'There are no open reservations',
  noClosedReservations: 'There are no closed reservations.',
  addOneOnPlusButton: 'Add one on plus button...',
  noSeatedReservations: 'There are no seated reservations.',
  
  // Reservation Form & Modal specific
  addNewReservation: 'Add New Reservation',
  editReservation: 'Edit Reservation',
  reservationDetails: 'Reservation Details',
  nameOfReservation: 'Name of reservation',
  dateAndTime: 'Date & Time',
  noAdditionalNotes: 'No additional notes',
  finalizedReservation: 'Finalized Reservation',
  finalizedReservationDesc: 'This reservation has been finalized and cannot be modified. It can only be deleted (removed from display but kept in statistics).',
  updateReservation: 'Update reservation',
  cancelReservation: 'Cancel Reservation',
  deleteReservation: 'Delete Reservation',
  cancelReservationMessage: 'Are you sure you want to cancel the reservation for "{name}"? The reservation will be marked as cancelled.',
  deleteReservationMessage: 'Are you sure you want to delete the reservation for "{name}"? This action cannot be undone.',
  finalizedCannotEdit: 'This reservation has been finalized and cannot be edited. Only deletion is allowed.',
  saveFailedMessage: 'Failed to save reservation. Please try again.',
  cancelFailed: 'Cancel Failed',
  cancelFailedMessage: 'Failed to cancel reservation. Please try again.',
  
  // Form fields specific
  selectZone: 'Select Zone',
  tableNumber: 'Table number',
  removeTable: 'Remove table',
  serviceType: 'Service type',
  popularServiceTypes: 'Popular service types',
  mobileNumber: 'Mobile number',
  additionalRequirements: 'Additional requirements',
  print: 'Print',
  preview: 'Preview',
  created: 'Created',
  
  // Print Preview specific
  printPreview: 'Print Preview',
  reservationTitle: 'RESERVATION',
  guestLabel: 'Guest:',
  dateLabel: 'Date:',
  timeLabel: 'Time:',
  tableLabel: 'Table:',
  seatsLabel: 'Seats:',
  serviceLabel: 'Service:',
  notesLabel: 'Notes:',
  printFooterMessage: 'We are delighted to welcome you to',
  printFooterThankYou: 'Thank you for your reservation. We look forward to providing you with an exceptional dining experience.',
  
  // Validation Messages
  invalidDateTime: 'Invalid Date/Time',
  invalidDateTimeMessage: 'Reservation must be scheduled for a future date and time. Please select a date and time that hasn\'t passed yet.',
  tableUnavailable: 'Table Unavailable',
  tableUnavailableMessage: 'Table "{table}" is already booked at {time} on this day for guest "{guest}".',
  tableNotFound: 'Table Not Found',
  tableNotFoundMessage: 'Table "{table}" does not exist.',
  deleteFailed: 'Delete Failed',
  deleteFailedMessage: 'Failed to delete reservation. Please try again.',
  
  // Finalized Reservation Modal
  reservationDetailsFinalized: 'Reservation Details (Finalized)',
  
  // Timeline Bar
  noReservationsSelectedDate: 'No reservations for selected date',
  
  // Form Validation
  fieldRequired: 'This field is required',
  emailRequired: 'Email address is required',
  passwordRequired: 'Password is required',
  nameRequired: 'Name is required',
  restaurantNameRequired: 'Restaurant name is required',
  guestNameRequired: 'Guest name is required',

  // Color / Table color
  tableColor: 'Table color',
  chooseTableColor: 'Choose table color',
};

const serbianTranslations: Translations = {
  // Header & Navigation
  dashboard: 'Kontrolna tabla',
  statistics: 'Statistike',
  accountSettings: 'Podešavanja naloga',
  logout: 'Odjavi se',
  
  // Dashboard & Main UI
  addReservation: 'Dodaj rezervaciju',
  todaysReservations: 'Današnje rezervacije',
  viewAllReservations: 'Prikaži sve rezervacije',
  noReservationsToday: 'Nema rezervacija za danas',
  upcomingReservations: 'Predstojeće rezervacije',
  
  // Reservation Form
  guestName: 'Ime gosta',
  phoneNumber: 'Broj telefona',
  numberOfGuests: 'Broj gostiju',
  reservationDate: 'Datum rezervacije',
  reservationTime: 'Vreme rezervacije',
  notes: 'Napomene',
  selectTable: 'Izaberite sto',
  save: 'Sačuvaj',
  
  
  // Reservation Status
  confirmed: 'Potvrđena',
  pending: 'Na čekanju',
  cancelled: 'Otkazana',
  completed: 'Završena',
  notArrived: 'Nisu stigli',
  waiting: 'Na čekanju',
  
  // Account Settings
  accountSettingsTitle: 'Podešavanja naloga',
  restaurantInformation: 'Informacije o restoranu',
  ownerInformation: 'Informacije o vlasniku',
  contactInformation: 'Kontakt informacije',
  preferences: 'Podešavanja',
  advancedOptions: 'Napredne opcije',
  saveChanges: 'Sačuvaj izmene',
  checkForUpdates: 'Proveri ažuriranja',
  checkForUpdatesDescription: 'Ručno proveri da li je dostupno novo ažuriranje aplikacije.',
  
  // Restaurant Info
  restaurantName: 'Naziv restorana',
  restaurantLogo: 'Logo restorana',
  restaurantLogoDark: 'Logo restorana - Tamna tema',
  restaurantLogoLight: 'Logo restorana - Svetla tema',
  printLogo: 'Logo za štampanje',
  uploadLogo: 'Otpremi logo',
  removeLogo: 'Ukloni logo',
  printLogoDescription: 'PNG, JPG (Maks 5MB) - Koristi se za račune i štampane dokumente',
  logoFileDescription: 'PNG, JPG (Maks 5MB)',
  uploading: 'Otpremanje...',
  noLogo: 'Nema logotipa',
  noPrintLogo: 'Nema logotipa za štampu',
  enterRestaurantName: 'Unesite naziv restorana',
  enterOwnerName: 'Unesite ime vlasnika',
  enterPhoneNumber: 'Unesite broj telefona',
  enterAddress: 'Unesite adresu restorana',
  
  // Owner Info
  ownerName: 'Ime vlasnika',
  emailAddress: 'Email adresa',
  emailCannotBeChanged: 'Email ne može da se menja',
  changePassword: 'Promeni lozinku',
  currentPassword: 'Trenutna lozinka',
  newPassword: 'Nova lozinka',
  confirmNewPassword: 'Potvrdi novu lozinku',
  
  // Contact Info
  phoneNumberLabel: 'Broj telefona',
  addressLabel: 'Adresa',
  timezoneLabel: 'Vremenska zona',
  
  // Preferences
  applicationLanguage: 'Jezik aplikacije',
  autoArchiveReservations: 'Automatski arhiviraj stare rezervacije',
  autoArchiveDescription: 'Automatski arhiviraj rezervacije starije od 30 dana',
  
  // Advanced Options
  exportData: 'Izvezi podatke',
  exportDataDescription: 'Preuzmite sve vaše podatke za backup ili GDPR usklađenost',
  deactivateAccount: 'Deaktiviraj nalog',
  deactivateAccountDescription: 'Trajno onemogućite vaš nalog. Ova radnja se ne može poništiti.',
  
  // Statistics
  totalReservations: 'Ukupno rezervacija',
  todayReservations: 'Danas',
  thisWeekReservations: 'Ova nedelja',
  thisMonthReservations: 'Ovaj mesec',
  averagePartySize: 'Prosečan broj gostiju',
  peakHours: 'Najtraženiji sati',
  mostBookedTables: 'Najviše rezervisani stolovi',
  analytics: 'Analitika',
  totalGuests: 'Ukupno gostiju',
  arrivedReservations: 'Stigli',
  notArrivedReservations: 'Nisu stigli',
  cancelledReservations: 'Otkazano',
  revenue: 'Prihod',
  exportCSV: 'Izvezi CSV',
  clearHistory: 'Obriši istoriju',
  confirmClearHistory: 'Obriši svu istoriju',
  clearHistoryMessage: 'Ovo će trajno obrisati svu istoriju rezervacija i statistike. Ova radnja se ne može poništiti.',
  clearHistoryButton: 'Obriši sve podatke',
  keepHistory: 'Zadrži istoriju',
  guests: 'Gosti',
  arrived: 'Stigli',
  reservations: 'Rezervacija',
  noDataAvailable: 'Nema dostupnih podataka',
  topTablesTitle: 'Najtraženiji stolovi',
  topZonesTitle: 'Najtraženije zone',
  topWaitersTitle: 'Najtraženiji konobari',
  topLoyaltyTitle: 'Top loyalty gosti',
  monthlyOverview: 'Mesečni pregled',
  reservationTrends: 'Trendovi rezervacija',
  dailyOverview: 'Dnevni pregled',
  weeklyOverview: 'Nedeljni pregled',
  hourlyBreakdown: 'Podela po satima',
  dailyBreakdown: 'Podela po danima',
  weeklyBreakdown: 'Podela po nedeljama',
  refresh: 'Osveži',
  date: 'Datum',
  weekOf: 'Nedelja od',
  month: 'Mesec',
  loadingStatistics: 'Učitava statistike...',
  total: 'Ukupno',
  time: 'Vreme',
  day: 'Dan',
  arrivedLabel: 'Stigli',
  notArrivedLabel: 'Nisu stigli',
  cancelledLabel: 'Otkazano',
  noReservationsThisMonth: 'Nema rezervacija za ovaj mesec',
  noReservationsEntered: 'Nema unetih rezervacija',
  noTableDataAvailable: 'Nema podataka o stolovima',
  allReservations: 'Sve rezervacije',
  allReservationsDescription: 'Ova tabela prikazuje sve istorijske rezervacije uključujući i obrisane radi kompletnog praćenja statistika.',
  type: 'Tip',
  phone: 'Telefon',
  status: 'Status',
  zone: 'Zona',
  deleted: '(obrisano)',
  noStatisticsAvailable: 'Nema dostupnih statistika',
  createReservationsToSeeAnalytics: 'Napravite neke rezervacije da vidite analitiku',
  csvHeaders: {
    date: 'Datum',
    totalReservations: 'Ukupno rezervacija',
    totalGuests: 'Ukupno gostiju',
    arrived: 'Stigli',
    notArrived: 'Nisu stigli',
    cancelled: 'Otkazano',
    revenue: 'Prihod'
  },
  
  // Toolbar & Actions
  addTable: 'Dodaj sto',
  addWall: 'Dodaj zid',
  addText: 'Dodaj tekst',
  deleteSelected: 'Obriši označeno',
  copySelected: 'Kopiraj označeno',
  pasteSelected: 'Nalepi označeno',
  undo: 'Poništi',
  redo: 'Ponovi',
  
  // Zones
  addZone: 'Dodaj zonu',
  editZone: 'Uredi zonu',
  deleteZone: 'Obriši zonu',
  zoneName: 'Naziv zone',
  manageZones: 'Upravljaj zonama',
  addNewZone: 'Dodaj novu zonu',
  existingZones: 'Postojeće zone',
  dragToReorder: 'Povuci za promenu redosleda',
  saving: 'Čuva se...',
  noZonesYet: 'Još uvek nisu kreirane zone.',
  addFirstZone: 'Dodajte vašu prvu zonu iznad.',
  editZoneName: 'Uredi naziv zone',
  deleteZoneTooltip: 'Obriši zonu',
  cannotDeleteLastZone: 'Ne možete obrisati poslednju zonu',
  deleteZoneTitle: 'Obriši zonu',
  deleteZoneMessage: 'Da li ste sigurni da želite da obrišete ovu zonu? Svi rasporedi i aranžmani stolova će biti trajno izgubljeni. Ova radnja se ne može poništiti.',
  deleteZoneButton: 'Obriši zonu',
  saveRequired: 'Potrebno je čuvanje',
  saveBeforeSwitchingZones: 'Molimo sačuvajte ili otkažite vaše izmene pre prebacivanja zone.',
  saveBeforeManagingZones: 'Molimo sačuvajte ili otkažite vaše izmene pre upravljanja zonama.',
  
  // Layout delete confirmations
  deleteLayout: 'Obriši raspored',
  deleteLayoutMessage: 'Da li ste sigurni da želite da obrišete ovaj raspored? Ovo neće obrisati rezervacije, već samo šemu stolova.',
  deleteLayoutButton: 'Obriši raspored',
  
  // Calendar
  today: 'Danas',
  tomorrow: 'Sutra',
  yesterday: 'Juče',
  thisWeek: 'Ova nedelja',
  nextWeek: 'Sledeća nedelja',
  thisMonth: 'Ovaj mesec',
  nextMonth: 'Sledeći mesec',
  
  // Common Actions
  edit: 'Uredi',
  delete: 'Obriši',
  confirm: 'Potvrdi',
  close: 'Zatvori',
  loading: 'Učitavanje...',
  search: 'Pretraži',
  filter: 'Filtriraj',
  ok: 'U redu',
  cancel: 'Otkaži',
  
  // User Menu
  subscribe: 'Pretplata',
  confirmLogout: 'Potvrdi odjavu',
  logoutMessage: 'Da li ste sigurni da se želite odjaviti? Sve nesačuvane izmene će biti izgubljene i moraćete ponovo da se prijavite.',
  logOutButton: 'Odjavi se',
  stayLoggedIn: 'Ostani prijavljen',
  
  // Subscribe/Subscription
  subscription: 'Pretplata',
  currentPlan: 'Trenutni plan',
  availablePlans: 'Dostupni planovi',
  subscriptionUpdated: 'Pretplata ažurirana',
  subscriptionUpdateSuccess: 'Pretplata je uspešno ažurirana!',
  updateFailed: 'Ažuriranje neuspešno',
  updateFailedMessage: 'Ažuriranje pretplate nije uspelo. Pokušajte ponovo.',
  subscriptionCancelled: 'Pretplata otkazana',
  subscriptionCancelSuccess: 'Pretplata je uspešno otkazana.',
  cancellationFailed: 'Otkazivanje neuspešno',
  cancellationFailedMessage: 'Otkazivanje pretplate nije uspelo. Pokušajte ponovo.',
  started: 'Počela',
  ends: 'Završava se',
  active: 'Aktivan',
  upgrade: 'Nadogradi',
  cancelSubscription: 'Otkaži',
  monthly: 'Mesečno',
  yearly: 'Godišnje',
  savePercent: 'Ušteda 20%',
  mostPopular: 'Najpopularniji',
  currentPlanButton: 'Trenutni plan',
  selectPlan: 'Izaberi plan',
  importantInformation: 'Važne informacije',
  confirmCancelSubscription: 'Otkaži pretplatu',
  cancelSubscriptionMessage: 'Da li ste sigurni da želite da otkažete pretplatu? Izgubićete pristup premium funkcijama na kraju trenutnog perioda naplate.',
  cancelSubscriptionButton: 'Otkaži pretplatu',
  keepSubscription: 'Zadrži pretplatu',
  billedYearly: 'naplaćuje se godišnje',
  monthlyShort: 'mesec',
  loadingSubscriptionData: 'Učitava podatke o pretplati...',
  zones: 'Zone',
  usedThisMonth: 'iskorišćeno ovaj mesec',
  planChangesImmediate: 'Izmene plana stupaju na snagu odmah',
  downgradesEndOfCycle: 'Smanjenja plana će biti primenjena na kraju trenutnog ciklusa naplate',
  pricesInEUR: 'Sve cene su u EUR i ne uključuju PDV gde je primenljivo',
  contactForEnterprise: 'Kontaktirajte support@respoint.com za prilagođene enterprise planove',
  // Subscription plan features (copy)
  planFeatureFreeReservations: 'Do 10 rezervacija mesečno',
  planFeatureFreeZones: '1 zona',
  planFeatureFreeLayouts: '1 raspored zone',
  planFeatureFreeCoreTools: 'Osnovni alati: unos rezervacija i crtanje šeme stolova',
  planFeatureProReservations: 'Do 50 rezervacija mesečno',
  planFeatureProZones: 'Do 3 zone',
  planFeatureProLayouts: 'Neograničeno rasporeda zona',
  planFeatureProStatistics: 'Statistički pregled',
  planFeatureProTimeline: 'Timeline planiranje',
  planFeatureProCoreTools: 'Osnovni alati uključeni',
  planFeatureProEmailSupport: 'Email podrška',
  planFeatureEntEverythingInPro: 'Sve iz Pro paketa',
  planFeatureEntUnlimitedReservations: 'Neograničeno rezervacija',
  planFeatureEntUnlimitedZones: 'Neograničeno zona',
  planFeatureEntGuestbook: 'Knjiga gostiju (Guestbook)',
  planFeatureEntWaiterTab: 'Kartica konobara',
  planFeatureEntPrioritySupport: 'Prioritetna podrška',

  // POS Printer
  posPrinterTitle: 'POS štampač',
  desktopOnlyNotice: 'Dostupno samo u desktop aplikaciji.',
  preferredPosPrinter: 'Preferirani POS štampač',
  preferredPosPrinterDescription: 'Koristi se za direktnu štampu računa',
  choosePrinterPlaceholder: '-- Izaberite štampač --',
  saveAsPreferred: 'Sačuvaj kao preferirani',
  windowsDefaultPrinter: 'Windows podrazumevani:',

  // POS Footer customization
  receiptFooterTitle: 'Tekst pri dnu računa',
  footerLine1Label: 'Prva linija',
  footerLine2Label: 'Druga linija',
  saveFooter: 'Sačuvaj footer',
  editFooter: 'Uredi footer',
  updateAvailableTitle: 'Dostupno ažuriranje',
  updateAvailableBody: 'Dostupna je nova verzija – Ažuriraj sada.',
  noUpdateTitle: 'Ažurirano',
  noUpdateBody: 'Trenutno nema dostupnih ažuriranja.',
  
  // Confirmation Messages
  deleteConfirmation: 'Da li ste sigurni da želite da obrišete ovu stavku?',
  unsavedChanges: 'Imate nesačuvane izmene. Da li ste sigurni da želite da otkažete?',
  discardChanges: 'Odbaci izmene',
  discardChangesMessage: 'Imate nesačuvane izmene. Da li ste sigurni da želite da otkažete? Sve izmene će biti izgubljene.',
  keepEditing: 'Nastavi izmene',
  
  // Error Messages
  errorOccurred: 'Dogodila se greška',
  tryAgain: 'Pokušajte ponovo',
  connectionError: 'Greška konekcije. Proverite internetsku vezu.',
  saveFailed: 'Neuspešno čuvanje izmena',
  loadFailed: 'Neuspešno učitavanje podataka',
  
  // Success Messages
  saveSuccessful: 'Izmene su uspešno sačuvane',
  deleteSuccessful: 'Stavka je uspešno obrisana',
  uploadSuccessful: 'Fajl je uspešno otpremljen',
  
  // Time
  am: 'pre podne',
  pm: 'posle podne',
  
  // Days of week
  monday: 'Ponedeljak',
  tuesday: 'Utorak',
  wednesday: 'Sreda',
  thursday: 'Četvrtak',
  friday: 'Petak',
  saturday: 'Subota',
  sunday: 'Nedelja',
  
  // Months
  january: 'Januar',
  february: 'Februar',
  march: 'Mart',
  april: 'April',
  may: 'Maj',
  june: 'Jun',
  july: 'Jul',
  august: 'Avgust',
  september: 'Septembar',
  october: 'Oktobar',
  november: 'Novembar',
  december: 'Decembar',
  
  // Canvas specific
  savedLayouts: 'Sačuvani rasporedi',
  refreshList: 'Osveži listu',
  noSavedLayoutsYet: 'Još uvek nema sačuvanih rasporeda',
  default: 'Podrazumevano',
  tables: 'Stolovi',
  loadLayout: 'Učitaj raspored',
  saveLayout: 'Sačuvaj raspored',
  layoutName: 'Ime rasporedа',
  layoutNamePlaceholder: 'npr., Postavka za rođendan',
  setAsDefaultLayout: 'Postaviti kao podrazumevani raspored za ovu zonu',
  updateLayout: 'Ažuriraj raspored',
  saveLayoutAs: 'Sačuvaj raspored kao',
  moveToolTooltip: 'Alat za pomeranje (odabir)',
  squareTableTooltip: 'Kvadratni sto (kliknite i povucite za crtanje, držite Shift za kvadrat)',
  roundTableTooltip: 'Okrugli sto (kliknite i povucite za crtanje, držite Shift za krug)',
  wallToolTooltip: 'Zid (kliknite i povucite za crtanje, držite Shift za ograničavanje ugla)',
  textToolTooltip: 'Alat za tekst (kliknite za postavke teksta)',
  deleteToolTooltip: 'Alat za brisanje (kliknite za brisanje)',
  resetAllTooltip: 'Resetuj sve',
  fontLabel: 'Font:',
  decreaseFontSize: 'Smanji veličinu fonta',
  increaseFontSize: 'Povećaj veličinu fonta',
  layouts: 'Rasporedi',
  confirmTextTooltip: 'Potvrdi tekst (Enter)',
  cancelTextTooltip: 'Otkaži tekst (Escape)',
  enterTextPlaceholder: 'Unesi tekst...',
  rotate: 'Rotiraj',
  tablesLabel: 'Stolovi:',
  telLabel: 'Tel:',
  addDefaultLayout: 'Dodaj podrazumevani raspored',
  clickToStartDesigning: 'Kliknite za početak dizajniranja rasporedа',
  
  // Sidebar specific
  open: 'Otvoreno',
  closed: 'Zatvoreno',
  name: 'Ime',
  table: 'Stolovi',
  mergedZones: 'Spojene zone',
  booked: 'REZERVACIJE',
  seated: 'Smešteni',
  cleared: 'Završeno',
  arrivedQuestion: 'Stigli?',
  markAsArrived: 'Označi kao stigli',
  markAsNotArrived: 'Označi kao nisu stigli',
  clearedQuestion: 'Završeno?',
  markAsCleared: 'Označi kao oslobođeno',
  markAsNotCleared: 'Nije oslobođeno',
  noOpenReservations: 'Nema otvorenih rezervacija za',
  noClosedReservations: 'Nema završenih rezervacija.',
  addOneOnPlusButton: 'Dodajte na dugme plus...',
  noSeatedReservations: 'Nema smeštenih rezervacija.',
  
  // Reservation Form & Modal specific
  addNewReservation: 'Dodaj novu rezervaciju',
  editReservation: 'Uredi rezervaciju',
  reservationDetails: 'Detalji rezervacije',
  nameOfReservation: 'Ime rezervacije',
  dateAndTime: 'Datum i vreme',
  noAdditionalNotes: 'Nema dodatnih napomena',
  finalizedReservation: 'Završena rezervacija',
  finalizedReservationDesc: 'Ova rezervacija je završena i ne može se menjati. Može se samo obrisati (ukloniti iz prikaza ali zadržati u statistikama).',
  updateReservation: 'Ažuriraj rezervaciju',
  cancelReservation: 'Otkaži rezervaciju',
  deleteReservation: 'Obriši rezervaciju',
  cancelReservationMessage: 'Da li ste sigurni da želite da otkažete rezervaciju za "{name}"? Rezervacija će biti označena kao otkazana.',
  deleteReservationMessage: 'Da li ste sigurni da želite da obrišete rezervaciju za "{name}"? Ova radnja se ne može poništiti.',
  finalizedCannotEdit: 'Ova rezervacija je završena i ne može se uređivati. Dozvoljeno je samo brisanje.',
  saveFailedMessage: 'Čuvanje rezervacije nije uspelo. Pokušajte ponovo.',
  cancelFailed: 'Otkazivanje neuspešno',
  cancelFailedMessage: 'Otkazivanje rezervacije nije uspelo. Pokušajte ponovo.',
  
  // Form fields specific
  selectZone: 'Izaberite zonu',
  tableNumber: 'Broj stola',
  removeTable: 'Ukloni sto',
  serviceType: 'Tip usluge',
  popularServiceTypes: 'Popularni tipovi usluge',
  mobileNumber: 'Broj mobilnog',
  additionalRequirements: 'Dodatni zahtevi',
  print: 'Štampaj',
  preview: 'Pregled',
  created: 'Kreirana',
  
  // Print Preview specific
  printPreview: 'Pregled štampe',
  reservationTitle: 'REZERVACIJA',
  guestLabel: 'Gost:',
  dateLabel: 'Datum:',
  timeLabel: 'Vreme:',
  tableLabel: 'Sto:',
  seatsLabel: 'Mesta:',
  serviceLabel: 'Usluga:',
  notesLabel: 'Napomene:',
  printFooterMessage: 'Radujemo se što ćemo vas ugostiti u',
  printFooterThankYou: 'Hvala vam što ste deo naše priče. Radujemo se što ćemo vam pružiti izuzetno iskustvo.',
  
  // Validation Messages
  invalidDateTime: 'Neispravan datum/vreme',
  invalidDateTimeMessage: 'Rezervacija mora biti zakazana za budući datum i vreme. Izaberite termin koji još nije prošao.',
  tableUnavailable: 'Sto nije dostupan',
  tableUnavailableMessage: 'Sto "{table}" je već rezervisan u {time} na ovaj dan za gosta "{guest}".',
  tableNotFound: 'Sto nije pronađen',
  tableNotFoundMessage: 'Sto "{table}" ne postoji.',
  deleteFailed: 'Brisanje neuspešno',
  deleteFailedMessage: 'Brisanje rezervacije nije uspelo. Pokušajte ponovo.',
  
  // Finalized Reservation Modal
  reservationDetailsFinalized: 'Detalji rezervacije (Završena)',
  
  // Timeline Bar
  noReservationsSelectedDate: 'Nema rezervacija za izabrani datum',
  
  // Form Validation
  fieldRequired: 'Ovo polje je obavezno',
  emailRequired: 'Email adresa je obavezna',
  passwordRequired: 'Lozinka je obavezna',
  nameRequired: 'Ime je obavezno',
  restaurantNameRequired: 'Ime restorana je obavezno',
  guestNameRequired: 'Ime gosta je obavezno',

  // Color / Table color
  tableColor: 'Boja stola',
  chooseTableColor: 'Izaberi boju stola',
};

interface LanguageContextType {
  currentLanguage: string;
  translations: Translations;
  setLanguage: (language: string) => void;
  t: (key: keyof Translations) => string;
  getMonthNames: () => string[];
  getDayNames: () => string[];
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useContext(UserContext);
  const [currentLanguage, setCurrentLanguage] = useState(user?.language || 'eng');

  // Update language when user language changes
  useEffect(() => {
    if (user?.language && user.language !== currentLanguage) {
      setCurrentLanguage(user.language);
    }
  }, [user?.language, currentLanguage]);

  const translations = currentLanguage === 'srb' ? serbianTranslations : englishTranslations;

  const setLanguage = (language: string) => {
    setCurrentLanguage(language);
  };

  const t = (key: any): string => {
    return (translations as any)[key] ?? String(key);
  };

  const getMonthNames = (): string[] => {
    return currentLanguage === 'srb' 
      ? ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  };

  const getDayNames = (): string[] => {
    return currentLanguage === 'srb'
      ? ['Ned', 'Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  };

  return (
    <LanguageContext.Provider value={{
      currentLanguage,
      translations,
      setLanguage,
      t,
      getMonthNames,
      getDayNames
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}; 