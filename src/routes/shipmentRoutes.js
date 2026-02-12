const express = require('express');
const {
  trigger,
  setInTransit,
  setDelivered,
  addCustodyEvent,
  updateShipment,
} = require('../controllers/shipmentController');
const { authenticate, requireUser } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /shipments/{id}:
 *   patch:
 *     summary: Update draft shipment (trackingNumber, alertsEnabled, carrierWebhookRegistered)
 *     tags: [Shipments]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, properties: { trackingNumber: { type: string }, alertsEnabled: { type: boolean }, carrierWebhookRegistered: { type: boolean } } }
 *     responses:
 *       200: { description: Shipment updated }
 * /shipments/{id}/trigger:
 *   post:
 *     summary: Trigger shipment (requires alertsEnabled, trackingNumber, carrierWebhookRegistered). Sets case to SHIP_TRIGGERED.
 *     tags: [Shipments]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Shipment and case updated }
 * /shipments/{id}/transit:
 *   post:
 *     summary: Set shipment to IN_TRANSIT
 *     tags: [Shipments]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Shipment updated }
 * /shipments/{id}/delivered:
 *   post:
 *     summary: Set shipment to DELIVERED and case to DELIVERED
 *     tags: [Shipments]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Shipment and case updated }
 * /shipments/{id}/custody:
 *   post:
 *     summary: Add custody event (SUPPLIER_CUSTODY, CARRIER_CUSTODY, SHOP_CUSTODY, CUSTOMER_CUSTODY)
 *     tags: [Shipments]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [custody], properties: { custody: { type: string }, proofRef: { type: string }, declaredValue: { type: number }, insuranceRef: { type: string } } }
 *     responses:
 *       201: { description: Custody event created }
 */
router.patch('/:id', authenticate, requireUser, updateShipment);
router.post('/:id/trigger', authenticate, requireUser, trigger);
router.post('/:id/transit', authenticate, requireUser, setInTransit);
router.post('/:id/delivered', authenticate, requireUser, setDelivered);
router.post('/:id/custody', authenticate, requireUser, addCustodyEvent);

module.exports = router;
