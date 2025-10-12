export type SupportedLanguage = 'en' | 'am'

const en = {
  settings: 'Settings',
  account: 'Account',
  editProfile: 'Edit Profile',
  editProfileSubtitle: 'Update your personal information',
  privacySecurity: 'Privacy & Security',
  privacySecuritySubtitle: 'Manage your privacy settings',
  paymentMethods: 'Payment Methods',
  paymentMethodsSubtitle: 'Manage your payment options',

  work: 'Work',
  becomeTasker: 'Become a Tasker',
  switchToCustomer: 'Switch to Customer',
  becomeTaskerSubtitle: 'Apply to become a tasker',
  switchToCustomerSubtitle: 'Switch to customer mode',
  workSchedule: 'Work Schedule',
  workScheduleSubtitle: 'Manage your availability',
  earnings: 'Earnings',
  earningsSubtitle: 'View your earnings and reports',

  preferences: 'Preferences',
  notifications: 'Notifications',
  notificationsSubtitle: 'Enable push notifications',
  locationServices: 'Location Services',
  locationServicesSubtitle: 'Allow location access for better matches',
  darkMode: 'Dark Mode',
  darkModeSubtitle: 'Switch between light and dark themes',
  language: 'Language',
  languageEnglish: 'English',
  languageAmharic: 'አማርኛ',

  support: 'Support',
  helpCenter: 'Help Center',
  helpCenterSubtitle: 'Get help and support',
  contactUs: 'Contact Us',
  contactUsSubtitle: 'Get in touch with our team',
  terms: 'Terms of Service',
  termsSubtitle: 'Read our terms and conditions',
  privacy: 'Privacy Policy',
  privacySubtitle: 'Read our privacy policy',

  logout: 'Logout',
  logoutConfirm: 'Are you sure you want to logout?',
  customerAndTasker: 'Customer & Tasker',
  customer: 'Customer',
  tasker: 'Tasker',
}

const am = {
  settings: 'ማሰናጃ',
  account: 'መግለጫ',
  editProfile: 'መግለጫ አስተካክል',
  editProfileSubtitle: 'የግል መረጃዎን ያዘምኑ',
  privacySecurity: 'ግላዊነት እና ደህንነት',
  privacySecuritySubtitle: 'የግላዊነት ማሰናጃን ያቀናብሩ',
  paymentMethods: 'የክፍያ መንገዶች',
  paymentMethodsSubtitle: 'የክፍያ አማራጮችን ያቀናብሩ',

  work: 'ሥራ',
  becomeTasker: 'ታስከር ይሁኑ',
  switchToCustomer: 'ወደ ደንበኛ ቀይር',
  becomeTaskerSubtitle: 'ለታስከር ይመዝገቡ',
  switchToCustomerSubtitle: 'ወደ ደንበኛ ሁነታ ቀይር',
  workSchedule: 'የሥራ ሰዓት መርሀግብር',
  workScheduleSubtitle: 'ተገኝነትዎን ያቀናብሩ',
  earnings: 'ገቢ',
  earningsSubtitle: 'ገቢዎን ይመልከቱ',

  preferences: 'ምርጫዎች',
  notifications: 'ማሳወቂያዎች',
  notificationsSubtitle: 'የግፊት ማሳወቂያዎችን ያበረክቱ',
  locationServices: 'የአካባቢ አገልግሎቶች',
  locationServicesSubtitle: 'የተሻለ መዛመድ ለማግኘት አካባቢ ፍቃድ ይሰጡ',
  darkMode: 'ጨለማ ዘዴ',
  darkModeSubtitle: 'ብርሃን/ጨለማ ዘዴ ይቀይሩ',
  language: 'ቋንቋ',
  languageEnglish: 'English',
  languageAmharic: 'አማርኛ',

  support: 'ድጋፍ',
  helpCenter: 'የእርዳታ ማዕከል',
  helpCenterSubtitle: 'እርዳታ ያግኙ',
  contactUs: 'ያግኙን',
  contactUsSubtitle: 'ከቡድናችን ጋር ይገናኙ',
  terms: 'የአገልግሎት ውሎች',
  termsSubtitle: 'ውሎቻችንን ያንብቡ',
  privacy: 'የግላዊነት ፖሊሲ',
  privacySubtitle: 'የግላዊነት ፖሊሲን ያንብቡ',

  logout: 'ዘግተው ውጣ',
  logoutConfirm: 'እርግጠኛ ነዎት መውጣት ትፈልጋለህ?',
  customerAndTasker: 'ደንበኛ እና ታስከር',
  customer: 'ደንበኛ',
  tasker: 'ታስከር',
}

const dictionaries: Record<SupportedLanguage, Record<string, string>> = { en, am }

export function t(key: keyof typeof en, lang: SupportedLanguage = 'en'): string {
  const dict = dictionaries[lang] || en
  return (dict as any)[key] ?? (en as any)[key] ?? String(key)
}
