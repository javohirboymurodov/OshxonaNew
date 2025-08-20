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
  TextField,
  Box,
  Typography
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { Product } from '../../hooks/useProducts';
import apiService from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

interface ProductsTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onView: (product: Product) => void;
  onDelete: (id: string) => void;
  onToggleStatus?: (id: string, next: boolean) => void;
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

  return (
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
              <TableCell>Holat</TableCell>
              <TableCell>Yaratilgan</TableCell>
              <TableCell>Amallar</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((product) => (
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
                <TableCell>{product.price.toLocaleString()} so'm</TableCell>
                <TableCell>
                  {(() => {
                    const inventoryData = (inventoryMap as Record<string, { isAvailable?: boolean }>)[product._id];
                    const currentAvailability = inventoryData?.isAvailable ?? true;
                    const targetBranch = inventoryBranchId || branchId || (user as { branch?: string } | undefined)?.branch || undefined;
                    const canToggle = Boolean(targetBranch);
                    
                    console.log('🔍 Toggle debug:', {
                      productId: product._id,
                      productName: product.name,
                      inventoryData,
                      currentAvailability,
                      targetBranch,
                      inventoryBranchId,
                      branchId,
                      userBranch: (user as { branch?: string } | undefined)?.branch,
                      canToggle,
                      inventoryMapSize: Object.keys(inventoryMap || {}).length
                    });
                    
                    return (
                      <Tooltip title={canToggle ? (currentAvailability ? 'Faol' : 'Nofaol') : 'Filialni tanlang'}>
                        <span>
                          <Switch
                            color="success"
                            checked={currentAvailability}
                            disabled={!canToggle}
                            onChange={async (e) => {
                              try {
                                const tb = targetBranch;
                                if (!tb) {
                                  console.error('❌ No target branch for toggle');
                                  return;
                                }
                                console.log('📤 Updating inventory:', {
                                  branch: tb,
                                  product: product._id,
                                  isAvailable: e.target.checked
                                });
                                const result = await apiService.updateInventory(tb, product._id, { isAvailable: e.target.checked });
                                console.log('✅ Inventory updated:', result);
                                if (onInventoryUpdate) onInventoryUpdate();
                              } catch (err) {
                                console.error('❌ Inventory toggle error:', err);
                              }
                            }}
                          />
                        </span>
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
            ))}
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
  );
};

export default ProductsTable;