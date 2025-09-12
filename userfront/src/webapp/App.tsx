import React from 'react';
import { Product, Category, Branch } from '../types';
import { API_BASE } from '../constants';
import { useInitData } from '../hooks/useInitData';

// Components
import AppHeader from '../components/AppHeader';
import BranchInfo from '../components/BranchInfo';
import SearchBar from '../components/SearchBar';
import CategoryFilter from '../components/CategoryFilter';
import ProductGrid from '../components/ProductGrid';
import CartModal from '../components/CartModal';
import BottomBar from '../components/BottomBar';
import LoadingSpinner from '../components/LoadingSpinner';

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
  const [error, setError] = React.useState<string | null>(null);

  // Load categories
  React.useEffect(() => {
    if (!telegramId) return;
    setLoading(true);
    setError(null);
    
    fetch(`${API_BASE}/public/categories?telegramId=${telegramId}`)
      .then(r=>r.json())
      .then(r=>{
        const list: Category[] = (Array.isArray(r?.data) ? r.data : r?.data?.items) || [];
        setCategories(list);
        if (list.length === 0) {
          setError('Kategoriyalar topilmadi');
        }
      })
      .catch((error)=>{
        console.error('❌ Categories API error:', error);
        setError('Kategoriyalarni yuklashda xatolik');
        setCategories([]);
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
      .catch((error)=>{
        console.error('❌ Branches API error:', error);
        setBranches([]);
      });
  }, [telegramId, branch]);

  // Load products - PROFESSIONAL YECHIM
  React.useEffect(() => {
    if (!telegramId) return;
    
    // Barcha mahsulotlarni yuklash, kategoriya filter emas
    const url = `${API_BASE}/public/products?telegramId=${telegramId}`;
    fetch(url)
      .then(r=>r.json())
      .then(r=>{
        const items: Product[] = r?.data?.items || r?.data || [];
        setProducts(items); // Barcha mahsulotlarni saqlash
        if (items.length === 0) {
          setError('Mahsulotlar topilmadi');
        }
      })
      .catch((error)=>{
        console.error('❌ Products API error:', error);
        setError('Mahsulotlarni yuklashda xatolik');
        setProducts([]);
      });
  }, [telegramId]);

  // Filter products based on active category and search - PROFESSIONAL YECHIM
  const filteredProducts = React.useMemo(() => {
    let filtered = products;

    // Kategoriya filter
    if (activeCat !== 'all') {
      filtered = filtered.filter(p => p.categoryId?._id === activeCat);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [products, activeCat, searchQuery]);

  // Calculate totals
  const total = Object.entries(cart).reduce((sum,[pid,qty])=>{
    const p = products.find(x=>x._id===pid); 
    return sum + (p? p.price*qty:0)
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
  };

  const decrementProduct = (productId: string) => {
    updateCartQuantity(productId, (cart[productId] || 0) - 1);
  };

  // Order placement - PROFESSIONAL YECHIM
  const placeOrder = () => {
    if (Object.keys(cart).length === 0) {
      alert('Savat bo\'sh!');
      return;
    }

    const payload = { 
      telegramId, 
      items: Object.entries(cart)
        .filter(([_, quantity]) => quantity > 0)
        .map(([productId, quantity]) => ({ productId, quantity }))
    };

    console.log('📤 Sending order data:', payload);
    console.log('📤 Cart details:', cart);
    console.log('📤 Items count:', Object.keys(cart).length);

    try {
      const tg = window.Telegram?.WebApp;
      
      if (tg?.sendData) {
        tg.sendData(JSON.stringify(payload));
        console.log('✅ Data sent successfully');
        
        setCartModalOpen(false);
        alert('✅ Buyurtma muvaffaqiyatli yuborildi! Bot orqali davom eting.');
        
        setTimeout(() => {
          if (tg?.close) {
            tg.close();
          }
        }, 1000);
      } else {
        console.log('📤 Not in Telegram, showing fallback');
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
        <AppHeader />
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ fontFamily:'system-ui, sans-serif', padding:12 }}>
        <AppHeader />
        <div style={{ 
          textAlign: 'center', 
          padding: 40, 
          color: '#ff4d4f',
          backgroundColor: '#fff2f0',
          borderRadius: 8,
          border: '1px solid #ffccc7'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Xatolik yuz berdi</div>
          <div style={{ fontSize: 14, color: '#666' }}>{error}</div>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
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
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      fontFamily:'system-ui, sans-serif', 
      padding:12, 
      paddingBottom: itemCount > 0 ? 80 : 12 
    }}>
      <AppHeader />
      
      <BranchInfo branch={branch} branches={branches} />
      
      <SearchBar 
        searchQuery={searchQuery} 
        onSearchChange={setSearchQuery} 
      />

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

      <ProductGrid
        products={filteredProducts}
        cart={cart}
        onIncrement={incrementProduct}
        onDecrement={decrementProduct}
      />

      <BottomBar
        total={total}
        itemCount={itemCount}
        onOpenCart={() => setCartModalOpen(true)}
        onPlaceOrder={placeOrder}
      />

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