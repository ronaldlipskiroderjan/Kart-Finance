export function unwrapCollection(response) {
  return { ...response, data: response.data?.data ?? [] };
}

