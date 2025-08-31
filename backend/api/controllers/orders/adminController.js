const { Order, Branch } = require('../../../models');
const DeliveryService = require('../../../services/deliveryService');

/**
 * Orders Admin Controller
 * Admin buyurtma operatsiyalari boshqaruvi
 */

// GET /api/orders
async function listOrders(req, res) {
  try {
    const Helpers = require('../../../utils/helpers');
    const { page, limit, skip } = Helpers.getPaginationParams(req.query);
    const { status, orderType, dateFrom, dateTo, search, courier, branch: branchFilter } = req.query;

    let query = {};
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;
    if (branchId) query.branch = branchId;
    if (req.user.role === 'superadmin' && branchFilter) query.branch = branchFilter;
    if (status) query.status = status;
    if (orderType) query.orderType = orderType;
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }
    
    if (search && String(search).trim().length > 0) {
      const text = String(search).trim();
      const regex = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { orderId: { $regex: regex } },
        { orderNumber: { $regex: regex } },
        { 'customerInfo.name': { $regex: regex } },
        { 'customerInfo.phone': { $regex: regex } },
      ];
    }

    let orders = await Order.find(query)
      .populate('user', 'firstName lastName phone')
      .populate('deliveryInfo.courier', 'firstName lastName phone courierInfo')
      .populate('items.product', 'name price')
      .populate('branch', 'name title address')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    if (courier === 'assigned') query['deliveryInfo.courier'] = { $ne: null };
    else if (courier === 'unassigned') query['deliveryInfo.courier'] = { $in: [null, undefined] };

    const total = await Order.countDocuments(query);

    // Enrich orders with delivery metadata
    try {
      let origin = null;
      if (req.user.role !== 'superadmin' && req.user.branch) {
        const branch = await Branch.findById(req.user.branch);
        if (branch?.address?.coordinates?.latitude && branch?.address?.coordinates?.longitude) {
          origin = { 
            lat: branch.address.coordinates.latitude, 
            lon: branch.address.coordinates.longitude 
          };
        }
      }
      if (!origin && process.env.DEFAULT_RESTAURANT_LAT && process.env.DEFAULT_RESTAURANT_LON) {
        origin = { 
          lat: parseFloat(process.env.DEFAULT_RESTAURANT_LAT), 
          lon: parseFloat(process.env.DEFAULT_RESTAURANT_LON) 
        };
      }
      
      const enriched = [];
      for (const o of orders) {
        const obj = o.toObject();
        if (obj.orderType === 'delivery' && obj.deliveryInfo?.location?.latitude && obj.deliveryInfo?.location?.longitude) {
          const calc = await DeliveryService.calculateDeliveryTime(
            { 
              latitude: obj.deliveryInfo.location.latitude, 
              longitude: obj.deliveryInfo.location.longitude 
            }, 
            obj.items, 
            origin
          );
          const fee = await DeliveryService.calculateDeliveryFee(
            { 
              latitude: obj.deliveryInfo.location.latitude, 
              longitude: obj.deliveryInfo.location.longitude 
            }, 
            obj.total ?? obj.totalAmount ?? 0
          );
          obj.deliveryMeta = {
            distanceKm: calc?.distance ?? null,
            etaMinutes: calc?.totalTime ?? null,
            preparationMinutes: calc?.preparationTime ?? null,
            deliveryMinutes: calc?.deliveryTime ?? null,
            deliveryFee: fee?.fee ?? null,
            isFreeDelivery: fee?.isFreeDelivery ?? false
          };
        }
        enriched.push(obj);
      }
      orders = enriched;
    } catch (enrichErr) {
      console.error('Order enrichment error:', enrichErr);
    }

    res.json({ 
      success: true, 
      data: { 
        orders, 
        pagination: Helpers.buildPagination(total, page, limit) 
      } 
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Buyurtmalarni olishda xatolik!' 
    });
  }
}

