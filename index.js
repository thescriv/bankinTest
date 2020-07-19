const superagent = require("superagent");

const API_URL = "http://localhost:3000";

const token = {
  refresh: "",
  access: "",
};

const client = {
  user: "BankinClientId",
  password: "secret",
};

const login = {
  user: "BankinUser",
  password: "12345678",
};

const accounts = {};

async function refreshToken() {
  try {
    const {
      body: { refresh_token: refreshToken },
    } = await superagent
      .post(`${API_URL}/login`)
      .send(login)
      .auth(client.user, client.password);

    token.refresh = refreshToken;
  } catch (err) {
    throw new Error(err.response.error);
  }

  if (!token.refresh) {
    throw new Error("Refresh token failed");
  }
}

async function accessToken() {
  try {
    const {
      body: { access_token: accessToken },
    } = await superagent.post(`${API_URL}/token`).send({
      grant_type: "refresh_token",
      refresh_token: token.refresh,
    });

    token.access = accessToken;
  } catch (err) {
    throw new Error(err.response.error);
  }

  if (!token.access) {
    throw new Error("Access token failed");
  }
}

async function getAccounts() {
  let accountPage = 1;

  while (accountPage) {
    try {
      const {
        body: {
          account,
          link: { next },
        },
      } = await superagent
        .get(`${API_URL}/accounts?page=${accountPage}`)
        .set("Authorization", `Bearer ${token.access}`);

      accountPage = next ? next.split("=")[1] : null;

      account.forEach((elem) => {
        accounts[elem.acc_number] = { ...elem, transactions: [] };
      });
    } catch (err) {
      throw new Error(err);
    }
  }
}

async function getTransactions() {
  const accountIds = Object.keys(accounts);

  for (const accountId of accountIds) {
    let transactionsPage = 1;

    while (transactionsPage) {
      try {
        const {
          body: {
            transactions,
            link: { next },
          },
        } = await superagent
          .get(
            `${API_URL}/accounts/${accountId}/transactions?page=${transactionsPage}`
          )
          .set("Authorization", `Bearer ${token.access}`);

        transactionsPage = next ? next.split("=")[1] : null;

        transactions.forEach((elem) => {
          accounts[accountId].transactions.push({
            label: elem.label,
            amount: elem.amount,
            currency: elem.currency,
          });
        });
      } catch (err) {
        if (err.response.error.text === "Account not found") {
          console.error(`Account ${accountId} doesn't exist`);
          transactionsPage = null;
        } else {
          throw new Error(err);
        }
      }
    }
  }
}

function printAccounts() {
  const accountIds = Object.keys(accounts);

  for (const accountId of accountIds) {
    console.log(accounts[accountId]);
  }
}

async function main() {
  await refreshToken();
  await accessToken();
  await getAccounts();
  await getTransactions();
  printAccounts();
}

main();
