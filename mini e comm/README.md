# Fieldwork

A small storefront frontend and REST API for the Authentication & Product CRUD assignment. The React app talks to an Express API backed by MongoDB. Accounts use bcrypt password hashes, short-lived JWT access tokens, and a rotating refresh token stored as a hash in MongoDB and sent in an httpOnly cookie. Product create, update, and delete operations require authentication and are limited to the product owner.

## Requirements

- Node.js 18 or newer
- MongoDB running locally, or a MongoDB Atlas connection string

## Run locally

1. Install frontend dependencies from this folder:

   ```sh
   npm install
   ```

2. Install API dependencies:

   ```sh
   cd server
   npm install
   ```

3. Create `server/.env` from `server/.env.example`. Set `MONGODB_URI` and use two different random values for `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET`. Generate a value with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

4. Start MongoDB, then start the API in one terminal:

   ```sh
   cd server
   npm run dev
   ```

5. Start the frontend from the project root in another terminal:

   ```sh
   npm run dev
   ```

   Open <http://localhost:3000>. Vite proxies `/api` requests to `http://localhost:4000`. The API health check is available at `http://localhost:4000/api/health`.

For a deployed frontend, serve the API under the same site or configure the frontend API origin and `CLIENT_ORIGIN` for your deployment. Set `NODE_ENV=production` so refresh cookies are marked `Secure`; production must use HTTPS.

## API

All request and response bodies use JSON except the refresh token, which is carried only in the `fieldwork_refresh` httpOnly cookie. Authenticated routes expect `Authorization: Bearer <accessToken>`. Access tokens expire after 15 minutes; refresh tokens expire after 7 days and are rotated on refresh. Registration returns no tokens. Passwords are hashed with bcryptjs using 12 rounds and are never included in responses.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Create an account (`name`, `email`, `password`, `confirmPassword`) |
| `POST` | `/api/auth/login` | Public | Verify credentials and issue tokens |
| `POST` | `/api/auth/refresh-token` | Refresh cookie | Rotate refresh token and issue an access token |
| `POST` | `/api/auth/logout` | Access token | Revoke the stored refresh token and clear its cookie |
| `GET` | `/api/auth/me` | Access token | Get the current user's public profile |
| `GET` | `/api/products` | Public | List products; accepts `search`, `category`, `page`, and `limit` query parameters |
| `GET` | `/api/products/:id` | Public | Get a product by MongoDB ID |
| `POST` | `/api/products` | Access token | Create a product owned by the current user |
| `PUT` | `/api/products/:id` | Access token | Update one or more fields on an owned product |
| `DELETE` | `/api/products/:id` | Access token | Delete an owned product |

Product fields are `name`, `description`, `category`, `price`, `stock`, and `image`. Price must be greater than zero, stock must be a non-negative integer, and image must be an HTTP(S) URL when supplied. Every accepted body, query value, and route ID is validated with express-validator. Validation responses have this shape:

```json
{
  "message": "Validation failed.",
  "errors": [
    { "field": "email", "location": "body", "msg": "Enter a valid email address." }
  ]
}
```

## Frontend

The storefront provides product search and category filters, a local shopping bag, account registration/sign-in, and owner-only product create/edit/delete forms. The access token stays in memory; the browser sends the refresh cookie automatically and the client requests a new access token after an authenticated request expires.