// GET /api/orders/:id
async function getOrder(req, res) {
  try {
    const { id } = req.params;
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;
    const query = { _id: id };
    if (branchId) query.branch = branchId;
    
    const orderDoc = await Order.findOne(query)
      .populate('user', 'firstName lastName phone address')
      .populate('deliveryInfo.courier', 'firstName lastName phone courierInfo')
      .populate('items.product', 'name price description')
      .populate('branch', 'name title address');
      
    if (!orderDoc) {
      return res.status(404).json({ 
        success: false, 
        message: 'Buyurtma topilmadi!' 
      });
    }
    
    let order = orderDoc.toObject();
    
    // Add delivery metadata if it's a delivery order
    try {
      if (order.orderType === 'delivery' && order.deliveryInfo?.location?.latitude && order.deliveryInfo?.location?.longitude) {
        let origin = null;
        if (branchId) {
          const branch = await Branch.findById(branchId);
          if (branch?.address?.coordinates?.latitude && branch?.address?.coordinates?.longitude) {
            origin = { 
              lat: branch.address.coordinates.latitude, 
              lon: branch.address.coordinates.longitude 
            };
          }
        }
        if (!origin && process.env.DEFAULT_RESTAURANT_LAT && process.env.DEFAULT_RESTAURANT_LON) {
          origin = { 
            lat: parseFloat(process.env.DEFAULT_RESTAURANT_LAT), 
            lon: parseFloat(process.env.DEFAULT_RESTAURANT_LON) 
          };
        }
        
        const calc = await DeliveryService.calculateDeliveryTime(
          { 
            latitude: order.deliveryInfo.location.latitude, 
            longitude: order.deliveryInfo.location.longitude 
          }, 
          order.items, 
          origin
        );
        const fee = await DeliveryService.calculateDeliveryFee(
          { 
            latitude: order.deliveryInfo.location.latitude, 
            longitude: order.deliveryInfo.location.longitude 
          }, 
          order.total ?? order.totalAmount ?? 0
        );
        
        order.deliveryMeta = {
          distanceKm: calc?.distance ?? null,
          etaMinutes: calc?.totalTime ?? null,
          preparationMinutes: calc?.preparationTime ?? null,
          deliveryMinutes: calc?.deliveryTime ?? null,
          deliveryFee: fee?.fee ?? null,
          isFreeDelivery: fee?.isFreeDelivery ?? false
        };
      }
    } catch (e) {
      console.error('Delivery metadata calculation error:', e);
    }
    
    res.json({ 
      success: true, 
      data: { order } 
    });
  } catch (error) {
    console.error('Get single order error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Buyurtma ma\'lumotlarini olishda xatolik!' 
    });
  }
}

// GET /api/admin/orders/:id
async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;
    const query = { _id: id };
    if (branchId) query.branch = branchId;
    
    const orderDoc = await Order.findOne(query)
      .populate('user', 'firstName lastName phone address')
      .populate('deliveryInfo.courier', 'firstName lastName phone courierInfo')
      .populate('items.product', 'name price description')
      .populate('branch', 'name title address');
      
    if (!orderDoc) {
      return res.status(404).json({ 
        success: false, 
        message: 'Buyurtma topilmadi!' 
      });
    }
    
    let order = orderDoc.toObject();
    
    // Add delivery metadata if it's a delivery order
    try {
      if (order.orderType === 'delivery' && order.deliveryInfo?.location?.latitude && order.deliveryInfo?.location?.longitude) {
        let origin = null;
        if (branchId) {
          const Branch = require('../../../models/Branch');
          const branch = await Branch.findById(branchId);
          if (branch?.address?.coordinates?.latitude && branch?.address?.coordinates?.longitude) {
            origin = { 
              lat: branch.address.coordinates.latitude, 
              lon: branch.address.coordinates.longitude 
            };
          }
        }
        if (!origin && process.env.DEFAULT_RESTAURANT_LAT && process.env.DEFAULT_RESTAURANT_LON) {
          origin = { 
            lat: parseFloat(process.env.DEFAULT_RESTAURANT_LAT), 
            lon: parseFloat(process.env.DEFAULT_RESTAURANT_LON) 
          };
        }
        
        const calc = await DeliveryService.calculateDeliveryTime(
          { 
            latitude: order.deliveryInfo.location.latitude, 
            longitude: order.deliveryInfo.location.longitude 
          }, 
          order.items, 
          origin
        );
        const fee = await DeliveryService.calculateDeliveryFee(
          { 
            latitude: order.deliveryInfo.location.latitude, 
            longitude: order.deliveryInfo.location.longitude 
          }, 
          order.total ?? order.totalAmount ?? 0
        );
        
        order.deliveryMeta = {
          distanceKm: calc?.distance ?? null,
          etaMinutes: calc?.totalTime ?? null,
          preparationMinutes: calc?.preparationTime ?? null,
          deliveryMinutes: calc?.deliveryTime ?? null,
          deliveryFee: fee?.fee ?? null,
          isFreeDelivery: fee?.isFreeDelivery ?? false
        };
      }
    } catch (e) {
      console.error('Delivery metadata calculation error:', e);
    }
    
    res.json({ 
      success: true, 
      data: { order } 
    });
  } catch (error) {
    console.error('Get single order error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Buyurtma ma\'lumotlarini olishda xatolik!' 
    });
  }
}

module.exports = {
  listOrders,
  getOrder,
  getOrderById
};
