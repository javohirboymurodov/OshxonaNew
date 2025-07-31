import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import ProductGrid from '@/components/ProductGrid';
import CategoryFilter from '@/components/CategoryFilter';
import SearchBar from '@/components/SearchBar';
import CartButton from '@/components/CartButton';
import { useProducts } from '@/hooks/useProducts';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { products, loading: productsLoading, error } = useProducts();
  const { cartCount } = useCart();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Filter products based on category and search
  const filteredProducts = products?.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  }) || [];

  if (!isClient) {
    return null; // Prevent hydration mismatch
  }

  return (
    <>
      <Head>
        <title>Oshxonabot - Eng mazali taomlar</title>
        <meta name="description" content="Oshxonabot orqali eng mazali taomlarni buyurtma qiling. Tez va sifatli yetkazib berish xizmati." />
        <meta name="keywords" content="oshxona, taom, buyurtma, yetkazib berish, restoran, pizza, burger" />
      </Head>

      <Layout>
        <div className="min-h-screen bg-gray-50">
          {/* Hero Section */}
          <section className="bg-gradient-to-r from-primary-600 to-secondary-500 text-white py-12">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center"
              >
                <h1 className="text-4xl md:text-6xl font-bold mb-4">
                  Oshxonabot
                </h1>
                <p className="text-xl md:text-2xl mb-6 opacity-90">
                  Eng mazali taomlar bir tugma bosish bilan
                </p>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Taom qidirish..."
                  />
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* Main Content */}
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Sidebar */}
              <motion.aside
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="lg:w-64 flex-shrink-0"
              >
                <div className="sticky top-4">
                  <CategoryFilter
                    selectedCategory={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                  />
                  
                  {/* Cart Summary */}
                  {cartCount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6"
                    >
                      <div className="card">
                        <h3 className="font-semibold mb-3">Savat</h3>
                        <p className="text-gray-600 mb-4">
                          {cartCount} ta mahsulot
                        </p>
                        <CartButton className="w-full" />
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.aside>

              {/* Products Grid */}
              <motion.main
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="flex-1"
              >
                {productsLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <div className="text-red-500 mb-4">
                      <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Xatolik yuz berdi
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Mahsulotlarni yuklab olishda xatolik yuz berdi
                    </p>
                    <button
                      onClick={() => window.location.reload()}
                      className="btn-primary"
                    >
                      Qayta urinish
                    </button>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Hech narsa topilmadi
                    </h3>
                    <p className="text-gray-600">
                      {searchQuery 
                        ? `"${searchQuery}" bo'yicha hech narsa topilmadi`
                        : 'Bu kategoriyada mahsulot yo\'q'
                      }
                    </p>
                  </div>
                ) : (
                  <ProductGrid products={filteredProducts} />
                )}
              </motion.main>
            </div>
          </div>

          {/* Floating Cart Button for Mobile */}
          {cartCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="lg:hidden fixed bottom-4 right-4 z-50"
            >
              <CartButton />
            </motion.div>
          )}
        </div>
      </Layout>
    </>
  );
}
