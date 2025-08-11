import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Alert, CircularProgress, TextField, MenuItem, Paper, Chip } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

// Komponentlarni import qilish
import ProductsTable from '@/components/Products/ProductsTable';
import ProductFormDialog from '@/components/Products/ProductFormDialog';
import ProductViewDialog from '@/components/Products/ProductViewDialog';

// Hook'larni import qilish
import { useProducts, Product, FormData } from '@/hooks/useProducts';
import apiService from '@/services/api';
import { useCategories } from '@/hooks/useCategories';

const ProductsPage: React.FC = () => {
  // State'lar
  const [error, setError] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  
  // Hook'lar
  const { products, loading, fetchProducts, createProduct, updateProduct, deleteProduct } = useProducts();
  const { categories } = useCategories();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        await deleteProduct(productId);
        await fetchProducts();
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
    if (editProduct) {
      await updateProduct(editProduct._id, formData, selectedFile);
    } else {
      await createProduct(formData, selectedFile);
    }
    
    setOpen(false);
    await fetchProducts();
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
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          Yangi Mahsulot
        </Button>
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
                fetchProducts({ search: v, category, status }, { silent: true });
              }}
              size="small"
            />
          </Box>
          <Box>
            <TextField select fullWidth label="Kategoriya" size="small" value={category} onChange={(e) => {
              const v = e.target.value;
              setCategory(v);
              fetchProducts({ search, category: v, status }, { silent: true });
            }}>
              <MenuItem value="all">Barchasi</MenuItem>
              {categories.map((c) => (
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
              fetchProducts({ search, category, status: v }, { silent: true });
            }}>
              <MenuItem value="all">Barchasi</MenuItem>
              <MenuItem value="active">Faol</MenuItem>
              <MenuItem value="inactive">Nofaol</MenuItem>
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
            fetchProducts({ search, category, status }, { silent: true });
          } catch (e) {
            console.error('Toggle status error', e);
          }
        }}
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