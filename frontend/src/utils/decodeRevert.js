export function decodeRevert(err) {
  const hash = err?.data?.slice(0, 10);
  const errors = {
    // Generic revert(string)
    "0x08c379a0": "Error: revert genérico",
    // DAO / ProposalManager errors
    "0x635e8737": "ProposalNotFound",
    "0x7becc13f": "ProposalNotActive",
    "0xa8f983eb": "ProposalDeadlinePassed",
    "0x7c9a1cf9": "AlreadyVoted",
    "0x8eed55d1": "InvalidVoteType",
    "0xe6c4247b": "InvalidAddress",
    "0xcabeb655": "InsufficientVotingPower",
    "0xa950c86e": "InvalidVotingStrategy",
    "0x76166401": "InvalidDuration",
    "0xa5bb9bde": "EmptyTitle",
    "0xd937d5df": "EmptyDescription",
    "0xd39263b6": "NotVotedYet",
    "0x2eb35430": "DeadlineNotPassed",
    "0x90c0d696": "DuplicateProposal",
    "0x30cd7471": "NotOwner",
    "0x6a12f104": "InsufficientETH",
    "0x4dfba023": "ZeroPrice",
    "0x1f2a2005": "ZeroAmount",
    "0xecd7b0d1": "EmptyString",
    "0x88c88109": "MinStakeNotMet",
    "0x05b77af3": "StrategyError",
    // Staking errors
    "0x2c5211c6": "InvalidAmount",
    "0x14d10a02": "StakeLocked",
    "0xf1bc94d2": "InsufficientStake",
    "0xea8e4eb5": "NotAuthorized",
    // ERC20 allowance (custom Hardhat mapping for insufficient allowance)
    "0xfb8f41b2": "InsufficientAllowance",
  };
  return errors[hash] ?? "Transacción revertida";
}
