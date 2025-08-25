import React from 'react'

declare global {
  interface Window { Telegram?: any }
}

type Product = { _id: string; name: string; price: number; image?: string; categoryId?: { _id: string; name?: string } };
type Category = { _id: string; name: string };
type Branch = { _id: string; name: string; title?: string };

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

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
      setTelegramId(id || qpId);
    } catch {
      try {
        const url = new URL(window.location.href);
        const qpId = url.searchParams.get('telegramId') || url.searchParams.get('tgId');
        setTelegramId(qpId);
      } catch {}
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
    fetch(`${API_BASE}/public/categories?telegramId=${telegramId}`).then(r=>r.json()).then(r=>{
      const list: Category[] = (Array.isArray(r?.data) ? r.data : r?.data?.items) || [];
      setCategories(list);
    }).catch(()=>{});
  }, [telegramId]);

  React.useEffect(() => {
    if (!telegramId) return;
    fetch(`${API_BASE}/public/branches?telegramId=${telegramId}`).then(r=>r.json()).then(r=>{
      const list: Branch[] = (Array.isArray(r?.data) ? r.data : r?.data?.items) || [];
      setBranches(list);
      if (list.length > 0 && !branch) {
        setBranch(list[0]._id);
      }
    }).catch(()=>{});
  }, [telegramId, branch]);

  React.useEffect(() => {
    if (!branch || !telegramId) return;
    const qp: string[] = [];
    if (activeCat !== 'all') qp.push(`category=${encodeURIComponent(activeCat)}`);
    const url = `${API_BASE}/public/products?telegramId=${telegramId}&branch=${encodeURIComponent(branch)}${qp.length?`&${qp.join('&')}`:''}`;
    fetch(url).then(r=>r.json()).then(r=>{
      const items: Product[] = r?.data?.items || r?.data || [];
      setProducts(items);
    }).catch(()=>{});
  }, [activeCat, branch, telegramId]);

  const total = Object.entries(cart).reduce((sum,[pid,qty])=>{
    const p = products.find(x=>x._id===pid); return sum + (p? p.price*qty:0)
  },0);

  const sendToBot = () => {
    console.log('🚀 Send to bot clicked');
    
    if (!branch) {
      alert('Iltimos, filialni tanlang!');
      return;
    }
    if (Object.keys(cart).length === 0) {
      alert('Savat bo\'sh!');
      return;
    }
    
    const payload = { 
      telegramId, 
      branch, 
      items: Object.entries(cart).map(([productId, quantity])=>({ productId, quantity })) 
    };
    
    console.log('📦 Payload:', payload);
    
    try {
      const tg = window.Telegram?.WebApp;
      if (tg?.sendData) {
        tg.sendData(JSON.stringify(payload));
      } else {
        console.log('📱 Telegram WebApp not available, payload would be:', payload);
        alert('Buyurtma ma\'lumotlari tayyor! (Demo rejim)');
      }
    } catch (error) {
      console.error('❌ Send error:', error);
      alert('Xatolik yuz berdi, qayta urinib ko\'ring');
    }
  };

  return (
    <div style={{ fontFamily:'system-ui, sans-serif', padding:12, position: 'relative' }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .button-active {
          transform: scale(0.95);
          transition: transform 0.1s ease;
        }
        .button-hover:hover {
          opacity: 0.8;
          transition: opacity 0.2s ease;
        }
      `}</style>
      <h3>🍽️ Katalog</h3>
      
      {/* Branch selection */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>🏪 Filial:</label>
        <select 
          value={branch} 
          onChange={(e) => setBranch(e.target.value)}
          style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid #ddd' }}
        >
          <option value="">Filialni tanlang</option>
          {branches.map(b => (
            <option key={b._id} value={b._id}>{b.name || b.title}</option>
          ))}
        </select>
      </div>

      {/* Categories */}
      <div style={{ display:'flex', gap:8, overflowX:'auto', marginBottom:12 }}>
        <button 
          onClick={()=>setActiveCat('all')} 
          className="button-hover"
          style={{ 
            padding:'6px 10px', 
            borderRadius:8, 
            border:'1px solid #ddd', 
            background: activeCat==='all'?'#1677ff':'#fff', 
            color:activeCat==='all'?'#fff':'#000',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          Barchasi
        </button>
        {categories.map(c=> (
          <button 
            key={c._id} 
            onClick={()=>setActiveCat(c._id)} 
            className="button-hover"
            style={{ 
              padding:'6px 10px', 
              borderRadius:8, 
              border:'1px solid #ddd', 
              background: activeCat===c._id?'#1677ff':'#fff', 
              color:activeCat===c._id?'#fff':'#000',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Products grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
        {products.map(p=> (
          <div key={p._id} style={{ border:'1px solid #eee', borderRadius:10, padding:10 }}>
            <div style={{ fontWeight:600 }}>{p.name}</div>
            <div style={{ color:'#666', margin:'4px 0' }}>{p.price.toLocaleString()} so'm</div>
            <div style={{ display:'flex', gap:6, alignItems:'center', justifyContent:'center' }}>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  console.log(`🔻 Decrease ${p.name}`);
                  setCart(prev => ({ ...prev, [p._id]: Math.max((prev[p._id]||0)-1,0) }));
                }} 
                className="button-hover"
                style={{ 
                  width: 30, 
                  height: 30, 
                  borderRadius: '50%', 
                  border: '1px solid #ddd', 
                  background: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                −
              </button>
              <div style={{ minWidth: 20, textAlign: 'center', fontWeight: '600' }}>{cart[p._id]||0}</div>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  console.log(`🔺 Increase ${p.name}`);
                  setCart(prev => ({ ...prev, [p._id]: (prev[p._id]||0)+1 }));
                }} 
                className="button-hover"
                style={{ 
                  width: 30, 
                  height: 30, 
                  borderRadius: '50%', 
                  border: '1px solid #ddd', 
                  background: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Fixed bottom bar */}
      <div style={{ position:'fixed', left:0, right:0, bottom:0, padding:12, background:'#fff', borderTop:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center', zIndex: 1000 }}>
        <div>🧺 Jami: <b>{total.toLocaleString()} so'm</b></div>
        <button 
          onClick={sendToBot} 
          className="button-hover"
          style={{ 
            background:'#52c41a', 
            color:'#fff', 
            padding:'10px 14px', 
            border:'none', 
            borderRadius:8,
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            boxShadow: '0 2px 4px rgba(82, 196, 26, 0.3)'
          }}
        >
          Buyurtma berish
        </button>
      </div>
    </div>
  )
}


