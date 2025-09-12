import React from 'react';
import ProductCard from '../components/ProductCard';
import CategoryFilter from '../components/CategoryFilter';
import CartModal from '../components/CartModal';
import BottomBar from '../components/BottomBar';
import LoadingSpinner from '../components/LoadingSpinner';

declare global {
  interface Window { Telegram?: any }
}

type Product = { _id: string; name: string; price: number; image?: string; categoryId?: { _id: string; name?: string } };
type Category = { _id: string; name: string };
type Branch = { _id: string; name: string; title?: string };

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://oshxonanew.onrender.com/api';

// Mock data for testing when backend is not available
const MOCK_CATEGORIES: Category[] = [
  { _id: '1', name: '🍛 Milliy taomlar' },
  { _id: '2', name: '🍔 Fast food' },
  { _id: '3', name: '🥤 Ichimliklar' },
  { _id: '4', name: '🍰 Shirinliklar' },
  { _id: 'promo', name: '🎉 Aksiyalar' }
];

const MOCK_BRANCHES: Branch[] = [
  { _id: 'branch1', name: 'Oshxona - Chilonzor', title: 'Chilonzor filiali' },
  { _id: 'branch2', name: 'Oshxona - Yunusobod', title: 'Yunusobod filiali' }
];

const MOCK_PRODUCTS: Product[] = [
  { _id: 'p1', name: 'Osh', price: 25000, categoryId: { _id: '1', name: 'Milliy taomlar' } },
  { _id: 'p2', name: 'Manti', price: 18000, categoryId: { _id: '1', name: 'Milliy taomlar' } },
  { _id: 'p3', name: 'Burger', price: 35000, categoryId: { _id: '2', name: 'Fast food' } },
  { _id: 'p4', name: 'Lavash', price: 22000, categoryId: { _id: '2', name: 'Fast food' } },
  { _id: 'p5', name: 'Coca Cola', price: 8000, categoryId: { _id: '3', name: 'Ichimliklar' } },
  { _id: 'p6', name: 'Tort', price: 45000, categoryId: { _id: '4', name: 'Shirinliklar' } },
  { _id: 'p7', name: 'Osh (Aksiya)', price: 20000, originalPrice: 25000, categoryId: { _id: 'promo', name: 'Aksiyalar' } },
  { _id: 'p8', name: 'Burger (Aksiya)', price: 28000, originalPrice: 35000, categoryId: { _id: 'promo', name: 'Aksiyalar' } }
];

function useInitData() {
  const [telegramId, setTelegramId] = React.useState<string | null>(null);
  React.useEffect(() => {
    try {
      const tg = window.Telegram?.WebApp;
      tg?.ready?.();
      const initDataUnsafe = tg?.initDataUnsafe;
      const id = initDataUnsafe?.user?.id ? String(initDataUnsafe.user.id) : null;
      // Fallback: allow testing via query param if not inside Telegram
      const url = new URL(window.location.href);
      const qpId = url.searchParams.get('telegramId') || url.searchParams.get('tgId');
      setTelegramId(id || qpId || 'test_user_123'); // Test fallback for development
    } catch {
      try {
        const url = new URL(window.location.href);
        const qpId = url.searchParams.get('telegramId') || url.searchParams.get('tgId');
        setTelegramId(qpId || 'test_user_123'); // Test fallback for development
      } catch {
        setTelegramId('test_user_123'); // Final fallback
      }
    }
  }, []);
  return telegramId;
}

