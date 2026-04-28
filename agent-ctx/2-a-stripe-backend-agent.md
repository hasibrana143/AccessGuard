# Task 2-a: Stripe Backend Integration

## Agent: Stripe Backend Agent

## Summary

Successfully integrated Stripe for subscription payments in the AccessGuard application.

## Files Created

### 1. `src/lib/stripe-config.ts`
- Defined pricing plans (STARTER, AGENCY, ENTERPRISE)
- STARTER: $49/mo - 1 website, 100 pages
- AGENCY: $199/mo - 10 websites, 1000 pages
- ENTERPRISE: Custom pricing, unlimited
- Placeholder Stripe Price IDs (to be configured in production)
- Helper functions: `getPlanById`, `getPlanLimits`, `getStripePriceId`, `planSupportsFeature`
- Subscription status mapping and webhook events list

### 2. `src/lib/stripe.ts`
- Stripe client initialization with API version `2025-03-31.basil`
- Core functions implemented:
  - `createCustomer(email, name, metadata)` - Create Stripe customer
  - `getCustomer(customerId)` - Retrieve customer
  - `updateCustomer(customerId, updates)` - Update customer
  - `createSubscription(customerId, priceId, metadata)` - Create subscription with client secret
  - `getSubscription(subscriptionId)` - Get subscription details
  - `cancelSubscription(subscriptionId, immediately)` - Cancel subscription
  - `reactivateSubscription(subscriptionId)` - Reactivate canceled subscription
  - `updateSubscription(subscriptionId, newPriceId)` - Change plan
  - `constructWebhookEvent(payload, signature)` - Verify webhook signature
  - `createBillingPortalSession(customerId, returnUrl)` - Self-service billing
  - `createCheckoutSession(customerId, priceId, successUrl, cancelUrl)` - Checkout flow
  - `getSubscriptionDetails(subscriptionId)` - Normalized subscription data
  - `getCustomerInvoices(customerId, limit)` - List invoices
  - `getUpcomingInvoice(customerId, subscriptionId, newPriceId)` - Preview changes
  - `hasActiveSubscription(customerId)` - Check active status
  - `getSubscriptionPlanLimits(subscriptionId)` - Get plan limits

### 3. `src/app/api/stripe/create-customer/route.ts`
- POST endpoint to create Stripe customer
- Validates authentication and admin role
- Links customer to organization in database
- Returns existing customer if already created

### 4. `src/app/api/stripe/create-subscription/route.ts`
- POST endpoint to create subscription
- Accepts `planId` or `priceId` from request body
- Supports `interval` (month/year) parameter
- Auto-creates customer if not exists
- Returns client secret for payment element

### 5. `src/app/api/stripe/cancel-subscription/route.ts`
- POST endpoint to cancel/reactivate subscription
- Supports `immediately` flag for immediate cancellation
- Supports `reactivate` flag to undo scheduled cancellation
- GET endpoint to retrieve subscription cancellation status
- Updates organization status and plan limits

### 6. `src/app/api/stripe/webhook/route.ts`
- POST endpoint for Stripe webhooks
- Verifies webhook signature
- Handles events:
  - `customer.created` - Link customer to org
  - `customer.updated` - Sync customer data
  - `customer.deleted` - Reset org billing
  - `subscription.created` - Update org subscription
  - `subscription.updated` - Sync subscription status
  - `subscription.deleted` - Reset to starter
  - `checkout.session.completed` - Mark checkout complete
  - `invoice.paid` - Update status from past_due
  - `invoice.payment_failed` - Mark as past_due
  - `payment_intent.succeeded` - Log payment success
  - `payment_intent.payment_failed` - Log payment failure
- Creates audit logs for all billing events

## Files Modified

### 1. `prisma/schema.prisma`
- Added `subscriptionStatus` field to Organization (String?, nullable)
- Added `planLimits` field to Organization (String, default: starter limits JSON)
- Used for caching plan limits to avoid Stripe API calls

### 2. `src/types/index.ts`
- Updated Organization interface with new fields:
  - `subscriptionStatus: string | null`
  - `planLimits: string`

## Database Changes

Pushed schema changes with `bun run db:push`:
- Added `subscriptionStatus` column (nullable string)
- Added `planLimits` column (string with default value)

## Environment Variables Required

For production, set these environment variables:
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret

## Configuration Notes

1. **Placeholder Price IDs**: The Stripe Price IDs are placeholders. Before production:
   - Create products and prices in Stripe Dashboard
   - Update `STRIPE_PRICE_IDS` in `stripe-config.ts`

2. **Webhook Setup**: Configure Stripe webhook to send events to:
   - `https://your-domain.com/api/stripe/webhook`

3. **Default Plan**: Organizations default to 'starter' plan with limits:
   - maxWebsites: 1
   - maxPages: 100
   - maxUsers: 2

## Validation

- All code passes `bun run lint`
- Database schema pushed successfully
- No breaking changes to existing functionality
