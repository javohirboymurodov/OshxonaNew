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
  const { telegramId, isValidTelegram } = useInitData();
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

  // Debug logging
  React.useEffect(() => {
    console.log('🔍 App Debug Info:', {
      telegramId,
      isValidTelegram,
      windowTelegram: !!window.Telegram?.WebApp,
      initDataUnsafe: window.Telegram?.WebApp?.initDataUnsafe,
      userAgent: navigator.userAgent,
      location: window.location.href
    });
  }, [telegramId, isValidTelegram]);

  // Load categories
  React.useEffect(() => {
    if (!telegramId) return;
    setError(null);
    
    const apiUrl = `${API_BASE}/public/categories?telegramId=${telegramId}`;
    console.log('🔍 Loading categories from:', apiUrl);
    
    fetch(apiUrl)
      .then(r => {
        console.log('🔍 Categories response status:', r.status);
        return r.json();
      })
      .then(r => {
        console.log('🔍 Categories response data:', r);
        console.log('🔍 Categories data structure:', {
          hasData: !!r?.data,
          dataType: typeof r?.data,
          isArray: Array.isArray(r?.data),
          hasItems: !!r?.data?.items,
          itemsType: typeof r?.data?.items,
          itemsIsArray: Array.isArray(r?.data?.items)
        });
        
        let list: Category[] = [];
        
        if (Array.isArray(r?.data)) {
          list = r.data;
        } else if (r?.data?.items && Array.isArray(r.data.items)) {
          list = r.data.items;
        } else if (r?.data && typeof r.data === 'object') {
          const possibleArrays = Object.values(r.data).filter(val => Array.isArray(val));
          if (possibleArrays.length > 0) {
            list = possibleArrays[0] as Category[];
          }
        }
        
        console.log('🔍 Parsed categories:', list.length, 'items');
        console.log('🔍 First category sample:', list[0]);
        
        setCategories(list);
        if (list.length === 0) {
          setError('Kategoriyalar topilmadi');
        }
      })
      .catch((error) => {
        console.error('❌ Categories API error:', error);
        setError('Kategoriyalarni yuklashda xatolik');
        setCategories([]);
      });
  }, [telegramId]);

  // Load branches
  React.useEffect(() => {
    if (!telegramId) return;
    const apiUrl = `${API_BASE}/public/branches?telegramId=${telegramId}`;
    console.log('🔍 Loading branches from:', apiUrl);
    
    fetch(apiUrl)
      .then(r => {
        console.log('🔍 Branches response status:', r.status);
        return r.json();
      })
      .then(r => {
        console.log('🔍 Branches response data:', r);
        console.log('🔍 Branches data structure:', {
          hasData: !!r?.data,
          dataType: typeof r?.data,
          isArray: Array.isArray(r?.data),
          hasItems: !!r?.data?.items,
          itemsType: typeof r?.data?.items,
          itemsIsArray: Array.isArray(r?.data?.items)
        });
        
        let list: Branch[] = [];
        
        if (Array.isArray(r?.data)) {
          list = r.data;
        } else if (r?.data?.items && Array.isArray(r.data.items)) {
          list = r.data.items;
        } else if (r?.data && typeof r.data === 'object') {
          const possibleArrays = Object.values(r.data).filter(val => Array.isArray(val));
          if (possibleArrays.length > 0) {
            list = possibleArrays[0] as Branch[];
          }
        }
        
        console.log('🔍 Parsed branches:', list.length, 'items');
        console.log('🔍 First branch sample:', list[0]);
        
        setBranches(list);
        if (list.length > 0 && !branch) {
          setBranch(list[0]._id);
        }
      })
      .catch((error) => {
        console.error('❌ Branches API error:', error);
        setBranches([]);
      });
  }, [telegramId, branch]);

  // Load products - PROFESSIONAL YECHIM
  React.useEffect(() => {
    if (!telegramId) return;
    
    setLoading(true);
    setError(null);
    
    // Barcha mahsulotlarni yuklash, kategoriya filter emas
    const url = `${API_BASE}/public/products?telegramId=${telegramId}`;
    console.log('🔍 Loading products from:', url);
    
    fetch(url)
      .then(r => {
        console.log('🔍 Products response status:', r.status);
        return r.json();
      })
      .then(r => {
        console.log('🔍 Products response data:', r);
        console.log('🔍 Products data structure:', {
          hasData: !!r?.data,
          dataType: typeof r?.data,
          isArray: Array.isArray(r?.data),
          hasItems: !!r?.data?.items,
          itemsType: typeof r?.data?.items,
          itemsIsArray: Array.isArray(r?.data?.items)
        });
        
        let items: Product[] = [];
        
        if (Array.isArray(r?.data)) {
          // Agar data to'g'ridan-to'g'ri array bo'lsa
          items = r.data;
        } else if (r?.data?.items && Array.isArray(r.data.items)) {
          // Agar data.items array bo'lsa
          items = r.data.items;
        } else if (r?.data && typeof r.data === 'object') {
          // Agar data object bo'lsa, uning ichidan array qidirish
          const possibleArrays = Object.values(r.data).filter(val => Array.isArray(val));
          if (possibleArrays.length > 0) {
            items = possibleArrays[0] as Product[];
          }
        }
        
        console.log('🔍 Parsed products:', items.length, 'items');
        console.log('🔍 First product sample:', items[0]);
        
        setProducts(items);
        if (items.length === 0) {
          setError('Mahsulotlar topilmadi');
        }
      })
      .catch((error) => {
        console.error('❌ Products API error:', error);
        setError('Mahsulotlarni yuklashda xatolik');
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, [telegramId]);

  // Filter products based on active category and search - PROFESSIONAL YECHIM
  const filteredProducts = React.useMemo(() => {
    console.log('🔍 Filtering products:', {
      totalProducts: products.length,
      activeCat,
      searchQuery,
      firstProduct: products[0]
    });

    let filtered = products;

    // Kategoriya filter
    if (activeCat !== 'all') {
      console.log('🔍 Filtering by category:', activeCat);
      filtered = filtered.filter(p => {
        const matches = p.categoryId?._id === activeCat;
        console.log('🔍 Product category check:', {
          productId: p._id,
          productName: p.name,
          productCategoryId: p.categoryId?._id,
          activeCat,
          matches
        });
        return matches;
      });
    }

    // Search filter
    if (searchQuery) {
      console.log('🔍 Filtering by search:', searchQuery);
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Kategoriya ketma-ketligida tartiblash
    filtered.sort((a, b) => {
      const categoryA = a.categoryId?._id || '';
      const categoryB = b.categoryId?._id || '';
      
      // Kategoriya ID bo'yicha tartiblash
      if (categoryA !== categoryB) {
        return categoryA.localeCompare(categoryB);
      }
      
      // Xuddi shu kategoriyada nom bo'yicha tartiblash
      return a.name.localeCompare(b.name);
    });

    console.log('🔍 Filtered products result:', {
      filteredCount: filtered.length,
      firstFiltered: filtered[0]
    });

    return filtered;
  }, [products, activeCat, searchQuery]);

  // Products grouped by category for "all" view
  const productsByCategory = React.useMemo(() => {
    const map: Record<string, Product[]> = {};
    for (const p of products) {
      const cid = p.categoryId?._id;
      if (!cid) continue;
      if (!map[cid]) map[cid] = [];
      map[cid].push(p);
    }
    return map;
  }, [products]);

  // Refs for category sections (used in All view)
  const sectionRefs = React.useRef<Record<string, HTMLElement | null>>({});

  const handleCategoryChange = (categoryId: string) => {
    setActiveCat(categoryId);
    // If switching while on ALL view, scroll to that category section
    if (categoryId !== 'all') {
      const target = sectionRefs.current[categoryId];
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Sync top category tabs (x-scroll) with visible category sections using IntersectionObserver
  React.useEffect(() => {
    if (activeCat !== 'all') return; // Only when showing all categories

    const container = document.querySelector('[data-category-container]') as HTMLElement | null;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the section that is most visible / closest to top
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top) - (b.boundingClientRect.top));
        const topMost = visible[0];
        const id = topMost?.target.getAttribute('data-category-section-id');
        if (id && id !== activeCat) {
          setActiveCat(id);
          const btn = container.querySelector(`[data-category-id="${id}"]`) as HTMLElement | null;
          btn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      },
      { root: null, rootMargin: '0px 0px -70% 0px', threshold: [0.25, 0.5, 0.75] }
    );

    // Observe each category section that has products
    categories.forEach(c => {
      const el = sectionRefs.current[c._id];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [activeCat, categories]);

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
  const placeOrder = async () => {
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
        // Telegram WebApp orqali yuborish
        tg.sendData(JSON.stringify(payload));
        console.log('✅ Data sent via Telegram WebApp');
        
        setCartModalOpen(false);
        alert('✅ Buyurtma muvaffaqiyatli yuborildi! Bot orqali davom eting.');
        
        setTimeout(() => {
          if (tg?.close) {
            tg.close();
          }
        }, 1000);
      } else {
        // Test rejimi - bot ga to'g'ridan-to'g'ri yuborish
        console.log('📤 Test mode: Sending data directly to bot');
        
        try {
          const response = await fetch(`${API_BASE}/public/webapp-data`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              telegramId: telegramId,
              data: JSON.stringify(payload)
            })
          });
          
          if (response.ok) {
            console.log('✅ Data sent to bot successfully');
            setCartModalOpen(false);
            alert('✅ Buyurtma muvaffaqiyatli yuborildi! Bot orqali davom eting.');
          } else {
            console.error('❌ Bot API error:', response.status);
            alert('❌ Bot ga yuborishda xatolik! Qaytadan urinib ko\'ring.');
          }
        } catch (apiError) {
          console.error('❌ API call error:', apiError);
          alert('✅ Test rejimi: Buyurtma ma\'lumotlari tayyor!\n\nBot orqali buyurtmani davom ettiring.');
        }
      }
    } catch (error) {
      console.error('❌ Error sending data:', error);
      alert('❌ Xatolik yuz berdi. Qaytadan urinib ko\'ring.');
    }
  };

  // Telegram WebApp tekshirish - yumshoq yechim
  if (!telegramId) {
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
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Yuklanmoqda...</div>
          <div style={{ fontSize: 14, color: '#666' }}>
            Telegram ma'lumotlari yuklanmoqda
          </div>
        </div>
      </div>
    );
  }

  // Agar Telegram WebApp bo'lmasa, lekin telegramId bo'lsa, ishlaydi
  if (!isValidTelegram && !window.Telegram?.WebApp) {
    console.warn('⚠️ Not in Telegram WebApp, but continuing with test mode');
  }

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
          onCategoryChange={handleCategoryChange}
        />
      </div>

      {/* Content */}
      {activeCat === 'all' ? (
        // All categories view: render sections by category
        <div>
          {categories.map(cat => {
            const list = productsByCategory[cat._id] || [];
            if (list.length === 0) return null;
            return (
              <section
                key={cat._id}
                ref={el => { sectionRefs.current[cat._id] = el; }}
                data-category-section-id={cat._id}
                style={{ marginBottom: 16 }}
             >
                <h4 style={{ margin: '8px 4px', color: '#555', fontWeight: 700 }}>{cat.name}</h4>
                <ProductGrid
                  products={list}
                  cart={cart}
                  onIncrement={incrementProduct}
                  onDecrement={decrementProduct}
                />
              </section>
            );
          })}
        </div>
      ) : (
        // Single category view
        <ProductGrid
          products={filteredProducts}
          cart={cart}
          onIncrement={incrementProduct}
          onDecrement={decrementProduct}
        />
      )}
      
      {/* Debug info */}
      {(import.meta as any).env?.DEV && (
        <div style={{ 
          position: 'fixed', 
          top: 10, 
          right: 10, 
          background: 'rgba(0,0,0,0.8)', 
          color: 'white', 
          padding: 8, 
          fontSize: 12, 
          borderRadius: 4,
          zIndex: 9999
        }}>
          <div>Products: {products.length}</div>
          <div>Filtered: {filteredProducts.length}</div>
          <div>ActiveCat: {activeCat}</div>
          <div>Search: {searchQuery}</div>
        </div>
      )}

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