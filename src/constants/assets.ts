import type { ImageSourcePropType } from 'react-native';

export const IMAGES = {
  // Brand & App Icons
  icon: require<ImageSourcePropType>('../../assets/icon.png'),
  splashIcon: require<ImageSourcePropType>('../../assets/splash-icon.png'),
  adaptiveIcon: require<ImageSourcePropType>('../../assets/adaptive-icon.png'),
  favicon: require<ImageSourcePropType>('../../assets/favicon.png'),

  // Hero & Banners
  loginHero: require<ImageSourcePropType>('../../assets/images/login-hero.png'),
  operatorHero: require<ImageSourcePropType>('../../assets/images/operator-hero.png'),
  onboardingHero: require<ImageSourcePropType>('../../assets/welcome-asset-2k.png'),

  // Add Customer & Customer Details New Assets
  addCustomerSuccessTechnician: require<ImageSourcePropType>('../../assets/images/add-customer-success-technician.png'),
  customerDetailsHeaderBg: require<ImageSourcePropType>('../../assets/images/customer-details-header-bg.png'),

  // Illustrations & Draft Assets
  allSet: require<ImageSourcePropType>('../../assets/all-set-asset-2k.png'),
  cableOutage: require<ImageSourcePropType>('../../assets/cable-outage-illustration-draft.png'),
  connectionError404: require<ImageSourcePropType>('../../assets/connection-error-404-illustration-draft.png'),
  needHelp: require<ImageSourcePropType>('../../assets/need-help-asset-2k.png'),
  powerOutageNoSignal: require<ImageSourcePropType>('../../assets/power-outage-no-signal-illustration-draft.png'),
  setupBox: require<ImageSourcePropType>('../../assets/setup-box-asset-2k.png'),
  setupBoxHoldBack: require<ImageSourcePropType>('../../assets/setup-box-hold-back-illustration-draft.png'),
  setupBoxHoldFront: require<ImageSourcePropType>('../../assets/setup-box-hold-front-illustration-draft.png'),
  technicianNetworkTower: require<ImageSourcePropType>('../../assets/technician-network-tower-illustration-draft.png'),
  tvNoConnection: require<ImageSourcePropType>('../../assets/tv-no-connection-illustration-draft.png'),
  welcome: require<ImageSourcePropType>('../../assets/welcome-asset-2k.png'),
  welcomeIllustration: require<ImageSourcePropType>('../../assets/welcome-illustration-draft.png'),
} as const;

export type ImageAsset = keyof typeof IMAGES;

export const ASSETS = {
  images: IMAGES,
} as const;

export default ASSETS;
