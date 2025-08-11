import React from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Avatar,
  Switch,
  Tooltip
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { Product } from '../../hooks/useProducts';

interface ProductsTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onView: (product: Product) => void;
  onDelete: (id: string) => void;
  onToggleStatus?: (id: string, next: boolean) => void;
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
  onToggleStatus
}) => {
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
              <TableCell>Yaratilgan</TableCell>
              <TableCell>Amallar</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
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
                <TableCell>
                  {new Date(product.createdAt).toLocaleDateString('uz-UZ')}
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => onView(product)}>
                    <ViewIcon />
                  </IconButton>
                  <IconButton onClick={() => onEdit(product)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => onDelete(product._id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default ProductsTable;