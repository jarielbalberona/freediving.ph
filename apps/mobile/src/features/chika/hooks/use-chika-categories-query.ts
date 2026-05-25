import { useQuery } from "@tanstack/react-query";

import { getChikaCategories } from "@/features/chika/api/chika-api";
import { mobileQueryKeys } from "@/lib/query";

export const useChikaCategoriesQuery = () =>
  useQuery({
    queryFn: getChikaCategories,
    queryKey: mobileQueryKeys.chika.categories(),
    staleTime: 10 * 60 * 1000,
  });
