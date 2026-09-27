# Owner reservation management

1. Apply `20260927_owner_reservation_management.sql` in the Supabase SQL Editor after the event-history migration (`20260919_event_types_and_history.sql`). The script is transactional, repeatable and does not change existing records.
2. Publish the frontend only after the SQL succeeds. It calls the new `delete_event_entry` RPC using the owner's authenticated session, never a service key.
3. On a test event, cancel the confirmation modal and verify nothing changes. Confirm cancellation of one reservation and verify one unit becomes available, the item remains in the list, and attendance confirmations remain.

Expired/archived events remain read-only. Results only supports reservation cancellation; item quantities are managed in Configurar. The frontend always calls the existing RPC with `p_kind = 'reservation'`. The legacy item-deletion branch is retained for compatibility, but is no longer exposed in Results. No new SQL is needed for this UI change if the original migration is already installed. Guests receive no automatic notification.

Validation: `npm test`, `npx playwright test`, `npm run build`. E2E requests use mocks and cannot delete production data.

Rollback: redeploy the previous frontend. The unused RPC can remain safely, or be removed with `drop function public.delete_event_entry(uuid, uuid, text, integer);`. Deleted records cannot be restored by rolling back code.
