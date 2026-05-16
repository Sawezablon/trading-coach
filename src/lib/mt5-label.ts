export type Mt5AccountLabelSource = {
  account_number: string | null;
  broker: string | null;
};

export function getMt5ConnectionLabel(connection: Mt5AccountLabelSource) {
  if (connection.broker && connection.account_number) {
    return `${connection.broker} / ${connection.account_number}`;
  }

  if (connection.account_number) {
    return `MT5 Account / ${connection.account_number}`;
  }

  return "Pending MT5 account";
}
