export function decodeRevert(err) {
  const hash = err?.data?.slice(0, 10);
  const errors = {
    // Generic Solidity revert(string)
    "0x08c379a0": "Error: revert genérico",
    // Custom errors (selectors gathered from app/tests)
    "0x1cf3d510": "InsufficientVotingPower",
    "0xc1b1a6a1": "AlreadyVoted",
    "0x6e6f6e65": "NotOwner",
    "0xf1bc94d2": "StakeLocked",
    "0x90c0d696": "DuplicateProposal",
    "0xcabeb655": "InsufficientProposingStake",
    "0xfb8f41b2": "ERC20: insufficient allowance",
    // Additional known DAO errors
    // You can extend this map with more selectors as discovered
  };
  return errors[hash] ?? "Transacción revertida";
}
