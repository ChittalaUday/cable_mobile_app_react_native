import type { ImageSourcePropType } from 'react-native';

export const IMAGES = {
  // Brand & App Icons
  icon: (require('../../assets/icon.png') as ImageSourcePropType),
  splashIcon: (require('../../assets/splash-icon.png') as ImageSourcePropType),
  adaptiveIcon: (require('../../assets/adaptive-icon.png') as ImageSourcePropType),
  favicon: (require('../../assets/favicon.png') as ImageSourcePropType),

  // Hero & Banners
  loginHero: (require('../../assets/images/login-hero.png') as ImageSourcePropType),
  operatorHero: (require('../../assets/images/operator-hero.png') as ImageSourcePropType),
  onboardingHero: (require('../../assets/welcome-asset-2k.png') as ImageSourcePropType),

  // Add Customer & Customer Details New Assets
  addCustomerSuccessTechnician: (require('../../assets/images/add-customer-success-technician.png') as ImageSourcePropType),
  customerDetailsHeaderBg: (require('../../assets/images/customer-details-header-bg.png') as ImageSourcePropType),

  // Illustrations & Draft Assets
  allSet: (require('../../assets/all-set-asset-2k.png') as ImageSourcePropType),
  cableOutage: (require('../../assets/cable-outage-illustration-draft.png') as ImageSourcePropType),
  connectionError404: (require('../../assets/connection-error-404-illustration-draft.png') as ImageSourcePropType),
  needHelp: (require('../../assets/need-help-asset-2k.png') as ImageSourcePropType),
  powerOutageNoSignal: (require('../../assets/power-outage-no-signal-illustration-draft.png') as ImageSourcePropType),
  setupBox: (require('../../assets/setup-box-asset-2k.png') as ImageSourcePropType),
  setupBoxHoldBack: (require('../../assets/setup-box-hold-back-illustration-draft.png') as ImageSourcePropType),
  setupBoxHoldFront: (require('../../assets/setup-box-hold-front-illustration-draft.png') as ImageSourcePropType),
  technicianNetworkTower: (require('../../assets/technician-network-tower-illustration-draft.png') as ImageSourcePropType),
  tvNoConnection: (require('../../assets/tv-no-connection-illustration-draft.png') as ImageSourcePropType),
  welcome: (require('../../assets/welcome-asset-2k.png') as ImageSourcePropType),
  welcomeIllustration: (require('../../assets/welcome-illustration-draft.png') as ImageSourcePropType),
} as const;

export type ImageAsset = keyof typeof IMAGES;

export const ASSETS = {
  images: IMAGES,
} as const;

export default ASSETS;
