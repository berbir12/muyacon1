export interface EthiopianBank {
  id: string
  name: string
  code: string
  logo?: string
  isActive: boolean
  accountNumberLength: number
  accountNumberFormat: string
  description?: string
}

export interface MobileMoneyProvider {
  id: string
  name: string
  code: string
  logo?: string
  isActive: boolean
  phoneNumberLength: number
  phoneNumberFormat: string
  description?: string
}

// Major Ethiopian Banks
export const ETHIOPIAN_BANKS: EthiopianBank[] = [
  {
    id: 'cbe',
    name: 'Commercial Bank of Ethiopia',
    code: 'CBE',
    isActive: true,
    accountNumberLength: 13,
    accountNumberFormat: 'XXXX-XXXX-XXXX-X',
    description: 'The largest bank in Ethiopia'
  },
  {
    id: 'awash',
    name: 'Awash Bank',
    code: 'AWASH',
    isActive: true,
    accountNumberLength: 12,
    accountNumberFormat: 'XXXX-XXXX-XXXX',
    description: 'One of the leading private banks'
  },
  {
    id: 'dashen',
    name: 'Dashen Bank',
    code: 'DASHEN',
    isActive: true,
    accountNumberLength: 12,
    accountNumberFormat: 'XXXX-XXXX-XXXX',
    description: 'Leading private commercial bank'
  },
  {
    id: 'abyssinia',
    name: 'Bank of Abyssinia',
    code: 'BOA',
    isActive: true,
    accountNumberLength: 12,
    accountNumberFormat: 'XXXX-XXXX-XXXX',
    description: 'Private commercial bank'
  },
  {
    id: 'nib',
    name: 'Nib International Bank',
    code: 'NIB',
    isActive: true,
    accountNumberLength: 12,
    accountNumberFormat: 'XXXX-XXXX-XXXX',
    description: 'Private commercial bank'
  },
  {
    id: 'coop',
    name: 'Cooperative Bank of Oromia',
    code: 'CBO',
    isActive: true,
    accountNumberLength: 12,
    accountNumberFormat: 'XXXX-XXXX-XXXX',
    description: 'Regional cooperative bank'
  },
  {
    id: 'wegagen',
    name: 'Wegagen Bank',
    code: 'WEGAGEN',
    isActive: true,
    accountNumberLength: 12,
    accountNumberFormat: 'XXXX-XXXX-XXXX',
    description: 'Private commercial bank'
  },
  {
    id: 'zemen',
    name: 'Zemen Bank',
    code: 'ZEMEN',
    isActive: true,
    accountNumberLength: 12,
    accountNumberFormat: 'XXXX-XXXX-XXXX',
    description: 'Private commercial bank'
  },
  {
    id: 'bunna',
    name: 'Bunna International Bank',
    code: 'BUNNA',
    isActive: true,
    accountNumberLength: 12,
    accountNumberFormat: 'XXXX-XXXX-XXXX',
    description: 'Private commercial bank'
  },
  {
    id: 'berhan',
    name: 'Berhan International Bank',
    code: 'BERHAN',
    isActive: true,
    accountNumberLength: 12,
    accountNumberFormat: 'XXXX-XXXX-XXXX',
    description: 'Private commercial bank'
  },
  {
    id: 'abay',
    name: 'Abay Bank',
    code: 'ABAY',
    isActive: true,
    accountNumberLength: 12,
    accountNumberFormat: 'XXXX-XXXX-XXXX',
    description: 'Private commercial bank'
  },
  {
    id: 'aduna',
    name: 'Aduna Bank',
    code: 'ADUNA',
    isActive: true,
    accountNumberLength: 12,
    accountNumberFormat: 'XXXX-XXXX-XXXX',
    description: 'Private commercial bank'
  },
  {
    id: 'amhara',
    name: 'Amhara Bank',
    code: 'AMHARA',
    isActive: true,
    accountNumberLength: 12,
    accountNumberFormat: 'XXXX-XXXX-XXXX',
    description: 'Regional commercial bank'
  },
  {
    id: 'oromia',
    name: 'Oromia Bank',
    code: 'OROMIA',
    isActive: true,
    accountNumberLength: 12,
    accountNumberFormat: 'XXXX-XXXX-XXXX',
    description: 'Regional commercial bank'
  },
  {
    id: 'sidama',
    name: 'Sidama Bank',
    code: 'SIDAMA',
    isActive: true,
    accountNumberLength: 12,
    accountNumberFormat: 'XXXX-XXXX-XXXX',
    description: 'Regional commercial bank'
  },
  {
    id: 'tirunesh',
    name: 'Tirunesh Beijing Hospital Bank',
    code: 'TIRUNESH',
    isActive: true,
    accountNumberLength: 12,
    accountNumberFormat: 'XXXX-XXXX-XXXX',
    description: 'Specialized bank'
  },
  {
    id: 'habesha',
    name: 'Habesha Bank',
    code: 'HABESHA',
    isActive: true,
    accountNumberLength: 12,
    accountNumberFormat: 'XXXX-XXXX-XXXX',
    description: 'Private commercial bank'
  },
  {
    id: 'shabelle',
    name: 'Shabelle Bank',
    code: 'SHABELLE',
    isActive: true,
    accountNumberLength: 12,
    accountNumberFormat: 'XXXX-XXXX-XXXX',
    description: 'Private commercial bank'
  },
  {
    id: 'telebirr',
    name: 'Telebirr Bank',
    code: 'TELEBIRR',
    isActive: true,
    accountNumberLength: 10,
    accountNumberFormat: 'XXXX-XXXX-XX',
    description: 'Digital bank by Ethio Telecom'
  }
]

