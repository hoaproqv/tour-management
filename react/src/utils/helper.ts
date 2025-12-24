export const getAccountFromLocalStorage = () => {
  const account = localStorage.getItem("account");
  return account ? JSON.parse(account) : null;
};
