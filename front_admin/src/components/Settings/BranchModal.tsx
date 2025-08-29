import React from 'react';
import { Modal, Form, Row, Col, Input, InputNumber, Switch, Button } from 'antd';
import { Branch } from './types';

const { TextArea } = Input;

interface Props {
  open: boolean;
  initialValues?: Partial<Branch> | null;
  onCancel: () => void;
  onSubmit: (values: any) => void;
  form: any;
}

const BranchModal: React.FC<Props> = ({ open, initialValues, onCancel, onSubmit, form }) => {
  return (
    <Modal title={initialValues?._id ? "Filialni tahrirlash" : "Yangi filial qo'shish"} open={open} onCancel={onCancel} footer={null} width={600}>
      <Form form={form} layout="vertical" onFinish={onSubmit} initialValues={initialValues || {}}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Filial nomi" name="name" rules={[{ required: true, message: 'Filial nomini kiriting!' }]}>
              <Input placeholder="Toshkent filiali" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Telefon" name="phone" rules={[{ required: true, message: 'Telefon raqamini kiriting!' }]}>
              <Input placeholder="+998712345678" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Manzil (ko'cha)" name={['address', 'street']} rules={[{ required: true, message: 'Ko\'chani kiriting!' }]}>
          <Input placeholder="Ko'cha, uy" />
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Shahar" name={['address', 'city']} rules={[{ required: true, message: 'Shaharni kiriting!' }]}>
              <Input placeholder="Shahar" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Tuman" name={['address', 'district']}>
              <Input placeholder="Tuman" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Ish boshlanishi" name={['workingHours', 'start']}>
              <Input placeholder="09:00" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Ish tugashi" name={['workingHours', 'end']}>
              <Input placeholder="23:00" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Latitude" name={['address','coordinates','latitude']} rules={[{ required: true, message: 'Latitude kiriting!' }]}> 
              <Input placeholder="41.3111" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Longitude" name={['address','coordinates','longitude']} rules={[{ required: true, message: 'Longitude kiriting!' }]}> 
              <Input placeholder="69.2797" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label={
                <span>
                  Yetkazib berish radiusi (km)
                </span>
              }
              tooltip="Agar DeliveryZone sozlangan bo'lsa, zona ustuvor ishlaydi. Radius faqat zona yo'qligida qo'llanadi."
              name="deliveryRadius"
              rules={[{ required: true, message: 'Radiusni kiriting!' }]}
            >
              <InputNumber placeholder="15" style={{ width: '100%' }} min={1} max={50} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Yetkazib berish narxi" name="deliveryFee" rules={[{ required: true, message: 'Narxni kiriting!' }]}>
              <InputNumber placeholder="15000" style={{ width: '100%' }} min={0} formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Faol holat" name="isActive" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Row justify="end" gutter={16}>
          <Col>
            <Button onClick={onCancel}>Bekor qilish</Button>
          </Col>
          <Col>
            <Button type="primary" htmlType="submit">{initialValues?._id ? 'Yangilash' : 'Yaratish'}</Button>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default BranchModal;


