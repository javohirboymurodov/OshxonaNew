const axios = require('axios');

class GeoService {
  // Ikki nuqta orasidagi masofani hisoblash (Haversine formula)
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }
  
  static toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }
  
  // Koordinatadan manzil olish (Reverse Geocoding)
  static async getAddressFromCoordinates(latitude, longitude) {
    try {
      if (!process.env.YANDEX_MAPS_API_KEY) {
        return `Lat: ${latitude}, Lon: ${longitude}`;
      }
      
      const response = await axios.get(
        `https://geocode-maps.yandex.ru/1.x/?format=json&geocode=${longitude},${latitude}&apikey=${process.env.YANDEX_MAPS_API_KEY}`
      );
      
      const geoObject = response.data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
      
      if (geoObject) {
        return geoObject.metaDataProperty.GeocoderMetaData.text;
      }
      
      return `Lat: ${latitude}, Lon: ${longitude}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `Lat: ${latitude}, Lon: ${longitude}`;
    }
  }
  
  // Manzildan koordinata olish (Geocoding)
  static async getCoordinatesFromAddress(address) {
    try {
      if (!process.env.YANDEX_MAPS_API_KEY) {
        return null;
      }
      
      const response = await axios.get(
        `https://geocode-maps.yandex.ru/1.x/?format=json&geocode=${encodeURIComponent(address)}&apikey=${process.env.YANDEX_MAPS_API_KEY}`
      );
      
      const geoObject = response.data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
      
      if (geoObject) {
        const coordinates = geoObject.Point.pos.split(' ');
        return {
          latitude: parseFloat(coordinates[1]),
          longitude: parseFloat(coordinates[0])
        };
      }
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }
  
  // Xarita linkini yaratish
  static generateMapLink(latitude, longitude, zoom = 15) {
    return `https://yandex.ru/maps/?ll=${longitude},${latitude}&z=${zoom}&l=map&pt=${longitude},${latitude}`;
  }
  
  // Restoran atrofidagi doirani tekshirish
  static isWithinDeliveryRadius(userLat, userLon, maxRadius = 15) {
    const restaurantLat = parseFloat(process.env.DEFAULT_RESTAURANT_LAT);
    const restaurantLon = parseFloat(process.env.DEFAULT_RESTAURANT_LON);
    
    const distance = this.calculateDistance(restaurantLat, restaurantLon, userLat, userLon);
    
    return {
      isWithinRadius: distance <= maxRadius,
      distance: Math.round(distance * 100) / 100,
      maxRadius
    };
  }
}

module.exports = GeoService;