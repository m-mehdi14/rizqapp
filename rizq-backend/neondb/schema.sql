-- Rizq NeonDB schema (committee-first, Shariah-compliant flow)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  phone_number TEXT UNIQUE,
  display_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  language_pref TEXT DEFAULT 'mixed',
  device_push_token TEXT,
  kyc_status TEXT DEFAULT 'pending',
  kyc_rejected_reason TEXT,
  cnic_number TEXT,
  is_pro BOOLEAN DEFAULT false,
  pro_expires_at TIMESTAMPTZ,
  rizq_score INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nominees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  cnic_number TEXT NOT NULL,
  relationship TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS committees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL,
  manager_id UUID REFERENCES users(id),
  contribution_amount BIGINT NOT NULL,
  frequency TEXT NOT NULL,
  max_members INT NOT NULL DEFAULT 10,
  current_members INT DEFAULT 0,
  total_cycles INT NOT NULL,
  current_cycle INT DEFAULT 1,
  payout_order_type TEXT DEFAULT 'manager',
  payout_order_locked BOOLEAN DEFAULT false,
  grace_period_days INT DEFAULT 3,
  late_penalty_action TEXT DEFAULT 'warning',
  penalty_goes_to TEXT DEFAULT 'welfare',
  welfare_opt_in_pct DECIMAL DEFAULT 0,
  kyc_required BOOLEAN DEFAULT true,
  nominee_required BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'forming',
  pda_address TEXT UNIQUE,
  vault_address TEXT,
  invite_code TEXT UNIQUE,
  platform_fee_pct DECIMAL DEFAULT 1.5,
  next_cycle_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS committee_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID REFERENCES committees(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  payout_position INT,
  joined_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'active',
  has_received BOOLEAN DEFAULT false,
  received_at TIMESTAMPTZ,
  received_amount BIGINT,
  UNIQUE (committee_id, user_id),
  UNIQUE (committee_id, payout_position)
);

CREATE TABLE IF NOT EXISTS coaching_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  committee_id UUID REFERENCES committees(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS committee_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID REFERENCES committees(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount_micro_usdc BIGINT NOT NULL,
  tx_signature TEXT NOT NULL,
  cycle_number INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS committee_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID REFERENCES committees(id) ON DELETE CASCADE,
  recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  recipient_wallet TEXT NOT NULL,
  amount_micro_usdc BIGINT NOT NULL,
  tx_signature TEXT NOT NULL,
  cycle_number INT,
  claimed_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS welfare_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID REFERENCES committees(id) ON DELETE CASCADE,
  amount_micro_usdc BIGINT NOT NULL,
  tx_signature TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_committee_members_committee ON committee_members(committee_id);
CREATE INDEX IF NOT EXISTS idx_committee_members_user ON committee_members(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_messages_user ON coaching_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_messages_committee ON coaching_messages(committee_id);
CREATE INDEX IF NOT EXISTS idx_committee_contributions_committee ON committee_contributions(committee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_committee_contributions_user ON committee_contributions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_committee_payouts_committee ON committee_payouts(committee_id, claimed_at DESC);
CREATE INDEX IF NOT EXISTS idx_committee_payouts_wallet ON committee_payouts(recipient_wallet, claimed_at DESC);
