/**
 * Location Data Validator
 * Joylashuv ma'lumotlari validatori
 */

class LocationValidator {
    /**
     * Koordinatalarni tekshirish
     * @param {number} latitude - kenglik
     * @param {number} longitude - uzunlik
     * @returns {Object} - validation result
     */
    static validateCoordinates(latitude, longitude) {
      try {
        if (latitude === null || latitude === undefined || 
            longitude === null || longitude === undefined) {
          return { isValid: false, error: 'Koordinatalar kiritilmagan' };
        }
  
        const lat = Number(latitude);
        const lon = Number(longitude);
  
        if (isNaN(lat) || isNaN(lon)) {
          return { isValid: false, error: 'Koordinatalar raqam bo\'lishi kerak' };
        }
  
        // Valid latitude range: -90 to 90
        if (lat < -90 || lat > 90) {
          return { isValid: false, error: 'Kenglik -90 va 90 oralig\'ida bo\'lishi kerak' };
        }
  
        // Valid longitude range: -180 to 180  
        if (lon < -180 || lon > 180) {
          return { isValid: false, error: 'Uzunlik -180 va 180 oralig\'ida bo\'lishi kerak' };
        }
  
        // Approximate Uzbekistan bounds check
        const uzbekistanBounds = {
          north: 45.6,
          south: 37.2,
          east: 73.2,
          west: 56.0
        };
  
        if (lat < uzbekistanBounds.south || lat > uzbekistanBounds.north ||
            lon < uzbekistanBounds.west || lon > uzbekistanBounds.east) {
          return { 
            isValid: false, 
            error: 'Koordinatalar O\'zbekiston hududidan tashqarida',
            warning: true // This is a warning, not a strict error
          };
        }
  
        return {
          isValid: true,
          latitude: lat,
          longitude: lon,
          original: { latitude, longitude }
        };
      } catch (error) {
        console.error('Coordinates validation error:', error);
        return { isValid: false, error: 'Koordinatalarni tekshirishda xatolik' };
      }
    }
  }
  
  module.exports = LocationValidator;