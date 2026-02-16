/**
 * Masks a bank account number, showing only the last 4 digits.
 * Example: "1234567890" -> "******7890"
 */
export function maskBankAccountNumber(accountNumber: string): string {
    if (!accountNumber || accountNumber.length <= 4) {
        return accountNumber;
    }
    const visibleDigits = accountNumber.slice(-4);
    const maskedPortion = '*'.repeat(accountNumber.length - 4);
    return maskedPortion + visibleDigits;
}
