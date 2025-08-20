import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Alert, CircularProgress, TextField, MenuItem, Paper, Chip } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

// Komponentlarni import qilish
import ProductsTable from '@/components/Products/ProductsTable';
import ProductFormDialog from '@/components/Products/ProductFormDialog';
import ProductViewDialog from '@/components/Products/ProductViewDialog';

// Hook'larni import qilish
import { Product, FormData } from '@/hooks/useProducts';
import apiService from '@/services/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

const ProductsPage: React.FC = () => {
  // State'lar
  const [error, setError] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  
  // Hook'lar
  const queryClient = useQueryClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const categoriesQuery = useQuery<{ _id: string; name: string; emoji?: string }[]>({
    queryKey: ['categories-select'],
    queryFn: async () => {
      const res = await apiService.getCategories(1, 1000) as { items?: { _id: string; name: string; emoji?: string }[] };
      return res.items || [];
    }
  });
  const categories: { _id: string; name: string; emoji?: string }[] = categoriesQuery.data || [];

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [promotions, setPromotions] = useState<'all' | 'promo' | 'no-promo'>('all');
  // useAuth tipini uyg'unlashtirish
  type AuthShape = { user?: { role?: string; branch?: string } };
  const { user } = useAuth() as AuthShape;
  const isSuper = String(user?.role || '').toLowerCase() === 'superadmin';
  const [branch, setBranch] = useState<string>('all');
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  // Superadmin uchun filiallar ro'yxati (isSuper mavjud bo'lgandan keyin)
  const branchesQuery = useQuery<{ _id: string; name?: string; title?: string }[]>({
    queryKey: ['branches-select'],
    queryFn: async () => {
      const data: unknown = await apiService.getBranches();
      if (Array.isArray(data)) return data as { _id: string; name?: string; title?: string }[];
      const shaped = data as { branches?: { _id: string; name?: string; title?: string }[]; items?: { _id: string; name?: string; title?: string }[] };
      return (shaped?.branches || shaped?.items || []) as { _id: string; name?: string; title?: string }[];
    },
    enabled: isSuper,
  });
  const branches: { _id: string; name?: string; title?: string }[] = branchesQuery.data || [];

  const productsKey = ['products', { search, category, status, branch, promotions }];

  const productsQuery = useQuery<Product[]>({
    queryKey: productsKey,
    queryFn: async () => {
      let url = `/admin/products`;
      const params: string[] = [];
      // Superadmin filial tanlaganda mahsulotlarni FILTRLASH KERAK EMAS
      // Chunki biz inventory orqali boshqaramiz, API hamma mahsulotlarni qaytarsin
      if (category && category !== 'all') params.push(`category=${encodeURIComponent(category)}`);
      // Promo hisoblash backendda filial bo'yicha amalga oshadi. Superadmin uchun tanlangan (yoki avt. birinchi) filialni yuboramiz
      const branchForQuery = isSuper ? (branch && branch !== 'all' ? branch : (branches.length > 0 ? branches[0]._id : undefined)) : undefined;
      if (branchForQuery) params.push(`branch=${encodeURIComponent(branchForQuery)}`);
      if (isSuper && branch && branch !== 'all') params.push(`branch=${encodeURIComponent(branch)}`);
      if (search && search.trim()) params.push(`search=${encodeURIComponent(search.trim())}`);
      if (params.length) url += `?${params.join('&')}`;
      
      console.log('📡 Fetching products:', {
        url,
        isSuper,
        selectedBranch: branch,
        category,
        search
      });
      
      const data = await apiService.get<{ items?: Product[] }>(url);
      let items: Product[] = data?.items || [];
      
      console.log('📦 Received products:', items.length);
      
      if (status && status !== 'all') {
        const isActive = status === 'active';
        items = items.filter(p => Boolean(p.isActive) === isActive);
      }

      // Promo filter
      if (promotions !== 'all') {
        items = items.filter(p => {
          const hasPromo = Boolean((p as any).discount);
          return promotions === 'promo' ? hasPromo : !hasPromo;
        });
      }
      
      return items;
    },
    placeholderData: [] as Product[],
  });

  useEffect(() => {
    setProducts((productsQuery.data || []) as Product[]);
    setLoading(productsQuery.isLoading);
  }, [productsQuery.data, productsQuery.isLoading]);

  // Filter/pagination reset on key changes
  useEffect(() => { setPage(0); }, [search, category, status, branch, promotions]);

  // Inventory prefetch for selected branch (admin: own branch; superadmin: selected branch)
  // Superadmin uchun branch 'all' bo'lsa, birinchi filialni tanlaymiz
  const targetBranchId: string | undefined = isSuper 
    ? (branch && branch !== 'all' ? branch : (branches.length > 0 ? branches[0]._id : undefined)) 
    : (user?.branch as string | undefined);
  const productIds: string[] = React.useMemo(() => (products || []).map((p) => p._id), [products]);
  const inventoryQuery = useQuery<Record<string, { isAvailable?: boolean }>>({
    queryKey: ['inventory', { branch: targetBranchId, ids: productIds }],
    queryFn: async () => {
      if (!targetBranchId || productIds.length === 0) return {} as Record<string, { isAvailable?: boolean }>;
      const response = await apiService.getInventory(targetBranchId, productIds);
      const data = response?.items || response || [];
      const map: Record<string, { isAvailable?: boolean }> = {};
      
      console.log('📦 Raw inventory response:', response);
      console.log('📦 Inventory data array:', data);
      
      (data || []).forEach((it: any) => {
        const productId = typeof it.product === 'string' ? it.product : it.product?._id;
        if (productId) {
          map[productId] = { isAvailable: it.isAvailable };
        }
      });
      
      console.log('📦 Final inventory map:', map);
      return map;
    },
    enabled: Boolean(targetBranchId) && productIds.length > 0,
    staleTime: 5_000,
    placeholderData: {} as Record<string, { isAvailable?: boolean }>
  });

  // Yangi mahsulot qo'shish
  const handleAdd = () => {
    setEditProduct(null);
    setOpen(true);
  };

  // Mahsulotni tahrirlash
  const handleEdit = (product: Product) => {
    setEditProduct(product);
    setOpen(true);
  };

  // Mahsulotni ko'rish
  const handleView = (product: Product) => {
    setViewProduct(product);
    setViewOpen(true);
  };

  // Mahsulotni o'chirish
  const handleDelete = async (productId: string) => {
    if (window.confirm('Bu mahsulotni o\'chirmoqchimisiz?')) {
      try {
        await apiService.deleteProduct(productId);
        await queryClient.invalidateQueries({ queryKey: productsKey });
        setError(''); // Clear any previous errors
      } catch (error: unknown) {
        if (error instanceof Error) {
          setError(error.message || 'Mahsulotni o\'chirishda xatolik');
        } else {
          setError('Mahsulotni o\'chirishda xatolik');
        }
      }
    }
  };

  // Form submit
  const handleSubmit = async (formData: FormData, selectedFile: File | null) => {
    const fd = new window.FormData();
    fd.append('name', formData.name.trim());
    fd.append('description', formData.description.trim());
    fd.append('price', String(formData.price));
    fd.append('categoryId', formData.categoryId);
    fd.append('isActive', String(formData.isActive));
    if (selectedFile) fd.append('image', selectedFile);

    if (editProduct) {
      await apiService.updateProduct(editProduct._id, fd as unknown as globalThis.FormData);
    } else {
      await apiService.createProduct(fd as unknown as globalThis.FormData);
    }

    setOpen(false);
    await queryClient.invalidateQueries({ queryKey: productsKey });
    setError(''); // Clear any previous errors
  };

  // Dialog'larni yopish
  const handleCloseForm = () => {
    setOpen(false);
    setEditProduct(null);
  };

  const handleCloseView = () => {
    setViewOpen(false);
    setViewProduct(null);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Mahsulotlar Boshqaruvi</Typography>
        {isSuper && (
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleAdd}
          >
            Yangi Mahsulot
          </Button>
        )}
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Products Table */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2, alignItems: 'center' }}>
          <Box>
            <TextField
              fullWidth
              label="Qidirish (nom)"
              value={search}
              onChange={(e) => {
                const v = e.target.value;
                setSearch(v);
                queryClient.invalidateQueries({ queryKey: productsKey });
              }}
              size="small"
            />
          </Box>
  {isSuper && (
            <Box>
              <TextField 
                select 
                fullWidth 
                label="Filial (Mavjudlikni boshqarish uchun tanlang)" 
                size="small" 
                value={branch} 
                onChange={(e) => { 
                  const v = e.target.value; 
                  setBranch(v); 
                  queryClient.invalidateQueries({ queryKey: productsKey }); 
                }}
                helperText={branch === 'all' ? "Mavjudlikni boshqarish uchun filial tanlang" : null}
              >
                <MenuItem value="all">Barchasi (faqat ko'rish)</MenuItem>
                 {branches.map((b: { _id: string; name?: string; title?: string }) => (
                  <MenuItem key={b._id} value={b._id}>{b.name || b.title || 'Nomsiz filial'}</MenuItem>
                ))}
              </TextField>
            </Box>
          )}
          <Box>
            <TextField select fullWidth label="Kategoriya" size="small" value={category} onChange={(e) => {
              const v = e.target.value;
              setCategory(v);
              queryClient.invalidateQueries({ queryKey: productsKey });
            }}>
              <MenuItem value="all">Barchasi</MenuItem>
               {categories.map((c: { _id: string; name: string; emoji?: string }) => (
                <MenuItem key={c._id} value={c._id}>
                  {c.emoji} {c.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>
          <Box>
            <TextField select fullWidth label="Holat" size="small" value={status} onChange={(e) => {
              const v = e.target.value as 'all' | 'active' | 'inactive';
              setStatus(v);
              queryClient.invalidateQueries({ queryKey: productsKey });
            }}>
              <MenuItem value="all">Barchasi</MenuItem>
              <MenuItem value="active">Faol</MenuItem>
              <MenuItem value="inactive">Nofaol</MenuItem>
            </TextField>
          </Box>
          <Box>
            <TextField select fullWidth label="Promotions" size="small" value={promotions} onChange={(e) => {
              const v = e.target.value as 'all' | 'promo' | 'no-promo';
              setPromotions(v);
              queryClient.invalidateQueries({ queryKey: productsKey });
            }}>
              <MenuItem value="all">Barchasi</MenuItem>
              <MenuItem value="promo">Promo</MenuItem>
              <MenuItem value="no-promo">Promo emas</MenuItem>
            </TextField>
          </Box>
        </Box>
      </Paper>

      {/* Stats */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Chip label={`Jami: ${products.length}`} color="primary" />
          <Chip label={`Faol: ${products.filter(p => p.isActive).length}`} color="success" />
          <Chip label={`Nofaol: ${products.filter(p => !p.isActive).length}`} />
          <Chip label={`Kategoriyalar: ${new Set(products.map(p => p.categoryId?._id)).size}`} color="secondary" />
          <Chip label={`Promo: ${products.filter(p => Boolean((p as any).discount)).length}`} color="warning" />
          <Chip label={`Promo emas: ${products.filter(p => !Boolean((p as any).discount)).length}`} />
        </Box>
      </Paper>

      <ProductsTable
        products={products}
        onEdit={handleEdit}
        onView={handleView}
        onDelete={handleDelete}
        onToggleStatus={async (id) => {
          try {
            await apiService.toggleProductStatus(id);
            queryClient.invalidateQueries({ queryKey: productsKey });
          } catch (e) {
            console.error('Toggle status error', e);
          }
        }}
        page={page}
        rowsPerPage={rowsPerPage}
        total={products.length}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        inventoryMap={inventoryQuery.data || {}}
        onInventoryUpdate={() => {
          queryClient.invalidateQueries({ queryKey: ['inventory', { branch: targetBranchId, ids: productIds }] });
          queryClient.invalidateQueries({ queryKey: productsKey });
        }}
        inventoryBranchId={targetBranchId}
        inventoryBranchName={targetBranchId ? branches.find(b => b._id === targetBranchId)?.name || branches.find(b => b._id === targetBranchId)?.title || 'Filial' : undefined}
      />

      {/* Form Dialog */}
      <ProductFormDialog
        open={open}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        editProduct={editProduct}
        categories={categories}
      />

      {/* View Dialog */}
      <ProductViewDialog
        open={viewOpen}
        onClose={handleCloseView}
        product={viewProduct}
      />
    </Box>
  );
};

export default ProductsPage;