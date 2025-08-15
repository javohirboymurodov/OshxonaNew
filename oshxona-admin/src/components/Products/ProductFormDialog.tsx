import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  Typography,
  Avatar,
  CircularProgress,
  FormControlLabel,
  Switch
} from '@mui/material';
import { PhotoCamera as PhotoCameraIcon } from '@mui/icons-material';

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

interface Category {
  _id: string;
  name: string;
  emoji?: string;
}

interface FormData {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  isActive: boolean;
}

interface ProductFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData, selectedFile: File | null) => Promise<void>;
  editProduct: Product | null;
  categories: Category[];
}

const ProductFormDialog: React.FC<ProductFormDialogProps> = ({
  open,
  onClose,
  onSubmit,
  editProduct,
  categories
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    price: 0,
    categoryId: '',
    isActive: true
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (editProduct && open) {
      setFormData({
        name: editProduct.name,
        description: editProduct.description,
        price: editProduct.price,
        categoryId: editProduct.categoryId?._id || '',
        isActive: editProduct.isActive
      });
      
      if (editProduct.image) {
        const fullImageUrl = editProduct.image.startsWith('http') 
          ? editProduct.image 
          : `http://localhost:5000${editProduct.image}`;
        setImagePreview(fullImageUrl);
      }
    } else if (open) {
      // Reset form for new product
      setFormData({
        name: '',
        description: '',
        price: 0,
        categoryId: '',
        isActive: true
      });
      setImagePreview('');
      setSelectedFile(null);
    }
    setError('');
  }, [editProduct, open]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError('');

      // Validation
      if (!formData.name.trim()) {
        setError('Mahsulot nomi kiritilishi shart!');
        return;
      }
      if (!formData.categoryId) {
        setError('Kategoriya tanlanishi shart!');
        return;
      }
      if (!formData.price || formData.price <= 0) {
        setError('Mahsulot narxi kiritilishi shart!');
        return;
      }

      await onSubmit(formData, selectedFile);
      onClose();
    } catch (error: any) {
      setError(error.message || 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
          {editProduct ? 'Mahsulotni Tahrirlash' : 'Yangi Mahsulot Qo\'shish'}
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {/* Mahsulot nomi */}
          <TextField
            fullWidth
            label="Mahsulot nomi *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
            disabled={submitting}
          />

          {/* Tavsif */}
          <TextField
            fullWidth
            label="Tavsif"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
            disabled={submitting}
          />

          {/* Narx */}
          <TextField
            fullWidth
            label="Narx (so'm) *"
            type="number"
            value={formData.price || ''}
            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
            margin="normal"
            disabled={submitting}
          />

          {/* Kategoriya */}
          <FormControl fullWidth margin="normal" disabled={submitting}>
            <InputLabel>Kategoriya *</InputLabel>
            <Select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              label="Kategoriya *"
            >
              {categories.map((category) => (
                <MenuItem key={category._id} value={category._id}>
                  {category.emoji} {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Holat */}
          <FormControlLabel
            control={
              <Switch
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                disabled={submitting}
              />
            }
            label="Faol holat"
            sx={{ mt: 1, mb: 1 }}
          />

          {/* Rasm yuklash */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Mahsulot rasmi
            </Typography>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="image-upload"
              type="file"
              onChange={handleFileChange}
              disabled={submitting}
            />
            <label htmlFor="image-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<PhotoCameraIcon />}
                fullWidth
                disabled={submitting}
              >
                Rasm tanlash
              </Button>
            </label>
            
            {/* Rasm preview */}
            {imagePreview && (
              <Box mt={2} display="flex" justifyContent="center">
                <Avatar
                  src={imagePreview}
                  alt="Preview"
                  sx={{ width: 100, height: 100 }}
                />
              </Box>
            )}
          </Box>

          {/* Xatolik xabari */}
          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={submitting}>
          Bekor qilish
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={submitting}
        >
          {submitting ? (
            <CircularProgress size={20} />
          ) : (
            editProduct ? 'Yangilash' : 'Qo\'shish'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductFormDialog;