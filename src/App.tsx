import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Upload, 
  X, 
  ShoppingBag, 
  Trash2, 
  ChevronRight,
  Sparkles,
  Smartphone,
  Search,
  Pencil,
  ShoppingCart,
  Settings,
  Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

// Types
interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  image: string;
  stock_quantity: number;
}

interface Sale {
  id: number;
  product_name: string;
  price: number;
  quantity: number;
  sale_date: string;
}

// Lazy initialization of Gemini AI
const getAI = () => {
  // Try to get the key from process.env (defined by Vite) or a fallback
  const apiKey = typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : null;
  
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is missing. AI features will be disabled.');
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

const STORAGE_KEYS = {
  PRODUCTS: 'mini_boutique_products',
  SALES: 'mini_boutique_sales',
  SETTINGS: 'mini_boutique_settings'
};

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Pink Glitter Case",
    price: 24.99,
    description: "A sparkling pink case that adds a touch of magic to your phone.",
    image: "https://picsum.photos/seed/pinkcase/800/600",
    stock_quantity: 12
  },
  {
    id: 2,
    name: "Pearl Charm Strap",
    price: 15.99,
    description: "Elegant pearl strap to keep your phone secure and stylish.",
    image: "https://picsum.photos/seed/pearl/800/600",
    stock_quantity: 8
  },
  {
    id: 3,
    name: "Holographic Pop Socket",
    price: 12.99,
    description: "Cute holographic grip for better handling and style.",
    image: "https://picsum.photos/seed/holo/800/600",
    stock_quantity: 20
  }
];

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [defaultPrice, setDefaultPrice] = useState('29.99');
  const [defaultStock, setDefaultStock] = useState('10');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Form State
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImage, setNewImage] = useState('');
  const [newStockQuantity, setNewStockQuantity] = useState('1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRestocking, setIsRestocking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load data from localStorage
    const storedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (storedProducts) {
      setProducts(JSON.parse(storedProducts));
    } else {
      setProducts(INITIAL_PRODUCTS);
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    }

    const storedSales = localStorage.getItem(STORAGE_KEYS.SALES);
    if (storedSales) {
      setSalesHistory(JSON.parse(storedSales));
    }

    const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (storedSettings) {
      const settings = JSON.parse(storedSettings);
      if (settings.default_price) setDefaultPrice(settings.default_price);
      if (settings.default_stock) setDefaultStock(settings.default_stock);
      if (settings.low_stock_threshold) setLowStockThreshold(settings.low_stock_threshold);
    }

    setLoading(false);
  }, []);

  const saveProductsToStorage = (updatedProducts: Product[]) => {
    setProducts(updatedProducts);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
  };

  const saveSalesToStorage = (updatedSales: Sale[]) => {
    setSalesHistory(updatedSales);
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(updatedSales));
  };

  const saveSettingsToStorage = (key: string, value: string) => {
    const currentSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}');
    const updatedSettings = { ...currentSettings, [key]: value };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));
  };

  const handleDeleteSale = (id: number) => {
    const updatedSales = salesHistory.filter(s => s.id !== id);
    saveSalesToStorage(updatedSales);
  };

  const updateSetting = (key: string, value: string) => {
    saveSettingsToStorage(key, value);
  };

  const handleRestock = (id: number, quantity: number) => {
    setIsRestocking(true);
    const updatedProducts = products.map(p => 
      p.id === id ? { ...p, stock_quantity: p.stock_quantity + quantity } : p
    );
    saveProductsToStorage(updatedProducts);
    setTimeout(() => setIsRestocking(false), 500);
  };

  const handleRestockAll = () => {
    const restockAmount = parseInt(defaultStock) || 10;
    setIsRestocking(true);
    const updatedProducts = products.map(p => 
      p.stock_quantity === 0 ? { ...p, stock_quantity: restockAmount } : p
    );
    saveProductsToStorage(updatedProducts);
    setTimeout(() => setIsRestocking(false), 800);
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const finalName = newName || 'Unnamed Accessory';
    const finalPrice = parseFloat(newPrice) || parseFloat(defaultPrice);
    const finalStock = parseInt(newStockQuantity) || parseInt(defaultStock);

    let updatedProducts: Product[];

    if (editingProduct) {
      updatedProducts = products.map(p => 
        p.id === editingProduct.id ? {
          ...p,
          name: finalName,
          price: finalPrice,
          description: newDescription,
          image: newImage || p.image,
          stock_quantity: finalStock
        } : p
      );
    } else {
      const newProduct: Product = {
        id: Date.now(),
        name: finalName,
        price: finalPrice,
        description: newDescription,
        image: newImage || 'https://picsum.photos/seed/accessory/800/600',
        stock_quantity: finalStock
      };
      updatedProducts = [...products, newProduct];
    }

    saveProductsToStorage(updatedProducts);
    resetForm();
    setIsModalOpen(false);
    setTimeout(() => setIsSaving(false), 500);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setNewName(product.name);
    setNewPrice(product.price.toString());
    setNewDescription(product.description || '');
    setNewImage(product.image);
    setNewStockQuantity(product.stock_quantity.toString());
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    const updatedProducts = products.filter(p => p.id !== id);
    saveProductsToStorage(updatedProducts);
  };

  const handleBuy = (id: number, currentQuantity: number) => {
    if (currentQuantity <= 0) return;
    const product = products.find(p => p.id === id);
    if (!product) return;

    const newQuantity = currentQuantity - 1;
    
    // Update products
    const updatedProducts = products.map(p => 
      p.id === id ? { ...p, stock_quantity: newQuantity } : p
    );
    saveProductsToStorage(updatedProducts);

    // Record sale
    const newSale: Sale = {
      id: Date.now(),
      product_name: product.name,
      price: product.price,
      quantity: 1,
      sale_date: new Date().toISOString()
    };
    const updatedSales = [newSale, ...salesHistory];
    saveSalesToStorage(updatedSales);
  };

  const handleUpdateStock = (id: number, newStock: number) => {
    if (newStock < 0) return;
    const updatedProducts = products.map(p => 
      p.id === id ? { ...p, stock_quantity: newStock } : p
    );
    saveProductsToStorage(updatedProducts);
  };

  const resetForm = () => {
    setNewName('');
    setNewPrice('');
    setNewDescription('');
    setNewImage('');
    setNewStockQuantity('1');
    setEditingProduct(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateDescription = async () => {
    if (!newName) return;
    const ai = getAI();
    if (!ai) {
      alert('Please configure your GEMINI_API_KEY in Vercel settings to use AI features.');
      return;
    }
    setIsGenerating(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Write a short, cute, and chic product description for a phone accessory named "${newName}". Keep it under 20 words.`,
      });
      setNewDescription(response.text || '');
    } catch (err) {
      console.error('AI generation failed', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 glass px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 pink-gradient rounded-xl flex items-center justify-center text-white shadow-lg shadow-pink-primary/30">
            <ShoppingBag size={20} />
          </div>
          <h1 className="text-xl font-display font-bold text-pink-dark">Aura Mini Boutique</h1>
        </div>
        <div className="flex items-center gap-2">
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 sm:px-6 mt-6 max-w-[1600px] mx-auto">
        {/* Search Bar */}
        <div className="relative mb-8">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
            <Search size={18} />
          </div>
          <input 
            type="text" 
            placeholder="Search accessories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border-none shadow-sm focus:ring-2 focus:ring-pink-primary transition-all text-sm"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-4 flex items-center text-gray-400"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-pink-light border-t-pink-primary rounded-full animate-spin" />
            <p className="text-pink-dark font-medium">Loading collection...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 px-10 glass rounded-3xl">
            <div className="w-20 h-20 bg-pink-light/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Smartphone className="text-pink-primary" size={40} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {searchQuery ? 'No Results Found' : 'No Accessories Yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery 
                ? `We couldn't find anything matching "${searchQuery}"`
                : 'Start your boutique by adding your first phone accessory!'}
            </p>
            {!searchQuery && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-3 pink-gradient text-white rounded-2xl font-bold shadow-lg shadow-pink-primary/30"
              >
                Add Product
              </button>
            )}
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-pink-dark font-bold text-sm underline"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {filteredProducts.map((product) => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={product.id}
                className="glass rounded-3xl overflow-hidden group relative"
              >
                <div className="aspect-[4/3] relative overflow-hidden group">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />

                  {/* Low Stock Indicator */}
                  {product.stock_quantity > 0 && product.stock_quantity <= parseInt(lowStockThreshold) && (
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-20">
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500 text-white rounded-full shadow-lg animate-pulse">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Low Stock</span>
                      </div>
                    </div>
                  )}

                  {/* Out of Stock Overlay */}
                  {product.stock_quantity <= 0 && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-20">
                      <span className="px-4 py-2 bg-gray-800 text-white rounded-full font-bold text-xs uppercase tracking-widest shadow-xl">
                        Sold Out
                      </span>
                    </div>
                  )}
                  
                  {/* Price Tag */}
                  <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 z-10">
                    <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-white/90 backdrop-blur-sm rounded-full text-pink-dark font-bold text-[10px] sm:text-sm shadow-sm">
                      ${product.price.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="p-3 sm:p-5 relative">
                  {/* Admin Controls */}
                  <div className="absolute -top-12 right-2 flex gap-1 z-10">
                    <button 
                      onClick={() => handleEdit(product)}
                      className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm text-pink-primary flex items-center justify-center hover:bg-pink-primary hover:text-white transition-all shadow-md"
                    >
                      <Pencil size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete(product.id)}
                      className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-md"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-2 mb-2 sm:mb-2">
                    <div className="flex flex-col">
                      <h3 className={`text-xs sm:text-lg font-bold leading-tight ${product.stock_quantity > 0 ? 'text-gray-800' : 'text-gray-400'}`}>{product.name}</h3>
                      <span className={`text-[9px] sm:text-xs font-bold uppercase tracking-wider ${product.stock_quantity > 0 ? 'text-pink-dark' : 'text-gray-400'}`}>
                        Qty: {product.stock_quantity}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleBuy(product.id, product.stock_quantity)}
                      disabled={product.stock_quantity <= 0}
                      className={`flex items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-xs transition-all w-full sm:w-auto justify-center ${
                        product.stock_quantity > 0 
                          ? 'bg-pink-primary text-white shadow-md shadow-pink-primary/20 active:scale-95' 
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <ShoppingCart size={12} className="sm:hidden" />
                      <ShoppingCart size={14} className="hidden sm:block" />
                      <span>Buy</span>
                    </button>
                  </div>
                  <p className="text-[10px] sm:text-sm text-gray-500 line-clamp-2 hidden sm:block">{product.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Add Product Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-display font-bold text-gray-800">
                    {editingProduct ? 'Edit Accessory' : 'Add Accessory'}
                  </h2>
                  <button 
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleAddProduct} className="space-y-4">
                  {/* Image Selector */}
                  <div className="relative aspect-video rounded-2xl bg-pink-light/10 border-2 border-dashed border-pink-light overflow-hidden flex flex-col items-center justify-center gap-2">
                    {newImage ? (
                      <>
                        <img src={newImage} className="w-full h-full object-cover" alt="Preview" />
                        <button 
                          type="button"
                          onClick={() => setNewImage('')}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <div className="flex gap-3">
                        <label className="flex flex-col items-center gap-1.5 p-4 rounded-xl hover:bg-pink-light/20 transition-colors cursor-pointer">
                          <div className="w-10 h-10 rounded-full bg-pink-light text-pink-dark flex items-center justify-center">
                            <Upload size={20} />
                          </div>
                          <span className="text-[10px] font-bold text-pink-dark">Upload Image</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                        </label>
                      </div>
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Product Name</label>
                      <input 
                        type="text" 
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Glitter Phone Case"
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border-none text-sm focus:ring-2 focus:ring-pink-primary transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Price ($)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        placeholder={defaultPrice}
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border-none text-sm focus:ring-2 focus:ring-pink-primary transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Stock</label>
                      <input 
                        type="number" 
                        min="0"
                        value={newStockQuantity}
                        onChange={(e) => setNewStockQuantity(e.target.value)}
                        placeholder={defaultStock}
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border-none text-sm focus:ring-2 focus:ring-pink-primary transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Description</label>
                      <button 
                        type="button"
                        onClick={generateDescription}
                        disabled={isGenerating || !newName}
                        className="text-[10px] font-bold text-pink-dark flex items-center gap-1 hover:opacity-80 disabled:opacity-30"
                      >
                        {isGenerating ? 'Generating...' : <><Sparkles size={10} /> AI Write</>}
                      </button>
                    </div>
                    <textarea 
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Tell us about this mini accessory..."
                      rows={2}
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border-none text-sm focus:ring-2 focus:ring-pink-primary transition-all resize-none"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-3.5 pink-gradient text-white rounded-xl font-bold text-base shadow-lg shadow-pink-primary/20 disabled:opacity-70 disabled:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{editingProduct ? 'Saving...' : 'Publishing...'}</span>
                      </>
                    ) : (
                      editingProduct ? 'Save Changes' : 'Publish to Store'
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Nav (Mobile Feel) */}
      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-white/20 px-6 py-4 flex justify-around items-center z-40">
        <button 
          onClick={() => {
            setIsHistoryOpen(false);
            setIsStatsOpen(false);
          }}
          className={!isHistoryOpen && !isStatsOpen ? "text-pink-dark" : "text-gray-400"}
        >
          <Smartphone size={24} />
        </button>
        <button 
          onClick={() => {
            setIsHistoryOpen(true);
            setIsStatsOpen(false);
          }}
          className={isHistoryOpen ? "text-pink-dark" : "text-gray-400"}
        >
          <ShoppingCart size={24} />
        </button>
        
        {/* Floating Add Button */}
        <div className="relative -top-6">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-14 h-14 rounded-full bg-pink-primary text-white flex items-center justify-center shadow-xl shadow-pink-primary/30 hover:scale-110 transition-transform active:scale-95"
          >
            <Plus size={32} />
          </button>
        </div>

        <button 
          onClick={() => {
            setIsStatsOpen(true);
            setIsHistoryOpen(false);
          }}
          className={isStatsOpen ? "text-pink-dark" : "text-gray-400"}
        >
          <Settings size={24} />
        </button>
      </nav>

      {/* Stats Modal (Full Page) */}
      <AnimatePresence>
        {isStatsOpen && (
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden"
          >
            <div className="p-6 sm:p-10 flex justify-between items-center border-b border-gray-100 bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-3xl font-display font-bold text-gray-800">Settings & Analytics</h2>
                <p className="text-sm text-gray-500">Manage your boutique and track performance</p>
              </div>
              <button 
                onClick={() => setIsStatsOpen(false)}
                className="w-12 h-12 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto p-6 sm:p-10">
                <div className="space-y-12 pb-20">
                  {/* Default Values Section */}
                  <section>
                    <h2 className="text-xl font-display font-bold text-gray-800 mb-6 flex items-center gap-2">
                      <Settings size={20} className="text-pink-dark" />
                      Store Settings
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 ml-1">Default Price ($)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          value={defaultPrice}
                          onChange={(e) => {
                            setDefaultPrice(e.target.value);
                            updateSetting('default_price', e.target.value);
                          }}
                          className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-none text-sm focus:ring-2 focus:ring-pink-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 ml-1">Default Stock</label>
                        <input 
                          type="number" 
                          value={defaultStock}
                          onChange={(e) => {
                            setDefaultStock(e.target.value);
                            updateSetting('default_stock', e.target.value);
                          }}
                          className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-none text-sm focus:ring-2 focus:ring-pink-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 ml-1">Low Stock Threshold</label>
                        <input 
                          type="number" 
                          value={lowStockThreshold}
                          onChange={(e) => {
                            setLowStockThreshold(e.target.value);
                            updateSetting('low_stock_threshold', e.target.value);
                          }}
                          className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-none text-sm focus:ring-2 focus:ring-pink-primary"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Inventory Management Section */}
                  <section className="relative">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Inventory Management</h3>
                      {products.some(p => p.stock_quantity === 0) && (
                        <button 
                          onClick={handleRestockAll}
                          disabled={isRestocking}
                          className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full hover:bg-emerald-100 transition-colors disabled:opacity-50"
                        >
                          {isRestocking ? 'Restocking...' : 'Restock All Sold Out'}
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-3 relative min-h-[100px]">
                      {isRestocking && (
                        <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Updating Stock...</p>
                          </div>
                        </div>
                      )}

                      {products.filter(p => p.stock_quantity === 0).length === 0 ? (
                        <div className="p-4 rounded-2xl bg-gray-50 border border-dashed border-gray-200 text-center">
                          <p className="text-xs text-gray-400">All products are currently in stock!</p>
                        </div>
                      ) : (
                        products.filter(p => p.stock_quantity === 0).map(p => (
                          <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                            <div className="flex items-center gap-3">
                              <img src={p.image} className="w-10 h-10 rounded-lg object-cover" alt={p.name} />
                              <div>
                                <p className="text-sm font-bold text-gray-800 leading-tight">{p.name}</p>
                                <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Sold Out</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleRestock(p.id, parseInt(defaultStock) || 10)}
                              disabled={isRestocking}
                              className="px-4 py-2 bg-white text-emerald-600 text-xs font-bold rounded-xl shadow-sm border border-emerald-100 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                            >
                              Restock (+{defaultStock})
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  {/* Analytics Section */}
                  <section className="space-y-6">
                    <h2 className="text-xl font-display font-bold text-gray-800 mb-6 flex items-center gap-2">
                      <ShoppingCart size={20} className="text-emerald-600" />
                      Store Analytics
                    </h2>
                    
                    {/* Inventory Value */}
                    <div className="glass p-6 rounded-3xl border-pink-100 bg-pink-50/30">
                      <p className="text-xs font-bold text-pink-600 uppercase tracking-widest mb-2">Total Inventory Value</p>
                      <p className="text-4xl font-display font-bold text-pink-dark">
                        ${products.reduce((acc, p) => acc + (p.price * p.stock_quantity), 0).toFixed(2)}
                      </p>
                    </div>

                    {/* Sales Summary */}
                    <div className="glass p-6 rounded-3xl border-emerald-100 bg-emerald-50/30">
                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">Total Sales Revenue</p>
                      <p className="text-4xl font-display font-bold text-emerald-700">
                        ${salesHistory.reduce((acc, s) => acc + (s.price * s.quantity), 0).toFixed(2)}
                      </p>
                    </div>

                    {/* Stock Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="glass p-5 rounded-3xl border-blue-100 bg-blue-50/30">
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Items In Stock</p>
                        <p className="text-2xl font-display font-bold text-blue-700">
                          {products.reduce((acc, p) => acc + p.stock_quantity, 0)}
                        </p>
                      </div>
                      <div className="glass p-5 rounded-3xl border-orange-100 bg-orange-50/30">
                        <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-1">Out of Stock</p>
                        <p className="text-2xl font-display font-bold text-orange-700">
                          {products.filter(p => p.stock_quantity === 0).length}
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sales History (Full Page) */}
      <AnimatePresence>
        {isHistoryOpen && (
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden"
          >
            <div className="p-6 sm:p-10 flex justify-between items-center border-b border-gray-100 bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-3xl font-display font-bold text-gray-800">Sales History</h2>
                <p className="text-sm text-gray-500">Track your boutique's recent transactions</p>
              </div>
              <button 
                onClick={() => setIsHistoryOpen(false)}
                className="w-12 h-12 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto p-6 sm:p-10">
                {salesHistory.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShoppingCart size={32} className="text-gray-300" />
                    </div>
                    <p className="text-gray-400 italic">No sales recorded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4 pb-20">
                    {salesHistory.map((sale) => (
                      <div key={sale.id} className="glass p-6 rounded-3xl border-gray-100 relative group/sale hover:border-pink-200 transition-all">
                        <button 
                          onClick={() => handleDeleteSale(sale.id)}
                          className="absolute top-4 right-4 w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center text-gray-300 hover:text-red-500 hover:shadow-md transition-all z-10 border border-gray-100"
                        >
                          <X size={16} />
                        </button>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-dark">
                              <ShoppingCart size={24} />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-800 text-lg">{sale.product_name}</h4>
                              <p className="text-xs text-gray-400">
                                {new Date(sale.sale_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {new Date(sale.sale_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-display font-bold text-pink-dark">${sale.price.toFixed(2)}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quantity: {sale.quantity}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
