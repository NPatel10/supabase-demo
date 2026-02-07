import { useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { supabase } from "@/lib/supabaseClient"
import type { Profile } from "@/types/profile"
import type { ProfileDraft, SignInDraft, SignUpDraft } from "./utils"
import type { UserAttributes } from "@supabase/supabase-js"

export function useAuth() {
  const queryClient = useQueryClient()

  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        throw new Error(error.message)
      }
      return data.session ?? null
    },
    staleTime: Infinity,
  })

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      queryClient.setQueryData(["session"], nextSession ?? null)
    })

    return () => {
      data.subscription.unsubscribe()
    }
  }, [queryClient])

  const session = sessionQuery.data ?? null
  const user = session?.user ?? null

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async ({ queryKey }) => {
      const [, userId] = queryKey as [string, string | undefined]
      if (!userId) {
        return null
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, created_at")
        .eq("id", userId)
        .maybeSingle()

      if (error) {
        throw new Error(error.message)
      }

      return (data ?? null) as Profile | null
    },
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  })

  const profile = profileQuery.data ?? null

  const signUpMutation = useMutation({
    mutationFn: async (payload: SignUpDraft) => {
      const { data, error } = await supabase.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          data: {
            display_name: payload.displayName.trim() || undefined,
            username: payload.username.trim() || undefined,
          },
        },
      })

      if (error) {
        throw new Error(error.message)
      }

      return data
    },
  })

  const signInMutation = useMutation({
    mutationFn: async (payload: SignInDraft) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: payload.email,
        password: payload.password,
      })

      if (error) {
        throw new Error(error.message)
      }

      return data
    },
  })

  const signOutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw new Error(error.message)
      }
    },
  })

  const saveProfileMutation = useMutation({
    mutationFn: async (payload: ProfileDraft & { userId: string }) => {
      if (payload.email && payload.email != user?.email) {
        const { error } = await supabase.auth.updateUser({ email: payload.email.trim() })

        if (error) {
          throw new Error(error.message)
        }
      }

      const data = {
        display_name: payload.displayName.trim(),
        username: payload.username.trim(),
      } as UserAttributes

      const { error } = await supabase.from("profiles").update(data).eq("id", payload.userId)

      if (error) throw new Error(error.message)
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["profile", variables.userId],
      })
    },
  })

  return {
    queryClient,
    session,
    user,
    profile,
    signUpMutation,
    signInMutation,
    signOutMutation,
    saveProfileMutation,
  }
}
