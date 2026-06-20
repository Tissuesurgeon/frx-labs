-- Remove legacy demo/seed agents not created via wallet setup (no owner_user_id).
DELETE FROM agents
WHERE owner_user_id IS NULL
   OR owner_address = '0xUser'
   OR sui_object_id LIKE '0xmock_%';
