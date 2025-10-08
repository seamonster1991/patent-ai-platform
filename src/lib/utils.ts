import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  if (!date) return ''
  
  let dateToFormat: Date
  
  // KIPRIS API의 YYYYMMDD 형식 처리 (예: "20060616")
  if (typeof date === 'string' && /^\d{8}$/.test(date)) {
    const year = date.substring(0, 4)
    const month = date.substring(4, 6)
    const day = date.substring(6, 8)
    dateToFormat = new Date(`${year}-${month}-${day}`)
  } else {
    dateToFormat = new Date(date)
  }
  
  // 유효하지 않은 날짜인 경우 빈 문자열 반환
  if (isNaN(dateToFormat.getTime())) {
    return ''
  }
  
  return dateToFormat.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateSimple(date: string | Date) {
  if (!date) return ''
  
  // 이미 YYYYMMDD 형식인 경우 그대로 반환
  if (typeof date === 'string' && /^\d{8}$/.test(date)) {
    return date
  }
  
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  
  return `${year}${month}${day}`
}

export function formatDateTime(date: string | Date) {
  const d = new Date(date)
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function formatNumber(num: number) {
  return new Intl.NumberFormat('ko-KR').format(num)
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function validateEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePassword(password: string) {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
  return passwordRegex.test(password)
}

export function generateId() {
  // 서버/클라이언트 안전한 ID 생성
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0].toString(36);
  }
  // 폴백: 타임스탬프 기반 ID
  return Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}