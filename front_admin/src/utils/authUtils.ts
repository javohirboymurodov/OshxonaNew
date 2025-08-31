/**
 * Authentication Utilities
 * Auth bilan bog'liq utility functions
 */

export const AuthUtils = {
  /**
   * JWT token formatini tekshirish
   */
  isValidJWTFormat(token: string): boolean {
    try {
      const parts = token.split('.');
      return parts.length === 3 && parts.every(part => part.length > 0);
    } catch {
      return false;
    }
  },


  /**
   * JWT token ni decode qilish (faqat payload)
   */
  decodeJWTPayload(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = JSON.parse(atob(parts[1]));
      return payload;
    } catch {
      return null;
    }
  },

  /**
   * Token expire bo'lganini tekshirish
   */
  isTokenExpired(token: string): boolean {
    try {
      const payload = this.decodeJWTPayload(token);
      if (!payload || !payload.exp) return true;
      
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  },

  /**
   * Buzilgan tokenlarni tozalash
   */
  clearCorruptedTokens(): void {
    const token = localStorage.getItem('token');
    
    if (token) {
      if (!this.isValidJWTFormat(token)) {
        console.warn('🔧 Clearing malformed token...');
        localStorage.removeItem('token');
        return;
      }
      
      if (this.isTokenExpired(token)) {
        console.warn('🔧 Clearing expired token...');
        localStorage.removeItem('token');
        return;
      }
    }
  },

  /**
   * Auth state ni to'liq reset qilish
   */
  resetAuthState(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastLoginTime');
    console.log('🔧 Auth state cleared');
  },

  /**
   * Token vaqtini tekshirish (5 daqiqa qolsa refresh)
   */
  shouldRefreshToken(token: string): boolean {
    try {
      const payload = this.decodeJWTPayload(token);
      if (!payload || !payload.exp) return false;
      
      const currentTime = Math.floor(Date.now() / 1000);
      const timeLeft = payload.exp - currentTime;
      
      // 5 daqiqa (300 second) qolsa refresh qilish
      return timeLeft < 300 && timeLeft > 0;
    } catch {
      return false;
    }
  }
};

export default AuthUtils;
