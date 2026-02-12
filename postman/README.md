# Testing Case Flow

## Swagger

1. Start the server: `npm run dev`
2. Open **http://localhost:3000/api-docs**
3. Click **Authorize**, paste your JWT (get it from `POST /api/v1/auth/login` first, use the `token` from the response)
4. Use the **Cases**, **Vendor**, **Shops**, and **Shipments** tags to call the case-flow endpoints in order

## Postman

1. **Import** the collection: Postman → Import → `postman/case-flow-collection.json`

2. **Seed data** (one-time, in backend folder):
   - Shops: `node scripts/seed-shops.js`
   - Vendors: `node scripts/seed-vendors.js`

3. **Auth**: Run **1. Auth → Register** (or use existing user), then **1. Auth → Login**. The collection saves `authToken` automatically.

4. **Setup IDs**: Run **0. Setup** in order:
   - **Get Vehicles** — sets `vehicleId` from your first vehicle (add one via API or app if empty)
   - **Get Shops** — sets `shopId` from first approved shop
   - **Get Vendors** — sets `vendorId` from first vendor

5. **Case flow**: Run **2. Case Flow** requests in order. **Create Case** now requires `vehicleId` and `shopId` (filled by step 4). The collection auto-saves `caseId`, `installWindowId`, and `shipmentId` from responses.

### Collection variables

| Variable     | Set by                    |
|-------------|----------------------------|
| authToken   | Login                      |
| vehicleId   | 0. Setup → Get Vehicles    |
| shopId      | 0. Setup → Get Shops       |
| vendorId    | 0. Setup → Get Vendors     |
| caseId      | Create Case                |
| installWindowId | Propose Install Window |
| shipmentId  | Create Shipment            |