export default function App() {
  const telegramId = useInitData();
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [activeCat, setActiveCat] = React.useState<string>('all');
  const [products, setProducts] = React.useState<Product[]>([]);
  const [cart, setCart] = React.useState<Record<string, number>>({});
  const [branch, setBranch] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const [cartModalOpen, setCartModalOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  // Load categories
  React.useEffect(() => {
    if (!telegramId) return;
    setLoading(true);
    fetch(`${API_BASE}/public/categories?telegramId=${telegramId}`)
      .then(r=>r.json())
      .then(r=>{
        const list: Category[] = (Array.isArray(r?.data) ? r.data : r?.data?.items) || [];
        setCategories(list);
      })
      .catch(()=>{
        console.log('🔄 API unavailable, using mock categories');
        setCategories(MOCK_CATEGORIES);
      })
      .finally(() => setLoading(false));
  }, [telegramId]);

  // Load branches
  React.useEffect(() => {
    if (!telegramId) return;
    fetch(`${API_BASE}/public/branches?telegramId=${telegramId}`)
      .then(r=>r.json())
      .then(r=>{
        const list: Branch[] = (Array.isArray(r?.data) ? r.data : r?.data?.items) || [];
        setBranches(list);
        if (list.length > 0 && !branch) {
          setBranch(list[0]._id);
        }
      })
      .catch(()=>{
        console.log('🔄 API unavailable, using mock branches');
        setBranches(MOCK_BRANCHES);
        if (!branch) {
          setBranch(MOCK_BRANCHES[0]._id);
        }
      });
  }, [telegramId, branch]);

  // Load products
  React.useEffect(() => {
    if (!telegramId) return;
    const qp: string[] = [];
    if (activeCat !== 'all') qp.push(`category=${encodeURIComponent(activeCat)}`);
    if (searchQuery) qp.push(`search=${encodeURIComponent(searchQuery)}`);
    const url = `${API_BASE}/public/products?telegramId=${telegramId}${qp.length?`&${qp.join('&')}`:''}`;
    fetch(url)
      .then(r=>r.json())
      .then(r=>{
        const items: Product[] = r?.data?.items || r?.data || [];
        // Filter by category if selected
        let filteredProducts = items;
        if (activeCat !== 'all') {
          filteredProducts = items.filter(p => p.categoryId?._id === activeCat);
        }
        // Filter by search query
        if (searchQuery) {
          filteredProducts = filteredProducts.filter(p => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        setProducts(filteredProducts);
      })
      .catch(()=>{
        console.log('🔄 API unavailable, using mock products');
        let filteredProducts = MOCK_PRODUCTS;
        if (activeCat !== 'all') {
          filteredProducts = MOCK_PRODUCTS.filter(p => p.categoryId?._id === activeCat);
        }
        // Filter by search query
        if (searchQuery) {
          filteredProducts = filteredProducts.filter(p => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        setProducts(filteredProducts);
      });
  }, [activeCat, searchQuery, telegramId]);

  // Savatni tozalash kategoriya o'zgarganida
  React.useEffect(() => {
    // Kategoriya o'zgarganida savatni tozalash
    setCart({});
  }, [activeCat]);

  // Auto-scroll category based on visible products
  React.useEffect(() => {
    const handleScroll = () => {
      const categoryContainer = document.querySelector('[data-category-container]') as HTMLElement;
      if (!categoryContainer) return;

      const productCards = document.querySelectorAll('[data-product-card]');
      if (productCards.length === 0) return;

      // Find the first visible product card
      let firstVisibleProduct = null;
      for (const card of productCards) {
        const rect = card.getBoundingClientRect();
        if (rect.top >= 0 && rect.top <= window.innerHeight) {
          firstVisibleProduct = card;
          break;
        }
      }

      if (firstVisibleProduct) {
        const productId = firstVisibleProduct.getAttribute('data-product-id');
        if (productId) {
          const product = products.find(p => p._id === productId);
          if (product && product.categoryId?._id && product.categoryId._id !== activeCat) {
            setActiveCat(product.categoryId._id);
            
            // Scroll to the active category button
            const activeButton = categoryContainer.querySelector(`[data-category-id="${product.categoryId._id}"]`) as HTMLElement;
            if (activeButton) {
              activeButton.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest', 
                inline: 'center' 
              });
            }
          }
        }
      }
    };

    // Throttle scroll events for better performance
    let scrollTimeout: NodeJS.Timeout;
    const throttledScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 100);
    };

    window.addEventListener('scroll', throttledScroll);
    return () => {
      window.removeEventListener('scroll', throttledScroll);
      clearTimeout(scrollTimeout);
    };
  }, [products, activeCat]);

  // Calculate totals
  const total = Object.entries(cart).reduce((sum,[pid,qty])=>{
    const p = products.find(x=>x._id===pid); return sum + (p? p.price*qty:0)
  },0);

  const itemCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  // Cart functions
  const updateCartQuantity = (productId: string, quantity: number) => {
    setCart(prev => ({
      ...prev,
      [productId]: Math.max(0, quantity)
    }));
  };

  const incrementProduct = (productId: string) => {
    const newQuantity = (cart[productId] || 0) + 1;
    updateCartQuantity(productId, newQuantity);
    
    // Modal faqat birinchi marta mahsulot qo'shilganda ochiladi
    // Keyingi safar + bosilganda modal ochilmaydi
    if (newQuantity === 1) {
      // Modal ochishni faqat birinchi marta qilamiz
      // setCartModalOpen(true); // Bu qatorni o'chirib tashladik
    }
  };

  const decrementProduct = (productId: string) => {
    updateCartQuantity(productId, (cart[productId] || 0) - 1);
  };

  // Order placement
  const placeOrder = () => {
    if (Object.keys(cart).length === 0) {
      alert('Savat bo\'sh!');
      return;
    }

    // Don't send branch - let bot handle branch selection based on order type
    const payload = { 
      telegramId, 
      items: Object.entries(cart)
        .filter(([_, quantity]) => quantity > 0)
        .map(([productId, quantity]) => ({ productId, quantity }))
    };

    try {
      const tg = window.Telegram?.WebApp;

      console.log('📤 Telegram WebApp object:', tg);
      console.log('📤 Sending data to bot:', payload);
      
      if (tg?.sendData) {
        // Send data to bot
        tg.sendData(JSON.stringify(payload));
        console.log('✅ Data sent successfully');
        
        // Close cart modal
        setCartModalOpen(false);
        
        // Show success message instead of JSON
        alert('✅ Buyurtma muvaffaqiyatli yuborildi! Bot orqali davom eting.');
        
        // Close WebApp after a short delay
        setTimeout(() => {
          if (tg?.close) {
            tg.close();
          } else if (tg?.MainButton?.hide) {
            tg.MainButton.hide();
          }
        }, 1000);
      } else {
        // Fallback for testing outside Telegram
        console.log('📤 Not in Telegram, showing fallback');
        console.log('📤 Would send to bot:', payload);
        
        // Show user-friendly message instead of JSON
        alert('✅ Test rejimi: Buyurtma ma\'lumotlari bot\'ga yuborildi!\n\nBot orqali buyurtmani davom ettiring.');
      }
    } catch (error) {
      console.error('❌ Error sending data:', error);
      alert('❌ Xatolik yuz berdi. Qaytadan urinib ko\'ring.');
    }
  };

  if (loading) {
    return (
      <div style={{ fontFamily:'system-ui, sans-serif', padding:12 }}>
        <h3>🍽️ Katalog</h3>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div style={{ fontFamily:'system-ui, sans-serif', padding:12, paddingBottom: itemCount > 0 ? 80 : 12 }}>
      <h3>🍽️ Katalog</h3>
      
      {/* Branch info */}
      {branch && branches.length > 0 && (
        <div style={{ marginBottom: 12, padding: 8, backgroundColor: '#f0f8ff', borderRadius: 8, fontSize: 14 }}>
          🏪 <strong>{branches.find(b => b._id === branch)?.name || branches.find(b => b._id === branch)?.title}</strong>
        </div>
      )}

      {/* Search Input */}
      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder="🔍 Mahsulot qidirish..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '16px',
            outline: 'none'
          }}
        />
      </div>

      {/* Category Filter - Sticky */}
      <div style={{ 
        position: 'sticky', 
        top: 0, 
        backgroundColor: '#fff', 
        zIndex: 100, 
        padding: '8px 0',
        marginBottom: 12
      }}>
        <CategoryFilter 
          categories={categories}
          activeCategory={activeCat}
          onCategoryChange={setActiveCat}
        />
      </div>

      {/* Products grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12 }}>
        {products.map(product => (
          <ProductCard
            key={product._id}
            product={product}
            quantity={cart[product._id] || 0}
            onIncrement={() => incrementProduct(product._id)}
            onDecrement={() => decrementProduct(product._id)}
          />
        ))}
      </div>

      {/* Empty state */}
      {products.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <div>Mahsulotlar topilmadi</div>
        </div>
      )}

      {/* Bottom Bar */}
      <BottomBar
        total={total}
        itemCount={itemCount}
        onOpenCart={() => setCartModalOpen(true)}
        onPlaceOrder={placeOrder}
      />

      {/* Cart Modal */}
      <CartModal
        isOpen={cartModalOpen}
        onClose={() => setCartModalOpen(false)}
        cart={cart}
        products={products}
        onUpdateQuantity={updateCartQuantity}
        onPlaceOrder={placeOrder}
        total={total}
      />
    </div>
  );
}