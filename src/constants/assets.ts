export const IMAGES = {
  // Brand & App Icons
  icon: require('../../assets/icon.png'),
  splashIcon: require('../../assets/splash-icon.png'),
  adaptiveIcon: require('../../assets/adaptive-icon.png'),
  favicon: require('../../assets/favicon.png'),
  googleLogo: require('../../assets/images/google-logo.png'),

  // Hero & Banners
  loginHero: require('../../assets/images/login-hero.png'),
  operatorHero: require('../../assets/images/operator-hero.png'),
  onboardingHero: require('../../assets/welcome-asset-2k.png'),

  // Illustrations & Draft Assets
  allSet: require('../../assets/all-set-asset-2k.png'),
  cableOutage: require('../../assets/cable-outage-illustration-draft.png'),
  connectionError404: require('../../assets/connection-error-404-illustration-draft.png'),
  needHelp: require('../../assets/need-help-asset-2k.png'),
  powerOutageNoSignal: require('../../assets/power-outage-no-signal-illustration-draft.png'),
  setupBox: require('../../assets/setup-box-asset-2k.png'),
  setupBoxHoldBack: require('../../assets/setup-box-hold-back-illustration-draft.png'),
  setupBoxHoldFront: require('../../assets/setup-box-hold-front-illustration-draft.png'),
  technicianNetworkTower: require('../../assets/technician-network-tower-illustration-draft.png'),
  tvNoConnection: require('../../assets/tv-no-connection-illustration-draft.png'),
  welcome: require('../../assets/welcome-asset-2k.png'),
  welcomeIllustration: require('../../assets/welcome-illustration-draft.png'),
} as const;

export type ImageAsset = keyof typeof IMAGES;

export const ASSETS = {
  images: IMAGES,
} as const;

export default ASSETS;
