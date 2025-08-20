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
  Switch,
  FormControlLabel,
  Box,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { uz } from 'date-fns/locale';
import apiService from '@/services/api';

interface PromoModalProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  branchId: string;
  branchName: string;
  currentPromo?: {
    discountType: 'percent' | 'amount' | null;
    discountValue: number | null;
    promoStart: Date | null;
    promoEnd: Date | null;
    isPromoActive: boolean;
  };
  onPromoUpdate: () => void;
}

const PromoModal: React.FC<PromoModalProps> = ({
  open,
  onClose,
  productId,
  productName,
  branchId,
  branchName,
  currentPromo,
  onPromoUpdate
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    discountType: 'percent' as 'percent' | 'amount' | null,
    discountValue: '',
    promoStart: null as Date | null,
    promoEnd: null as Date | null,
    isPromoActive: false
  });

  useEffect(() => {
    if (currentPromo) {
      setFormData({
        discountType: currentPromo.discountType,
        discountValue: currentPromo.discountValue?.toString() || '',
        promoStart: currentPromo.promoStart ? new Date(currentPromo.promoStart) : null,
        promoEnd: currentPromo.promoEnd ? new Date(currentPromo.promoEnd) : null,
        isPromoActive: currentPromo.isPromoActive
      });
    } else {
      setFormData({
        discountType: 'percent',
        discountValue: '',
        promoStart: null,
        promoEnd: null,
        isPromoActive: false
      });
    }
  }, [currentPromo]);

  const handleSubmit = async () => {
    if (!formData.discountValue || parseFloat(formData.discountValue) <= 0) {
      setError('Chegirma qiymati kiritilishi kerak');
      return;
    }

    if (formData.discountType === 'percent' && parseFloat(formData.discountValue) > 100) {
      setError('Foiz chegirma 100% dan oshmasligi kerak');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue),
        promoStart: formData.promoStart,
        promoEnd: formData.promoEnd,
        isPromoActive: formData.isPromoActive
      };

      await apiService.patch(`/admin/branches/${branchId}/products/${productId}/promo`, payload);
      onPromoUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Promo yangilashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleClearPromo = async () => {
    setLoading(true);
    setError('');

    try {
      const payload = {
        discountType: null,
        discountValue: null,
        promoStart: null,
        promoEnd: null,
        isPromoActive: false
      };

      await apiService.patch(`/admin/branches/${branchId}/products/${productId}/promo`, payload);
      onPromoUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Promoni o\'chirishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        🎯 Promo boshqaruvi
        <Typography variant="body2" color="text.secondary">
          {productName} - {branchName}
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.isPromoActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isPromoActive: e.target.checked }))}
              />
            }
            label="Promo faol"
          />

          <FormControl fullWidth>
            <InputLabel>Chegirma turi</InputLabel>
            <Select
              value={formData.discountType || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, discountType: e.target.value as 'percent' | 'amount' | null }))}
              label="Chegirma turi"
            >
              <MenuItem value="percent">Foiz (%)</MenuItem>
              <MenuItem value="amount">Miqdori (so'm)</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label={`Chegirma qiymati ${formData.discountType === 'percent' ? '(foiz)' : '(so\'m)'}`}
            value={formData.discountValue}
            onChange={(e) => setFormData(prev => ({ ...prev, discountValue: e.target.value }))}
            type="number"
            inputProps={{
              min: 0,
              max: formData.discountType === 'percent' ? 100 : undefined
            }}
          />

          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={uz}>
            <DatePicker
              label="Promo boshlanishi"
              value={formData.promoStart}
              onChange={(date) => setFormData(prev => ({ ...prev, promoStart: date }))}
              slotProps={{ textField: { fullWidth: true } }}
            />
            
            <DatePicker
              label="Promo tugashi"
              value={formData.promoEnd}
              onChange={(date) => setFormData(prev => ({ ...prev, promoEnd: date }))}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </LocalizationProvider>

          <Typography variant="body2" color="text.secondary">
            * Vaqt belgilanmasa, promo doimiy bo'ladi
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        {currentPromo && (
          <Button 
            onClick={handleClearPromo} 
            color="error" 
            disabled={loading}
          >
            Promoni o'chirish
          </Button>
        )}
        <Button onClick={onClose} disabled={loading}>
          Bekor
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          {loading ? 'Saqlanmoqda...' : 'Saqlash'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PromoModal;
