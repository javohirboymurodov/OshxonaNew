import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Avatar,
  Chip
} from '@mui/material';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  categoryId: {
    _id: string;
    name: string;
    emoji: string;
  };
  isActive: boolean;
  image?: string;
  createdAt: string;
}

interface ProductViewDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}

const getImageUrl = (imagePath: string | undefined): string | undefined => {
  if (!imagePath) return undefined;
  if (imagePath.startsWith('http')) return imagePath;
  return `http://localhost:5000${imagePath}`;
};

const ProductViewDialog: React.FC<ProductViewDialogProps> = ({
  open,
  onClose,
  product
}) => {
  if (!product) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
          Mahsulot Ma'lumotlari
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Box>
          {/* Rasm */}
          <Box display="flex" justifyContent="center" mb={2}>
            <Avatar
              src={getImageUrl(product.image)}
              alt={product.name}
              sx={{ width: 80, height: 80 }}
            >
              {!product.image && (
                <Typography variant="h4">
                  {product.name.charAt(0).toUpperCase()}
                </Typography>
              )}
            </Avatar>
          </Box>

          {/* Ma'lumotlar - ixcham */}
          <Box sx={{ display: 'grid', gap: 1 }}>
            
            {/* Nom va Kategoriya - yonma-yon */}
            <Box display="flex" gap={2}>
              <Box flex={1}>
                <Typography variant="body2" color="textSecondary" fontWeight="bold">
                  📝 Nomi:
                </Typography>
                <Typography variant="body1">
                  {product.name}
                </Typography>
              </Box>
              <Box flex={1}>
                <Typography variant="body2" color="textSecondary" fontWeight="bold">
                  📂 Kategoriya:
                </Typography>
                <Typography variant="body1">
                  {product.categoryId?.emoji} {product.categoryId?.name}
                </Typography>
              </Box>
            </Box>

            {/* Tavsif - to'liq kengliak */}
            {product.description && (
              <Box>
                <Typography variant="body2" color="textSecondary" fontWeight="bold">
                  📄 Tavsif:
                </Typography>
                <Typography variant="body2">
                  {product.description}
                </Typography>
              </Box>
            )}

            {/* Narx va Holat - yonma-yon */}
            <Box display="flex" gap={2}>
              <Box flex={1}>
                <Typography variant="body2" color="textSecondary" fontWeight="bold">
                  💰 Narx:
                </Typography>
                <Typography variant="h6" color="primary" fontWeight="bold">
                  {product.price.toLocaleString()} so'm
                </Typography>
              </Box>
              <Box flex={1}>
                <Typography variant="body2" color="textSecondary" fontWeight="bold">
                  🔄 Holat:
                </Typography>
                <Chip 
                  label={product.isActive ? 'Faol' : 'Nofaol'}
                  color={product.isActive ? 'success' : 'default'}
                  size="small"
                />
              </Box>
            </Box>

            {/* Qo'shilgan sana */}
            <Box>
              <Typography variant="body2" color="textSecondary" fontWeight="bold">
                📅 Qo'shilgan:
              </Typography>
              <Typography variant="body2">
                {new Date(product.createdAt).toLocaleDateString('uz-UZ')}
              </Typography>
            </Box>

          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} variant="contained" fullWidth>
          Yopish
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductViewDialog;