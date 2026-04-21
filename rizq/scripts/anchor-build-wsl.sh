#!/usr/bin/env bash
# Anchor/Solana post-process (llvm-objcopy) often fails with "Operation not permitted"
# when target/deploy/*.so lives on Windows drives (/mnt/c/...) under WSL.
# Send Cargo's target dir to the Linux filesystem (ext4) instead.
set -euo pipefail

export CARGO_TARGET_DIR="${CARGO_TARGET_DIR:-${HOME}/.cache/rizqapp-cargo-target}"
mkdir -p "${CARGO_TARGET_DIR}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RIZQ_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${RIZQ_ROOT}"

if [[ -f "${HOME}/.cargo/env" ]]; then
  # shellcheck source=/dev/null
  source "${HOME}/.cargo/env"
fi
export PATH="${HOME}/.local/share/solana/install/active_release/bin:${PATH}"

echo "Using CARGO_TARGET_DIR=${CARGO_TARGET_DIR}"
anchor build "$@"

# `anchor deploy` loads .so paths from the workspace's `target/deploy/`, but with
# CARGO_TARGET_DIR set, artifacts live under "${CARGO_TARGET_DIR}/deploy/`. Mirror them.
mkdir -p "${RIZQ_ROOT}/target/deploy"
shopt -s nullglob
so_files=("${CARGO_TARGET_DIR}/deploy"/*.so)
shopt -u nullglob
if ((${#so_files[@]})); then
  cp -f "${so_files[@]}" "${RIZQ_ROOT}/target/deploy/"
  echo "Synced *.so to ${RIZQ_ROOT}/target/deploy/ (for anchor deploy)"
fi
