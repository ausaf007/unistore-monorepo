import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Cart } from "@uniblox/shared";
import { api } from "./client.js";

export function useProducts() {
  return useQuery({ queryKey: ["products"], queryFn: api.getProducts });
}

export function useCart() {
  return useQuery({ queryKey: ["cart"], queryFn: api.getCart });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.addToCart,
    // The endpoint returns the updated cart — write it into the cache
    // directly instead of refetching.
    onSuccess: (cart: Cart) => queryClient.setQueryData(["cart"], cart),
  });
}

export function useStats() {
  return useQuery({ queryKey: ["stats"], queryFn: api.getStats });
}

export function useGenerateDiscountCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.generateDiscountCode,
    // The new code appears in the stats' code list too.
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["stats"] }),
  });
}

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.checkout,
    // Checkout clears the server-side cart and changes admin aggregates.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}
