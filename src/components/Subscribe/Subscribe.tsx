import React, { useState, useContext, useEffect, useCallback } from 'react';
import { UserContext } from '../../context/UserContext';
import { useLanguage } from '../../context/LanguageContext';
import { subscriptionService, SubscriptionPlan, UserSubscription } from '../../services/subscriptionService';
import DeleteConfirmationModal from '../common/DeleteConfirmationModal';
import { ThemeContext } from '../../context/ThemeContext';

interface SubscribeProps {
  isOpen: boolean;
  onClose: () => void;
}

type BillingCycle = 'monthly' | 'yearly';

const Subscribe: React.FC<SubscribeProps> = ({ isOpen, onClose }) => {
  const { user } = useContext(UserContext);
  const { t } = useLanguage();
  const { theme } = useContext(ThemeContext);
  
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [limits, setLimits] = useState<any>(null);
  
  // GLOBAL MODAL INPUT LOCK FIX: Delayed modal content rendering
  const [showModalContent, setShowModalContent] = useState(false);

  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'error' | 'success'
  });
  
  useEffect(() => {
    if (isOpen) {
      console.log('🚀 Subscribe opening with delayed content rendering...');
      console.log('📍 Active element on modal open:', document.activeElement);
      const timeout = setTimeout(() => setShowModalContent(true), 0);
      return () => clearTimeout(timeout);
    } else {
      setShowModalContent(false);
    }
  }, [isOpen]);

  // Helper function to show alert modal
  const showAlert = useCallback((title: string, message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setAlertConfig({ title, message, type });
    setShowAlertModal(true);
  }, []);
  
  // Load plans and current subscription
  useEffect(() => {
    if (isOpen && user) {
      loadSubscriptionData();
    }
  }, [isOpen, user]);
  
  const loadSubscriptionData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Load available plans (features text is composed via i18n at render time)
      const availablePlans = await subscriptionService.getPlans();
      setPlans(availablePlans);
      
      // Load user's current subscription
      const userSub = await subscriptionService.getUserSubscription(user.id);
      setCurrentSubscription(userSub);
      
      // Load subscription limits
      const userLimits = await subscriptionService.checkSubscriptionLimits(user.id);
      setLimits(userLimits);
      
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePlanSelect = async (planId: string) => {
    if (!user) return;
    
    if (currentSubscription?.plan_id === planId) {
      return; // Already on this plan
    }
    
    setLoading(true);
    try {
      await subscriptionService.createOrUpdateSubscription(user.id, planId);
      // Reload subscription data
      await loadSubscriptionData();
      showAlert(
        t('subscriptionUpdated'),
        t('subscriptionUpdateSuccess'),
        'success'
      );
    } catch (error) {
      console.error('Error updating subscription:', error);
      showAlert(
        t('updateFailed'),
        t('updateFailedMessage'),
        'error'
      );
    } finally {
      setLoading(false);
    }
  };
  
  const handleCancel = () => {
    if (!user || !currentSubscription) return;
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await subscriptionService.cancelSubscription(user.id);
      // Reload subscription data
      await loadSubscriptionData();
      showAlert(
        t('subscriptionCancelled'),
        t('subscriptionCancelSuccess'),
        'success'
      );
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      showAlert(
        t('cancellationFailed'),
        t('cancellationFailedMessage'),
        'error'
      );
    } finally {
      setLoading(false);
    }
  };
  
  // Global modal events – must be declared before any conditional returns to keep hooks order stable
  useEffect(() => {
    if (!isOpen) return;
    try { window.dispatchEvent(new CustomEvent('modal-open')); } catch {}
    return () => { try { window.dispatchEvent(new CustomEvent('modal-close')); } catch {} };
  }, [isOpen]);

  if (!isOpen || !showModalContent) return null;
  
  const currentPlan = plans.find(p => p.id === currentSubscription?.plan_id);

  // Localized feature lists per plan
  const getPlanFeatures = (planName: string): string[] => {
    if (planName === 'Free') {
      return [
        t('planFeatureFreeReservations'),
        t('planFeatureFreeZones'),
        t('planFeatureFreeLayouts'),
        t('planFeatureFreeCoreTools'),
      ];
    }
    if (planName === 'Pro') {
      return [
        t('planFeatureProReservations'),
        t('planFeatureProZones'),
        t('planFeatureProLayouts'),
        t('planFeatureProStatistics'),
        t('planFeatureProTimeline'),
        t('planFeatureProCoreTools'),
        t('planFeatureProEmailSupport'),
      ];
    }
    // Enterprise
    return [
      t('planFeatureEntEverythingInPro'),
      t('planFeatureEntUnlimitedReservations'),
      t('planFeatureEntUnlimitedZones'),
      t('planFeatureEntGuestbook'),
      t('planFeatureEntWaiterTab'),
      t('planFeatureEntPrioritySupport'),
    ];
  };

  return (
    <div className="fixed inset-x-0 bottom-0 top-[var(--titlebar-h)] bg-black/70 backdrop-blur-sm backdrop-brightness-75 z-[12050] flex items-stretch justify-center p-0">
      <div className="bg-[#000814] w-full h-full max-w-none max-h-none rounded-none flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-xl font-light text-white tracking-wide">{t('subscription')}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 statistics-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-400">{t('loadingSubscriptionData')}</div>
            </div>
          ) : (
            <>
              {/* Current Plan Section */}
              {currentPlan && (
                <div className="mb-8">
                  <h3 className="text-sm font-medium text-gray-300 mb-4 uppercase tracking-wider">{t('currentPlan')}</h3>
                  <div className="bg-[#0A1929] border border-gray-800 rounded p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <h4 className="text-2xl font-light text-white">{currentPlan.name}</h4>
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              theme === 'light'
                                ? 'bg-green-100 text-green-600'
                                : 'bg-green-500/20 text-green-400'
                            }`}
                          >
                            {t('active')}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                              <span className="text-gray-500">{t('started')}:</span>
                            <span className="text-gray-300">
                              {currentSubscription?.starts_at
                                ? new Date(currentSubscription.starts_at).toLocaleDateString('en-GB')
                                : '—'}
                            </span>
                          </div>
                          {currentSubscription?.ends_at && (
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">{t('ends')}:</span>
                              <span className="text-gray-300">
                                {new Date(currentSubscription.ends_at).toLocaleDateString('en-GB')}
                              </span>
                            </div>
                          )}
                          {limits && (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">{t('reservations')}:</span>
                                <span className="text-gray-300">
                                  {limits.currentReservations} / {limits.maxReservations || '∞'} {t('usedThisMonth')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">{t('zones')}:</span>
                                <span className="text-gray-300">
                                  {limits.currentZones} / {limits.maxZones || '∞'} {t('created')}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {currentPlan.name !== 'Enterprise' && (
                          <button
                            onClick={() => {
                              const nextPlan = plans.find(p => p.price > currentPlan.price);
                              if (nextPlan) handlePlanSelect(nextPlan.id);
                            }}
                            className="px-4 py-2 text-sm rounded font-medium transition-colors text-blue-600 hover:bg-blue-600/10"
                          >
                            {t('upgrade')}
                          </button>
                        )}
                        {currentPlan.price > 0 && (
                          <button
                            onClick={handleCancel}
                            className="px-4 py-2 text-sm rounded transition-colors text-red-400 hover:bg-red-500/10"
                          >
                            {t('cancelSubscription')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Plans Section */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">{t('availablePlans')}</h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setBillingCycle('monthly')}
                      className={`px-3 py-1.5 text-xs font-medium transition-all ${
                        billingCycle === 'monthly' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                        {t('monthly')}
                    </button>
                    <span className="text-gray-700">|</span>
                    <button
                      onClick={() => setBillingCycle('yearly')}
                      className={`px-3 py-1.5 text-xs font-medium transition-all ${
                        billingCycle === 'yearly' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                        {t('yearly')}
                        <span className="ml-1 text-green-500">{t('savePercent')}</span>
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                  {plans.map((plan) => {
                    const isCurrentPlan = currentSubscription?.plan_id === plan.id;
                    const monthlyPrice = plan.price;
                    const yearlyPrice = plan.price * 0.8; // 20% discount
                    const displayPrice = billingCycle === 'monthly' ? monthlyPrice : yearlyPrice;
                    
                    return (
                      <div 
                        key={plan.id}
                        className={`bg-[#0A1929] border rounded p-6 relative flex flex-col h-full ${
                          isCurrentPlan ? 'border-blue-500' : 'border-gray-800'
                        }`}
                      >
                        {plan.name === 'Pro' && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white-100 text-xs rounded-full popular-badge">
                              {t('mostPopular')}
                            </span>
                          </div>
                        )}
                        
                        <div className="mb-4">
                          <h4 className="text-lg font-light text-white mb-2">{plan.name}</h4>
                          <div className="text-3xl font-light text-white">
                            €{displayPrice.toFixed(2)}
                            <span className="text-sm text-gray-500">/{t('monthlyShort')}</span>
                          </div>
                          {billingCycle === 'yearly' && plan.price > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              €{(yearlyPrice * 12).toFixed(2)} {t('billedYearly')}
                            </div>
                          )}
                        </div>
                        
                        <ul className="space-y-2 mb-6">
                          {getPlanFeatures(plan.name).map((feature, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400 mt-0.5 flex-shrink-0">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              {feature}
                            </li>
                          ))}
                        </ul>
                        
                        <button
                          onClick={() => handlePlanSelect(plan.id)}
                          disabled={isCurrentPlan || loading}
                          className={`w-full py-2 rounded text-sm font-medium transition-colors mt-auto ${
                            isCurrentPlan
                              ? theme === 'light'
                                ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                              : plan.name === 'Pro'
                              ? 'plan-select-btn bg-gradient-to-r from-purple-600 to-blue-600 text-white-100 hover:from-purple-700 hover:to-blue-700'
                              : 'plan-select-btn bg-blue-600 text-white-100 hover:bg-blue-700'
                          }`}
                        >
                          {isCurrentPlan ? t('currentPlanButton') : t('selectPlan')}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Information */}
              <div className="bg-[#0A1929] border border-gray-800 rounded p-6">
                <h4 className="text-sm font-medium text-gray-300 mb-3">{t('importantInformation')}</h4>
                <ul className="space-y-2 text-xs text-gray-400">
                  <li>• {t('planChangesImmediate')}</li>
                  <li>• {t('downgradesEndOfCycle')}</li>
                  <li>• {t('pricesInEUR')}</li>
                  <li>• {t('contactForEnterprise')}</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Cancel Subscription Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={confirmCancel}
        title={t('confirmCancelSubscription')}
        message={t('cancelSubscriptionMessage')}
        confirmText={t('cancelSubscriptionButton')}
        cancelText={t('keepSubscription')}
        type="danger"
      />

      {/* Alert Modal */}
      <DeleteConfirmationModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
      />
    </div>
  );
};

export default Subscribe; 