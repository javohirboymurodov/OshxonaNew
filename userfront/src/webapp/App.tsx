import React from 'react'

declare global {
  interface Window { Telegram?: any }
}

type Product = { _id: string; name: string; price: number; image?: string; categoryId?: { _id: string; name?: string } };
type Category = { _id: string; name: string };
type Branch = { _id: string; name: string; title?: string };

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const API_TIMEOUT = 5000; // 5 seconds timeout

// Mock data for testing when backend is not available
const MOCK_CATEGORIES: Category[] = [
  { _id: '1', name: '🍛 Milliy taomlar' },
  { _id: '2', name: '🍔 Fast food' },
  { _id: '3', name: '🥤 Ichimliklar' },
  { _id: '4', name: '🍰 Shirinliklar' }
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
  { _id: 'p6', name: 'Tort', price: 45000, categoryId: { _id: '4', name: 'Shirinliklar' } }
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

  React.useEffect(() => {
    if (!telegramId) return;
    fetch(`${API_BASE}/public/categories?telegramId=${telegramId}`)
      .then(r=>r.json())
      .then(r=>{
        const list: Category[] = (Array.isArray(r?.data) ? r.data : r?.data?.items) || [];
        setCategories(list);
      })
      .catch(()=>{
        // Fallback to mock data when API fails
        console.log('🔄 API unavailable, using mock categories');
        setCategories(MOCK_CATEGORIES);
      });
  }, [telegramId]);

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
        // Fallback to mock data when API fails
        console.log('🔄 API unavailable, using mock branches');
        setBranches(MOCK_BRANCHES);
        if (!branch) {
          setBranch(MOCK_BRANCHES[0]._id);
        }
      });
  }, [telegramId, branch]);

  React.useEffect(() => {
    if (!branch || !telegramId) return;
    const qp: string[] = [];
    if (activeCat !== 'all') qp.push(`category=${encodeURIComponent(activeCat)}`);
    const url = `${API_BASE}/public/products?telegramId=${telegramId}&branch=${encodeURIComponent(branch)}${qp.length?`&${qp.join('&')}`:''}`;
    fetch(url)
      .then(r=>r.json())
      .then(r=>{
        const items: Product[] = r?.data?.items || r?.data || [];
        setProducts(items);
      })
      .catch(()=>{
        // Fallback to mock data when API fails
        console.log('🔄 API unavailable, using mock products');
        let filteredProducts = MOCK_PRODUCTS;
        if (activeCat !== 'all') {
          filteredProducts = MOCK_PRODUCTS.filter(p => p.categoryId?._id === activeCat);
        }
        setProducts(filteredProducts);
      });
  }, [activeCat, branch, telegramId]);

  const total = Object.entries(cart).reduce((sum,[pid,qty])=>{
    const p = products.find(x=>x._id===pid); return sum + (p? p.price*qty:0)
  },0);

  const sendToBot = () => {
    if (Object.keys(cart).length === 0) {
      alert('Savat bo\'sh!');
      return;
    }
    // Use selected branch or first available branch
    const selectedBranch = branch || (branches.length > 0 ? branches[0]._id : null);
    const payload = { 
      telegramId, 
      branch: selectedBranch, 
      items: Object.entries(cart).map(([productId, quantity])=>({ productId, quantity })) 
    };
    try {
      const tg = window.Telegram?.WebApp; 
      tg?.sendData?.(JSON.stringify(payload));
      tg?.close?.(); // Close WebApp after sending data
    } catch {}
  };

  return (
    <div style={{ fontFamily:'system-ui, sans-serif', padding:12 }}>
      <h3>🍽️ Katalog</h3>
      
      {/* Branch info - hidden but auto-selected */}
      {branch && branches.length > 0 && (
        <div style={{ marginBottom: 12, padding: 8, backgroundColor: '#f0f8ff', borderRadius: 8, fontSize: 14 }}>
          🏪 <strong>{branches.find(b => b._id === branch)?.name || branches.find(b => b._id === branch)?.title}</strong>
        </div>
      )}

      {/* Categories */}
      <div style={{ display:'flex', gap:8, overflowX:'auto', marginBottom:12 }}>
        <button onClick={()=>setActiveCat('all')} style={{ padding:'6px 10px', borderRadius:8, border:'1px solid #ddd', background: activeCat==='all'?'#1677ff':'#fff', color:activeCat==='all'?'#fff':'#000' }}>Barchasi</button>
        {categories.map(c=> (
          <button key={c._id} onClick={()=>setActiveCat(c._id)} style={{ padding:'6px 10px', borderRadius:8, border:'1px solid #ddd', background: activeCat===c._id?'#1677ff':'#fff', color:activeCat===c._id?'#fff':'#000' }}>{c.name}</button>
        ))}
      </div>

      {/* Products grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
        {products.map(p=> (
          <div key={p._id} style={{ border:'1px solid #eee', borderRadius:10, padding:10 }}>
            <div style={{ fontWeight:600 }}>{p.name}</div>
            <div style={{ color:'#666', margin:'4px 0' }}>{p.price.toLocaleString()} so'm</div>
            <div style={{ display:'flex', gap:6, alignItems:'center', justifyContent:'center' }}>
              <button onClick={()=> setCart(prev=> ({ ...prev, [p._id]: Math.max((prev[p._id]||0)-1,0) }))} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #ddd', background: '#fff' }}>−</button>
              <div style={{ minWidth: 20, textAlign: 'center' }}>{cart[p._id]||0}</div>
              <button onClick={()=> setCart(prev=> ({ ...prev, [p._id]: (prev[p._id]||0)+1 }))} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #ddd', background: '#fff' }}>+</button>
            </div>
          </div>
        ))}
      </div>

      {/* Fixed bottom bar */}
      <div style={{ position:'fixed', left:0, right:0, bottom:0, padding:12, background:'#fff', borderTop:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>🧺 Jami: <b>{total.toLocaleString()} so'm</b></div>
        <button onClick={sendToBot} style={{ background:'#52c41a', color:'#fff', padding:'10px 14px', border:'none', borderRadius:8 }}>Buyurtma berish</button>
      </div>
    </div>
  )
}
