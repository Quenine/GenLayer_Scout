import type { ContractExperiment } from "@/lib/types";

function verificationInputsMatch(
  current: ContractExperiment,
  next: ContractExperiment
): boolean {
  return (
    current.transactionHash.trim() === next.transactionHash.trim() &&
    current.deployedContractAddress.trim() ===
      next.deployedContractAddress.trim() &&
    current.status === next.status
  );
}

export function reconcileExperimentVerification(
  current: ContractExperiment,
  next: ContractExperiment
): ContractExperiment {
  if (verificationInputsMatch(current, next)) {
    return next;
  }

  const reconciled = { ...next };
  delete reconciled.verification;
  return reconciled;
}