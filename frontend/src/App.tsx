import { useEffect, useState } from 'react'
import './App.css'


type Product = {
  id: number
  name: string
  description: string
  price: string
  stock_quantity: number
}


type ProductsResponse = {
  status: string
  count: number
  products: Product[]
}



function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')


  useEffect(() => {
    fetch('/api/products')
    
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to retrieve products')
        }

        return response.json()
      })

      .then((data: ProductsResponse) => {
        setProducts(data.products)
      })

      .catch(() => {
        setError('Unable to load products from the backend.')
      })

      .finally(() => {
        setLoading(false)
      })
  }, [])


  
  return (
    <div className="app-container">

      <header className="site-header">
        <h1>MiniShop App. | Automated CI/CD Run Re-Test</h1>
        <p>Your go-to online shopping destination.</p>
      </header>

      <main className="main-content">
        <section className="catalogue-panel">
          <h2>Product Catalogue</h2>
          <p className="catalogue-description">
            Explore our selection of everyday technology essentials, with product information and availability retrieved directly from a connected PostgreSQL database.
          </p>

          {loading && <p>Loading products...</p>}

          {error && (
            <p className="error-message">{error}</p>
          )}

          {!loading && !error && products.length === 0 && (
            <p>No products are currently available.</p>
          )}


          <div className="product-grid">
            {products.map((product) => (
              <article className="product-card" key={product.id}>
                <h3>{product.name}</h3>

                <p>{product.description}</p>

                <p className="product-price">
                  ${Number(product.price).toFixed(2)}
                </p>

                <p className="product-stock">
                  Stock: {product.stock_quantity} available
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <p>SWE40006 - Software Deployment & Evolution</p>
        <p>© MiniShop Application 2026</p>
      </footer>

    </div>
  )
}

export default App
