## 🔄 Batchable Fetcher

Batchable Fetcher is a lightweight, browser-friendly JavaScript utility that integrates with Liferay.FnKit to intelligently batch, cache, and retry API requests. It improves performance and reduces backend load by combining multiple data requests into a single API call, or simulating batching for APIs that do not support it natively.

### ✅ Features

🔁 Debounced request batching to reduce redundant API calls

🧠 Supports batchable and non-batchable APIs out of the box

📦 TTL caching to avoid re-fetching already retrieved data

♻️ Automatic retries with exponential backoff for resilience

🛠️ Protocol-agnostic — works with REST, GraphQL, or OpenGraph

🔍 Structured logging hooks for easy debugging and observability

### 🚀 Why Use It?

When custom fragmens, which make API calls, are rendered within a Collection Display there can be a lot of chattiness. For example, where a custom fragment fetch individual records (e.g. product cards, user profiles), this utility reduces load on your backend by:

### 👉 📘 Usage Examples

#### 📘 Example 1: REST API

✅ Scenario
You have an endpoint like /api/products/:id, but you also support batch requests: /api/products?ids=1,2,3

```javascript
// Batch-compatible REST handler
const fetchProducts = async (ids) => {
  const res = await fetch(`/api/products?ids=${ids.join(',')}`);
  const data = await res.json(); // returns [{ id: 1, name: "X" }, { id: 2, name: "Y" }]
  return Object.fromEntries(
    data.map((product) => [product.id.toString(), product])
  );
};

const fetchProductById = Liferay.FnKit.createBatchedFetcher(fetchProducts, {
  cacheTTL: 5000,
  logger: (level, event, data) => console.log(`[${level}] ${event}`, data),
});

// Usage
fetchProductById(1).then(console.log);
fetchProductById(2).then(console.log);
```

#### 📘 Example 2: GraphQL / OpenGraph API

✅ Scenario
You have a GraphQL endpoint that supports batching with a query like:

```graphql
query GetUsers($ids: [ID!]!) {
  users(ids: $ids) {
    id
    name
    email
  }
}
```

```javascript
const fetchUsers = async (ids) => {
  const query = `
      query GetUsers($ids: [ID!]!) {
        users(ids: $ids) {
          id
          name
          email
        }
      }
    `;

  const response = await fetch('/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { ids } }),
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors.map((e) => e.message).join(', '));
  }

  const users = result.data.users;
  return Object.fromEntries(users.map((user) => [user.id, user]));
};

const fetchUserById = Liferay.FnKit.createBatchedFetcher(fetchUsers, {
  cacheTTL: 10000,
  logger: (level, event, data) => {
    if (level !== 'debug')
      console.log(`[${level.toUpperCase()}] ${event}`, data);
  },
});

// Usage
fetchUserById('abc-123').then(console.log);
```

#### 📘 Example 3: Non-Batchable REST API

✅ Scenario
Your API only supports individual requests like /api/products/:id

```javascript
// Non-batchable product fetcher (one request per ID)
  async function getProductById(id) {
    const res = await fetch(`/api/products/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch product ${id}`);
    return await res.json(); // returns single product object
  }

  // Batched fetcher that wraps single-ID handler
  const fetchProduct = Liferay.FnKit.createBatchedFetcher(getProductById, {
    batchable: false, // Important!
    cacheTTL: 5000,
    logger: (level, event, data) => {
      if (level !== 'debug') console.log(`[${level}] ${event}`, data);
    }
  });

  // Usage
  fetchProduct(101).then(console.log);
  fetchProduct(102).then(console.log);
```

⚙️ What Happens Under the Hood
The utility queues all incoming requests.

After the debounce period, it individually calls your getProductById(id) for each.

It bundles the results into a map so each caller gets the correct response.

You still get caching, retries, and deduplication — but not a real network batch.