// Mobile Money Providers
export const MOBILE_MONEY_PROVIDERS: MobileMoneyProvider[] = [
  {
    id: 'telebirr',
    name: 'Telebirr',
    code: 'TELEBIRR',
    isActive: true,
    phoneNumberLength: 10,
    phoneNumberFormat: '09XX-XXX-XXXX',
    description: 'Ethio Telecom mobile money service'
  },
  {
    id: 'm_pesa',
    name: 'M-Pesa',
    code: 'MPESA',
    isActive: true,
    phoneNumberLength: 10,
    phoneNumberFormat: '09XX-XXX-XXXX',
    description: 'Safaricom mobile money service'
  },
  {
    id: 'hellocash',
    name: 'HelloCash',
    code: 'HELLOCASH',
    isActive: true,
    phoneNumberLength: 10,
    phoneNumberFormat: '09XX-XXX-XXXX',
    description: 'Mobile money service'
  }
]

// Cash Pickup Locations
export const CASH_PICKUP_LOCATIONS = [
  'Addis Ababa - Bole',
  'Addis Ababa - Meskel Square',
  'Addis Ababa - Piassa',
  'Addis Ababa - Merkato',
  'Addis Ababa - CMC',
  'Addis Ababa - Saris',
  'Addis Ababa - Kazanchis',
  'Addis Ababa - Mexico Square',
  'Addis Ababa - Arat Kilo',
  'Addis Ababa - Shiro Meda',
  'Dire Dawa',
  'Hawassa',
  'Bahir Dar',
  'Gondar',
  'Mekelle',
  'Jimma',
  'Dessie',
  'Arba Minch',
  'Jijiga',
  'Harar'
]

// Helper functions
export const getBankById = (id: string): EthiopianBank | undefined => {
  return ETHIOPIAN_BANKS.find(bank => bank.id === id)
}

export const getActiveBanks = (): EthiopianBank[] => {
  return ETHIOPIAN_BANKS.filter(bank => bank.isActive)
}

export const getMobileMoneyProviderById = (id: string): MobileMoneyProvider | undefined => {
  return MOBILE_MONEY_PROVIDERS.find(provider => provider.id === id)
}

export const getActiveMobileMoneyProviders = (): MobileMoneyProvider[] => {
  return MOBILE_MONEY_PROVIDERS.filter(provider => provider.isActive)
}

// Validation functions
export const validateAccountNumber = (bankId: string, accountNumber: string): boolean => {
  const bank = getBankById(bankId)
  if (!bank) return false
  
  // Remove any non-digit characters
  const cleanNumber = accountNumber.replace(/\D/g, '')
  
  return cleanNumber.length === bank.accountNumberLength
}

export const validatePhoneNumber = (providerId: string, phoneNumber: string): boolean => {
  const provider = getMobileMoneyProviderById(providerId)
  if (!provider) return false
  
  // Remove any non-digit characters
  const cleanNumber = phoneNumber.replace(/\D/g, '')
  
  return cleanNumber.length === provider.phoneNumberLength && cleanNumber.startsWith('09')
}

export const formatAccountNumber = (bankId: string, accountNumber: string): string => {
  const bank = getBankById(bankId)
  if (!bank) return accountNumber
  
  const cleanNumber = accountNumber.replace(/\D/g, '')
  const format = bank.accountNumberFormat
  
  let formatted = ''
  let digitIndex = 0
  
  for (let i = 0; i < format.length; i++) {
    if (format[i] === 'X') {
      if (digitIndex < cleanNumber.length) {
        formatted += cleanNumber[digitIndex]
        digitIndex++
      } else {
        formatted += 'X'
      }
    } else {
      formatted += format[i]
    }
  }
  
  return formatted
}

export const formatPhoneNumber = (phoneNumber: string): string => {
  const cleanNumber = phoneNumber.replace(/\D/g, '')
  
  if (cleanNumber.length === 10 && cleanNumber.startsWith('09')) {
    return `${cleanNumber.slice(0, 4)}-${cleanNumber.slice(4, 7)}-${cleanNumber.slice(7)}`
  }
  
  return phoneNumber
}
