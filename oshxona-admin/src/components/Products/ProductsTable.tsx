import React from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Avatar,
  Switch,
  Tooltip,
  Box,
  Typography,
  Button
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  LocalOffer as PromoIcon
} from '@mui/icons-material';
import { Product } from '../../hooks/useProducts';
import apiService from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import PromoModal from './PromoModal';

interface ProductsTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onView: (product: Product) => void;
  onDelete: (id: string) => void;
  onToggleStatus?: (id: string) => Promise<void>;
  page?: number;
  rowsPerPage?: number;
  total?: number;
  onPageChange?: (event: unknown, page: number) => void;
  onRowsPerPageChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  inventoryMap?: Record<string, { isAvailable?: boolean; stock?: number | null; dailyLimit?: number | null; soldToday?: number | null }>;
  onInventoryUpdate?: () => void;
  inventoryBranchId?: string;
  inventoryBranchName?: string;
}

// Extended Product type for promo data
interface ProductWithPromo extends Product {
  originalPrice?: number;
  discount?: {
    type: 'percent' | 'amount';
    value: number;
  };
}

const getImageUrl = (imagePath: string | undefined): string | undefined => {
  if (!imagePath) return undefined;
  if (imagePath.startsWith('http')) return imagePath;
  return `http://localhost:5000${imagePath}`;
};

const ProductsTable: React.FC<ProductsTableProps> = ({
  products,
  onEdit,
  onView,
  onDelete,
  onToggleStatus,
  page = 0,
  rowsPerPage = 10,
  total = products.length,
  onPageChange,
  onRowsPerPageChange,
  inventoryMap = {},
  onInventoryUpdate,
  inventoryBranchId,
  inventoryBranchName
}) => {
  const { user } = useAuth() as { user?: { role?: string; branch?: string } };
  const isSuper = String(user?.role || '').toLowerCase() === 'superadmin';
  const branchId = isSuper ? undefined : user?.branch;
  
  // Promo modal state
  const [promoModalOpen, setPromoModalOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<ProductWithPromo | null>(null);

  const handlePromoClick = (product: ProductWithPromo) => {
    setSelectedProduct(product);
    setPromoModalOpen(true);
  };

  const handlePromoClose = () => {
    setPromoModalOpen(false);
    setSelectedProduct(null);
  };

  const handlePromoUpdate = () => {
    if (onInventoryUpdate) onInventoryUpdate();
  };

  return (
    <>
      <Paper>
        {inventoryBranchId && (
          <Box p={2} bgcolor="primary.light" color="white">
            <Typography variant="body2" fontWeight="bold">
              📍 Mavjudlik boshqaruvi faol - {inventoryBranchName || `Filial (${inventoryBranchId})`}
            </Typography>
          </Box>
        )}
        <TableContainer>
          <Table>
          <TableHead>
            <TableRow>
              <TableCell>Rasm</TableCell>
              <TableCell>Nom</TableCell>
              <TableCell>Kategoriya</TableCell>
              <TableCell>Narx</TableCell>
              <TableCell>Promo</TableCell>
              <TableCell>Holat</TableCell>
              <TableCell>Yaratilgan</TableCell>
              <TableCell>Amallar</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((product) => {
              const productWithPromo = product as ProductWithPromo;
              return (
                <TableRow key={product._id}>
                  <TableCell>
                    <Avatar 
                      src={getImageUrl(product.image)} 
                      alt={product.name}
                      sx={{ width: 50, height: 50 }}
                    >
                      {product.name.charAt(0).toUpperCase()}
                    </Avatar>
                  </TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>
                    {product.categoryId?.emoji} {product.categoryId?.name}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const original = productWithPromo.originalPrice;
                      if (original && original > product.price) {
                        return <span><s>{original.toLocaleString()} so'm</s> <b>{product.price.toLocaleString()} so'm</b></span>;
                      }
                      return <span>{product.price.toLocaleString()} so'm</span>;
                    })()}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" component="div">
                      {productWithPromo.discount ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span style={{ color: '#f50' }}>
                            -{productWithPromo.discount.value}{productWithPromo.discount.type==='percent'?'%':' so\'m'}
                          </span>
                          {productWithPromo.discount && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<PromoIcon />}
                              onClick={() => handlePromoClick(productWithPromo)}
                              sx={{ ml: 1 }}
                            >
                              Tahrirlash
                            </Button>
                          )}
                        </Box>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<PromoIcon />}
                          onClick={() => handlePromoClick(productWithPromo)}
                        >
                          Promo qo'shish
                        </Button>
                      )}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const inventoryData = (inventoryMap as Record<string, { isAvailable?: boolean }>)[product._id];
                      const currentAvailability = inventoryData?.isAvailable ?? true;
                      const targetBranch = inventoryBranchId || branchId || (user as { branch?: string } | undefined)?.branch || undefined;
                      const canToggle = Boolean(targetBranch);
                      
                      return (
                        <Tooltip title={canToggle ? (currentAvailability ? 'Faol' : 'Nofaol') : 'Filialni tanlang'}>
                          <Box component="span">
                            <Switch
                              color="success"
                              checked={currentAvailability}
                              disabled={!canToggle}
                              onChange={async (e) => {
                                try {
                                  if (onToggleStatus) {
                                    await onToggleStatus(product._id);
                                  } else {
                                    const tb = targetBranch;
                                    if (!tb) {
                                      console.error('❌ No target branch for toggle');
                                      return;
                                    }
                                    await apiService.updateInventory(tb, product._id, { isAvailable: e.target.checked });
                                    if (onInventoryUpdate) onInventoryUpdate();
                                  }
                                } catch (err) {
                                  console.error('❌ Inventory toggle error:', err);
                                }
                              }}
                            />
                          </Box>
                        </Tooltip>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {new Date(product.createdAt).toLocaleDateString('uz-UZ')}
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => onView(product)}>
                      <ViewIcon />
                    </IconButton>
                    {isSuper && (
                      <>
                        <IconButton onClick={() => onEdit(product)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => onDelete(product._id)}>
                          <DeleteIcon />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={onPageChange || (() => {})}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={onRowsPerPageChange || (() => {})}
        rowsPerPageOptions={[5, 10, 25, 50]}
      />
    </Paper>

    {/* Promo Modal */}
    {selectedProduct && (
      <PromoModal
        open={promoModalOpen}
        onClose={handlePromoClose}
        productId={selectedProduct._id}
        productName={selectedProduct.name}
        branchId={inventoryBranchId || branchId || ''}
        branchName={inventoryBranchName || 'Filial'}
        currentPromo={selectedProduct.discount ? {
          discountType: selectedProduct.discount.type,
          discountValue: selectedProduct.discount.value,
          promoStart: null, // TODO: API'dan olish kerak
          promoEnd: null,   // TODO: API'dan olish kerak
          isPromoActive: true
        } : undefined}
        onPromoUpdate={handlePromoUpdate}
      />
    )}
    </>
  );
};

export default ProductsTable;