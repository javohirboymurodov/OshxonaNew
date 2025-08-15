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
  TextField
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
  inventoryMap = {}
}) => {
  const { user } = useAuth() as { user?: { role?: string; branch?: string } };
  const isSuper = String(user?.role || '').toLowerCase() === 'superadmin';
  const branchId = isSuper ? undefined : user?.branch;

  return (
    <Paper>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Rasm</TableCell>
              <TableCell>Nom</TableCell>
              <TableCell>Kategoriya</TableCell>
              <TableCell>Narx</TableCell>
              <TableCell>Holat</TableCell>
              {!isSuper && <TableCell>Inventar</TableCell>}
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
                  <Tooltip title={product.isActive ? 'Faol' : 'Nofaol'}>
                    <Switch
                      checked={product.isActive}
                      color="success"
                      onChange={() => onToggleStatus && onToggleStatus(product._id, !product.isActive)}
                    />
                  </Tooltip>
                </TableCell>
                {(
                  // Inventar ustunini ham admin, ham superadmin ko'radi
                  true as boolean
                ) && (
                  <TableCell>
                    <Tooltip title="Mavjud/yashirish">
                      <Switch
                        color="primary"
                        checked={Boolean((inventoryMap as Record<string, { isAvailable?: boolean }>)[product._id]?.isAvailable)}
                        onChange={async (e) => {
                          try {
                            const targetBranch = branchId || (user as { branch?: string } | undefined)?.branch || undefined;
                            if (!targetBranch) return;
                            await apiService.updateInventory(targetBranch, product._id, { isAvailable: e.target.checked });
                          } catch (err) { console.error('Inventory toggle error', err); }
                        }}
                      />
                    </Tooltip>
                    <TextField
                      type="number"
                      size="small"
                      sx={{ width: 90, ml: 1 }}
                      placeholder="Stock"
                      defaultValue={(inventoryMap as Record<string, { stock?: number | null }>)[product._id]?.stock ?? ''}
                      onBlur={async (e) => {
                        const val = e.target.value;
                        const parsed = val === '' ? null : Number(val);
                        try {
                          const targetBranch = branchId || (user as { branch?: string } | undefined)?.branch || undefined;
                          if (!targetBranch) return;
                          await apiService.updateInventory(targetBranch as string, product._id, { stock: Number.isNaN(parsed as number) ? null : (parsed as number) });
                        } catch (err) { console.error('Stock update error', err); }
                      }}
                    />
                    <TextField
                      type="number"
                      size="small"
                      sx={{ width: 90, ml: 1 }}
                      placeholder="Kunlim"
                      defaultValue={(inventoryMap as Record<string, { dailyLimit?: number | null }>)[product._id]?.dailyLimit ?? ''}
                      onBlur={async (e) => {
                        const val = e.target.value;
                        const parsed = val === '' ? null : Number(val);
                        try {
                          const targetBranch = branchId || (user as { branch?: string } | undefined)?.branch || undefined;
                          if (!targetBranch) return;
                          await apiService.updateInventory(targetBranch as string, product._id, { dailyLimit: Number.isNaN(parsed as number) ? null : (parsed as number) });
                        } catch (err) { console.error('DailyLimit update error', err); }
                      }}
                    />
                  </TableCell>
                )}
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