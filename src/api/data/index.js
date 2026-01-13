import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchData, updateData } from './request'

const defaultParams = { fields: 'F', easy: true  }

export const useData = (params, queryOptions) => 
  useQuery({
    queryKey: ['data', params || defaultParams],
    queryFn: () => fetchData(params || defaultParams),
    ...queryOptions
  })

export const useUpdateData = () => {
  const queryClient = useQueryClient()
  const { mutateAsync } = useMutation({
    mutationFn: updateData,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['data'] })
  })
  return async (params) => await mutateAsync({ data: JSON.stringify(params) })
}