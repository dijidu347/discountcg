DELETE FROM coffre_subscriptions
WHERE garage_id = (SELECT id FROM garages WHERE email = 'mathieugaillac4@gmail.com' LIMIT 1);