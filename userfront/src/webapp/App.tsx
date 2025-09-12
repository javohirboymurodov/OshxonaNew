import React from 'react';

declare global {
  interface Window { Telegram?: any }
}

type Product = { _id: string; name: string; price: number; originalPrice?: number; image?: string; categoryId?: { _id: string; name?: string } };
type Category = { _id: string; name: string };
type Branch = { _id: string; name: string; title?: string };

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'https://oshxonanew.onrender.com/api';

// Loading Spinner Component
function LoadingSpinner() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40
    }}>
      <div style={{
        width: 40,
        height: 40,
        border: '3px solid #f3f3f3',
        borderTop: '3px solid #1677ff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Product Card Component
function ProductCard({ product, quantity, onIncrement, onDecrement }: {
  product: Product;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div 
      data-product-card
      data-product-id={product._id}
      data-category-id={product.categoryId?._id}
      style={{ 
        border:'1px solid #eee', 
        borderRadius:10, 
        padding:10,
        backgroundColor: '#fff'
      }}
    >
      {product.image && (
        <img 
          src={`https://oshxonanew.onrender.com${product.image}`} 
          alt={product.name}
          style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }}
        />
      )}
      <div style={{ fontWeight:600, fontSize: 14 }}>{product.name}</div>
      <div style={{ margin:'4px 0', fontSize: 12 }}>
        {product.originalPrice && product.originalPrice > product.price ? (
          <div>
            <span style={{ color:'#ff4d4f', textDecoration: 'line-through', fontSize: 10 }}>
              {product.originalPrice.toLocaleString()} so'm
            </span>
            <br />
            <span style={{ color:'#52c41a', fontWeight: 600 }}>
              {product.price.toLocaleString()} so'm
            </span>
            <span style={{ color:'#ff4d4f', fontSize: 10, marginLeft: 4 }}>
              -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
            </span>
          </div>
        ) : (
          <span style={{ color:'#666' }}>{product.price.toLocaleString()} so'm</span>
        )}
      </div>
      <div style={{ display:'flex', gap:6, alignItems:'center', justifyContent:'center', marginTop: 8 }}>
        <button 
          onClick={onDecrement} 
          style={{ 
            width: 30, 
            height: 30, 
            borderRadius: '50%', 
            border: '1px solid #ddd', 
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            cursor: 'pointer'
          }}
        >
          −
        </button>
        <div style={{ minWidth: 30, textAlign: 'center', fontWeight: 600 }}>{quantity}</div>
        <button 
          onClick={onIncrement} 
          style={{ 
            width: 30, 
            height: 30, 
            borderRadius: '50%', 
            border: '1px solid #1677ff', 
            background: '#1677ff',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            cursor: 'pointer'
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

// Category Filter Component
function CategoryFilter({ categories, activeCategory, onCategoryChange }: {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}) {
  const categoryContainerRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll active category into view
  React.useEffect(() => {
    if (categoryContainerRef.current) {
      const activeButton = categoryContainerRef.current.querySelector(`[data-category-id="${activeCategory}"]`) as HTMLElement;
      if (activeButton) {
        activeButton.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest', 
          inline: 'center' 
        });
      }
    }
  }, [activeCategory]);

  return (
    <div 
      ref={categoryContainerRef}
      data-category-container
      style={{ 
        display:'flex', 
        gap:8, 
        overflowX:'auto', 
        marginBottom:16, 
        paddingBottom: 4,
        scrollBehavior: 'smooth'
      }}
    >
      <button 
        data-category-id="all"
        onClick={() => onCategoryChange('all')} 
        style={{ 
          padding:'8px 12px', 
          borderRadius:20, 
          border:'1px solid #ddd', 
          background: activeCategory==='all'?'#1677ff':'#fff', 
          color:activeCategory==='all'?'#fff':'#333',
          fontSize: 14,
          fontWeight: activeCategory==='all' ? 600 : 400,
          whiteSpace: 'nowrap',
          cursor: 'pointer'
        }}
      >
        Barchasi
      </button>
      {categories.map(c => (
        <button 
          key={c._id} 
          data-category-id={c._id}
          onClick={() => onCategoryChange(c._id)} 
          style={{ 
            padding:'8px 12px', 
            borderRadius:20, 
            border:'1px solid #ddd', 
            background: activeCategory===c._id?'#1677ff':'#fff', 
            color:activeCategory===c._id?'#fff':'#333',
            fontSize: 14,
            fontWeight: activeCategory===c._id ? 600 : 400,
            whiteSpace: 'nowrap',
            cursor: 'pointer'
          }}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}

// Cart Modal Component
function CartModal({ isOpen, onClose, cart, products, onUpdateQuantity, onPlaceOrder, total }: {
  isOpen: boolean;
  onClose: () => void;
  cart: Record<string, number>;
  products: Product[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onPlaceOrder: () => void;
  total: number;
}) {
  if (!isOpen) return null;

  const cartItems = Object.entries(cart)
    .filter(([_, quantity]) => quantity > 0)
    .map(([productId, quantity]) => ({
      product: products.find(p => p._id === productId)!,
      quantity
    }))
    .filter(item => item.product);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'flex-end'
    }}>
      <div style={{
        width: '100%',
        maxHeight: '80vh',
        backgroundColor: '#fff',
        borderRadius: '16px 16px 0 0',
        padding: 16,
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>🧺 Savat</h3>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        {/* Cart Items */}
        {cartItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🛒</div>
            <div>Savat bo'sh</div>
          </div>
        ) : (
          <div style={{ marginBottom: 20 }}>
            {cartItems.map(({ product, quantity }) => (
              <div key={product._id} style={{
                display: 'flex',
                alignItems: 'center',
                padding: 12,
                borderBottom: '1px solid #eee'
              }}>
                {product.image && (
                  <img 
                    src={`https://oshxonanew.onrender.com${product.image}`}
                    alt={product.name}
                    style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 8, marginRight: 12 }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{product.name}</div>
                  <div style={{ color: '#666', fontSize: 12 }}>{product.price.toLocaleString()} so'm</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => onUpdateQuantity(product._id, Math.max(0, quantity - 1))}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: '1px solid #ddd',
                      background: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    −
                  </button>
                  <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 600 }}>{quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(product._id, quantity + 1)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: '1px solid #1677ff',
                      background: '#1677ff',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    +
                  </button>
                </div>
                <div style={{ marginLeft: 12, fontWeight: 600, minWidth: 80, textAlign: 'right' }}>
                  {(product.price * quantity).toLocaleString()} so'm
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {cartItems.length > 0 && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 0',
              borderTop: '2px solid #f0f0f0',
              marginBottom: 16
            }}>
              <div style={{ fontSize: 18, fontWeight: 600 }}>Jami:</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1677ff' }}>
                {total.toLocaleString()} so'm
              </div>
            </div>
            <button
              onClick={onPlaceOrder}
              style={{
                width: '100%',
                background: '#52c41a',
                color: '#fff',
                padding: '14px 20px',
                border: 'none',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Buyurtma berish
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Bottom Bar Component
function BottomBar({ total, itemCount, onOpenCart, onPlaceOrder }: {
  total: number;
  itemCount: number;
  onOpenCart: () => void;
  onPlaceOrder: () => void;
}) {
  if (itemCount === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      left: 0,
      right: 0,
      bottom: 0,
      padding: 16,
      background: '#fff',
      borderTop: '1px solid #eee',
      display: 'flex',
      gap: 12,
      alignItems: 'center',
      boxShadow: '0 -2px 10px rgba(0,0,0,0.1)'
    }}>
      <button
        onClick={onOpenCart}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px 16px',
          border: '1px solid #1677ff',
          background: '#fff',
          color: '#1677ff',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        🧺 Savat ({itemCount})
      </button>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        minWidth: 100
      }}>
        <div style={{ fontSize: 12, color: '#666' }}>Jami</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1677ff' }}>
          {total.toLocaleString()} so'm
        </div>
      </div>
      <button
        onClick={onPlaceOrder}
        style={{
          flex: 1,
          background: '#52c41a',
          color: '#fff',
          padding: '12px 16px',
          border: 'none',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        Buyurtma berish
      </button>
    </div>
  );
}

// Error Display Component
function ErrorDisplay({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: 40,
      color: '#666',
      backgroundColor: '#fff3f3',
      borderRadius: 8,
      border: '1px solid #ffcdd2'
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <div style={{ marginBottom: 16 }}>{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1677ff',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer'
          }}
        >
          Qaytadan urinish
        </button>
      )}
    </div>
  );
}

// Main App Component
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
      setTelegramId(id || qpId || 'test_user_123');
    } catch {
      try {
        const url = new URL(window.location.href);
        const qpId = url.searchParams.get('telegramId') || url.searchParams.get('tgId');
        setTelegramId(qpId || 'test_user_123');
      } catch {
        setTelegramId('test_user_123');
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
  const [scrollTimeout, setScrollTimeout] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string>('');

  // Load categories
  React.useEffect(() => {
    if (!telegramId) return;
    
    const loadCategories = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await fetch(`${API_BASE}/public/categories?telegramId=${telegramId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Kategoriyalarni olishda xatolik');
        }
        
        const list: Category[] = Array.isArray(data.data) ? data.data : [];
        setCategories(list);
        console.log('✅ Categories loaded:', list.length);
      } catch (error) {
        console.error('❌ Categories load error:', error);
        setError('Kategoriyalarni yuklab bo\'lmadi. Internetni tekshiring.');
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, [telegramId]);

  // Load branches
  React.useEffect(() => {
    if (!telegramId) return;
    
    const loadBranches = async () => {
      try {
        const response = await fetch(`${API_BASE}/public/branches?telegramId=${telegramId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Filiallarni olishda xatolik');
        }
        
        const list: Branch[] = Array.isArray(data.data) ? data.data : [];
        setBranches(list);
        
        if (list.length > 0 && !branch) {
          setBranch(list[0]._id);
        }
        
        console.log('✅ Branches loaded:', list.length);
      } catch (error) {
        console.error('❌ Branches load error:', error);
        // Don't show error for branches as it's not critical
      }
    };

    loadBranches();
  }, [telegramId, branch]);

  // Load products
  React.useEffect(() => {
    if (!telegramId) return;
    
    const loadProducts = async () => {
      try {
        const qp: string[] = [];
        if (activeCat !== 'all') qp.push(`category=${encodeURIComponent(activeCat)}`);
        if (searchQuery) qp.push(`search=${encodeURIComponent(searchQuery)}`);
        
        const url = `${API_BASE}/public/products?telegramId=${telegramId}${qp.length ? `&${qp.join('&')}` : ''}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Mahsulotlarni olishda xatolik');
        }
        
        const items: Product[] = data.data?.items || data.data || [];
        setProducts(items);
        
        console.log('✅ Products loaded:', {
          total: items.length,
          category: activeCat,
          search: searchQuery
        });
      } catch (error) {
        console.error('❌ Products load error:', error);
        setProducts([]);
      }
    };

    loadProducts();
  }, [activeCat, searchQuery, telegramId]);

  // Improved auto-scroll category based on visible products
  React.useEffect(() => {
    if (activeCat !== 'all') return; // Only auto-scroll when showing all products

    const handleScroll = () => {
      // Clear existing timeout
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      // Set new timeout for debouncing
      const newTimeout = setTimeout(() => {
        const productCards = document.querySelectorAll('[data-product-card]');
        if (productCards.length === 0) return;

        // Find the first visible product card in viewport
        let firstVisibleProduct = null;
        const viewportTop = window.scrollY;
        const viewportCenter = viewportTop + window.innerHeight / 3; // Use upper third for better UX

        for (const card of productCards) {
          const rect = card.getBoundingClientRect();
          const cardTop = rect.top + viewportTop;
          
          if (cardTop <= viewportCenter && (cardTop + rect.height) > viewportTop) {
            firstVisibleProduct = card;
            break;
          }
        }

        if (firstVisibleProduct) {
          const categoryId = firstVisibleProduct.getAttribute('data-category-id');
          if (categoryId && categoryId !== activeCat) {
            setActiveCat(categoryId);
          }
        }
      }, 150); // Debounce for 150ms

      setScrollTimeout(newTimeout);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [activeCat, scrollTimeout]);

  // Calculate totals
  const total = Object.entries(cart).reduce((sum, [pid, qty]) => {
    const p = products.find(x => x._id === pid); 
    return sum + (p ? p.price * qty : 0);
  }, 0);

  const itemCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  // Cart functions - FIXED: Never clear cart, always accumulate
  const updateCartQuantity = (productId: string, quantity: number) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (quantity <= 0) {
        delete newCart[productId];
      } else {
        newCart[productId] = quantity;
      }
      return newCart;
    });
  };

  const incrementProduct = (productId: string) => {
    setCart(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1
    }));
  };

  const decrementProduct = (productId: string) => {
    setCart(prev => {
      const newQuantity = (prev[productId] || 0) - 1;
      if (newQuantity <= 0) {
        const newCart = { ...prev };
        delete newCart[productId];
        return newCart;
      }
      return {
        ...prev,
        [productId]: newQuantity
      };
    });
  };

  // Order placement - FIXED: Don't clear cart unless order is successful
  const placeOrder = () => {
    const cartEntries = Object.entries(cart).filter(([_, quantity]) => quantity > 0);
    
    if (cartEntries.length === 0) {
      alert('Savat bo\'sh!');
      return;
    }

    const payload = { 
      telegramId, 
      items: cartEntries.map(([productId, quantity]) => ({ productId, quantity }))
    };

    try {
      const tg = window.Telegram?.WebApp;

      console.log('📤 Sending data to bot:', payload);
      console.log('📤 Cart items:', cartEntries);
      
      if (tg?.sendData) {
        // Send data to bot
        tg.sendData(JSON.stringify(payload));
        console.log('✅ Data sent successfully to Telegram bot');
        
        // Close cart modal
        setCartModalOpen(false);
        
        // Show success message
        alert('✅ Buyurtma muvaffaqiyatli botga yuborildi! Bot orqali davom eting.');
        
        // Only clear cart after successful send
        setCart({});
        
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
        
        // In test mode, show data but don't clear cart
        alert(`✅ Test rejimi: Buyurtma ma'lumotlari:\n\nMahsulotlar: ${cartEntries.length} ta\nJami: ${total.toLocaleString()} so'm\n\nBot orqali buyurtmani davom ettiring.`);
      }
    } catch (error) {
      console.error('❌ Error sending data:', error);
      alert('❌ Xatolik yuz berdi. Qaytadan urinib ko\'ring.');
    }
  };

  // Retry function for error cases
  const retryLoad = () => {
    setError('');
    setLoading(true);
    // Trigger reload by changing telegramId state
    const currentId = telegramId;
    setTelegramId(null);
    setTimeout(() => setTelegramId(currentId), 100);
  };

  if (loading) {
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif', padding: 12 }}>
        <h3>🍽️ Katalog</h3>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif', padding: 12 }}>
        <h3>🍽️ Katalog</h3>
        <ErrorDisplay message={error} onRetry={retryLoad} />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 12, paddingBottom: itemCount > 0 ? 80 : 12 }}>
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
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Category Filter - Sticky */}
      {categories.length > 0 && (
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
            onCategoryChange={(categoryId) => {
              setActiveCat(categoryId);
              // Scroll to top when manually selecting category
              if (categoryId !== 'all') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          />
        </div>
      )}

      {/* Products grouped by category for better display */}
      {activeCat === 'all' ? (
        // Show all products grouped by category
        <div>
          {categories.map(category => {
            const categoryProducts = products.filter(p => p.categoryId?._id === category._id);
            if (categoryProducts.length === 0) return null;
            
            return (
              <div key={category._id} style={{ marginBottom: 32 }}>
                <h4 style={{ 
                  margin: '0 0 16px 0', 
                  padding: '8px 12px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 600
                }}>
                  {category.name}
                </h4>
                <div style={{ 
                  display:'grid', 
                  gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', 
                  gap:12,
                  marginBottom: 16
                }}>
                  {categoryProducts.map(product => (
                    <ProductCard
                      key={product._id}
                      product={product}
                      quantity={cart[product._id] || 0}
                      onIncrement={() => incrementProduct(product._id)}
                      onDecrement={() => decrementProduct(product._id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Show products for selected category only
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
      )}

      {/* Empty state */}
      {products.length === 0 && categories.length > 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <div>
            {searchQuery ? `"${searchQuery}" bo'yicha mahsulotlar topilmadi` : 'Bu kategoriyada mahsulotlar topilmadi'}
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                marginTop: 12,
                padding: '8px 16px',
                backgroundColor: '#1677ff',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer'
              }}
            >
              Qidiruvni tozalash
            </button>
          )}
        </div>
      )}

      {/* No categories loaded */}
      {categories.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>
          <div>Kategoriyalar yuklanmadi</div>
          <button
            onClick={retryLoad}
            style={{
              marginTop: 12,
              padding: '8px 16px',
              backgroundColor: '#1677ff',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer'
            }}
          >
            Qaytadan yuklash
          </button>
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