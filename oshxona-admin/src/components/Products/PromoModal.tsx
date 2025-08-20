import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
  Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, addDays } from 'date-fns';

interface PromoModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (promoData: PromoData) => Promise<void>;
  product?: ProductWithPromo;
  isSuperAdmin?: boolean;
}

interface PromoData {
  discountType: 'percent' | 'amount';
  discountValue: number;
  promoStart: Date | null;
  promoEnd: Date | null;
  isPromoActive: boolean;
  applyToAllBranches?: boolean;
}

interface ProductWithPromo {
  _id: string;
  name: string;
  price: number;
  discount?: {
    type: 'percent' | 'amount';
    value: number;
  };
  originalPrice?: number;
}

const PromoModal: React.FC<PromoModalProps> = ({
  open,
  onClose,
  onSubmit,
  product,
  isSuperAdmin = false
}) => {
  const [formData, setFormData] = useState<PromoData>({
    discountType: 'percent',
    discountValue: 0,
    promoStart: null,
    promoEnd: null,
    isPromoActive: true,
    applyToAllBranches: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (product && product.discount) {
      setFormData({
        discountType: product.discount.type,
        discountValue: product.discount.value,
        promoStart: null,
        promoEnd: null,
        isPromoActive: true,
        applyToAllBranches: false
      });
    } else {
      setFormData({
        discountType: 'percent',
        discountValue: 0,
        promoStart: null,
        promoEnd: null,
        isPromoActive: true,
        applyToAllBranches: false
      });
    }
  }, [product]);

  const handleSubmit = async () => {
    if (formData.discountValue <= 0) {
      setError('Chegirma qiymati 0 dan katta bo\'lishi kerak');
      return;
    }

    if (formData.discountType === 'percent' && formData.discountValue > 100) {
      setError('Foiz chegirma 100% dan oshmasligi kerak');
      return;
    }

    if (formData.promoStart && formData.promoEnd && formData.promoStart >= formData.promoEnd) {
      setError('Boshlanish sanasi tugash sanasidan oldin bo\'lishi kerak');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError('Promo qo\'shishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDates = (days: number) => {
    const start = new Date();
    const end = addDays(start, days);
    setFormData(prev => ({
      ...prev,
      promoStart: start,
      promoEnd: end
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {product ? 'Promo tahrirlash' : 'Yangi promo qo\'shish'}
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            {product?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Asosiy narx: {product?.price?.toLocaleString()} so'm
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Chegirma turi</InputLabel>
            <Select
              value={formData.discountType}
              onChange={(e) => setFormData(prev => ({ ...prev, discountType: e.target.value as 'percent' | 'amount' }))}
            >
              <MenuItem value="percent">Foiz (%)</MenuItem>
              <MenuItem value="amount">So'm</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label={formData.discountType === 'percent' ? 'Foiz (%)' : 'So\'m'}
            type="number"
            value={formData.discountValue}
            onChange={(e) => setFormData(prev => ({ ...prev, discountValue: Number(e.target.value) }))}
            inputProps={{
              min: 0,
              max: formData.discountType === 'percent' ? 100 : undefined
            }}
          />
        </Box>

        {formData.discountValue > 0 && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
            <Typography variant="body2" color="success.contrastText">
              Yangi narx: {(() => {
                if (!product?.price) return 'N/A';
                const originalPrice = product.price;
                let newPrice = originalPrice;
                
                if (formData.discountType === 'percent') {
                  newPrice = Math.max(Math.round(originalPrice * (1 - formData.discountValue / 100)), 0);
                } else {
                  newPrice = Math.max(originalPrice - formData.discountValue, 0);
                }
                
                return `${newPrice.toLocaleString()} so'm`;
              })()}
            </Typography>
          </Box>
        )}

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <DatePicker
              label="Boshlanish sanasi"
              value={formData.promoStart}
              onChange={(date) => setFormData(prev => ({ ...prev, promoStart: date }))}
              slotProps={{ textField: { fullWidth: true } }}
            />
            <DatePicker
              label="Tugash sanasi"
              value={formData.promoEnd}
              onChange={(date) => setFormData(prev => ({ ...prev, promoEnd: date }))}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Box>
        </LocalizationProvider>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Tezkor sanalar:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button size="small" variant="outlined" onClick={() => handleQuickDates(1)}>
              1 kun
            </Button>
            <Button size="small" variant="outlined" onClick={() => handleQuickDates(7)}>
              1 hafta
            </Button>
            <Button size="small" variant="outlined" onClick={() => handleQuickDates(30)}>
              1 oy
            </Button>
          </Box>
        </Box>

        {isSuperAdmin && (
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.applyToAllBranches}
                onChange={(e) => setFormData(prev => ({ ...prev, applyToAllBranches: e.target.checked }))}
              />
            }
            label="Barcha filiallarga qo'llash"
          />
        )}

        <FormControlLabel
          control={
            <Checkbox
              checked={formData.isPromoActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isPromoActive: e.target.checked }))}
            />
          }
          label="Promo faol"
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Bekor qilish
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={loading || formData.discountValue <= 0}
        >
          {loading ? 'Saqlanmoqda...' : (product ? 'Yangilash' : 'Qo\'shish')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PromoModal;
