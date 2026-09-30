import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const emptyProduct = { name: '', description: '', category: '', price: '', stock: '', image: '' };

function App() {
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authOpen, setAuthOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [productForm, setProductForm] = useState(emptyProduct);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fieldwork-cart') || '[]'); } catch { return []; }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const categories = useMemo(() => [...new Set(products.map((product) => product.category).filter(Boolean))].sort(), [products]);

  async function loadProducts() {
    setLoading(true);
    setError('');
    try {
      const data = await api.products({ search: search.trim(), category, limit: '60' });
      setProducts(data.products);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    api.restoreSession().then((restoredUser) => {
      if (active) setUser(restoredUser);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadProducts, 250);
    return () => window.clearTimeout(timer);
  }, [search, category]);

  useEffect(() => {
    localStorage.setItem('fieldwork-cart', JSON.stringify(cart));
  }, [cart]);

  async function submitAuth(event) {
    event.preventDefault();
    setError('');
    try {
      if (authMode === 'register') {
        await api.register(authForm);
        setAuthMode('login');
        setAuthForm((form) => ({ ...form, password: '', confirmPassword: '' }));
        setNotice('Account created. Sign in to continue.');
      } else {
        setUser(await api.login(authForm));
        setAuthOpen(false);
        setAuthForm({ name: '', email: '', password: '', confirmPassword: '' });
      }
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function signOut() {
    try { await api.logout(); } catch (requestError) { setError(requestError.message); }
    setUser(null);
  }

  function openProductEditor(product = null) {
    setEditingProduct(product);
    setProductForm(product ? {
      name: product.name,
      description: product.description || '',
      category: product.category,
      price: String(product.price),
      stock: String(product.stock),
      image: product.image || '',
    } : emptyProduct);
    setProductOpen(true);
    setError('');
  }

  async function submitProduct(event) {
    event.preventDefault();
    setError('');
    const values = { ...productForm, price: Number(productForm.price), stock: Number(productForm.stock) };
    try {
      if (editingProduct) await api.updateProduct(editingProduct._id, values);
      else await api.createProduct(values);
      setProductOpen(false);
      setNotice(editingProduct ? 'Product updated.' : 'Product added to the edit.');
      await loadProducts();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function removeProduct(product) {
    if (!window.confirm(`Delete “${product.name}”? This cannot be undone.`)) return;
    try {
      await api.deleteProduct(product._id);
      setNotice('Product deleted.');
      await loadProducts();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function addToCart(product) {
    setCart((items) => {
      const existing = items.find((item) => item._id === product._id);
      return existing
        ? items.map((item) => item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...items, { ...product, quantity: 1 }];
    });
    setNotice('Added to your bag.');
  }

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <div className="site-shell">
      <div className="announcement">A little more considered. A lot more useful. <span>Explore the edit <span aria-hidden="true">↗</span></span></div>
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="Fieldwork home">fieldwork<span>.</span></a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#collection">Shop all</a>
          <a href="#collection">The everyday edit</a>
        </nav>
        <div className="header-actions">
          {user ? <><span className="welcome">Hi, {user.name.split(' ')[0]}</span><button className="text-button" onClick={signOut}>Sign out</button></> : <button className="text-button" onClick={() => { setAuthMode('login'); setAuthOpen(true); }}>Sign in</button>}
          <button className="bag-button" onClick={() => setCartOpen(true)} aria-label={`Open bag, ${cartCount} items`}>Bag <span>{cartCount}</span></button>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-mark" /> GOOD THINGS, WELL CHOSEN</p>
            <h1>Everyday,<br /><em>better.</em></h1>
            <p className="hero-description">Useful things with a little more thought behind them. Made to work hard, look good and stick around.</p>
            <a className="hero-link" href="#collection">Find your new favourite <span aria-hidden="true">↓</span></a>
            <div className="hero-index"><span>01 / 04</span><span className="index-line" /></div>
          </div>
          <div className="hero-image" role="img" aria-label="A curated collection of everyday objects">
            <div className="hero-image-label"><span>THE DAILY EDIT</span><span>NO. 001 — OBJECTS</span></div>
            <div className="hero-stamp">LESS,<br />BUT<br /><i>better</i></div>
          </div>
          <div className="hero-side-note">THOUGHTFULLY SOURCED · MADE FOR THE LONG RUN</div>
        </section>

        <section className="collection" id="collection">
          <div className="collection-heading">
            <div><p className="eyebrow">A GOOD PLACE TO START</p><h2>The everyday edit<span>.</span></h2></div>
            <p className="collection-note">Small upgrades. Big difference.</p>
          </div>
          <div className="shop-tools">
            <label className="search-box"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find something good" aria-label="Search products" /><kbd>/</kbd></label>
            <div className="filter-row">
              <button className={!category ? 'filter-chip active' : 'filter-chip'} onClick={() => setCategory('')}>Everything</button>
              {categories.map((item) => <button key={item} className={category === item ? 'filter-chip active' : 'filter-chip'} onClick={() => setCategory(category === item ? '' : item)}>{item}</button>)}
            </div>
            {user && <button className="add-product-button" onClick={() => openProductEditor()}><span aria-hidden="true">+</span> Add a product</button>}
          </div>

          {notice && <div className="notice" role="status">{notice}<button aria-label="Dismiss message" onClick={() => setNotice('')}>×</button></div>}
          {error && !authOpen && !productOpen && <div className="error-banner" role="alert">{error}<button onClick={() => setError('')}>Dismiss</button></div>}
          {loading ? <div className="loading-state"><span className="loader" />Finding the good stuff…</div> : error && !products.length ? <div className="empty-state"><span>!</span><h3>We couldn’t reach the shop.</h3><p>{error}</p><button className="outline-button" onClick={loadProducts}>Try again</button></div> : products.length ? <div className="product-grid">
            {products.map((product, index) => <article className="product-card" key={product._id}>
              <div className={`product-image image-tone-${index % 4}`}>
                {product.image ? <img src={product.image} alt={product.name} loading="lazy" /> : <div className="image-placeholder"><span>{product.category || 'FIELDWORK'}</span><strong>{product.name}</strong></div>}
                <span className="product-tag">{product.category}</span>
                <button className="quick-add" onClick={() => addToCart(product)} aria-label={`Add ${product.name} to bag`}>+</button>
              </div>
              <div className="product-info"><div><p className="product-category">{product.category}</p><h3>{product.name}</h3></div><span className="product-price">{money.format(product.price)}</span></div>
              <div className="product-foot"><span>{product.stock > 0 ? 'In stock' : 'Sold out'}</span>{user && product.owner === user.id && <div className="owner-actions"><button onClick={() => openProductEditor(product)}>Edit</button><button onClick={() => removeProduct(product)}>Delete</button></div>}</div>
            </article>)}
          </div> : <div className="empty-state"><span>✳</span><h3>Nothing on this shelf. Yet.</h3><p>Try another search, or come back soon.</p>{user && <button className="outline-button" onClick={() => openProductEditor()}>Add a product</button>}</div>}
          <div className="collection-foot"><span>GOOD THINGS, NO FUSS.</span><span>{products.length} {products.length === 1 ? 'FIND' : 'FINDS'}</span></div>
        </section>
        <section className="manifesto"><span className="manifesto-mark">✳</span><p>Buy less. Choose well.<br /><em>Make it last.</em></p><span className="manifesto-caption">A SMALLER, BETTER WAY TO SHOP.</span></section>
      </main>

      <footer className="footer"><a className="wordmark" href="#top">fieldwork<span>.</span></a><span>Good things, for the everyday.</span><span>© 2026 FIELDWORK</span></footer>

      {authOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthOpen(false); }}><section className="modal auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="modal-close" onClick={() => { setAuthOpen(false); setError(''); }} aria-label="Close">×</button>
        <p className="eyebrow">GOOD TO HAVE YOU</p><h2 id="auth-title">{authMode === 'login' ? 'Welcome back.' : 'Make yourself at home.'}</h2><p className="modal-intro">{authMode === 'login' ? 'Sign in to manage your products and picks.' : 'Create an account to start adding to the edit.'}</p>
        <form onSubmit={submitAuth} className="stacked-form">
          {authMode === 'register' && <label>Your name<input autoComplete="name" required minLength="2" value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} /></label>}
          <label>Email address<input type="email" autoComplete="email" required value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} /></label>
          <label>Password<input type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} required minLength="8" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} /></label>
          {authMode === 'register' && <label>Confirm password<input type="password" autoComplete="new-password" required value={authForm.confirmPassword} onChange={(event) => setAuthForm({ ...authForm, confirmPassword: event.target.value })} /></label>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="solid-button" type="submit">{authMode === 'login' ? 'Sign in' : 'Create account'} <span aria-hidden="true">↗</span></button>
        </form>
        <p className="modal-switch">{authMode === 'login' ? 'New around here?' : 'Already have an account?'} <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError(''); }}> {authMode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
      </section></div>}

      {productOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setProductOpen(false); }}><section className="modal product-modal" role="dialog" aria-modal="true" aria-labelledby="product-title">
        <button className="modal-close" onClick={() => { setProductOpen(false); setError(''); }} aria-label="Close">×</button>
        <p className="eyebrow">THE EVERYDAY EDIT</p><h2 id="product-title">{editingProduct ? 'A little update.' : 'Add something good.'}</h2>
        <form onSubmit={submitProduct} className="stacked-form">
          <label>Product name<input required minLength="2" maxLength="100" value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} /></label>
          <label>Description<textarea rows="3" maxLength="1000" value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} /></label>
          <div className="form-columns"><label>Category<input required maxLength="50" value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })} /></label><label>Price (INR)<input type="number" required min="0.01" step="0.01" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} /></label></div>
          <div className="form-columns"><label>Stock<input type="number" required min="0" step="1" value={productForm.stock} onChange={(event) => setProductForm({ ...productForm, stock: event.target.value })} /></label><label>Image URL<input type="url" placeholder="https://…" value={productForm.image} onChange={(event) => setProductForm({ ...productForm, image: event.target.value })} /></label></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="solid-button" type="submit">{editingProduct ? 'Save changes' : 'Add to the edit'} <span aria-hidden="true">↗</span></button>
        </form>
      </section></div>}

      {cartOpen && <div className="drawer-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false); }}><aside className="cart-drawer" aria-label="Shopping bag"><div className="drawer-head"><div><p className="eyebrow">YOUR GOOD THINGS</p><h2>The bag <span>({cartCount})</span></h2></div><button className="modal-close" onClick={() => setCartOpen(false)} aria-label="Close bag">×</button></div>
        <div className="cart-lines">{cart.length ? cart.map((item) => <div className="cart-line" key={item._id}><div className="cart-line-image">{item.image && <img src={item.image} alt="" />}</div><div className="cart-line-info"><span>{item.name}</span><small>{money.format(item.price)}</small><div className="quantity-control"><button onClick={() => setCart((items) => items.flatMap((entry) => entry._id !== item._id ? [entry] : entry.quantity > 1 ? [{ ...entry, quantity: entry.quantity - 1 }] : []))} aria-label={`Remove one ${item.name}`}>−</button><span>{item.quantity}</span><button onClick={() => setCart((items) => items.map((entry) => entry._id === item._id ? { ...entry, quantity: entry.quantity + 1 } : entry))} aria-label={`Add one ${item.name}`}>+</button></div></div><button className="remove-line" onClick={() => setCart((items) => items.filter((entry) => entry._id !== item._id))} aria-label={`Remove ${item.name}`}>×</button></div>) : <div className="cart-empty"><span>✳</span><p>Your bag is taking a quiet moment.</p><button className="outline-button" onClick={() => setCartOpen(false)}>Back to the edit</button></div>}</div>
        {cart.length > 0 && <div className="cart-summary"><div><span>Subtotal</span><strong>{money.format(cartTotal)}</strong></div><p>Shipping and taxes are calculated at checkout.</p><button className="solid-button" onClick={() => setNotice('Checkout is not part of this assignment yet.')}>Continue to checkout <span aria-hidden="true">↗</span></button></div>}
      </aside></div>}
    </div>
  );
}

export default App;