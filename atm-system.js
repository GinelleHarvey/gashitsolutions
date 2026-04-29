const customer = {
  pin: "1234",
  transactionCount: 0,
  accounts: {
    checking: 1000,
    savings: 1500,
    mortgage: 120000,
    carLoan: 18000,
    boatLoan: 9000,
    creditCard: 500
  },
  creditLimit: 3000
};

function formatMoney(value) {
  return "$" + value.toFixed(2);
}

function showReceipt(title, details) {
  const output = document.getElementById("output");

  output.innerHTML = `
    <strong>${title}</strong><br>
    ${details}
    <br><br>
    <em>Transaction count today: ${customer.transactionCount}</em>
  `;
}

function processTransaction() {
  const pin = document.getElementById("pin").value;
  const account = document.getElementById("account").value;
  const transaction = document.getElementById("transaction").value;
  const transferTo = document.getElementById("transferTo").value;
  const amount = parseFloat(document.getElementById("amount").value);
  const now = new Date().toLocaleString();

  if (pin !== customer.pin) {
    showReceipt("Rejected: Invalid PIN", "Please enter the correct PIN to continue.");
    return;
  }

  if (transaction === "balance") {
    showReceipt(
      "Balance Information",
      `Account: ${account}<br>Balance: ${formatMoney(customer.accounts[account])}<br>Date: ${now}`
    );
    return;
  }

  if (customer.transactionCount >= 10) {
    showReceipt("Rejected: Transaction Limit Reached", "The maximum of 10 transactions per day has been reached.");
    return;
  }

  if (isNaN(amount) || amount <= 0) {
    showReceipt("Rejected: Invalid Amount", "Please enter an amount greater than $0.00.");
    return;
  }

  if (transaction === "withdraw") {
    if (account !== "checking" && account !== "savings") {
      showReceipt("Rejected: Invalid Withdrawal Account", "Withdrawals are only allowed from checking or savings accounts.");
      return;
    }

    if (amount > 500) {
      showReceipt("Rejected: Withdrawal Limit", "The maximum withdrawal amount is $500.00.");
      return;
    }

    if (amount > customer.accounts[account]) {
      showReceipt("Rejected: Insufficient Funds", "The selected account does not have enough funds.");
      return;
    }

    customer.accounts[account] -= amount;
    customer.transactionCount++;

    showReceipt(
      "Accepted: Withdrawal Complete",
      `Account: ${account}<br>Amount Withdrawn: ${formatMoney(amount)}<br>New Balance: ${formatMoney(customer.accounts[account])}<br>Date: ${now}`
    );
    return;
  }

  if (transaction === "deposit") {
    if (account === "mortgage" || account === "carLoan" || account === "boatLoan" || account === "creditCard") {
      customer.accounts[account] -= amount;

      if (customer.accounts[account] < 0) {
        customer.accounts[account] = 0;
      }

      customer.transactionCount++;

      showReceipt(
        "Accepted: Payment Complete",
        `Account: ${account}<br>Payment Amount: ${formatMoney(amount)}<br>New Balance Owed: ${formatMoney(customer.accounts[account])}<br>Date: ${now}`
      );
      return;
    }

    customer.accounts[account] += amount;
    customer.transactionCount++;

    showReceipt(
      "Accepted: Deposit Complete",
      `Account: ${account}<br>Deposit Amount: ${formatMoney(amount)}<br>New Balance: ${formatMoney(customer.accounts[account])}<br>Date: ${now}`
    );
    return;
  }

  if (transaction === "transfer") {
    if (account === transferTo) {
      showReceipt("Rejected: Transfer Error", "The source and destination accounts cannot be the same.");
      return;
    }

    if (amount > customer.accounts[account]) {
      showReceipt("Rejected: Insufficient Funds", "The source account does not have enough funds for this transfer.");
      return;
    }

    customer.accounts[account] -= amount;
    customer.accounts[transferTo] += amount;
    customer.transactionCount++;

    showReceipt(
      "Accepted: Transfer Complete",
      `From: ${account}<br>To: ${transferTo}<br>Amount: ${formatMoney(amount)}<br>${account} Balance: ${formatMoney(customer.accounts[account])}<br>${transferTo} Balance: ${formatMoney(customer.accounts[transferTo])}<br>Date: ${now}`
    );
    return;
  }

  if (transaction === "cashAdvance") {
    if (account !== "creditCard") {
      showReceipt("Rejected: Invalid Account", "Cash advances are only available from the credit card account.");
      return;
    }

    const availableCredit = customer.creditLimit - customer.accounts.creditCard;

    if (amount > availableCredit) {
      showReceipt(
        "Rejected: Insufficient Credit",
        `Available credit: ${formatMoney(availableCredit)}`
      );
      return;
    }

    customer.accounts.creditCard += amount;
    customer.transactionCount++;

    showReceipt(
      "Accepted: Credit Card Cash Advance Complete",
      `Cash Advance Amount: ${formatMoney(amount)}<br>New Credit Card Balance: ${formatMoney(customer.accounts.creditCard)}<br>Available Credit Remaining: ${formatMoney(customer.creditLimit - customer.accounts.creditCard)}<br>Date: ${now}`
    );
  }
}
