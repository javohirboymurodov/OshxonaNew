// Common Form Modal Hook - Modal va form logic uchun
import { useState, useCallback } from 'react';
import { Form } from 'antd';

interface UseFormModalOptions<T> {
  onSubmit: (data: T, editItem?: T | null) => Promise<void>;
  onSuccess?: () => void;
}

export function useFormModal<T>({ onSubmit, onSuccess }: UseFormModalOptions<T>) {
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editItem, setEditItem] = useState<T | null>(null);

  const openModal = useCallback((item?: T) => {
    setEditItem(item || null);
    setOpen(true);
    
    // Form'ni reset qilish va initial values set qilish
    if (item) {
      form.setFieldsValue(item);
    } else {
      form.resetFields();
    }
  }, [form]);

  const closeModal = useCallback(() => {
    setOpen(false);
    setEditItem(null);
    form.resetFields();
  }, [form]);

  const handleSubmit = useCallback(async (values: T) => {
    setLoading(true);
    try {
      await onSubmit(values, editItem);
      closeModal();
      onSuccess?.();
    } catch (error) {
      console.error('Form submit error:', error);
      // Error handling form'da ko'rsatiladi
    } finally {
      setLoading(false);
    }
  }, [onSubmit, editItem, closeModal, onSuccess]);

  return {
    form,
    open,
    loading,
    editItem,
    isEditing: !!editItem,
    openModal,
    closeModal,
    handleSubmit
  };
}
