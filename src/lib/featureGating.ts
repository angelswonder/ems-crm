/**
 * Feature Gating Utilities
 * Controls which features are available based on subscription plan
 */

import type { Tenant, UserProfile } from '../contexts/AuthContext';

export interface FeatureFlags {
  // Basic features (Free)
  basicCRM: boolean;
  emailSupport: boolean;
  
  // Advanced features (Pro)
  advancedAnalytics: boolean;
  apiAccess: boolean;
  customIntegrations: boolean;
  unlimitedLeads: boolean;
  teamCollaboration: boolean;
  
  // Enterprise features
  dedicatedSupport: boolean;
  sso: boolean;
  advancedSecurityAudit: boolean;
  customBranding: boolean;
}

/**
 * Get feature flags for a tenant based on their plan
 */
export const getFeatureFlags = (tenant: Tenant | null, plan?: string): FeatureFlags => {
  const planType = plan || tenant?.plan_type || 'free';

  const baseFeatures: FeatureFlags = {
    // All plans get these
    basicCRM: true,
    emailSupport: true,
    
    // Pro+ features
    advancedAnalytics: ['pro', 'enterprise'].includes(planType),
    apiAccess: ['pro', 'enterprise'].includes(planType),
    customIntegrations: ['pro', 'enterprise'].includes(planType),
    unlimitedLeads: ['pro', 'enterprise'].includes(planType),
    teamCollaboration: ['pro', 'enterprise'].includes(planType),
    
    // Enterprise only
    dedicatedSupport: planType === 'enterprise',
    sso: planType === 'enterprise',
    advancedSecurityAudit: planType === 'enterprise',
    customBranding: planType === 'enterprise',
  };

  return baseFeatures;
};

/**
 * Check if a specific feature is available
 */
export const hasFeature = (
  feature: keyof FeatureFlags,
  tenant: Tenant | null,
  plan?: string
): boolean => {
  const flags = getFeatureFlags(tenant, plan);
  return flags[feature] === true;
};

/**
 * Get feature limits based on plan
 */
export const getFeatureLimits = (plan: string = 'free') => {
  const limits = {
    free: {
      maxLeads: 100,
      maxTeamMembers: 3,
      maxProjects: 5,
      storageGB: 1,
      apiCallsPerDay: 1000,
    },
    pro: {
      maxLeads: 10000,
      maxTeamMembers: 5,
      maxProjects: 50,
      storageGB: 100,
      apiCallsPerDay: 100000,
    },
    enterprise: {
      maxLeads: Infinity,
      maxTeamMembers: Infinity,
      maxProjects: Infinity,
      storageGB: Infinity,
      apiCallsPerDay: Infinity,
    },
  };

  return limits[plan as keyof typeof limits] || limits.free;
};

/**
 * Check if a user has reached their feature limit
 */
export const isAtLimit = (
  current: number,
  feature: string,
  tenant: Tenant | null
): boolean => {
  const planType = tenant?.plan_type || 'free';
  const limits = getFeatureLimits(planType);

  const limitKey = feature as keyof typeof limits.free;
  const limit = limits[limitKey];

  return current >= limit;
};

/**
 * Get percentage towards limit
 */
export const getUsagePercentage = (
  current: number,
  feature: string,
  tenant: Tenant | null
): number => {
  const planType = tenant?.plan_type || 'free';
  const limits = getFeatureLimits(planType);

  const limitKey = feature as keyof typeof limits.free;
  const limit = limits[limitKey];

  if (!isFinite(limit)) return 0;

  return Math.round((current / limit) * 100);
};

/**
 * Feature gating React component wrapper
 */
export const FeatureGate: React.FC<{
  feature: keyof FeatureFlags;
  tenant: Tenant | null;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ feature, tenant, children, fallback }) => {
  const hasAccess = hasFeature(feature, tenant);

  if (!hasAccess) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};

/**
 * Get upgrade recommendation based on current usage
 */
export const getUpgradeRecommendation = (
  currentLeads: number,
  currentTeamSize: number,
  tenant: Tenant | null
) => {
  const planType = tenant?.plan_type || 'free';

  if (planType === 'enterprise') return null;

  const limits = getFeatureLimits(planType);

  if (currentLeads > limits.maxLeads * 0.8) {
    return {
      type: 'leads',
      message: `You've used ${getUsagePercentage(currentLeads, 'maxLeads', tenant)}% of your lead quota. Consider upgrading to Pro for unlimited leads.`,
    };
  }

  if (currentTeamSize > limits.maxTeamMembers * 0.8) {
    return {
      type: 'team',
      message: `You're approaching your team member limit. Upgrade to Pro for more team slots.`,
    };
  }

  return null;
};

/**
 * Pricing per feature
 */
export const FEATURE_PRICING = {
  advancedAnalytics: { free: false, pro: true, enterprise: true },
  apiAccess: { free: false, pro: true, enterprise: true },
  customIntegrations: { free: false, pro: true, enterprise: true },
  unlimitedLeads: { free: false, pro: true, enterprise: true },
  teamCollaboration: { free: false, pro: true, enterprise: true },
  dedicatedSupport: { free: false, pro: false, enterprise: true },
  sso: { free: false, pro: false, enterprise: true },
  advancedSecurityAudit: { free: false, pro: false, enterprise: true },
  customBranding: { free: false, pro: false, enterprise: true },
};
