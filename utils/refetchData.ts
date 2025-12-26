import { queryClient } from "@/providers/ReactQueryProvider"

export const queryToInvalidate = async (key: string) => {
    queryClient.invalidateQueries({ queryKey: [key] })

}
export const queriesToInvalidate = (queryKeys: string[] | readonly string[]): void => {
  queryKeys.forEach((key) => {
    queryClient.invalidateQueries({ queryKey: [key] })
  })
}

