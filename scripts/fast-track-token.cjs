function selectCoreApiToken(payload) {
  return (
    payload?.data?.token ??
    payload?.token ??
    payload?.data?.access_token ??
    payload?.data?.session?.access_token
  );
}

module.exports = { selectCoreApiToken };
