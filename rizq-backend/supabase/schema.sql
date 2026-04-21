-- Rizq Supabase schema (run in SQL editor)

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT,
  expo_push_token TEXT,
  fcm_token TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner UUID REFERENCES users(id),
  pda_address TEXT UNIQUE NOT NULL,
  goal_name TEXT NOT NULL,
  goal_type TEXT NOT NULL,
  target_usdc BIGINT NOT NULL,
  current_usdc BIGINT DEFAULT 0,
  deadline TIMESTAMPTZ NOT NULL,
  is_achieved BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  yes_count INT DEFAULT 0,
  no_count INT DEFAULT 0,
  historical_completion_rate FLOAT DEFAULT 100.0,
  last_week_deposit BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goals_owner ON goals(owner);
CREATE INDEX IF NOT EXISTS idx_goals_pda ON goals(pda_address);

CREATE TABLE IF NOT EXISTS coaching_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES goals(id),
  user_id UUID REFERENCES users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES goals(id),
  staker_wallet TEXT NOT NULL,
  amount_usdc BIGINT NOT NULL,
  is_yes BOOLEAN NOT NULL,
  tx_signature TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE VIEW active_goals AS
SELECT g.*, u.expo_push_token, u.wallet_address AS owner_wallet
FROM goals g
JOIN users u ON u.id = g.owner
WHERE g.is_resolved = false;
