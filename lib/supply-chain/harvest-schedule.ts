export interface HarvestLeftoverTransferEligibility {
  remainingQuantity: number;
  alreadyTransferred: boolean;
  canTransfer: boolean;
}

/**
 * Evaluates leftover-transfer eligibility for a harvest announcement.
 * Timing is dynamically controlled by the Supplier as long as unreserved stock remains
 * and the announcement has not already been transferred.
 */
export function getHarvestLeftoverTransferEligibility(input: {
  estimatedQuantity: number;
  totalReservedQuantity: number;
  transferredAt?: Date | string | null;
}): HarvestLeftoverTransferEligibility {
  const remainingQuantity = Math.max(
    0,
    input.estimatedQuantity - input.totalReservedQuantity,
  );
  const alreadyTransferred = Boolean(input.transferredAt);
  const canTransfer = !alreadyTransferred && remainingQuantity > 0;

  return {
    remainingQuantity,
    alreadyTransferred,
    canTransfer,
  };
}
